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
 * Auto-target: booted iOS simulator if one exists, else the connected Android
 * device (Karim's typical case: no sim booted, phone plugged in → zero flags).
 */

const { spawnSync } = require('child_process')

const PACKAGE_NAME = 'ch.karimattia.soli'
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
    target: null, // null = auto (booted sim > android device)
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

const resolveAndroidSerial = (explicit) => {
  if (explicit) {
    return explicit
  }
  if (process.env.ANDROID_SERIAL) {
    return process.env.ANDROID_SERIAL
  }
  const result = run('adb', ['devices'])
  if (result.status !== 0 || result.error) {
    fail(`adb devices failed: ${(result.stderr || result.error?.message || '').trim()}`)
  }
  const serials = result.stdout
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length === 2 && parts[1] === 'device')
    .map((parts) => parts[0])
  if (!serials.length) {
    fail('No adb devices connected (and no booted iOS simulator).')
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
  const target = options.target ?? (hasBootedSimulator() ? 'ios' : 'android')

  if (target === 'android') {
    const serial = resolveAndroidSerial(options.serial)
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
