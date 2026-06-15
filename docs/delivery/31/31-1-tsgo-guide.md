# Task 31-1: tsgo package guide

## Research timestamp

- 2026-06-15 (Europe/Zurich)

## Primary sources

- https://github.com/microsoft/typescript-go
- https://www.npmjs.com/package/@typescript/native-preview
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/
- https://docs.expo.dev/guides/typescript/

## What this package is

- `tsgo` is the native TypeScript 7 CLI shipped temporarily by `@typescript/native-preview`.
- The April 2026 beta is intended for daily development and CI. The stable TypeScript 7 package will eventually be published as `typescript` and expose `tsc`.
- TypeScript 7 does not yet provide a stable programmatic API; that is planned for TypeScript 7.1 or later.

## Practical usage notes for this repo

- Use the pinned TypeScript 7 beta as the sole root project checker.
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
