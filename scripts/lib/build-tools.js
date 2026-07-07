/**
 * Shared build tooling (progress bar, preflight kill, build lock, duration
 * store, runCommand/log helpers) + Android-specific helpers (Gradle build,
 * adb install/verify/launch, logcat monitor). Consumed by
 * scripts/build-install-android.js (`yarn release`) and
 * scripts/build-install-ios.js (`yarn ios`); iOS-specific helpers live in the
 * iOS entry (single consumer — no premature lib split).
 * Renamed 2026-07 from android-release.js when `yarn ios` started sharing it
 * (kept as one file: a rename + import-path update was the fewest-moved-lines
 * option vs extracting a shared core). Extracted 2026-07 from the former
 * run-demo-autosolve.js so all build paths share one implementation. See
 * docs/product/yarn-release-improvements/yarn-release-improvements.md and
 * docs/product/ios-build-workflow/ios-build-workflow.md.
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const PACKAGE_NAME = 'ch.karimattia.soli'
const APP_LOG_PREFIX = '[SoliDev]'
const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..')
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
const APK_OUTPUT_METADATA_PATH = path.join(
  path.dirname(RELEASE_APK_PATH),
  'output-metadata.json'
)
const BUILD_LOG_DIRECTORY = path.join(REPOSITORY_ROOT, '.test-artifacts', 'builds')
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
// Transient adb transport failures worth one reconnect+retry (unlike signature
// mismatches, which are deterministic and retrying would only waste time).
const CONNECTION_ERROR_MARKERS = [
  'device offline',
  'not found',
  'no devices',
  'connection reset',
  'closed',
  'cannot connect',
]
const INSTALL_RETRY_WAIT_MS = 2000
const INSTALL_FRESHNESS_WINDOW_MS = 5 * 60 * 1000

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
const DEFAULT_EXPECTED_BUILD_TIME_MS = 60000

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

const ADB_HEADER_PREFIX = 'List of devices'
const ADB_STATUS_DEVICE = 'device'
const IP_PORT_SERIAL_PATTERN = /^\d+\.\d+\.\d+\.\d+:\d+$/

// Lock lives in /tmp (not the repo) so `git clean` can't remove it and it is
// shared across worktrees. mkdir-based because macOS ships no `flock` binary
// and fs.mkdirSync is atomic.
// Renamed 2026-07 from soli-android-build.lock when the lock became
// cross-platform (one lock for Android AND iOS — the machine can't handle two
// builds, so `yarn ios` and `yarn release` must mutually exclude). A run
// started with the old binary during the switchover isn't seen by the new
// path (one-time, self-healing — the old dir is never consulted again).
const LOCK_DIR = '/tmp/soli-build.lock'
const LOCK_PID_FILE = path.join(LOCK_DIR, 'pid')

const PREFLIGHT_KILL_GRACE_MS = 3000
const PREFLIGHT_COMMAND_PREVIEW_LENGTH = 80

const log = (message) => {
  console.log(`\x1b[36m[soli]\x1b[0m ${message}`)
}

const logError = (message) => {
  console.error(`\x1b[31m[soli]\x1b[0m ${message}`)
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

// Only fills unset vars, so calling it is a harmless no-op when
// run-android-release.sh already exported the signing env.
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
      `Missing required release-signing variables: ${missingKeys.join(
        ', '
      )}. Add these to ${ENV_FILE_PATH} or export them in the shell before running.`
    )
  }

  const storeFile = process.env.SOLI_UPLOAD_STORE_FILE
  const resolvedStoreFile = path.isAbsolute(storeFile)
    ? storeFile
    : path.resolve(REPOSITORY_ROOT, storeFile)
  if (!fs.existsSync(resolvedStoreFile)) {
    throw new Error(
      `Release keystore file not found at "${resolvedStoreFile}". The build cannot match the release signing path.`
    )
  }

  process.env.SOLI_UPLOAD_STORE_FILE = resolvedStoreFile
  // Silent when the shell already exported the env (the common yarn release
  // path) — output-cleanup round 2026-07: keep the happy path at ~7 lines.
  if (loadedFromEnvFile) {
    log(`Loaded release signing env from ${ENV_FILE_PATH}.`)
  }
}

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

const renderProgressBar = (filledSegments) => {
  const safeSegments = Math.min(PROGRESS_BAR_WIDTH, Math.max(0, filledSegments))
  const emptySegments = Math.max(0, PROGRESS_BAR_WIDTH - safeSegments)
  const filled = PROGRESS_BAR_FILLED_CHAR.repeat(safeSegments)
  const empty = PROGRESS_BAR_EMPTY_CHAR.repeat(emptySegments)
  return `${PROGRESS_BAR_PREFIX}${filled}${empty}${PROGRESS_BAR_SUFFIX}`
}

const createProgressTracker = (expectedDurationMs = DEFAULT_EXPECTED_BUILD_TIME_MS) => {
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
      // No separate "Measured <label> duration" line — the completion line
      // above already shows the duration (output-cleanup round 2026-07).
      render({
        final: true,
        forceComplete: true,
        overrideElapsed: elapsed,
        overrideMessage: `${renderProgressBar(PROGRESS_BAR_WIDTH)} ${PROGRESS_BAR_WIDTH}/${PROGRESS_BAR_WIDTH} - completed in ${formatClockDuration(
          elapsed
        )}`,
      })
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
        options.onOutput?.(data)
      })
      child.stderr.on('data', (data) => {
        stderr += data.toString()
        options.onOutput?.(data)
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
  const tracker = createProgressTracker(progressOptions.expectedDurationMs)
  try {
    const result = await runCommand(command, args, options)
    const durationMs = tracker.complete()
    return { ...result, durationMs }
  } catch (error) {
    tracker.fail()
    throw error
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const isProcessAlive = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Kill competing build processes (other `expo run:` invocations, xcodebuild,
 * Gradle build clients) so a fresh build never fights another one for CPU/RAM.
 *
 * Idle Gradle daemons (GradleDaemon) are deliberately spared: warm daemons are
 * what makes warm builds fast. Killing a busy daemon's *client* is sufficient —
 * Gradle daemons cancel the in-flight build when their client disconnects and
 * then return to idle.
 */
const preflightKillCompetingBuilds = async () => {
  const { stdout } = await runCommand('ps', ['-axo', 'pid,ppid,tty,command'], {
    silent: true,
  })

  const processes = stdout
    .split('\n')
    .map((line) => line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/))
    .filter(Boolean)
    .map(([, pid, ppid, tty, command]) => ({
      pid: Number(pid),
      ppid: Number(ppid),
      tty,
      command,
    }))

  // Exclude ourselves and every ancestor (yarn/sh wrappers) — their command
  // strings can mention build keywords and killing them would kill this run.
  const parentByPid = new Map(processes.map(({ pid, ppid }) => [pid, ppid]))
  const excludedPids = new Set()
  let ancestor = process.pid
  while (ancestor && ancestor > 1 && !excludedPids.has(ancestor)) {
    excludedPids.add(ancestor)
    ancestor = parentByPid.get(ancestor)
  }

  const isCompetingBuildCommand = (command) => {
    if (command.includes('GradleDaemon')) {
      return false
    }
    return (
      command.includes('expo run:') ||
      // The expo CLI's own node process shows as ".../expo/bin/cli run:ios",
      // NOT "expo run:" — found 2026-07-07 when a day-old `yarn ios` (raw
      // expo run:ios with Metro attached) survived the preflight kill.
      command.includes('expo/bin/cli run:') ||
      command.includes('xcodebuild') ||
      command.includes('GradleWrapperMain') ||
      command.includes('org.gradle.launcher.GradleMain') ||
      command.includes('gradlew')
    )
  }

  const targets = processes.filter(
    ({ pid, command }) => !excludedPids.has(pid) && isCompetingBuildCommand(command)
  )
  if (!targets.length) {
    return
  }

  targets.forEach(({ pid, tty, command }) => {
    log(
      `Killed competing build process: ${pid} ${command.slice(0, PREFLIGHT_COMMAND_PREVIEW_LENGTH)}`
    )
    // Best-effort note in the victim's terminal buffer: an agent attached to
    // that terminal would otherwise just see its build die with no explanation.
    // ps prints `??` for processes without a controlling TTY.
    if (tty && tty !== '??') {
      // O_NONBLOCK + O_NOCTTY: opening a terminal device without them can
      // block forever (observed 2026-07-07: a pty slave whose master had just
      // been preflight-killed hung open() ~5 min) or adopt the tty as our
      // controlling terminal. The note must never stall the run.
      try {
        const fd = fs.openSync(
          `/dev/${tty}`,
          fs.constants.O_WRONLY | fs.constants.O_NONBLOCK | fs.constants.O_NOCTTY
        )
        try {
          fs.writeSync(
            fd,
            `\n\x1b[36m[soli]\x1b[0m This process was killed by the soli build preflight (pid ${process.pid}) — only one Android/iOS build may run at a time.\n`
          )
        } finally {
          fs.closeSync(fd)
        }
      } catch {
        // TTY gone or not writable — the kill itself matters more than the note.
      }
    }
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // Process already gone; nothing to do.
    }
  })

  await sleep(PREFLIGHT_KILL_GRACE_MS)
  targets.forEach(({ pid }) => {
    if (isProcessAlive(pid)) {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        // Process exited between the check and the kill.
      }
    }
  })
}

let lockAcquired = false

const releaseBuildLock = () => {
  if (!lockAcquired) {
    return
  }
  lockAcquired = false
  fs.rmSync(LOCK_DIR, { recursive: true, force: true })
}

const tryCreateLockDir = () => {
  try {
    fs.mkdirSync(LOCK_DIR)
    return true
  } catch (error) {
    if (error.code === 'EEXIST') {
      return false
    }
    throw error
  }
}

const acquireBuildLock = () => {
  if (!tryCreateLockDir()) {
    const holderPid = Number(
      fs.existsSync(LOCK_PID_FILE) ? fs.readFileSync(LOCK_PID_FILE, 'utf8').trim() : NaN
    )
    if (Number.isInteger(holderPid) && isProcessAlive(holderPid)) {
      throw new Error(
        `Another build (Android or iOS) is already running (pid ${holderPid}). Wait for it or kill it, then rerun.`
      )
    }
    // Stale lock from a crashed run — remove and retry once.
    log(`Removing stale build lock (dead pid ${holderPid || 'unknown'}).`)
    fs.rmSync(LOCK_DIR, { recursive: true, force: true })
    if (!tryCreateLockDir()) {
      throw new Error(
        'Another build grabbed the build lock while a stale lock was being cleared. Rerun.'
      )
    }
  }

  fs.writeFileSync(LOCK_PID_FILE, String(process.pid))
  lockAcquired = true

  process.on('exit', releaseBuildLock)
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      releaseBuildLock()
      // Only force-exit when nobody else handles the signal; entries with a
      // graceful shutdown path (log monitor stop) exit on their own and the
      // 'exit' hook would have released the lock anyway.
      if (process.listenerCount(signal) <= 1) {
        process.exit(signal === 'SIGINT' ? 130 : 143)
      }
    })
  }
}

const createBuildLogFilePath = (suffix = '') => {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return path.join(BUILD_LOG_DIRECTORY, `${timestamp}${suffix}.log`)
}

// --- Build-duration store: seeds the progress bar with a real estimate from
// past builds instead of a fixed default. JSON keyed by build kind
// ("android-release", "ios-release", ...), last 5 durations per key. The LAST
// duration is used as the estimate (best predictor of the current warm/cold
// state; the tracker grows its estimate dynamically when exceeded, so a cold
// build after a warm one just grows). Lives in gitignored .test-artifacts/ —
// history vanishing on `git clean` is fine, the fallback takes over.
const BUILD_DURATIONS_PATH = path.join(BUILD_LOG_DIRECTORY, 'durations.json')
const BUILD_DURATIONS_KEEP = 5

const readBuildDurations = () => {
  try {
    const parsed = JSON.parse(fs.readFileSync(BUILD_DURATIONS_PATH, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    // Missing or corrupt stats must never fail a build.
    return {}
  }
}

const getExpectedBuildDuration = (key, fallbackMs) => {
  const durations = readBuildDurations()[key]
  const last = Array.isArray(durations) ? durations[durations.length - 1] : null
  return Number.isFinite(last) && last > 0 ? last : fallbackMs
}

const recordBuildDuration = (key, durationMs) => {
  try {
    const durations = readBuildDurations()
    durations[key] = [
      ...(Array.isArray(durations[key]) ? durations[key] : []),
      durationMs,
    ]
      .filter((value) => Number.isFinite(value) && value > 0)
      .slice(-BUILD_DURATIONS_KEEP)
    fs.mkdirSync(path.dirname(BUILD_DURATIONS_PATH), { recursive: true })
    fs.writeFileSync(BUILD_DURATIONS_PATH, `${JSON.stringify(durations, null, 2)}\n`)
  } catch {
    // Stats are a convenience — never fail a successful build over them.
  }
}

const printBuildLogTail = (logFilePath, lineCount = 40) => {
  try {
    const lines = fs.readFileSync(logFilePath, 'utf8').trimEnd().split('\n')
    console.error(lines.slice(-lineCount).join('\n'))
  } catch {
    // Log file missing/unreadable — the error message already names the path.
  }
}

// Bare `./gradlew` needs no expo codegen step: Expo autolinking runs from
// android/settings.gradle and RN codegen runs as Gradle tasks, both at Gradle
// time. `expo run:android` only regenerates android/ when it is missing —
// hence the prebuild guard below instead.
const buildReleaseApk = async ({ logFilePath = createBuildLogFilePath() } = {}) => {
  if (!fs.existsSync(path.join(ANDROID_PROJECT_PATH, 'app', 'build.gradle'))) {
    throw new Error('android/ not found — run "yarn prebuild:android" first.')
  }

  // Local phone builds only need arm64-v8a. This env project property overrides
  // the 4-ABI default in android/gradle.properties (survives `expo prebuild
  // --clean`) and does NOT affect Play Store builds (build-android.sh keeps all
  // ABIs). Benchmarked 2026-07-06: warm loop 47.6s -> ~39s (install of 50MB vs
  // 113MB APK); cold builds skip ~75% of native C++ compilation. See
  // docs/product/faster-builds/. Defaulted here (not in run-android-release.sh)
  // so demo builds get the single-ABI speedup too.
  process.env.ORG_GRADLE_PROJECT_reactNativeArchitectures ??= 'arm64-v8a'

  fs.mkdirSync(path.dirname(logFilePath), { recursive: true })
  const logStream = fs.createWriteStream(logFilePath)

  log('Building release APK via Gradle...')
  try {
    // `--no-daemon` removed 2026-07 so warm daemons are reused (the preflight
    // kill intentionally spares idle daemons for exactly this reason). If a
    // stale daemon misbehaves after toolchain upgrades (AGP/JDK), run
    // `./gradlew --stop`.
    const { durationMs } = await runCommandWithProgress(
      './gradlew',
      ['app:assembleRelease', '--console=plain'],
      {
        silent: true,
        onOutput: (chunk) => logStream.write(chunk),
        spawnOptions: { cwd: ANDROID_PROJECT_PATH, env: process.env },
      },
      { expectedDurationMs: getExpectedBuildDuration('android-release', 60000) }
    )
    recordBuildDuration('android-release', durationMs)
  } catch (error) {
    logStream.end()
    logError(`Build failed. Full Gradle log: ${logFilePath}`)
    printBuildLogTail(logFilePath)
    // Replace the runCommand error — its message embeds the ENTIRE captured
    // Gradle output (found during real-device testing 2026-07-06: a failed
    // build dumped ~600 raw Gradle lines to the console via main()'s catch,
    // defeating the quiet-console design). The full output is already in the
    // log file and the 40-line tail above.
    throw new Error(`Gradle build failed. Full log: ${logFilePath}`, { cause: error })
  }
  logStream.end()
  log(`Full Gradle log: ${logFilePath}`)
  return { logFilePath }
}

const isConnectionError = (message) =>
  CONNECTION_ERROR_MARKERS.some((marker) => message.includes(marker))

// silent: the raw `Running: adb ... install ...` echo added noise for zero
// signal (output-cleanup round 2026-07); failures still surface the captured
// adb output via the runCommand error message.
const runAdbInstall = (deviceSerial) =>
  runCommand('adb', ['-s', deviceSerial, 'install', '-r', RELEASE_APK_PATH], {
    capture: true,
    silent: true,
  })

const installReleaseApk = async (deviceSerial) => {
  // One measured line AFTER the install instead of an "Installing APK..."
  // line before it — installs normally take only a few seconds and the
  // duration is the interesting signal (Karim's request, round 3 2026-07).
  const installStart = Date.now()
  try {
    await runAdbInstall(deviceSerial)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const isSignatureMismatch = SIGNATURE_MISMATCH_MARKERS.some((marker) =>
      message.includes(marker)
    )
    if (isSignatureMismatch) {
      throw new Error(
        `Release APK install failed with a signature mismatch. This build uses the release signing contract, so the built APK did not match the app already installed on the device. Verify the SOLI_UPLOAD_* values in ${ENV_FILE_PATH} or your shell, and confirm they match the installed release signing key.\n${message}`,
        { cause: error }
      )
    }
    if (!isConnectionError(message)) {
      throw error
    }

    // Wi-Fi adb connections drop transiently (see docs/product/faster-builds/
    // Testing); one reconnect + reinstall attempt recovers most of these.
    log('Install hit a connection error; reconnecting and retrying once...')
    if (IP_PORT_SERIAL_PATTERN.test(deviceSerial)) {
      await runCommand('adb', ['connect', deviceSerial], {
        capture: true,
        silent: true,
      }).catch(() => {})
    }
    await sleep(INSTALL_RETRY_WAIT_MS)
    await runCommand('adb', ['-s', deviceSerial, 'get-state'], {
      capture: true,
      silent: true,
    })
    await runAdbInstall(deviceSerial)
  }
  log(`Installed APK in ${formatClockDuration(Date.now() - installStart)}.`)
}

const readExpectedVersionCode = () => {
  const metadata = JSON.parse(fs.readFileSync(APK_OUTPUT_METADATA_PATH, 'utf8'))
  const versionCode = metadata?.elements?.[0]?.versionCode
  if (!Number.isInteger(versionCode)) {
    throw new Error(
      `Could not read versionCode from ${APK_OUTPUT_METADATA_PATH} — cannot verify the install.`
    )
  }
  return versionCode
}

// AGP writes output-metadata.json next to the APK, so no `aapt` on PATH needed.
// The lastUpdateTime freshness check guards the common local-dev failure mode:
// same versionCode but a stale (not actually reinstalled) build on the device.
const verifyInstallLanded = async (deviceSerial) => {
  const expectedVersionCode = readExpectedVersionCode()
  const { stdout } = await runCommand(
    'adb',
    ['-s', deviceSerial, 'shell', 'dumpsys', 'package', PACKAGE_NAME],
    { capture: true, silent: true }
  )

  const installedVersionCode = Number(stdout.match(/versionCode=(\d+)/)?.[1])
  const lastUpdateTimeRaw = stdout.match(/lastUpdateTime=([^\r\n]+)/)?.[1]?.trim()
  const lastUpdateTime = lastUpdateTimeRaw ? new Date(lastUpdateTimeRaw) : null
  const updateAgeMs =
    lastUpdateTime && !Number.isNaN(lastUpdateTime.getTime())
      ? Date.now() - lastUpdateTime.getTime()
      : null

  const failureDetails = `installed versionCode=${installedVersionCode || 'unknown'} (expected ${expectedVersionCode}), lastUpdateTime=${lastUpdateTimeRaw ?? 'unknown'}`
  if (installedVersionCode !== expectedVersionCode) {
    throw new Error(
      `Install verification failed: ${failureDetails}. The device is running a stale build — try "adb uninstall ${PACKAGE_NAME}" and check the device connection, then rerun.`
    )
  }
  if (updateAgeMs === null || updateAgeMs > INSTALL_FRESHNESS_WINDOW_MS) {
    throw new Error(
      `Install verification failed: ${failureDetails} is not recent (expected an update within the last ${INSTALL_FRESHNESS_WINDOW_MS / 60000} minutes). The install likely did not land — try "adb uninstall ${PACKAGE_NAME}" and check the device connection, then rerun.`
    )
  }
  log(
    `Install verified: versionCode ${installedVersionCode}, updated ${lastUpdateTimeRaw}.`
  )
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

const quoteAndroidShellArg = (value) => `'${String(value).replace(/'/g, "'\\''")}'`

// Retries append a `#retry-<n>` fragment so Android treats the intent as new
// (identical VIEW intents on a running activity can be deduped/no-op).
const createLauncher = ({ deviceSerial, uri }) => {
  let launchCount = 0

  return () => {
    const targetUri = launchCount > 0 ? `${uri}#retry-${launchCount}` : uri
    launchCount += 1
    // silent capture: suppresses the raw Starting Intent/Status/LaunchState/
    // WaitTime block (output-cleanup round 2026-07); on failure the captured
    // output is part of the runCommand error message.
    return runCommand(
      'adb',
      [
        '-s',
        deviceSerial,
        'shell',
        'am',
        'start',
        '-W',
        '-a',
        'android.intent.action.VIEW',
        '-d',
        quoteAndroidShellArg(targetUri),
        `${PACKAGE_NAME}/.MainActivity`,
      ],
      { capture: true, silent: true }
    )
  }
}

const LOG_MONITOR_MODES = {
  DEMO: 'demo',
  LOGS: 'logs',
}

// Demo playlist tokens live here (next to the monitor that consumes them)
// rather than in the entry script — the monitor's retrigger/success/failure
// logic is inseparable from them and splitting would duplicate state handling.
const GAME_LOADED_TOKEN = '[Demo] Game loaded'
const AUTO_SEQUENCE_QUEUED_TOKEN = '[Demo] Auto sequence queued'
const AUTO_SEQUENCE_COMPLETED_QUEUE_TOKEN =
  '[Demo] Auto sequence completed dispatch queue.'
const PLAYLIST_GAME_LOADED_TOKEN = '[DemoPlaylist] Game '
const PLAYLIST_UNDO_TOKEN = '[DemoPlaylist] Undo probe'
const PLAYLIST_COMPLETED_TOKEN = '[DemoPlaylist] Playlist completed'
const PLAYLIST_FAILED_TOKEN = '[DemoPlaylist] Playlist failed'
const GAME_COMPLETED_TOKEN = '[Game] Foundations complete, player won the game.'
const CELEBRATION_HANDOFF_START_TOKEN = '[CelebrationHandoff] start'
const CELEBRATION_START_TOKEN = '[Celebration] start'
const COMPLETION_TOKEN = 'Foundations complete'
const DEMO_LOAD_RETRIGGER_TIMEOUT_MS = 15000

const createLogMonitor = ({ mode, logcat, launchApp, totalTimeoutMs }) => {
  const isDemoMode = mode === LOG_MONITOR_MODES.DEMO
  let cleanedUp = false
  let terminated = false
  let buffer = ''
  let retriggered = false
  let demoLoadTimer = null
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
    // postCompletionTimer removed 2026-07: it was declared but never set in the
    // original run-demo-autosolve.js monitor (dead code).
    clearTimer(demoLoadTimer)
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
    if (!line || terminated) {
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

    if (!isDemoMode) {
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
    if (line.includes(PLAYLIST_GAME_LOADED_TOKEN)) {
      gameLoadedDetected = true
      clearTimer(demoLoadTimer)
      log('Detected demo playlist game progress.')
    }
    if (line.includes(PLAYLIST_UNDO_TOKEN)) {
      log('Detected demo playlist undo probe.')
    }
    if (line.includes(PLAYLIST_FAILED_TOKEN)) {
      rejectFailure('Demo playlist reported failure in app logs.')
      return
    }
    if (line.includes(PLAYLIST_COMPLETED_TOKEN)) {
      log('Detected demo playlist completion.')
      resolveSuccess()
      return
    }
    if (
      line.includes(CELEBRATION_HANDOFF_START_TOKEN) ||
      line.includes(CELEBRATION_START_TOKEN)
    ) {
      log(
        'Celebration start detected via logcat; continuing to wait for playlist completion.'
      )
      return
    }
    if (line.includes(COMPLETION_TOKEN) || line.includes(GAME_COMPLETED_TOKEN)) {
      log(
        'Game completion detected via logcat; continuing to wait for playlist completion.'
      )
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

  if (isDemoMode) {
    scheduleDemoLoadRetrigger()
    totalTimer = setTimeout(() => {
      rejectFailure('Total timeout reached while waiting for demo playlist completion.')
    }, totalTimeoutMs)
  }

  return { promise, cleanup, stop }
}

module.exports = {
  PACKAGE_NAME,
  APP_LOG_PREFIX,
  REPOSITORY_ROOT,
  ENV_FILE_PATH,
  ANDROID_PROJECT_PATH,
  RELEASE_APK_PATH,
  LOG_MONITOR_MODES,
  log,
  logError,
  extractAppLogMessage,
  formatClockDuration,
  loadReleaseSigningEnv,
  runCommand,
  runCommandWithProgress,
  createProgressTracker,
  createBuildLogFilePath,
  printBuildLogTail,
  getExpectedBuildDuration,
  recordBuildDuration,
  preflightKillCompetingBuilds,
  acquireBuildLock,
  releaseBuildLock,
  buildReleaseApk,
  installReleaseApk,
  verifyInstallLanded,
  ensureDevice,
  getScreenOffTimeout,
  setScreenOffTimeout,
  unlockDevice,
  startLogcatListener,
  quoteAndroidShellArg,
  createLauncher,
  createLogMonitor,
}
