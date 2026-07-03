# oxfmt Guide

Last refreshed: 2026-07-03

## Scope

- Package/tool: `oxfmt`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this guide as the current source-backed reference for Soli work involving this package or tool.

## Source-backed notes

## Research timestamp

- 2026-06-15 (Europe/Zurich)
- Refresh checked 2026-07-03 (Europe/Zurich)

## Primary sources

- https://oxc.rs/docs/guide/usage/formatter
- https://oxc.rs/docs/guide/usage/formatter/config.html
- https://oxc.rs/docs/guide/usage/formatter/config-file-reference.html
- https://github.com/oxc-project/oxc/releases
- https://oxc.rs/blog/2026-02-24-oxfmt-beta
- https://www.npmjs.com/package/oxfmt

## What this package is

- `oxfmt` is the Oxc formatter CLI for JavaScript/TypeScript/JSON formatting.
- Configuration is provided through `.oxfmtrc.json` with options similar to Prettier-style formatting preferences.
- Current Oxfmt also supports Markdown, CSS, YAML, TOML, and other common project formats.

## Practical usage notes for this repo

- Use an explicit target glob for project sources and run `--check` in verification/CI flows.
- Keep formatter options aligned with current style decisions (`singleQuote`, `semi`, `trailingComma`, line width).
- Use `ignorePatterns` for generated files and build artifacts to avoid churn.
- `oxfmt` supports migration helpers such as `--migrate=biome`; keep this as a one-off migration aid rather than a recurring script.
- The repository currently pins `oxfmt@0.54.0`; latest npm registry check on 2026-07-03 shows `0.57.0`.
- Do not expand the repo script to every Oxfmt-supported format by default. The current script intentionally limits formatting to app/source JS/TS/JSON plus `package.json`, so Markdown and generated docs do not churn during product-plan work.

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
  "useTabs": false,
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
- Run `format:check` immediately after version upgrades to detect any formatter compatibility changes before accepting broad rewrites.
- Pin the tested formatter version so clean installs produce deterministic output.

## Refresh check (2026-07-03)

- Status: still current for Soli's pinned toolchain.
- Upstream has released `oxlint v1.72.0 & oxfmt v0.57.0` since the repo's
  validated `oxfmt@0.54.0` pin. Treat that as an upgrade candidate, not an
  automatic docs/script change.
- Oxfmt is now documented as beta and Prettier-compatible for large codebases,
  with more format coverage and config-file reference detail than the original
  migration needed. Future upgrade work should read the Oxc release notes first,
  bump `oxfmt` in a dedicated change, then run `yarn format:check` before
  accepting any broad mechanical rewrites.
