# Appium Guide

Last refreshed: 2026-07-06 (scrubber-test-automation planning; see refresh section at the bottom)

## Scope

- Package/tool: `appium` / XCUITest pointer-action tooling
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this guide as the current source-backed reference for Soli work involving this package or tool.

## Source-backed notes

This guide documents how to use Appium for automated iOS gesture testing, specifically for debugging the undo scrubber component.

## Sources

- https://appium.io/docs/en/3.5/reference/session/caps/
- https://appium.io/docs/en/3.4/guides/migrating-2-to-3/
- https://github.com/appium/appium-xcuitest-driver/blob/master/docs/reference/capabilities.md
- https://www.npmjs.com/package/appium

## Prerequisites

```bash
# Install Appium globally
npm install -g appium@3.5.2

# Install XCUITest driver
appium driver install xcuitest

# Verify installation
appium --version
appium driver list
```

## Starting Appium Server

```bash
# Start Appium server on default port
appium

# Or with verbose logging
appium --log-level debug
```

## Creating a Session

Key capability: `newCommandTimeout` - set high (600 seconds) to prevent session timeout.

```bash
# Create session with 10-minute timeout
curl -s -X POST http://localhost:4723/session \
  -H "Content-Type: application/json" \
  -d '{
    "capabilities": {
      "alwaysMatch": {
        "platformName": "iOS",
        "appium:automationName": "XCUITest",
        "appium:deviceName": "iPhone 16e",
        "appium:udid": "98C414EB-97A8-4DF4-913C-713A85A27B22",
        "appium:bundleId": "host.exp.Exponent",
        "appium:noReset": true,
        "appium:skipDeviceReset": true,
        "appium:newCommandTimeout": 600
      }
    }
  }'
```

## Useful Commands

### Get Session ID
```bash
# Extract session ID from creation response
SESSION_ID=$(curl -s -X POST http://localhost:4723/session ... | python3 -c "import sys,json; print(json.load(sys.stdin)['value']['sessionId'])")
```

### Get Page Source (find elements)
```bash
curl -s "http://localhost:4723/session/$SESSION_ID/source" | head -100
```

### Tap Action
```bash
curl -s -X POST "http://localhost:4723/session/$SESSION_ID/actions" \
  -H "Content-Type: application/json" \
  -d '{
    "actions": [{
      "type": "pointer",
      "id": "finger1",
      "parameters": {"pointerType": "touch"},
      "actions": [
        {"type": "pointerMove", "duration": 0, "x": 289, "y": 613},
        {"type": "pointerDown", "button": 0},
        {"type": "pause", "duration": 50},
        {"type": "pointerUp", "button": 0}
      ]
    }]
  }'
```

### Long Scrub Action (5 seconds)
```bash
curl -s -X POST "http://localhost:4723/session/$SESSION_ID/actions" \
  -H "Content-Type: application/json" \
  -d '{
    "actions": [{
      "type": "pointer",
      "id": "finger1",
      "parameters": {"pointerType": "touch"},
      "actions": [
        {"type": "pointerMove", "duration": 0, "x": 289, "y": 613},
        {"type": "pointerDown", "button": 0},
        {"type": "pause", "duration": 200},
        {"type": "pointerMove", "duration": 2000, "x": 89, "y": 613},
        {"type": "pointerMove", "duration": 2000, "x": 289, "y": 613},
        {"type": "pointerMove", "duration": 1000, "x": 189, "y": 613},
        {"type": "pointerUp", "button": 0}
      ]
    }]
  }'
```

### Delete Session
```bash
curl -s -X DELETE "http://localhost:4723/session/$SESSION_ID"
```

## Taking Screenshots

```bash
# Via xcrun simctl (faster)
xcrun simctl io "98C414EB-97A8-4DF4-913C-713A85A27B22" screenshot /tmp/screenshot.png

# Via Appium
curl -s "http://localhost:4723/session/$SESSION_ID/screenshot" | python3 -c "import sys,json,base64; open('/tmp/screenshot.png','wb').write(base64.b64decode(json.load(sys.stdin)['value']))"
```

## Xcode Instruments

### Recording Touch Events
```bash
xctrace record --template 'System Trace' --device "98C414EB-97A8-4DF4-913C-713A85A27B22" --time-limit 10s --output /tmp/trace.trace
```

### Viewing Trace
Open `/tmp/trace.trace` in Instruments.app for detailed analysis.

## Debugging Tips

1. **Keep session alive**: Set `newCommandTimeout: 600` (10 minutes)
2. **Reuse sessions**: Save SESSION_ID in a variable
3. **Check session status**: `curl http://localhost:4723/sessions` (Appium 3 may require the session-discovery insecure feature to be enabled before this endpoint works)
4. **Hot reload wait**: `sleep 3` after code changes before testing
5. **Coordinates**: Use Accessibility Inspector or take screenshots to find element positions

## Common Issues

- **Session terminated**: Increase `newCommandTimeout` capability
- **Element not found**: App may need to be in foreground, tap somewhere first
- **Gesture cancelled**: Usually indicates a React re-render issue (see 20-6.md)

## Refresh check (2026-07-03)

- Status: still useful for the historical iOS scrubber gesture-debugging task, but
  routine Soli native smoke testing should now prefer `agent-device` unless Appium
  is specifically needed for raw WebDriver gesture scripting.
- Current npm registry check shows `appium@3.5.2`. Appium 3 requires Node
  `^20.19.0 || ^22.12.0 || >=24.0.0` and npm `>=10`; this is stricter than many
  older Appium 2-era notes.
- Appium 3 keeps the Appium 2 driver model: install XCUITest separately with
  `appium driver install xcuitest` and keep capabilities W3C-compliant with the
  `appium:` prefix.
- Official caps docs list `appium:newCommandTimeout` defaulting to 60 seconds,
  with `0` disabling the timeout. The 600-second value here is good for manual
  debugging pauses but should not be used to hide hung automation in CI.

## Refresh check (2026-07-06) — iOS undo-scrubber drag on the dev build

Context: planning `docs/product/scrubber-test-automation/`. agent-device cannot
synthesize the RNGH pan on iOS (single ~300 ms swipe regardless of duration);
Appium W3C actions CAN — the 20-6 suite proved it on this exact gesture
(Dec 2025). This section documents the exact current scenario.

Sources (checked 2026-07-06):

- https://appium.github.io/appium-xcuitest-driver/latest/guides/gestures/
- https://github.com/appium/appium-xcuitest-driver/blob/master/docs/guides/gestures.md
- XCUITest driver source `lib/commands/gesture.ts` (`mobileDragFromToWithVelocity`,
  `mobileDragFromToForDuration` → WDA `pressAndDragWithVelocity` /
  `dragfromtoforduration`)

Key facts:

- Appium 3 (`appium@3.5.x` at last check) + `appium driver install xcuitest`.
  Node `^20.19 || ^22.12 || >=24` (machine runs Node 25 — fine). W3C actions
  only; JSONWP TouchActions are gone since XCUITest driver v7.
- **Installed on this machine (verified 2026-07-06, implementation preflight):**
  global `appium 3.1.2`, `xcuitest` driver `10.9.2` (npm install), Node `v25.9.0`.
  Both were already present — no install needed.
- **Helper script**: `scripts/ios-scrub.js` (plain Node, zero npm deps) wraps the
  full flow: `/status` preflight with setup help, session against the dev build,
  `undo` element lookup, padding-40 track geometry, anchor-formula target X,
  paced W3C actions, optional `--velocity-fallback`. See script header for usage.
- **Our session targets the installed Expo dev build, not Expo Go**:
  `appium:bundleId: "ch.karimattia.soli"`, `appium:noReset: true` (attach/launch
  without reinstalling), `appium:udid` = booted simulator UDID
  (`xcrun simctl list devices booted`). First session per boot compiles
  WebDriverAgent (~1 min); later sessions are fast.
- **Element lookup by our testIDs**: locator strategy `accessibility id` maps to
  `accessibilityIdentifier` = React Native `testID` (e.g. `undo`, `stock`,
  `card-hearts-7`). `POST /session/:id/element` with
  `{"using": "accessibility id", "value": "undo"}`, then
  `GET /session/:id/element/:eid/rect` for geometry.
- **The scrub drag needs press → short hold → PACED move segments → release.**
  A single fast move (what agent-device sends) never activates the RNGH Pan.
  Hold ~200 ms (NOT > 500 ms, which registers a long-press), then several
  `pointerMove` segments totalling ≥ 1.5 s. Working shape (from the 20-6 suite,
  still the current W3C recipe):

```json
POST /session/{id}/actions
{
  "actions": [{
    "type": "pointer", "id": "finger1",
    "parameters": {"pointerType": "touch"},
    "actions": [
      {"type": "pointerMove", "duration": 0, "x": 298, "y": 789},
      {"type": "pointerDown", "button": 0},
      {"type": "pause", "duration": 200},
      {"type": "pointerMove", "duration": 500, "x": 250, "y": 789},
      {"type": "pointerMove", "duration": 500, "x": 200, "y": 789},
      {"type": "pointerMove", "duration": 500, "x": 160, "y": 789},
      {"type": "pause", "duration": 120},
      {"type": "pointerUp", "button": 0}
    ]
  }]
}
```

- **Scrub geometry** (app-side facts, `useUndoScrubber.ts`/`UndoScrubber.tsx`):
  the track node is invisible to XCUITest at rest (opacity-0 overlay), so compute
  bounds instead: track = `[safeAreaLeft + 40, windowWidth − safeAreaRight − 40]`
  (`UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING = 40`). Press on the Undo button
  anchors the current history index N at the press X; target X for index
  `t < N`: `x = pressX − ((N − t) / N) · (pressX − trackLeft)`; mirror with
  `trackRight` and `(M − N)` steps for `t > N` (M = timeline max). Keep vertical
  drift < 100 px (failOffsetY) and ≥ 5 px horizontal (minDistance).
- **Velocity-controlled fallback** (WDA-native, use if raw W3C pacing fails):

```json
POST /session/{id}/execute/sync
{
  "script": "mobile: dragFromToWithVelocity",
  "args": [{
    "pressDuration": 0.3, "holdDuration": 0.1, "velocity": 200,
    "fromX": 298, "fromY": 789, "toX": 160, "toY": 789
  }]
}
```

- **Debugging**: capability `appium:simulatorTracePointer: true` draws the
  synthesized finger path on the simulator — compare against a manual scrub.
- **Coexistence with agent-device**: both are XCTest-based; serialize them
  (create Appium session → drag → delete session → resume agent-device
  snapshots/taps). Division of labor: agent-device for snapshots/taps/asserts,
  Appium ONLY for the drag (`scripts/ios-scrub.js` once implemented).

### Live-verified recipe (2026-07-06, C1 device run — iPhone 17 Pro sim, iOS 26.5)

The script's DEFAULT parameters worked on the FIRST attempt, no tuning needed:

- `appium` (3.1.2) running locally → `node scripts/ios-scrub.js --from 40 --max 80 --to 20`.
- Gesture shape as shipped: pointerDown → pause 200 ms → 4 equal `pointerMove`
  segments over 1500 ms total → pause 120 ms → pointerUp. No
  `--velocity-fallback`, no `simulatorTracePointer` needed.
- **Landing accuracy: exact on all three targets** (40→20, 20→0, 0→max/80) on
  the scrubbed demo fixture (M = 80, ~322 pt track ⇒ ~4 pt/index). The feared
  ±1 rounding error did not occur in this run — but keep it in mind at higher
  timeline densities.
- Timings: first session per simulator boot ≈ 40 s (WDA build/launch); later
  sessions ≈ 4–5 s. Whole drag+session cycle after warmup ≈ 8 s.
- Serialization with agent-device that actually worked: `yarn agent-device
  close --session <name>` and kill any idle
  `xcodebuild test-without-building … AgentDeviceRunner` process BEFORE creating
  the Appium session; recreate the agent-device session after the drag. With
  that ordering, zero contention/flakiness across 3 drag cycles.
- Geometry observed: Undo button center (298, 789), window width 402 pt →
  track 40..362 (padding-40 fallback matched reality; portrait insets 0).
