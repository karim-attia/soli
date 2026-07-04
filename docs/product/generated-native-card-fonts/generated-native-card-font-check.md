# Generated Native Card Fonts Exact Android Appearance

> Superseded (2026-07-03): this plan kept Android intentionally unregistered to preserve
> the approved fallback look on Karim's phone. The product goal has been reversed because
> fallback rendering is device-dependent, especially on Samsung devices. Continue with
> `docs/product/generated-native-card-fonts/deterministic-card-fonts-everywhere.md`,
> which registers the card fonts on both platforms and patches the tracked font metrics so
> every device targets the same approved reference appearance.

## User prompt

> Pls implement changes [AGENTS.md](AGENTS.md)

Context from the same thread: Android and iOS native folders are ignored, the main checkout rendered the card font correctly while a comparison worktree rendered it incorrectly, and the desired Expo workflow is to regenerate native folders from tracked config rather than preserve local ignored native drift.

> Please make it happen. Really do the whole thing with try it out, test it, check if it works, learn if needed, as always do all those things as described in the agents.md in SubAgent, and update the implementation plan on every single turn with the full-on goal that this goal is reached, that this is amazing, that the font setup is perfect without any visual changes. Thank you.

> Work in /Users/karim/kDrive/Code/soli. You are the implementation sub-agent for deterministic exact Android card-font appearance. You are not alone in the codebase: preserve all unrelated/user changes, do not stage/commit/unstage/revert anything, and do not touch generated ignored android/ios files during implementation. Read AGENTS.md and the ENTIRE docs/product/generated-native-card-fonts/generated-native-card-font-check.md before changing anything. Own these files only: app.json, scripts/check-generated-card-fonts.js, run-android-release.sh, docs/external-package-guides/expo.md, docs/external-package-guides/expo-font.md, docs/product/generated-native-card-fonts/generated-native-card-font-check.md. package.json should stay as currently modified unless a real defect requires it. Explicitly forbidden: all assets/fonts/CardTextAndroid*.ttf, scripts/build-card-fonts.py, src/features/klondike/components/cards/CardVisual.tsx, src/features/klondike/components/cards/fonts.ts, and all visual/layout files.
>
> Implement recommended approach 3 from the plan:
> - Keep expo-font iOS embedding for exactly the 3 CardTextAndroid files.
> - Make Android generate no CardTextAndroid native registration/resources, preserving the approved platform fallback path. Prefer the simplest official config shape.
> - Invert the Android generated-font guard: verify app config intentionally has no Android card-font definitions; after generation require no xml_card_text_android.xml, no card_text_android*.ttf in res/font, no CardTextAndroid addCustomFont call, and no stale legacy native assets. Still verify the tracked font assets for iOS and current iOS registration.
> - Keep existing prebuild/check scripts and release guard; update wording/comment to explain this is an intentional visual contract.
> - Correct only the July 3 Soli-specific guide claims that say Android weighted registration is desired; retain accurate upstream facts.
> - Add succinct rationale comments where possible (JS/shell; JSON cannot comment).
> - Update implementation-plan step status immediately after each completed implementation step, plus Files actually modified/learnings/issues/testing.
> - Run only cheap implementation checks (JSON parse, node --check, bash -n, maybe formatter check scoped). Do NOT run prebuild or native builds; testing sub-agent will do that.
> - Before and after, hash the 5 forbidden files listed in the plan and record proof unchanged.
> Return summary, all files changed, checks run/results, and any concern.

## Description

The goal is not to make Android's generated font registration look cleaner. The goal is to reproduce the exact previously approved Android card appearance, with no card-font binary, card-layout, or card-geometry changes, while keeping native generation deterministic.

`/Users/karim/kDrive/Code/soli copy/android` is the forensic source of truth for the approved Android build. Its `MainApplication.kt` has an empty `xml-fonts-init` block and no `CardTextAndroid` `ReactFontManager.addCustomFont` call, and it has no `res/font` `CardTextAndroid` resources or XML family. Therefore the approved Android appearance was produced without the clean Expo-generated weighted `CardTextAndroid` family. Generating that family changed the native typeface/metrics path and changed the visible cards even though the tracked font binaries and `CardVisual` constants did not change.

The intended architecture is consequently platform-specific at native registration level:

- Android intentionally does **not** register `CardTextAndroid`; it retains the native fallback behavior that produced the approved screenshot.
- iOS continues embedding the three tracked `CardTextAndroid` files, preserving its established behavior.
- Shared card rendering code, weights, dimensions, offsets, and tracked font binaries remain untouched.

The reference image is `/Users/karim/kDrive/Fotos/Screenshots/right.png` (1080x2412; SHA-256 `4661ef34eab01308920f6c631a974232295b48b68d84343e637204a65a07c461`).

## Acceptance Criteria

- A clean Android prebuild from tracked configuration reproduces the approved native registration shape:
  - no `ReactFontManager.addCustomFont` registration for `CardTextAndroid`;
  - the generated `xml-fonts-init` block is empty if Expo emits the block;
  - no `android/app/src/main/res/font/xml_card_text_android.xml`;
  - no `android/app/src/main/res/font/card_text_android*.ttf`.
- The Android generated-font guard asserts the intentional absence above and fails if weighted `CardTextAndroid` registration reappears.
- The guard still verifies that the three tracked font binaries exist because iOS depends on them.
- iOS prebuild continues to embed exactly `CardTextAndroid.ttf`, `CardTextAndroid-SemiBold.ttf`, and `CardTextAndroid-Bold.ttf`, with no legacy font references.
- `assets/fonts/CardTextAndroid*.ttf`, `src/features/klondike/components/cards/CardVisual.tsx`, `src/features/klondike/components/cards/fonts.ts`, and all card geometry/constants are byte-for-byte unchanged by this correction.
- A clean `yarn prebuild:android` followed by `yarn release` completes sequentially, installs the newly built release on the physical Android device, and the installed package/build is confirmed rather than inferred.
- A screenshot from that fresh release matches `/Users/karim/kDrive/Fotos/Screenshots/right.png` in card rank/suit appearance and card geometry. Comparison uses the same device orientation and equivalent game state, with side-by-side and card-region pixel/measurement checks so unrelated status-bar or game-state pixels do not create false failures.
- A second, native-folder-free fresh workspace regenerates the same Android native font state from source alone, passes all checks, builds/installs its own release sequentially, and reproduces the same card appearance.
- Cheap tests pass: `yarn typecheck`, `yarn lint`, and `yarn jest`.
- No files are staged, committed, unstaged, or reverted.

## Possible approaches incl. pros and cons

### 1. Keep weighted Expo registration on Android and tune card visuals

- Pros: conventional explicit Android font family; uses all three bundled weights directly.
- Cons: already proven to change the approved rendering; would require font, weight, offset, size, or geometry compensations; violates the no-visual-change constraint.
- Decision: reject.

### 2. Restore or copy the ignored native Android folder

- Pros: could recreate one known local build quickly.
- Cons: preserves native drift, is not reproducible from tracked source, and fails fresh-workspace determinism. The stale `CardRankAndroidBold.ttf` in the forensic copy does not register the requested `CardTextAndroid` family and should not be promoted into the source of truth.
- Decision: reject.

### 3. Make Expo font embedding iOS-only and assert Android non-registration

- Pros: directly matches the decisive forensic evidence; changes only native registration configuration/checks; preserves card code, font assets, and iOS embedding; deterministic under clean prebuild.
- Cons: the Android fallback behavior is intentional but less obvious than explicit registration, so it needs a durable check and comments explaining the visual contract.
- Decision: **recommended**.

### 4. Add custom Android native/config-plugin code to recreate the old path

- Pros: could encode more native behavior if Expo's iOS-only configuration unexpectedly changes Android output.
- Cons: more code and maintenance, and unnecessary if omission alone reproduces the source of truth.
- Decision: fallback only after clean prebuild/device evidence disproves approach 3.

## Open questions to the user

- None blocking. Proceed with approach 3.
- Screenshot comparison scope:
  - Whole-screen exact diff: strict, but sensitive to time, status bar, animation, and deal state.
  - Matched card-region comparison plus side-by-side review: isolates the requested visual contract while still exposing geometry changes.
  - Recommendation: use matched card regions as the objective comparison and retain full screenshots as review artifacts.
- If approach 3 does not reproduce `right.png` after a verified fresh install, stop and document the observed difference before changing any visual code. The next investigation should compare generated native state and runtime font resolution; it must not start by tuning card constants.

## Dependencies

- No new runtime or build dependencies.
- Existing package guides:
  - [expo.md](/Users/karim/kDrive/Code/soli/docs/external-package-guides/expo.md)
  - [expo-font.md](/Users/karim/kDrive/Code/soli/docs/external-package-guides/expo-font.md)
- Existing device tooling:
  - [agent-device skill](/Users/karim/kDrive/Code/soli/.agents/skills/agent-device/SKILL.md)

## UX/UI Considerations

- This is a zero-visual-change correction. The approved Android card face in `right.png` is the contract.
- Do not adjust rank/suit size, weight constants, offsets, padding, card dimensions, or font glyph data to compensate for registration behavior.
- Preserve iOS embedded-font behavior; Android determinism must not create an iOS regression.

## Components

- Reuse the existing card renderer and font constants without modification:
  - [CardVisual.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/CardVisual.tsx)
  - [fonts.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/fonts.ts)
- No component is created or changed.

## How to fetch data, how to cache

Not applicable. Fonts are local tracked assets and native projects are generated from local Expo configuration.

## Related tasks

- [Exact Android card font rendering](/Users/karim/kDrive/Code/soli/docs/product/card-font-parity/exact-android-card-font-rendering.md)
- [PBI 33-1 card font implementation](/Users/karim/kDrive/Code/soli/docs/delivery/33/33-1.md)
- [PBI 33-2 card font verification](/Users/karim/kDrive/Code/soli/docs/delivery/33/33-2.md)

## Simplification ideas

- Keep `expo-font` and one config block, but configure only the platform that should embed these files: iOS. Do not add a custom Android plugin unless clean-device evidence requires it.
- Keep the existing prebuild/release guard entry points and invert the Android contract instead of adding another script.
- Treat ignored native folders as disposable generated output. The tracked config plus checks should explain and reproduce the intended platform difference.

## Steps to implement

- [completed] Read `AGENTS.md` and the full current implementation plan.
- [completed] Inspect `/Users/karim/kDrive/Code/soli copy/android` as forensic source of truth.
- [completed] Confirm the approved native shell has an empty `xml-fonts-init` block, no `CardTextAndroid` registration, and no `res/font` CardTextAndroid family/resources.
- [completed] Confirm current tracked `CardTextAndroid` binaries and card visual/font constants are unchanged; record their hashes in Intermediary learnings.
- [completed] Replace the outdated plan assumption (Android weighted registration is required) with the exact-appearance/non-registration goal and full validation sequence.
- [completed] Before implementation, have the implementation sub-agent read this entire updated plan and use the latest model at highest reasoning, per `AGENTS.md`.
- [completed] Record a pre-change diff/hash guard for all forbidden visual files and font binaries.
- [completed] Change `app.json` so the `expo-font` plugin keeps the three iOS font paths but does not generate Android `CardTextAndroid` resources or registration.
- [completed] Update `scripts/check-generated-card-fonts.js` so Android asserts intentional non-registration/absence while iOS asserts the three embedded fonts and absence of legacy references.
- [completed] Keep the package prebuild/check scripts; update release-guard wording/comments to explain that Android non-registration is the protected visual contract.
- [completed] Correct the Expo/expo-font guide notes that currently claim Android weighted registration is desired; document the verified Soli-specific platform split without contradicting upstream API behavior.
- [completed] Run formatter/syntax checks for changed configuration and scripts.
- [completed] Run `yarn typecheck`, then `yarn lint`, then `yarn jest`.
- [completed] Check for other running native builds and stop them before beginning; never overlap builds.
- [completed] Run a clean Android prebuild and inspect the generated files directly before building.
- [completed] Run `yarn release` through a GPT 5.5 medium testing sub-agent using the agent-device skill; wait for completion, unlock the physical device if needed, and verify the new release is installed.
- [completed] Reproduce an equivalent game state/orientation, capture a full physical-device screenshot, and compare card regions against `/Users/karim/kDrive/Fotos/Screenshots/right.png` using side-by-side review and the existing measurement workflow where applicable.
- [completed] Stop the Android release/Metro and agent-device sessions, then run clean iOS prebuild sequentially and verify exactly the three current embedded card fonts with no legacy reference; no iOS run/build is in this testing assignment's scope.
- [completed, not triggered] If visual parity fails, update this plan with evidence and investigate native/runtime font resolution without modifying visual constants or font binaries. Fresh-workspace parity passed, so no investigation or visual/config change was needed.
- [completed] Create a temporary fresh workspace from tracked plus intended working-tree source files, excluding `.git`, `node_modules`, `android`, `ios`, and build output; pass signing secrets only through the existing local environment.
- [completed] In that fresh workspace, run immutable dependency installation, clean Android prebuild, the Android font guard, and compare the generated font-related manifest/content with the first clean prebuild.
- [completed] Sequentially run `yarn release` from the fresh workspace, confirm that release is installed on the physical device, capture a second screenshot, and verify it matches both `right.png` and the first corrected build in card appearance/geometry.
- [completed] Re-run the forbidden-file hashes/diffs to prove there were no card binary, card renderer, or geometry changes.
- [completed] Update every completed implementation-step status, Files actually modified, Intermediary learnings, Identified issues, and Testing for this handoff; the testing sub-agent must continue this discipline for remaining steps.

## Plan: Files to modify

Expected implementation files:

- `app.json` - remove Android `CardTextAndroid` generation while preserving the three iOS entries.
- `scripts/check-generated-card-fonts.js` - invert the Android assertions and retain iOS/tracked-asset checks.
- `run-android-release.sh` - keep the guard invocation; correct its explanatory comment/message for intentional Android non-registration.
- `docs/external-package-guides/expo.md` - correct the Soli-specific CNG note.
- `docs/external-package-guides/expo-font.md` - correct the Soli-specific registration note while preserving upstream package facts.
- `docs/product/generated-native-card-fonts/generated-native-card-font-check.md` - maintain status, evidence, and final test report.

Expected to remain as already introduced, with no further behavioral change unless validation exposes a defect:

- `package.json` - existing clean-prebuild and check commands.

Explicitly forbidden from modification for this correction:

- `assets/fonts/CardTextAndroid.ttf`
- `assets/fonts/CardTextAndroid-SemiBold.ttf`
- `assets/fonts/CardTextAndroid-Bold.ttf`
- `scripts/build-card-fonts.py`
- `src/features/klondike/components/cards/CardVisual.tsx`
- `src/features/klondike/components/cards/fonts.ts`
- all other card layout/style/geometry files
- ignored generated `android/` and `ios/` files as source changes (they may be regenerated and inspected only)

## Files actually modified

Current worktree files belonging to this feature before the corrective implementation:

- `docs/product/generated-native-card-fonts/generated-native-card-font-check.md`
- `scripts/check-generated-card-fonts.js`
- `package.json`
- `run-android-release.sh`
- `docs/external-package-guides/expo.md`
- `docs/external-package-guides/expo-font.md`

Corrective implementation files modified by the implementation sub-agent:

- `app.json`
- `scripts/check-generated-card-fonts.js`
- `run-android-release.sh`
- `docs/external-package-guides/expo.md`
- `docs/external-package-guides/expo-font.md`
- `docs/product/generated-native-card-fonts/generated-native-card-font-check.md`

Fresh-workspace determinism testing sub-agent:

- Modified only `docs/product/generated-native-card-fonts/generated-native-card-font-check.md` in the main repo to record step-by-step evidence.
- Created and intentionally retained `/tmp/soli-card-font-fresh.roCQhj` for main-agent inspection; all generated native/build/signing patch changes are confined to that temporary workspace.

## Intermediary learnings

- The earlier plan encoded the wrong success condition: it required clean Expo-generated Android weighted resources, but those resources are the observed cause of the visual change.
- `/Users/karim/kDrive/Code/soli copy/android/app/src/main/java/ch/karimattia/soli/MainApplication.kt` contains an empty generated `xml-fonts-init` block and no `addCustomFont` call for `CardTextAndroid`.
- `/Users/karim/kDrive/Code/soli copy/android/app/src/main/res/font` has no `CardTextAndroid` XML or TTF resources.
- The forensic copy contains stale `android/app/src/main/assets/fonts/CardRankAndroidBold.ttf`, but the live JS requests `CardTextAndroid`; this asset does not establish the requested family and is not a reason to preserve ignored native drift.
- Before the corrective implementation, `app.json` requested a weighted Android `CardTextAndroid` family at 400/600/700 and the three iOS font files. The implementation removed only the Android generation side.
- The current root layout loads Inter fonts at runtime but does not load `CardTextAndroid`; iOS card fonts depend on native embedding.
- Reference screenshot: SHA-256 `4661ef34eab01308920f6c631a974232295b48b68d84343e637204a65a07c461`.
- Forbidden-file baseline hashes captured on 2026-07-03:
  - `CardTextAndroid.ttf`: `06d576faed1009b5d794ef07be8e4a6fabb4b9771b1150c8c90d39c5e0657ca0`
  - `CardTextAndroid-SemiBold.ttf`: `37dd5d366dcb503f6cead9f9ca5baaa5e321c3a2b2519fabd2665307d3fb082c`
  - `CardTextAndroid-Bold.ttf`: `018e80524f9253912667d4459045d3b98cfc7ba74f4fbebbea5c217e22ec7fb0`
  - `CardVisual.tsx`: `9bfc3507de1762e40f52ee8d55d9fd23707111e50f839f0b3d5cb0784d0e5624`
  - `fonts.ts`: `f8389e31f840913f5cce67df9ec4635c2110a6a8e0770642bdc7a438348d7d36`
- The implementation sub-agent rechecked those five visual/font hashes before editing; all matched. The separately forbidden `scripts/build-card-fonts.py` baseline is `f43bc227f13035a3cc0db221e63ce98427c158259a91ca9820dd4369e9d2c762`.
- The official `expo-font` config-plugin schema supports platform-specific `ios.fonts`; omitting cross-platform `fonts` and `android.fonts` is sufficient to keep these card-font files out of generated Android native code.
- The guard now checks both sides of the contract: `app.json` must list exactly the three iOS card-font paths and no cross-platform/Android card-font inputs, while generated Android must contain no card-family XML, TTF resource, `MainApplication.kt` family reference, or stale native asset.
- The existing release guard remains in the same place before ADB/signing work; its comment and the checker success message now name Android non-registration as the protected appearance contract.
- Official Expo documentation still recommends the config plugin for native build-time embedding and supports Android weighted family definitions. The corrected guide notes preserve those upstream facts while documenting why Soli deliberately uses only `ios.fonts` for this family.
- The post-implementation SHA-256 pass matched every baseline exactly, including all three font binaries, `CardVisual.tsx`, `fonts.ts`, and the separately forbidden `scripts/build-card-fonts.py`; no visual/layout file was changed.
- Final orchestrator audit found stale `expo-font` guide wording that still described `CardTextAndroid` as a root-layout `useFonts` font. The app currently loads Inter there, while `CardTextAndroid` is governed by the native prebuild contract, so the guide was corrected without touching card code or visual files.

## Identified issues

- [resolved in plan] The previous Android guard protected the regressed generated state instead of the approved appearance. The implementation must invert that contract.
- [resolved] `app.json` now uses only `expo-font`'s `ios.fonts` field for the three card-font files, so tracked config no longer requests Android registration.
- [resolved] `scripts/check-generated-card-fonts.js` now rejects Android card-font registration/resources and protects the intentional approved fallback path.
- [resolved] The July 3 Expo/expo-font guide additions now document Soli's intentional iOS-embedded/Android-unregistered split without changing accurate upstream package facts.
- [resolved] Physical-device parity with `right.png` is proven for the requested card font/geometry contract by the fresh installed release screenshot and matched-scale card-region measurements; full-screen pixels intentionally differ because game state/theme/status UI differ.
- [resolved] Fresh-workspace determinism is proven by native-folder-free generation, byte-identical fresh/main generated state, successful fresh release install, and approved screenshot measurements.
- [deferred] The repo's broader mixed CNG/tracked-native exceptions are outside this zero-visual-change correction.

## Testing

### Historical checks from the superseded implementation

- `node --check scripts/check-generated-card-fonts.js` passed.
- `bash -n run-android-release.sh` passed.
- `yarn check:card-fonts:ios` passed.
- `yarn format:check`, `yarn lint`, `yarn typecheck`, and `yarn jest --runInBand` passed.
- `yarn check:card-fonts:android` failed against the old approved ignored native shell because it lacked the newly required Android registration. That failure is now understood as evidence that the check asserted the wrong visual contract, not that the approved shell was defective.

### Required corrective verification

1. Static/cheap: config parse/format, script syntax, `yarn typecheck`, `yarn lint`, `yarn jest`.
2. Generated Android: clean `yarn prebuild:android`; assert empty/absent `CardTextAndroid` native registration and resources.
3. Generated iOS: clean `yarn prebuild:ios`; assert all three iOS font references remain. Run this build/prebuild sequentially, never alongside Android work.
4. Main physical Android: `yarn release`; wait for build/install; verify package/build on device; capture and compare screenshot with `right.png`.
5. Fresh workspace: start without `android/` or `ios/`; install dependencies immutably; clean prebuild/check; compare generated state; run a second sequential physical `yarn release`; verify install and screenshot parity.
6. Integrity: confirm the five recorded forbidden-file hashes remain unchanged and inspect `git diff` for any card geometry/style changes.

### Corrective implementation checks (2026-07-03)

- `node -e "JSON.parse(...)"` for `app.json`: passed.
- `node --check scripts/check-generated-card-fonts.js`: passed.
- `bash -n run-android-release.sh`: passed.
- `yarn oxfmt --check app.json scripts/check-generated-card-fonts.js`: passed.
- Scoped `git diff --check`: passed.
- Post-implementation SHA-256 comparison for all forbidden files: passed; every hash matches the recorded baseline.
- Per the implementation handoff, no prebuild, generated-native guard execution, native build, device test, screenshot capture, full typecheck, lint, or Jest run was performed; those remain for the testing sub-agent.

### Corrective testing pass (2026-07-03)

- [completed] Testing setup and integrity baseline: read `AGENTS.md`, this entire plan, and `.agents/skills/agent-device/SKILL.md`; `agent-device --version` reported `0.17.10` and `agent-device help workflow` completed successfully.
- [completed] Pre-test `git status --short` recorded. Existing changes include `AGENTS.md`, generated/native Android files, feature implementation/config/docs, and the untracked feature plan/checker; the testing pass will not stage, unstage, commit, revert, or overwrite unrelated changes.
- [completed] Pre-test forbidden-file SHA-256 values exactly match the implementation handoff: `06d576...7ca0` (`CardTextAndroid.ttf`), `37dd5d...082c` (`CardTextAndroid-SemiBold.ttf`), `018e80...7fb0` (`CardTextAndroid-Bold.ttf`), `f43bc2...2762` (`scripts/build-card-fonts.py`), `9bfc35...5624` (`CardVisual.tsx`), and `f8389e...7d36` (`fonts.ts`). Full values remain recorded in Intermediary learnings above.
- [completed] Cheap checks ran sequentially and passed: `yarn typecheck`; `yarn lint`; `yarn jest` (11/11 suites, 56/56 tests, 0 snapshots); `node --check scripts/check-generated-card-fonts.js`; `bash -n run-android-release.sh`; `app.json` JSON parse; and `yarn format:check` (87 files matched).
- [completed] Prebuild process/device gate: no active Gradle task, Metro server, Expo native run, or Xcode build was found. Only the Cursor Gradle language server plus idle Gradle/Kotlin daemons were present, so no process was terminated. `agent-device devices --platform android` reported physical `A065` booted; `adb devices -l` confirmed its connected A065 transport (`adb-4139951e-zmJeED._adb-tls-connect._tcp`).
- [completed] Clean `yarn prebuild:android` completed successfully and automatically ran the Android guard. Direct inspection found no `CardTextAndroid`, `addCustomFont`, or `xml-fonts-init` text in generated `MainApplication.kt`; no files under generated `res/font`; and no `CardTextAndroid`, `CardRankAndroid`, or `xml_card_text_android.xml` file anywhere under `android/app/src/main`. A separate `yarn check:card-fonts:android` passed with the approved-unregistered-fallback message.
- [completed] Forensic comparison: `/Users/karim/kDrive/Code/soli copy/android` likewise has no `CardTextAndroid`/`addCustomFont` registration and no `res/font` files; it has only an empty generated `xml-fonts-init` marker block. Its stale `assets/fonts/CardRankAndroidBold.ttf` is absent from the newly generated Android tree, as required. Thus registration and resource facts match the approved native shell while stale legacy state is removed.
- [completed] Main Android release build/install: `yarn release` re-ran the font guard, completed `assembleRelease` successfully in 3m05s (642 actionable tasks), and installed `android/app/build/outputs/apk/release/app-release.apk` on A065. The APK is 116,955,589 bytes with mtime `2026-07-03 16:34:12 +0200`; device package metadata reports `ch.karimattia.soli` versionName `0.8.0`, versionCode `13`, and lastUpdateTime `2026-07-03 16:34:23`, proving the new APK was installed.
- [completed] Physical-device launch/capture: the existing agent-device serial session was `main-font`. The first screenshot was fully black; `scripts/android-unlock-pattern.sh` reported successful unlock, then `agent-device open ch.karimattia.soli --session main-font --platform android --device A065 --relaunch` exposed a live dealt game with face-up cards. Final full screenshot: `/tmp/soli-card-font-corrected-main.png`.
- [completed] Visual comparison: all four screenshots (`right.png`, `wrong.png`, `/tmp/soli-main-clean-font-2.png`, corrected) are exactly 1080x2412. Representative 140x198 card crops were assembled in order approved/wrong/prior-clean/corrected at `/tmp/soli-card-font-comparison-strip.png`; individual crops are `/tmp/soli-card-font-{right,wrong,clean,corrected}-card.png`. The corrected card's rank bbox begins 10 px below the card crop and corner suit begins 9 px below, exactly matching approved `right.png`; `wrong.png` begins 4 px/5 px, visibly too high. Corrected large-suit content begins 25 px into the measured inner region, matching approved 25 px versus wrong 21 px. Corrected rank/suit shapes and sizes visually follow the approved fallback typeface, while `wrong.png` and the prior clean-font screenshot show the raised weighted-registration path. Card geometry remains 140x198 at identical device scale.
- [completed with tooling fallback] `scripts/measure-card-corners.py` was attempted but could not run because ImageMagick's required `magick` binary is not installed/on `PATH`; no dependency was added. Existing `ffmpeg` crop, threshold, `bbox`, and `hstack` filters supplied equivalent bounded measurements and side-by-side artifacts.
- [completed] Sequential iOS generation: the Android release/Metro process was interrupted after capture and exited cleanly; agent-device session `main-font` was closed; no active Android/iOS build remained. `yarn prebuild:ios` cleared/regenerated `ios`, installed CocoaPods, and passed its automatic guard. A separate `yarn check:card-fonts:ios` passed. `ios/Soli/Info.plist` contains exactly `CardTextAndroid.ttf`, `CardTextAndroid-SemiBold.ttf`, and `CardTextAndroid-Bold.ttf` under `UIAppFonts`; `ios/Soli.xcodeproj/project.pbxproj` contains exactly those three source/resource entries; recursive search found no `CardRankAndroid` legacy reference. No iOS simulator run or native build was performed because the explicit testing assignment says it is not required; this is narrower than the repository's general clean-iOS-build rule by direct user instruction.
- [completed] Final integrity proof: all six forbidden SHA-256 values exactly equal the pre-test baseline (`06d576...7ca0`, `37dd5d...082c`, `018e80...7fb0`, `f43bc2...2762`, `9bfc35...5624`, `f8389e...7d36`), and `git diff --` across those six paths is empty. Final `git status --short` contains only the pre-existing/feature implementation and generated-native entries recorded at baseline; no file was staged, unstaged, committed, or reverted.
- [deferred by explicit assignment] The fresh native-folder-free workspace and second release build/install remain pending for a separate sequential testing assignment; neither was created or started in this pass.

### Fresh-workspace determinism testing pass (2026-07-03)

- [completed] Setup/process gate: re-read `AGENTS.md`, this entire plan, and `.agents/skills/agent-device/SKILL.md`; `agent-device --version` is `0.17.10` and `agent-device help workflow` completed. No active Gradle/Expo/Metro/Xcode build was running; Gradle daemon PID 13121 was `IDLE` and the Cursor Gradle language server was not an active build. Physical Android A065 was connected. Baseline `git status --short` was recorded without staging/unstaging, and all six forbidden-file SHA-256 hashes matched the prior baseline exactly.
- [completed] Source-only workspace creation: rsynced the current main working tree, including intended tracked/untracked source changes and `.yarn`/`yarn.lock`, to `/tmp/soli-card-font-fresh.roCQhj`. Excluded `.git`, `node_modules`, `android`, `ios`, `.expo`, `.tamagui`, `.venv`, `tmp`, `dist`, `.env`, `.DS_Store`, and TypeScript build-info output. Assertions proved `android/`, `ios/`, `.env`, and `dist/` absent before install/prebuild. An initial disposable copy at `/tmp/soli-card-font-fresh.yvStg2` was removed and recreated because it included `dist`; no main-repo implementation file was touched.
- [completed] Immutable dependency installation: `yarn install --immutable` in `/tmp/soli-card-font-fresh.roCQhj` completed successfully with Yarn 4.12.0 in 6.5s. Yarn reported only its existing peer-dependency warning (`YN0086`) and built `esbuild`; the lockfile was accepted unchanged.
- [completed] Fresh Android generation/guard: `yarn prebuild:android` cleared and generated `android/` successfully and its automatic guard passed; a separate `yarn check:card-fonts:android` also passed. Recursive inspection found no `CardTextAndroid`, `CardRankAndroid`, `addCustomFont`, `xml-fonts-init`, card-font resource/XML, `res/font` file, or legacy native asset anywhere relevant under fresh `android/app/src/main`.
- [completed] Native-state comparison: fresh and main generated `MainApplication.kt` are byte-identical with SHA-256 `e6f3952311c14492ac186f16a2a479c4270d75446291b5afbe04aee081cf7581`, and `diff -u` is empty. Both have the same complete absence of native card-font registration/resources/assets. The forensic copy's `MainApplication.kt` hash differs (`2a8f5d37835e938b3e14fc55cbbd949d1ef550ad87febf277e9baab9c48efbca`) only because it retains an empty `xml-fonts-init` marker block; it likewise contains no registration or `res/font` resource. This proves the relevant approved unregistered state is equivalent and fresh/main generated state is byte-identical.
- [completed] Fresh release build/install: exported the four required signing variables directly from the main repo `.env` into the fresh build process without copying or printing values. Before build, A065 reported versionName `0.8.0`, versionCode `13`, lastUpdateTime `2026-07-03 16:34:23`, and no fresh APK existed. `yarn release` passed the card-font guard, produced a successful 642-task release build in 5m29s, and installed it on A065. The new APK is 116,955,589 bytes, SHA-256 `ad4f3773bc7412b3c63866710dd93a80d3ed5d9fa58dce28cd1e65c59cfa3068`, mtime `2026-07-03 16:49:14 +0200`; device lastUpdateTime advanced to `2026-07-03 16:49:31` with the expected versionName/code, independently proving a new installation. Build warnings were limited to existing plugin/deprecation/native compiler warnings; the Expo max-SDK plugin also logged an unrelated missing stale baseline manifest path but completed successfully.
- [completed] Fresh physical capture: main-repo `scripts/android-unlock-pattern.sh` successfully unlocked A065. `agent-device open ch.karimattia.soli --session fresh-font --platform android --device A065 --relaunch` opened the newly installed app, and `/tmp/soli-card-font-corrected-fresh.png` captured a visible dealt game at 1080x2412 (SHA-256 `3e773b193e1897ad90c6aec805479a7ef5d76f9916260821fc22693ee43ca7a5`); no black-screen retry was required.
- [completed] Fresh visual parity: cropped the same-scale 140x198 first tableau card to `/tmp/soli-card-font-fresh-card.png` and assembled approved/wrong/main-corrected/fresh crops at `/tmp/soli-card-font-fresh-comparison.png`. FFmpeg threshold/bbox measurement gives fresh rank/suit face insets 10px/9px after excluding the 2px rounded-corner edge, matching the approved/main corrected contract and contrasting wrong's recorded 4px/5px. The fresh `2` rank's 23x34 threshold mask, aligned by its measured bbox, has FFmpeg SSIM `1.000000` against the approved `2` rank mask, proving the glyph shape is pixel-identical; card geometry remains 140x198. Fresh large-suit placement and fallback shapes visually match the approved/main corrected crops, while `wrong.png` remains visibly raised. Comparison artifacts: `/tmp/soli-card-font-fresh-comparison.png`, `/tmp/soli-card-font-{fresh,right}-rank-mask.png`.
- [completed] Cleanup/final integrity: interrupted the post-install Metro wait cleanly, closed agent-device session `fresh-font`, and stopped the fresh workspace Gradle daemon; no active native build or Metro remained (only Cursor's non-building Gradle language server). All six forbidden main-repo hashes still match baseline exactly and `git diff --` for those paths is empty. Final main `git status --short` is identical in path set to the recorded baseline: `AGENTS.md`, generated Android Gradle files, feature config/docs/package/release changes, and untracked feature plan/checker; this sub-agent changed no main implementation or visual file, and performed no stage/unstage/commit/revert operation. Temporary workspace `/tmp/soli-card-font-fresh.roCQhj` remains in place as requested.

### Final orchestrator audit (2026-07-03)

- [completed] Re-read this implementation plan after context compaction and verified every feature step is marked complete with evidence.
- [completed] Inspected generated Android state: only `MainApplication.kt` is present among font-related generated paths, `android/app/src/main/res/font` and `android/app/src/main/assets/fonts` contain no card-font files, and recursive search for `CardTextAndroid`, legacy card-font names, `addCustomFont`, and `xml_card_text_android` under `android/app/src/main` returns no matches.
- [completed] Inspected generated iOS state: `Info.plist` and `project.pbxproj` reference exactly `CardTextAndroid.ttf`, `CardTextAndroid-SemiBold.ttf`, and `CardTextAndroid-Bold.ttf`, with no legacy `CardRankAndroid`/`CardSuitAndroid` references.
- [completed] Re-ran current-tree guards and cheap checks: `yarn check:card-fonts:android`, `yarn check:card-fonts:ios`, `node --check scripts/check-generated-card-fonts.js`, `bash -n run-android-release.sh`, `yarn typecheck`, `yarn lint`, `yarn jest`, `yarn format:check`, and `git diff --check` all passed.
- [completed] Rechecked all six forbidden visual/font files: SHA-256 hashes still match the recorded baseline exactly, and `git diff --` for those paths is empty.
- [completed] Inspected physical-device screenshot artifacts directly: `/tmp/soli-card-font-corrected-main.png` and `/tmp/soli-card-font-corrected-fresh.png` are 1080x2412 and visually match the approved card inset; comparison strips at `/tmp/soli-card-font-comparison-strip.png` and `/tmp/soli-card-font-fresh-comparison.png` show the corrected crops aligned with `right.png` and distinct from the raised `wrong.png` crop.
- [completed] Verified fresh/main generated Android `MainApplication.kt` are byte-identical with SHA-256 `e6f3952311c14492ac186f16a2a479c4270d75446291b5afbe04aee081cf7581`, proving source-only regeneration produces the same relevant native state.
- [completed] Confirmed the physical Android install still reflects the fresh-workspace build: package `ch.karimattia.soli`, versionName `0.8.0`, versionCode `13`, lastUpdateTime `2026-07-03 16:49:31`.
- [completed] Process audit found no active native build or Metro process left running; only Cursor's Gradle language server remains.
- [completed] Corrected stale package-guide wording so `expo-font.md` no longer claims `CardTextAndroid` is loaded through root-layout `useFonts`; the guide now points to the native prebuild contract and guard script.
