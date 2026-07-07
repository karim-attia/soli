#!/usr/bin/env node

/**
 * Node entry for `yarn release` — invoked by run-android-release.sh after env
 * loading, signing patch, and adb discovery (ANDROID_SERIAL exported). Builds
 * the release APK quietly, installs, verifies, launches, then exits.
 *
 * Modes:
 * - default: build, install, verify, launch soli:///, exit 0.
 * - --logs: additionally stream filtered [SoliDev] logs until Ctrl+C.
 * - --auto-solve: run the demo playlist (replaces the former
 *   `yarn demo:auto-solve` / scripts/run-demo-autosolve.js, deleted 2026-07).
 *   Going through run-android-release.sh means auto-solve now gets wireless adb
 *   discovery + the signing patch (previously plain `adb devices`) — strictly
 *   more robust.
 */

const {
  PACKAGE_NAME,
  LOG_MONITOR_MODES,
  log,
  logError,
  formatClockDuration,
  loadReleaseSigningEnv,
  runCommand,
  preflightKillCompetingBuilds,
  acquireBuildLock,
  buildReleaseApk,
  installReleaseApk,
  verifyInstallLanded,
  ensureDevice,
  getScreenOffTimeout,
  setScreenOffTimeout,
  unlockDevice,
  startLogcatListener,
  createLauncher,
  createLogMonitor,
} = require('./lib/build-tools')

const BASE_APP_URI = 'soli:///'

// Total-duration start: run-android-release.sh exports SOLI_RELEASE_START_EPOCH_MS
// before its adb discovery so the reported total includes the bash phase
// (discovery/pinning can take tens of seconds); Date.now() is the fallback
// when this entry is run directly.
const RUN_START_MS = Number(process.env.SOLI_RELEASE_START_EPOCH_MS) || Date.now()

const DEMO_GAME_LIMIT = Number(process.env.DEMO_GAME_LIMIT ?? '')
const DEMO_PLAYLIST_MAX_GAMES = 20
const DEMO_GAME_COUNT =
  Number.isInteger(DEMO_GAME_LIMIT) && DEMO_GAME_LIMIT > 0
    ? Math.min(DEMO_GAME_LIMIT, DEMO_PLAYLIST_MAX_GAMES)
    : DEMO_PLAYLIST_MAX_GAMES
const DEMO_TOTAL_TIMEOUT_MS = DEMO_GAME_COUNT * 60 * 1000
const DEMO_URI = `soli:///?${new URLSearchParams({
  demo: 'playlist',
  games: String(DEMO_GAME_COUNT),
}).toString()}`
const TEMP_SCREEN_OFF_TIMEOUT_MS = 600000

const KNOWN_FLAGS = ['--logs', '--auto-solve']

const parseArgs = () => {
  const args = process.argv.slice(2)
  const unknown = args.filter((arg) => !KNOWN_FLAGS.includes(arg))
  if (unknown.length) {
    // Fail loudly on unknown flags — agents mistype flags and a silently
    // ignored flag would make them trust behavior that never happened.
    throw new Error(
      `Unknown argument(s): ${unknown.join(' ')}. Supported: ${KNOWN_FLAGS.join(', ')}`
    )
  }
  return { logs: args.includes('--logs'), autoSolve: args.includes('--auto-solve') }
}

const adbShell = (deviceSerial, args) =>
  runCommand('adb', ['-s', deviceSerial, ...args], { capture: true, silent: true })

// Best-effort model name for the "Using device" line — a serial like an mDNS
// alias or ip:port tells Karim nothing about which phone this is.
const getDeviceModel = async (deviceSerial) => {
  try {
    const { stdout } = await adbShell(deviceSerial, [
      'shell',
      'getprop',
      'ro.product.model',
    ])
    return stdout.trim() || null
  } catch {
    return null
  }
}

// Demo playlist flow (former run-demo-autosolve.js main, minus build/install
// which already ran). Owns screen-off save/restore and always exits itself —
// exit 0 on playlist completion or Ctrl+C, exit 1 on playlist failure/timeout.
const runAutoSolve = async (deviceSerial) => {
  let monitor
  let previousScreenOffTimeout = null
  let exitCode = 0

  try {
    previousScreenOffTimeout = await getScreenOffTimeout(deviceSerial)
    if (previousScreenOffTimeout !== TEMP_SCREEN_OFF_TIMEOUT_MS) {
      await setScreenOffTimeout(deviceSerial, TEMP_SCREEN_OFF_TIMEOUT_MS)
      log(
        `Temporarily set screen-off timeout to ${TEMP_SCREEN_OFF_TIMEOUT_MS}ms for demo automation.`
      )
    }
    await unlockDevice(deviceSerial)
    await adbShell(deviceSerial, ['logcat', '-c'])

    const logcat = startLogcatListener(deviceSerial)
    const launchApp = createLauncher({ deviceSerial, uri: DEMO_URI })
    monitor = createLogMonitor({
      mode: LOG_MONITOR_MODES.DEMO,
      logcat,
      launchApp,
      totalTimeoutMs: DEMO_TOTAL_TIMEOUT_MS,
    })

    process.on('SIGINT', () => {
      log('Received SIGINT, stopping log monitor...')
      monitor.stop()
    })

    log(`Launching app via URI ${DEMO_URI}...`)
    await launchApp()

    await monitor.promise
    monitor.cleanup()
  } catch (error) {
    exitCode = 1
    logError(error instanceof Error ? error.message : String(error))
    if (monitor) {
      monitor.cleanup()
    }
  } finally {
    if (previousScreenOffTimeout !== null) {
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

  process.exit(exitCode)
}

const main = async () => {
  const { logs, autoSolve } = parseArgs()
  if (logs && autoSolve) {
    // Accept the combination instead of erroring — agents combine flags.
    log('--auto-solve already streams the filtered logs; --logs is redundant.')
  }

  // Lock first so a live soli-managed build is never killed: with the old
  // order (kill -> lock) a second `yarn release` started mid-build would
  // preflight-kill the first run's Gradle client (it matches the gradlew
  // patterns and is not an ancestor) and only THEN abort at the lock — killing
  // the legitimate build it was about to defer to. Once we own the lock, the
  // preflight only clears NON-lock-managed builds (stray gradle clients,
  // expo run:, xcodebuild). Fixed round 3 2026-07.
  acquireBuildLock()
  await preflightKillCompetingBuilds()
  loadReleaseSigningEnv()

  // run-android-release.sh exports ANDROID_SERIAL after wireless discovery;
  // ensureDevice() is the fallback when this entry is run directly.
  const deviceSerial = process.env.ANDROID_SERIAL || (await ensureDevice())
  const deviceModel = await getDeviceModel(deviceSerial)
  log(`Using device ${deviceModel ? `${deviceModel} (${deviceSerial})` : deviceSerial}.`)

  if (autoSolve) {
    // Stop the app before building so the fresh install starts a clean demo.
    await adbShell(deviceSerial, ['shell', 'am', 'force-stop', PACKAGE_NAME])
    log(`Running auto-solve demo playlist (${DEMO_GAME_COUNT} game(s)).`)
  }

  await buildReleaseApk()
  await installReleaseApk(deviceSerial)
  await verifyInstallLanded(deviceSerial)

  if (autoSolve) {
    await runAutoSolve(deviceSerial)
    return
  }

  await unlockDevice(deviceSerial).catch(() => {})
  const launchApp = createLauncher({ deviceSerial, uri: BASE_APP_URI })

  if (!logs) {
    log(`Launching app via URI ${BASE_APP_URI}...`)
    await launchApp()
    // Exit by default so autonomous agent runs never hang on a lingering
    // process; log streaming is opt-in via --logs. No logcat listener was
    // started on this path, so nothing can keep the process alive.
    log(
      `Build, install, and launch completed successfully in ${formatClockDuration(
        Date.now() - RUN_START_MS
      )}.`
    )
    process.exit(0)
  }

  // Clear logcat and attach the listener BEFORE launching (like the old
  // `yarn prod`): otherwise a crash during app startup — the main thing
  // --logs exists to catch — would be missed.
  await adbShell(deviceSerial, ['logcat', '-c'])
  const logcat = startLogcatListener(deviceSerial)
  const monitor = createLogMonitor({
    mode: LOG_MONITOR_MODES.LOGS,
    logcat,
    launchApp,
  })

  process.on('SIGINT', () => {
    log('Received SIGINT, stopping log monitor...')
    monitor.stop()
  })

  log(`Launching app via URI ${BASE_APP_URI}...`)
  await launchApp()
  log('Streaming filtered logs (press Ctrl+C to exit).')
  await monitor.promise
  monitor.cleanup()
  process.exit(0)
}

main().catch((error) => {
  logError(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
