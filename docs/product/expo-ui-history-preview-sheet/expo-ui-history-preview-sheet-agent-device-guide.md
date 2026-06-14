# Agent Device Guide For Expo UI History Preview Sheet

- Tool: `agent-device`
- Version: `0.17.5`
- Retrieved: 2026-06-14
- Official sources:
  - https://agent-device.dev/
  - https://github.com/callstackincubator/agent-device
  - https://www.npmjs.com/package/agent-device

## Installation

The official site documents global npm installation. Pin the exact version used for
this validation:

```sh
npm install -g agent-device@0.17.5
agent-device --version
```

The npm package exposes the `agent-device` binary and requires Node.js `>=22.19`.

## Android debug flow

Discover connected targets:

```sh
agent-device devices --platform android
```

Open Soli and start a clean log capture:

```sh
agent-device open ch.karimattia.soli --platform android
agent-device logs clear --restart
agent-device snapshot -i
```

After reproducing the crash:

```sh
agent-device logs path
```

Use direct `adb logcat` alongside agent-device when native Android stack traces or
process-death records are required:

```sh
adb logcat -c
adb logcat -v threadtime
```

## Soli validation flow

1. Open History.
2. Tap a history entry.
3. Confirm the content-sized sheet shows the native handle and the complete board.
4. Drag upward and confirm the sheet does not enter the former full-screen state.
5. Dismiss by dragging down.
6. Repeat and dismiss using Android Back.
7. Repeat and dismiss using the scrim.
8. Confirm Soli remains foregrounded on History and inspect logs for package-specific
   fatal exceptions, `NativeStatePropsGetter`, `ShadowNodeProxy`, `SIGSEGV`, and
   `SIGABRT`.

Use fresh refs from `agent-device snapshot -i` after every navigation or sheet state
change.
