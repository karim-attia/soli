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

The two one-time anomalies during the Story 2 smoke test (dialog after ~8 s, demo sheet opening spontaneously) were almost certainly the user tapping the simulator out of curiosity while the agent was driving. Not bugs. This also explains part of the test duration (agent investigating unexplained taps).

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
