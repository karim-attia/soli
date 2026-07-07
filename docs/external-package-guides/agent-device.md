# Agent Device Guide

Last refreshed: 2026-07-06

## Scope

- Package/tool: `agent-device`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this for real-device/simulator automation. Soli owns an exact CLI version through
its dev dependencies and `yarn.lock`; run it as `yarn agent-device ...`. Prefer
explicit device selection and confirm the installed build before reporting native
smoke results.

## Repository-controlled CLI

- Package: `agent-device@0.18.3`, pinned exactly in `devDependencies`.
- Invocation: `yarn agent-device <command>` from the repository root.
- Upgrade by changing the exact dependency version and committing both
  `package.json` and `yarn.lock`.
- Do not use a global installation or `npx` for Soli automation, because either can
  bypass the version selected by the repository.
- The daemon and generated runner state remain machine-local under
  `~/.agent-device`; only the CLI package version is controlled by Git.
- Yarn already exposes dependency binaries, so a duplicate package script is not
  needed.

## Detailed guidance

The sections below are the definitive combined notes for this package or tool. Keep version-specific context when it affects compatibility, but update this single file instead of adding task- or feature-prefixed guides.

### Android Validation Notes

## Package
- `agent-device` from [callstack/agent-device](https://github.com/callstack/agent-device)
  - Historical task links may still mention `callstackincubator/agent-device`.

## Why this guide exists
- Cache the API/CLI usage needed for PBI 30 Android validation and gameplay smoke testing.
- Document the project-local multi-agent setup so Codex and Cursor can share the same installed skill.

## Installation + multi-agent best practice
- Use project-local install so this repository owns the skill configuration:
  - `npx skills add https://github.com/callstackincubator/agent-device --skill agent-device -a codex -a cursor -y`
- Resulting layout:
  - `.agents/skills/agent-device` (shared project-local source of truth)
  - `.cursor/skills/agent-device` (Cursor-facing skill entrypoint linked to project-local install)
- Rationale:
  - Keeps skill version and behavior scoped to this project.
  - Lets multiple coding agents use one managed installation flow.

## Core commands used in this task

Note (2026-07-07): examples updated from `npx -y agent-device` to `yarn agent-device` —
the CLI is pinned in devDependencies and must be invoked through yarn (see
"Repository-controlled CLI" above).

- Discover Android targets:
  - `yarn agent-device devices --platform android --json`
- Launch/relaunch the app on explicit device:
  - `yarn agent-device open ch.karimattia.soli --platform android --serial 192.168.1.12:37635 --relaunch --json`
- Capture UI state:
  - `yarn agent-device snapshot -i --platform android --serial 192.168.1.12:37635 --json`
  - `yarn agent-device screenshot .agents/skills/agent-device-after-fix.png --platform android --serial 192.168.1.12:37635 --json`

## Notes for this repository
- When mDNS device names include spaces/parentheses, prefer direct TCP serials from `adb connect` (for example `192.168.1.12:37635`) to avoid selector truncation in downstream tooling.
- Keep Android validation deterministic by pairing `agent-device` app automation with explicit `adb -s <serial>` install/logcat commands.

## Sources
- Skills CLI docs (`skills add`, local installation behavior):
  - https://github.com/vercel-labs/skills?tab=readme-ov-file#skills-add
- Agent-device project:
  - https://github.com/callstack/agent-device
  - https://agent-device.dev/
  - https://oss.callstack.com/agent-device/docs/installation
  - https://oss.callstack.com/agent-device/docs/commands
  - https://www.npmjs.com/package/agent-device
  - https://www.callstack.com/blog/agent-device-ai-native-mobile-automation-for-ios-android

## Refresh check (2026-07-03)

- Status: still useful for the historical PBI 30 setup, with updated upstream
  coordinates.
- Current npm registry check shows `agent-device@0.18.3`; the package now lives
  under `callstack/agent-device` and still exposes the same `agent-device` CLI.
- Official installation docs now recommend a global install for normal agent
  workflows, and explicitly warn that repeated `npx ...@latest` use should be a
  conscious trust/version decision for agents. For this repo, keep using a pinned
  project/user-provided version when deterministic validation matters.
- Requirements remain native-tooling heavy: Node.js 22+, Xcode tools for iOS, and
  Android SDK/ADB for Android.
- Current docs emphasize evidence commands beyond the original PBI 30 flow:
  `snapshot`, `press`/`click`, `fill`, `logs`, `network`, `perf metrics`, and
  `perf frames`. Keep pairing UI automation with direct `adb` install/logcat
  checks when validating Android release builds.

### Expo UI Sheet Validation Notes

- Tool: `agent-device`
- Version: `0.17.5`
- Retrieved: 2026-06-14
- Official sources:
  - https://agent-device.dev/
  - https://github.com/callstack/agent-device
  - https://oss.callstack.com/agent-device/docs/installation
  - https://oss.callstack.com/agent-device/docs/commands
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

## Refresh check (2026-07-03)

- Status: still useful as the exact historical validation recipe for the Expo UI
  History preview sheet crash.
- Current npm registry check shows `agent-device@0.18.3`; keep `0.17.5` only when
  intentionally recreating the original June 2026 validation environment.
- The current official install docs still require Node.js 22+ and now explicitly
  recommend a stable global install or a project/user-supplied version for agent
  workflows, rather than letting agents repeatedly choose `@latest`.
- Current command docs recommend bounded evidence gathering. For this task's crash
  loop, keep using `snapshot -i`, `logs`, and direct `adb logcat`; if performance
  diagnosis is added later, start with small `perf`/React DevTools summaries
  before raising broad limits.
