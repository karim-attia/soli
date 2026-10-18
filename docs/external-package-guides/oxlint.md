# oxlint Guide

Last refreshed: 2026-10-18

## Scope

- Package/tool: `oxlint`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this guide as the current source-backed reference for Soli work involving this package or tool.

## Source-backed notes

## Research timestamp

- 2026-06-15 (Europe/Zurich)
- Refresh checked 2026-07-03 (Europe/Zurich)
- Refreshed 2026-10-18 (1.88.0 bump; sources: https://github.com/oxc-project/oxc/blob/main/apps/oxlint/CHANGELOG.md, `node_modules/oxlint/configuration_schema.json`)

## Primary sources

- https://oxc.rs/docs/guide/usage/linter
- https://oxc.rs/docs/guide/usage/linter/config.html
- https://oxc.rs/docs/guide/usage/linter/config-file-reference
- https://github.com/oxc-project/oxc/releases
- https://voidzero.dev/posts/announcing-oxlint-1-stable
- https://www.npmjs.com/package/oxlint

## What this package is

- `oxlint` is the Oxc linter CLI and supports JavaScript/TypeScript linting with high-performance native execution.
- It supports plugins (for example `typescript`, `react`, `import`) and project-level config via `.oxlintrc.json`.

## Practical usage notes for this repo

- Use `--tsconfig tsconfig.json` for type-aware context where needed.
- Keep an incremental rule posture for migration: baseline lint as warnings, then add a strict command for CI/hard enforcement.
- Add `ignorePatterns` for generated/build output to avoid noisy lint results.
- When defining `plugins`, declare the complete set explicitly since plugin lists are treated as authoritative in config.
- For the modern JSX transform, allow the obsolete `react-in-jsx-scope` rule. Oxlint 1.69 no longer exposes `jsx-uses-react`.
- Configure `react/no-unstable-nested-components` with `allowAsProps` for navigation APIs that intentionally receive icon/render components as props.
- Prefer CLI `-A` overrides for strict mode when needed; oxlint applies CLI rule/category flags left-to-right.
- Type-aware linting is now documented directly in Oxlint via `options.typeAware` / `--type-aware` and experimental `options.typeCheck` / `--type-check`, powered by `tsgo`. It was assessed but not enabled because broad category activation creates a separate assertion/promise policy migration; `tsgo` remains the authoritative checker for this repo.
- The repository pins `oxlint@1.88.0` (bumped 2026-10-18 from 1.73.0).
- **React Compiler diagnostics (since 1.79.0)**: oxlint split the single `react/react-compiler`
  rule into per-category rules (`react/immutability`, `react/refs`, `react/set-state-in-effect`,
  `react/exhaustive-effect-dependencies`, `react/capitalized-calls`, `react/globals`,
  `react/purity`, `react/preserve-manual-memoization`, ...; changelog 1.79.0 #25500/#25830).
  They sit in the default `correctness`/`suspicious` categories, so a plain bump surfaced ~40
  warnings in Soli — all intentional React Native / Reanimated / Gesture Handler patterns
  (`sharedValue.value = x`, latest-ref writes during render, `Gesture.Pan()`, deliberate
  derived-state effects). Six of them are therefore `off` in `.oxlintrc.json` with a JSONC
  comment; re-enable them as a report when the React Compiler experiment runs — they are the
  compiler's bail-out list.
- `.oxlintrc.json` accepts JSONC comments (verified on 1.88.0).
- `lint:strict` is config-driven: `oxlint --deny-warnings ...`. CLI category flags
  (`-D correctness`) re-enable rules the config sets to `off`, so the earlier
  `-D correctness -D suspicious -A rule...` form would have needed one `-A` per disabled rule;
  the trade-off is that strict coverage now follows the config's categories exactly.

## Recommended script pattern

```json
{
  "scripts": {
    "lint": "oxlint --tsconfig tsconfig.json app components modules src scripts test",
    "lint:fix": "oxlint --fix --tsconfig tsconfig.json app components modules src scripts test",
    "lint:strict": "oxlint --deny-warnings --tsconfig tsconfig.json app components modules src scripts test"
  }
}
```

## Example config

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "categories": {
    "correctness": "warn",
    "suspicious": "warn",
    "pedantic": "off",
    "perf": "off",
    "style": "off",
    "restriction": "off",
    "nursery": "off"
  },
  "plugins": ["typescript", "oxc", "react", "import"],
  "rules": {
    "no-unassigned-import": "off",
    "react-in-jsx-scope": "off",
    "react/no-unstable-nested-components": ["warn", { "allowAsProps": true }],
    "style-prop-object": "off"
  },
  "ignorePatterns": ["dist/**", "build/**"]
}
```

## Migration best practices applied

- Start with a migration-safe warning baseline and provide a separate strict command.
- Keep lint scope explicit (path arguments) to control runtime and avoid linting generated trees.
- Adopt `lint:fix` for safe mechanical cleanups while preserving a non-fix lint command for review workflows.
- Revalidate rule names and newly introduced rules when upgrading Oxlint minor versions.
- Pin the tested linter version so clean installs do not silently change the enforced rule set.

## Refresh check (2026-07-03)

- Status: updated for current Oxlint docs while preserving Soli's conservative
  migration stance.
- Upstream has released `oxlint v1.72.0 & oxfmt v0.57.0` since Soli validated
  `oxlint@1.69.0`. Future upgrade work should read the Oxc release notes, bump the
  package in a dedicated change, then run `yarn lint`, `yarn lint:strict`, and
  `yarn typecheck`.
- Current docs also support `oxlint.config.ts`, JavaScript plugins, multi-file
  analysis, and type-aware linting. Keep Soli on `.oxlintrc.json` and explicit
  path-scoped scripts unless a separate implementation plan accepts the extra
  policy and compatibility surface.
