# Appium Testing Guide for iOS Scrubber Debugging

This guide documents how to use Appium for automated iOS gesture testing, specifically for debugging the undo scrubber component.

## Prerequisites

```bash
# Install Appium globally
npm install -g appium

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
3. **Check session status**: `curl http://localhost:4723/sessions`
4. **Hot reload wait**: `sleep 3` after code changes before testing
5. **Coordinates**: Use Accessibility Inspector or take screenshots to find element positions

## Common Issues

- **Session terminated**: Increase `newCommandTimeout` capability
- **Element not found**: App may need to be in foreground, tap somewhere first
- **Gesture cancelled**: Usually indicates a React re-render issue (see 20-6.md)
