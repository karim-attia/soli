# Celebration Smoothness Fix + Full Review

## User prompt

> some celebrations have short jumps sometimes. not all. pls fix so that they are all smooth. celebrations was super quickly hacked together. any general improvement recommendations? list in table. more ideas for new celebrations? list them in table. pls fully review. anything else?

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

- `src/animation/celebrationModes.ts`
- `test/unit/animation/celebrationModes.test.ts` (new)

## Identified issues (full review, beyond the fix)

| # | Issue | Severity | Status |
| - | ----- | -------- | ------ |
| 1 | Cycle wrap discontinuity (modes 2/3/10/11 + wobble in all modes) | High (user-visible) | Fixed |
| 2 | Launch head start `CELEBRATION_LAUNCH_INITIAL_PROGRESS = 0.08` → cards start ~22% eased toward path, i.e. a small snap on frame 1. Intentional (break out of stacked foundations), but could ease from 0 with a faster ramp instead | Low | Open |
| 3 | Celebration ends abruptly at 60 s: `celebrationState` set to null → all 52 cards vanish in one frame (opacity 0) | Medium | Open |
| 4 | Mode picked with `Math.random()` — can repeat the same mode several wins in a row | Low | Open |
| 5 | `sort(() => Math.random() - 0.5)` is a biased shuffle (visual-only, so acceptable; Fisher-Yates is a 4-liner) | Info | Open |
| 6 | `zIndex: 6000 + index` recomputed in the worklet every frame though constant per slot | Info | Open |
| 7 | `CelebrationAssignment.suitIndex` is never read in `computeCelebrationFrame` — dead field | Info | Open |
| 8 | `CelebrationMetadata.id` always equals its array index — redundant | Info | Open |

## Testing

- `test/unit/animation/celebrationModes.test.ts`: for each of the 20 modes, evaluates the frame just before/after each former cycle boundary (k/10.4, k=1..10). Absolute thresholds gave false positives on legitimately fast modes (9, 19), so the test compares the one-frame delta across the boundary with an equal-sized step just before it (smooth motion → similar deltas; the old wrap made the boundary step a 10-100x outlier). Also asserts `rawProgress` itself is continuous, which directly catches a reintroduced `% 1` (wobble continuity follows from it). Verified: with the wrap temporarily reinstated, all 20 mode tests fail; with the fix, all pass.
- `yarn typecheck && yarn lint && yarn jest` all green.
- No device build: the fix is a pure-math continuity change, provable by the unit test; visual spot-check on device is cheap for the user via dev-mode celebration badge (mode name is shown bottom-right).

## Follow-ups

See "Identified issues" table (items 2–8) and the recommendation/new-mode tables in the chat response of 2026-07-06.
