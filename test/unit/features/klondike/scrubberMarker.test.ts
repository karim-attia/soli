import { getScrubMarkerLeft } from '../../../../src/features/klondike/scrubberMarker'

// Real UndoScrubber metrics: 20pt thumb, 3pt marker on a 320pt track.
const THUMB = 20
const MARKER = 3
const TRACK = 320
const TRAVEL = TRACK - THUMB // 300

const markerAt = (index: number, sliderMax: number, trackWidth = TRACK) =>
  getScrubMarkerLeft({
    index,
    sliderMax,
    trackWidth,
    thumbSize: THUMB,
    markerWidth: MARKER,
  })

// The thumb's own transform, reproduced from UndoScrubber's thumbStyle. The
// marker has to sit on the thumb's CENTRE for the same index — that is the
// whole contract ("drag until the thumb covers the marker").
const thumbCentreAt = (index: number, sliderMax: number, trackWidth = TRACK) =>
  (Math.max(0, Math.min(index, sliderMax)) / sliderMax) *
    Math.max(trackWidth - THUMB, 0) +
  THUMB / 2

describe('getScrubMarkerLeft', () => {
  it('centres the marker on the thumb centre for that index', () => {
    for (const index of [0, 1, 13, 40, 79, 80]) {
      expect(markerAt(index, 80) + MARKER / 2).toBeCloseTo(thumbCentreAt(index, 80))
    }
  })

  it('places index 0 at the left end of the travel', () => {
    expect(markerAt(0, 80)).toBe(THUMB / 2 - MARKER / 2)
  })

  it('places the last index at the right end of the travel', () => {
    expect(markerAt(80, 80)).toBe(TRAVEL + THUMB / 2 - MARKER / 2)
  })

  it('scales linearly in between', () => {
    expect(markerAt(40, 80)).toBeCloseTo(TRAVEL / 2 + THUMB / 2 - MARKER / 2)
    expect(markerAt(20, 80)).toBeCloseTo(TRAVEL / 4 + THUMB / 2 - MARKER / 2)
  })

  it('clamps out-of-range indices instead of drawing off the track', () => {
    expect(markerAt(-5, 80)).toBe(markerAt(0, 80))
    expect(markerAt(999, 80)).toBe(markerAt(80, 80))
  })

  it('survives a degenerate timeline or an unmeasured track', () => {
    // sliderMax 0 would divide by zero; trackWidth 0 would make travel negative.
    expect(markerAt(0, 0)).toBe(THUMB / 2 - MARKER / 2)
    expect(markerAt(5, 80, 0)).toBe(THUMB / 2 - MARKER / 2)
    expect(Number.isFinite(markerAt(3, 0, 0))).toBe(true)
  })
})
