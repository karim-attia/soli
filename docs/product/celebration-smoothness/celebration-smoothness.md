# Celebration Smoothness Fix + Full Review

## User prompt

> some celebrations have short jumps sometimes. not all. pls fix so that they are all smooth. celebrations was super quickly hacked together. any general improvement recommendations? list in table. more ideas for new celebrations? list them in table. pls fully review. anything else?

Follow-up (2026-07-07):

> For removing dead suitIndex code, I'm confident it's unused in computeCelebrationFrame, though we'd likely re-add it later if implementing suit orbits. i might want to do that, so should we keep this? also the array index... maybe we remove celebrations later and i'd like the identification to be stable. this doesnt cost anything... should we undo all of this?
>
> would it make sense to implement all additional celebrations now? or are some difficult and should be done separately?
>
> suit orbits is all 4 suits at same time, right? should we also do one celebration per suit?

## Summary

Fixed the periodic "short jumps" in win celebrations. Root cause: `computeCelebrationFrame` wrapped its cycle progress with `% 1` every ~5.8 s. Modes whose trig terms use non-integer multiples of `theta` (modes 2, 3, 10, 11) are not periodic over one cycle, so the card positions/rotations teleported at every wrap. The overlay wobble (frequencies 5.5×1.25 and 5.5×0.95) had the same defect in all modes, just smaller. Fix: remove the wrap — all paths are continuous functions of progress, so unwrapped progress is smooth for every mode by construction. Added a regression unit test that samples every mode across all former wrap boundaries.

## Description

Win celebrations animate the 52 foundation cards along one of 20 procedural paths for 60 s. The math lives in `src/animation/celebrationModes.ts` (worklet-safe pure function), driven by a single Reanimated shared `progress` (0→1 over 60 s, linear), consumed per-slot in `CelebrationOverlayLayer` via `useAnimatedStyle`.

## Acceptance Criteria

- No visible position/rotation jump in any of the 20 modes over the full 60 s run.
- Unit test fails if a `% 1` wrap (or other discontinuity at former cycle boundaries) is reintroduced.
- `yarn typecheck && yarn lint && yarn jest` green.

## Root cause detail

- `totalProgress = progress * 10.4`; old code: `rawProgress = totalProgress % 1` → wraps every ~5.77 s.
- Continuous across the wrap only if every trig argument is an integer multiple of `TAU * rawProgress`.
- Violations: mode 2 (`theta * 1.5`), mode 3 (`theta * 1.5`, rotation wraps by 540° → visible 180° flip), mode 10 (`theta * 1.5`), mode 11 (`theta * 1.7`, `theta * 2.3`), and the wobble in `CelebrationOverlayLayer` (5.5 × 1.25 = 6.875, 5.5 × 0.95 = 5.225) affecting all modes slightly.

## Fix

- `const rawProgress = totalProgress` (no wrap) + inline comment explaining why the wrap must never come back.
- Everything downstream (theta, thetaSeed, thetaDouble, wobble phase) becomes a continuous function of time. Rotation values grow unbounded (up to ~7500°) which is fine for a per-frame `rotate` transform.

## Steps to implement

- [x] Remove `% 1` wrap in `computeCelebrationFrame`, add documentation comment.
- [x] Add regression test `test/unit/animation/celebrationModes.test.ts` (continuity across all former wrap boundaries, all 20 modes).
- [x] Run `yarn typecheck && yarn lint && yarn jest`. (all green, 24 suites / 204 tests passed)

## Files actually modified

- `src/animation/celebrationModes.ts` (wrap fix; later: names array instead of `{id, name}` metadata list, `suitIndex` removed from `CelebrationAssignment`)
- `test/unit/animation/celebrationModes.test.ts` (new; later: `suitIndex` removed)
- `src/features/klondike/hooks/useCelebrationController.ts` (dead `suit`/`suitIndex` removed from `CelebrationCardConfig`, label fallback simplified)
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` (dead `suitIndex` pass-through removed)

## Identified issues (full review, beyond the fix)

| # | Issue | Severity | Status |
| - | ----- | -------- | ------ |
| 1 | Cycle wrap discontinuity (modes 2/3/10/11 + wobble in all modes) | High (user-visible) | Fixed |
| 2 | Launch head start `CELEBRATION_LAUNCH_INITIAL_PROGRESS = 0.08` → cards start ~22% eased toward path, i.e. a small snap on frame 1. Intentional (break out of stacked foundations), but could ease from 0 with a faster ramp instead | Low | Explained to user 2026-07-07; fix only if the start hop actually bothers him |
| 3 | Celebration ends abruptly at 60 s: `celebrationState` set to null → all 52 cards vanish in one frame (opacity 0) | Medium | Deprioritized by user (new-game dialog already covers the board at 30 s) |
| 4 | Mode picked with `Math.random()` — can repeat the same mode several wins in a row | Low | Won't do (user: 5% repeat chance is fine) |
| 5 | `sort(() => Math.random() - 0.5)` is a biased shuffle (visual-only, so acceptable; Fisher-Yates is a 4-liner) | Info | Won't do (only affects which card lands in which slot; bias invisible in practice) |
| 6 | `zIndex: 6000 + index` recomputed in the worklet every frame though constant per slot | Info | Won't do (negligible: whole style is recomputed per frame anyway; was a hygiene note) |
| 7 | `CelebrationAssignment.suitIndex` never read in `computeCelebrationFrame`; `CelebrationCardConfig.suit`/`suitIndex` also never consumed downstream — dead fields | Info | Fixed 2026-07-07 (removed from assignment, config, and overlay) |
| 8 | `CelebrationMetadata.id` always equals its array index — redundant | Info | Fixed 2026-07-07 (names array + id derived in `getCelebrationModeMetadata`; dead `?? 'Unknown'` fallback in `celebrationLabel` removed too) |
| 9 | Per-mode tuning pass (normalize perceived energy/coverage across the 20 modes) | Polish | Explained to user 2026-07-07; low prio, would benefit from a dev-only mode-preview trigger |

## Testing

- `test/unit/animation/celebrationModes.test.ts`: for each of the 20 modes, evaluates the frame just before/after each former cycle boundary (k/10.4, k=1..10). Absolute thresholds gave false positives on legitimately fast modes (9, 19), so the test compares the one-frame delta across the boundary with an equal-sized step just before it (smooth motion → similar deltas; the old wrap made the boundary step a 10-100x outlier). Also asserts `rawProgress` itself is continuous, which directly catches a reintroduced `% 1` (wobble continuity follows from it). Verified: with the wrap temporarily reinstated, all 20 mode tests fail; with the fix, all pass.
- `yarn typecheck && yarn lint && yarn jest` all green.
- No device build: the fix is a pure-math continuity change, provable by the unit test; visual spot-check on device is cheap for the user via dev-mode celebration badge (mode name is shown bottom-right).

## Follow-ups

See "Identified issues" table (items 2–8) and the recommendation/new-mode tables in the chat response of 2026-07-06.

---

# Story 2: Stable mode ids + 11 new celebration modes (2026-07-07)

## Decisions (user-approved direction)

- Restore explicit `{ id, name }` metadata (undo part of issue #8 cleanup). User wants stable identification if modes are ever removed. Improvement over the original: the controller picks a random *metadata entry* and uses `entry.id` (instead of `Math.floor(Math.random() * COUNT)`), so a removed mode = delete its metadata entry + retire its switch case number; remaining ids never shift. Document this contract with a comment at the metadata list.
- `suitIndex` returns as **live** code: re-add to `CelebrationCardConfig`, `CelebrationAssignment`, overlay pass-through, and test helper — consumed by the new Suit Orbits mode. (`suit` on the config stays deleted; still unused.)
- Implement 11 new modes now (ids 20–30). Deferred: Classic Cascade (trail ghosts need extra views per card — architecture change, separate story). Skipped: club shape (existing mode 17 Clover Spin already covers it), spade shape (fiddly piecewise curve, low payoff).
- Dev enabler: tapping the dev-mode `CelebrationDebugBadge` advances to the next celebration mode (restarts the run with next id). Needed to verify all modes in one win; also the tool for the future tuning pass (issue #9).

## New modes spec (ids 20–30)

Hard requirements for every mode:
- Pure worklet math in `computeCelebrationFrame` (new switch cases), continuous function of `progress`. NO `% 1` / `frac()` on anything that feeds a visible position/rotation/scale/opacity — with one exemption: position may teleport (modulo respawn) only while the card is fully outside the board bounds (≥ 2 card sizes beyond the edge) so it can never be seen.
- Energy envelope similar to existing modes: typical coverage radius 0.2–0.4 × `boardRadius`, rotation from gentle drift up to ~2 turns per ~5.8 s cycle-equivalent, scale 1 ± ≤0.1 (except where the concept demands more, e.g. Vortex shrink), opacity mostly 1.
- Use `assignment.index` / `normalizedIndex` / `relativeIndex` / `stackFactor` / `randomSeed` for per-card variation, mirroring existing cases.

| id | Name | Motion spec (guidance, tune freely within the hard requirements) |
| -- | ---- | ---- |
| 20 | Fountain | Cards launch upward from bottom-center with per-card stagger (phase from seed/index), parabolic arc under gravity, exit below the bottom edge, respawn offscreen (offscreen-teleport exemption). Slight horizontal spread by `relativeIndex`, tumbling rotation. |
| 21 | Card Rain | Continuous fall over a span taller than the board (respawn offscreen above), gentle horizontal sway `sin`, slow rotation, per-card speed variation from seed. |
| 22 | Vortex | Spiral: angle advances continuously; radius breathes between ~0.05 and ~0.4 × boardRadius via a slow cosine (inhale/exhale). Scale shrinks toward center (down to ~0.6). |
| 23 | Infinity Loop | Figure-eight Lissajous: `x = A·sin(φ)`, `y = B·sin(2φ)` with `φ = theta + normalizedIndex · TAU` so cards form a chasing train. Rotation follows travel direction approximately. |
| 24 | Suit Orbits | Four concentric rings by `suitIndex`: radius ≈ (0.14 + 0.075 · suitIndex) × boardRadius; alternate direction per ring, slightly different angular speeds; cards spaced on their ring by `stackIndex` (13 per ring). Uses the restored `suitIndex`. |
| 25 | Flock | Leader point = center + sum of 2–3 incommensurate sines (e.g. freq 1.0/1.37/0.73 with distinct phases). Card i renders the leader path evaluated at `theta - lag · index` plus a small seeded offset — follow-the-leader swarm. |
| 26 | Shockwave | Cards hold a loose grid (index → row/col around center). A radial wave `R(t)` sweeps outward periodically; card displacement/scale bump ∝ `exp(-((dist - R)²)/σ²)`. R's sawtooth reset is invisible because the gaussian is ~0 at both R=0-ish start beyond-corner end — verify continuity at reset. |
| 27 | Galaxy | Two-arm logarithmic spiral (arm by index parity), whole galaxy rotates slowly, cards twinkle via small scale/opacity oscillation, slight elliptical squash for depth. |
| 28 | Big Bounce | Fan of columns by `relativeIndex`; `y = floor - H_i · |cos(ω·theta + phase_i)| · envelope(theta)` with a smooth periodic envelope (bounce decays then regrows — continuous). Rotation flips a little at each bounce via smooth term. |
| 29 | Heartbeat | Cards along the classic parametric heart (`x = 16sin³t`, `y = 13cos t − 5cos 2t − 2cos 3t − cos 4t`, scaled to ~0.35 × boardRadius, y flipped for screen coords), positioned by `normalizedIndex · TAU` + slow drift along the curve. Whole heart pulses scale in a double-thump rhythm (two quick pulses per period). |
| 30 | Diamond Drift | Diamond outline via L1 mapping `x = r·cos φ/(|cos φ|+|sin φ|)`, `y = r·sin φ/(|cos φ|+|sin φ|)`; cards drift along the perimeter, whole diamond rotates slowly (≤ 0.25 turn per cycle). Corner velocity kinks are fine (continuous position). |

## Steps to implement (Story 2)

- [x] Restore `{ id, name }` metadata list + comment documenting the stable-id contract; selection via random metadata entry in `useCelebrationController`. (`CELEBRATION_MODE_METADATA` exported; `CELEBRATION_MODE_COUNT` removed — nothing needs a count anymore; switch now uses the raw id with the default case as fallback for retired/unknown ids, instead of the old modulo remap.)
- [x] Re-add `suitIndex` (config → assignment → overlay → test helper).
- [x] Add 11 switch cases + names (ids 20–30) per spec above.
- [x] Extend continuity test: keep boundary checks for all modes; add the offscreen exemption (skip position assertions when both samples are ≥ 2 card sizes outside the board); ensure it still fails if `% 1` returns (rawProgress assertion unaffected by exemption). (Test now iterates `CELEBRATION_MODE_METADATA` and names each test with the mode name.)
- [x] Dev badge tap-to-cycle: badge becomes pressable (dev mode only, add `testID="celebration-debug-badge"`), calls a new `cycleCelebrationMode` from the controller that advances to the next metadata entry and restarts the celebration run. Verify the badge actually receives taps above `CelebrationTouchBlocker` (badge renders after it in `KlondikeGameView`). Comment that restarting progress on cycle is acceptable for a dev tool.
- [x] `yarn typecheck && yarn lint && yarn jest` green. (25 suites / 243 tests passed, 2026-07-07)
- [x] Device smoke test (separate testing sub-agent): iOS simulator build, win via demo auto-solve, cycle through modes via badge, screenshot each new mode (20–30), check rendering plausibility, no crash, badge label correct. (Done 2026-07-07, all 11 modes pass — see "Device smoke test (Story 2)" below.)

Implementation hints for tricky continuity spots (suggestions, not mandates):
- Shockwave (26): a sawtooth `R(t)` reset is only continuous if the gaussian influence is ~0 at BOTH ends; a cosine ping-pong (wave sweeps out and back) avoids the reset question entirely.
- Fountain (20)/Card Rain (21): make the respawn span ≥ board + 4 card heights so the modulo teleport always happens fully offscreen.

## Plan: Files to modify (Story 2)

- `src/animation/celebrationModes.ts` (metadata restore, 11 cases, names)
- `src/features/klondike/hooks/useCelebrationController.ts` (selection from metadata, `cycleCelebrationMode`, re-add `suitIndex` to config)
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` (re-add `suitIndex` pass-through)
- `src/features/klondike/components/CelebrationDebugBadge.tsx` (pressable + testID)
- `src/features/klondike/components/KlondikeGameView.tsx` (wire cycle handler to badge)
- `src/features/klondike/hooks/useKlondikeGame.ts` (expose cycle handler to view)
- `test/unit/animation/celebrationModes.test.ts` (suitIndex back in helper, offscreen exemption)

## Files actually modified (Story 2)

- `src/animation/celebrationModes.ts` — `CELEBRATION_MODE_METADATA` (`{id, name}` list + stable-id contract comment), `suitIndex` on `CelebrationAssignment`, 11 new switch cases (20–30), switch on raw id (default case = fallback for retired ids), `getCelebrationModeMetadata` lookup by id with `Unknown` fallback, `CELEBRATION_MODE_COUNT` removed.
- `src/features/klondike/hooks/useCelebrationController.ts` — random metadata-entry selection, `suitIndex` in `CelebrationCardConfig` (from `FOUNDATION_SUIT_ORDER.forEach` index), `cycleCelebrationMode` (wraps via metadata list; restarts the 60s run — commented as acceptable for a dev tool).
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` — `suitIndex` pass-through into the assignment.
- `src/features/klondike/components/CelebrationDebugBadge.tsx` — wrapped in `Pressable` (`testID="celebration-debug-badge"`, `onPress` prop); the old `pointerEvents="none"` removed so it receives taps above the touch blocker.
- `src/features/klondike/components/KlondikeGameView.tsx` — `onCelebrationBadgePress` prop wired to the badge.
- `src/features/klondike/hooks/useKlondikeGame.ts` — passes `cycleCelebrationMode` through as `onCelebrationBadgePress`.
- `test/unit/animation/celebrationModes.test.ts` — iterates `CELEBRATION_MODE_METADATA` (test names include mode name), `suitIndex` in `buildAssignment`, offscreen exemption for position assertions only.

## Intermediary learnings (Story 2)

- Fountain (20) needs no offscreen-teleport exemption at all: with a parabola whose zeros are at u=0 and u=1 and a per-card `frac` only in u, y(0) = y(1), so the wrap is position-continuous by construction (x/rotation/scale are functions of unwrapped theta).
- Card Rain (21) uses a fall span of board + 8 card heights with wrap endpoints 4 card heights offscreen — 2 card heights of slack beyond the test's ≥ 2-card-size rule, so samples slightly around the wrap still qualify as fully offscreen.
- Infinity Loop (23): exact heading via `atan2` would wrap ±180° and trip the continuity guard even though a 360° rotation jump is visually invisible; used a smooth sine-mix approximation of the travel direction instead.
- Shockwave (26): took the plan's hint — cosine ping-pong wave radius instead of a sawtooth reset, continuous everywhere with no gaussian-tail argument needed.
- Switching on the raw stable id (default case as fallback) replaced the old `((id % COUNT) + COUNT) % COUNT` remap; a retired id now falls back to the default orbit instead of silently aliasing another mode. This also let `CELEBRATION_MODE_COUNT` be deleted entirely.
- Badge label still shows `id + 1` (existing convention), so e.g. Fountain (id 20) displays as "Celebration 21". Left unchanged to avoid scope creep; flag if raw ids are preferred now that ids are stable.

## Anomaly resolution (2026-07-07, from user)

The two one-time anomalies during the Story 2 smoke test (dialog after ~8 s, demo sheet opening spontaneously) were almost certainly the user tapping the simulator out of curiosity while the agent was driving. Not bugs. This also explains part of the test duration (agent investigating unexplained taps). Story 2 smoke test results are further below (after Story 3).

---

# Story 3: Trail ghosts + Classic Cascade + Meteor Shower (2026-07-07)

## User prompt (Story 3)

> then, let's try the classic cascade. and if doable maybe also another new mode with this new effect?

## Design: trail ghosts via time-lagged evaluation

Every celebration mode is a pure function of `progress`. Therefore a motion trail needs NO position history: ghost k of a card is simply `computeCelebrationFrame(progress - k * gap)` — the same worklet, evaluated at a lagged progress, rendered with decaying opacity below the real card. This makes trails a generic per-mode opt-in and keeps the whole system stateless.

- `CelebrationMetadata` gains optional `trail?: { count: number; gapMs: number }`.
- `CelebrationOverlayLayer`: when the active mode's metadata has `trail`, mount `count` ghost slots per card (52 × count extra views, ONLY while a trail mode is active — mounting keys off `celebrationState`, which re-renders once per celebration start/mode cycle anyway). Each ghost slot reuses the existing slot worklet with a `lagProgress` offset (gapMs / CELEBRATION_DURATION_MS · (k+1)), progress clamped ≥ 0 (at clamp, ghost coincides with the card at its base — invisible overlap, not a glitch).
- Ghost styling: opacity multiplied by a decay (e.g. `0.45 · (1 - k / (count + 1))`), zIndex below the main card (e.g. `6000 + index - (k+1)`), optionally slightly smaller scale for depth.
- Perf budget: start with count 4 / gap 70–90 ms (≈ 208 ghost views). If the device smoke test shows jank, reduce count — do not optimize further preemptively.

## New modes (Story 3)

Hard requirements: same as Story 2 (continuous functions of progress; offscreen-only teleports with ≥ 4 card sizes of slack — Card Rain learning; worklet-safe; no Math.random at frame time).

| id | Name | Trail | Motion spec (guidance) |
| -- | ---- | ----- | ---- |
| 31 | Classic Cascade | count ~4, gap ~80 ms | Windows-Solitaire homage. Cards launch SEQUENTIALLY (stagger by `index`, e.g. ~0.35 s apart; before launch, hold exactly at `baseX/baseY` — position-continuous at launch, velocity jump is fine). After launch: constant horizontal velocity (direction + speed from seed/direction), vertical gravity bounce along the floor (`floorY = boardHeight - cardHeight`): per-bounce parabola `h = 4·H·u·(1-u)` with `u = frac(ω·tSinceLaunch)` — continuous because h=0 at both ends of every bounce; bounce height H decays and regrows via a slow smooth envelope (Big Bounce pattern). Horizontal offscreen wrap over a span ≥ board width + 8 card widths (endpoints ≥ 4 card widths beyond the edges). |
| 32 | Meteor Shower | count ~5, gap ~55 ms | Fast diagonal streaks (upper-left → lower-right), per-card stagger and speed variation from seed; cards travel along the diagonal and wrap offscreen (same span rule along both axes); slight cross-drift sway; rotation aligned near the diagonal with small oscillation. The trail IS the effect — keep the path itself simple. |

## Steps to implement (Story 3)

- [x] `trail` config on `CelebrationMetadata`; overlay renders lagged ghost slots when active mode has trails (mount only during trail modes).
- [x] Mode 31 Classic Cascade per spec (+ metadata with trail: count 4, gap 80 ms).
- [x] Mode 32 Meteor Shower per spec (+ metadata with trail: count 5, gap 55 ms).
- [x] Continuity test: new modes are covered automatically via `CELEBRATION_MODE_METADATA` iteration; ensure they pass (offscreen exemption applies to the wraps). No ghost-specific unit test needed (ghosts reuse the same frame function; rendering is device-smoke territory). (Passed unmodified, first run.)
- [x] `yarn typecheck && yarn lint && yarn jest` green. (26 suites / 254 tests passed, 2026-07-07; includes 2 new mode continuity tests.)
- [x] Lean device smoke test (testing sub-agent, tightly scoped): verify modes 31 + 32 render with visible trails, no crash, no obvious jank. 2 screenshots per mode, done. (Done 2026-07-07, both modes pass — see "Device smoke test (Story 3)" below.)

## Files actually modified (Story 3)

- `src/animation/celebrationModes.ts` — `trail?: { count, gapMs }` on `CelebrationMetadata` (+ comment explaining the lagged-evaluation trick), metadata entries 31/32, switch cases 31 (Classic Cascade) and 32 (Meteor Shower) with per-case continuity comments.
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` — `CelebrationOverlaySlot` parametrized with `zIndex` (now a prop instead of `6000 + index` in the worklet), optional `lagProgress` (progress offset, clamped ≥ 0 in the worklet) and `opacityMultiplier`; layer derives `trail` from `getCelebrationModeMetadata(celebrationState.modeId)` and mounts `count` ghost slots per card only while a trail mode is active; zIndex bands `6000 + slot * (count + 1) + …` so ghosts never interleave across cards (plain `6000 + slot` when no trail).

## Intermediary learnings (Story 3)

- Classic Cascade launch continuity: the bounce parabola starts at the floor (h = 0 at u = 0), but cards hold at `baseY` before launch. Bridging offset: `(floorY - baseY) * drop²` with `drop = max(0, 1 - tSince / 0.35)` — equals the full gap at launch (position-continuous) and decays smoothly to 0, reading as an accelerating first fall into the floor bounces.
- The horizontal wrap needs no timing coordination with the initial drop: the teleport only happens when x reaches an endpoint 4 card widths offscreen, which is invisible regardless of what y is doing (the test's offscreen exemption is an OR across axes).
- Theoretical flake considered and checked: if a bounce wrap (u = frac) fell exactly between the test's reference and boundary samples, fall/rise could cancel in the reference delta while the boundary delta stays full-slope. Didn't occur for the chosen constants — and the test is fully deterministic (fixed seeds/boundaries), so a pass is a stable pass.
- Ghost lag clamping (`max(0, progress - lag)`) means ghosts sit exactly on top of the card during the first `gapMs · count` ms — invisible overlap, then the trail fans out naturally. No special-casing needed.
- Meteor Shower keeps x and y on ONE shared `frac` cycle so both wrap in the same frame; the per-card x lane offset can keep x near the board at wrap time, but the y endpoints (±4 card heights offscreen) alone satisfy the exemption.

## Device smoke test (Story 3) — 2026-07-07

iOS simulator (iPhone 17 Pro), Release build via `yarn ios` (built+installed+launched in 58 s). Win via `soli:///?demo=autosolve&games=1`, modes reached by tapping the dev badge. Artifacts: `.test-artifacts/celebration-trail-modes/`.

| id | Mode | Result |
| -- | ---- | ------ |
| 31 | Classic Cascade | Pass — cards bounce along the floor in staggered launches, 4 fading trail ghosts clearly visible behind each moving card, screenshots differ (`31-classic-cascade-{a,b}.png`) |
| 32 | Meteor Shower | Pass — fast upper-left→lower-right diagonal streaks, long 5-ghost trails are the dominant visual, screenshots differ (`32-meteor-shower-{a,b}.png`) |

- Jank (Meteor Shower, 312 animated views): observed ~5 s via 4 rapid captures (`32-meteor-jank-{1..4}.png`) — motion advanced substantially and coherently every frame, badge taps kept registering instantly, nothing frozen. No gross choppiness; note stills can't rule out subtle frame drops. No crash (app process alive after both runs).
- Known Story 2 finding re-confirmed: the 30 s "Start a new game?" dialog interrupted the first Meteor Shower attempt (dialog is modal, badge unreachable); a fresh win + faster cycling avoided it. One anomaly not investigated (lean scope): after the first cold-start deep link the badge never appeared during 130 s of polling despite the game being won — possibly the agent-device `open` (attached after the deep link) relaunched the app mid-demo. Retry with `#retry-1` worked immediately.

# Story 4: Polish batch — end fade, launch snap, Fisher-Yates, static zIndex, trail uplifts (2026-07-07)

## User prompt (Story 4)

> General improvement recommendations: do 2 and 4 and 5 if you think it makes sense. maybe also 1 if it's just a line or two. testing new animations meanwhile. should some existing animations also be uplifted with new options? as mentioned, they're all pretty much vibecoded and I am open to experimenting and making it cool.

## Changes (all implemented directly — each is a few lines; done 2026-07-07, all tests green: 28 suites / 275 tests)

- [x] Issue #1 (end fade): slot worklet multiplies opacity by `endFade = clamp((1 - progress) / 0.033)` — cards and their trail ghosts fade out together over the last ~2 s of the 60 s run instead of vanishing in one frame when `celebrationState` clears. Driven by the unlagged shared progress. (Abort via tap still hides instantly — user-initiated, fine.)
- [x] Issue #2 (frame-1 launch snap): removed the 0.08 launch head start (`CELEBRATION_LAUNCH_INITIAL_PROGRESS`); launch now eases from exactly 0 with a steeper curve (easeOutQuint, speed multiplier 32→40). Breakout stays fast (~29% eased after 100 ms — comparable to the old head start) but frame 1 is position-continuous with the foundation piles. PBI-28's "break out immediately" intent preserved; comment updated in `celebrationModes.ts`.
- [x] Issue #5 (biased shuffle): Fisher-Yates replaces `sort(() => Math.random() - 0.5)` in `buildCelebrationState`.
- [x] Issue #6 (zIndex): now in the slot's static style (it became a constant prop in Story 3; the worklet no longer re-emits it every frame).
- [x] Trail uplifts on existing modes: Comet Halo (10) `{count: 4, gapMs: 70}` — a comet finally has a tail; Galaxy (27) `{count: 3, gapMs: 90}` — star-streak spiral arms. One metadata line each; trivially revertable.

## Files modified (Story 4)

- `src/animation/celebrationModes.ts` (launch ease, trail metadata on 10/27)
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` (end fade, static zIndex)
- `src/features/klondike/hooks/useCelebrationController.ts` (Fisher-Yates)

Not device-tested (pure-math/one-liner changes; user is testing on simulator — NOTE: a rebuild is needed to see them).

# Story 5: Perf check, dev-hold timers, celebration preview deep link (2026-07-07)

## User prompt (Story 5)

> the new celebrations are quite heavy on my phone. check pls. seems to be laggy.
> classic cascade is cool. but not really close to windows classic cascade. just a comment for now.
> when using new pressable to go through animations, each press should restart 30s and 60s timer so i stay in there and have time to see. or actually first press should disable those timers and stay in there until i click in the animation or start a new game.
> can we already start these new animations programmatically? see other thread with skills? would maybe help here in testing as well btw.

## Analysis

- **Lag suspect:** trail modes mount 52 × (count+1) animated views (Meteor Shower: 312), each running the frame worklet + a Fabric props update every frame. The per-frame update volume is the likely bottleneck on a phone, not the trig. First mitigation: reduce ghost counts (Meteor 5→3, Cascade 4→3, Comet Halo 4→3, Galaxy 3→2 ⇒ worst case 312→208 views). Then MEASURE on the Android phone (`dumpsys gfxinfo` jank stats, trail mode vs non-trail mode vs old mode). Further options only if still janky: quantize ghost updates to ~30 Hz, cheaper ghost visuals.
- **Windows-cascade fidelity (comment only, deferred):** the original paints permanent imprints (cards never erased); real fidelity needs a snapshot/canvas layer (the deferred Classic Cascade trails story), not more ghosts. Logged in Follow-ups.
- **Timers:** user chose the second option — FIRST badge press disables both the 30 s dialog timer and the 60 s completion; stay in celebration until tapping the animation (abort) or starting a new game.
- **Programmatic start:** not possible before this story (celebrations only trigger on a real win). Design: dev-only deep link `soli://?celebration=<id|random>` → celebration PREVIEW: synthetic 52-card foundation payload (suit/rank literals; foundation slot layouts exist even mid-game because they're measured on the slot views, not the piles), forced mode id, dev-hold behavior, and abort-dismisses-without-dialog. Game state untouched — preview overlays any board and returns to it cleanly.

## Steps to implement (Story 5)

- [x] Reduce trail ghost counts per above (comment the perf budget rationale). (Meteor 5→3, Cascade 4→3, Comet Halo 4→3, Galaxy 3→2; budget comment on `CelebrationMetadata.trail`.)
- [x] Dev-hold: `cycleCelebrationMode` (first press) sets a hold ref → effect skips the 30 s dialog timer; 60 s run completion loops (restart progress: fade-out → relaunch, commented as intentional dev-loop) instead of completing. Cleared on abort/new game/state clear.
- [x] `startCelebrationPreview(modeId?)` on the controller: synthetic cards (all 52, `preview-<suit>-<rank>` ids), base positions via the same math as `buildCelebrationState` (extracted `computeCelebrationCardBase` used by both), Fisher-Yates shuffle (extracted `shuffleCelebrationCards`, also shared), forced or random mode, sets hold+preview refs, locks board, sets state. No-op with devLog if board layout not ready.
- [x] Abort during preview: cleanup + unlock WITHOUT opening the new-game dialog.
- [x] Deep link `soli://?celebration=<id|random>` in `useDemoGameLauncher` (additive edit next to the seedHistory block — that file has another agent's unstaged WIP; minimal touch, no git operations), enabling dev mode like the other dev links; wire `startCelebrationPreview` through `useKlondikeGame`. (The link existed as C6 calling `triggerCelebrationForTesting` in `useKlondikeGame`; that duplicate was replaced by the controller-owned preview — see learnings.)
- [x] `yarn typecheck && yarn lint && yarn jest` green. (28 suites / 275 tests, 2026-07-07 — identical counts to before Story 5.)
- [x] Android phone test (lean): build `yarn release`, deep-link into modes, `dumpsys gfxinfo` jank comparison (trail vs non-trail vs old mode), verify dev-hold (no dialog >35 s), verify preview abort returns to the game without dialog. Report numbers. (Done 2026-07-07, orchestrator-driven after sub-agent interruptions — see "Android perf test (Story 5)" below.)

## Android perf test (Story 5) — 2026-07-07

Device: A065 (budget Android 16 phone, the one the lag was reported on). Method: `soli://?celebration=<id>#retry-N` preview deep links + `dumpsys gfxinfo ch.karimattia.soli reset` → 10 s in-mode → `dumpsys gfxinfo` dump. Raw outputs in `.test-artifacts/celebration-perf-android/`.

Important calibration: on this device even OLD celebrations render ~45–50 fps with "Janky frames: 100%" — 52 animated views is simply this phone's ceiling, and gfxinfo's janky% is useless here. Compare frames-rendered-per-10 s instead.

| Scenario | Views | fps (≈) | GPU 50th/90th |
| -------- | ----- | ------- | ------------- |
| Wave Loop 7 (old, baseline) | 52 | 50 | 9/11 ms |
| Vortex 22 (new, no trail) | 52 | 45 | 9/10 ms |
| Classic Cascade 31 (3 ghosts) | 208 | 51 | 9/10 ms |
| Meteor Shower 32 — before / 2 ghosts | 208→156 | 25 → 32 | 14/21 → 12/14 ms |
| Galaxy 27 — 2 ghosts / trail removed | 156→52 | 16 → 44 | 19/4950(!) → 9/11 ms |
| Comet Halo 10 — 3 ghosts / trail removed | 208→52 | 6 → 43 | 24/4950(!) → 9/11 ms |

### Root cause (measured, not guessed)

- View COUNT alone is not the problem: Cascade runs 208 views at full baseline speed (translate-only, cards spread out or exactly coincident).
- The killer is **translucent ghost overdraw on clustered modes**: Galaxy and Comet Halo keep all 52 cards in a tight cluster, so ghosts multiply alpha-blended layers exactly where depth is already worst → GPU stalls (90th percentile literally 4.95 s). Trails REMOVED from both (metadata comments explain; trivially re-addable for spread-out modes only).
- Galaxy's per-frame opacity twinkle was suspected but measured INNOCENT (removing it: no change; removing trails: fixed). Twinkle restored as original.
- Meteor Shower is inherently the heaviest (all cards + ghosts sweep the full screen every frame): per-frame rotation/scale oscillation removed (now fixed per-card tilt; translate-only like Cascade) and ghosts 3→2, gap 55→75 ms: 25→32 fps. Still below the ~45 fps device baseline — acceptable for a fast streak effect, but flagged for user judgement. Further options if wanted: 1 ghost, or halve meteor count (park odd-index cards offscreen).

### Behavior checks (all pass)

- Dev-hold: >60 s across preview modes, no "Start a new game?" dialog (`devhold-check.png` — badge label "Celebration 28 · Galaxy" visible, dialog absent).
- Silent dismiss: tap on the animation returned to the untouched mid-game board, no dialog (`dismiss-check.png`).
- Deep-link "instability" (user report): every link with a CHANGED URL fired reliably while the app was foregrounded ("Warning: Activity not started, intent delivered to running instance" is normal and harmless). The gotcha is URL dedupe — identical URLs are ignored; always append `#retry-N`/`#v2`. Documented in the soli-testing skill already.

### Verdict

Fixed. Trail modes now: Cascade 51 fps (= baseline), Meteor 32 fps (flagged), Galaxy/Comet back to ~44 fps non-trail baseline. New rule of thumb documented in the metadata comments: trails only on modes that spread cards out.

## Files actually modified (Story 5)

- `src/animation/celebrationModes.ts` — trail counts lowered (10: 4→3, 27: 3→2, 31: 4→3, 32: 5→3); perf-budget comment on the `trail` field (per-frame Fabric updates scale with 52 × (count+1) views).
- `src/features/klondike/hooks/useCelebrationController.ts` — `celebrationHoldRef` + `celebrationPreviewRef`; module-level `shuffleCelebrationCards` and hook-level `computeCelebrationCardBase` (shared win/preview position math); run effect starts via a local `startProgressRun`/`handleRunFinished` pair (hold → endless dev loop, no 30 s dialog); `startCelebrationPreview(modeId?)`; `handleCelebrationAbort` skips the new-game dialog for previews; both refs reset in `clearCelebrationAnimations`/abort.
- `src/features/klondike/hooks/useKlondikeGame.ts` — removed the old `triggerCelebrationForTesting` (superseded by the controller preview); passes `startCelebrationPreview` to the demo launcher; dropped now-unused imports (`FOUNDATION_SUIT_ORDER`, `DEAL_RANKS`, `CELEBRATION_DURATION_MS`, `FOUNDATION_FALLBACK_GAP`, `CelebrationCardConfig`).
- `src/features/klondike/hooks/useDemoGameLauncher.ts` — `?celebration=` block now calls the new `startCelebrationPreview` launcher option (undefined = random); option type + destructure renamed from `triggerCelebrationForTesting`. Minimal touch; the file's unrelated seedHistory WIP untouched.
- `src/animation/celebrationModes.ts` (again, post-measurement, orchestrator-direct) — trails REMOVED from Comet Halo (10) and Galaxy (27) (clustered modes: ghost overdraw → 6/16 fps); Meteor Shower (32) to 2 ghosts / 75 ms gap and per-frame rotation+scale oscillation replaced with a fixed per-card tilt (25→32 fps); Galaxy's opacity twinkle restored (measured innocent). All rationale in inline comments.

## Intermediary learnings (Story 5)

- A `?celebration=` deep link already existed (agent-testing-skill C6) with a full synthetic-payload builder (`triggerCelebrationForTesting`) inside `useKlondikeGame` — deliberately placed there to avoid touching the controller while celebration work was in flight. Story 5 moves it into the controller (where hold/preview refs live) and deletes the duplicate; net behavior change vs C6: dev-hold from the start (no 30 s dialog, endless loop), abort returns to the game silently, and position/shuffle math is shared with the real win path instead of copied.
- TypeScript does not carry null-narrowing into hoisted `function` declarations: `celebrationState.durationMs` errored inside `startProgressRun` despite the effect's early return, so the duration is captured into a const before the mutually recursive run/finish pair.
- `cycleCelebrationMode` sets the hold ref inside the `setCelebrationState` updater, so a badge press with no active celebration can't leave a stale hold behind.
- Sanity check (task 5): cycling while in preview keeps working — the run effect only touches `celebrationAbortRef`/`celebrationDialogShownRef`; hold/preview refs are reset exclusively in `clearCelebrationAnimations` (state → null) and `handleCelebrationAbort`.
- The soli-testing skill (`.agents/skills/soli-testing/SKILL.md`, currently another agent's WIP) already documents `?celebration=<modeId|random>` including the 30 s dialog / 60 s run caveats — those caveats are now obsolete for the preview path (dev-hold suppresses both) and the skill should be updated once its WIP lands.

## Device smoke test (Story 2) — 2026-07-07

iOS simulator (iPhone 17 Pro), Release build via `yarn ios` (built+installed+launched in 1:14). Win reached via `soli:///?demo=autosolve&games=1` deep link; modes cycled with the tappable dev badge (`testID="celebration-debug-badge"`). Per mode: badge label checked, 2 screenshots ~1.5 s apart in `.test-artifacts/celebration-new-modes/<id>-<name>-{a,b}.png`. No crash at any point.

| id | Mode | Result |
| -- | ---- | ------ |
| 20 | Fountain | Pass — cards arc up from bottom-center and fall, screenshots differ, spread plausible |
| 21 | Card Rain | Pass — full-screen fall with sway, partially offscreen top/bottom by design |
| 22 | Vortex | Pass — ring breathes into a spiral (a: full circle, b: inhaled spiral) |
| 23 | Infinity Loop | Pass — clear figure-eight train, rotation follows travel |
| 24 | Suit Orbits | Pass — concentric rings, red suits inner / black suits outer, counter-rotating |
| 25 | Flock | Pass — follow-the-leader swarm moves and stretches; bunches very tightly at times (tuning-pass candidate, issue #9) |
| 26 | Shockwave | Pass — loose grid with visible radial displacement wave |
| 27 | Galaxy | Pass — two-arm spiral rotating (first capture spoiled by demo sheet, recaptured clean) |
| 28 | Big Bounce | Pass — horizontal band of bouncing columns, heights vary between shots |
| 29 | Heartbeat | Pass — unmistakable heart outline, pulses between shots |
| 30 | Diamond Drift | Pass — diamond outline drifting/rotating slowly |

Old-mode sanity check: mode 7 Wave Loop animates normally (`old-07-wave-loop-{a,b}.png`; taken with the new-game dialog overlay up — cards animate behind it).

Badge tap-to-cycle: **works.** ~40 taps across 4 celebration runs, each tap advanced the label and restarted the run; one 126 s run cycled 18 modes back-to-back without issues.

Findings / observations (no code changed, `celebrationModes.ts` untouched):

1. **New-game dialog blocks the badge.** The "Start a new game?" Alert (30 s after celebration start) is a native modal — once it is up, badge taps no longer register and only "Deal Again" recovers. Expected modal behavior, but it caps a cycling session at ~30 s per fresh win unless taps keep resetting the timer (they normally do, since cycling restarts the celebration effect).
2. **One-time anomaly:** in one run the dialog appeared ~8 s after a successful cycle tap (a reset 30 s timer should have pushed it out). Not reproducible — a later run cycled for 126 s dialog-free — so likely a timing edge around the 30 s boundary. Dev-tool-only impact; not investigated further.
3. **One-time anomaly:** the "Run Demo" sheet opened spontaneously mid-cycling once (spoiled the first Galaxy capture; recaptured). Cause unknown, 1 occurrence in ~40 badge presses.
4. **Testing infra learning:** agent-device `wait <selector> <long timeout>` hits a daemon request timeout at ~90 s — poll with repeated short `get attrs` calls instead (see `cycle-capture.sh`/`drive.sh` in the artifacts folder for the working recipe). Worth adding to the soli-testing skill once its current WIP edits land (skill file is another agent's uncommitted work, so not touched here).
