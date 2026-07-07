# Game History Performance Fabric View Retention Root Fix

## Commit note

This document is kept with the absolute card layer commit as the investigation trail. It records the Fabric/stable-id/timer hypotheses and the A/B runs that narrowed the issue toward active card animation ownership. The staged code commit intentionally does not include the stable card ID, timer isolation, or detailed diagnostics experiments described here; those remain separate follow-up decisions.

## User prompt

```text
I don't fully know and understand what fabric means, but please implement your recommendations to fix the memory issue at the root cause. Thank you.
```

```text
i don't want to spend another 20min playing games. how can we keep this short? now game is in relatively fresh state. directly implement timer tick fix? in such a way that when leaving the game and coming back, the game timer continues at the same time?
or would you recommend playing games, do we not have enough evidence?
```

```text
ok implement. also happy to try after the fix.
```

```text
unfortunately, the performance issues are still here.
created way to automatically run demo games in separate thread.
ran this, app is in that state, you can check the data now.
next recommended steps?
```

```text
Run this. Do it with 10 games each, though, so it's faster.
```

```text
Hey, I'm open to the idea of the board update model. However, this doesn't explain that the memory gets overloaded over multiple games because the kind of move memory board should fully clear when you start a new game, right? Do we actually do clear when we start a new game or do we amass that memory board over multiple games as well? Is there a way to consciously clear that memory board when we start a new game? Thank you.
```

```text
I think we were discussing before at some point whether sometimes the game is sluggish and then restarting the same game really makes it fast again. Please check with ADB the current game. Right now it's really sluggish. Please log the data and then restart the game and then log the data again and check whether the history is still here so we have proof for this. Thank you.
```

```text
Search the web for hints and go through the package JSON and see, check all the libraries and like the dependencies and check if there's potentially an issue with them, whether are other people encountering this or similar ones. Do this for each and every dependency and really go wide, brainstorm some things that could be happening, some upgrades that we could do, some other kind of, yeah, everything that you could do with like an online research. Thank you.
```

```text
https://docs.swmansion.com/react-native-reanimated/docs/guides/performance
Read this.
Research web and codebase and make detailed analysis of what we could do in the scenario of sticking to Reanimated.
Make table of which versions in dependencies go together.
```

```text
The game feels now fast, and the memory issue is fixed. That sounds amazing. I guess that there's even a negative delta. I guess that's a bit random, but that sounds good and interesting. However, the animations are now pretty broken, to be honest. For example, what I see is that the wiggle move, like the wiggle on an invalid move, doesn't work anymore at all. And when having a flight, for example, moving a card from one column to the other, I see that it kind of first immediately quickly flashes at the new location, and then jumps back, and only then starts the flight. Also, I'm not 100% sure, but I have a feeling that the flight is not super smooth. I'm not sure about the frames, the frame rate in a flight. And also, drawing a card from the stock seems to give a flicker as well, maybe that same flight issue as well. Also, it seems like when turning a card, the turning card animation also doesn't work at all at the moment. Please have a look at that. So, yeah, overall the animations are quite broken. I can't release it like this, but I guess it's super valuable progress in the sense of we seem to know what the root cause is, what's going on. I'm sure you noted this. Please prepare the next steps for a super smooth animation architecture. I'm sure there are kind of a bunch of possibilities out there to manage this super smoothly. And yeah, I appreciate also that we have a way of measuring this kind of in a loop, so we can just run the 10 games to see the performance. This is actually great. I like this very much. Please figure out how you can kind of independently test yourself how smooth these animations are, kind of a similar way of this, so that we end up with super smooth animations. Thank you.
```

## Description

Implement the fix direction from the Android memory dump analysis: reduce repeated native view churn at new-game boundaries and stop unnecessary timer-only persistence writes. The high-memory HPROF points through React Native Fabric's `SurfaceMountingManager.tagToViewState`, meaning the native renderer is retaining many old React Native view records after repeated games. "Fabric" here is React Native's renderer that turns React elements such as `View` and `Text` into native Android views.

## Framing context

The previous keyed game-session boundary was a valid React cleanup experiment, but phone data showed it did not stop the Android memory slope and introduced a brief small-board layout flash. Restarting the app with huge completed history is fast, so completed history size should not be reduced as a workaround. React docs recommend stable keys for identity, and React Native/Expo docs make the New Architecture/Fabric the current runtime for this SDK, so the fix should cooperate with Fabric instead of trying to disable it.

## Acceptance Criteria

- Starting a new game no longer remounts the full `KlondikeGameSession`.
- Board layout metrics survive the new-game boundary, avoiding the temporary small board.
- Card identity is stable by logical card (`suit-rank`) instead of adding a per-deal suffix.
- Animation, face-up rendering, invalid wiggle, and flight shared values are explicitly reset at the deal boundary so stable card identity does not leak visual state.
- Pure running timer ticks stop writing the full active game payload every second.
- Pure running timer ticks stop dispatching full `GameState` updates every second.
- The visible time badge still advances while a game is running.
- Loading a saved running timer still resumes with elapsed time included from the saved `timerStartedAt`.
- Leaving the game screen or backgrounding the app still pauses with the elapsed wall-clock delta included.
- Existing saved games with old suffixed card ids are normalized on load.
- Completed history retention remains unchanged.

## Design links

- React list keys and stable identity: https://react.dev/learn/rendering-lists
- React state preservation/reset by tree position: https://react.dev/learn/preserving-and-resetting-state
- React Native render pipeline: https://reactnative.dev/architecture/render-pipeline
- React Native Fabric renderer: https://reactnative.dev/architecture/fabric-renderer
- Expo New Architecture guide: https://docs.expo.dev/guides/new-architecture/

## Possible approaches incl. pros and cons

### Keep the keyed session boundary and carry board layout across it

Pros:

- Preserves the previous cleanup model.
- Small change for the visual layout flash.

Cons:

- The memory dump suggests the repeated native subtree churn itself is the problem.
- It would keep generating large numbers of old native view records.

### Disable Fabric/New Architecture

Pros:

- Could prove whether Fabric retention is specific to the current renderer.

Cons:

- Expo SDK 56 uses the New Architecture path; current Expo docs describe disabling it only for older SDKs.
- Avoids the app-level churn instead of fixing it.

### Keep the screen mounted, use stable card identity, reset animation state explicitly

Pros:

- Directly reduces new native view churn at the deal boundary.
- Matches React key guidance.
- Fixes the small-board flash because board layout state stays mounted.
- Keeps completed history unchanged.

Cons:

- Requires careful explicit animation reset to avoid stale face-up/flight state.
- Cards that move between parent piles can still remount; this is a reduction, not a full absolute-card-layer rewrite.

Recommendation: implement the stable identity plus explicit reset approach now, and leave the more invasive absolute-card-layer rewrite only if measurements still show a slope.

## Open questions to the user

- Should the next phone round use the same "play until it feels sluggish" protocol? Recommendation: yes, because the metric we need is whether PSS/native heap and Fabric retained view counts plateau across repeated deals.

## Dependencies

No new runtime dependencies.

Package/docs consulted:

- React docs for stable keys and state reset.
- React Native architecture docs for Fabric/render pipeline.
- Expo New Architecture guide for current SDK constraints.
- Android heap dump, native allocation, and jank profiling docs for the next investigation pass.
- Perfetto heapprofd docs for callstack-based native allocation attribution.

## UX/UI Considerations

The user should see no gameplay change except that New Game should no longer briefly render a small board. Card animations may feel slightly less dramatic at the exact new-game boundary because we intentionally avoid carrying previous-deal flight origins.

## Components

Reuse existing components:

- `KlondikeGameSession`
- `KlondikeGameView`
- `TopRow`
- `TableauSection`
- `FoundationPile`
- `WasteFan`
- `StockStack`
- `CardView`

No new UI components.

## How to fetch data, how to cache

No new data fetching. Persistence still uses AsyncStorage for the active game and SQLite-backed history for completed/active history. Timer persistence changes from every tick to board/timer-boundary saves, with elapsed time recovered from the saved running timestamp on load.

## Related tasks

- `docs/product/game-history-performance/native-memory-attribution-profiling.md`
- `docs/product/game-history-performance/persistent-memory-observability-next-pass.md`
- `scripts/collect-android-slowdown-sample.sh`

## Simplification ideas

- Remove the now-counterproductive session remount handoff and its extra props.
- Remove per-deal card id suffix generation.
- Keep the timer persistence fix small: change the skip predicate and load-time elapsed computation instead of introducing a new persistence scheduler.

## Steps to implement

- [completed] Remove keyed `KlondikeGameSession` remount and deal new games in-place.
- [completed] Change card ids to stable logical identity and normalize old saved suffixed ids.
- [completed] Add an explicit deal-boundary animation reset token through the card components.
- [completed] Fix timer-only persistence skipping while preserving resume elapsed time.
- [completed] Update diagnostic comments/log fields around the deal boundary.
- [completed] Run unit/type checks and Android release build/install.
- [completed] Update this plan with files modified, identified issues, and test results.
- [completed] Implement the timer-isolation A/B: keep timer persistence semantics but stop per-second reducer dispatches.
- [completed] Add focused reducer/persistence assertions for running timer wall-clock semantics.
- [completed] Run focused tests, typecheck, lint, and Android release install for user testing.
- [completed] Research every package dependency for known Android/native/Fabric/Hermes memory or slowdown issues and document upgrade/mitigation ideas.
- [completed] Add dev-only Worklets/Reanimated runtime diagnostics so the next short playlist run can test the upstream `__remoteFunctionRegistry` leak hypothesis.
- [blocked-candidate] Run the `react-native-reanimated@4.5.0` / `react-native-worklets@0.10.x` fix candidate through the same 10-game memory harness. The pair passes JS checks, but Android release build fails under Expo SDK 56 because `expo-modules-core@56.0.17` only declares Worklets `^0.7.4 || ^0.8.0` support and its native build still points at a missing Worklets `0.10.0` prefab library path.
- [completed] Refresh the Reanimated-preserving analysis against the current official performance guide, compatibility table, npm peer ranges, and Soli's current animation surfaces.

## Plan: Files to modify

- `app/(tabs)/index.tsx`
- `src/features/klondike/components/KlondikeGameSession.tsx`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/solitaire/klondike.ts`
- `src/storage/gamePersistence.ts`
- `src/features/klondike/hooks/useKlondikePersistence.ts`
- `src/features/klondike/hooks/useKlondikeTimer.ts`
- `src/features/klondike/components/StatisticsHud.tsx`
- `src/features/klondike/components/cards/CardView.tsx`
- `src/features/klondike/components/cards/animations.ts`
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx`
- `src/features/klondike/components/cards/TopRow.tsx`
- `src/features/klondike/components/cards/TableauSection.tsx`
- `src/features/klondike/components/cards/FoundationPile.tsx`
- `src/features/klondike/components/cards/WasteFan.tsx`
- `src/features/klondike/components/cards/StockStack.tsx`
- Relevant unit tests if needed.

## Files actually modified

- `app/(tabs)/index.tsx`
- `src/features/klondike/components/KlondikeGameSession.tsx`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/solitaire/klondike.ts`
- `src/storage/gamePersistence.ts`
- `src/features/klondike/hooks/useKlondikePersistence.ts`
- `src/features/klondike/hooks/useKlondikeTimer.ts`
- `src/features/klondike/components/StatisticsHud.tsx`
- `src/features/klondike/components/cards/CardView.tsx`
- `src/features/klondike/components/cards/animations.ts`
- `src/features/klondike/components/cards/TopRow.tsx`
- `src/features/klondike/components/cards/TableauSection.tsx`
- `src/features/klondike/components/cards/FoundationPile.tsx`
- `src/features/klondike/components/cards/WasteFan.tsx`
- `src/features/klondike/components/cards/StockStack.tsx`
- `src/features/klondike/hooks/useDemoGameLauncher.ts`
- `src/utils/perfDiagnostics.ts`
- `src/utils/reanimatedRuntimeDiagnostics.ts`
- `scripts/run-demo-autosolve.js`
- `test/unit/storage/gamePersistence.test.ts`
- `test/unit/solitaire/klondike.timer.test.ts`
- `test/unit/utils/reanimatedRuntimeDiagnostics.test.ts`
- `tmp/android-smoke/timer-isolation-installed.png`
- `tmp/android-smoke/timer-isolation-tick-check.png`
- `docs/product/game-history-performance/fabric-view-retention-root-fix.md`
- `docs/external-package-guides/react-native-reanimated.md`

## Intermediary learnings

- A valid A/B needs an explicit effective-config log after settings hydration. The first card-flight-off run passed `cardFlights=0` in the deep link, but the effective runtime still kept card flights on.
- Active persistence can be disabled for an experiment without touching completed history; doing so removed active writes but did not remove the large native/unknown memory end state.
- End-of-run memory captures are useful, but insufficient. The next automation should capture memory after each completed playlist game so we can see whether growth is linear, stepwise, or tied to win celebration.
- Wireless ADB can drop mid-run, so each variant should produce incremental artifacts during the run instead of relying only on the final sample collection.

## Identified issues

> Resolution note (2026-07-07, Karim): the long-session slowdown/memory growth
> tracked by the `[resolved 2026-07-07]` items below was fixed by the absolute
> card layer refactor (commit 022c081, "absolute card layer -> no more memory
> issues and lags after 10 games"). 20–100-game sessions are smooth now. The
> original `[still-open]` text is kept unchanged as history.

- [fixed-in-code] Fabric retains old native view states after repeated game-boundary churn: removed full-session remount and per-deal card ids.
- [fixed-in-code] The keyed boundary causes a temporary board metric fallback and visible small-board flash: board state now stays mounted across New Game.
- [fixed-in-code] Pure running-timer updates are not persisted as full active-game writes; this is now mostly defensive because the visual clock no longer dispatches through `GameState`.
- [fixed-in-code] Old saved games may contain per-deal card ids that need normalization: load path normalizes logical card ids.
- [resolved 2026-07-07] The user still reproduced sluggishness after the root-fix build. The 2026-06-24 post-fix sample shows the app process at about `1,010 MB` total PSS with `327 MB` Native Heap PSS and `278 MB` Unknown PSS, while Java heap, SQLite, GPU memory, and currently attached views are not large enough to explain the issue.
- [resolved 2026-07-07] The post-fix sample's visible view tree is normal-sized: `371` Android `Views`, `363` attached views, and about `693 KB` of render nodes. That means the previous Fabric view-state hypothesis is incomplete or no longer the dominant owner in the installed release build.
- [resolved 2026-07-07] The current post-fix persisted log session `mqs7lol8-l8inn5` reached game index `2` before the sluggish capture. Timer-only persistence skipping worked (`skippedWriteCount=337`) and flight keys are stable logical card ids (`spades-11`, `clubs-6`, etc.), so the previous fix landed but did not eliminate the slowdown.
- [resolved 2026-07-07] Event-loop health worsened across games in the same process: game `1` had event-loop drift about p50 `189 ms` / p90 `295 ms`; game `2` rose to p50 `577 ms` / p90 `823 ms` / p99 `890 ms`. Persistence writes in game `2` were only p50 `42 ms` / p90 `80 ms`, so writes contribute but do not fully explain the roughly one-second stalls.
- [implemented-a-b] The remaining one-second cadence pointed at the running timer path. The visual clock now ticks locally in `StatisticsHud`, while `useKlondikeTimer` only records start/stop boundaries. This preserves resume semantics without waking the full game reducer every second.
- [fixed-in-code] Timer display ticking is now isolated to the small statistics badge; the game reducer records only timer start/stop boundaries. `TIMER_STOP` still folds elapsed wall-clock time into `elapsedMs`, and persisted running timers still recover elapsed time on load.
- [verified-workaround] `yarn release` assembled the release APK successfully, then Expo hit `EMFILE: too many open files, watch` before completing its own install step. Installed the generated APK directly with ADB instead.
- [not-blocking] ADB screenshots intermittently went black because the phone display returned to dozing during manual tap smoke tests. The app package remained foregrounded/alive, and a post-unlock screenshot verified the release UI rendered.
- [a-b-invalid] The first `cardFlights=false` variants did not actually disable card-flight work after cold start. Evidence: `flight.wait.summary` remained `immediate-ready`, not `immediate-disabled`, and `cards.summary` still reported thousands of `flightStarted` events.
- [a-b-valid] Corrected `cardFlights=false` variants were captured after pre-saving card flights off. Evidence: `flight.wait.summary` changed to `immediate-disabled` and `cards.summary` reported `0` `flightStarted` events.
- [a-b-valid] The `persistence=false` variants did disable active persistence writes during the playlist. Evidence: filtered perf logs had `0` `persistence.write.duration` events for the playlist games and `skip-dev-disabled` summaries.
- [resolved 2026-07-07] Disabling active persistence and card-flight movement did not stop the large native/unknown memory end state or late-game slowdown. The root cause is still outside completed history, active-game persistence, and normal card-flight movement alone.
- [recovered] ADB dropped offline during the first corrected card-flight-off rerun, then reappeared. The corrected `flights-off-corrected-10x` and `both-off-corrected-10x` samples were rerun and captured.
- [a-b-invalid] The first `perf-off-10x` control was not a clean diagnostics-off sample because `perfDiagnostics=0` could be overwritten by AsyncStorage settings hydration on cold start. The deep-link handling is now hydration-safe for this flag too.
- [a-b-valid] Corrected `perf-off-corrected-10x` still grew by about `+756 MB` PSS over 10 games, with Native Heap `+389 MB` and Unknown `+357 MB`, while SoliPerf JSON output was effectively absent. The observability logger is not the memory root cause.
- [root-cause-high-confidence] The remaining common factor is active-play allocation churn in the core Klondike state update path. Disabling undo-history snapshots, visual animations, celebrations, active persistence, and perf diagnostics did not flatten the Native Heap/Unknown slope.
- [package-audit] Upstream Reanimated/Worklets reports from June 2026 are a stronger fit than the previous "animations are off, so animations are ruled out" framing. The old A/B disabled visible motion but did not remove Reanimated imports, shared values, animated styles, worklets, gestures, or `runOnJS` callback paths.
- [package-audit] `react-native-screens` still has a current Android Fabric leak report involving `SurfaceMountingManager.mTagToViewState`, but same-game restart proof and small attached-view counts make it a secondary suspect rather than a complete explanation.
- [package-audit] React Native `0.86.0` is available on npm, but Expo SDK 56 targets React Native `0.85`; do not combine RN major/minor movement with a focused memory A/B unless the goal is a full Expo SDK/canary experiment.
- [implemented] Worklets runtime diagnostics now emit `runtime.worklets.summary` with `__remoteFunctionRegistry` availability/size and Reanimated/Worklets global-presence flags. This avoids reading shared values from JS and lets the next 10-game run test the upstream registry-growth hypothesis directly.
- [blocked-candidate] `react-native-reanimated@4.5.0` plus `react-native-worklets@0.10.0` is not a drop-in Expo SDK 56 fix. After clearing generated native CMake metadata, Android release still fails in `:expo-modules-core:buildCMakeRelWithDebInfo[arm64-v8a]` because Expo Modules Core tries to link `libworklets.so` from a generated `3wf2d3h5` path that Worklets `0.10.0` did not produce. The package experiment was reverted to `react-native-reanimated@4.3.1` and `react-native-worklets@0.8.3`.

## Post-fix sample analysis: 2026-06-24 user-reported sluggishness

Sample folder:

- `tmp/perf-samples/post-fix-user-reported-20260624-$(date +%H%M%S)/user-reported-sluggish-now`

Installed package:

- `versionName=0.8.0`
- `versionCode=13`
- `lastUpdateTime=2026-06-24 17:09:31`
- `DEBUGGABLE` absent, so this is a release-like app process and cannot produce an HPROF from the current high-memory state.

Process memory:

- Total PSS: `1,010,119 KB`
- Total RSS: `814,936 KB`
- Total Swap PSS: `310,266 KB`
- Native Heap PSS: `327,215 KB`
- Unknown PSS: `278,225 KB`
- Java heap app summary: `38,520 KB`
- SQLite `RKStorage` database size: `64 KB`
- Android `Views`: `371`

Graphics:

- Total frames: `26,719`
- Janky frames: `2,701` (`10.11%`)
- p50/p90/p95/p99 frame times: `12 ms` / `17 ms` / `21 ms` / `29 ms`
- Slow UI thread frames: `2,306`
- Slow draw-command frames: `2,609`
- GPU p95/p99: `7 ms` / `9 ms`
- Skia/OpenGL GPU memory: about `57.9 MB`, with most of that purgeable stencil attachment memory.

Current post-fix app-log session:

- Session `mqs7lol8-l8inn5`
- Wall time: `2026-06-24T15:09:33Z` to `2026-06-24T15:34:41Z`
- Games: `0`, `1`, `2`
- New-game boundaries are in-place and use `dealResetKey`.
- Stable card ids are in use; no per-deal suffixes were seen in this session.
- Persistence skipped pure timer writes; max `skippedWriteCount` was `337`.

Per-game event-loop drift in that session:

- Game `0`: p50 `90 ms`, p90 `172 ms`; max includes a background/resume gap and should not be used as gameplay evidence.
- Game `1`: p50 `189 ms`, p90 `295 ms`, p95 `313 ms`, max `388 ms`.
- Game `2`: p50 `577 ms`, p90 `823 ms`, p95 `852 ms`, p99 `890 ms`, max `902 ms`.

Current interpretation:

- Completed history is still unlikely to be the direct root cause: the Java heap and SQLite storage are small, and the same huge persisted history is fast immediately after process restart.
- The previous Fabric view-retention fix did remove the obvious churn mechanisms and the small-board remount flash, but it did not stop native/unknown process memory from growing.
- The next root-cause hunt should focus on what is repeatedly allocating native/unknown memory during active play and why full-game state updates get slower as the process ages.
- The timer path is the strongest app-level A/B candidate because it still creates a whole-game state update every second even though the save is skipped. A proper fix would keep resume semantics by persisting `timerStartedAt`/timer state at boundaries, while rendering the displayed elapsed time from a small isolated timer signal instead of mutating `GameState` every second.

## Proposed next steps after failed post-fix sample

- [pending] Capture a clean release-like baseline after force-stopping and reopening the same persisted game, without clearing history. Expected proof point: memory should drop back near the fresh `~190-215 MB` PSS range while the same saved history remains present.

## 2026-06-25 automated demo playlist sample

Sample folder:

- `tmp/perf-samples/auto-demo-slow-20260625-073728/auto-demo-slow-now`

Installed package:

- `versionName=0.8.0`
- `versionCode=13`
- `lastUpdateTime=2026-06-25 07:19:15`

Process memory:

- Total PSS: `2,011,119 KB`
- Total RSS: `2,131,352 KB`
- Native Heap PSS: `1,124,581 KB`
- Unknown PSS: `783,473 KB`
- Java heap app summary: `18,460 KB`
- SQLite `RKStorage` database size: `64 KB`
- Android `Views`: `373`
- Attached view hierarchy: `365` views, about `882 KB` render nodes

Graphics/threading:

- `mqt_v_js` was the hot thread at capture time: `103% CPU`, with process RSS around `2.0G`.
- Total frames: `56,198`
- Janky frames: `7,115` (`12.66%`)
- p50/p90/p95/p99 frame times: `10 ms` / `16 ms` / `20 ms` / `93 ms`
- GPU p95/p99: `6 ms` / `11 ms`
- GPU memory was small: about `5.52 MB`, plus about `41 MB` GraphicBufferAllocator.

Playlist interpretation:

- The new automation did run `20` replay fixture games. The current app-level `gameIndex` did not show those games because the playlist loads fixtures via `HYDRATE_STATE` instead of the normal New Game boundary.
- This means future diagnostics need an explicit `playlistGameIndex`/`playlistRunId` field. Otherwise "nth game" is hidden in `[DemoPlaylist] Game X/20 loaded` dev-log lines and cannot be joined cleanly to every `[SoliPerf]` event.
- Game duration worsened strongly across the automated playlist: game 1 took about `15.7 s`, game 10 about `31.9 s`, game 19 about `60.1 s`, and game 20 about `103.8 s`.
- Persistence cost also worsened late in the run. Game 20 alone produced `235` `persistence.write.duration` events with p50 `203.9 ms`, p90 `276.4 ms`, max `996.6 ms`, and payloads around p50 `451 KB` / p95 `810 KB`.
- The playlist generated heavy animation churn throughout: about `140-175` flight requests per game, roughly `380-550` recorded flight starts per game, and hundreds of card mount/unmount/layout events per game.

Current interpretation:

- Completed history is still not the direct owner. The Java heap and SQLite database are tiny relative to process PSS, and the user can restart into the same large persisted history and get fast behavior again.
- The visible native view tree is not large. That weakens the original attached-view-retention hypothesis for the current build.
- The dominant memory is native/unknown, so Java HPROF alone is insufficient. We need native allocation attribution or Perfetto heapprofd during the short automated reproduction.
- There are likely two interacting issues:
  - Full active-game persistence is saturating the JS thread during high-action play because large active undo histories are serialized/written repeatedly.
  - Reanimated/card-flight/native runtime work is the better fit for native/unknown memory growth, especially because the demo run does thousands of flight registrations, shared-value writes, measurements, and layout-driven transitions.

Recommended next investigation steps:

- [pending] Patch diagnostics so every playlist-loaded game increments or records a dedicated `playlistGameIndex`, `playlistRunId`, planned move count, undo probe count, and current automation mode on all relevant perf events.
- [pending] Add a short automated A/B matrix with no manual play:
  - baseline: current `20`-game playlist
  - `cardFlights=false` while keeping persistence on
  - persistence writes disabled or coalesced behind a dev-only flag while keeping card flights on
  - both `cardFlights=false` and persistence disabled/coalesced
- [pending] During that A/B, capture PSS/native heap/unknown before and after each run plus the playlist timing table. If card-flights-off stops native growth, focus on Reanimated/shared-value/measure churn. If persistence-off collapses JS event-loop delay and game duration, focus on active-game save strategy.
- [pending] Capture a Perfetto heapprofd/native-allocation trace for the baseline or card-flights-on variant, because current `dumpsys meminfo` only proves the memory is native/unknown, not which native call stacks own it.
- [pending] Split persistence diagnostics into `estimate/stringify` time and `AsyncStorage.setItem` time. Current `persistence.write.duration` combines serialization and native storage work, which hides whether the JS stall is JSON, bridge/storage, or both.
- [pending] Decide fixes only after the A/B:
  - For persistence: preserve history but avoid saving the full active undo-history payload after every move; use idle/background checkpoints or an incremental active-game journal.
  - For flights: skip or coalesce card-flight work under rapid automation/auto-complete pressure, and verify card-flight/shared-value registries are not retaining old snapshots natively after reset.

## 2026-06-25 10-game automated A/B run plan

Acceptance criteria for this run:

- Each variant runs the generated playlist for `10` games, not `20`.
- The app is force-stopped between variants so runtime memory starts fresh.
- Each variant is launched with performance diagnostics enabled and a unique sample marker.
- Each perf event during the playlist carries enough context to identify the playlist run and playlist game number.
- The matrix isolates:
  - baseline: card flights on, active persistence on
  - flights-off: card flights off, active persistence on
  - persistence-off: card flights on, active persistence off
  - both-off: card flights off, active persistence off
- For each variant, capture `meminfo`, `gfxinfo`, top threads, thermal state, package metadata, and persisted app perf logs under `tmp/perf-samples/`.

Steps for this run:

- [completed] Add transient dev-only deep-link flags for card-flight and active-persistence experiment controls.
- [completed] Add playlist-game run context to perf diagnostics so the 10-game samples are easy to join.
- [completed] Extend the demo runner to pass 10-game matrix variant params without rebuilding for every variant.
- [completed] Build and install the release APK once on the connected Android device.
- [completed-with-caveat] Run the four 10-game variants sequentially and collect ADB sample folders.
- [completed-with-caveat] Parse the four sample folders into a comparison table for memory, JS/event-loop, persistence, and card-flight churn.
- [completed] Update this doc with the run outputs and recommended next fix.

2026-06-25 run output:

- Sample root: `tmp/perf-samples/demo-ab-10x-20260625-081108`
- Captured folders used for decisions: `baseline-10x`, `flights-off-corrected-10x`, `persistence-off-10x`, `both-off-corrected-10x`
- Also captured but marked invalid for card-flight conclusions: `flights-off-10x`, `both-off-10x`
- The first `flights-off-10x` and `both-off-10x` samples are not valid card-flight-off evidence. They still logged `flight.wait.summary` reason `immediate-ready` and thousands of `flightStarted` card events. Likely cause: on cold start, the deep link set `cardFlights=0` before settings hydration, then persisted settings restored `cardFlights=true`.
- Corrected card-flight-off samples were captured after pre-saving card flights off. These are the rows used in the decision table below.

10-game sample summary:

| Variant               | Valid axis                     | Total PSS | Native heap PSS | Unknown PSS | Views | JS CPU | Total playlist time | Game 1 | Game 10 | Event-loop avg / max drift | Active writes | Write p90 / max | Flight evidence   |
| --------------------- | ------------------------------ | --------: | --------------: | ----------: | ----: | -----: | ------------------: | -----: | ------: | -------------------------: | ------------: | --------------: | ----------------- |
| baseline              | baseline                       |   1352 MB |          774 MB |      469 MB |   270 |   100% |             272.3 s | 19.6 s |  40.8 s |               439 / 944 ms |            75 |    160 / 530 ms | flights active    |
| flights-off corrected | card flights off               |   1275 MB |          720 MB |      444 MB |   270 |   103% |             290.0 s | 20.9 s |  39.1 s |              396 / 1057 ms |            61 |    167 / 545 ms | `0` flight starts |
| persistence-off       | valid persistence-off          |   1253 MB |          696 MB |      460 MB |   270 |   100% |             315.4 s | 24.5 s |  38.9 s |               85 / 1092 ms |             0 |             n/a | flights active    |
| both-off corrected    | card flights + persistence off |   1334 MB |          755 MB |      458 MB |   616 |   100% |             318.2 s | 26.3 s |  37.7 s |              167 / 1169 ms |             0 |             n/a | `0` flight starts |

Per-game playlist durations:

| Variant               |   G1 |   G2 |   G3 |   G4 |   G5 |   G6 |   G7 |   G8 |   G9 |  G10 |
| --------------------- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline              | 19.6 | 17.8 | 20.6 | 22.5 | 19.2 | 25.4 | 30.0 | 30.7 | 45.6 | 40.8 |
| flights-off corrected | 20.9 | 19.0 | 20.9 | 22.7 | 20.3 | 31.0 | 34.6 | 36.4 | 45.2 | 39.1 |
| persistence-off       | 24.5 | 23.4 | 25.2 | 28.1 | 26.1 | 32.7 | 34.9 | 37.0 | 44.6 | 38.9 |
| both-off corrected    | 26.3 | 23.7 | 25.1 | 28.7 | 27.3 | 33.0 | 34.5 | 37.2 | 44.5 | 37.7 |

Interpretation:

- Active-game persistence is expensive but not the main memory root cause. Disabling active persistence eliminated active writes (`0` writes, skip summaries logged), yet the process still ended around `1.25 GB` PSS with about `696 MB` native heap and `460 MB` unknown memory.
- Card-flight movement is also not the main root cause. Corrected card-flight-off produced `0` flight starts and `immediate-disabled` flight summaries, but the process still ended around `1.28 GB` PSS with about `720 MB` native heap and late games still stretched to about `39-45 s`.
- Turning both active persistence and card-flight movement off did not collapse memory or runtime. The end sample still had `1.33 GB` total PSS and `755 MB` native heap. The `616` view count in this row is likely affected by the final win celebration still being active at sample time, so the next A/B should isolate celebration.
- The JS thread is saturated in every completed run (`mqt_v_js` around `96-100%` CPU at capture). That means the visible sluggishness is real JS/runtime pressure, not only frame rendering.
- The visible Android view count stayed small in the baseline, corrected flights-off, and persistence-off samples (`270` views), while native/unknown memory was huge. That again points away from completed history and away from a simple attached-view leak.

Next recommended steps:

- Fix the A/B plumbing before more experiments: use a transient runtime override that cannot be overwritten by settings hydration, and log an explicit `experiment.config` event after hydration with effective `cardFlights`, `celebrations`, and `activePersistence` values.
- Extend `scripts/run-demo-autosolve.js` to capture `dumpsys meminfo`, top threads, and a compact perf-log dump after every completed playlist game. End-only samples prove the process is huge, but per-game memory checkpoints will show exactly when native/unknown memory jumps.
- Run a new short `celebrations=false` variant. Celebration still runs in all current variants and may be a major native/runtime workload, especially because the high-view both-off sample was collected while the final celebration was starting.
- Capture a Perfetto heapprofd/native-allocation trace during a 10-game baseline or corrected card-flight-on/off pair. `dumpsys meminfo` proves native/unknown ownership, but not the native call stacks.

## 2026-06-25 per-game checkpoint and celebration isolation plan

Goal:

- Find whether native/unknown memory grows steadily during move playback or jumps at win/celebration boundaries.
- Verify whether turning win celebrations off materially reduces the memory slope or late-game slowdown.

Steps:

- [completed] Make animation experiment deep links hydration-safe so settings loaded from AsyncStorage cannot overwrite `cardFlights` or `celebrations` before the demo starts.
- [completed] Add a `celebrations` deep-link and runner env flag for the short A/B.
- [completed] Add runner-side per-game checkpoints after each `[DemoPlaylist] Game X/Y completed` log, capturing `meminfo`, `top -H`, and `gfxinfo` without touching app state.
- [completed] Run a 10-game `celebrations-off` sample with per-game checkpoints.
- [completed] Parse per-game checkpoint memory slope and compare against the previous corrected baseline.
- [completed] Update this doc with the root-cause implication and next fix direction.

Plan: Files to modify for this pass:

- `src/features/klondike/hooks/useKlondikeGame.ts`
- `scripts/run-demo-autosolve.js`
- `docs/product/game-history-performance/fabric-view-retention-root-fix.md`

Plan: Files to modify for this run:

- `src/utils/perfDiagnostics.ts`
- `src/features/klondike/hooks/useDemoGameLauncher.ts`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/hooks/useKlondikePersistence.ts`
- `scripts/run-demo-autosolve.js`
- `docs/product/game-history-performance/fabric-view-retention-root-fix.md`

## 2026-06-25 per-game checkpoint findings

Sample roots:

- `tmp/perf-samples/celebration-ab-10x-20260625-090000`
- `tmp/perf-samples/animation-ab-corrected-10x-20260625-092000`
- `tmp/perf-samples/perf-off-corrected-10x-20260625-100500`
- `tmp/perf-samples/no-history-10x-20260625-094500`

Per-game memory slope:

| Variant                    | Effective control                                                    | Game 1 PSS / Native / Unknown | Game 10 PSS / Native / Unknown |         10-game delta |           Final sample | Game 1 -> Game 10 duration | Key evidence                                                             |
| -------------------------- | -------------------------------------------------------------------- | ----------------------------: | -----------------------------: | --------------------: | ---------------------: | -------------------------: | ------------------------------------------------------------------------ |
| `celebrations-off`         | win celebrations off, card flights and persistence on                |            505 / 312 / 108 MB |            1185 / 657 / 437 MB | +680 / +345 / +329 MB | 1190 MB PSS, 270 views |           19.9 s -> 32.5 s | `experiment.config` effective celebrations false                         |
| `animations-off-corrected` | global animations off, card flights and celebrations effectively off |            492 / 291 / 107 MB |            1154 / 643 / 423 MB | +662 / +352 / +316 MB | 1161 MB PSS, 270 views |           24.6 s -> 37.4 s | `0` `flightStarted`; `flight.wait.summary` `immediate-disabled`          |
| `perf-off-corrected`       | performance diagnostics off                                          |            536 / 335 / 108 MB |            1292 / 724 / 465 MB | +756 / +389 / +357 MB | 1357 MB PSS, 299 views |           20.1 s -> 31.5 s | only demo/dev breadcrumbs remained; SoliPerf JSON was effectively absent |
| `no-history`               | undo-history snapshots disabled during replay                        |            529 / 327 / 113 MB |            1273 / 704 / 448 MB | +744 / +377 / +336 MB | 1303 MB PSS, 616 views |           19.7 s -> 35.1 s | `playlistRecordHistory=false`, `undoLength=0`, writes stayed tiny        |

Root-cause implication:

- The slope survives when each suspected subsystem is removed: active persistence, card-flight movement, win celebrations, all animations, performance diagnostics, and full undo-history snapshots.
- Java heap is small in the late samples, while Native Heap plus Unknown dominate. In the corrected perf-off final sample, Java heap was about `45 MB`, Native Heap about `754 MB`, and Unknown about `465 MB`.
- The visible view tree is small except when a final celebration is still active. This weakens the earlier "old attached native views" explanation as the primary owner.
- The strongest current explanation is allocation churn and native/runtime heap high-water growth from active-play updates. Each move repeatedly creates new board arrays/card objects and React state payloads; the process heap grows over time and is only fully reset by killing the app process.
- The reducer paths that still allocate heavily even with undo history disabled are `drawFromStock` in `src/solitaire/klondike.ts` and `applyMove` in the same file. Full undo snapshots in `snapshotFromState` add more churn, but the no-history run proves snapshots alone are not the root.

Recommended fix direction:

- Keep completed history untouched.
- Reduce active-play allocation pressure instead of trimming old completed games.
- Change the in-memory game representation so moves update only the touched piles/cards and preserve references for unchanged piles/cards.
- Replace full undo snapshots with a compact reversible move journal, or use sparse checkpoints plus move deltas. This keeps undo without cloning the whole board on every move.
- Validate each implementation step with the same 10-game checkpoint harness. The expected success metric is a much flatter Game 1 -> Game 10 Native Heap/Unknown slope, not just faster persistence writes.
- If we want call-stack proof before the refactor, run Perfetto heapprofd on a short baseline reproduction. The current A/B evidence is strong enough to start the reducer/allocation fix, but heapprofd would be the native allocation attribution source of truth.

## 2026-06-25 same-game restart proof

Goal:

- Capture the user-reported state while the current game feels sluggish.
- Force-stop/relaunch the app without clearing data.
- Prove whether the same visible game and persisted history/state are still present while process memory drops.

Sample root:

- `tmp/perf-samples/restart-same-game-proof-20260625-105545`

Artifacts:

- Before screenshot: `tmp/perf-samples/restart-same-game-proof-20260625-105545/screens/before.png`
- After screenshot: `tmp/perf-samples/restart-same-game-proof-20260625-105545/screens/after.png`
- Before raw sample: `tmp/perf-samples/restart-same-game-proof-20260625-105545/sluggish-before-raw`
- Before marked/log-dump sample: `tmp/perf-samples/restart-same-game-proof-20260625-105545/sluggish-before-marked`
- After raw sample: `tmp/perf-samples/restart-same-game-proof-20260625-105545/after-restart-raw`
- After marked/log-dump sample: `tmp/perf-samples/restart-same-game-proof-20260625-105545/after-restart-marked`

Before/after process memory:

| Sample                           |     PID | Total PSS |     RSS | Native Heap | Unknown | Java Heap | Views | Attached views | Notes                                   |
| -------------------------------- | ------: | --------: | ------: | ----------: | ------: | --------: | ----: | -------------: | --------------------------------------- |
| Sluggish before raw              | `32485` |   1899 MB | 2018 MB |     1031 MB |  729 MB |     55 MB |   514 |            421 | Current sluggish foreground game        |
| Sluggish before marked           | `32485` |   1842 MB | 1961 MB |     1011 MB |  729 MB |     18 MB |   514 |            421 | Same process after perf-marker/log dump |
| After force-stop/relaunch raw    | `16478` |    331 MB |  441 MB |      207 MB |   46 MB |     13 MB |   429 |            421 | Cold-started same app data              |
| After force-stop/relaunch marked | `16478` |    342 MB |  455 MB |      208 MB |   50 MB |     15 MB |   429 |            421 | Same process after perf-marker/log dump |

State/history proof:

- The before screenshot shows `130` moves, timer `3:38`, Undo available, and the current card layout.
- The after screenshot shows the same visible card layout and still `130` moves with Undo available; the timer advanced to `4:26`, which is consistent with resuming the same saved running game after process restart.
- The app package was force-stopped and relaunched only; app data was not cleared.
- The AsyncStorage SQLite database remained present at the same apparent size in `dumpsys meminfo` (`RKStorage`, `224` pages before and after), so the persistent storage/history store was not reset.
- Direct private DB inspection via `run-as ch.karimattia.soli` was blocked because this installed release package is not debuggable, so the exact active `undoLength` could not be read without adding new instrumentation or mutating the game by pressing Undo.
- This is the cleanest proof so far that the same persisted game/history can be present while the process returns from about `1.9 GB` PSS to about `331 MB` PSS after restart.

Interpretation:

- This strongly supports the hypothesis that the sluggishness is process-runtime memory pressure, not simply "large persisted history" or "same active game history exists".
- Restarting the process releases the Native Heap/Unknown high-water state while persisted game/history data survives.
- The fix should target allocations/retention inside the long-lived process during active play, while preserving completed history and active-game resume.

Earlier follow-up items retained from the previous sample:

- [pending] Run a clean ADB checkpoint series with logcat cleared: fresh process, after game 1, after game 2, after game 3/sluggish. Capture `meminfo`, `gfxinfo`, top threads, thermal state, and app persisted logs at each checkpoint. This gives the slope, not just the endpoint.
- [pending] Install a debuggable memory-dump build that includes the post-fix code, reproduce the issue, and capture Java HPROF at the sluggish point. We need to confirm whether `SurfaceMountingManager.tagToViewState` is still retaining detached view state in the current architecture or whether the large owner has moved elsewhere.
- [pending] Run a native allocation profile with Android Studio Native Allocations or Perfetto heapprofd during the fresh-to-sluggish path. The key output should be retained native allocation call stacks between snapshots, not just total PSS.
- [completed] Do one minimally invasive A/B build that disables full running-timer game-state dispatch while preserving timer start/pause/resume bookkeeping. If event-loop spikes and memory slope collapse during user testing, keep timer isolation as the root fix.
- [completed] Keep a diagnostics-off control run. The corrected `perf-off-corrected-10x` sample kept the profiler honest: SoliPerf output was effectively absent and the Native Heap/Unknown slope still reproduced.
- [pending] If timer isolation does not move the memory slope, investigate animation/native churn next: Reanimated shared values, flight snapshot registrations, measurement callbacks, and card remount/move patterns during stock/waste/tableau actions.

## 2026-06-25 dependency and package web audit

Goal:

- Go broad across every `package.json` dependency and dev dependency.
- Look specifically for Android, Hermes, Fabric/New Architecture, native heap, memory leak, long-lived screen, and slowdown signals.
- Separate high-signal package suspects from packages that are present but unlikely to explain repeated-game slowdown.

Sources and constraints:

- Package inventory came from `package.json` and installed lockfile resolution.
- Latest package versions came from `npm view` on 2026-06-25 with `NPM_CONFIG_CACHE=/tmp/soli-npm-cache` because the normal npm cache is not writable in this environment.
- `yarn expo install --check` could not complete because Expo CLI tried to write `/Users/karim/.expo/native-modules-cache/...` and hit `EPERM`; do not treat this as dependency incompatibility evidence.
- Expo's own SDK reference says SDK `56.0.0` targets React Native `0.85`, React `19.2.3`, React Native Web `0.21.0`, and Node `22.13.x`, so React Native `0.86` is a larger Expo-SDK move, not a normal patch upgrade.
- Web evidence below favors official docs, GitHub issues/PRs, and release pages over blogs.

Highest-signal findings:

- `react-native-reanimated` / `react-native-worklets` is now the strongest external package suspect. The app is on `react-native-reanimated@4.3.1` and `react-native-worklets@0.8.3`; upstream has very recent issues around RN `0.85.x`, Hermes V1, Worklets callback retention, and native memory growth. Importantly, our "animations off" A/B did not remove Reanimated hooks/imports from the process, so it does not rule this out.
- `react-native-screens` / Expo Router remains a credible secondary suspect because there is a current Android Fabric retention report involving `SurfaceMountingManager.mTagToViewState`, matching an earlier heap clue. However, the same-game restart proof and small visible view tree weaken it as the only explanation for same-screen active-play slowdown.
- `react-native-gesture-handler` has a related Android ScreenStackFragment leak report and a merged cleanup PR. Our active game uses Gesture Handler for the undo scrubber, but the upstream leak is tied to interacting with a `GestureDetector` and then navigating back, so it is less aligned with a no-navigation multi-game session.
- `AsyncStorage`, `expo-sqlite`, `expo-file-system`, and the in-app persistence/logging stack can cause JS stalls, large payload work, or file churn, but previous A/Bs showed the huge Native Heap/Unknown slope survives with active persistence and perf diagnostics disabled.
- `react-native-svg` has known filter-related memory/high-CPU issues, but Soli does not render custom filtered SVGs in the gameplay surface; usage is mostly lucide icons via Tamagui.
- Most small Expo utility modules (`constants`, `crypto`, `font`, `linking`, `splash-screen`, `status-bar`, `system-ui`, `web-browser`) are not active in repeated gameplay loops and have no matching upstream signal found in this pass.

Runtime dependency audit:

| Package                                     |                     Current | Latest seen | App usage / exposure                                              | Online signal                                                                                                                                                                                            | Current risk                                                              |
| ------------------------------------------- | --------------------------: | ----------: | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `@expo/ui`                                  |                  `~56.0.18` |   `56.0.18` | `BottomSheet` / `RNHostView` wrapper for demo/history sheets.     | No direct matching memory leak found in this pass.                                                                                                                                                       | Low for active gameplay; only sheet surfaces.                             |
| `@react-native-async-storage/async-storage` |                    `^2.2.0` |     `3.1.1` | Settings, board metrics, active game persistence.                 | Reports include pending-callback warnings and old `CursorWindow` allocation failures with large stores. Our `RKStorage` DB is tiny in dumpsys, and persistence-off did not flatten native memory.        | Medium for JS stalls, low as primary native-memory owner.                 |
| `@tamagui/colors`                           |                     `2.2.0` |     `2.3.3` | Tokens only.                                                      | No matching native memory signal found.                                                                                                                                                                  | Low.                                                                      |
| `@tamagui/config`                           |                     `2.2.0` |     `2.3.3` | Theme/config.                                                     | No matching native memory signal found.                                                                                                                                                                  | Low.                                                                      |
| `@tamagui/font-inter`                       |                     `2.2.0` |     `2.3.3` | Font config.                                                      | No matching active-play signal found.                                                                                                                                                                    | Low.                                                                      |
| `@tamagui/lucide-icons-2`                   |                     `2.2.0` |     `2.3.3` | Header/menu/undo/card icons.                                      | Indirectly uses SVG; no gameplay-heavy filtered SVGs.                                                                                                                                                    | Low.                                                                      |
| `@tamagui/native`                           |                     `2.2.0` |     `2.3.3` | Native Tamagui setup, Teleport/Gesture Handler integration.       | No direct matching issue found; generated setter warnings were known but not fatal.                                                                                                                      | Low to medium only because it touches native/portal setup.                |
| `@tamagui/toast`                            |                     `2.2.0` |     `2.3.3` | App-wide toast provider, current toast view.                      | Toast not active in repeated-play samples.                                                                                                                                                               | Low.                                                                      |
| `babel-preset-expo`                         |                   `~56.0.0` |   `56.0.15` | Build transform only.                                             | Runtime memory issue unlikely.                                                                                                                                                                           | Low; update only through Expo-compatible maintenance.                     |
| `expo`                                      |                   `^56.0.0` |   `56.0.12` | SDK/runtime base.                                                 | SDK 56 is tied to RN 0.85 / React 19.2.3. Patch updates may include native fixes, but no specific Soli-shaped issue found.                                                                               | Medium as platform umbrella; patch update worth a maintenance pass.       |
| `expo-build-properties`                     |                  `~56.0.19` |   `56.0.19` | Build config plugin.                                              | No runtime exposure.                                                                                                                                                                                     | Low.                                                                      |
| `expo-constants`                            |                  `~56.0.18` |   `56.0.18` | Static app/device constants.                                      | No repeated-play signal.                                                                                                                                                                                 | Low.                                                                      |
| `expo-crypto`                               |                   `~56.0.4` |    `56.0.4` | Deal id/random bytes.                                             | Not in repeated animation/render loop except deal creation.                                                                                                                                              | Low.                                                                      |
| `expo-file-system`                          |                   `~56.0.8` |    `56.0.8` | Dev perf log persistence via `src/utils/perfLogStore.ts`.         | Could create dev-mode file churn; diagnostics-off still reproduced the memory slope.                                                                                                                     | Low as root cause, keep logs bounded.                                     |
| `expo-font`                                 |                   `~56.0.7` |    `56.0.7` | Font loading.                                                     | Startup only.                                                                                                                                                                                            | Low.                                                                      |
| `expo-linear-gradient`                      |                   `~56.0.4` |    `56.0.4` | Feature graphic route, not gameplay.                              | Not active in samples.                                                                                                                                                                                   | Low.                                                                      |
| `expo-linking`                              |                  `~56.0.14` |   `56.0.14` | Dev/deep-link experiment controls.                                | Not active during moves except launch/control.                                                                                                                                                           | Low.                                                                      |
| `expo-router`                               |                  `~56.2.11` |   `56.2.11` | Root stack/drawer navigation; wraps game screen.                  | Indirectly relevant through `react-native-screens` and Gesture Handler leaks.                                                                                                                            | Medium, but same-screen restart proof says not sufficient alone.          |
| `expo-splash-screen`                        |                  `~56.0.10` |   `56.0.10` | Startup only.                                                     | No active-play exposure.                                                                                                                                                                                 | Low.                                                                      |
| `expo-sqlite`                               |                   `~56.0.5` |    `56.0.5` | Completed/active history repository.                              | Current issue: `deleteDatabaseSync` not removing WAL/SHM sidecar files. Soli does not repeatedly delete/recreate the history DB during play.                                                             | Low for slowdown root.                                                    |
| `expo-status-bar`                           |                   `~56.0.4` |    `56.0.4` | Status bar.                                                       | No relevant signal.                                                                                                                                                                                      | Low.                                                                      |
| `expo-system-ui`                            |                   `~56.0.5` |    `56.0.5` | System UI colors.                                                 | No relevant signal.                                                                                                                                                                                      | Low.                                                                      |
| `expo-web-browser`                          |                   `~56.0.5` |    `56.0.5` | Not in active gameplay.                                           | No relevant signal.                                                                                                                                                                                      | Low.                                                                      |
| `jest-expo`                                 |                   `~56.0.5` |    `56.0.5` | Tests only, though listed in dependencies.                        | Not in Android release runtime path.                                                                                                                                                                     | Low.                                                                      |
| `react`                                     |                    `19.2.3` |    `19.2.7` | UI runtime.                                                       | Expo SDK 56 targets `19.2.3`; do not patch alone without Expo guidance.                                                                                                                                  | Medium as platform, low as isolated package suspect.                      |
| `react-dom`                                 |                    `19.2.3` |    `19.2.7` | Web only.                                                         | Not Android native.                                                                                                                                                                                      | Low.                                                                      |
| `react-native`                              |                    `0.85.3` |    `0.86.0` | Native runtime/Fabric/Hermes.                                     | RN `0.85.3` release fixed pinned Hermes selection; RN `0.86.0` has many runtime changes but is outside SDK 56's target.                                                                                  | High platform sensitivity; upgrade only as an Expo SDK/canary experiment. |
| `react-native-gesture-handler`              | `~2.31.1` resolves `2.31.2` |     `3.0.2` | Root wrapper and undo scrubber gestures.                          | Android ScreenStackFragment leak after GestureDetector interaction was reported; cleanup PR for blocking relations merged March 2026.                                                                    | Medium secondary suspect.                                                 |
| `react-native-reanimated`                   |                     `4.3.1` |     `4.5.0` | Card animation hooks, card movement, undo scrubber, celebrations. | Strong matching evidence: RN `0.85.x`/Hermes V1 memory regression triggered by Reanimated import; Worklets callback retention; Android entering/exiting memory growth; too-many-animations FPS guidance. | High.                                                                     |
| `react-native-safe-area-context`            |                    `~5.7.0` |     `5.8.0` | Insets in layouts.                                                | One old issue about slow Android screen opening after RN update; not a memory-growth match.                                                                                                              | Low.                                                                      |
| `react-native-screens`                      |                    `4.25.2` |    `4.25.2` | Expo Router stack/drawer native screens.                          | Current Android Fabric report: destroyed fragments retained through `SurfaceMountingManager.mTagToViewState`; fix PR open.                                                                               | Medium/high as navigation leak, medium/low for same-screen active play.   |
| `react-native-svg`                          |                   `15.15.4` |   `15.15.5` | Mostly icon rendering through lucide/Tamagui.                     | Filter-tag issue caused high memory/CPU on Android and leak on iOS; Soli does not render SVG filters in game.                                                                                            | Low.                                                                      |
| `react-native-teleport`                     |                     `1.1.9` |     `1.1.9` | Tamagui native portal setup.                                      | No matching memory issue found.                                                                                                                                                                          | Low.                                                                      |
| `react-native-web`                          |                   `^0.21.2` |    `0.21.2` | Web target only.                                                  | Web ImageLoader/Animated memory fixes exist upstream, irrelevant to native Android play.                                                                                                                 | Low for this issue.                                                       |
| `react-native-worklets`                     |                     `0.8.3` |    `0.10.0` | Required by Reanimated; worklet runtime.                          | Strong matching evidence: remote function registry/memory-cycle reports and fixes around June 2026; app uses `runOnJS` callbacks and gesture worklets.                                                   | High.                                                                     |
| `tamagui`                                   |                     `2.2.0` |     `2.3.3` | Main non-game UI primitives; some gameplay layout wrappers.       | No matching Android native memory signal found.                                                                                                                                                          | Low/medium, mostly through view count/style generation.                   |

Dev dependency audit:

| Package                      |                Current |            Latest seen | Runtime relevance                                                                 |
| ---------------------------- | ---------------------: | ---------------------: | --------------------------------------------------------------------------------- |
| `@babel/core`                |              `^7.29.0` |                `8.0.1` | Build transform only; do not chase Babel 8 during performance debugging.          |
| `@expo/metro-runtime`        |             `~56.0.15` |              `56.0.15` | Web/dev runtime, not repeated Android release gameplay.                           |
| `@react-native/jest-preset`  |               `0.85.3` |               `0.86.0` | Tests only; keep aligned with RN when upgrading SDK/RN.                           |
| `@tamagui/babel-plugin`      |                `2.2.0` |                `2.3.3` | Build optimization; could affect output size, not runtime leak suspect by itself. |
| `@tamagui/cli`               |                `2.2.0` |                `2.3.3` | Build/check tooling.                                                              |
| `@tamagui/metro-plugin`      |                `2.2.0` |                `2.3.3` | Bundle/build path; update with Tamagui family, not separately.                    |
| `@types/jest`                |              `29.5.14` |               `30.0.0` | Types only.                                                                       |
| `@types/react`               |              `^19.2.0` |              `19.2.17` | Types only.                                                                       |
| `@typescript/native-preview` | `7.0.0-dev.20260421.2` | `7.0.0-dev.20260624.1` | Typechecker only.                                                                 |
| `jest`                       |              `~29.7.0` |               `30.4.2` | Tests only.                                                                       |
| `jest-pnp-resolver`          |               `^1.2.3` |                `1.2.3` | Tests only.                                                                       |
| `oxfmt`                      |               `0.54.0` |               `0.56.0` | Formatting only.                                                                  |
| `oxlint`                     |               `1.69.0` |               `1.71.0` | Linting only.                                                                     |

Reanimated / Worklets evidence detail:

- Upstream issue `#9650` reports that on RN `0.85.3` with New Architecture and Hermes V1, merely importing `react-native-reanimated` increased native RAM by about `25-30%`, and removing the import restored baseline. This is especially relevant because Soli uses RN `0.85.3`, React `19.2.3`, Hermes, New Architecture/Fabric, and Reanimated.
- Upstream issue `#9661` reports Worklets retaining JS callbacks in `__remoteFunctionRegistry`, with app responsiveness degrading until a JS reload/fresh runtime. The issue says the registry size can be read via `globalThis.__remoteFunctionRegistry.size`.
- Upstream PR `#9673` merged on 2026-06-16 to fix a Worklets remote-function memory cycle. Our installed `react-native-worklets@0.8.3` predates the current `0.10.0` line.
- Upstream issue `#9438` describes memory growth scaling with worklet execution rate and retained Hermes allocation slabs. It was closed as a duplicate of `#9650`, but the call-stack evidence is a close match for our need to run heapprofd against `libhermes`, `libreanimated`, and `libworklets`.
- Upstream issue `#9250` reports Android native heap growth when repeatedly toggling `Animated.View` with entering/exiting animations on RN `0.84`, Reanimated `4.2.3`, Worklets `0.8.0`, Hermes, and New Architecture.
- The Reanimated performance guide explicitly warns about New Architecture animation regressions, too many simultaneous animated components, reading shared values from JS, and gesture/worklet memoization.

Why earlier A/Bs do not rule this out:

- `cardFlights=false`, `celebrations=false`, and `animations=false` stopped visible motion and many `withTiming` starts, but the components still imported Reanimated and still created `useSharedValue`, `useAnimatedStyle`, animated refs, Gesture Handler worklets, and `runOnJS` bridges.
- The app scan found many relevant Reanimated/Worklets surfaces:
  - `src/features/klondike/components/cards/animations.ts` uses card shared values, animated styles, measurement callbacks, and many `runOnJS` calls.
  - `src/features/klondike/hooks/useUndoScrubber.ts` uses Gesture Handler worklets, `useSharedValue`, and `runOnJS`.
  - `src/features/klondike/hooks/useCelebrationController.ts` uses shared values and `runOnJS`.
  - `src/animation/flightController.ts` keeps a shared-value record of card flight snapshots.
- Therefore a stronger A/B is not "animations disabled"; it is "no Reanimated/Worklets imported or mounted in the game surface".

Screens / Router / Gesture Handler evidence detail:

- `react-native-screens` issue `#3755` describes destroyed `ScreenFragment` / `ScreenStackFragment` retained on Android Fabric because `Screen.fragmentWrapper` is not nulled while Fabric `SurfaceMountingManager.mTagToViewState` keeps views alive. This exactly matches the earlier `mTagToViewState` clue.
- `react-native-screens` PR `#3855` proposes nulling `Screen.fragmentWrapper`; it is open as of this audit, and the latest `react-native-screens` npm version is still `4.25.2`.
- `react-native-gesture-handler` issue `#3941` reports `GestureDetector` leaking `ScreenStackFragment` after interaction when combined with Expo Router; PR `#4020` separately merged cleanup for blocking relations on handler drop.
- These are plausible contributors if navigation, drawer, sheets, or gesture interactions accumulate fragments/handlers. They are less explanatory for "same screen, same active game gets sluggish, then app restart makes it fast with the same visible state" unless a retained navigation/gesture object also pins the game runtime.

Storage / logging evidence detail:

- AsyncStorage issues show that large stores and pending native callbacks can cause failures or warnings, and our previous samples showed expensive active-game writes late in demo runs.
- However, the corrected `persistence-off`, `both-off`, `no-history`, and `perf-off` runs still ended with about `1.1-1.3 GB` PSS and large Native Heap/Unknown. That makes storage/logging a performance co-factor, not the dominant memory owner.
- Expo SQLite's WAL/SHM deletion issue matters for DB deletion semantics, but Soli is not repeatedly deleting the history DB during active play.
- Expo FileSystem is used by dev-only persisted perf logs; the diagnostics-off run reproduced the memory slope, so FileSystem logging is not the root cause.

Broad hypotheses still alive after the package audit:

- Worklets/Reanimated/Hermes native retention: worklet compilation, callback registry, or import/runtime memory behavior grows with active interaction. This best matches native/unknown memory, JS sluggishness, process restart recovery, and the current RN `0.85.3` / Hermes / Reanimated package set.
- Native allocator high-water/fragmentation: the app may allocate and free heavily, but `jemalloc`/allocator caches keep RSS/PSS high. Perfetto docs warn RSS can exceed heapprofd because freed memory can stay in thread caches or fragmentation. If heapprofd retained bytes are lower than `dumpsys meminfo`, this becomes more likely.
- Screens/Gesture Handler fragment retention: still plausible around router/drawer/gesture integration, especially because upstream issues involve Fabric and `ScreenStackFragment`, but current same-screen evidence makes it less likely as the sole active-play slope.
- React state allocation churn: reducer/board snapshots still allocate heavily even with undo history disabled. This may feed Hermes/JS GC pressure, but Java heap staying small and native/unknown dominating suggests it is probably interacting with native runtime behavior rather than being purely JS object retention.
- Tamagui/portal/sheet stack: low evidence, but a debug build that removes drawer/sheet/toast providers from the game screen would be a cheap isolation if Reanimated/Screens tests are inconclusive.

Recommended short next experiments:

1. Add dev-only logging of Worklets/Reanimated runtime counters at game boundary and per-game checkpoint:
   - `globalThis.__remoteFunctionRegistry?.size` if present.
   - Counts of mounted animated card views, gesture objects, active shared-value registries, and `runOnJS` callback registration paths.
   - This directly tests the Worklets registry leak described upstream.
2. Run a "no Reanimated game surface" A/B:
   - Replace `Animated.View` with `View` and bypass hooks in card animations/undo scrubber/celebration for one diagnostic build.
   - Keep gameplay, history, persistence, and router unchanged.
   - Expected result if Reanimated/Worklets is root: native/unknown slope should collapse far more than in the previous `animations=false` run.
3. Run an Expo-compatible package A/B:
   - Upgrade as a pair to `react-native-reanimated@4.5.0` and `react-native-worklets@0.10.x`, because `4.5.0` declares peer support for RN `0.83 - 0.86`.
   - Do not upgrade React Native to `0.86` in the same experiment; Expo SDK 56 targets RN `0.85`.
   - Re-run the same 10-game per-checkpoint harness.
4. If Reanimated is not the primary owner, run a Screens/Gesture isolation:
   - Try a debug-only `enableScreens(false)` or patch `react-native-screens` with the `#3855` cleanup, then run the same playlist.
   - Treat this as risky because Expo Router expects Screens behavior; it is an investigation build, not product code.
5. Capture native allocation attribution instead of only PSS:
   - Perfetto heapprofd on a profileable/debuggable build, targeting package `ch.karimattia.soli`.
   - Compare allocation stacks after game 1 and game 10.
   - High-signal stacks would mention `libworklets`, `libreanimated`, `libhermes`, `libreactnativejni`, `libfabricjni`, `librnscreens`, `libgesturehandler`, or allocator/thread-cache patterns.
6. Keep completed history untouched:
   - The package audit strengthens, rather than weakens, the previous proof: same persisted game/history is fast after process restart, so trimming history would still mostly hide the root cause.

Recommendation from this audit:

- The next highest-value move is not more manual game playing. It is a short automated pair:
  - Baseline current build, 10-game checkpoints plus Worklets registry logging.
  - Reanimated/Worklets upgraded pair or no-Reanimated game-surface diagnostic build, same checkpoints.
- If the memory slope drops, fix/package-upgrade the animation runtime path. If it does not, take heapprofd and use native call stacks to decide between React Native/Fabric/Hermes allocator behavior and the remaining app-level board update churn.

## 2026-06-25 Worklets runtime diagnostics implementation plan

Goal:

- Add cheap dev-only evidence for the Reanimated/Worklets registry leak hypothesis before changing package versions or gameplay architecture.
- Make the signal available in persisted perf logs and per-game checkpoint logcat captures.
- Avoid adding Reanimated imports to diagnostics helpers, and avoid reading shared values from the JS thread.

Acceptance criteria:

- Perf diagnostics logs a `runtime.worklets.summary` event at normal New Game boundaries.
- Demo playlist logs `runtime.worklets.summary` at playlist start, every game load, every game completion, and playlist completion.
- The summary includes whether `globalThis.__remoteFunctionRegistry` exists, its numeric `size` if readable, the registry constructor name, and presence flags for known Reanimated/Worklets globals.
- Logging only happens when performance diagnostics are enabled through the existing developer-mode setting.
- No gameplay behavior changes.

Implementation approach:

- Add `src/utils/reanimatedRuntimeDiagnostics.ts` as a zero-dependency JS-global inspector.
- Export `perfRuntimeSummary` from `src/utils/perfDiagnostics.ts` so callers can emit a named summary event with run context.
- Call `perfRuntimeSummary` from `useDemoGameLauncher` and from the existing diagnostics summary path used at New Game boundaries.
- Keep the event payload deliberately small; the per-game memory checkpoints provide native heap/PSS, while this payload answers whether the Worklets registry grows monotonically.

Plan: Files to modify for this pass:

- `src/utils/reanimatedRuntimeDiagnostics.ts`
- `src/utils/perfDiagnostics.ts`
- `src/features/klondike/hooks/useDemoGameLauncher.ts`
- `docs/product/game-history-performance/fabric-view-retention-root-fix.md`

## Testing

- Passed: `yarn jest test/unit/storage/gamePersistence.test.ts --runInBand --watchAll=false`.
- Passed: `yarn jest test/unit/solitaire/klondike.timer.test.ts test/unit/storage/gamePersistence.test.ts --runInBand --watchAll=false`.
- Passed: `yarn typecheck`.
- Passed: `yarn lint`.
- Build/install: `GRADLE_USER_HOME=/tmp/soli-gradle ANDROID_SERIAL=192.168.1.12:40141 yarn release` assembled successfully, then failed after assembly with Metro `EMFILE: too many open files, watch`.
- Installed manually: `ANDROID_SERIAL=192.168.1.12:40141 adb install -r android/app/build/outputs/apk/release/app-release.apk` succeeded.
- Package verified on phone: `ch.karimattia.soli`, `versionName=0.8.0`, `versionCode=13`, `lastUpdateTime=2026-06-24 16:50:32`, no `DEBUGGABLE` flag.
- Launch verified on phone: `ch.karimattia.soli/.MainActivity` foregrounded with PID `1675`.
- Render verified on phone: screenshot `tmp/android-smoke/fabric-root-fix-app-stay-awake.png` shows the game board rendered after launch.
- Fresh post-launch memory sample: about `191 MB` total PSS, `115 MB` Native Heap PSS, `22 MB` Unknown PSS, `13` Android Views before extended play.
- Timer isolation Android build/install: `ANDROID_SERIAL=adb-4139951e-zmJeED._adb-tls-connect._tcp GRADLE_USER_HOME=/tmp/soli-gradle yarn release` passed and installed the release APK.
- Timer isolation package verified on phone: `ch.karimattia.soli`, `versionName=0.8.0`, `versionCode=13`, `lastUpdateTime=2026-06-24 22:51:02`, no `DEBUGGABLE` flag observed in the package summary.
- Timer isolation launch verified on phone: `ch.karimattia.soli/.MainActivity` foregrounded with PID `20119`.
- Timer isolation UI verified on phone: screenshots `tmp/android-smoke/timer-isolation-installed.png` and `tmp/android-smoke/timer-isolation-tick-check.png` show the board rendered and the time badge advancing.
- Timer isolation post-install memory sample: about `380 MB` total PSS, `221 MB` Native Heap PSS, `53 MB` Unknown PSS, and `545` Android Views while the current in-progress board is foregrounded.
- 10-game matrix code checks passed: `yarn typecheck`, `yarn lint`, and `node --check scripts/run-demo-autosolve.js`.
- 10-game matrix build/install: `GRADLE_USER_HOME=/tmp/soli-gradle DEMO_GAME_LIMIT=10 DEMO_VARIANT=baseline DEMO_CARD_FLIGHTS=1 DEMO_PERSISTENCE=1 node scripts/run-demo-autosolve.js` built, signed with the app `.env`, installed, and completed the baseline run.
- A direct Gradle install without the runner signing environment failed with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`; the signed runner path fixed it.
- Completed and collected six 10-game samples under `tmp/perf-samples/demo-ab-10x-20260625-081108`: `baseline-10x`, `flights-off-10x`, `persistence-off-10x`, `both-off-10x`, `flights-off-corrected-10x`, and `both-off-corrected-10x`.
- Restored card flights on after the first matrix with a quoted Android deep link so the `&` params were not split by the shell.
- Wireless ADB disappeared during the first corrected card-flight-off attempt at game 9, then reappeared. The corrected card-flight-off and corrected both-off variants were rerun from scratch and captured successfully.
- Restored card flights on again after the corrected matrix with a quoted Android deep link.
- Passed after per-game checkpoint instrumentation: `node --check scripts/run-demo-autosolve.js`.
- Passed after per-game checkpoint instrumentation: `yarn typecheck`.
- Passed after per-game checkpoint instrumentation: `yarn lint`.
- Per-game `celebrations-off` run: `RUN_ID=celebration-ab-10x-20260625-090000 GRADLE_USER_HOME=/tmp/soli-gradle DEMO_CAPTURE_GAME_CHECKPOINTS=1 DEMO_GAME_LIMIT=10 DEMO_VARIANT=celebrations-off DEMO_CARD_FLIGHTS=1 DEMO_PERSISTENCE=1 DEMO_CELEBRATIONS=0 node scripts/run-demo-autosolve.js`.
- Per-game `animations-off-corrected` run: `RUN_ID=animation-ab-corrected-10x-20260625-092000 GRADLE_USER_HOME=/tmp/soli-gradle SKIP_BUILD_INSTALL=1 DEMO_CAPTURE_GAME_CHECKPOINTS=1 DEMO_GAME_LIMIT=10 DEMO_VARIANT=animations-off-corrected DEMO_ANIMATIONS=0 DEMO_PERSISTENCE=1 node scripts/run-demo-autosolve.js`.
- Per-game `no-history` run: `RUN_ID=no-history-10x-20260625-094500 GRADLE_USER_HOME=/tmp/soli-gradle DEMO_CAPTURE_GAME_CHECKPOINTS=1 DEMO_GAME_LIMIT=10 DEMO_VARIANT=no-history DEMO_PERF_DIAGNOSTICS=0 DEMO_RECORD_HISTORY=0 node scripts/run-demo-autosolve.js`.
- Corrected hydration-safe perf-off run: `RUN_ID=perf-off-corrected-10x-20260625-100500 GRADLE_USER_HOME=/tmp/soli-gradle DEMO_CAPTURE_GAME_CHECKPOINTS=1 DEMO_GAME_LIMIT=10 DEMO_VARIANT=perf-off-corrected DEMO_PERF_DIAGNOSTICS=0 node scripts/run-demo-autosolve.js`.
- Corrected perf-off final sample collected without app marking: `RUN_ID=perf-off-corrected-10x-20260625-100500 DUMP_PERSISTED_LOGS=0 MARK_APP_SAMPLE=0 KEEP_FULL_LOGCAT=0 scripts/collect-android-slowdown-sample.sh perf-off-corrected-10x`.
- Corrected perf-off artifacts: `tmp/perf-samples/perf-off-corrected-10x-20260625-100500/perf-off-corrected-per-game/game-01` through `game-10`, plus `tmp/perf-samples/perf-off-corrected-10x-20260625-100500/perf-off-corrected-10x`.
- Same-game restart proof: direct ADB was used because `agent-device devices --platform android` failed to start its daemon.
- Same-game restart proof before sample: `RUN_ID=restart-same-game-proof-20260625-105545 DUMP_PERSISTED_LOGS=0 MARK_APP_SAMPLE=0 KEEP_FULL_LOGCAT=1 scripts/collect-android-slowdown-sample.sh sluggish-before-raw`.
- Same-game restart proof before log dump: `RUN_ID=restart-same-game-proof-20260625-105545 DUMP_PERSISTED_LOGS=1 MARK_APP_SAMPLE=1 KEEP_FULL_LOGCAT=1 PERSISTED_LOG_DUMP_WAIT_SECONDS=3 scripts/collect-android-slowdown-sample.sh sluggish-before-marked`.
- Same-game restart proof restart command: `adb -s adb-4139951e-zmJeED._adb-tls-connect._tcp shell am force-stop ch.karimattia.soli && sleep 1 && adb -s adb-4139951e-zmJeED._adb-tls-connect._tcp shell am start -W -n ch.karimattia.soli/.MainActivity`.
- Same-game restart proof after sample: `RUN_ID=restart-same-game-proof-20260625-105545 DUMP_PERSISTED_LOGS=0 MARK_APP_SAMPLE=0 KEEP_FULL_LOGCAT=1 scripts/collect-android-slowdown-sample.sh after-restart-raw`.
- Same-game restart proof after log dump: `RUN_ID=restart-same-game-proof-20260625-105545 DUMP_PERSISTED_LOGS=1 MARK_APP_SAMPLE=1 KEEP_FULL_LOGCAT=1 PERSISTED_LOG_DUMP_WAIT_SECONDS=3 scripts/collect-android-slowdown-sample.sh after-restart-marked`.
- Dependency audit: read `package.json`, searched package usage with `rg`, and checked current/latest package versions via `NPM_CONFIG_CACHE=/tmp/soli-npm-cache npm view ...`.
- Dependency audit: `yarn expo install --check` failed because Expo CLI tried to write `/Users/karim/.expo/native-modules-cache/...` and hit `EPERM`; no package changes were made.
- Dependency audit: searched upstream GitHub issues/PRs and official docs for React Native, Expo, Reanimated/Worklets, Screens, Gesture Handler, AsyncStorage, Expo SQLite/FileSystem, SVG, Safe Area, Tamagui/Teleport, React Native Web, and Android/Perfetto profiling guidance.
- Worklets runtime diagnostics focused test passed: `yarn jest test/unit/utils/reanimatedRuntimeDiagnostics.test.ts --runInBand --watchAll=false`.
- Worklets runtime diagnostics typecheck passed: `yarn typecheck`.
- Worklets runtime diagnostics lint passed: `yarn lint`.
- Testing sub-agent `019efe4a-1aab-7e80-8e3f-3f5e8f0d533e` independently ran the same focused Jest, typecheck, and lint commands; all passed and it edited no files.
- Reanimated/Worklets upgrade candidate JS checks passed before Android build attempt: focused Jest, `yarn typecheck`, and `yarn lint`.
- Reanimated/Worklets upgrade candidate Android build failed after targeted native clean with `:expo-modules-core:buildCMakeRelWithDebInfo[arm64-v8a]` missing `react-native-worklets/android/build/intermediates/cxx/RelWithDebInfo/3wf2d3h5/obj/arm64-v8a/libworklets.so`.
- Reverted the package experiment with `YARN_GLOBAL_FOLDER=/tmp/soli-yarn-global yarn add react-native-reanimated@4.3.1 react-native-worklets@0.8.3`.
- Restored-package native clean passed: `GRADLE_USER_HOME=/tmp/soli-gradle ./gradlew :expo-modules-core:clean :react-native-worklets:clean --no-daemon --console=plain`.
- Testing sub-agent `019efe5f-9160-7140-b0e7-c41665db255e` verified package pins (`react-native-reanimated@4.3.1`, `react-native-worklets@0.8.3`) and passed focused Jest, `yarn typecheck`, and `yarn lint`; it edited no files and ran no native builds.
- Restored-package Android release build succeeded through `:app:assembleRelease` in `12m 40s`; the `yarn release` wrapper then failed after assembly with Metro/DevTools `EMFILE: too many open files, watch`.
- Installed restored-package APK manually: `adb -s adb-4139951e-zmJeED._adb-tls-connect._tcp install -r android/app/build/outputs/apk/release/app-release.apk` succeeded.
- Restored-package device install verified: `ch.karimattia.soli`, `versionName=0.8.0`, `versionCode=13`, `lastUpdateTime=2026-06-25 12:56:00`.

## 2026-06-25 Worklets runtime diagnostics baseline result

Sample root:

- `tmp/perf-samples/worklets-runtime-10x-20260625-122122`

Run summary:

| Sample  | Total PSS | Native Heap | Unknown |     RSS | Views |
| ------- | --------: | ----------: | ------: | ------: | ----: |
| Game 1  |    550 MB |      347 MB |  111 MB |  666 MB |   349 |
| Game 10 |   1294 MB |      743 MB |  455 MB | 1413 MB |   270 |
| Final   |   1294 MB |      734 MB |  455 MB | 1412 MB |   270 |

10-game delta:

- Total PSS: `+744 MB`
- Native Heap: `+396 MB`
- Unknown: `+344 MB`

Runtime-summary result:

- `runtime.worklets.summary` emitted at playlist start, each game load, each game completion, playlist completion, and app background.
- `__reanimatedModuleProxy`, `__workletsModuleProxy`, and `_WORKLET` were present throughout the run.
- `__remoteFunctionRegistry` was absent throughout the run, so the specific upstream registry-size leak pattern is not the visible mechanism in this installed build.

Timing / event-loop result:

| Game | Duration | Event-loop drift avg / p90 / max |
| ---- | -------: | -------------------------------: |
| 1    |   16.0 s |                88 / 158 / 516 ms |
| 6    |   20.6 s |               515 / 820 / 882 ms |
| 9    |   37.0 s |               396 / 560 / 683 ms |
| 10   |   32.6 s |              554 / 746 / 1159 ms |

Interpretation:

- The memory slope is still large and matches earlier baselines, so the new diagnostics did not introduce the issue.
- The specific Worklets `__remoteFunctionRegistry` leak is unlikely to explain this release build.
- Reanimated/Worklets can still be involved through native runtime/Hermes allocation behavior rather than that JS-visible registry.
- The next smallest fix candidate is upgrading `react-native-reanimated` and `react-native-worklets` together, keeping React Native at the Expo SDK 56 target (`0.85.3`).

## 2026-06-25 Reanimated / Worklets upgrade candidate result

Candidate:

- `react-native-reanimated@4.5.0`
- `react-native-worklets@0.10.0`
- React Native unchanged at Expo SDK 56's target, `0.85.3`

Package compatibility finding:

- `react-native-reanimated@4.5.0` requires Worklets `0.10.x`.
- `react-native-worklets@0.10.0` declares React Native peer support for `0.83 - 0.86`.
- `react-native-worklets@0.10.0` also declares a peer on `@react-native/metro-config`.
- `expo-modules-core@56.0.17` declares optional Worklets peer support only for `^0.7.4 || ^0.8.0`.
- This means the Reanimated/Worklets pair is internally compatible, but it is ahead of Expo SDK 56's Expo Modules Worklets adapter contract.

Build result:

- Initial Android release build failed in `:expo-modules-core:buildCMakeRelWithDebInfo[arm64-v8a]`:
  - `libworklets.so`, needed by `libexpo-modules-core.so`, was missing at `node_modules/react-native-worklets/android/build/intermediates/cxx/RelWithDebInfo/3wf2d3h5/obj/arm64-v8a/libworklets.so`.
- Investigation found stale Expo generated prefab metadata still saying `react-native-worklets` version `0.8.3`, while Worklets `0.10.0` had built native libraries under a different generated hash.
- A targeted native clean was run:
  - `GRADLE_USER_HOME=/tmp/soli-gradle ./gradlew :expo-modules-core:clean :react-native-worklets:clean --no-daemon --console=plain`
- The clean removed the stale refs, but the next Android release build still failed with the same missing `libworklets.so` path under `3wf2d3h5`.

Decision:

- Treat this as a blocked package candidate, not a memory result. We could not run the 10-game memory harness on this pair because the release APK does not build under the current Expo SDK.
- Reverted only this package experiment back to `react-native-reanimated@4.3.1` and `react-native-worklets@0.8.3`, leaving unrelated local package changes untouched.
- A future Worklets `0.10.x` test should be paired with an Expo SDK/RN canary move or a deliberate native adapter patch. It should not be mixed into the current focused memory fix as a "simple upgrade".

Next recommendation:

- Keep the Worklets runtime diagnostics in place.
- Add a more decisive no-Reanimated gameplay-surface A/B, where the game route avoids importing/mounting Reanimated and Worklets hooks for cards, undo scrubber, and celebration. This tests the package/runtime hypothesis without crossing Expo's declared native compatibility range.
- In parallel or immediately after, capture a native allocation trace with Perfetto heapprofd against the existing Expo-compatible build. The target stacks to look for remain `libworklets`, `libreanimated`, `libhermes`, `libreactnativejni`, `libfabricjni`, `librnscreens`, and allocator/thread-cache patterns.

## 2026-06-25 no-Reanimated diagnostic build plan

Goal:

- Create an opt-in Android diagnostic build that keeps the same gameplay, router, history, persistence, and demo playlist, but replaces `react-native-reanimated` with a static React Native-backed mock at Metro resolution time.
- Use this to distinguish "Reanimated/Worklets native runtime import and shared-value machinery" from "app reducer/board model allocation churn" without upgrading across Expo SDK 56's Worklets compatibility boundary.

External guidance used:

- Expo's Metro guide recommends `resolver.resolveRequest` for module aliases and says to delegate unhandled modules to the default resolver.
- Metro's resolver docs allow a custom resolver to return `{ type: 'sourceFile', filePath }`.
- Tamagui's configuration docs describe animation drivers as swappable, including Reanimated and React Native Animated drivers.
- React's Rules of Hooks mean the diagnostic should use build-time module replacement or separate modules, not conditional hook calls inside card/celebration components.

Acceptance criteria:

- Normal builds keep importing the real `react-native-reanimated` and Tamagui Reanimated animation driver.
- Setting `SOLI_NO_REANIMATED=1` aliases `react-native-reanimated` and its subpaths to a local mock module.
- The mock exposes the Reanimated APIs Soli currently imports: default `Animated`, `createAnimatedComponent`, `useSharedValue`, `useAnimatedStyle`, `useAnimatedRef`, `runOnJS`, `runOnUI`, `measure`, `cancelAnimation`, `withTiming`, `withSequence`, `withSpring`, `withDelay`, and `Easing`.
- The diagnostic build marks a JS global so persisted `runtime.worklets.summary` can prove the mock is active.
- `scripts/run-demo-autosolve.js` supports `DEMO_NO_REANIMATED=1`, sets the build-time env, includes the requested flag in the deep link, and records it in per-game checkpoint manifests.
- `experiment.config` and runtime summaries include requested/effective no-Reanimated state.

Implementation approach:

- Add `src/utils/reanimatedStaticMock.ts`, intentionally minimal and deterministic. It should not import Reanimated or Worklets.
- Add Metro resolver aliasing in `metro.config.js` behind `SOLI_NO_REANIMATED=1`.
- Change `tamagui.config.ts` so diagnostic builds do not statically import `@tamagui/config/v5-reanimated`; use the v5 CSS/native fallback driver instead.
- Extend runtime diagnostics to report `staticMockActive`.
- Extend the demo runner deep link, build env, and checkpoint manifest.
- Extend focused unit coverage for the new runtime diagnostic flag.

Steps:

- [completed] Document the no-Reanimated diagnostic build plan.
- [completed] Add the local Reanimated static mock and Metro/Tamagui opt-in wiring.
- [completed] Add runtime/deep-link/runner evidence fields.
- [completed] Run focused Jest, `node --check`, typecheck, lint, and format check.
- [completed] Run a 10-game `DEMO_NO_REANIMATED=1` checkpoint harness and compare Game 1 -> Game 10 memory slope.

Files modified for this pass:

- `metro.config.js`
- `tamagui.config.ts`
- `src/utils/reanimatedStaticMock.ts`
- `src/utils/reanimatedRuntimeDiagnostics.ts`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `scripts/run-demo-autosolve.js`
- `test/unit/utils/reanimatedRuntimeDiagnostics.test.ts`
- `docs/product/game-history-performance/fabric-view-retention-root-fix.md`

## 2026-06-25 no-Reanimated diagnostic result

Sample root:

- `tmp/perf-samples/no-reanimated-10x-20260625-131108`

Build/runtime notes:

- First diagnostic APK built and installed, but crashed at startup in `GestureDetector` because React Native Gesture Handler saw the mock's `useSharedValue` and then called missing `Reanimated.useEvent`.
- The mock was extended with `useEvent`, `setGestureState`, and `ReduceMotion`.
- Second diagnostic APK built, installed, launched, and completed the 10-game demo playlist.
- `runtime.worklets.summary` proved the mock was active: `staticMockActive=true`, `__SOLI_NO_REANIMATED_STATIC_MOCK=true`, and `__reanimatedModuleProxy=false`.
- `__workletsModuleProxy=true` and `_WORKLET=true` remained present, so this is best read as "real Reanimated JS/native module removed from gameplay imports" rather than "every Worklets native library absent from the process." Android still loaded `libworklets.so` during startup via the native dependency graph.

10-game memory result:

| Game | Total PSS | Native heap | Unknown | Java heap |    RSS | Views |
| ---- | --------: | ----------: | ------: | --------: | -----: | ----: |
| 1    |    224 MB |       81 MB |   62 MB |     16 MB | 340 MB |   376 |
| 2    |    265 MB |      105 MB |   58 MB |     33 MB | 384 MB |   405 |
| 3    |    266 MB |      105 MB |   62 MB |     29 MB | 385 MB |   426 |
| 4    |    272 MB |      107 MB |   63 MB |     32 MB | 391 MB |   405 |
| 5    |    261 MB |      102 MB |   63 MB |     26 MB | 380 MB |   405 |
| 6    |    271 MB |      107 MB |   62 MB |     32 MB | 390 MB |   405 |
| 7    |    262 MB |      106 MB |   60 MB |     26 MB | 381 MB |   405 |
| 8    |    273 MB |      108 MB |   64 MB |     31 MB | 392 MB |   426 |
| 9    |    284 MB |      113 MB |   64 MB |     37 MB | 404 MB |   405 |
| 10   |    267 MB |      108 MB |   62 MB |     27 MB | 386 MB |   335 |

10-game delta:

- Total PSS: `+43 MB`
- Native heap PSS: `+27 MB`
- Unknown PSS: `+1 MB`
- Java heap PSS: `+11 MB`
- RSS: `+46 MB`
- Views: `-41`

Final collected sample:

- `tmp/perf-samples/no-reanimated-10x-20260625-131108/no-reanimated-10x-final`
- Final post-run total PSS was about `262 MB`, Native Heap about `96 MB`, Unknown about `61 MB`, RSS about `381 MB`, and `306` views.

Timing / event-loop result:

| Game | Duration | Event-loop drift avg / max |
| ---- | -------: | -------------------------: |
| 1    |   10.9 s |                 24 / 57 ms |
| 2    |   10.5 s |                 37 / 60 ms |
| 3    |   11.2 s |                 49 / 59 ms |
| 4    |   11.2 s |                 67 / 98 ms |
| 5    |    9.5 s |                 82 / 93 ms |
| 6    |   10.8 s |               101 / 118 ms |
| 7    |   11.0 s |               115 / 144 ms |
| 8    |   10.7 s |               135 / 149 ms |
| 9    |   12.0 s |               149 / 178 ms |
| 10   |   10.5 s |               169 / 198 ms |

Interpretation:

- This is the strongest evidence so far. Removing the real Reanimated module path collapses the memory slope from the previous `~1.2-1.3 GB` Game 10 PSS range to about `267 MB` Game 10 PSS, with Unknown memory essentially flat.
- Active persistence, completed history, undo history, celebrations, card-flight settings, and perf logging were all left enabled for this diagnostic run. The slope still collapsed, so those are not the primary root cause by themselves.
- Event-loop drift still grows modestly across games, so there may be remaining JS pressure, but it no longer turns into catastrophic native/unknown memory growth or late-game duration blowups.
- The likely root cause is Reanimated/Worklets/Hermes native runtime behavior triggered by the app's current animation/gesture/shared-value usage under React Native `0.85.3` and Expo SDK 56's Worklets-compatible package range.

Recommended fix direction from this result:

- Do not reduce completed history as a workaround.
- Keep the normal package pins for now because the direct `react-native-reanimated@4.5.0` / `react-native-worklets@0.10.0` upgrade is blocked by Expo SDK 56.
- Replace the gameplay surface's Reanimated usage with simpler React Native/React state where possible:
  - Cards: use plain `View` rendering first, then add back tiny React Native `Animated` or CSS/native-driver effects only if they do not reintroduce the slope.
  - Undo scrubber: force `.runOnJS(true)` / JS gesture handling or temporarily remove the Reanimated shared-value scrubber path.
  - Celebration: either make it non-Reanimated or keep it disabled until the rest of the board is proven flat.
  - Tamagui: keep the app-level Reanimated driver under review; the diagnostic used the non-Reanimated Tamagui driver too, so a follow-up A/B should isolate "game components only" vs "Tamagui driver too."
- Validate the production fix incrementally with the same 10-game checkpoint harness. The target success metric is Game 10 total PSS under roughly `350 MB` with Unknown near flat, not just lower animation count.

Testing for this pass:

- Passed: `yarn jest test/unit/utils/reanimatedRuntimeDiagnostics.test.ts --runInBand --watchAll=false`.
- Passed: `node --check scripts/run-demo-autosolve.js`.
- Passed: `yarn typecheck`.
- Passed: `yarn lint`.
- Passed: `yarn format:check`.
- Passed diagnostic Android build/install/run: `RUN_ID=no-reanimated-10x-20260625-131108 GRADLE_USER_HOME=/tmp/soli-gradle YARN_GLOBAL_FOLDER=/tmp/soli-yarn-global DEMO_CAPTURE_GAME_CHECKPOINTS=1 DEMO_GAME_LIMIT=10 DEMO_VARIANT=no-reanimated DEMO_NO_REANIMATED=1 DEMO_PERF_DIAGNOSTICS=1 DEMO_ANIMATIONS=1 DEMO_CARD_FLIGHTS=1 DEMO_CELEBRATIONS=1 DEMO_PERSISTENCE=1 DEMO_RECORD_HISTORY=1 node scripts/run-demo-autosolve.js`.
- Captured final diagnostic sample: `RUN_ID=no-reanimated-10x-20260625-131108 DUMP_PERSISTED_LOGS=1 MARK_APP_SAMPLE=1 KEEP_FULL_LOGCAT=0 PERSISTED_LOG_DUMP_WAIT_SECONDS=3 scripts/collect-android-slowdown-sample.sh no-reanimated-10x-final`.
- Restored the device to a normal release APK built without `SOLI_NO_REANIMATED`: `versionName=0.8.0`, `versionCode=13`, `lastUpdateTime=2026-06-25 13:26:14`.

## 2026-06-25 sticking with Reanimated analysis

Question:

- If animations stay on Reanimated/Worklets, what can we do before deciding to replace the animation runtime?

Sources reviewed:

- Reanimated performance guide: https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/
- Reanimated feature flags: https://docs.swmansion.com/react-native-reanimated/docs/guides/feature-flags/
- Reanimated compatibility table: https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/
- Worklets feature flags: https://docs.swmansion.com/react-native-worklets/docs/guides/feature-flags/
- Expo SDK version table: https://docs.expo.dev/versions/latest/
- Reanimated issue `#9650`: https://github.com/software-mansion/react-native-reanimated/issues/9650
- Worklets issue `#9661`: https://github.com/software-mansion/react-native-reanimated/issues/9661
- Worklets PR `#9673`: https://github.com/software-mansion/react-native-reanimated/pull/9673
- Reanimated issue `#9438`: https://github.com/software-mansion/react-native-reanimated/issues/9438
- Reanimated issue `#9250`: https://github.com/software-mansion/react-native-reanimated/issues/9250
- Package metadata checked with `npm view` on 2026-06-25.
- Installed Expo bundle checked through `node_modules/expo/bundledNativeModules.json`.

Version compatibility:

| Scenario                                       | Expo / RN / React                                                                                                        | Reanimated                                        | Worklets                                          | Related native packages                                                       | Fit for Soli today                                              | Notes                                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | -------- |
| Current installed / Expo SDK 56 bundled        | Expo `56.0.12`, RN `0.85.3`, React `19.2.3`, Hermes, New Architecture                                                    | `4.3.1`                                           | `0.8.3`                                           | RNGH `2.31.2`, Screens `4.25.2`, Expo Modules Core `56.0.17`, Tamagui `2.2.0` | Builds and installs; memory slope reproduces.                   | Expo's bundle map explicitly pairs Reanimated `4.3.1` with Worklets `0.8.3`; Expo Modules Core peers Worklets `^0.7.4                                                                                                                                                 |     | ^0.8.0`. |
| Reanimated `4.4.x` pair                        | RN peer `0.83 - 0.86`; Expo SDK 56 still targets RN `0.85`                                                               | `4.4.0`                                           | `0.9.x`                                           | Expo Modules Core `56.0.17` peer range does not include `0.9.x`               | Risky / not recommended as main fix.                            | Released 2026-05-25, before the 2026-06-16 Worklets remote-function cycle fix. It crosses Expo's Worklets peer range without likely fixing our strongest leak suspect.                                                                                                |
| Reanimated `4.5.x` pair                        | RN peer `0.83 - 0.86`; Expo SDK 56 still targets RN `0.85`                                                               | `4.5.0`                                           | `0.10.x`                                          | Expo Modules Core `56.0.17` peer range does not include `0.10.x`              | High-value experiment, but blocked as a drop-in package change. | Released after Worklets PR `#9673`, so it is the first stable-looking candidate likely to include the remote-function memory-cycle fix. Our prior release build failed because Expo Modules Core still linked against an incompatible generated Worklets native path. |
| Reanimated `4.6.x` / Worklets `0.11.x` nightly | Docs compatibility lists RN `0.83 - 0.86`; stable npm `4.6.0` / `0.11.0` not published at query time                     | `4.6.0-nightly-*` only                            | `0.11.0-nightly-*` only                           | Outside Expo SDK 56 bundle and peer range                                     | Investigation-only.                                             | Useful only if we intentionally run a canary/nightly native stack experiment.                                                                                                                                                                                         |
| Expo canary / future SDK                       | Expo `57.0.0-canary-20260526-13e89ca` exists on npm; official SDK table still lists SDK 56 as latest stable in this pass | Unknown until installed with `expo install --fix` | Unknown until installed with `expo install --fix` | Canary packages are explicitly pre-release                                    | Investigation-only.                                             | Potential path to newer Worklets/Reanimated native compatibility, but too broad for a focused root-cause fix unless we isolate it in a branch.                                                                                                                        |
| Reanimated 3                                   | Older architecture-compatible line                                                                                       | `3.x`                                             | none                                              | Reanimated docs say Reanimated 3 is no longer actively maintained             | Not recommended.                                                | Downgrading conflicts with the current New Architecture direction and would hide, not solve, the SDK 56 runtime shape.                                                                                                                                                |

Relevant Reanimated guide guidance and Soli fit:

| Guide point                                                                                                              | Soli current state                                                                                                                                                                                                 | What it suggests if staying with Reanimated                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| New Architecture can regress animation performance.                                                                      | Soli is New Architecture/Fabric (`newArchEnabled=true`) and Hermes (`hermesEnabled=true`).                                                                                                                         | Treat Reanimated as sensitive on Android SDK 56; every mitigation needs a 10-game PSS run, not just visual testing.                                                                                                      |
| Prefer non-layout animated styles.                                                                                       | Card motion mostly animates `transform`, `opacity`, and `zIndex`; static `top`/`left` positioning is not animated.                                                                                                 | Good: keep animations to `transform` / `opacity` / `zIndex`; avoid animated `width`, `height`, `top`, `left`, margins, and padding.                                                                                      |
| Avoid animating too many components at once; rule of thumb says no more than 100 animated components on low-end Android. | A full board can have 52 outer `AnimatedView` card containers plus 52 inner `Animated.View` flip wrappers, plus slots/glow/win cleanup wrappers. This can exceed the low-end Android rule even before celebration. | Collapse wrappers and make static cards plain views. If retaining Reanimated, prefer an overlay where only moving cards are animated.                                                                                    |
| Avoid reading shared values from JS.                                                                                     | The flight controller correctly keeps a JS mirror to avoid reading `cardFlights.value` from JS.                                                                                                                    | Keep this. Add diagnostics to catch accidental JS shared-value reads.                                                                                                                                                    |
| Memoize gesture objects.                                                                                                 | Undo tap/pan gestures are wrapped in `useMemo`.                                                                                                                                                                    | Good, but the pan still captures multiple shared values and calls `runOnJS` during updates.                                                                                                                              |
| Memoize frame callbacks.                                                                                                 | No current `useFrameCallback` usage found.                                                                                                                                                                         | No action unless we add frame callbacks later.                                                                                                                                                                           |
| Static feature flags can optimize non-layout prop updates.                                                               | No `reanimated.staticFeatureFlags` block exists in `package.json`.                                                                                                                                                 | A Reanimated-retention experiment should try `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS=true` first, because Soli mostly animates transform/opacity. This may improve FPS but is unlikely to fix import-level memory growth. |

Codebase findings:

| Surface                                                                             | Current Reanimated shape                                                                                                                                                                                                                                                                                                                   | Risk if sticking with Reanimated                                                                                                                                                                    | Candidate mitigation                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/klondike/components/cards/animations.ts`                              | Every mounted card creates `useAnimatedRef`, `wiggle`, `flightX`, `flightY`, `flightZ`, `flightOpacity`, `flipScale`, and two animated styles. Layout runs a `runOnUI` worklet, calls `measure()`, retries via `requestAnimationFrame`, mutates a shared card-flight registry, and calls `runOnJS` for metrics/snapshot/settled callbacks. | Highest app-level risk. It combines many animated components, many shared values, frequent layout worklets, `measure()`, registry mutation, and callback bridging on a long-lived screen.           | Keep card visuals, but reduce Reanimated residency: one animated wrapper per card at most; plain views for static cards; start with a moving-card overlay so only active flights use Reanimated; move most measurement to JS `onLayout`; batch or remove `runOnJS` callbacks from layout. |
| `src/animation/flightController.ts`                                                 | Shared value registry `cardFlights` plus a JS mirror `memoryRef`; reset clears both. Uses `modify` to seed registry.                                                                                                                                                                                                                       | Medium/high because the shared object persists for the screen lifetime and is touched around most moves. The JS mirror is good, but the UI registry may still retain serialized snapshots/worklets. | If retaining Reanimated, keep JS mirror as source of truth and shrink UI shared state to only active flight values. Avoid a mutable shared object registry for all 52 cards.                                                                                                              |
| `src/features/klondike/hooks/useUndoScrubber.ts`                                    | Many shared values mirror history/geometry/lock state; pan gesture runs on UI thread and calls `runOnJS(scheduleScrubDispatch)` on index changes; tap gesture already uses `.runOnJS(true)`.                                                                                                                                               | Medium. It is memoized, but `runOnJS` during pan updates is exactly the Worklets callback-retention shape implicated upstream.                                                                      | Because scrubbing dispatches JS state anyway, try `.runOnJS(true)` for the pan or move the scrubber math to JS. If keeping UI-thread gesture math, call JS only on start/end or throttle much harder.                                                                                     |
| `src/features/klondike/hooks/useCelebrationController.ts` plus card animated styles | Celebration stores assignment map, board, mode, total, active flag, and progress in shared values. Every card's animated style reads celebration bindings and computes a frame.                                                                                                                                                            | Medium/high on win games. It animates many cards simultaneously and causes every card worklet to read shared celebration state.                                                                     | Keep celebration visually rich, but isolate it: render celebration cards in a temporary overlay with a bounded set of animated views; unmount/clear immediately on completion/new game; do not keep every normal card subscribed to celebration shared values all game.                   |
| `src/features/klondike/components/cards/CardView.tsx` / `TopRow.tsx`                | Empty slots and win cleanup wrappers use Reanimated for fade/scale.                                                                                                                                                                                                                                                                        | Low individually, but they add to animated component count.                                                                                                                                         | Convert simple fades to plain React Native `Animated` or keep them but only mount while needed. If sticking strictly to Reanimated, centralize them and avoid always-mounted animated wrappers.                                                                                           |
| `tamagui.config.ts`                                                                 | Normal builds load `@tamagui/config/v5-reanimated`; the no-Reanimated diagnostic used the CSS fallback.                                                                                                                                                                                                                                    | Medium uncertainty. The successful no-Reanimated A/B removed both game Reanimated and Tamagui's Reanimated driver, so we have not isolated Tamagui's driver.                                        | Run an A/B that keeps game Reanimated but switches Tamagui native animations away from Reanimated. If memory stays bad, game usage is sufficient; if it improves, Tamagui driver also matters.                                                                                            |
| `src/features/klondike/constants.ts`                                                | Imports `Easing` from Reanimated for timing constants.                                                                                                                                                                                                                                                                                     | Low for a "keep Reanimated" plan; high only for no-Reanimated import isolation.                                                                                                                     | No action if keeping Reanimated. If isolating imports, replace with numeric/easing alternatives.                                                                                                                                                                                          |

Stick-with-Reanimated implementation options:

### Option 1: Reanimated feature-flag experiment

Changes:

- Add a `reanimated.staticFeatureFlags` block to `package.json` with:
  - `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS: true`
- Do not enable `DISABLE_COMMIT_PAUSING_MECHANISM` unless we also build React Native from source with `preventShadowTreeCommitExhaustion`; the guide warns about app unresponsiveness otherwise.
- Do not enable `USE_ANIMATION_BACKEND` in production now; the guide marks it experimental and tied to RN `0.85.2+` plus RN experimental release-level behavior.
- Log static feature flag values at app start/new game to prove the release APK picked them up.

Pros:

- Smallest Reanimated-preserving experiment.
- Fits Soli's non-layout animation style (`transform`, `opacity`, `zIndex`).
- Could improve FPS without changing UX.

Cons:

- Does not address the import-level memory regression from issue `#9650`.
- Does not address Worklets callback-retention unless the current version already behaves well.
- Touch hit-testing can be wrong for transformed components; guide recommends Gesture Handler pressables for transformed touchables.
- Requires a native rebuild and 10-game memory validation.

Recommendation:

- Worth one quick A/B if we are committed to trying Reanimated first, but do not expect it to solve the memory root cause alone.

### Option 2: Reanimated hygiene pass inside current Expo SDK

Changes:

- Reduce animated component count:
  - Collapse `AnimatedView` + inner `Animated.View` where possible.
  - Make non-moving/static cards plain `View`.
  - Avoid always-mounted Reanimated wrappers for empty slots and win cleanup fades.
- Reduce shared values:
  - Avoid per-card values when a feature is disabled.
  - Replace the `cardFlights` shared object registry with JS-owned snapshots plus per-active-flight shared values.
- Reduce worklet/callback churn:
  - Avoid creating layout `runOnUI` worklets on every card layout.
  - Prefer JS `onLayout` measurements for geometry and schedule only the final transform animation on the UI runtime.
  - Batch `onCardMeasured` / `notifyFlightSettled` callbacks; avoid `runOnJS` from every measure retry and every settled card.
- Keep only non-layout animated styles.

Pros:

- Preserves Reanimated for the core card feel.
- Directly addresses the guide's animated-component-count and worklet/gesture guidance.
- More likely to reduce both memory growth rate and JS/event-loop drift than a feature flag alone.

Cons:

- More invasive than switching simple card animations to React Native `Animated`.
- If issue `#9650` is triggered just by import/runtime initialization, this may reduce the slope but not eliminate the baseline/runtime pressure.
- Needs careful visual QA because card flights, face flips, invalid wiggle, foundation glow, and celebration are intertwined.

Recommendation:

- This is the best "stay on Reanimated" product-code path, but scope it as one feature: "Reanimated minimal board surface." Acceptance should be memory based, not code-shape based.

### Option 3: Move undo scrubber to JS-thread gestures while keeping card animations on Reanimated

Changes:

- Set the pan gesture to `.runOnJS(true)` or replace the worklet math with JS responder/gesture logic.
- Keep `scrubAnimatedIndex` only if the visual thumb truly needs Reanimated; otherwise make it React state/refs.
- Keep dispatch throttling via `requestAnimationFrame`.

Pros:

- Very targeted against `runOnJS` callback retention.
- Undo scrubbing already commits JS reducer state, so UI-thread gesture math may not buy enough to justify the Worklets surface.
- Lower risk than rewriting card flights.

Cons:

- May make scrubber feel less fluid on low-end devices if JS is busy.
- Does not address per-card layout/measure worklets.

Recommendation:

- Good first code simplification inside the Reanimated-retention plan, especially because the user already observed sluggishness during normal play and undo swiper proof is important.

### Option 4: Package upgrade / canary experiment

Changes:

- Test `react-native-reanimated@4.5.0` + `react-native-worklets@0.10.0` or newer nightly/canary in a dedicated branch/build.
- If Expo SDK 56 still fails, try Expo canary with `expo install --fix` in a separate branch, not mixed with product-code changes.

Pros:

- `4.5.0` / Worklets `0.10.0` is the first stable-looking line after Worklets PR `#9673`, which specifically fixes a remote-function memory cycle.
- Could preserve current code and UX if the native stack builds and the memory slope disappears.

Cons:

- Already failed as a drop-in under SDK 56 because Expo Modules Core still expects Worklets `^0.7.4 || ^0.8.0`.
- Canary SDK changes are broad and can introduce unrelated regressions.
- Does not teach us whether our code shape is too costly even after upstream fixes.

Recommendation:

- Keep as a parallel investigation, not the main fix. It is attractive, but blocked by native compatibility today.

### Option 5: Tamagui Reanimated-driver isolation

Changes:

- Run a build that keeps game Reanimated but switches Tamagui native animations to the non-Reanimated driver.

Pros:

- Disentangles the no-Reanimated diagnostic, which removed both the game Reanimated imports and Tamagui's Reanimated driver.
- Small A/B surface.

Cons:

- If memory remains bad, it only proves game usage is sufficient to trigger the issue.
- If memory improves, we still need to decide whether app-level Tamagui animation fidelity matters.

Recommendation:

- Run this before a large card rewrite if we want one more attribution point.

Recommended order if we stick with Reanimated:

1. Add a targeted Reanimated diagnostics sample:
   - log `globalThis.__remoteFunctionRegistry?.size`;
   - log animated component counts by surface;
   - log `runOnJS` calls from card layout/flight/scrubber;
   - log static feature flags.
2. A/B Tamagui driver only.
3. A/B `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS=true`.
4. Move undo scrubber pan to JS-thread gestures.
5. Refactor card flights into a Reanimated-minimal board surface:
   - plain static cards;
   - Reanimated only for active moving/flip/glow overlays;
   - JS-owned geometry;
   - no mutable shared registry for all cards.
6. Run the same 10-game harness after each step:
   - target Game 10 total PSS under about `350 MB`;
   - Unknown memory near flat;
   - no meaningful event-loop drift growth;
   - manual card tapping still correct with transformed cards.

Bottom line:

- Sticking with Reanimated is possible, but only if we stop treating every card as a permanently animated component.
- The most defensible Reanimated-preserving architecture is an overlay/minimal-residency model: stable board = plain React Native views; active motion = small, bounded Reanimated layer.
- A package-only fix is tempting because Worklets `0.10.0` likely includes the remote-function cycle fix, but Expo SDK 56 native compatibility currently blocks it as a normal upgrade.

## 2026-06-25 optimal-fix experiment pass

Goal:

- Find the smallest fix that flattens the repeated-game Native Heap/Unknown memory slope while preserving the animated Solitaire feel.
- Start with cheap attribution A/Bs before a larger board-animation rewrite.

Planned experiment order:

1. Tamagui-driver isolation:
   - Keep the real game Reanimated/Worklets path.
   - Switch only Tamagui's native animation driver away from Reanimated.
   - If memory still grows, Tamagui's driver is not sufficient to explain the no-Reanimated win.
2. Reanimated static prop fast path:
   - Add `reanimated.staticFeatureFlags.ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS=true` in `package.json`.
   - Rebuild and rerun the same 10-game harness.
   - This is expected to help non-layout animation throughput more than memory, but it is cheap enough to measure.
3. First product-code simplification:
   - Move undo scrubber pan to JS-thread gesture handling, because it already commits reducer state on JS and currently creates Worklets/`runOnJS` traffic during pan updates.
4. Larger fix if needed:
   - Refactor the board to a minimal Reanimated-residency model: static cards as plain React Native views, only active moving/flip/glow overlays animated.

Implementation notes for this pass:

- Added `SOLI_TAMAGUI_NO_REANIMATED=1` / `EXPO_PUBLIC_SOLI_TAMAGUI_NO_REANIMATED=1` as a build-time A/B flag in `tamagui.config.ts`.
- Added `DEMO_TAMAGUI_NO_REANIMATED=1` runner support so the release playlist build can request that driver isolation cleanly.
- Added runtime evidence in `runtime.worklets.summary`, `experiment.config`, and checkpoint manifests so samples prove whether the Tamagui no-Reanimated driver was actually active.
- Confirmed from `node_modules/react-native-reanimated/android/build.gradle` that Reanimated static flags are read from the app `package.json` at native build time. There is no equivalent runtime env toggle for a valid Android native flag A/B.

Steps:

- [completed] Add Tamagui-driver-only A/B build flag and sample evidence fields.
- [completed] Run focused Jest, `node --check`, typecheck, lint, and format check.
- [completed] Run a 10-game `DEMO_TAMAGUI_NO_REANIMATED=1` checkpoint harness.
- [completed] Compare Game 1 -> Game 10 PSS/Native/Unknown against the baseline and no-Reanimated diagnostic.
- [completed] Decide whether to run the static feature flag A/B or move straight to game-surface code changes.

Files modified for this pass:

- `tamagui.config.ts`
- `scripts/run-demo-autosolve.js`
- `src/utils/reanimatedRuntimeDiagnostics.ts`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `test/unit/utils/reanimatedRuntimeDiagnostics.test.ts`
- `docs/product/game-history-performance/fabric-view-retention-root-fix.md`

## 2026-06-25 Tamagui-driver isolation result

Sample root:

- `tmp/perf-samples/tamagui-driver-10x-20260625-174851`

Build/runtime notes:

- The runner built and installed a release APK with `DEMO_TAMAGUI_NO_REANIMATED=1`, `SOLI_TAMAGUI_NO_REANIMATED=1`, and `EXPO_PUBLIC_SOLI_TAMAGUI_NO_REANIMATED=1`.
- Per-game checkpoint manifests confirm the Tamagui-driver A/B request on all 10 games.
- Runtime `tamaguiNoReanimatedDriverActive` still reported `false`, so that field is not reliable evidence for this build. The manifest/build-env evidence is the source of truth for this sample until the runtime diagnostic is fixed.
- The app still used the real game Reanimated/Worklets path.

10-game memory result:

| Game | Total PSS | Native heap | Unknown | Java heap |     RSS | Views |
| ---- | --------: | ----------: | ------: | --------: | ------: | ----: |
| 1    |    539 MB |      336 MB |  112 MB |     16 MB |  654 MB |   349 |
| 2    |    642 MB |      378 MB |  150 MB |     33 MB |  759 MB |   349 |
| 3    |    731 MB |      436 MB |  183 MB |     32 MB |  848 MB |   349 |
| 4    |    826 MB |      479 MB |  229 MB |     38 MB |  943 MB |   349 |
| 5    |    863 MB |      510 MB |  255 MB |     18 MB |  981 MB |   349 |
| 6    |    989 MB |      566 MB |  302 MB |     42 MB | 1106 MB |   349 |
| 7    |   1054 MB |      595 MB |  349 MB |     30 MB | 1171 MB |   349 |
| 8    |   1147 MB |      647 MB |  385 MB |     37 MB | 1264 MB |   349 |
| 9    |   1263 MB |      714 MB |  422 MB |     49 MB | 1381 MB |   349 |
| 10   |   1299 MB |      736 MB |  464 MB |     21 MB | 1416 MB |   616 |

10-game delta:

- Total PSS: `+760 MB`
- Native heap PSS: `+400 MB`
- Unknown PSS: `+352 MB`
- Java heap PSS: `+5 MB`
- RSS: `+763 MB`
- Views: `+267`

Interpretation:

- Switching Tamagui's animation driver away from Reanimated did not reproduce the flat no-Reanimated result.
- With the game-level Reanimated path still active, memory returned to the bad baseline shape.
- This makes Tamagui's Reanimated driver an unlikely sufficient root cause. It can remain a secondary cleanup, but the primary fix should target Soli's game Reanimated surface.

Decision:

- Do not spend the main fix budget on Tamagui-driver changes.
- A static feature flag A/B may still improve FPS, but it is unlikely to flatten Native/Unknown memory because the Tamagui-driver A/B kept the same game Reanimated residency and memory still grew.
- Prioritize a Reanimated-minimal game board surface if we keep Reanimated.

## 2026-06-25 Reanimated-retention research refresh

Question:

- The user asked to read the Reanimated performance guide, research web and codebase, and make a detailed analysis of what we can do if we stick with Reanimated. They also asked for a dependency-version table showing what goes together.

Sources reviewed on 2026-06-25:

- Reanimated performance guide: https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/
- Reanimated feature flags: https://docs.swmansion.com/react-native-reanimated/docs/guides/feature-flags/
- Reanimated compatibility table: https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/
- Worklets feature flags: https://docs.swmansion.com/react-native-worklets/docs/guides/feature-flags/
- Expo SDK version table: https://docs.expo.dev/versions/latest/
- Reanimated import-memory issue `#9650`: https://github.com/software-mansion/react-native-reanimated/issues/9650
- Worklets remote-function registry leak issue `#9661`: https://github.com/software-mansion/react-native-reanimated/issues/9661
- Worklets remote-function cycle fix PR `#9673`: https://github.com/software-mansion/react-native-reanimated/pull/9673
- Worklet-compilation/HermesRuntime leak issue `#9438`: https://github.com/software-mansion/react-native-reanimated/issues/9438
- Conditional `Animated.View` memory issue `#9250`: https://github.com/software-mansion/react-native-reanimated/issues/9250
- Local `package.json`, `node_modules/expo/bundledNativeModules.json`, package metadata via `npm view`, Reanimated/Worklets Android Gradle scripts, and Soli Reanimated call sites.

Dependency/version matrix:

| Scenario                              | Expo                                       | React Native                                | React    | Reanimated                         | Worklets           | Expo Modules Core Worklets peer     | Status for Soli                    | Notes                                                                                                                                                                                            |
| ------------------------------------- | ------------------------------------------ | ------------------------------------------- | -------- | ---------------------------------- | ------------------ | ----------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Current Soli / Expo SDK 56 bundled    | `56.0.12` installed, `^56.0.0` in app      | `0.85.3`                                    | `19.2.3` | `4.3.1`                            | `0.8.3`            | `^0.7.4                             |                                    | ^0.8.0`                                                                                                                                                                                          | Valid and builds; memory slope reproduces. | Expo bundle map explicitly lists Reanimated `4.3.1` and Worklets `0.8.3`. Reanimated `4.3.1` peers RN `0.81 - 0.85` and Worklets `0.8.x`. |
| Older SDK-compatible Reanimated line  | Expo SDK 56                                | RN `0.85.3`                                 | `19.2.3` | `4.2.3`                            | `0.7 - 0.8`        | Compatible with `0.8.x`             | Not recommended.                   | Reanimated docs say Reanimated 4.2.x supports RN up to `0.84`, not `0.85`; downgrading would move away from Expo's bundle.                                                                       |
| Reanimated 4.4 line                   | Expo SDK 56                                | RN `0.85.3`                                 | `19.2.3` | `4.4.1`                            | `0.9.x`            | Not compatible                      | Risky experiment only.             | Reanimated/RN peer range is ok (`0.83 - 0.86`), but Expo Modules Core does not declare Worklets `0.9.x`. Also before the merged `#9673` remote-function cycle fix.                               |
| Reanimated 4.5 line                   | Expo SDK 56                                | RN `0.85.3`                                 | `19.2.3` | `4.5.0`                            | `0.10.x`           | Not compatible                      | High-value but blocked as drop-in. | Reanimated/RN peer range is ok (`0.83 - 0.86`) and this is the first stable line after `#9673`, but our Android release build failed in Expo Modules Core native linking with Worklets `0.10.0`. |
| Reanimated nightly                    | Expo SDK 56                                | RN `0.85.3`                                 | `19.2.3` | `4.6.0-nightly-20260624-8b1d9d505` | Nightly / `*` peer | Not compatible unless proven        | Investigation-only.                | Useful for upstream confirmation, not a product fix.                                                                                                                                             |
| React Native 0.86 with Reanimated 4.5 | Not a stable Expo SDK 56 target            | RN `0.86.0`                                 | `19.2.3` | `4.5.0`                            | `0.10.x`           | Depends on Expo canary/native stack | Separate branch only.              | React Native `0.86.0` exists, but Expo SDK 56 targets RN `0.85`; moving RN without Expo is too broad.                                                                                            |
| Expo canary / future SDK              | `57.0.0-canary-20260526-13e89ca` available | Unknown until `expo install --fix` resolves | Unknown  | Unknown                            | Unknown            | Unknown                             | Separate branch only.              | Expo docs allow canary testing but warn canary packages can have incompatibilities.                                                                                                              |
| Reanimated 3                          | Older architecture line                    | Not the current Expo 56 path                | Varies   | `3.x`                              | None               | N/A                                 | Not recommended.                   | Reanimated docs say 3.x is no longer actively maintained and Reanimated 4 is the New Architecture line.                                                                                          |

Reanimated performance guide mapped to Soli:

| Guide point                                                             | Current Soli state                                                                                                                                                                              | Reanimated-preserving action                                                                                                                           |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Expo SDK 53+ / New Architecture can regress animation performance.      | `newArchEnabled=true`, Hermes enabled, RN `0.85.3`.                                                                                                                                             | Treat the animation runtime itself as a suspect. Every fix needs a 10-game PSS/Unknown/Native check, not just "feels smooth" QA.                       |
| Prefer non-layout animated props.                                       | Card motion mostly uses `transform`, `opacity`, `zIndex`; static `top`/`left` are not animated.                                                                                                 | Keep this. Do not add animated width/height/top/left/margins.                                                                                          |
| `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` can fast-path non-layout props. | We have no `reanimated.staticFeatureFlags` block today.                                                                                                                                         | Worth one rebuild A/B for FPS and commit pressure. It may not fix memory. Touch hit-testing must be checked because transformed views can be affected. |
| Avoid too many animated components at once.                             | Each card can have an outer animated wrapper plus inner flip wrapper, and all 52 cards mount Reanimated state even when idle. Celebration makes every card style read shared celebration state. | Main product-code fix: plain static cards plus a bounded Reanimated overlay for active motion.                                                         |
| Avoid reading shared values from JS.                                    | Flight controller uses a JS mirror to avoid reading `cardFlights.value` on JS.                                                                                                                  | Keep this pattern. Add diagnostics to catch accidental `.value` reads from JS.                                                                         |
| Memoize gesture objects.                                                | Undo gestures are memoized.                                                                                                                                                                     | Good baseline, but the pan still crosses to JS via `runOnJS` during updates. Move pan to JS if we keep reducer commits on JS anyway.                   |
| Static flags require rebuild.                                           | Reanimated and Worklets Gradle scripts read `package.json` static flags at native build time.                                                                                                   | Do not expose static flags as developer-mode toggles; run them as explicit rebuild/install experiments.                                                |

Codebase Reanimated surfaces:

| Surface                            | What exists now                                                                                                                                                                                      | Risk                                                                                                                                                | Best Reanimated-preserving change                                                                                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card animation hook                | Per card: `useAnimatedRef`, `wiggle`, `flightX`, `flightY`, `flightZ`, `flightOpacity`, `flipScale`, two animated styles, `runOnUI(measure)`, shared registry mutation, several `runOnJS` callbacks. | Highest. It combines always-mounted animated components, per-card shared values, UI measurement, mutable shared object state, and callback bridges. | Make static cards plain views. Use Reanimated only for active moving/flipping overlays. Move geometry to JS-owned snapshots. Remove the shared object registry from steady state. |
| Flight controller                  | `cardFlights` shared object plus JS mirror. `modify` seeds snapshots.                                                                                                                                | Medium/high. The JS mirror is good, but shared registry state is long-lived and touched often.                                                      | Keep JS mirror as source of truth. Create per-flight shared values only while a card is moving.                                                                                   |
| Undo scrubber                      | Many mirrored shared values and a UI-thread pan that calls `runOnJS(scheduleScrubDispatch)` during drag.                                                                                             | Medium. It resembles the upstream remote-callback retention shape and already commits state on JS.                                                  | Move pan to `.runOnJS(true)` or JS gesture math; keep RAF throttling.                                                                                                             |
| Celebration                        | Shared assignment map/progress/active/mode/board/total; every card animated style checks celebration bindings.                                                                                       | Medium/high on wins; many animated components at once.                                                                                              | Isolate celebration into a temporary overlay. Do not keep every normal card subscribed all game.                                                                                  |
| Top row, empty slots, simple fades | Reanimated wrappers for opacity/scale.                                                                                                                                                               | Low individually, adds to animated component count.                                                                                                 | Convert simple fades to plain RN `Animated` or mount only while needed.                                                                                                           |
| Tamagui driver                     | Normal builds load `@tamagui/config/v5-reanimated`.                                                                                                                                                  | Low as primary after A/B.                                                                                                                           | Leave for now; driver-only A/B still grew to bad baseline.                                                                                                                        |

Options if we stick with Reanimated:

| Option                                                   | Pros                                                                                                                                                   | Cons                                                                                                                                                                                | Recommendation                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Enable `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`           | Tiny code/package change; fits transform/opacity usage; may improve FPS and ShadowTree commit pressure.                                                | Static rebuild only; touch hit-testing risk; unlikely to fix native memory slope alone.                                                                                             | Run only as a quick A/B, not as the main root fix.                                        |
| Enable `DISABLE_COMMIT_PAUSING_MECHANISM`                | Could help scroll/jitter cases.                                                                                                                        | Reanimated docs say it is safe only with RN `preventShadowTreeCommitExhaustion`, which needs building React Native from source/patching RN. Our app is not scroll-jitter dominated. | Do not use for this issue now.                                                            |
| Enable `USE_ANIMATION_BACKEND`                           | Long-term direction for RN animation backend; our RN `0.85.3` is new enough for the Reanimated-side requirement.                                       | Experimental; docs tie it to RN experimental feature flags/release level; broad risk.                                                                                               | Do not use in production. Maybe branch-only if all other Reanimated-retention paths fail. |
| Upgrade to Reanimated `4.5.0` / Worklets `0.10.x`        | Best upstream memory-leak candidate after PR `#9673`; may preserve current UX.                                                                         | Already failed Android release build under Expo SDK 56 because Expo Modules Core still expects Worklets `0.7/0.8`.                                                                  | Separate Expo-canary/native-stack experiment only.                                        |
| Move undo scrubber pan to JS                             | Small code simplification; removes Worklets callback churn from a feature that already commits JS state.                                               | Could feel less smooth if JS is busy; does not fix card animation surface.                                                                                                          | Good first product-code step.                                                             |
| Reanimated-minimal board surface                         | Preserves animations where they matter; directly follows guide's "avoid too many animated components" advice; should reduce memory and frame pressure. | Largest code change; needs careful visual QA.                                                                                                                                       | Best main fix if we decide to keep Reanimated.                                            |
| Keep all current Reanimated surfaces and only tune flags | Minimal UX risk.                                                                                                                                       | Unlikely to solve the no-Reanimated A/B gap; keeps all per-card shared values/worklets mounted.                                                                                     | Not enough.                                                                               |

Recommended strategy:

1. Add/repair evidence:
   - Fix runtime reporting for the Tamagui-driver flag so build-time flags are visible in persisted logs.
   - Log `getStaticFeatureFlag('ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS')` when present.
   - Keep logging `__remoteFunctionRegistry?.size` and Worklets/Reanimated globals.
   - Add counters for per-game `runOnJS` calls by surface: card layout, card flight settled, face flip, celebration, scrubber.
2. Run one quick static flag A/B only if we want a cheap data point:
   - Add `reanimated.staticFeatureFlags.ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS=true`.
   - Rebuild/install and run 10 games.
   - Success metric is memory, not only smoothness: Game 10 total PSS under about `350 MB` and Unknown near flat.
3. Make the product-code fix:
   - First move undo scrubber pan to JS.
   - Then implement a minimal Reanimated board surface: plain static cards; Reanimated overlay only for active card flights/flips/glows/celebration.
   - Avoid a shared object registry for all card positions on the UI runtime.
4. Keep package upgrades separate:
   - Reanimated `4.5.0` / Worklets `0.10.x` is worth tracking because upstream fixed a real remote-function cycle, but it is not a simple Expo SDK 56 patch today.

Bottom line:

- Sticking with Reanimated still makes sense for Solitaire because animations are a core product feature, but the architecture should change from "every card is always an animated resident" to "most cards are plain, active motion is animated."
- Static feature flags are worth measuring for FPS, but the memory fix should be a Reanimated-residency reduction in Soli's board model unless a future Expo-compatible Worklets upgrade proves the upstream leak is fully fixed.

## 2026-06-25 static Reanimated feature-flag A/B plan

Goal:

- Test the cheapest Reanimated-preserving native runtime mitigation before starting the larger board-surface rewrite.
- Keep package versions, gameplay, history, persistence, card animations, and Tamagui driver unchanged.
- Change only Reanimated's native static feature flag for Android synchronous non-layout prop updates.

Rationale:

- The Reanimated performance guide recommends `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` for non-layout animated props.
- Soli's card animation styles primarily use `transform`, `opacity`, and `zIndex`, not animated layout dimensions.
- This flag could improve frame/update throughput. It is not expected to fully fix the Native Heap/Unknown memory slope, but it is small enough to measure and eliminate.

Acceptance criteria:

- `package.json` contains `reanimated.staticFeatureFlags.ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS=true`.
- Runtime diagnostics include `reanimatedStaticFeatureFlags.androidSynchronouslyUpdateUiProps`.
- The diagnostic release sample proves the flag is visible in persisted `runtime.worklets.summary` events.
- A 10-game Android run is compared against the current baseline and the no-Reanimated diagnostic.
- If Game 10 total PSS remains near the `~1.2-1.3 GB` range with large Native Heap/Unknown growth, stop treating static flags as the fix and move to the Reanimated-minimal board surface.
- If memory flattens near the no-Reanimated diagnostic (`<350 MB` Game 10 PSS with Unknown near flat), keep the flag as the leading fix candidate and manually verify card touch behavior.

Steps:

- [completed] Add `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS=true` under `reanimated.staticFeatureFlags`.
- [completed] Add best-effort runtime evidence for the static flag.
- [completed] Run focused Jest, typecheck, lint, format check, and `git diff --check`.
- [completed] Build/install the Android release APK and run the 10-game checkpoint harness.
- [completed] Parse memory slope and update this doc with the result.

Files modified for this pass:

- `package.json`
- `src/utils/reanimatedRuntimeDiagnostics.ts`
- `src/utils/reanimatedStaticMock.ts`
- `test/unit/utils/reanimatedRuntimeDiagnostics.test.ts`
- `docs/product/game-history-performance/fabric-view-retention-root-fix.md`

## 2026-06-25 static Reanimated feature-flag A/B result

Sample root:

- `tmp/perf-samples/static-props-10x-20260625-182325`

Build/runtime notes:

- The runner rebuilt and installed a release APK after a native Reanimated clean.
- Runtime `runtime.worklets.summary` proved the build used the real Reanimated/Worklets path:
  - `staticMockActive=false`
  - `tamaguiNoReanimatedDriverActive=false`
  - `__reanimatedModuleProxy=true`
  - `__workletsModuleProxy=true`
  - `_WORKLET=true`
- Runtime `getStaticFeatureFlag('ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS')` reported `true`, so the A/B was valid.
- After the failed A/B, the `package.json` static flag was removed again. Keep the runtime diagnostic field because it is useful for future native-flag experiments.

10-game memory result:

| Game | Total PSS | Native heap | Unknown | Dalvik heap |     RSS | Views |
| ---- | --------: | ----------: | ------: | ----------: | ------: | ----: |
| 1    |    538 MB |      325 MB |  110 MB |       28 MB |  652 MB |   349 |
| 2    |    644 MB |      376 MB |  146 MB |       40 MB |  761 MB |   349 |
| 3    |    736 MB |      419 MB |  191 MB |       47 MB |  853 MB |   349 |
| 4    |    827 MB |      468 MB |  229 MB |       52 MB |  945 MB |   349 |
| 5    |    897 MB |      523 MB |  267 MB |       25 MB | 1014 MB |   349 |
| 6    |   1003 MB |      567 MB |  308 MB |       49 MB | 1120 MB |   699 |
| 7    |   1048 MB |      600 MB |  339 MB |       29 MB | 1165 MB |   349 |
| 8    |   1148 MB |      631 MB |  392 MB |       46 MB | 1265 MB |   349 |
| 9    |   1203 MB |      672 MB |  432 MB |       21 MB | 1320 MB |   349 |
| 10   |   1299 MB |      732 MB |  457 MB |       37 MB | 1415 MB |   270 |

10-game delta:

- Total PSS: `+760 MB`
- Native heap PSS: `+407 MB`
- Unknown PSS: `+347 MB`
- Dalvik heap PSS: `+9 MB`
- RSS: `+763 MB`
- Views: `-79`

Playlist timing:

| Game | Duration | Moves | Entry               |
| ---- | -------: | ----: | ------------------- |
| 1    |    17.4s |   246 | `default-0-draw-1`  |
| 2    |    18.5s |   246 | `default-1-draw-1`  |
| 3    |    20.4s |   239 | `default-2-draw-1`  |
| 4    |    23.2s |   256 | `default-3-draw-1`  |
| 5    |    19.5s |   219 | `default-4-draw-1`  |
| 6    |    25.8s |   245 | `default-5-draw-1`  |
| 7    |    30.4s |   228 | `default-6-draw-1`  |
| 8    |    31.4s |   246 | `default-7-draw-1`  |
| 9    |    36.9s |   276 | `default-9-draw-1`  |
| 10   |    36.0s |   242 | `default-10-draw-1` |

Interpretation:

- `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` did not flatten memory. The Native Heap/Unknown slope is essentially the same class of failure as the worklets-baseline and Tamagui-driver-isolation runs.
- The attached Android view count did not grow with memory. Game 10 had fewer `Views` than game 1, while PSS grew by about `760 MB`. This again points away from visible view count and toward native/runtime allocation retained behind the animation/worklet path.
- The timing slope still degrades across the playlist, from about `17-20s` early games to about `36s` late games.
- The flag can remain a future FPS tuning candidate, but it is not the root memory fix and should not be kept as a product change now because the Reanimated docs call out touch/commit consistency side effects.

Decision:

- Do not keep the static feature flag as the main fix.
- Keep the static-flag diagnostic field.
- The next Reanimated-preserving fix should reduce Reanimated residency in Soli's board model: plain cards by default, temporary animated overlays only for active flights/flips/glows/celebration.

## 2026-06-25 reduced card Reanimated residency implementation

Goal:

- Keep Reanimated available for the moments where the game needs it, but stop mounting every idle card as a Reanimated component with shared values, animated refs, UI-thread `measure()`, shared registry writes, and `runOnJS` callbacks.
- Preserve the visible move animation path for cards that are actively moving, wiggling, or participating in the win celebration.

Implementation shape:

1. Track a short-lived set of card IDs that should use the animated card path.
   - Add moved cards before `dispatchWithFlight` dispatches the reducer action.
   - Include newly exposed tableau cards for flip feedback when we can infer them before the reducer runs.
   - Include invalid-move cards for the wiggle window.
   - Clear each card ID shortly after the relevant animation window.
2. Split `CardView` into:
   - a static plain React Native card path for idle cards;
   - the existing Reanimated path for transiently active cards.
3. Let the static path register card layout snapshots with a normal `View` ref plus `measureInWindow`.
   - This keeps flight readiness on the JS mirror without needing a UI-thread shared object registry for every idle card.
4. Pass the animated-card ID set through `TopRow`, `TableauSection`, `FoundationPile`, `StockStack`, and `WasteFan`.
5. Keep celebration cards forced onto the animated path because the current celebration effect is Reanimated-based.

Acceptance criteria for this slice:

- Most idle cards render without `useCardAnimations`.
- Cards involved in draw/move/undo/auto-queue/invalid feedback still use the existing animated path for a short window.
- Static cards still register valid flight snapshots.
- The no-history/no-persistence settings are not changed; this remains focused on animation residency, not obfuscating memory.
- Focused typecheck and formatting pass before any Android sample.

Steps:

- [completed] Add transient animated card ID tracking in `useKlondikeGame`.
- [completed] Split `CardView` into static and animated paths.
- [completed] Thread `animatedCardIds` through card containers.
- [completed] Run focused checks and update sample plan.

Files modified for this pass:

- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/hooks/useDemoGameLauncher.ts`
- `src/features/klondike/components/cards/CardView.tsx`
- `src/features/klondike/components/cards/TableauSection.tsx`
- `src/features/klondike/components/cards/TopRow.tsx`
- `src/features/klondike/components/cards/FoundationPile.tsx`
- `src/features/klondike/components/cards/StockStack.tsx`
- `src/features/klondike/components/cards/WasteFan.tsx`
- `docs/product/game-history-performance/fabric-view-retention-root-fix.md`

Verification so far:

- `yarn typecheck`
- `yarn lint`
- `yarn format:check`
- `git diff --check`

Next sample:

- Run the same 10-game Android release checkpoint harness with normal Reanimated/Worklets active and no static Reanimated flag.
- Success criterion: Game 1 -> Game 10 Total PSS/Native/Unknown should flatten materially compared with the prior `+760 MB` class. A partial reduction is useful evidence, but the optimal fix still requires near-plateau behavior.

## 2026-06-25 reduced card Reanimated residency sample result

Sample root:

- `tmp/perf-samples/residency-static-cards-10x-20260625-184646`

Runtime evidence:

- Fresh release APK installed successfully.
- Real Reanimated/Worklets remained active:
  - `staticMockActive=false`
  - `tamaguiNoReanimatedDriverActive=false`
  - `__reanimatedModuleProxy=true`
  - `__workletsModuleProxy=true`
  - `_WORKLET=true`
  - `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS=false`
- The new residency split took effect. `cards.summary.activeMountedCardViews` over the run:
  - min `0`
  - p50 `3`
  - p90 `10`
  - max `52` during celebration/full-stack moments

10-game memory result:

| Game | Total PSS | Native heap | Unknown | Dalvik heap |     RSS | Views |
| ---- | --------: | ----------: | ------: | ----------: | ------: | ----: |
| 1    |    512 MB |      307 MB |  100 MB |       31 MB |  626 MB |   291 |
| 2    |    560 MB |      350 MB |  116 MB |       18 MB |  677 MB |   291 |
| 3    |    620 MB |      371 MB |  146 MB |       27 MB |  737 MB |   291 |
| 4    |    689 MB |      412 MB |  174 MB |       27 MB |  806 MB |   291 |
| 5    |    722 MB |      432 MB |  197 MB |       18 MB |  839 MB |   291 |
| 6    |    805 MB |      461 MB |  236 MB |       33 MB |  922 MB |   291 |
| 7    |    834 MB |      484 MB |  256 MB |       20 MB |  951 MB |   291 |
| 8    |    910 MB |      526 MB |  283 MB |       31 MB | 1027 MB |   291 |
| 9    |    991 MB |      570 MB |  315 MB |       36 MB | 1107 MB |   291 |
| 10   |   1027 MB |      587 MB |  348 MB |       19 MB | 1144 MB |   616 |

10-game delta:

- Total PSS: `+516 MB`
- Native heap PSS: `+280 MB`
- Unknown PSS: `+248 MB`
- Dalvik heap PSS: `-12 MB`
- RSS: `+518 MB`
- Views: `+325`

Playlist timing:

| Game | Duration | Moves | Entry               |
| ---- | -------: | ----: | ------------------- |
| 1    |    14.6s |   246 | `default-0-draw-1`  |
| 2    |    13.3s |   246 | `default-1-draw-1`  |
| 3    |    15.1s |   239 | `default-2-draw-1`  |
| 4    |    16.7s |   256 | `default-3-draw-1`  |
| 5    |    13.3s |   219 | `default-4-draw-1`  |
| 6    |    16.8s |   245 | `default-5-draw-1`  |
| 7    |    19.6s |   228 | `default-6-draw-1`  |
| 8    |    19.4s |   246 | `default-7-draw-1`  |
| 9    |    25.7s |   276 | `default-9-draw-1`  |
| 10   |    28.9s |   242 | `default-10-draw-1` |

Interpretation:

- The change is directionally correct but not the final fix.
- Idle Reanimated residency dropped sharply: animated card residency p50 is only `3`, versus the previous effective model where every card was an animated resident.
- Memory still grows substantially. The new clue is churn: `cards.summary` counted about `3,525` animated card mounts and `3,473` unmounts across the playlist, with `3,627` `flightStarted` events.
- This suggests the remaining owner is likely repeated creation/destruction of Reanimated card-flight hooks/shared values/worklets, not idle cards staying mounted forever.
- Game duration improved materially but still slopes upward by late games, so the same root pressure remains.

Decision:

- Keep the idle-static-card split as useful progress, but do not call it solved.
- Next isolate whether the remaining slope follows card-flight animated churn by rerunning the same build with `cardFlights=0`.
- If `cardFlights=0` now flattens, the optimal fix should remove Reanimated from per-move card flights entirely or replace it with a tiny stable overlay/pool that does not create thousands of Reanimated hook instances.
- If `cardFlights=0` still grows, target win celebration/foundation glow/waste fan and other remaining Reanimated surfaces next.

## 2026-06-25 card-flights-off after idle-static split

Sample root:

- `tmp/perf-samples/residency-static-cards-flights-off-10x-20260625-185435`

Result:

- Effective config logged `effectiveCardFlightsEnabled=false`.
- Runtime kept real Reanimated active and static flags off.
- `flightStarted=0`, so no actual card-flight animations ran.
- Memory was effectively unchanged from the flights-on reduced-residency run:
  - Total PSS `+512 MB`
  - Native heap PSS `+282 MB`
  - Unknown PSS `+242 MB`

Important caveat/learning:

- This was not a clean "no animated card path" sample. The playlist still created about `3,479` animated card mounts and `3,477` unmounts even with `flightStarted=0`.
- Cause: the deep-link settings update can change `cardFlights` after `processDemoLink` has already scheduled `handleLaunchDemoGame` with the previous `dispatchWithFlight` closure. The rendered card hooks correctly saw `cardFlights=false`, hence `flightStarted=0`, but the dispatch path still marked moving cards transiently animated.
- That accidental shape is still useful: it isolates the leak further. Repeated creation/destruction of the Reanimated card hook path is enough to keep the Native/Unknown slope alive, even when those hooks do not start visible flight animations.

Next implementation:

- Keep static idle cards.
- Replace the transient per-move card path with React Native's built-in native `Animated` API, not Reanimated/Worklets.
- Keep the existing Reanimated card path only for the current win-celebration binding, then later consider moving celebration to the same non-Reanimated overlay model if memory still grows.
- Fix the dispatch callback to consult a `cardFlightsEnabledRef` so future runtime A/B links cannot mark transient animated card IDs from stale settings.

## 2026-06-25 native Animated transient card path

Implementation:

- Added `cardFlightsEnabledRef` in `useKlondikeGame` so stale deep-link/demo callbacks cannot mark moving cards animated after the card-flight setting has changed.
- Kept idle cards on the static plain `View` path.
- Split transient card rendering:
  - ordinary move/wiggle/flip cards now use React Native's built-in `Animated` API with `useNativeDriver`;
  - only win-celebration cards use the previous Reanimated card path because celebration still reads shared Reanimated bindings.
- The native card path uses `measureInWindow` and the existing JS flight snapshot mirror, avoiding `useSharedValue`, `useAnimatedStyle`, `useAnimatedRef`, UI-thread `measure()`, and `runOnJS` for ordinary card moves.

Files modified:

- `src/features/klondike/components/cards/CardView.tsx`
- `src/features/klondike/components/cards/FoundationPile.tsx`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `docs/product/game-history-performance/fabric-view-retention-root-fix.md`

Verification before Android sample:

- `yarn typecheck`
- `yarn lint`
- `yarn format:check`
- `git diff --check`

Next sample:

- Rebuild/install release APK.
- Run 10-game harness with `cardFlights=1`, celebrations on, persistence on, history on.
- Expected signal: `cards.summary` should no longer report thousands of Reanimated card mounts during ordinary moves. Any remaining card-summary mounts should mostly cluster around win celebration.

## 2026-06-25 Reanimated-preserving analysis refresh

Scope:

- Answer the explicit question: if we keep Reanimated as a core animation dependency, what is the best path?
- Treat this as an analysis/planning pass only. No product code should be changed from this section alone.
- The current worktree also contains a partly implemented React Native `Animated` transient-card experiment from the previous branch of investigation. The Reanimated-preserving path below is the alternative: keep Reanimated, but stop using it as a per-card/per-move resident system.

Sources refreshed on 2026-06-25:

- Reanimated performance guide: https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/
- Reanimated feature flags: https://docs.swmansion.com/react-native-reanimated/docs/guides/feature-flags/
- Reanimated compatibility table: https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/
- Worklets feature flags: https://docs.swmansion.com/react-native-worklets/docs/guides/feature-flags/
- Expo SDK reference: https://docs.expo.dev/versions/latest/
- Expo Reanimated SDK page: https://docs.expo.dev/versions/latest/sdk/reanimated/
- Upstream Android memory issue: https://github.com/software-mansion/react-native-reanimated/issues/9650
- Upstream worklet-compilation memory issue: https://github.com/software-mansion/react-native-reanimated/issues/9438
- Upstream Worklets remote-function cycle fix: https://github.com/software-mansion/react-native-reanimated/pull/9673
- Local package metadata: `package.json`, `yarn.lock`, `node_modules/expo/bundledNativeModules.json`, `node_modules/expo-modules-core/package.json`, and `npm view` for Reanimated/Worklets peer ranges.

Key guide takeaways for Soli:

| Official guidance                                                                                                             | What it means for Soli                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New Architecture can regress animation performance, especially after Expo SDK 53+.                                            | Soli is on Expo SDK 56 / RN 0.85 / Fabric. We should assume Reanimated performance is sensitive and verify with release-device 10-game memory/timing runs.                                     |
| Do not animate too many components at once. The guide gives a low-end Android rule of thumb of about 100 animated components. | A full board can easily approach or exceed that when each card has an outer animated container and an inner flip wrapper, plus slots, scrubber, foundation glow, and celebration bindings.     |
| Prefer `transform`/`opacity` over layout styles.                                                                              | Soli is mostly good here. Card movement should stay as transforms and opacity; avoid animated `top`, `left`, width, height, margins, and padding.                                              |
| Avoid reading shared values on JS.                                                                                            | Soli already uses a JS mirror for card-flight snapshots, which is the right instinct. We should keep moving geometry ownership toward JS snapshots and away from JS reads of UI shared values. |
| Memoize gestures and frame callbacks.                                                                                         | Undo gestures are memoized. No `useFrameCallback` usage was found. The bigger scrubber risk is not memoization; it is frequent UI-to-JS callbacks during pan.                                  |
| Static flags can improve non-layout prop updates, but can affect touch handling and commit consistency.                       | We already tested `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS=true`; it did not flatten memory. It remains an FPS tuning candidate, not the root fix.                                               |

Current version matrix:

| Scenario                          | Expo / RN / React                                                                                         | Reanimated                                          | Worklets                                            | Other coupled native pieces                                  | Compatibility                                                                                                                           | Recommendation                                                                                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Current Expo SDK 56 stable bundle | Expo `56.0.12` installed; official SDK 56 targets RN `0.85` and React `19.2.3`; installed RN is `0.85.3`. | `4.3.1`                                             | `0.8.3`                                             | Expo Modules Core `56.0.17` peers Worklets `^0.7.4           |                                                                                                                                         | ^0.8.0`; RNGH `2.31.2`; Screens `4.25.2`; Tamagui `2.2.0`.                                                                                                       | Fully aligned with Expo bundle and Reanimated npm peer ranges (`react-native` `0.81 - 0.85`, Worklets `0.8.x`). | Best production-compatible baseline. Fix app-level Reanimated residency/churn here first. |
| Reanimated 4.4 line               | Expo SDK 56 / RN `0.85.3` / React `19.2.3`.                                                               | `4.4.1`                                             | `0.9.x`                                             | Expo Modules Core `56.0.17` does not peer Worklets `0.9.x`.  | Reanimated peer range allows RN `0.83 - 0.86`, but Expo's native module peer range does not align.                                      | Not attractive. It crosses Expo's Worklets range and upstream issue `#9650` reports Android import-level memory growth on Reanimated `4.4.0` / Worklets `0.9.1`. |
| Reanimated 4.5 line               | Expo SDK 56 / RN `0.85.3` / React `19.2.3`.                                                               | `4.5.0`                                             | `0.10.x`                                            | Expo Modules Core `56.0.17` does not peer Worklets `0.10.x`. | Reanimated/RN peer range is OK (`0.83 - 0.86`), but Expo Modules Core is not. Our prior Android release build failed in native linking. | High-value isolated experiment only, because it is the first stable line after PR `#9673`. Not a drop-in app fix under SDK 56.                                   |
| Reanimated 4.6 nightly line       | Not in stable Expo SDK 56.                                                                                | `4.6.0-nightly-*`                                   | `0.11.0-nightly-*`                                  | Outside Expo bundle.                                         | Investigation-only.                                                                                                                     | Use only in a throwaway canary/native-stack branch if the app-level Reanimated-minimal model still leaks.                                                        |
| Expo canary / future SDK          | Expo docs allow canary package sets but warn they are pre-release.                                        | Determined by `expo install --fix` for that canary. | Determined by `expo install --fix` for that canary. | Full native stack changes together.                          | Potentially compatible, but broad.                                                                                                      | Useful later to see whether Expo picks up newer Worklets; too broad for the main fix right now.                                                                  |
| Reanimated 3                      | Older line.                                                                                               | `3.x`                                               | None.                                               | Old Architecture compatible.                                 | Reanimated docs say Reanimated 4 is New Architecture only and Reanimated 3 is no longer actively maintained.                            | Do not downgrade. It would hide the SDK 56 runtime shape instead of fixing the app.                                                                              |

Feature-flag fit:

| Flag                                         | Available in our current `4.3.1`?                      | Soli fit                                                                                                                                         | Decision                                                                            |
| -------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`      | Yes, added in Reanimated 4.0.                          | Fits transform/opacity movement, but can break Fabric touch hit-testing for transformed React Native `Pressable`.                                | Already tested. Did not flatten memory. Do not keep as root fix.                    |
| `USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS`     | Yes; default true for Reanimated 4.3+.                 | Helps lower FPS during scrolling/many animated components.                                                                                       | Already implicitly present through default. Not a root lever.                       |
| `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS`  | Yes; default true for Reanimated 4.3+.                 | Can reduce settled animated-style registry work, but changes detach behavior.                                                                    | Already implicitly present through default. Monitor, but do not add special config. |
| `USE_SYNCHRONIZABLE_FOR_MUTABLES`            | Yes; default true for Reanimated 4.3+.                 | Helps shared value reads on RN runtime. We should still avoid JS shared-value reads.                                                             | Already implicitly present through default.                                         |
| `DISABLE_COMMIT_PAUSING_MECHANISM`           | Yes.                                                   | Docs say safe only with RN `preventShadowTreeCommitExhaustion` enabled from source. Our issue is memory/native runtime slope, not scroll jitter. | Do not use for this issue.                                                          |
| `USE_ANIMATION_BACKEND`                      | No; added in Reanimated 4.4.                           | Experimental and requires RN `0.85.2+` with RN experimental feature flag/release level.                                                          | Not production path. Dedicated branch only if we exhaust app-level fixes.           |
| Worklets `ENABLE_CROSS_RUNTIME_STACK_TRACES` | Not in our current Worklets `0.8.3`; added in `0.9.0`. | Dev-only and can hurt performance with many scheduling calls.                                                                                    | Not relevant to release slowdown; do not chase.                                     |

Codebase Reanimated surfaces if we stick with Reanimated:

| Surface                                                           | Current shape                                                                                                                                                            | Risk                                                                                                                      | Reanimated-preserving mitigation                                                                                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card movement and flip (`CardView`, `animations.ts`)              | Per active Reanimated card: animated ref, several shared values, two animated styles, UI-thread `measure()`, shared registry mutation, and multiple `runOnJS` callbacks. | Highest. Our samples show thousands of animated card mounts/unmounts and Native/Unknown memory still rising.              | Do not create/destroy Reanimated hook instances per move. Use a stable, bounded overlay pool of Reanimated card renderers, e.g. 8-16 slots, while normal board cards stay plain. |
| Flight geometry (`flightController.ts`)                           | A long-lived shared object registry plus JS mirror.                                                                                                                      | Medium/high. Mutable shared object state for all cards increases serialization/worklet surface.                           | Keep JS mirror as source of truth. Send only active overlay slot geometry into Reanimated shared values.                                                                         |
| Undo scrubber (`useUndoScrubber.ts`, `UndoScrubber.tsx`)          | UI-thread pan uses many mirrored shared values and calls `runOnJS(scheduleScrubDispatch)` on index changes.                                                              | Medium. It resembles the upstream remote-callback retention shape, and the UI gesture eventually commits JS state anyway. | Consider `.runOnJS(true)` for pan, or keep UI pan but call JS only on start/end and RAF-throttle updates aggressively.                                                           |
| Celebration (`useCelebrationController.ts`, card animated styles) | All celebration-capable card worklets read shared celebration bindings; a win can animate many cards at once.                                                            | Medium/high during wins. It violates the "many components" caution more than normal play.                                 | Move celebration into its own temporary overlay/pool. The normal board cards should not subscribe to celebration shared values throughout every game.                            |
| Empty slots / simple fades                                        | `EmptySlot` uses Reanimated for opacity/scale.                                                                                                                           | Low individually, but adds resident animated views.                                                                       | Keep only if convenient; otherwise replace with static/RN Animated. Not the first lever.                                                                                         |
| Tamagui Reanimated driver                                         | Normal native config loads `@tamagui/config/v5-reanimated`.                                                                                                              | Medium uncertainty. No-Reanimated A/B removed both app Reanimated and Tamagui's driver.                                   | Keep the existing Tamagui-driver A/B path. If app-level Reanimated-minimal still leaks, rerun with Tamagui driver isolated.                                                      |

Reanimated-preserving architecture recommendation:

1. Keep Reanimated as a dependency and animation engine on the current Expo SDK 56 bundle.
2. Stop making every moving logical card mount its own fresh Reanimated hook graph.
3. Render normal board cards as plain React Native views.
4. Create one board-level `ReanimatedCardOverlayLayer` with a small fixed pool of animated slots.
5. On a move, measure or read JS-owned source/destination snapshots, assign one overlay slot per moving card, hide or visually mask the static source/destination card only for the flight window, and animate the overlay slot with Reanimated `transform`/`opacity`.
6. When the flight settles, clear the overlay slot and show the static destination card.
7. Use the same overlay/pool idea for invalid wiggle, flip feedback, foundation glow, and win celebration, rather than keeping all card views subscribed to celebration state.
8. Move or reduce the undo scrubber UI-thread `runOnJS` hot path because it is not the core card animation UX and it creates extra Worklets callback traffic.

Why this makes sense:

- It keeps the user-visible reason we use Reanimated: smooth card movement.
- It follows the guide's "not too many animated components" rule more directly than static flags.
- It avoids the pattern our samples point at: thousands of repeated Reanimated hook/component lifetimes in one long-lived game screen.
- It keeps us inside Expo SDK 56's known-good native dependency bundle, instead of mixing Worklets versions Expo Modules Core does not support.

What not to do as the main fix:

- Do not reduce completed history. Restarting the app with huge history being fast already disproves history as the primary process-lifetime cause.
- Do not rely on `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`; the A/B failed for memory.
- Do not jump to Reanimated `4.5.0` / Worklets `0.10.0` in the main branch while Expo Modules Core is pinned to Worklets `0.7/0.8`.
- Do not leave the current per-card Reanimated hook model and only tune flags. That is unlikely to solve the observed Native/Unknown memory slope.

Suggested next Reanimated-only experiment:

- Revert or set aside the React Native `Animated` transient-card experiment.
- Implement only a stable Reanimated overlay pool for ordinary card flights.
- Keep celebration off for the first 10-game run if possible to isolate ordinary move churn; then run with celebrations on.
- Success criterion: Game 1 -> Game 10 PSS, Native Heap, and Unknown should plateau or be close to the no-Reanimated diagnostic class. A mere 20-30% reduction is not enough because it only delays the same failure.

## 2026-06-26 stable Reanimated overlay-pool implementation

Goal:

- Keep Reanimated for core card motion, but make the Reanimated surface stable and bounded.
- Preserve plain/static board cards as the default.
- Stop creating a fresh Reanimated hook graph for every transient card move.

Implementation plan:

- [completed] Add a board-level `CardFlightOverlayLayer` with a fixed slot pool of Reanimated animated views.
- [completed] Feed overlay flights from the existing JS card-flight snapshot mirror in `useKlondikeGame`.
- [completed] Hide the static destination card only while its overlay slot is active.
- [completed] Keep celebration on the existing Reanimated path for now, then measure whether ordinary move churn is solved before moving celebration.
- [completed] Remove or bypass the partial React Native `Animated` transient-card experiment for ordinary card moves.
- [completed] Run typecheck/lint/format checks.
- [pending] Run a 10-game Android release memory sample and compare PSS/Native/Unknown slope.

Why this is the next implementation:

- The official Reanimated guidance says to avoid too many animated components.
- The no-Reanimated diagnostic was flat, and the reduced-residency sample improved but still showed thousands of animated-card mounts/unmounts.
- A fixed overlay pool lets us keep the UX value of Reanimated while attacking the measured lifetime churn directly.

Verification before Android sample:

- Passed: `yarn oxfmt src/features/klondike/hooks/useKlondikeGame.ts src/features/klondike/components/cards/CardView.tsx src/features/klondike/components/cards/CardFlightOverlayLayer.tsx src/features/klondike/components/KlondikeGameView.tsx src/features/klondike/components/cards/TopRow.tsx src/features/klondike/components/cards/TableauSection.tsx src/features/klondike/components/cards/FoundationPile.tsx src/features/klondike/components/cards/WasteFan.tsx src/features/klondike/components/cards/StockStack.tsx src/features/klondike/components/cards/animations.ts`.
- Passed: `yarn typecheck`.
- Passed: `yarn lint`.
- Passed: `yarn format:check`.
- Passed: `git diff --check`.

## 2026-06-26 contaminated overlay-pool Android samples

Samples that must not be used for root-cause decisions:

- `tmp/perf-samples/reanimated-overlay-pool-10x-signed-20260626-095430`
- `tmp/perf-samples/reanimated-overlay-pool-celebrations-off-10x-20260626-095826`

Finding:

- These samples were run from a signed APK that included a temporary `CardView` patch from another chat.
- The release sourcemap at `android/app/build/intermediates/sourcemaps/react/release/index.android.bundle.packager.map` showed the bundled `CardView.tsx` returning `<ReanimatedCardView {...props} />` for every card, with the temporary comment about `Property 'markCardsAnimated' doesn't exist`.
- The on-disk `CardView.tsx` had been undone after the APK was already built/installed. File timestamps confirmed the APK was updated at `2026-06-26 09:55:00`, while `CardView.tsx` changed again at `2026-06-26 09:55:55`.
- The large `cards.summary` `flightStarted` counts in those samples are therefore expected: the APK routed ordinary cards through the old per-card Reanimated path, not the intended static-board plus stable overlay-pool path.

Decision:

- Discard the memory and timeout conclusions from these two samples.
- Rebuild and reinstall a fresh signed release APK from the current source before running the 10-game overlay-pool sample again.

## 2026-06-26 clean overlay-pool Android sample

Sample root:

- `tmp/perf-samples/reanimated-overlay-pool-clean-10x-20260626-101821`

Validity checks:

- The signed release build was rebuilt after the rogue `CardView` edit was undone.
- The release sourcemap was inspected before install. Bundled `CardView.tsx` contained the intended static/native/Reanimated split and did not contain the temporary `Property 'markCardsAnimated' doesn't exist` comment or unconditional `<ReanimatedCardView />` return.
- Installed package `ch.karimattia.soli` had `lastUpdateTime=2026-06-26 10:18:09`.
- The 10-game playlist completed successfully with celebrations on.

Memory result:

| Checkpoint          | Total PSS | Native heap PSS | Unknown PSS | Java/Dalvik heap PSS | Views |
| ------------------- | --------: | --------------: | ----------: | -------------------: | ----: |
| Game 1              |    472 MB |          287 MB |       82 MB |                28 MB |   308 |
| Game 5              |    501 MB |          308 MB |       97 MB |                20 MB |   308 |
| Game 8              |    571 MB |          342 MB |      112 MB |                39 MB |   308 |
| Game 9              |    583 MB |          347 MB |      118 MB |                40 MB |   308 |
| Game 10             |    569 MB |          347 MB |      122 MB |                23 MB |   633 |
| Final marked sample |    606 MB |          354 MB |      122 MB |                42 MB |   633 |

10-game delta:

- Game 1 -> Game 10 Total PSS: `+96 MB`
- Game 1 -> Game 10 Native heap PSS: `+59 MB`
- Game 1 -> Game 10 Unknown PSS: `+40 MB`

Comparison to prior valid baselines:

- Previous corrected baseline-class runs grew roughly `+650 MB` to `+750 MB` PSS over 10 games and ended around `1.15 GB` to `1.35 GB` PSS.
- The clean overlay-pool run ended around `569 MB` PSS at game 10 and `606 MB` after final marking while the final celebration view tree was still mounted.
- This is not as low as the no-Reanimated diagnostic, but it changes the behavior class from runaway growth to a much smaller slope.

De-duplicated event result:

- Ordinary movement used the overlay pool: about `171` to `268` `cardFlightOverlay.start` events per game, with no drops.
- Remaining per-card Reanimated churn was about one win-celebration batch per game: generally `52` card mounts and `52` unmounts, plus celebration-related layout/snapshot/flight counters.
- Persistence writes were no longer the late-game bottleneck in this run: per-game write p90 was usually about `4 ms` to `8 ms` after game 1.
- Per-game durations stayed in a narrow band: roughly `12.1 s` to `16.2 s`, instead of stretching toward `40 s+`.
- `__remoteFunctionRegistry` stayed absent in runtime summaries.

Interpretation:

- The stable Reanimated overlay pool fixes the dominant memory class. The earlier huge Native/Unknown slope was tied to repeated per-card Reanimated hook/view lifetimes during ordinary moves.
- Completed history, active history retention, and persistence are still not the root memory cause.
- The remaining native/unknown growth is much smaller and plausibly comes from residual Reanimated surfaces that still mount per game, especially the win celebration stack and foundation glow path.

Next decision:

- Keep the overlay-pool architecture.
- Do not reduce history.
- Do not force every card back through Reanimated; the contaminated samples prove that path reintroduces the old behavior.
- Before calling the issue fully solved, run either a longer clean overlay sample or move celebration onto a bounded overlay/static path and compare whether the remaining `+96 MB` 10-game slope flattens further.

## 2026-06-26 clean overlay-pool celebration isolation

Sample root:

- `tmp/perf-samples/reanimated-overlay-pool-clean-celebrations-off-10x-20260626-102320`

Result:

| Variant                         | Game 1 PSS / Native / Unknown | Game 10 PSS / Native / Unknown |      10-game delta |       Final sample | Game 10 views | Notes              |
| ------------------------------- | ----------------------------: | -----------------------------: | -----------------: | -----------------: | ------------: | ------------------ |
| Clean overlay, celebrations on  |             472 / 287 / 82 MB |             569 / 347 / 122 MB | +96 / +59 / +40 MB | 606 / 354 / 122 MB |           633 | 10 games completed |
| Clean overlay, celebrations off |             431 / 254 / 73 MB |              436 / 255 / 72 MB |    +6 / +1 / -1 MB |  420 / 246 / 69 MB |           279 | 10 games completed |

Interpretation:

- The ordinary card-flight overlay pool is working: with celebrations off, memory is effectively flat across 10 games.
- The remaining Native/Unknown slope in the celebrations-on run is caused by the win celebration path, not completed history, active undo history, persistence, or ordinary card movement.
- The celebration-on run still mounted one per-card Reanimated celebration batch per completed game (`52` cards in the normal case), and the final sample retained the large celebration view tree (`633` views).

Next implementation:

- Keep ordinary card motion on the stable `CardFlightOverlayLayer`.
- Move win celebration away from rendering the full foundation stacks through `ReanimatedCardView`.
- Replace it with a bounded board-level celebration overlay, or a static/non-Reanimated celebratory effect if the bounded overlay can preserve the visual affordance with less risk.

## 2026-06-26 bounded win-celebration overlay implementation

Goal:

- Preserve the win celebration UX while removing the last measured per-game Reanimated card remount batch.
- Keep ordinary foundation piles static during celebration instead of rendering all 52 foundation cards through `ReanimatedCardView`.
- Keep the celebration Reanimated surface bounded and stable across games.

Implementation plan:

- [completed] Add a board-level `CelebrationOverlayLayer` with 52 stable Reanimated slots.
- [completed] Reuse the existing `CelebrationState`, `CelebrationBindings`, and `computeCelebrationFrame` math so the visual trajectory stays the same.
- [completed] Change `FoundationPile` to render only the top static foundation card during celebration, removing `forceReanimated={celebrationActive}`.
- [completed] Hide the static foundation top cards while the celebration overlay owns the visual copies, without showing empty foundation outlines.
- [completed] Render the celebration overlay from `KlondikeGameView` above the normal board and below the touch blocker/debug badge.
- [completed] Run typecheck/lint/scoped diff checks.
- [completed] Rebuild/install Android release and run the 10-game celebrations-on checkpoint sample.

Acceptance criteria:

- The clean celebrations-on 10-game run should stay close to the celebrations-off memory class.
- The final sample should not show a large final celebration view-tree spike from remounting all foundation cards through the normal board.
- The `CardView` source/bundle must still contain the intended static/native/Reanimated split, not the temporary unconditional Reanimated fallback from the contaminated run.

Verification:

- Passed: `yarn typecheck`.
- Passed: `yarn lint`.
- Passed: scoped `git diff --check` for the modified files.
- Passed: Android release build with `GRADLE_USER_HOME=/tmp/soli-gradle YARN_GLOBAL_FOLDER=/tmp/soli-yarn-global ./gradlew app:assembleRelease --no-daemon --console=plain`.
- Passed: release sourcemap check showed no `markCardsAnimated` rogue fallback, `CardView` still had the static/native/Reanimated split, and `CelebrationOverlayLayer` was bundled.
- Installed package `ch.karimattia.soli` `versionName=0.8.0`, `versionCode=13`, `lastUpdateTime=2026-06-26 10:40:46`.

10-game Android release sample:

- Sample root: `tmp/perf-samples/reanimated-celebration-overlay-clean-10x-20260626-104046`
- Variant: card flights on, celebrations on, persistence on, history recording on.
- The first run attempt did not start gameplay because the phone keyguard stayed locked; rerunning after `scripts/android-unlock-pattern.sh --serial 192.168.1.12:40591` succeeded. Treat the failed attempt as preflight noise, not gameplay evidence.

Memory result:

| Checkpoint          | Total PSS | Native heap PSS | Unknown PSS | Dalvik heap PSS | Views |
| ------------------- | --------: | --------------: | ----------: | --------------: | ----: |
| Game 1              |    510 MB |          312 MB |       78 MB |           44 MB |   361 |
| Game 5              |    494 MB |          308 MB |       89 MB |           18 MB |   361 |
| Game 8              |    502 MB |          308 MB |       77 MB |           38 MB |   361 |
| Game 9              |    502 MB |          314 MB |       72 MB |           38 MB |   384 |
| Game 10             |    484 MB |          307 MB |       75 MB |           22 MB |   550 |
| Final marked sample |    494 MB |          317 MB |       75 MB |           16 MB |   550 |

10-game delta:

- Game 1 -> Game 10 Total PSS: `-26 MB`
- Game 1 -> Game 10 Native heap PSS: `-5 MB`
- Game 1 -> Game 10 Unknown PSS: `-3 MB`
- Game 1 -> Game 10 Dalvik heap PSS: `-22 MB`

Runtime/log result:

- Playlist completed all `10` games.
- Per-game durations stayed flat: game 1 `13.2 s`, game 10 `13.5 s`, total `137.7 s`.
- Overlay flights started/completed exactly: `2106` starts, `2106` completes, `0` drops.
- `cards.summary` events were absent, confirming the previous per-card `ReanimatedCardView` celebration mount/unmount batch is gone.
- Worklets runtime diagnostics still showed `__remoteFunctionRegistry` absent.
- Game 10 view count was `550` because the 52-card celebration overlay was active at capture time. This is a bounded active-effect view tree, not cumulative retained views; the old contaminated/previous celebration path ended around `633` views.

Conclusion:

- The ordinary move overlay plus bounded celebration overlay changes the 10-game behavior from runaway native/unknown memory growth to a flat memory profile, with celebrations enabled.
- The root cause was not completed history. It was repeated long-lived-process native/runtime churn from per-card Reanimated surfaces, first during ordinary card movement and then in the residual win celebration path.

## 2026-06-26 smooth animation architecture follow-up

Goal:

- Keep the flat memory profile from the overlay-pool fix.
- Restore release-quality card animations: invalid wiggle, tableau/foundation/waste flights, stock draw, and face-up reveal/flip.
- Add an objective animation smoke loop so visible regressions can be caught before manual play.

Current source-level diagnosis:

- The memory fix intentionally made idle board cards render through `StaticCardView`. That removes the per-card Reanimated lifetime churn, but it also means normal idle cards no longer own flip or wiggle animations.
- Invalid wiggle is currently routed by making the affected card use `NativeAnimatedCardView` only after `invalidWiggle.lookup` contains its id. `NativeAnimatedCardView` initializes `lastTriggerRef` from the current invalid-wiggle key, so the component can mount already "caught up" and skip the first wiggle. This matches the observed "wiggle does not work at all."
- Flip/reveal is still implemented inside the animated card paths. A static card switches front/back immediately from `card.faceUp`, so a newly revealed card can no longer perform the old two-step scale flip. This matches the missing turn-card animation.
- The new flight overlay currently starts only after the reducer commit renders the destination card, the destination layout is measured, and `handleCardMeasured` creates an overlay item. There is at least one possible paint where the destination card is visible before `flightOverlayHiddenCardIds` hides it. This explains the observed "card flashes at the new location, jumps back, then flies."
- Stock draw is the same class of problem as tableau flight: the destination waste card can become visible before the overlay owns the transient visual.
- The Reanimated animation itself uses `withTiming` on the UI thread, but the start handshake is JS/state/layout mediated and uses `requestAnimationFrame`. That does not reintroduce the memory leak, but it can add a one-frame start delay or visible timing jitter.

Could the rogue `CardView` change have messed with results?

- It did contaminate the two samples already marked invalid in this file.
- The clean memory result was rebuilt after the rogue edit was undone, and the release sourcemap check proved the bundled `CardView.tsx` contained the intended static/native/Reanimated split, not the temporary unconditional `ReanimatedCardView` route.
- The first failed run before the clean result was the keyguard/install preflight issue, not win-animation evidence. The later 10-game `reanimated-celebration-overlay-clean-10x-20260626-104046` result is the one to trust for memory.

External guidance used for the next animation pass:

- Reanimated performance guide: keep animations on non-layout properties, avoid too many animated components, avoid JS shared-value reads, and be careful under the New Architecture/Fabric runtime.
- Reanimated `useFrameCallback`: useful for a dev-only frame sampler during active animations, but callback work must stay tiny and be memoized/limited to active smoke tests.
- React Native performance guide: JS thread stalls can delay animation setup and touch response, while UI-thread/native-driver style animations can continue once started.
- Android rendering/performance docs: use frame timing/jank measurements such as `dumpsys gfxinfo` or Macrobenchmark-style frame timing for objective frame evidence, not video alone.

Architecture options:

| Option                         | Description                                                                                                                                 | Pros                                                                                              | Cons                                                                                           | Recommendation |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------- |
| Patch current overlay          | Keep `CardFlightOverlayLayer`, pre-hide destination cards earlier, fix `NativeAnimatedCardView` trigger init, and add flip handling.        | Smallest code change; likely fixes the obvious regressions quickly.                               | Still leaves transient behavior split across static cards, native Animated cards, and overlay. | Good first patch only if we need a quick confirmation build. |
| Unified transient visual layer | Keep board cards static. A single stable `CardVisualOverlayLayer` owns flights, wiggles, flips, stock draw, and celebration with fixed slots. | Preserves memory fix; one place owns animation timing, hiding, logging, and frame measurement.    | Larger refactor; needs careful source/destination snapshot model.                              | Recommended architecture. |
| Full absolute card scene       | Render every card in one board-level scene with stable ids and absolute positions.                                                          | Maximum control over motion, z-order, and transitions.                                           | Very invasive; risks rewriting interaction/layout more than needed.                            | Save for later only if unified overlay cannot meet UX. |
| Re-enable per-card Reanimated  | Return to old per-card animated card ownership.                                                                                             | Restores many old animations quickly.                                                            | Reintroduces the measured native/unknown memory root cause.                                    | Do not use. |

Recommended architecture:

1. Keep normal board cards static and memory-safe.
2. Promote `CardFlightOverlayLayer` into a broader `CardVisualOverlayLayer` with stable slots for transient effects.
3. Create an animation transaction before reducer dispatch:
   - capture source snapshots and the visual card data from the pre-action state,
   - determine the affected card ids,
   - immediately add those ids to a `pendingHiddenCardIds` set so the next commit does not flash the destination,
   - dispatch the reducer action,
   - bind destination snapshots as cards measure after the commit,
   - start or complete the overlay effect,
   - reveal static board cards only after the overlay completes.
4. Move invalid wiggle into the overlay layer:
   - if the card has a snapshot, render a temporary overlay copy and wiggle it,
   - hide the static card during the wiggle only if needed to avoid double images,
   - log start/complete/frame metrics.
5. Move flip/reveal into the overlay layer:
   - keep the static destination hidden,
   - render a back-side overlay at the card snapshot,
   - run scaleX to zero, swap front/back at midpoint, scaleX back to one,
   - reveal the static face-up card when complete.
6. Treat stock draw as a first-class transaction:
   - source is the stock top snapshot,
   - destination is the new waste/fan snapshot,
   - both static copies are hidden until the overlay owns the transition.
7. Keep the 52-slot celebration overlay as a separate bounded effect unless the new overlay abstraction naturally absorbs it without making the code harder to understand.

Independent smoothness test strategy:

- Add a dev-only animation smoke runner, preferably driven by ADB/deep link, for deterministic fixtures:
  - `tableau-flight`
  - `stock-draw`
  - `invalid-wiggle`
  - `flip-reveal`
  - `foundation-flight`
  - optional `celebration`
- Each case should reset `dumpsys gfxinfo`, run exactly one or a short fixed burst of actions, dump persisted perf logs, capture `gfxinfo`, and optionally record a short screen video.
- Add app-side animation lifecycle logs:
  - `animation.transaction.queued`
  - `animation.staticHidden`
  - `animation.overlayVisible`
  - `animation.overlayStarted`
  - `animation.overlayCompleted`
  - `animation.staticRevealed`
  - include `animationCase`, `cardId`, `requestId`, source/destination snapshots, slot, and elapsed milliseconds from queue.
- Add a dev-only frame sampler using Reanimated `useFrameCallback` only while an overlay effect is active:
  - count frames,
  - summarize frame deltas with p50/p90/p95/p99/max,
  - count deltas over 16.7 ms, 24 ms, and 34 ms,
  - log the active effect count and case name.
- Add pixel/video checks where practical:
  - before `overlayVisible`, destination card pixels must not appear in the destination rectangle for a move/stock draw,
  - during `invalid-wiggle`, the card x-position should move negative and positive before returning to center,
  - during `flip-reveal`, at least one sampled frame should show the narrow mid-flip state and the face should not swap before midpoint,
  - after completion, the static destination card should be visible and the overlay slot should be empty.
- Extend `scripts/run-demo-autosolve.js` or add `scripts/run-animation-smoke.js` so it writes artifacts under `tmp/perf-samples/animation-smoke-*`, similar to the 10-game harness.

Animation acceptance criteria:

- Memory: the 10-game release run with animations and celebrations on remains flat in the same class as `reanimated-celebration-overlay-clean-10x-20260626-104046`; target Game 1 -> Game 10 Total PSS delta within about `+50 MB`, Native within `+30 MB`, Unknown within `+30 MB`.
- Flight flash: `0` pixel-test failures for destination-first flashes in `tableau-flight`, `foundation-flight`, and `stock-draw`.
- Flight start: overlay visible within `<= 1` frame after the reducer commit for simple move cases, with no visible jump-back.
- Frame pacing: active overlay p95 frame delta `<= 20 ms`, p99 `<= 34 ms` on the connected Android device for the smoke cases.
- Wiggle: invalid move produces both negative and positive x displacement and completes within the configured wiggle duration.
- Flip: reveal animation uses midpoint face swap; the card does not switch from back to front instantly.
- Slot health: overlay starts equal overlay completes; `0` drops in smoke tests and the 10-game run.

Plan: Files to modify for the smooth-animation pass:

- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/components/KlondikeGameView.tsx`
- `src/features/klondike/components/cards/CardFlightOverlayLayer.tsx` or replacement `CardVisualOverlayLayer.tsx`
- `src/features/klondike/components/cards/CardView.tsx`
- `src/features/klondike/components/cards/TopRow.tsx`
- `src/features/klondike/components/cards/TableauSection.tsx`
- `src/features/klondike/components/cards/StockStack.tsx`
- `src/features/klondike/components/cards/WasteFan.tsx`
- `src/features/klondike/components/cards/FoundationPile.tsx`
- `src/utils/perfDiagnostics.ts`
- `scripts/run-animation-smoke.js` or an extension of `scripts/run-demo-autosolve.js`
- This Markdown plan.

Steps to implement:

- [completed] Document the animation regressions and source-level cause.
- [pending] Add the dev-only animation smoke runner and app-side lifecycle/frame logs.
- [pending] Refactor the flight overlay state into transaction-style pre-hide semantics.
- [pending] Fix tableau/foundation/waste/stock flight flicker using the transaction model.
- [pending] Move invalid wiggle into the bounded overlay model or fix its trigger lifetime without increasing resident Reanimated card count.
- [pending] Move flip/reveal into the bounded overlay model.
- [pending] Run `yarn typecheck`, `yarn lint`, and focused unit tests.
- [pending] Build/install Android release and run the animation smoke loop.
- [pending] Run the 10-game memory harness again with animations and celebrations enabled.

Testing plan:

- Automated checks: `yarn typecheck`, `yarn lint`, focused tests for transaction/hiding helpers if added.
- Android release smoke: build/install a release APK on the phone and run the animation smoke cases through ADB.
- Visual evidence: save smoke logs, `gfxinfo`, and optional screen recordings/screenshots under `tmp/perf-samples/animation-smoke-*`.
- Regression gate: after visual fixes pass, rerun the 10-game memory harness to prove the smooth-animation architecture did not reintroduce native/unknown growth.
