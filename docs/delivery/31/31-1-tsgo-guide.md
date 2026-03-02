# Task 31-1: tsgo package guide

## Research timestamp
- 2026-03-02 (Europe/Zurich)

## Primary sources
- https://github.com/microsoft/typescript-go
- https://www.npmjs.com/package/@typescript/native-preview
- https://devblogs.microsoft.com/typescript/a-10x-faster-typescript/

## What this package is
- `tsgo` is the CLI shipped by `@typescript/native-preview` and represents the native TypeScript implementation preview.
- The upstream project describes the intention that `tsc` and `tsgo` should be interchangeable, while still being under active development.

## Practical usage notes for this repo
- Keep the existing `tsc` typecheck command and add `tsgo` as a parallel check (`typecheck:tsgo`) during migration.
- Use a dedicated `tsconfig.tsgo.json` so tsgo-specific validation can evolve without destabilizing the existing `tsconfig.json` workflow.
- Prefer `noEmit: true` for typecheck-only command usage in app repositories.
- Exclude generated/output directories from tsgo scans (`node_modules`, `dist`, `build`) to keep checks focused and fast.

## Recommended script pattern
```json
{
  "scripts": {
    "typecheck:tsc": "tsc -p tsconfig.json --noEmit",
    "typecheck:tsgo": "tsgo -p tsconfig.tsgo.json"
  }
}
```

## Example tsgo config
```json
{
  "compilerOptions": {
    "noEmit": true,
    "strict": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "es2020",
    "jsx": "react-jsx",
    "types": ["node", "jest"],
    "lib": ["dom", "esnext"],
    "paths": {
      "*": ["./*"]
    }
  },
  "exclude": ["_", "node_modules", "dist", "build"],
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

## Migration best practices applied
- Install `@typescript/native-preview` as a dev dependency and run it through package scripts rather than ad-hoc local binaries.
- Keep `typecheck:tsc` and `typecheck:tsgo` side-by-side while the native preview matures.
- Treat tsgo output as a gating signal only after parity confidence is established in this codebase.
