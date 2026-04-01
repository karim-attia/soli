# Auto Up Win Handoff [28-2] End-of-auto-up jitter + outline fade + win-boundary JS deferral + Android demo automation

## Description

Follow up on `28-2` to remove the small end-of-auto-up jitter that can happen right before the win celebration starts, smooth out the empty-board outline cleanup that can read as a lag spike during the celebration handoff, defer non-visual win bookkeeping away from the exact `hasWon` frame so the final winning card has less JS-thread contention, and repair the Android demo automation so `yarn demo:auto-solve` reliably reproduces the winning auto-up path on a connected device.

This work is scoped to the final win handoff and the demo automation path only. It must not retune unrelated board animations or expand the release tooling beyond what the demo runner needs.

## Acceptance Criteria

- The win celebration does not start until the final winning card has visually settled onto its foundation pile.
- When foundation glow is enabled, the celebration begins only after the last visible glow tail for the winning card has finished.
- The last yellow foundation flash never overlaps with the initial celebration breakout.
- The board does not visibly reconfigure during the pending win-handoff window just because `hasWon` became `true`.
- Empty tableau outlines do not disappear in one frame at celebration start; they fade smoothly once the visual win cleanup begins.
- The follow-up investigation records whether the perceived lag is actual blocking work or abrupt board churn, with a code-backed conclusion.
- Non-visual win bookkeeping does not run on the exact `hasWon` edge when celebration handoff is active; it is deferred until the winning move’s visual handoff has completed.
- `yarn demo:auto-solve` builds and installs a release APK using the same signing assumptions as the normal Android release flow.
- `yarn demo:auto-solve` no longer waits for stale demo-log tokens that the app does not emit.
- If the demo APK signing still does not match the installed app, the script fails with a targeted diagnostic instead of trying to recover by uninstalling the app.

## Design links

- None currently.

## Possible approaches incl. pros and cons

### 1. Keep the current fixed timeout and just increase it

Pros:
- Small code change
- Low risk of wiring bugs

Cons:
- Still guesses instead of reacting to the actual final card animation
- Can remain wrong on slow frames or future timing changes
- Does not explain or remove the visible pending-window churn

### 2. Start celebration from the foundation glow callback

Pros:
- Reuses an existing callback path
- Simpler than wiring a new card-flight completion signal

Cons:
- The glow callback fires when the top card changes, not when the flight settles
- Still allows the celebration to race the last movement on slower frames

### 3. Use an event-driven winning-card handoff plus a guarded fallback

Pros:
- Ties celebration start to the actual last winning card settling on-screen
- Keeps a timeout fallback so wins cannot deadlock if an event is missed
- Lets the board stay visually stable during the pending handoff window

Cons:
- Requires plumbing a new internal callback through the card/foundation path
- Needs careful handling for glow timing and non-flight fallback cases

Recommended:
- Approach 3.

### 4. Keep empty outlines mounted and animate them out on the UI thread

Pros:
- Removes the abrupt all-at-once unmount that can read as a hitch
- Avoids extra layout churn during the celebration boundary because the slots stay mounted
- Fits cleanly into the existing Reanimated timing approach

Cons:
- Requires the board cleanup logic to distinguish “pending win” from “visual cleanup active”
- Adds a small amount of animation state to a previously static component

Recommended:
- Pair this with Approach 3.

### 5. Defer heavy win-only JS work until the visual handoff starts

Pros:
- Reduces JS-thread contention during the exact frame window where the last winning card measures and begins its destination flight
- Keeps the visual last-card move closer to a normal foundation move
- Preserves the event-driven handoff while moving result recording and celebration-state assembly later

Cons:
- Introduces more lifecycle coordination between `useKlondikeGame` and `useCelebrationController`
- Needs careful fallback behavior so solved games still get recorded when celebration cannot start

Recommended:
- Pair this with Approach 3 instead of reverting to timeout-only handoff.

## Open questions to the user incl. recommendations

- None currently blocking.

## New dependencies

- None.

## UX/UI Considerations

- The last winning move should feel complete before the celebration starts.
- The board should not “jump” or clean itself up while the last card is still arriving.
- The empty tableau slots should dissolve quietly into the celebration instead of popping out all at once.
- The final auto-up move should not feel uniquely sticky just because solved-game bookkeeping happened at the same moment.
- The Android demo flow should stay narrow and predictable: build, install, launch the demo URI, and wait for completion or a precise failure.

## Components

- Reuse [useCelebrationController.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/hooks/useCelebrationController.ts) for celebration lifecycle ownership.
- Reuse [animations.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/animations.ts) for card-flight completion wiring.
- Reuse [CardView.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/CardView.tsx), [FoundationPile.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/FoundationPile.tsx), [TopRow.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/TopRow.tsx), and [TableauSection.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/TableauSection.tsx) for the board-side handoff path.
- Reuse [useKlondikeGame.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/hooks/useKlondikeGame.ts) to connect the celebration controller to the board props.
- Reuse [run-demo-autosolve.js](/Users/karim/kDrive/Code/soli/scripts/run-demo-autosolve.js) and [run-android-release.sh](/Users/karim/kDrive/Code/soli/run-android-release.sh) for the Android demo/release path alignment.

## How to fetch data, how to cache

- No remote data fetching.
- The demo runner reads local environment configuration from `.env` and process env only.
- The game state and animation state continue to use the existing in-memory/react state flow.

## Related tasks

- [28-2.md](/Users/karim/kDrive/Code/soli/docs/delivery/28/28-2.md)
- [tasks.md](/Users/karim/kDrive/Code/soli/docs/delivery/28/tasks.md)

## Steps to implement and status of these steps

- [completed] Review the current `28-2` handoff behavior, board cleanup triggers, and Android demo automation path.
- [completed] Document the follow-up implementation plan under `docs/product`.
- [completed] Replace the fixed win handoff with an event-driven winning-card settle signal plus guarded fallback timing.
- [completed] Keep the board visually stable during the pending win-handoff window.
- [completed] Investigate the perceived end-of-auto-up lag and confirm the empty-outline cleanup is abrupt render churn, not a separate heavy blocking task.
- [completed] Fade empty board outlines out smoothly during the visual win cleanup.
- [completed] Defer non-visual win bookkeeping away from the exact `hasWon` frame while preserving the existing handoff fallback behavior.
- [completed] Repair `yarn demo:auto-solve` so it matches the release signing path and current demo logs.
- [completed] Run static checks and Android device validation for the win-boundary JS deferral follow-up, then update task documentation with results.

## Plan: Files to modify

- [28-2.md](/Users/karim/kDrive/Code/soli/docs/delivery/28/28-2.md)
- [tasks.md](/Users/karim/kDrive/Code/soli/docs/delivery/28/tasks.md)
- [28-2-end-of-auto-up-jitter.md](/Users/karim/kDrive/Code/soli/docs/product/auto-up-win-handoff/28-2-end-of-auto-up-jitter.md)
- [constants.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/constants.ts)
- [types.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/types.ts)
- [useCelebrationController.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/hooks/useCelebrationController.ts)
- [useKlondikeGame.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/hooks/useKlondikeGame.ts)
- [animations.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/animations.ts)
- [CardView.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/CardView.tsx)
- [FoundationPile.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/FoundationPile.tsx)
- [TopRow.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/TopRow.tsx)
- [TableauSection.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/TableauSection.tsx)
- [run-demo-autosolve.js](/Users/karim/kDrive/Code/soli/scripts/run-demo-autosolve.js)

## Files actually modified

- [28-2-end-of-auto-up-jitter.md](/Users/karim/kDrive/Code/soli/docs/product/auto-up-win-handoff/28-2-end-of-auto-up-jitter.md)
- [28-2.md](/Users/karim/kDrive/Code/soli/docs/delivery/28/28-2.md)
- [tasks.md](/Users/karim/kDrive/Code/soli/docs/delivery/28/tasks.md)
- [constants.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/constants.ts)
- [animations.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/animations.ts)
- [CardView.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/CardView.tsx)
- [FoundationPile.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/FoundationPile.tsx)
- [TopRow.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/TopRow.tsx)
- [TableauSection.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/TableauSection.tsx)
- [useCelebrationController.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/hooks/useCelebrationController.ts)
- [useKlondikeGame.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/hooks/useKlondikeGame.ts)
- [useDemoGameLauncher.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/hooks/useDemoGameLauncher.ts)
- [run-demo-autosolve.js](/Users/karim/kDrive/Code/soli/scripts/run-demo-autosolve.js)

## Identified issues and status of these issues

- The win celebration handoff previously depended only on fixed timing, which let the celebration overlap the final foundation arrival on slower frames.
  Status: mitigated by winning-card settle tracking, with the remaining fallback race called out separately below.
- The board uses raw `state.hasWon` for some top-row cleanup, which can cause visible churn before the celebration visually begins.
  Status: confirmed and mitigated by holding win cleanup behind the pending-handoff state instead of flipping the board immediately.
- The tableau empty-slot cleanup still removes all empty outlines in one render commit when the win visual phase starts, which can read like a lag spike even without a separate blocking task.
  Status: confirmed and fixed by keeping the slots mounted through the handoff and fading them out on the UI thread.
- The foundation glow callback exists but fires when the top card changes, not when the flight completes.
  Status: confirmed and mitigated by waiting for the winning-card settle signal and computing the remaining handoff delay from the queued timestamp.
- The final winning move is also the only move that immediately triggers solved-game bookkeeping and celebration-state assembly on the JS thread, which can compete with the last-card destination-measure/flight window.
  Status: confirmed and mitigated by deferring solved-result recording until the visual handoff starts and building the celebration payload lazily when celebration actually begins.
- The guarded fallback timeout still reaches the same absolute handoff deadline as the settle-driven path, so on some runs the fallback can still win the final start race even though the winning card already settled first.
  Status: still observed in the 2026-04-01 Android emulator capture; treat as a separate follow-up if we want the settle event to become the authoritative start path.
- `yarn demo:auto-solve` waits for `[Demo] Auto sequence started`, but the app emits `[Demo] Auto sequence queued ...` and `[Demo] Auto sequence completed dispatch queue.` instead.
  Status: fixed.
- `yarn demo:auto-solve` does not currently load the release signing env from `.env`, which can produce a signature mismatch against the installed release app.
  Status: fixed.
- The Android demo deep link lost the auto-solve intent when it used multiple query params, because the launch path only needed a single `demo=autosolve` flag.
  Status: fixed.
- The in-app demo auto-solve queue used stale tableau indices and wrong suit/column mappings, so the demo stalled before a real win.
  Status: fixed.

## Testing

- Static:
  - `yarn exec tsc --noEmit`
  - `yarn lint`
- Android:
  - `yarn android`
  - `yarn demo:auto-solve`
  - Inspect the connected device flow and confirm the last winning card settles before celebration start.
- Device logs:
  - Review the developer-gated handoff logs to confirm winning-card selection, flight settle, queued handoff, and actual celebration start ordering.
- Visual:
  - Confirm the empty tableau outlines fade away smoothly after the celebration boundary instead of disappearing in a single frame.
- Endgame responsiveness:
  - Confirm the last winning card no longer appears uniquely slow or sticky compared with earlier auto-up foundation moves.
- Result:
  - `yarn exec tsc --noEmit` passed.
  - `yarn lint` passed.
  - `yarn android` built successfully and launched the Android emulator, then hit the expected debug-vs-release install mismatch (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`) against the already-installed release package.
  - `yarn demo:auto-solve` on `emulator-5554` built and installed the release APK, launched `soli:///?demo=autosolve`, auto-solved the demo game, and waited through celebration start.
  - Android logcat on 2026-04-01 captured the updated handoff ordering at `10:38:51.266` queued / `10:38:51.475` winning-card settled / `10:38:51.594` celebration start.
  - The winning-card settle happened `209ms` after queue in that capture, which is earlier than the older physical-device capture we had documented for this path.
  - The same capture still logged `fallback_timeout_reached` at `10:38:51.593`, so this follow-up reduced exact-win-frame JS contention but did not yet make the settle-driven path fully authoritative.
