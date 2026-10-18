// Geometry for the "last winnable move" marker on the undo-scrubber track
// (rewind-to-winnable plan).
//
// Mirrors the thumb math in UndoScrubber: the thumb is a `thumbSize`-wide box
// living at left: 0 and translated across `trackWidth - thumbSize`, so the
// thumb's CENTRE for a given index is normalized * travelWidth + thumbSize / 2.
// The marker is centred on that same point, which is what makes "drag until the
// thumb sits on the marker" land on exactly the marked index.
//
// Pure and separate from the component so the geometry is unit-testable without
// rendering; 'worklet' because it is called from a Reanimated animated style
// (the track width only exists as a shared value).
export const getScrubMarkerLeft = ({
  index,
  sliderMax,
  trackWidth,
  thumbSize,
  markerWidth,
}: {
  index: number
  sliderMax: number
  trackWidth: number
  thumbSize: number
  markerWidth: number
}): number => {
  'worklet'

  const clampedIndex = Math.max(0, Math.min(index, sliderMax))
  const normalized = sliderMax <= 0 ? 0 : clampedIndex / sliderMax
  const travelWidth = Math.max(trackWidth - thumbSize, 0)
  return normalized * travelWidth + thumbSize / 2 - markerWidth / 2
}
