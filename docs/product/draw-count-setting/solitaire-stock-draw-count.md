# Draw Count Setting Solitaire Stock Draw Count

## User prompt
Implement a solitaire draw-count setting that lets the player choose how many cards are drawn from the stock: 1, 2, 3, 4, or 5.

Before implementing, follow the repo instructions:
- Create a detailed implementation plan in `docs/product/<feature-name>/<story-name>.md`.
- Include the full user prompt 1:1.
- Keep step statuses updated after each implementation step.
- Use Tamagui components via local component wrappers, not raw Tamagui directly in screens.
- Do not add external packages unless truly necessary; if adding one, research and document it first.

Feature behavior:
- Add a setting for “Cards drawn from stock” with choices `1`, `2`, `3`, `4`, `5`.
- Fresh installs / users with no saved preference should default to `1`.
- Persist the selected draw count in the app’s existing settings/preferences storage.
- New games should use the selected draw count.
- The selected draw count should be stored on each game, not only in global settings.
- Setting changes should apply to the next new game only. Do not silently change the rules of an active game.
- The deck/game generation should remain exactly as it is today: continue using the existing solvable-game flow for draw-one games.
- Important: we currently only know that generated games are solvable for draw 1. For draw 2-5, use the same generated deal, but do not claim it is guaranteed solvable under that draw count.

Backward compatibility / released-app migration:
- The app is now released, so full backward compatibility is not required.
- However, migration must be crash-safe. Old persisted data should never crash the app or corrupt state.
- Use a minimal safe migration approach:
  - Missing `drawCount` on existing active games should default to `1`.
  - Existing saved games without `drawCount` should be treated as Draw 1 games.
  - Existing stats/history without `drawCount` should be treated as Draw 1 data.
  - Existing undo/history should continue to replay according to the game’s own draw count, not the current global setting.
- Do not reset all user data unless there is a clear technical reason and it is documented in the implementation plan.
- If current history stores actions like `DRAW_FROM_STOCK`, make sure replay/undo uses the game’s stored `drawCount` or stores the exact moved cards in the action.
- If current history stores before/after snapshots, verify the snapshot includes or can infer `drawCount`.
- If the app records stats, split or label stats by draw count where relevant so Draw 1, Draw 3, and Draw 5 results are not misleadingly mixed.
- Existing stats may be migrated/defaulted as Draw 1 stats.
- If daily challenges, replays, share links, or leaderboards exist, check whether they need draw count metadata.
- For daily challenges or generated “solvable” deals, either force Draw 1 or clearly mark that higher draw counts use Draw 1-solvable deals that may not be solvable with the selected draw count.
- Consider storing metadata such as `solvableForDrawCount: 1` or `dealSolvabilityBasis: "draw1"` if the project has an appropriate place for deal metadata.

UX copy:
- In settings, include a short note near the draw-count selector:
  “Deals are generated to be solvable with Draw 1. Higher draw counts use the same deals and may not always be solvable.”
- Keep the note calm and concise.
- Recommended UI: a segmented control or compact radio/select-style control with options `1`, `2`, `3`, `4`, `5`.
- Do not limit the UI to only 1 and 3; expose all five choices directly.

Game logic requirements:
- Update stock/waste draw behavior so tapping/drawing from the stock moves up to `drawCount` cards into the waste, preserving the correct order.
- Handle remaining stock counts smaller than the selected draw count.
- Ensure stock reset/recycle behavior still works.
- Ensure undo/redo, move history, scoring, move count, timer behavior, and win detection continue to work correctly.

Acceptance criteria:
- A new user starts with Draw 1.
- Settings allow selecting Draw 1 through Draw 5.
- The selected draw count is persisted across app restarts.
- Starting a new game uses the selected draw count.
- Active games keep their original draw count even if the setting changes.
- Draw 2-5 visibly draw the correct number of cards from the stock.
- The settings note clearly explains the solvability limitation.
- Existing Draw 1 behavior remains unchanged.
- Old saved games/history/stats without `drawCount` are handled safely as Draw 1.
- Undo/redo and stock recycling still work for all draw counts.

Follow-up prompt, 2026-06-06:

there was a decision to show more than 3 cards at a time when drawing 4 or 5 cards. This leads to an overlap. Please keep to 3 cards visible for now. adjust documentation.

Also, visually improve the setting to select the number of draws.

android device connected now

btw, pls mention this link in documentation: https://old.reddit.com/r/solitaire/comments/1s42yyu/free_and_adfree_solitaire_app/ockhmye/

this was the user feedback that led to this feature.

Follow-up prompt, 2026-06-07:

pls don't put the settings into an extra box. just directly on settings.
think it through and just give me an answer: how does auto up work in combination with having draw more than 1? should this still start when all cards on board are uncovered?

Follow-up prompt, 2026-06-11:

There's still an outer layer and then an inner layer with the numbers, and I would recommend to just keep the inner layer. And also, I think we could just only start auto-up when all the cards from the stack are also empty, kind of if they're either like down or wherever. And only then start auto-up when this is empty in case there are more than, in case there is more than draw one. So kind of in draw one, keep the current auto-up if there's no more cards on the board that are covered, then auto-up. If it's draw two or more, then only when there are no more covered cards and there are no more cards in the stack where you draw from. Does that make sense? If yes, please implement and also update the notes. Thank you.

Follow-up prompt, 2026-06-11 terminology clarification:

maybe a terminology issue. what is stock, waste in this context? what other expressions do we have? is the stack = waste + stock? In my view, there should be no card on the top right, not just in one of those, e.g. just in waste. pls investigate.
BTW, i changed the copy to make it shorter.

Follow-up prompt, 2026-06-11 demo draw count:

When starting a demo game, is this always draw one? Would it be easy to make a demo game whenever you start a new demo game to just have the same draw as in the settings? Thank you.

## Description
Add a persisted `drawCount` gameplay preference with values 1 through 5. Each newly created Klondike game copies the current preference into its own game state and undo snapshots. Active games never read the global draw-count setting after creation, so changing Settings only affects the next game.

Stock draws remove up to the game's `drawCount` cards from the top of the stock and append them to the waste in the same order produced by repeated single-card draws. Recycling reverses the complete waste back into the stock exactly as it does today.

The existing curated deal generation remains unchanged. Curated deals retain a Draw 1 solvability basis; Draw 2-5 games may use the same deal but are not presented as guaranteed solvable for the selected rule.

The waste fan remains capped at the existing three visible cards for every draw count.
Draw 4 and Draw 5 still move the correct number of cards, but older waste cards stay
hidden under the three-card visual window so the fan cannot overlap the stock or
foundation columns.

## Acceptance Criteria
- `DrawCount` is a validated union of `1 | 2 | 3 | 4 | 5`.
- Settings default `drawCount` to `1`, sanitize invalid persisted values to `1`, and persist valid changes through the existing settings key.
- A local reusable settings control exposes all five values and is built from Tamagui components.
- The draw-count label, caption, and solvability note sit directly in Gameplay; only the
  five-number selector has a visible container.
- Settings includes the exact requested solvability note adjacent to the selector.
- Random, curated-solvable, and developer demo game factories store a valid `drawCount`.
- The normal new-game flow passes the current preference into both random and curated deal creation.
- The developer demo factory accepts a draw count. Normal demo launches use the selected
  setting; the hidden scripted auto-solve path stays Draw 1 because that sequence was
  authored around one draw becoming one waste card.
- The first automatic waste reveal for a newly created game uses the game's draw count while preserving existing Draw 1 behavior.
- Each stock tap moves `min(stock.length, drawCount)` cards to waste and increments the move count once.
- Draw order matches repeated single-card pops: the last card drawn becomes the accessible waste top.
- The waste fan displays at most the top three cards for Draw 1 through Draw 5.
- Draw 4 and Draw 5 never widen the waste fan into neighboring board columns.
- Draw 1 Auto Up remains eligible as soon as every tableau card is face up.
- Draw 2-5 Auto Up becomes eligible only when every tableau card is face up and the
  top-right draw area is empty: both stock and waste are empty.
- Recycling restores the stock ordering and remains one undoable move.
- Game snapshots include `drawCount`; undo, redo/scrubbing, persistence, and auto-complete draws use the game rule rather than global settings.
- Legacy active-game payloads and every legacy history/future snapshot missing `drawCount` normalize to Draw 1 without clearing storage.
- History entries store and display draw count; legacy entries normalize to Draw 1.
- Curated-deal selection statistics use only Draw 1 results, avoiding misleading aggregation with Draw 2-5 outcomes.
- Existing Draw 1 reducer and persistence tests continue to pass.
- Focused tests cover Draw 2-5 ordering, short-stock draws, recycle, undo/redo, game creation, and legacy migration.
- No daily challenges, public replays, share links, or leaderboards currently require metadata changes; the history system is the only persisted results/statistics surface found in scope.

## Design links
- Existing Settings > Gameplay layout is the in-app design reference.
- User feedback that led to the feature:
  https://old.reddit.com/r/solitaire/comments/1s42yyu/free_and_adfree_solitaire_app/ockhmye/
- Follow-up Android screenshots:
  - `/Users/karim/kDrive/Fotos/Screenshots/Screenshot_20260606-102102.png`
  - `/Users/karim/kDrive/Fotos/Screenshots/Screenshot_20260606-102432.png`
- Tamagui ToggleGroup documentation, researched 2026-06-05:
  https://tamagui.dev/ui/toggle-group
- React Native AsyncStorage API, researched 2026-06-05:
  https://react-native-async-storage.github.io/async-storage/docs/api/

## Possible approaches incl. pros and cons
- Store `drawCount` only in global settings and read it on every stock draw.
  - Pros: smallest state-model change.
  - Cons: changing Settings would silently alter active games, persisted games would depend on current settings, and undo/replay would not be rule-stable.
- Store `drawCount` on `GameState` but omit it from snapshots.
  - Pros: active games remain isolated from global settings.
  - Cons: restored undo/future snapshots cannot prove which rule they belong to, and legacy snapshot handling becomes implicit.
- Store `drawCount` on game state and every snapshot, with load-time normalization.
  - Pros: active games, persistence, undo/redo, and auto-complete all use one explicit rule; migration is local and crash-safe.
  - Cons: touches game factories, persistence sanitization, and test fixtures.

Recommendation: store `drawCount` on `GameSnapshot` so it naturally exists on `GameState` and all undo/future states. Normalize legacy state and snapshots to Draw 1 at the persistence boundary.

Follow-up visual approaches:
- Show up to `drawCount` cards in the waste fan.
  - Pros: directly visualizes every card moved by the last draw.
  - Cons: Draw 4/5 exceeds the fixed board column and overlaps the stock, as confirmed
    by the Android screenshot.
- Keep the waste fan capped at three visible cards.
  - Pros: preserves the existing board geometry and keeps the actionable top card clear.
  - Cons: Draw 4/5 cannot display every card from one draw simultaneously.
- Replace the current low-contrast segmented selector with explicit styled Tamagui text
  inside each segment.
  - Pros: fixes invisible Android labels and makes the selected value obvious.
  - Cons: requires local wrapper styling instead of relying on ToggleGroup defaults.

Follow-up recommendation: cap the waste fan at three and use a bordered, high-contrast
five-segment selector with explicit numeric `Text` children.

Second follow-up recommendation: keep the bordered styling on the five-way selector
itself, but remove the outer Card so the setting participates directly in the existing
Gameplay section hierarchy.

## Open questions to the user incl. recommendations (if any)
- None blocking.
- Recommendation adopted: use the selected count for the initial automatic waste reveal because game creation currently performs an initial Draw 1 reveal. This preserves Draw 1 exactly and makes a new Draw 2-5 game use its rule from its first visible waste state.
- Recommendation adopted: label every history row with `Draw N` and exclude non-Draw-1 entries from curated-deal solvability selection statistics. This is the smallest truthful split for the current history/statistics model.
- Terminology: `stock` is the face-down draw pile on the far right. `waste` is the
  face-up fan immediately to its left. The user-facing "top-right stack/draw area" means
  stock plus waste together.
- Auto Up with Draw 2-5: continue using the active game's stored `drawCount` for game
  rules. Draw 1 keeps the existing trigger when every tableau card is face up. Draw 2-5
  requires every tableau card to be face up and the top-right draw area to be empty,
  meaning both `stock.length` and `waste.length` are zero.

## New dependencies
None. Tamagui `ToggleGroup` and AsyncStorage are already installed.

## UX/UI Considerations
- Add the control at the top of Settings > Gameplay because it changes the core game rule.
- Use five compact, equally understandable options labeled `1` through `5`.
- Render option numbers as explicit Tamagui `Text`; raw numeric children were not
  visible in the Android ToggleGroup rendering.
- Give the selected segment a strong theme-aware fill and contrasting text.
- Place the segments inside a bordered, rounded container so the control reads as one
  deliberate setting rather than five empty cells.
- Do not wrap the complete draw-count setting in an additional Card; the Gameplay
  section already provides the necessary grouping.
- Keep one option selected with `disableDeactivation`.
- Disable the control until settings hydration finishes to avoid overwriting a persisted choice.
- Include the requested calm note immediately below the control.
- History rows receive a neutral `Draw N` badge so results are not visually mixed.
- Curated rows should not use the unqualified `Solvable` badge for Draw 2-5. Label Draw 1 curated entries as `Solvable for Draw 1`, and higher-draw curated entries as `Draw 1-solvable deal`.

## Components -> Which components to reuse, which components to create?
- Reuse the Settings Gameplay section and typography/spacing conventions.
- Create `components/settings/DrawCountSelector.tsx` as the local wrapper around Tamagui `ToggleGroup`, `Text`, `Paragraph`, and layout primitives.
- Reuse the existing history `Badge` component for draw-count and solvability-basis labels.
- Do not add raw Tamagui draw-count markup directly to the Settings screen.

## How to fetch data, how to cache
- No network data is fetched.
- Persist the global preference in the existing `@soli/settings/v1` AsyncStorage payload.
- Persist active-game `drawCount` and snapshot metadata in the existing `soli/klondike/v1` payload without resetting the key or bumping the payload version.
- Persist result `drawCount` in the existing `@soli/history/v1` history payload.
- Read-time sanitizers default missing or invalid draw counts to `1`; the next normal write stores the normalized form.

## Related tasks
- Existing settings persistence: `src/state/settings.tsx`.
- Existing active-game persistence: `src/storage/gamePersistence.ts`.
- Existing snapshot undo/redo: `src/solitaire/klondike.ts`.
- Existing game-history tracking: `src/state/history.tsx`.
- Existing Auto Up setting implementation: `docs/product/auto-up-setting/automatic-auto-up-setting.md`.
- Originating Reddit feedback requested a three-card game and explicitly accepted that
  higher-draw games may not be guaranteed solvable:
  https://old.reddit.com/r/solitaire/comments/1s42yyu/free_and_adfree_solitaire_app/ockhmye/

## Steps to implement and status of these steps
- [completed] Inspect settings, game creation, stock/recycle, undo snapshots, persistence, history/statistics, and auxiliary game modes.
- [completed] Research the existing Tamagui selector and AsyncStorage patterns; decide on no new dependencies.
- [completed] Create this detailed implementation plan before implementation.
- [completed] Add validated persisted draw-count settings and the local Tamagui selector wrapper.
- [completed] Add draw count and Draw 1 solvability-basis metadata to game state/factories/snapshots.
- [completed] Make stock draws, initial waste reveal, auto-complete, recycle, undo, and redo draw-count-aware.
- [completed] Add crash-safe active-game and snapshot migration defaults.
- [completed] Add draw-count metadata/migration to history and keep curated solvability statistics Draw 1-specific.
- [completed] Wire new-game creation to the current setting without changing active games.
- [completed] Add focused unit tests and run static checks.
- [completed] Run real-environment verification through a GPT-5.5 medium testing sub-agent.
- [completed] Record final files, issues, and test results in this plan.
- [completed] Review the Android screenshots and originating Reddit feedback.
- [completed] Document the follow-up decision and implementation approach.
- [completed] Restore a fixed three-card waste fan.
- [completed] Improve the Android draw-count selector contrast and labels.
- [completed] Rerun automated checks.
- [completed] Kill the stale Android build, run a clean release build, confirm installation,
  and verify the updated UI/game on the connected device through a testing sub-agent.
- [completed] Record follow-up files and test results.
- [completed] Review the second Android screenshot and append the follow-up prompt.
- [completed] Remove the outer draw-count settings Card while retaining the compact
  bordered selector.
- [completed] Trace Auto Up scheduling and variable-draw behavior and document the
  recommended trigger semantics.
- [completed] Run focused static and unit checks for the flattened setting.
- [completed] Record the second follow-up test results.
- [completed] Append the 2026-06-11 follow-up prompt and clarify that only the number
  selector boundary remains in source.
- [completed] Initially require an empty stock before Auto Up starts for Draw 2-5 while
  preserving the existing Draw 1 trigger. Superseded by the top-right draw-area
  clarification below.
- [completed] Add focused trigger tests and run static/unit verification.
- [completed] Run independent real-environment verification and record the third
  follow-up results.
- [completed] Investigate the stock/waste terminology and identify the mismatch between
  code terminology and the user-facing top-right draw area.
- [completed] Change the Draw 2-5 Auto Up gate from stock-empty to stock-and-waste-empty.
- [completed] Update focused tests and record the terminology follow-up results.
- [completed] Confirm the demo game currently hardcodes Draw 1.
- [completed] Pass the selected draw count into normal demo game launches while keeping
  the scripted auto-solve path on Draw 1.
- [completed] Update demo draw-count tests and record verification.

## Plan: Files to modify
- `docs/product/draw-count-setting/solitaire-stock-draw-count.md`
- `components/settings/DrawCountSelector.tsx` (new)
- `app/history.tsx`
- `app/settings.tsx`
- `src/features/klondike/components/cards/WasteFan.tsx`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/hooks/useKlondikePersistence.ts`
- `src/features/klondike/hooks/useSolvableShuffleSelector.ts`
- `src/solitaire/drawCount.ts` (new)
- `src/solitaire/klondike.ts`
- `src/state/history.tsx`
- `src/state/settings.tsx`
- `src/storage/gamePersistence.ts`
- `test/unit/solitaire/klondike.autoMoveFallback.test.ts`
- `test/unit/solitaire/klondike.autoUpSetting.test.ts`
- `test/unit/solitaire/klondike.drawCount.test.ts` (new)
- `test/unit/state/history.drawCount.test.ts` (new)
- `test/unit/storage/gamePersistence.test.ts`

## Files actually modified
- `docs/product/draw-count-setting/solitaire-stock-draw-count.md`
- `app/history.tsx`
- `app/settings.tsx`
- `components/settings/DrawCountSelector.tsx`
- `src/features/klondike/components/cards/WasteFan.tsx`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/hooks/useKlondikePersistence.ts`
- `src/features/klondike/hooks/useSolvableShuffleSelector.ts`
- `src/solitaire/drawCount.ts`
- `src/solitaire/klondike.ts`
- `src/state/history.tsx`
- `src/state/settings.tsx`
- `src/storage/gamePersistence.ts`
- `test/unit/solitaire/klondike.autoMoveFallback.test.ts`
- `test/unit/solitaire/klondike.autoUpSetting.test.ts`
- `test/unit/solitaire/klondike.drawCount.test.ts`
- `test/unit/state/history.drawCount.test.ts`
- `test/unit/storage/gamePersistence.test.ts`

## Identified issues and status of these issues
- The current initial game factory reveals one waste card before play.
  - Status: resolved; the initial reveal now uses the new game's stored draw count while Draw 1 remains unchanged.
- Undo/redo uses full board snapshots, but snapshots currently have no rules metadata.
  - Status: resolved; snapshots store `drawCount`, and legacy snapshots inherit the normalized game count.
- Curated-history selection aggregates all plays under one solvable shuffle ID.
  - Status: resolved; only Draw 1 history influences curated Draw 1 deal-selection statistics.
- The history UI labels curated deals simply as `Solvable`.
  - Status: resolved; rows and details show `Draw N` and the Draw 1 solvability basis.
- Stock flight tracking currently tracks only one top stock card.
  - Status: verified as intentional; only the rendered top stock card has a measurable
    origin. Gating on hidden card IDs would add the flight controller's timeout to every
    Draw 2-5 action. The top card keeps the existing flight while the reducer moves the
    full group.
- Draw 4/5 initially expanded the waste fan to four/five cards and overlapped the stock.
  - Status: resolved; the fan again displays only the top three waste cards.
- The initial Android segmented control rendered blank option cells.
  - Status: resolved; render explicit Tamagui numeric text and stronger
    selected/unselected styling in the local wrapper.
- The draw-count setting introduced an extra Card inside the existing Gameplay section.
  - Status: resolved; the setting now renders directly in the section while the selector
    retains its own compact boundary.
- Auto Up currently starts whenever all tableau cards are face up and queues any
  non-empty simulated plan, even if that simulation does not reach a win.
  - Status: resolved after terminology clarification; Draw 2-5 now waits until the whole
    top-right draw area is empty, not only the face-down stock pile.
- Repo-wide `yarn format:check` reports pre-existing formatting issues in
  `scripts/run-demo-autosolve.js`, `src/animation/celebrationModes.ts`,
  `src/features/klondike/hooks/useCelebrationController.ts`, and
  `src/features/klondike/hooks/useDemoGameLauncher.ts`.
  - Status: out of scope; targeted formatting checks pass for every file modified by this feature.
- The browser automation surface could not confirm the browser-native
  “Start a new game?” dialog, which blocked an additional end-to-end Draw 5
  lifecycle/history pass.
  - Status: covered by focused reducer and persistence tests; the independent
    browser pass still verified Draw 5 settings persistence and active-game rule isolation.
- Native Android verification was initially unavailable because no device was connected.
  - Status: resolved in the follow-up; a fresh release build was installed and tested on
    the connected Nothing A065.
- Undo restores the previous stock, waste, and card order but leaves the accumulated move
  count unchanged.
  - Status: verified as existing intentional behavior by
    `test/unit/solitaire/klondike.undo.test.ts`; the Draw 5 device result matches that
    contract and is not a draw-count regression.

## Testing
- Unit: the shared settings/game/history sanitizer defaults missing or invalid
  `drawCount` values to 1 and retains values 1-5.
- Unit: game factories store the selected rule and Draw 1 solvability basis.
- Unit: normal demo factories can use a selected draw count while still defaulting to
  Draw 1.
- Unit: Draw 1 remains unchanged.
- Unit: Draw 2-5 move the correct cards in the correct order.
- Unit: a short stock moves all remaining cards without error.
- Unit: recycle restores stock order after variable-size draws.
- Unit: undo and redo/scrub restore both cards and the game's draw count.
- Unit: active-game persistence loads legacy game state and all snapshots as Draw 1.
- Unit: history normalization defaults legacy entries to Draw 1.
- Unit: curated selection statistics ignore Draw 2-5 results.
- Unit: Draw 1 Auto Up remains eligible with stock cards present.
- Unit: Draw 2-5 Auto Up waits for an empty top-right draw area; stock-empty with waste
  remaining is not enough.
- Static: run focused Jest, `yarn typecheck`, formatter check, and lint on modified files.
- Real environment: use a GPT-5.5 medium testing sub-agent. Verify the selector and note on web with the repo browser/Playwright skill, persistence across reload/restart, active-game isolation after changing the setting, Draw 2-5 stock behavior, undo, and recycle. If native verification is required by the testing sub-agent, use the `agent-device` skill and follow the clean-build requirements without overlapping builds.

Results:
- Passed locally: 35 focused Jest tests across draw behavior, undo, Auto Up,
  persistence migration, and history migration.
- Passed locally: `yarn typecheck`.
- Passed locally: targeted `oxlint`, `oxfmt --check`, and `git diff --check`.
- Passed locally: full `yarn jest --runInBand` (35 tests) and full `yarn lint`.
- Repo-wide `yarn format:check` remains red only on four unrelated pre-existing files
  listed under Identified issues.
- Passed independently through a GPT-5.5 medium testing sub-agent:
  - Draw 1 is selected on a fresh isolated web origin.
  - Settings exposes Draw 1, 2, 3, 4, and 5 directly.
  - The requested solvability note is present verbatim.
  - Draw 5 remains selected after browser reload.
  - Changing the preference to Draw 5 does not alter an active Draw 1 game:
    stock changed from 23 to 22 and move count from 0 to 1 on the next draw.
  - The web build loaded without application errors; only existing React Native
    deprecation warnings appeared.
- The independent agent also reran 22 focused tests, typecheck, targeted lint,
  and targeted formatting successfully.
- Follow-up automated checks passed: `yarn typecheck`, all 35 Jest tests, full
  `yarn lint`, targeted `oxfmt --check`, and `git diff --check`.
- Follow-up Android release verification passed through a GPT-5.5 medium testing
  sub-agent on the connected Nothing A065 (`192.168.1.12:41165`):
  - Exactly one fresh `yarn release` completed with `BUILD SUCCESSFUL`.
  - Installed package `ch.karimattia.soli` reported version `0.7.0`, version code `12`,
    and `lastUpdateTime=2026-06-06 10:35:25 CEST`.
  - Settings visibly rendered all five values, clearly highlighted Draw 4/5 selections,
    updated the selected-value caption, and kept the solvability note visible.
  - A fresh Draw 5 game started at waste/stock `5/19` while showing exactly three waste
    cards without overlap.
  - The next draw changed waste/stock to `10/14` while still showing exactly three cards
    without overlap.
  - Undo restored waste/stock to `5/19` and restored the original visible cards. The move
    count remained `1`, matching the app's existing tested accumulated-move behavior.
  - Evidence:
    `tmp/draw-count-followup/05-settings-draw4.png`,
    `tmp/draw-count-followup/06-settings-draw5-selected.png`,
    `tmp/draw-count-followup/09-draw5-initial.png`,
    `tmp/draw-count-followup/10-draw5-after-one-draw.png`, and
    `tmp/draw-count-followup/11-undo-restored.png`.
- Remaining real-environment gap: stock recycling was not reached manually on Android;
  variable-draw recycle ordering and undo remain covered by the passing reducer tests.
- Second follow-up checks passed: `yarn typecheck`, the 18 focused Draw Count and Auto Up
  tests, targeted `oxlint`, targeted `oxfmt --check`, and `git diff --check`.
- Second follow-up browser verification could not run because the Codex in-app browser
  backend was unavailable. The local Expo web server was listening on port 8081, and no
  Android device was connected on 2026-06-07. The previous Android verification remains
  valid for the selector itself; this follow-up only removes its outer Card wrapper.
- Third follow-up automated verification passed independently:
  - `yarn typecheck`.
  - 21 focused Draw Count and Auto Up tests.
  - Targeted `oxlint` and `oxfmt --check`.
  - `git diff --check`.
  - Superseded by the terminology clarification: the tests at this point confirmed only
    the face-down stock interpretation, which was too narrow.
- Third follow-up Android release verification passed on the connected Nothing A065:
  - Exactly one fresh `ADB_WIFI_TARGET=192.168.1.12:41289 yarn release` completed with
    `BUILD SUCCESSFUL in 19s`.
  - Installed package version `0.7.0` / version code `12`; the APK was built at
    `2026-06-11 13:33:51 CEST` and installed at `13:33:56 CEST`.
  - Only the bordered number selector remains; the label, selected-value caption, and
    solvability note render directly in the Gameplay section.
  - All five numbers remain visible and Draw 5 selection is clear. The stock-only Auto
    Up interpretation from this build was superseded by the later terminology
    clarification.
  - Evidence:
    `tmp/draw-count-followup-20260611/01-launch.png`,
    `tmp/draw-count-followup-20260611/05-selection-attempt.png`, and
    `tmp/draw-count-followup-20260611/06-draw1-restored.png`.
- Terminology follow-up checks passed:
  - `yarn typecheck`.
  - 22 focused Draw Count and Auto Up tests.
  - Targeted `oxlint` and `oxfmt --check`.
  - `git diff --check`.
  - Read-only verification by a testing sub-agent passed the same checks.
  - The updated tests confirm Draw 1 remains eligible with stock cards present, Draw 2-5
    does not start with stock cards present, Draw 2-5 does not start after a final draw
    if waste remains, and Draw 2-5 can start after the last waste card leaves the
    top-right draw area.
- Demo draw-count follow-up checks passed:
  - `yarn typecheck`.
  - 23 focused Draw Count and Auto Up tests.
  - Targeted `oxlint` and `oxfmt --check`.
  - `git diff --check`.
  - Read-only verification by a testing sub-agent passed the same checks.
  - The demo factory still defaults to Draw 1, can create Draw 4 with four visible waste
    cards and six remaining stock cards, normal demo launches receive the selected
    setting, and hidden `autoSolve` demo launches stay Draw 1.
