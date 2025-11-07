#!/usr/bin/env node

/**
 * Installs the release build on a connected Android device and triggers the demo game
 * (with auto-solve) to exercise the foundations-complete logging path.
 */

const { spawn } = require('child_process')

const DEMO_URI = 'soli:///?demo=1&auto=1&solve=1'
const BASE_APP_URI = 'soli:///'
const GAME_LOADED_TOKEN = '[Demo] Game loaded'
const AUTO_SEQUENCE_TOKEN = '[Demo] Auto sequence started'
const GAME_COMPLETED_TOKEN = '[Game] Foundations complete, player won the game.'
const COMPLETION_TOKEN = 'Foundations complete'
const APP_LOG_PREFIX = '[SoliDev]'
const AUTO_SEQUENCE_TIMEOUT_MS = 60000
const AUTO_SEQUENCE_START_TIMEOUT_MS = 20000
const TOTAL_TIMEOUT_MS = 60000
const PACKAGE_NAME = 'ch.karimattia.soli'
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
const CRASH_PREFIX = '[CRASH]'
const CRASH_KEYWORDS = ['FATAL', 'AndroidRuntime', 'Exception', 'crash', 'SIGSEGV', 'SIGABRT', 'SIGBUS']
const MAX_CRASH_CONTEXT_LINES = 8
const MODES = {
  DEMO: 'demo',
  PROD: 'prod',
}
const DEFAULT_MODE = MODES.DEMO
const INSTALL_SUCCESS_MESSAGE = 'Build & install completed successfully.'
const PROD_MODE_READY_MESSAGE = 'Production mode active. Streaming filtered logs (press Ctrl+C to exit).'

const log = (message) => {
  console.log(`\x1b[36m[demo]\x1b[0m ${message}`)
}

const logError = (message) => {
  console.error(`\x1b[31m[demo]\x1b[0m ${message}`)
}

const extractAppLogMessage = (line) => {
  if (!line || !line.includes(APP_LOG_PREFIX)) {
    return null
  }
  const match = line.match(/\[SoliDev\]'?,?\s*(.*)$/)
  if (!match) {
    return null
  }
  let message = match[1].replace(/^[\'",\s]+/, '')
  message = message.replace(/[\'"]$/g, '')
  if (!message.length) {
    return null
  }
  return message
}

const normalizeModeCandidate = (value) => {
  if (!value) {
    return null
  }
  if (value === MODES.DEMO || value === MODES.PROD) {
    return value
  }
  if (value.startsWith('--mode=')) {
    const [, modeValue] = value.split('=')
    if (modeValue === MODES.DEMO || modeValue === MODES.PROD) {
      return modeValue
    }
  }
  if (value === '--demo') {
    return MODES.DEMO
  }
  if (value === '--prod') {
    return MODES.PROD
  }
  return null
}

const parseMode = () => {
  const args = process.argv.slice(2)
  if (!args.length) {
    return DEFAULT_MODE
  }

  for (const arg of args) {
    const normalized = normalizeModeCandidate(arg)
    if (normalized) {
      return normalized
    }
  }

  return DEFAULT_MODE
}

const ensureValidMode = (mode) => {
  const validModes = Object.values(MODES)
  if (!validModes.includes(mode)) {
    throw new Error(`Unsupported mode "${mode}". Supported modes: ${validModes.join(', ')}`)
  }
}

const isDemoMode = (mode) => mode === MODES.DEMO

const getUriForMode = (mode) => (isDemoMode(mode) ? DEMO_URI : BASE_APP_URI)

const createLauncherForMode = (mode) => () =>
  runCommand('npx', ['uri-scheme', 'open', getUriForMode(mode), '--android'])

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

const createLogMonitor = ({ mode, logcat, launchApp }) => {
  let cleanedUp = false
  let terminated = false
  let buffer = ''
  let retriggered = false
  let autoSequenceTimer = null
  let autoStartTimer = null
  let totalTimer = null
  const crashContext = []

  let resolvePromise
  let rejectPromise

  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  const clearTimer = (timerRef) => {
    if (timerRef) {
      clearTimeout(timerRef)
    }
  }

  const clearAllTimers = () => {
    clearTimer(autoSequenceTimer)
    clearTimer(autoStartTimer)
    clearTimer(totalTimer)
  }

  const cleanup = () => {
    if (cleanedUp) {
      return
    }
    cleanedUp = true
    clearAllTimers()
    if (logcat && !logcat.killed) {
      logcat.kill('SIGTERM')
    }
  }

  const resolveSuccess = () => {
    if (terminated) {
      return
    }
    terminated = true
    cleanup()
    resolvePromise()
  }

  const rejectFailure = (message) => {
    if (terminated) {
      return
    }
    terminated = true
    cleanup()
    rejectPromise(new Error(message))
  }

  const stop = () => {
    if (terminated) {
      return
    }
    terminated = true
    cleanup()
    resolvePromise()
  }

  const safeLaunchApp = () => {
    if (terminated) {
      return Promise.resolve()
    }
    return launchApp().catch((error) => {
      rejectFailure(error.message)
    })
  }

  const startAutoSequenceTimer = () => {
    clearTimer(autoSequenceTimer)
    autoSequenceTimer = setTimeout(() => {
      rejectFailure('Timed out waiting for Foundations complete log after auto-sequence started.')
    }, AUTO_SEQUENCE_TIMEOUT_MS)
  }

  const scheduleAutoStartTimeout = () => {
    clearTimer(autoStartTimer)
    autoStartTimer = setTimeout(() => {
      if (terminated) {
        return
      }
      if (!retriggered) {
        retriggered = true
        log('Auto-sequence not detected yet, re-triggering demo URI...')
        safeLaunchApp().then(() => {
          if (!terminated) {
            scheduleAutoStartTimeout()
          }
        })
      } else {
        rejectFailure('Timed out waiting for the demo auto-sequence to begin.')
      }
    }, AUTO_SEQUENCE_START_TIMEOUT_MS)
  }

  const processLine = (line) => {
    if (!line) {
      return
    }

    crashContext.push(line)
    if (crashContext.length > MAX_CRASH_CONTEXT_LINES) {
      crashContext.shift()
    }

    const hasAppContext =
      line.includes(PACKAGE_NAME) || crashContext.some((recentLine) => recentLine.includes(PACKAGE_NAME))
    const isCrashLine = CRASH_KEYWORDS.some((keyword) => line.includes(keyword))
    if (isCrashLine && hasAppContext) {
      console.log(`${CRASH_PREFIX} ${line}`)
    }

    const appMessage = extractAppLogMessage(line)
    if (appMessage) {
      console.log(appMessage)
    }

    if (!isDemoMode(mode)) {
      return
    }

    if (line.includes(GAME_LOADED_TOKEN)) {
      log('Detected demo-game load signal.')
    }
    if (line.includes(AUTO_SEQUENCE_TOKEN)) {
      log('Detected demo auto-sequence start.')
      clearTimer(autoStartTimer)
      startAutoSequenceTimer()
    }
    if (line.includes(COMPLETION_TOKEN) || line.includes(GAME_COMPLETED_TOKEN)) {
      log('Game completion detected via logcat.')
      resolveSuccess()
    }
  }

  logcat.stdout.on('data', (data) => {
    buffer += data.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    lines.forEach(processLine)
  })

  logcat.stderr.on('data', (data) => {
    logError(`logcat stderr: ${data.toString().trim()}`)
  })

  logcat.on('error', (error) => {
    rejectFailure(`logcat failed: ${error.message}`)
  })

  logcat.on('close', (code) => {
    if (!terminated) {
      rejectFailure(`logcat exited unexpectedly (code ${code}).`)
    }
  })

  if (isDemoMode(mode)) {
    scheduleAutoStartTimeout()
    totalTimer = setTimeout(() => {
      rejectFailure('Total timeout reached while waiting for demo completion.')
    }, TOTAL_TIMEOUT_MS)
  }

  return { promise, cleanup, stop }
}

const main = async () => {
  let monitor
  let handleSigint
  let sigintReceived = false
  let mode = DEFAULT_MODE

  try {
    mode = parseMode()
    ensureValidMode(mode)
    log(`Running run-demo-autosolve in ${mode} mode.`)

    await ensureDevice()
    await runCommand('adb', ['shell', 'am', 'force-stop', PACKAGE_NAME])

    log('Building and installing release APK (expo run:android --variant release)...')
    await runCommandWithProgress(
      'npx',
      ['expo', 'run:android', '--variant', 'release'],
      { silent: true },
      { label: 'Build & install release APK' },
    )

    log(INSTALL_SUCCESS_MESSAGE)

    await runCommand('adb', ['logcat', '-c'])

    const logcat = startLogcatListener()
    const launchApp = createLauncherForMode(mode)
    monitor = createLogMonitor({ mode, logcat, launchApp })

    handleSigint = () => {
      if (!sigintReceived) {
        log('Received SIGINT, stopping log monitor...')
      }
      sigintReceived = true
      monitor.stop()
    }

    process.on('SIGINT', handleSigint)

    const targetUri = getUriForMode(mode)
    log(`Launching app via URI ${targetUri}...`)
    await launchApp()

    if (!isDemoMode(mode)) {
      log(PROD_MODE_READY_MESSAGE)
    }

    await monitor.promise

    monitor.cleanup()
    process.removeListener('SIGINT', handleSigint)

    if (isDemoMode(mode) || sigintReceived) {
      process.exit(0)
    }
  } catch (error) {
    logError(error.message)
    if (monitor) {
      monitor.cleanup()
    }
    if (handleSigint) {
      process.removeListener('SIGINT', handleSigint)
    }
    process.exit(1)
  }
}

main()


