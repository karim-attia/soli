# Appium Guide

Last refreshed: 2026-07-03

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
