# Auto Up Win Handoff [28-2] End-of-auto-up jitter + Android demo automation

## Description

Follow up on `28-2` to remove the small end-of-auto-up jitter that can happen right before the win celebration starts, and repair the Android demo automation so `yarn demo:auto-solve` reliably reproduces the winning auto-up path on a connected device.

This work is scoped to the final win handoff and the demo automation path only. It must not retune unrelated board animations or expand the release tooling beyond what the demo runner needs.

## Acceptance Criteria

- The win celebration does not start until the final winning card has visually settled onto its foundation pile.
- When foundation glow is enabled, the celebration begins only after the last visible glow tail for the winning card has finished.
- The last yellow foundation flash never overlaps with the initial celebration breakout.
- The board does not visibly reconfigure during the pending win-handoff window just because `hasWon` became `true`.
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

## Open questions to the user incl. recommendations

- None currently blocking.

## New dependencies

- None.

## UX/UI Considerations

- The last winning move should feel complete before the celebration starts.
- The board should not “jump” or clean itself up while the last card is still arriving.
- The Android demo flow should stay narrow and predictable: build, install, launch the demo URI, and wait for completion or a precise failure.

## Components

- Reuse [useCelebrationController.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/hooks/useCelebrationController.ts) for celebration lifecycle ownership.
- Reuse [animations.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/animations.ts) for card-flight completion wiring.
- Reuse [CardView.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/CardView.tsx), [FoundationPile.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/FoundationPile.tsx), and [TopRow.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/TopRow.tsx) for the board-side handoff path.
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
- [completed] Repair `yarn demo:auto-solve` so it matches the release signing path and current demo logs.
- [completed] Run static checks and Android device validation, then update task documentation with results.

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
- [useCelebrationController.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/hooks/useCelebrationController.ts)
- [useKlondikeGame.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/hooks/useKlondikeGame.ts)
- [useDemoGameLauncher.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/hooks/useDemoGameLauncher.ts)
- [run-demo-autosolve.js](/Users/karim/kDrive/Code/soli/scripts/run-demo-autosolve.js)

## Identified issues and status of these issues

- The win celebration handoff is currently time-based, not tied to the actual last winning card settling.
  Status: confirmed.
- The board uses raw `state.hasWon` for some top-row cleanup, which can cause visible churn before the celebration visually begins.
  Status: confirmed.
- The foundation glow callback exists but fires when the top card changes, not when the flight completes.
  Status: confirmed and mitigated by waiting for the winning-card settle signal and computing the remaining handoff delay from the queued timestamp.
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
- Result:
  - `yarn exec tsc --noEmit` passed.
  - `yarn lint` passed.
  - `yarn demo:auto-solve` on the connected Android device built and installed the release APK, launched `soli:///?demo=autosolve`, auto-solved the demo game, detected foundations-complete, waited through celebration start, and restored the device screen timeout to `120000`.
