# TypeScript Native Preview Guide

Last refreshed: 2026-07-03

## Scope

- Package/tool: `@typescript/native-preview` / `tsgo`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this guide as the current source-backed reference for Soli work involving this package or tool.

## Source-backed notes

## Research timestamp

- 2026-06-15 (Europe/Zurich)
- Refresh checked 2026-07-03 (Europe/Zurich)

## Primary sources

- https://github.com/microsoft/typescript-go
- https://www.npmjs.com/package/@typescript/native-preview
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-rc/
- https://docs.expo.dev/guides/typescript/

## What this package is

- `tsgo` is the native TypeScript 7 CLI shipped by `@typescript/native-preview` for preview/nightly builds.
- The April 2026 beta is the version currently pinned by this repo. As of the July 2026 refresh, the TypeScript 7 RC is available from `typescript@rc` and exposes the normal `tsc` binary, while `@typescript/native-preview` continues as the nightly package with the `tsgo` binary.
- TypeScript 7 does not yet provide a stable programmatic API; Microsoft still points programmatic-API consumers to TypeScript 7.1 or later.

## Practical usage notes for this repo

- Use the pinned TypeScript 7 beta as the sole root project checker.
- The repository currently pins `@typescript/native-preview@7.0.0-dev.20260421.2`; latest npm registry check on 2026-07-03 shows a moving nightly `latest` of `7.0.0-dev.20260703.1`, while the `beta` dist-tag still matches the repo pin.
- Use one `tsconfig.json` extending `expo/tsconfig.base`, as recommended for Expo SDK 56.
- Do not retain a root TypeScript 6 dependency when application tooling does not import its JavaScript API.
- Transitive packages may keep their own TypeScript versions. Tamagui CLI owns a private TypeScript 5.9 dependency and requires no root fallback.
- Exclude generated/output directories from tsgo scans (`node_modules`, `dist`, `build`) to keep checks focused and fast.

## Recommended script pattern

```json
{
  "scripts": {
    "typecheck": "tsgo -p tsconfig.json"
  }
}
```

## Example tsgo config

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "rootDir": ".",
    "target": "es2020",
    "types": ["node", "jest"],
    "paths": {
      "*": ["./*"]
    }
  },
  "exclude": ["_", "node_modules", "dist", "build"],
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

## Migration best practices applied

- Pin `@typescript/native-preview` to the beta rather than consuming moving nightly builds.
- Run `tsgo` directly from the package script to avoid nested package-manager startup overhead.
- Remove `baseUrl`, `downlevelIteration`, legacy module modes, and Node 10 module resolution before adopting TypeScript 7.
- Keep TypeScript 6 only when a root-level tool imports its programmatic API; Soli has no such use case.

## Refresh check (2026-07-03)

- Status: still current for Soli's pinned `tsgo` script, but partially
  superseded for new TypeScript 7 migration planning.
- Do not switch this repo from `tsgo -p tsconfig.json` to `tsc` just because the
  RC exists. That should be a dedicated toolchain upgrade with package/script
  changes and the usual repo gates.
- If future tooling needs a JavaScript TypeScript API alongside TypeScript 7,
  review Microsoft's `@typescript/typescript6` compatibility package instead of
  silently reintroducing an unscoped root `typescript@6` dependency.
