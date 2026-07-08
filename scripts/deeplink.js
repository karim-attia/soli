#!/usr/bin/env node

/**
 * `yarn deeplink <shortcut|'<soli:// url>'> [args] [--cold|--warm] [--ios|--android] [--serial <s>] [--no-retry]`
 *
 * Generic delivery wrapper for the Soli deep-link test hooks, plus named
 * shortcuts (yarn celebration / scrubtest / nearwin / seedhistory). It encodes
 * the delivery foot-guns as code — auto retry nonce (defeats BOTH dedup layers:
 * Android intent dedup and the in-app lastDemoLinkRef), per-shortcut cold
 * defaults, adb serial selection, device auto-targeting — NOT a link catalog:
 * that deliberately lives only in .agents/skills/soli-testing/SKILL.md, so
 * per-link docs can't go stale in two places.
 *
 * Default target: the connected Android device (Karim's phone — his typical
 * manual case, zero flags). Falls back to a booted iOS simulator when no adb
 * device is connected; `--ios` forces the simulator (agents usually want this).
 * 2026-07-07: flipped from sim-first to android-first per Karim.
 */

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const PACKAGE_NAME = 'ch.karimattia.soli'
const UNLOCK_SCRIPT = path.join(__dirname, 'android-unlock-pattern.sh')
const ANDROID_READY_SCRIPT = path.join(__dirname, 'android-ready.sh')
const USAGE =
  "Usage: yarn deeplink <shortcut|'<soli:// url>'> [args] [--cold|--warm] [--ios|--android] [--serial <s>] [--no-retry]\n" +
  'Shortcuts: celebration [modeId] · scrubtest [steps] [scrub] · nearwin [left] · seedhistory [clear]'

// Fixture shortcuts (scrubtest/nearwin) force-stop by DEFAULT: a stale demo
// playlist still running in the warm app can overwrite the fixture you just
// loaded (the known warm-app trap, skill section 3). celebration/seedhistory
// act on the running app state, so they deliver warm. --cold/--warm override.
const SHORTCUTS = {
  celebration: {
    cold: false,
    build: ([modeId]) => `soli://?celebration=${modeId ?? 'random'}`,
  },
  scrubtest: {
    cold: true,
    build: ([steps, scrub]) =>
      'soli://?demo=scrubbed' +
      (steps !== undefined ? `&steps=${steps}` : '') +
      (scrub !== undefined ? `&scrub=${scrub}` : ''),
  },
  nearwin: {
    cold: true,
    build: ([left]) =>
      `soli://?demo=nearwin${left !== undefined ? `&left=${left}` : ''}`,
  },
  seedhistory: {
    cold: false,
    build: ([action]) => `soli://?seedHistory=${action === 'clear' ? 'clear' : 'default'}`,
  },
}

const fail = (message) => {
  console.error(`[deeplink] ${message}`)
  process.exit(1)
}

const run = (command, args) => spawnSync(command, args, { encoding: 'utf8' })

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    positionals: [],
    cold: null, // null = use shortcut default (raw URLs default to warm)
    target: null, // null = auto (android device > booted sim; see header)
    serial: null,
    retry: true,
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--cold') {
      options.cold = true
    } else if (arg === '--warm') {
      options.cold = false
    } else if (arg === '--android') {
      options.target = 'android'
    } else if (arg === '--ios') {
      options.target = 'ios'
    } else if (arg === '--no-retry') {
      options.retry = false
    } else if (arg === '--serial') {
      index += 1
      options.serial = args[index] || fail('--serial needs a value.')
    } else if (arg.startsWith('--')) {
      fail(`Unknown flag ${arg}.\n${USAGE}`)
    } else {
      options.positionals.push(arg)
    }
  }
  if (!options.positionals.length) {
    fail(USAGE)
  }
  return options
}

const resolveUrlAndCold = (options) => {
  const [first, ...shortcutArgs] = options.positionals
  const shortcut = SHORTCUTS[first]
  if (shortcut) {
    return {
      url: shortcut.build(shortcutArgs),
      cold: options.cold ?? shortcut.cold,
    }
  }
  if (!first.startsWith('soli://')) {
    fail(`Not a shortcut or soli:// URL: "${first}".\n${USAGE}`)
  }
  if (shortcutArgs.length) {
    fail(`Unexpected extra argument "${shortcutArgs[0]}" after a raw URL.`)
  }
  return { url: first, cold: options.cold ?? false }
}

const hasBootedSimulator = () => {
  const result = run('xcrun', ['simctl', 'list', 'devices', 'booted'])
  return result.status === 0 && result.stdout.includes('(Booted)')
}

const listAndroidSerials = () => {
  const result = run('adb', ['devices'])
  if (result.status !== 0 || result.error) {
    return []
  }
  return result.stdout
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length === 2 && parts[1] === 'device')
    .map((parts) => parts[0])
}

const resolveAndroidSerial = (explicit) => {
  if (explicit) {
    return explicit
  }
  if (process.env.ANDROID_SERIAL) {
    return process.env.ANDROID_SERIAL
  }
  let serials = listAndroidSerials()
  if (!serials.length) {
    // Self-heal: android-ready.sh reconnects wireless adb (same bounded
    // discovery as yarn release), pins to :5555, wakes, and unlocks; inherit
    // stdio so its progress lines reach the caller.
    console.log('[deeplink] No adb device connected — running scripts/android-ready.sh...')
    const ready = spawnSync(ANDROID_READY_SCRIPT, [], { stdio: 'inherit' })
    if (ready.status === 0) {
      serials = listAndroidSerials()
    }
    if (!serials.length) {
      fail('No adb device reachable even after android-ready.sh. Use --ios for the simulator.')
    }
  }
  if (serials.length > 1) {
    // Never guess between devices — one might be Karim's main phone.
    fail(`Multiple adb devices connected; pass --serial. Found: ${serials.join(', ')}`)
  }
  return serials[0]
}

const main = () => {
  const options = parseArgs()
  const { url: baseUrl, cold } = resolveUrlAndCold(options)
  // Auto nonce unless the caller already controls the fragment or wants dedup.
  const url =
    options.retry && !baseUrl.includes('#')
      ? `${baseUrl}#retry-${Date.now()}`
      : baseUrl
  // Android-first: phone when connected, sim as fallback (see header comment).
  const target =
    options.target ??
    (options.serial || process.env.ANDROID_SERIAL || listAndroidSerials().length
      ? 'android'
      : 'ios')

  if (target === 'android') {
    const serial = resolveAndroidSerial(options.serial)
    // Cheap preflight so links land on a usable screen: wake (harmless key
    // event) + unlock via the local-only pattern script (gitignored; safe
    // no-op when already unlocked). The reconnect loop only runs in the
    // no-device path above (android-ready.sh) — the connected path stays fast.
    run('adb', ['-s', serial, 'shell', 'input', 'keyevent', 'KEYCODE_WAKEUP'])
    if (fs.existsSync(UNLOCK_SCRIPT)) {
      run(UNLOCK_SCRIPT, ['--serial', serial])
    }
    if (cold) {
      run('adb', ['-s', serial, 'shell', 'am', 'force-stop', PACKAGE_NAME])
    }
    // Inner single quotes survive adb's arg join and protect ?/&/# from the
    // DEVICE shell (am start runs through it).
    const result = run('adb', [
      '-s', serial, 'shell', 'am', 'start', '-W',
      '-a', 'android.intent.action.VIEW',
      '-d', `'${url}'`, `${PACKAGE_NAME}/.MainActivity`,
    ])
    process.stdout.write(result.stdout || '')
    if (result.status !== 0) {
      fail(`am start failed: ${(result.stderr || '').trim()}`)
    }
    console.log(`[deeplink] Delivered${cold ? ' cold' : ''} to Android ${serial}: ${url}`)
    return
  }

  if (!hasBootedSimulator()) {
    fail('No booted iOS simulator. Boot one, or use --android.')
  }
  if (cold) {
    // A non-zero exit here just means the app was not running — fine for cold.
    run('xcrun', ['simctl', 'terminate', 'booted', PACKAGE_NAME])
  }
  const result = run('xcrun', ['simctl', 'openurl', 'booted', url])
  if (result.status !== 0) {
    fail(`simctl openurl failed: ${(result.stderr || '').trim()}`)
  }
  console.log(`[deeplink] Delivered${cold ? ' cold' : ''} to booted iOS simulator: ${url}`)
}

main()
