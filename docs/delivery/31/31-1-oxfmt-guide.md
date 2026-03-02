# Task 31-1: oxfmt package guide

## Research timestamp
- 2026-03-02 (Europe/Zurich)

## Primary sources
- https://oxc.rs/docs/guide/usage/formatter
- https://oxc.rs/docs/guide/usage/formatter/config.html
- https://www.npmjs.com/package/oxfmt

## What this package is
- `oxfmt` is the Oxc formatter CLI for JavaScript/TypeScript/JSON formatting.
- Configuration is provided through `.oxfmtrc.json` with options similar to Prettier-style formatting preferences.

## Practical usage notes for this repo
- Use an explicit target glob for project sources and run `--check` in verification/CI flows.
- Keep formatter options aligned with current style decisions (`singleQuote`, `semi`, `trailingComma`, line width).
- Use `ignorePatterns` for generated files and build artifacts to avoid churn.
- `oxfmt` supports migration helpers such as `--migrate=biome`; keep this as a one-off migration aid rather than a recurring script.

## Recommended script pattern
```json
{
  "scripts": {
    "format": "oxfmt \"{app,components,modules,src,scripts,test}/**/*.{js,jsx,ts,tsx,json}\" package.json",
    "format:check": "oxfmt --check \"{app,components,modules,src,scripts,test}/**/*.{js,jsx,ts,tsx,json}\" package.json"
  }
}
```

## Example config
```json
{
  "printWidth": 90,
  "tabWidth": 2,
  "useTabs": true,
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "ignorePatterns": [
    "**/*/generated-new.ts",
    "**/*/generated-v2.ts",
    "dist/**",
    "build/**"
  ]
}
```

## Migration best practices applied
- Separate `format` and `format:check` commands for local edit vs CI enforcement workflows.
- Restrict formatter scope to source directories to avoid accidental binary/content churn.
- Keep formatter configuration explicit and checked into version control for deterministic team output.
