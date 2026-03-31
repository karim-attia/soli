#!/usr/bin/env node

/**
 * Installs the release build on a connected Android device and triggers the demo game
 * (with auto-solve) to exercise the foundations-complete logging path.
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const DEMO_URI = 'soli:///?demo=autosolve'
const BASE_APP_URI = 'soli:///'
const GAME_LOADED_TOKEN = '[Demo] Game loaded'
const AUTO_SEQUENCE_QUEUED_TOKEN = '[Demo] Auto sequence queued'
const AUTO_SEQUENCE_COMPLETED_QUEUE_TOKEN =
  '[Demo] Auto sequence completed dispatch queue.'
const GAME_COMPLETED_TOKEN = '[Game] Foundations complete, player won the game.'
const CELEBRATION_HANDOFF_START_TOKEN = '[CelebrationHandoff] start'
const CELEBRATION_START_TOKEN = '[Celebration] start'
const COMPLETION_TOKEN = 'Foundations complete'
const APP_LOG_PREFIX = '[SoliDev]'
const DEMO_LOAD_RETRIGGER_TIMEOUT_MS = 15000
const POST_COMPLETION_CELEBRATION_TIMEOUT_MS = 5000
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
const CRASH_KEYWORDS = [
  'FATAL',
  'AndroidRuntime',
  'Exception',
  'crash',
  'SIGSEGV',
  'SIGABRT',
  'SIGBUS',
]
const MAX_CRASH_CONTEXT_LINES = 8
const MODES = {
  DEMO: 'demo',
  PROD: 'prod',
}
const DEFAULT_MODE = MODES.DEMO
const INSTALL_SUCCESS_MESSAGE = 'Build & install completed successfully.'
const PROD_MODE_READY_MESSAGE =
  'Production mode active. Streaming filtered logs (press Ctrl+C to exit).'
const ADB_HEADER_PREFIX = 'List of devices'
const ADB_STATUS_DEVICE = 'device'
const REPOSITORY_ROOT = path.resolve(__dirname, '..')
const ENV_FILE_PATH = path.join(REPOSITORY_ROOT, '.env')
const ANDROID_PROJECT_PATH = path.join(REPOSITORY_ROOT, 'android')
const RELEASE_APK_PATH = path.join(
  ANDROID_PROJECT_PATH,
  'app',
  'build',
  'outputs',
  'apk',
  'release',
  'app-release.apk'
)
const REQUIRED_SIGNING_ENV_KEYS = [
  'SOLI_UPLOAD_STORE_FILE',
  'SOLI_UPLOAD_STORE_PASSWORD',
  'SOLI_UPLOAD_KEY_ALIAS',
  'SOLI_UPLOAD_KEY_PASSWORD',
]
const SIGNATURE_MISMATCH_MARKERS = [
  'INSTALL_FAILED_UPDATE_INCOMPATIBLE',
  'signatures do not match',
]
const TEMP_SCREEN_OFF_TIMEOUT_MS = 600000

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
  let message = match[1].replace(/^['",\s]+/, '')
  message = message.replace(/['"]$/g, '')
  if (!message.length) {
    return null
  }
  return message
}

const stripMatchingQuotes = (value) => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

const parseEnvFile = (contents) => {
  const envEntries = {}
  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      return
    }

    const normalized = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length)
      : trimmed
    const separatorIndex = normalized.indexOf('=')
    if (separatorIndex <= 0) {
      return
    }

    const key = normalized.slice(0, separatorIndex).trim()
    if (!key.length) {
      return
    }

    const rawValue = normalized.slice(separatorIndex + 1).trim()
    envEntries[key] = stripMatchingQuotes(rawValue)
  })

  return envEntries
}

const loadReleaseSigningEnv = () => {
  let loadedFromEnvFile = false
  if (fs.existsSync(ENV_FILE_PATH)) {
    const parsedEnv = parseEnvFile(fs.readFileSync(ENV_FILE_PATH, 'utf8'))
    REQUIRED_SIGNING_ENV_KEYS.forEach((key) => {
      if (!process.env[key] && parsedEnv[key]) {
        process.env[key] = parsedEnv[key]
        loadedFromEnvFile = true
      }
    })
  }

  const missingKeys = REQUIRED_SIGNING_ENV_KEYS.filter((key) => !process.env[key])
  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required release-signing variables for demo auto-solve: ${missingKeys.join(
        ', '
      )}. The demo runner now follows the release signing path, so add these to ${ENV_FILE_PATH} or export them in the shell before running.`
    )
  }

  const storeFile = process.env.SOLI_UPLOAD_STORE_FILE
  const resolvedStoreFile = path.isAbsolute(storeFile)
    ? storeFile
    : path.resolve(REPOSITORY_ROOT, storeFile)
  if (!fs.existsSync(resolvedStoreFile)) {
    throw new Error(
      `Release keystore file not found at "${resolvedStoreFile}". The demo runner could not match the release signing path.`
    )
  }

  process.env.SOLI_UPLOAD_STORE_FILE = resolvedStoreFile
  log(
    loadedFromEnvFile
      ? `Loaded release signing env from ${ENV_FILE_PATH}.`
      : 'Using release signing env from the current shell.'
  )
}

const installReleaseApk = async (deviceSerial) => {
  try {
    await runCommand(
      'adb',
      ['-s', deviceSerial, 'install', '-r', RELEASE_APK_PATH],
      { capture: true }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const isSignatureMismatch = SIGNATURE_MISMATCH_MARKERS.some((marker) =>
      message.includes(marker)
    )
    if (isSignatureMismatch) {
      throw new Error(
        `Release APK install failed with a signature mismatch. The demo runner now uses the same signing contract as the release path, so this indicates the built APK still did not match the app already installed on the device. Verify the SOLI_UPLOAD_* values in ${ENV_FILE_PATH} or your shell, and confirm they match the installed release signing key.\n${message}`,
        { cause: error }
      )
    }
    throw error
  }
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
    throw new Error(
      `Unsupported mode "${mode}". Supported modes: ${validModes.join(', ')}`
    )
  }
}

const isDemoMode = (mode) => mode === MODES.DEMO

const getUriForMode = (mode, launchCount = 0) => {
  const baseUri = isDemoMode(mode) ? DEMO_URI : BASE_APP_URI
  if (launchCount <= 0) {
    return baseUri
  }
  return `${baseUri}#retry-${launchCount}`
}
const createLauncherForMode =
  ({ deviceSerial, mode }) =>
  (() => {
    let launchCount = 0

    return () => {
      const targetUri = getUriForMode(mode, launchCount)
      launchCount += 1
      return runCommand('adb', [
        '-s',
        deviceSerial,
        'shell',
        'am',
        'start',
        '-W',
        '-a',
        'android.intent.action.VIEW',
        '-d',
        targetUri,
        `${PACKAGE_NAME}/.MainActivity`,
      ])
    }
  })()

const formatClockDuration = (ms, options = {}) => {
  const { roundUp = false } = options
  const rawSeconds = roundUp
    ? Math.ceil(ms / MS_PER_SECOND)
    : Math.floor(ms / MS_PER_SECOND)
  const totalSeconds = Math.max(0, rawSeconds)
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  const seconds = totalSeconds % SECONDS_PER_MINUTE
  return `${String(minutes).padStart(CLOCK_PAD_LENGTH, CLOCK_PAD_CHAR)}:${String(
    seconds
  ).padStart(CLOCK_PAD_LENGTH, CLOCK_PAD_CHAR)}`
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

const createProgressTracker = (
  label,
  expectedDurationMs = DEFAULT_EXPECTED_BUILD_TIME_MS
) => {
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
    const ratio =
      forceComplete || expectedTotal === 0 ? 1 : Math.min(1, elapsed / expectedTotal)
    let segments = Math.floor(ratio * PROGRESS_BAR_WIDTH)
    if (forceComplete) {
      segments = PROGRESS_BAR_WIDTH
    } else {
      segments = Math.max(PROGRESS_MIN_SEGMENTS, segments)
      segments = Math.min(maxSegmentsBeforeCompletion, segments)
    }

    const remainingMs = forceComplete ? 0 : Math.max(0, expectedTotal - elapsed)
    const baseLine = `${renderProgressBar(segments)} ${segments}/${PROGRESS_BAR_WIDTH} elapsed ${formatClockDuration(
      elapsed
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
          elapsed
        )}`,
      })
      log(
        `Measured ${label} duration: ${formatVerboseDuration(elapsed)} (${formatClockDuration(elapsed)}).`
      )
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
        const errorOutput =
          options.capture || options.silent ? `${stdout}\n${stderr}`.trim() : ''
        reject(
          new Error(
            `Command failed (${code}): ${command} ${args.join(' ')}${
              errorOutput ? `\n${errorOutput}` : ''
            }`
          )
        )
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

const parseConnectedDeviceLines = (stdout) =>
  stdout
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.startsWith(ADB_HEADER_PREFIX))
    .map((line) => {
      const [serial, status] = line.split('\t')
      return {
        serial: serial?.trim() ?? '',
        status: status?.trim() ?? '',
      }
    })
    .filter(({ serial, status }) => serial.length > 0 && status === ADB_STATUS_DEVICE)

const ensureDevice = async () => {
  const { stdout } = await runCommand('adb', ['devices'], { capture: true })
  const connectedDevices = parseConnectedDeviceLines(stdout)
  if (!connectedDevices.length) {
    throw new Error(
      'No Android device detected. Connect a device or start an emulator, then enable USB debugging (adb devices).'
    )
  }
  const connectedDeviceDescriptions = connectedDevices
    .map(({ serial, status }) => `${serial}\t${status}`)
    .join(', ')
  log(`Detected device(s): ${connectedDeviceDescriptions}`)
  return connectedDevices[0].serial
}

const getScreenOffTimeout = async (deviceSerial) => {
  const { stdout } = await runCommand(
    'adb',
    ['-s', deviceSerial, 'shell', 'settings', 'get', 'system', 'screen_off_timeout'],
    { capture: true, silent: true }
  )
  const trimmed = stdout.trim()
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null
}

const setScreenOffTimeout = async (deviceSerial, timeoutMs) => {
  await runCommand(
    'adb',
    [
      '-s',
      deviceSerial,
      'shell',
      'settings',
      'put',
      'system',
      'screen_off_timeout',
      String(timeoutMs),
    ],
    { capture: true, silent: true }
  )
}

const unlockDevice = (deviceSerial) =>
  runCommand(
    path.join(REPOSITORY_ROOT, 'scripts', 'android-unlock-pattern.sh'),
    ['--serial', deviceSerial],
    { capture: true, silent: true }
  )

const startLogcatListener = (deviceSerial) =>
  spawn('adb', ['-s', deviceSerial, 'logcat'], { stdio: ['ignore', 'pipe', 'pipe'] })

const createLogMonitor = ({ mode, logcat, launchApp }) => {
  let cleanedUp = false
  let terminated = false
  let buffer = ''
  let retriggered = false
  let demoLoadTimer = null
  let postCompletionTimer = null
  let totalTimer = null
  let gameLoadedDetected = false
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
    clearTimer(demoLoadTimer)
    clearTimer(postCompletionTimer)
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

  const scheduleDemoLoadRetrigger = () => {
    clearTimer(demoLoadTimer)
    demoLoadTimer = setTimeout(() => {
      if (terminated) {
        return
      }
      if (gameLoadedDetected) {
        return
      }
      if (!retriggered) {
        retriggered = true
        log('Demo load signal not detected yet, re-triggering demo URI...')
        safeLaunchApp().then(() => {
          if (!terminated && !gameLoadedDetected) {
            scheduleDemoLoadRetrigger()
          }
        })
      } else {
        log(
          'Demo load signal still not detected after retry; continuing to wait for completion until the total timeout.'
        )
      }
    }, DEMO_LOAD_RETRIGGER_TIMEOUT_MS)
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
      line.includes(PACKAGE_NAME) ||
      crashContext.some((recentLine) => recentLine.includes(PACKAGE_NAME))
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
      gameLoadedDetected = true
      clearTimer(demoLoadTimer)
      log('Detected demo-game load signal.')
    }
    if (line.includes(AUTO_SEQUENCE_QUEUED_TOKEN)) {
      log('Detected demo auto-sequence queue signal.')
    }
    if (line.includes(AUTO_SEQUENCE_COMPLETED_QUEUE_TOKEN)) {
      log('Detected demo dispatch-queue completion signal.')
    }
    if (
      line.includes(CELEBRATION_HANDOFF_START_TOKEN) ||
      line.includes(CELEBRATION_START_TOKEN)
    ) {
      log('Celebration start detected via logcat.')
      resolveSuccess()
      return
    }
    if (line.includes(COMPLETION_TOKEN) || line.includes(GAME_COMPLETED_TOKEN)) {
      if (!isDemoMode(mode)) {
        log('Game completion detected via logcat.')
        resolveSuccess()
        return
      }

      log('Game completion detected via logcat; waiting briefly for celebration start.')
      clearTimer(postCompletionTimer)
      postCompletionTimer = setTimeout(() => {
        log(
          'Celebration start was not observed after win completion; treating the completed game as success.'
        )
        resolveSuccess()
      }, POST_COMPLETION_CELEBRATION_TIMEOUT_MS)
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
    scheduleDemoLoadRetrigger()
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
  let deviceSerial = null
  let previousScreenOffTimeout = null
  let exitCode = 0

  try {
    mode = parseMode()
    ensureValidMode(mode)
    log(`Running run-demo-autosolve in ${mode} mode.`)
    loadReleaseSigningEnv()

    deviceSerial = await ensureDevice()
    previousScreenOffTimeout = await getScreenOffTimeout(deviceSerial)
    if (previousScreenOffTimeout !== TEMP_SCREEN_OFF_TIMEOUT_MS) {
      await setScreenOffTimeout(deviceSerial, TEMP_SCREEN_OFF_TIMEOUT_MS)
      log(
        `Temporarily set screen-off timeout to ${TEMP_SCREEN_OFF_TIMEOUT_MS}ms for demo automation.`
      )
    }
    await unlockDevice(deviceSerial)
    await runCommand('adb', [
      '-s',
      deviceSerial,
      'shell',
      'am',
      'force-stop',
      PACKAGE_NAME,
    ])

    log('Building release APK via Gradle...')
    await runCommandWithProgress(
      './gradlew',
      ['app:assembleRelease', '--no-daemon', '--console=plain'],
      {
        silent: true,
        spawnOptions: { cwd: ANDROID_PROJECT_PATH, env: process.env },
      },
      { label: 'Build release APK' }
    )
    await installReleaseApk(deviceSerial)

    log(INSTALL_SUCCESS_MESSAGE)

    await runCommand('adb', ['-s', deviceSerial, 'logcat', '-c'])
    await unlockDevice(deviceSerial)

    const logcat = startLogcatListener(deviceSerial)
    const launchApp = createLauncherForMode({ deviceSerial, mode })
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
  } catch (error) {
    exitCode = 1
    logError(error instanceof Error ? error.message : String(error))
    if (monitor) {
      monitor.cleanup()
    }
    if (handleSigint) {
      process.removeListener('SIGINT', handleSigint)
    }
  } finally {
    if (deviceSerial && previousScreenOffTimeout !== null) {
      try {
        await setScreenOffTimeout(deviceSerial, previousScreenOffTimeout)
      } catch (error) {
        logError(
          `Failed to restore screen-off timeout: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }
  }

  if (isDemoMode(mode) || sigintReceived || exitCode !== 0) {
    process.exit(exitCode)
  }
}

main()
