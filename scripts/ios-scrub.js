#!/usr/bin/env node

/**
 * iOS undo-scrubber drag via Appium (scrubber-test-automation, Part A).
 *
 * agent-device cannot drive the RNGH scrub pan on iOS (it synthesizes every
 * pan as a single ~300 ms swipe — no hold, no paced move events, so the pan
 * never activates). Appium W3C pointer actions CAN: press → 200 ms hold →
 * paced pointerMove segments → release. Proven on this exact gesture in the
 * historical 20-6 Appium suite (Dec 2025, 20/20).
 *
 * Plain HTTP against a locally running Appium 3 server (XCUITest driver) —
 * deliberately no WebDriver client library, zero npm deps (see plan's
 * "Simplification ideas"). Requires global tools:
 *   npm i -g appium && appium driver install xcuitest && appium
 *
 * Usage:
 *   node scripts/ios-scrub.js --from 40 --max 80 --to 20   # scrub to index 20
 *   node scripts/ios-scrub.js --to 0                        # full left (no from/max needed)
 *   node scripts/ios-scrub.js --to max                      # full right
 *
 * Options: --udid (default: booted simulator), --bundle-id (default
 * ch.karimattia.soli), --port (default 4723), --duration-ms (default 1500),
 * --keep-session, --velocity-fallback.
 *
 * The scrub track is invisible to XCUITest at rest (opacity-0 overlay), so the
 * script cannot read the current position from the tree — pass --from/--max
 * (the deterministic "scrubbed" demo state supplies 40/80).
 */

const { execFileSync } = require('child_process')

const DEFAULT_BUNDLE_ID = 'ch.karimattia.soli'
const DEFAULT_PORT = 4723
const DEFAULT_DRAG_DURATION_MS = 1500
// UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING in src/features/klondike/constants.ts.
// Track bounds = [safeAreaLeft + 40, windowWidth - safeAreaRight - 40]; we assume
// horizontal safe-area insets are 0 (true for iPhones in portrait — tests run
// portrait; landscape on notched devices would shift this).
const TRACK_HORIZONTAL_PADDING = 40
// RNGH pan config (useUndoScrubber.ts): minDistance 5 px, failOffsetY 100 px.
// Hold ~200 ms before moving — NOT > 500 ms, which XCUITest registers as a
// long-press instead of the start of a pan.
const PRESS_HOLD_MS = 200
const RELEASE_SETTLE_MS = 120
const MOVE_SEGMENTS = 4

const args = parseArgs(process.argv.slice(2))

main().catch((error) => {
  console.error(`[ios-scrub] ${error.message}`)
  process.exit(1)
})

function parseArgs(argv) {
  const parsed = { keepSession: false, velocityFallback: false }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const next = () => {
      i += 1
      if (argv[i] === undefined) {
        throw new Error(`Missing value for ${flag}`)
      }
      return argv[i]
    }
    switch (flag) {
      case '--to':
        parsed.to = next()
        break
      case '--from':
        parsed.from = Number(next())
        break
      case '--max':
        parsed.max = Number(next())
        break
      case '--udid':
        parsed.udid = next()
        break
      case '--bundle-id':
        parsed.bundleId = next()
        break
      case '--port':
        parsed.port = Number(next())
        break
      case '--duration-ms':
        parsed.durationMs = Number(next())
        break
      case '--keep-session':
        parsed.keepSession = true
        break
      case '--velocity-fallback':
        parsed.velocityFallback = true
        break
      default:
        console.error(`[ios-scrub] Unknown flag: ${flag}`)
        process.exit(1)
    }
  }
  return parsed
}

function bootedSimulatorUdid() {
  const output = execFileSync('xcrun', ['simctl', 'list', 'devices', 'booted'], {
    encoding: 'utf8',
  })
  const match = output.match(/\(([0-9A-F-]{36})\) \(Booted\)/i)
  if (!match) {
    throw new Error('No booted simulator found (xcrun simctl list devices booted).')
  }
  return match[1]
}

async function api(baseUrl, method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.value?.message ?? JSON.stringify(payload)
    throw new Error(`${method} ${path} failed (${response.status}): ${message}`)
  }
  return payload.value
}

async function main() {
  if (args.to === undefined) {
    throw new Error(
      'Required: --to <index|max> (plus --from/--max unless --to is 0 or max).'
    )
  }
  const toMax = args.to === 'max'
  const toIndex = toMax ? NaN : Number(args.to)
  if (!toMax && (!Number.isInteger(toIndex) || toIndex < 0)) {
    throw new Error(`--to must be a non-negative integer or "max", got: ${args.to}`)
  }
  // --to 0 / --to max drag to the track edge, which needs no anchor math.
  const needsAnchor = !toMax && toIndex !== 0
  if (needsAnchor) {
    if (!Number.isInteger(args.from) || !Number.isInteger(args.max)) {
      throw new Error('--from and --max are required unless --to is 0 or max.')
    }
    if (args.from < 0 || args.from > args.max || toIndex > args.max) {
      throw new Error(
        `Inconsistent indices: from=${args.from} to=${args.to} max=${args.max}`
      )
    }
  }

  const port = args.port ?? DEFAULT_PORT
  const baseUrl = `http://127.0.0.1:${port}`

  // 1. Preflight the server.
  try {
    await api(baseUrl, 'GET', '/status')
  } catch {
    console.error(
      [
        `[ios-scrub] No Appium server reachable on ${baseUrl}. Setup:`,
        '  npm i -g appium',
        '  appium driver install xcuitest',
        '  appium   # leave running in a separate terminal',
      ].join('\n')
    )
    process.exit(1)
  }

  const udid = args.udid ?? bootedSimulatorUdid()
  const bundleId = args.bundleId ?? DEFAULT_BUNDLE_ID

  // 2. Create session. noReset attaches to the installed dev build without
  // reinstalling. First session per simulator boot compiles WebDriverAgent
  // (~1 min); later sessions are fast.
  console.log(`[ios-scrub] Creating session (udid=${udid}, bundleId=${bundleId})...`)
  const session = await api(baseUrl, 'POST', '/session', {
    capabilities: {
      alwaysMatch: {
        platformName: 'iOS',
        'appium:automationName': 'XCUITest',
        'appium:udid': udid,
        'appium:bundleId': bundleId,
        'appium:noReset': true,
        'appium:newCommandTimeout': 120,
      },
    },
  })
  const sessionId = session.sessionId
  const sessionUrl = `${baseUrl}/session/${sessionId}`

  try {
    // 3. Undo button center = press point. `accessibility id` matches the RN testID.
    const element = await api(baseUrl, 'POST', `/session/${sessionId}/element`, {
      using: 'accessibility id',
      value: 'undo',
    })
    const elementId = Object.values(element)[0]
    const rect = await api(
      baseUrl,
      'GET',
      `/session/${sessionId}/element/${elementId}/rect`
    )
    const pressX = rect.x + rect.width / 2
    const pressY = rect.y + rect.height / 2

    const window = await api(baseUrl, 'GET', `/session/${sessionId}/window/rect`)
    const trackLeft = TRACK_HORIZONTAL_PADDING
    const trackRight = window.width - TRACK_HORIZONTAL_PADDING

    // 4. Target X. Press anchors index `from` at pressX; the finger ranges
    // [trackLeft, pressX] cover `from` undo steps and [pressX, trackRight]
    // cover `max - from` redo steps (useUndoScrubber.ts anchor math).
    let targetX
    if (toMax) {
      targetX = trackRight
    } else if (toIndex === 0) {
      targetX = trackLeft
    } else if (toIndex < args.from) {
      targetX = pressX - ((args.from - toIndex) / args.from) * (pressX - trackLeft)
    } else if (toIndex > args.from) {
      targetX =
        pressX + ((toIndex - args.from) / (args.max - args.from)) * (trackRight - pressX)
    } else {
      targetX = pressX
    }
    targetX = Math.max(trackLeft, Math.min(targetX, trackRight))

    console.log(
      `[ios-scrub] Drag: press (${pressX.toFixed(0)}, ${pressY.toFixed(0)}) → x=${targetX.toFixed(0)} (track ${trackLeft}..${trackRight.toFixed(0)})`
    )

    if (args.velocityFallback) {
      // WDA-native pressAndDragWithVelocity — fallback if W3C pacing regresses.
      await api(baseUrl, 'POST', `/session/${sessionId}/execute/sync`, {
        script: 'mobile: dragFromToWithVelocity',
        args: [
          {
            pressDuration: 0.3,
            holdDuration: 0.1,
            velocity: 200,
            fromX: pressX,
            fromY: pressY,
            toX: targetX,
            toY: pressY,
          },
        ],
      })
    } else {
      // 5. W3C actions: press → hold → PACED move segments → release. Several
      // segments matter: one long move is effectively what agent-device sends,
      // and it never activates the pan.
      const durationMs = args.durationMs ?? DEFAULT_DRAG_DURATION_MS
      const segmentMs = Math.max(1, Math.round(durationMs / MOVE_SEGMENTS))
      const moveActions = []
      for (let segment = 1; segment <= MOVE_SEGMENTS; segment += 1) {
        moveActions.push({
          type: 'pointerMove',
          duration: segmentMs,
          x: pressX + ((targetX - pressX) * segment) / MOVE_SEGMENTS,
          y: pressY,
        })
      }
      await api(baseUrl, 'POST', `/session/${sessionId}/actions`, {
        actions: [
          {
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
              { type: 'pointerMove', duration: 0, x: pressX, y: pressY },
              { type: 'pointerDown', button: 0 },
              { type: 'pause', duration: PRESS_HOLD_MS },
              ...moveActions,
              { type: 'pause', duration: RELEASE_SETTLE_MS },
              { type: 'pointerUp', button: 0 },
            ],
          },
        ],
      })
    }

    console.log(`[ios-scrub] Drag dispatched (to=${args.to}).`)
    if (args.keepSession) {
      console.log(`[ios-scrub] Session kept alive: ${sessionUrl}`)
    }
  } finally {
    if (!args.keepSession) {
      await api(baseUrl, 'DELETE', `/session/${sessionId}`).catch(() => {})
    }
  }
}
