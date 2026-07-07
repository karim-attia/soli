# Production Build for Connected Device

Build and install a production/release version of the app.

## Commands

```bash
# Android physical phone (Release APK; handles adb discovery, signing, lock, install verification, launch):
yarn release

# iOS simulator (Release):
yarn ios
```

Both exit after launch. Flags: `--logs` (stream [SoliDev] logs), `--auto-solve` (run the demo playlist; `DEMO_GAME_LIMIT=N` limits games). `yarn ios` also has `--debug` (Metro dev build, lingers).

## Notes

- Never run `yarn release` and `yarn ios` in parallel — a shared lock (`/tmp/soli-build.lock`) makes the second fail fast.
- Full build logs in `.test-artifacts/builds/`.
- Testing recipes: `.agents/skills/soli-testing/SKILL.md`.

<!-- 2026-07-07: replaced the stale `npx expo run:android --variant release` recipe —
     yarn release/yarn ios are the supported build entry points (fcdea28). -->
