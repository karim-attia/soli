#!/usr/bin/env node

/**
 * Node entry for `yarn ios` — iOS parity with Android `yarn release` (see
 * docs/product/ios-build-workflow/ios-build-workflow.md). Picks a simulator
 * deterministically, takes the shared build lock, kills competing builds,
 * builds a RELEASE app via wrapped `expo run:ios` with the quiet progress bar,
 * verifies the install, and exits — no lingering Metro.
 *
 * Why wrap `expo run:ios` instead of bare xcodebuild+simctl (unlike Android's
 * bare gradlew): the CLI handles CocoaPods install on dep changes, workspace/
 * scheme/destination resolution, DerivedData app-path lookup, prebuild when
 * ios/ is missing, and install+launch — reimplementing that is a high
 * regression surface for a few seconds of gain.
 *
 * Why Release is the default (Debug needs --debug): agents are the dominant
 * users and need a self-contained binary (bundle embedded), clean exit (no
 * Metro), and production-fidelity animations — the exact Android-parity loop.
 *
 * Modes:
 * - default: build Release, verify install, exit 0 (expo launches the app).
 * - --logs: additionally stream [SoliDev]-filtered app console output via the
 *   simulator's unified log stream until Ctrl+C (a console-pty relaunch is
 *   kept alongside purely as the crash/exit sentinel — see the log-streaming
 *   section for the empirical channel findings).
 * - --auto-solve: run the demo playlist via the soli:/// deep link (no
 *   screen-timeout/unlock handling needed — it's a simulator).
 * - --debug: escape hatch for manual dev — Debug config with Metro attached
 *   and full CLI output; the process intentionally lingers. Still lock-guarded.
 *
 * No bash wrapper (unlike Android): iOS has no signing env or adb discovery
 * equivalent, so this Node entry is the whole `yarn ios`.
 */

const { spawn } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const {
  PACKAGE_NAME,
  LOG_MONITOR_MODES,
  REPOSITORY_ROOT,
  log,
  logError,
  formatClockDuration,
  runCommand,
  runCommandWithProgress,
  createBuildLogFilePath,
  printBuildLogTail,
  getExpectedBuildDuration,
  recordBuildDuration,
  preflightKillCompetingBuilds,
  acquireBuildLock,
  createLogMonitor,
} = require('./lib/build-tools')

// No bash phase on iOS, so the total duration starts here (Android seeds this
// from run-android-release.sh to include adb discovery).
const RUN_START_MS = Date.now()

const IOS_BUILD_FALLBACK_DURATION_MS = 300000 // Release simulator builds are slow.
const INSTALL_FRESHNESS_WINDOW_MS = 5 * 60 * 1000

// Demo sizing — kept in sync with scripts/build-install-android.js.
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

const KNOWN_FLAGS = ['--logs', '--auto-solve', '--debug']

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
  const parsed = {
    logs: args.includes('--logs'),
    autoSolve: args.includes('--auto-solve'),
    debug: args.includes('--debug'),
  }
  if (parsed.debug && (parsed.logs || parsed.autoSolve)) {
    throw new Error(
      '--debug attaches Metro (which already streams logs) and cannot be combined with --logs/--auto-solve.'
    )
  }
  return parsed
}

const runSimctl = (args) =>
  runCommand('xcrun', ['simctl', ...args], { capture: true, silent: true })

// --- Simulator selection: booted > SOLI_IOS_SIMULATOR > newest iPhone. ---

// Runtime keys look like "com.apple.CoreSimulator.SimRuntime.iOS-26-5".
const parseRuntimeVersion = (runtimeKey) =>
  runtimeKey.split('.').pop().split('-').slice(1).map(Number)

const compareRuntimeVersions = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) {
      return diff
    }
  }
  return 0
}

const selectSimulator = async () => {
  const { stdout } = await runSimctl(['list', 'devices', '--json'])
  const runtimeMap = JSON.parse(stdout).devices
  const devices = Object.entries(runtimeMap).flatMap(([runtimeKey, entries]) =>
    entries
      .filter((entry) => entry.isAvailable)
      .map((entry) => ({ ...entry, runtimeKey }))
  )

  const booted = devices.filter((entry) => entry.state === 'Booted')
  if (booted.length === 1) {
    return { device: booted[0], needsBoot: false }
  }
  if (booted.length > 1) {
    const device = booted.reduce((best, entry) =>
      new Date(entry.lastBootedAt ?? 0) > new Date(best.lastBootedAt ?? 0) ? entry : best
    )
    log(
      `Multiple booted simulators; using ${device.name} (${device.udid}), most recently booted.`
    )
    return { device, needsBoot: false }
  }

  const requestedName = process.env.SOLI_IOS_SIMULATOR
  if (requestedName) {
    const device = devices.find((entry) => entry.name === requestedName)
    if (!device) {
      const availableNames = [...new Set(devices.map((entry) => entry.name))].join(', ')
      throw new Error(
        `SOLI_IOS_SIMULATOR="${requestedName}" matches no available simulator. Available: ${availableNames}`
      )
    }
    return { device, needsBoot: true }
  }

  // Newest iPhone: highest iOS runtime, then the LAST matching entry within
  // it (simctl lists device types oldest-first).
  const iphones = devices.filter(
    (entry) => entry.name.startsWith('iPhone') && entry.runtimeKey.includes('iOS')
  )
  if (!iphones.length) {
    throw new Error(
      'No available iPhone simulators found. Install one via Xcode > Settings > Platforms.'
    )
  }
  const newestRuntimeKey = iphones
    .map((entry) => entry.runtimeKey)
    .reduce((best, key) =>
      compareRuntimeVersions(parseRuntimeVersion(key), parseRuntimeVersion(best)) > 0
        ? key
        : best
    )
  const candidates = iphones.filter((entry) => entry.runtimeKey === newestRuntimeKey)
  return { device: candidates[candidates.length - 1], needsBoot: true }
}

const bootSimulator = async (udid) => {
  // Tolerate "Unable to boot device in current state: Booted".
  await runSimctl(['boot', udid]).catch(() => {})
  // Booting via simctl alone leaves the device headless — bring the UI up.
  await runCommand('open', ['-a', 'Simulator'], { capture: true, silent: true })
  // Blocks until fully booted (-b also boots if somehow shut down again).
  await runSimctl(['bootstatus', udid, '-b'])
}

// --- Build ---

const buildIosApp = async ({ udid, debug }) => {
  const logFilePath = createBuildLogFilePath('-ios')
  fs.mkdirSync(path.dirname(logFilePath), { recursive: true })
  const logStream = fs.createWriteStream(logFilePath)
  const durationKey = debug ? 'ios-debug' : 'ios-release'
  const configurationArgs = debug
    ? ['--configuration', 'Debug']
    : ['--configuration', 'Release', '--no-bundler']

  log(`Building iOS ${debug ? 'Debug' : 'Release'} app via expo run:ios...`)
  try {
    const { durationMs } = await runCommandWithProgress(
      'npx',
      ['expo', 'run:ios', '--device', udid, ...configurationArgs],
      {
        silent: true,
        onOutput: (chunk) => logStream.write(chunk),
        spawnOptions: { cwd: REPOSITORY_ROOT, env: process.env },
      },
      {
        expectedDurationMs: getExpectedBuildDuration(
          durationKey,
          IOS_BUILD_FALLBACK_DURATION_MS
        ),
      }
    )
    recordBuildDuration(durationKey, durationMs)
  } catch (error) {
    logStream.end()
    logError(`Build failed. Full build log: ${logFilePath}`)
    printBuildLogTail(logFilePath)
    // One-line rethrow — the runCommand error embeds the ENTIRE captured CLI
    // output (same quiet-console fix as buildReleaseApk on Android).
    throw new Error(`iOS build failed. Full log: ${logFilePath}`, { cause: error })
  }
  logStream.end()
  log(`Full build log: ${logFilePath}`)
}

// --- Install verification (parity with Android's versionCode+lastUpdateTime):
// get_app_container proves the app is installed; CFBundleVersion must match
// app.json ios.buildNumber; a bundle mtime within the freshness window guards
// the same-version-but-stale case (versionCode/buildNumber rarely bumps in
// local dev). simctl install mtime behavior is unverified, so freshness uses
// the newest of Info.plist and the .app dir mtimes (install re-creates the
// container dir even if file mtimes were preserved).

const readExpectedBuildNumber = () => {
  const appJson = JSON.parse(
    fs.readFileSync(path.join(REPOSITORY_ROOT, 'app.json'), 'utf8')
  )
  const buildNumber = appJson?.expo?.ios?.buildNumber
  if (!buildNumber) {
    throw new Error(
      'Could not read expo.ios.buildNumber from app.json — cannot verify the install.'
    )
  }
  return String(buildNumber)
}

const verifyIosInstallLanded = async (udid) => {
  const expectedBuildNumber = readExpectedBuildNumber()

  let appPath
  try {
    const { stdout } = await runSimctl(['get_app_container', udid, PACKAGE_NAME, 'app'])
    appPath = stdout.trim()
  } catch (error) {
    throw new Error(
      `Install verification failed: ${PACKAGE_NAME} is not installed on simulator ${udid}. The build likely did not land — check the build log and rerun.`,
      { cause: error }
    )
  }

  const infoPlistPath = path.join(appPath, 'Info.plist')
  const { stdout: versionOut } = await runCommand(
    '/usr/libexec/PlistBuddy',
    ['-c', 'Print :CFBundleVersion', infoPlistPath],
    { capture: true, silent: true }
  )
  const installedBuildNumber = versionOut.trim()
  if (installedBuildNumber !== expectedBuildNumber) {
    throw new Error(
      `Install verification failed: installed CFBundleVersion=${installedBuildNumber} (expected ${expectedBuildNumber}). The simulator is running a stale build — try "xcrun simctl uninstall ${udid} ${PACKAGE_NAME}", then rerun.`
    )
  }

  const bundleUpdatedMs = Math.max(
    fs.statSync(infoPlistPath).mtimeMs,
    fs.statSync(appPath).mtimeMs
  )
  const updateAgeMs = Date.now() - bundleUpdatedMs
  if (updateAgeMs > INSTALL_FRESHNESS_WINDOW_MS) {
    throw new Error(
      `Install verification failed: build ${installedBuildNumber} bundle was last updated ${new Date(bundleUpdatedMs).toLocaleString()} — not within the last ${INSTALL_FRESHNESS_WINDOW_MS / 60000} minutes. The install likely did not land — try "xcrun simctl uninstall ${udid} ${PACKAGE_NAME}", then rerun.`
    )
  }
  log(
    `Install verified: build ${installedBuildNumber}, bundle updated ${new Date(bundleUpdatedMs).toLocaleTimeString()}.`
  )
}

// --- Log streaming (--logs / --auto-solve). Channel verified empirically
// 2026-07-07 (plan step 7a) — the result INVERTED the plan's prediction: the
// console-pty carried only native stderr/glog lines in Release, while the
// unified log stream DOES carry [SoliDev] — RN 0.86 routes JS console output
// to os_log at Info level (category com.facebook.react.log:javascript) even
// in Release. So the monitor consumes a `log stream` child (predicated on the
// app process), and console-pty is kept ONLY as the crash/exit sentinel for
// --logs (the pty blocks while the app lives; EOF = the app process died).
// The stream child quacks like the logcat child createLogMonitor expects
// (stdout/stderr line streams + close event), so the monitor is reused
// unchanged; unified-log lines quote console args the same way logcat does,
// so extractAppLogMessage works as-is.

// Unified-log lines carry the process name from app.json expo.name ("Soli"),
// not the bundle id.
const APP_PROCESS_NAME = 'Soli'

const startLogStreamListener = (udid) =>
  spawn(
    'xcrun',
    [
      'simctl',
      'spawn',
      udid,
      'log',
      'stream',
      '--level',
      'debug',
      '--style',
      'compact',
      '--predicate',
      `process == "${APP_PROCESS_NAME}"`,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  )

const startConsolePtyLaunch = (udid) => {
  const child = spawn(
    'xcrun',
    [
      'simctl',
      'launch',
      '--console-pty',
      '--terminate-running-process',
      udid,
      PACKAGE_NAME,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  )
  // Drain and discard: nobody reads the pty output ([SoliDev] comes from the
  // log stream), and an unread full pipe could stall the app's stdio writes.
  child.stdout.resume()
  child.stderr.resume()
  return child
}

// Guards against a false [CRASH] report: the pty process can die while the
// app lives (observed 2026-07-07 during verification when the spawning shell
// exited). Inconclusive check → assume alive.
const isAppRunning = async (udid) => {
  try {
    const { stdout } = await runSimctl(['spawn', udid, 'launchctl', 'list'])
    return stdout.includes(PACKAGE_NAME)
  } catch {
    return true
  }
}

// Best-effort pointer at the newest matching crash report — deliberately just
// a directory scan (no `simctl diagnose`, which is a multi-minute dump).
const findNewestCrashReport = () => {
  try {
    const reportsDir = path.join(os.homedir(), 'Library', 'Logs', 'DiagnosticReports')
    const newest = fs
      .readdirSync(reportsDir)
      .filter((name) => name.endsWith('.ips') && name.toLowerCase().includes('soli'))
      .map((name) => {
        const fullPath = path.join(reportsDir, name)
        return { fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs }
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]
    return newest?.fullPath ?? null
  } catch {
    return null
  }
}

// Retries append a #retry-<n> fragment so the OS treats the URL as new
// (mirrors the Android launcher's dedupe workaround).
const createOpenUrlLauncher = ({ udid, uri }) => {
  let launchCount = 0
  return () => {
    const targetUri = launchCount > 0 ? `${uri}#retry-${launchCount}` : uri
    launchCount += 1
    return runSimctl(['openurl', udid, targetUri])
  }
}

const reportCrashAndExit = () => {
  logError('[CRASH] app process exited.')
  const crashReport = findNewestCrashReport()
  if (crashReport) {
    logError(`Newest matching crash report: ${crashReport}`)
  }
  process.exit(1)
}

const runLogsMode = async (udid) => {
  // Log stream attached BEFORE the relaunch (parity with Android attaching
  // logcat before launch) so startup crashes are captured.
  const logStream = startLogStreamListener(udid)
  const monitor = createLogMonitor({
    mode: LOG_MONITOR_MODES.LOGS,
    logcat: logStream,
    launchApp: () => Promise.resolve(),
  })

  // Relaunch via console-pty: the pty blocks while the app lives, so its EOF
  // is the crash/exit sentinel (its output is discarded — see above).
  const consolePty = startConsolePtyLaunch(udid)
  let stopping = false
  consolePty.on('close', () => {
    if (stopping) {
      return
    }
    void isAppRunning(udid).then((alive) => {
      if (stopping || alive) {
        return
      }
      monitor.cleanup()
      reportCrashAndExit()
    })
  })

  process.on('SIGINT', () => {
    stopping = true
    log('Received SIGINT, stopping log monitor...')
    if (!consolePty.killed) {
      consolePty.kill('SIGTERM')
    }
    monitor.stop()
  })

  log('Streaming filtered logs (press Ctrl+C to exit).')
  await monitor.promise
  monitor.cleanup()
  if (!consolePty.killed) {
    consolePty.kill('SIGTERM')
  }
  process.exit(0)
}

const runAutoSolve = async (udid) => {
  // Attach the log stream FIRST, then deliver the demo deep link into the
  // app expo just launched — the earliest demo tokens are captured and the
  // openurl deep link needs no relaunch (verified 2026-07-07: openurl into
  // the running Release app starts the playlist).
  const logStream = startLogStreamListener(udid)
  const launchApp = createOpenUrlLauncher({ udid, uri: DEMO_URI })
  const monitor = createLogMonitor({
    mode: LOG_MONITOR_MODES.DEMO,
    logcat: logStream,
    launchApp,
    totalTimeoutMs: DEMO_TOTAL_TIMEOUT_MS,
  })

  process.on('SIGINT', () => {
    log('Received SIGINT, stopping log monitor...')
    monitor.stop()
  })

  log(`Launching demo playlist via URI ${DEMO_URI}...`)
  try {
    await launchApp()
    await monitor.promise
  } catch (error) {
    logError(error instanceof Error ? error.message : String(error))
    monitor.cleanup()
    process.exit(1)
  }
  monitor.cleanup()
  process.exit(0)
}

const main = async () => {
  const { logs, autoSolve, debug } = parseArgs()
  if (logs && autoSolve) {
    // Accept the combination instead of erroring — agents combine flags.
    log('--auto-solve already streams the filtered logs; --logs is redundant.')
  }

  // Lock first, kill second — same order as Android (round-3 bug fix: never
  // preflight-kill a lock-managed build you are about to defer to). The kill
  // patterns (expo run:/xcodebuild/gradle clients) already cover iOS; `expo
  // start` (Metro dev server) deliberately does NOT match on either platform —
  // killing a legitimate dev server would be hostile, and a running Metro is
  // harmless to a Release/--no-bundler build.
  acquireBuildLock()
  await preflightKillCompetingBuilds()

  const { device, needsBoot } = await selectSimulator()
  if (needsBoot) {
    await bootSimulator(device.udid)
    log(`Using simulator ${device.name} (${device.udid}), booted it.`)
  } else {
    log(`Using simulator ${device.name} (${device.udid}).`)
  }

  if (debug) {
    // Escape hatch for manual dev: full CLI output (no noise reduction) and
    // Metro stays attached — the process intentionally lingers until Ctrl+C,
    // so no progress bar, duration recording, or install verification (the
    // quiet wrapper would never resolve while Metro runs).
    log('Debug mode: full expo output, Metro attached — Ctrl+C to stop.')
    await runCommand(
      'npx',
      ['expo', 'run:ios', '--device', device.udid, '--configuration', 'Debug'],
      { spawnOptions: { cwd: REPOSITORY_ROOT, env: process.env } }
    )
    process.exit(0)
  }

  await buildIosApp({ udid: device.udid, debug: false })
  await verifyIosInstallLanded(device.udid)

  if (autoSolve) {
    await runAutoSolve(device.udid)
    return
  }

  if (!logs) {
    // expo run:ios already launched the app — no relaunch needed (a second
    // deep-link launch would be redundant; Android needs `am start` only
    // because bare gradlew does not launch).
    log(
      `Build, install, and launch completed successfully in ${formatClockDuration(
        Date.now() - RUN_START_MS
      )}.`
    )
    process.exit(0)
  }

  await runLogsMode(device.udid)
}

main().catch((error) => {
  logError(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
