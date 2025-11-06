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
const TOTAL_TIMEOUT_MS = 60000
const PACKAGE_NAME = 'com.soli.klondike'
const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const CLOCK_PAD_LENGTH = 2
const CLOCK_PAD_CHAR = '0'
const PROGRESS_BAR_WIDTH = 10
const PROGRESS_UPDATE_INTERVAL_MS = 1000
const PROGRESS_MIN_SEGMENTS = 1
const PROGRESS_BAR_FILLED_CHAR = '='
const PROGRESS_BAR_EMPTY_CHAR = '.'
const PROGRESS_BAR_PREFIX = '['
const PROGRESS_BAR_SUFFIX = ']'
const PROGRESS_EXPECTATION_MULTIPLIER = 1.25
const DEFAULT_EXPECTED_BUILD_TIME_MS = TOTAL_TIMEOUT_MS

const log = (message) => {
  console.log(`\x1b[36m[demo]\x1b[0m ${message}`)
}

const logError = (message) => {
  console.error(`\x1b[31m[demo]\x1b[0m ${message}`)
}

const formatClockDuration = (ms, options = {}) => {
  const { roundUp = false } = options
  const rawSeconds = roundUp ? Math.ceil(ms / MS_PER_SECOND) : Math.floor(ms / MS_PER_SECOND)
  const totalSeconds = Math.max(0, rawSeconds)
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  const seconds = totalSeconds % SECONDS_PER_MINUTE
  return `${String(minutes).padStart(CLOCK_PAD_LENGTH, CLOCK_PAD_CHAR)}:${String(seconds).padStart(
    CLOCK_PAD_LENGTH,
    CLOCK_PAD_CHAR,
  )}`
}

const formatVerboseDuration = (ms) => {
  const totalSeconds = Math.max(0, Math.round(ms / MS_PER_SECOND))
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  const seconds = totalSeconds % SECONDS_PER_MINUTE
  if (minutes === 0) {
    return `${seconds}s`
  }
  return `${minutes}m ${seconds}s`
}

const renderProgressBar = (filledSegments) => {
  const safeSegments = Math.min(PROGRESS_BAR_WIDTH, Math.max(0, filledSegments))
  const emptySegments = Math.max(0, PROGRESS_BAR_WIDTH - safeSegments)
  const filled = PROGRESS_BAR_FILLED_CHAR.repeat(safeSegments)
  const empty = PROGRESS_BAR_EMPTY_CHAR.repeat(emptySegments)
  return `${PROGRESS_BAR_PREFIX}${filled}${empty}${PROGRESS_BAR_SUFFIX}`
}

const createProgressTracker = (label, expectedDurationMs = DEFAULT_EXPECTED_BUILD_TIME_MS) => {
  const startTime = Date.now()
  let expectedTotal = Math.max(expectedDurationMs, PROGRESS_UPDATE_INTERVAL_MS)
  let lastPrintedLine = ''
  const maxSegmentsBeforeCompletion = PROGRESS_BAR_WIDTH - 1

  const render = ({
    final = false,
    forceComplete = false,
    overrideElapsed,
    appendText = '',
    overrideMessage,
  } = {}) => {
    const elapsed = overrideElapsed ?? Date.now() - startTime
    if (!forceComplete) {
      const scaledElapsed = Math.ceil(elapsed * PROGRESS_EXPECTATION_MULTIPLIER)
      expectedTotal = Math.max(expectedTotal, scaledElapsed, PROGRESS_UPDATE_INTERVAL_MS)
    }
    const ratio = forceComplete || expectedTotal === 0 ? 1 : Math.min(1, elapsed / expectedTotal)
    let segments = Math.floor(ratio * PROGRESS_BAR_WIDTH)
    if (forceComplete) {
      segments = PROGRESS_BAR_WIDTH
    } else {
      segments = Math.max(PROGRESS_MIN_SEGMENTS, segments)
      segments = Math.min(maxSegmentsBeforeCompletion, segments)
    }

    const remainingMs = forceComplete ? 0 : Math.max(0, expectedTotal - elapsed)
    const baseLine = `${renderProgressBar(segments)} ${segments}/${PROGRESS_BAR_WIDTH} elapsed ${formatClockDuration(
      elapsed,
    )} remaining ${formatClockDuration(remainingMs, { roundUp: true })}`
    const decoratedBaseLine = appendText ? `${baseLine} ${appendText}` : baseLine
    const finalLine = overrideMessage ?? decoratedBaseLine

    if (process.stdout.isTTY && typeof process.stdout.clearLine === 'function') {
      process.stdout.clearLine(0)
      process.stdout.cursorTo(0)
      process.stdout.write(finalLine)
      if (final) {
        process.stdout.write('\n')
      }
    } else if (finalLine !== lastPrintedLine || final) {
      console.log(finalLine)
      if (final) {
        console.log('')
      }
    }

    lastPrintedLine = finalLine

    return { elapsed }
  }

  render()

  const intervalId = setInterval(() => {
    render()
  }, PROGRESS_UPDATE_INTERVAL_MS)

  return {
    complete: () => {
      clearInterval(intervalId)
      const elapsed = Date.now() - startTime
      render({
        final: true,
        forceComplete: true,
        overrideElapsed: elapsed,
        overrideMessage: `${renderProgressBar(PROGRESS_BAR_WIDTH)} ${PROGRESS_BAR_WIDTH}/${PROGRESS_BAR_WIDTH} - completed in ${formatClockDuration(
          elapsed,
        )}`,
      })
      log(`Measured ${label} duration: ${formatVerboseDuration(elapsed)} (${formatClockDuration(elapsed)}).`)
      return elapsed
    },
    fail: () => {
      clearInterval(intervalId)
      render({ final: true, forceComplete: false })
    },
  }
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

const runCommandWithProgress = async (command, args, options, progressOptions = {}) => {
  const resolvedLabel = progressOptions.label ?? `${command} ${args.join(' ')}`
  const tracker = createProgressTracker(resolvedLabel, progressOptions.expectedDurationMs)
  try {
    const result = await runCommand(command, args, options)
    const durationMs = tracker.complete()
    return { ...result, durationMs }
  } catch (error) {
    tracker.fail()
    throw error
  }
}

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
    await runCommandWithProgress(
      'npx',
      ['expo', 'run:android', '--variant', 'release'],
      { silent: true },
      { label: 'Build & install release APK' },
    )

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


