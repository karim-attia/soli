import {
  CELEBRATION_MODE_COUNT,
  computeCelebrationFrame,
  type CelebrationAssignment,
} from '../../../src/animation/celebrationModes'

// Mirrors CELEBRATION_SPEED_MULTIPLIER (not exported). The old implementation wrapped
// cycle progress with `% 1`, producing a discontinuity every 1/SPEED of total progress.
// This suite guards that every mode stays continuous across those former wrap boundaries.
const SPEED_MULTIPLIER = 10.4

const BOARD = { width: 400, height: 800 }
const METRICS = { width: 60, height: 84 }
const TOTAL_CARDS = 52

const buildAssignment = (index: number): CelebrationAssignment => ({
  baseX: 40 + (index % 4) * 70,
  baseY: 20,
  stackIndex: index % 13,
  suitIndex: index % 4,
  // Deterministic pseudo-random seed spread over [0, 1).
  randomSeed: ((index * 37) % 100) / 100,
  index,
})

const frameAt = (modeId: number, assignment: CelebrationAssignment, progress: number) => {
  const frame = computeCelebrationFrame({
    modeId,
    assignment,
    metrics: METRICS,
    board: BOARD,
    totalCards: TOTAL_CARDS,
    progress,
  })
  if (!frame) {
    throw new Error(`Expected frame for mode ${modeId} at progress ${progress}`)
  }
  return frame
}

describe('computeCelebrationFrame continuity', () => {
  // Half a frame at 60fps over the 60s celebration.
  const halfFrameProgress = 1 / (60 * 60 * 2)
  const sampleIndices = [0, 1, 13, 26, 51]

  // Some modes legitimately move fast (e.g. mode 9's drift rotation, mode 19's jitter),
  // so absolute thresholds cause false positives. Instead, compare the one-frame delta
  // ACROSS the boundary with an equal-sized step just BEFORE it: smooth motion gives
  // similar deltas, while the old `% 1` wrap made the boundary step a 10-100x outlier.
  const expectSmooth = (boundaryDelta: number, referenceDelta: number, slack: number) => {
    expect(boundaryDelta).toBeLessThan(referenceDelta * 3 + slack)
  }

  for (let modeId = 0; modeId < CELEBRATION_MODE_COUNT; modeId += 1) {
    it(`mode ${modeId} has no jump at former cycle wrap boundaries`, () => {
      for (let cycle = 1; cycle <= Math.floor(SPEED_MULTIPLIER); cycle += 1) {
        const boundary = cycle / SPEED_MULTIPLIER
        for (const index of sampleIndices) {
          const assignment = buildAssignment(index)
          const ref = frameAt(modeId, assignment, boundary - 3 * halfFrameProgress)
          const before = frameAt(modeId, assignment, boundary - halfFrameProgress)
          const after = frameAt(modeId, assignment, boundary + halfFrameProgress)

          expectSmooth(
            Math.abs(after.pathX - before.pathX),
            Math.abs(before.pathX - ref.pathX),
            2
          )
          expectSmooth(
            Math.abs(after.pathY - before.pathY),
            Math.abs(before.pathY - ref.pathY),
            2
          )
          expectSmooth(
            Math.abs(after.rotation - before.rotation),
            Math.abs(before.rotation - ref.rotation),
            2
          )
          expectSmooth(
            Math.abs(after.targetScale - before.targetScale),
            Math.abs(before.targetScale - ref.targetScale),
            0.01
          )
          expectSmooth(
            Math.abs(after.targetOpacity - before.targetOpacity),
            Math.abs(before.targetOpacity - ref.targetOpacity),
            0.01
          )
          // Directly catches a reintroduced `% 1` wrap (the overlay wobble derives its
          // phase from rawProgress, so wobble continuity follows from this).
          expect(Math.abs(after.rawProgress - before.rawProgress)).toBeLessThan(0.01)
        }
      }
    })
  }
})
