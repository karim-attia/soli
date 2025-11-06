#!/usr/bin/env node

/**
 * Installs the release build on a connected Android device and triggers the demo game
 * (with auto-solve) to exercise the foundations-complete logging path.
 */

const { spawn } = require('child_process')

const DEMO_URI = 'soli:///?demo=1&auto=1&solve=1'
const GAME_LOADED_TOKEN = '[Demo] Game loaded'
const AUTO_SEQUENCE_TOKEN = '[Demo] Auto sequence started'
const GAME_COMPLETED_TOKEN = '[Game] Foundations complete, player won the game.'
const COMPLETION_TOKEN = 'Foundations complete'
const APP_LOG_PREFIX = '[SoliDev]'
const AUTO_SEQUENCE_TIMEOUT_MS = 60000
const AUTO_SEQUENCE_START_TIMEOUT_MS = 20000
const TOTAL_TIMEOUT_MS = 120000
const PACKAGE_NAME = 'com.soli.klondike'

const log = (message) => {
  console.log(`\x1b[36m[demo]\x1b[0m ${message}`)
}

const logError = (message) => {
  console.error(`\x1b[31m[demo]\x1b[0m ${message}`)
}

const runCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    if (!options.silent) {
      log(`Running: ${command} ${args.join(' ')}`)
    }
    const child = spawn(command, args, {
      stdio: options.capture || options.silent ? 'pipe' : 'inherit',
      shell: process.platform === 'win32',
      ...options.spawnOptions,
    })

    let stdout = ''
    let stderr = ''

    if (options.capture || options.silent) {
      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })
      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        const errorOutput = options.capture || options.silent ? `${stdout}\n${stderr}`.trim() : ''
        reject(new Error(`Command failed (${code}): ${command} ${args.join(' ')}${
          errorOutput ? `\n${errorOutput}` : ''
        }`))
      }
    })
  })

const ensureDevice = async () => {
  const { stdout } = await runCommand('adb', ['devices'], { capture: true })
  const lines = stdout.split('\n').map((line) => line.trim())
  const deviceLines = lines.filter((line) => line && !line.startsWith('List of devices') && !line.endsWith('offline'))
  if (!deviceLines.length) {
    throw new Error(
      'No Android device detected. Connect a device or start an emulator, then enable USB debugging (adb devices).',
    )
  }
  log(`Detected device(s): ${deviceLines.join(', ')}`)
}

const startLogcatListener = () => spawn('adb', ['logcat'], { stdio: ['ignore', 'pipe', 'pipe'] })

const main = async () => {
  try {
    await ensureDevice()
    await runCommand('adb', ['shell', 'am', 'force-stop', PACKAGE_NAME])

    log('Building and installing release APK (expo run:android --variant release)...')
    await runCommand('npx', ['expo', 'run:android', '--variant', 'release'], { silent: true })

    await runCommand('adb', ['logcat', '-c'])

    // await runCommand('adb', ['shell', 'am', 'force-stop', PACKAGE_NAME])

    const logcat = startLogcatListener()

    let resolved = false
    let buffer = ''
    let retriggered = false
    let autoSequenceTimer = null
    let autoStartTimer = null
    let totalTimer = null

    const cleanup = () => {
      if (resolved) {
        return
      }
      resolved = true
      clearTimeout(autoSequenceTimer)
      clearTimeout(autoStartTimer)
      clearTimeout(totalTimer)
      if (logcat && !logcat.killed) {
        logcat.kill('SIGTERM')
      }
    }

    const waitForCompletion = () =>
      new Promise((resolve, reject) => {
        const handleFailure = (message) => {
          if (resolved) {
            return
          }
          cleanup()
          reject(new Error(message))
        }

        const scheduleAutoStartTimeout = () => {
          autoStartTimer = setTimeout(() => {
            if (!retriggered) {
              retriggered = true
              log('Auto-sequence not detected yet, re-triggering demo URI...')
              runCommand('npx', ['uri-scheme', 'open', DEMO_URI, '--android'])
                .then(() => {
                  scheduleAutoStartTimeout()
                })
                .catch((error) => handleFailure(error.message))
            } else {
              handleFailure('Timed out waiting for the demo auto-sequence to begin.')
            }
          }, AUTO_SEQUENCE_START_TIMEOUT_MS)
        }

        const startAutoSequenceTimer = () => {
          clearTimeout(autoSequenceTimer)
          autoSequenceTimer = setTimeout(() => {
            handleFailure('Timed out waiting for Foundations complete log after auto-sequence started.')
          }, AUTO_SEQUENCE_TIMEOUT_MS)
        }

        totalTimer = setTimeout(() => {
          handleFailure('Total timeout reached while waiting for demo completion.')
        }, TOTAL_TIMEOUT_MS)

        scheduleAutoStartTimeout()

        logcat.stdout.on('data', (data) => {
          buffer += data.toString()
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          lines.forEach((line) => {
            if (!line) {
              return
            }
            if (line.includes(APP_LOG_PREFIX)) {
              const match = line.match(/\[SoliDev\]'?,?\s*(.*)$/)
              if (match) {
                let message = match[1].replace(/^['",\s]+/, '')
                message = message.replace(/['"]$/g, '')
                if (message.length > 0) {
                  console.log(message)
                }
              }
            }
            if (line.includes(GAME_LOADED_TOKEN)) {
              log('Detected demo-game load signal.')
            }
            if (line.includes(AUTO_SEQUENCE_TOKEN)) {
              log('Detected demo auto-sequence start.')
              clearTimeout(autoStartTimer)
              startAutoSequenceTimer()
            }
            if (line.includes(COMPLETION_TOKEN) || line.includes(GAME_COMPLETED_TOKEN)) {
              log('Game completion detected via logcat.')
              cleanup()
              resolve()
            }
          })
        })

        logcat.stderr.on('data', (data) => {
          logError(`logcat stderr: ${data.toString().trim()}`)
        })

        logcat.on('error', (error) => {
          handleFailure(`logcat failed: ${error.message}`)
        })

        logcat.on('close', (code) => {
          if (!resolved) {
            handleFailure(`logcat exited unexpectedly (code ${code}).`)
          }
        })
      })

    const completionPromise = waitForCompletion()

    await runCommand('npx', ['uri-scheme', 'open', DEMO_URI, '--android'])

    await completionPromise

    cleanup()
    process.exit(0)
  } catch (error) {
    logError(error.message)
    process.exit(1)
  }
}

main()


