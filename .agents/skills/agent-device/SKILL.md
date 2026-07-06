---
name: agent-device
description: Automates Apple-platform apps (iOS, tvOS, macOS) and Android devices. Use when navigating apps, taking snapshots/screenshots, tapping, typing, scrolling, extracting UI info, collecting logs/network/perf evidence, or planning agent-device CLI commands.
---

# agent-device

Router only. This repository pins `agent-device` as a dev dependency. Always invoke
the repository-owned binary through Yarn so automation does not depend on a global
installation:

```bash
yarn agent-device --version
```

If that fails, run `yarn install` from the repository root. Do not fall back to a
global install or `npx`, because that bypasses the version pinned in `yarn.lock`.

Require `agent-device >= 0.14.0`; older CLIs lack these help topics. If older, stop
and tell the user that Soli's exact dependency version in `package.json` and
`yarn.lock` must be upgraded. Do not bypass that pin with a global install or
`npx`.

Before your first agent-device command or plan, read the version-matched CLI guide:

```bash
yarn agent-device help workflow
```

Escalate only when relevant:

```bash
yarn agent-device help debugging
yarn agent-device help react-native
yarn agent-device help react-devtools
yarn agent-device help cdp
yarn agent-device help remote
yarn agent-device help macos
yarn agent-device help dogfood
```

Default loop: `open -> snapshot/-i -> get/is/find or press/fill/scroll/wait -> verify -> close`.

Use this skill only to route into version-matched CLI help. Let `help workflow`
provide exact command shapes, platform limits, and current workflow guidance.
Prefix its `agent-device ...` examples with `yarn` when running them in Soli.

For precise location workflows, read the installed `settings` help with
`yarn agent-device help settings` before planning so coordinate support and
platform limits come from the active CLI version.
