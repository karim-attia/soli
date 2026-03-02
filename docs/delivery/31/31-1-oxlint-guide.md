# Task 31-1: oxlint package guide

## Research timestamp
- 2026-03-02 (Europe/Zurich)

## Primary sources
- https://oxc.rs/docs/guide/usage/linter
- https://oxc.rs/docs/guide/usage/linter/config.html
- https://oxc.rs/docs/guide/usage/linter/config-file-reference
- https://www.npmjs.com/package/oxlint

## What this package is
- `oxlint` is the Oxc linter CLI and supports JavaScript/TypeScript linting with high-performance native execution.
- It supports plugins (for example `typescript`, `react`, `import`) and project-level config via `.oxlintrc.json`.

## Practical usage notes for this repo
- Use `--tsconfig tsconfig.json` for type-aware context where needed.
- Keep an incremental rule posture for migration: baseline lint as warnings, then add a strict command for CI/hard enforcement.
- Add `ignorePatterns` for generated/build output to avoid noisy lint results.
- When defining `plugins`, declare the complete set explicitly since plugin lists are treated as authoritative in config.
- For React 17+ JSX transform projects, allow legacy scope/import rules (`react-in-jsx-scope`, `jsx-uses-react`) in strict command invocations when they create false positives.
- Prefer CLI `-A` overrides for strict mode when needed; oxlint applies CLI rule/category flags left-to-right.

## Recommended script pattern
```json
{
  "scripts": {
    "lint": "oxlint --tsconfig tsconfig.json app components modules src scripts test",
    "lint:fix": "oxlint --fix --tsconfig tsconfig.json app components modules src scripts test",
    "lint:strict": "oxlint -D correctness -D suspicious -A react-in-jsx-scope -A jsx-uses-react -A no-unassigned-import --deny-warnings --tsconfig tsconfig.json app components modules src scripts test"
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
    "import/no-unassigned-import": "off",
    "react/react-in-jsx-scope": "off",
    "react/jsx-uses-react": "off",
    "react/style-prop-object": "off"
  },
  "ignorePatterns": ["dist/**", "build/**"]
}
```

## Migration best practices applied
- Start with a migration-safe warning baseline and provide a separate strict command.
- Keep lint scope explicit (path arguments) to control runtime and avoid linting generated trees.
- Adopt `lint:fix` for safe mechanical cleanups while preserving a non-fix lint command for review workflows.
