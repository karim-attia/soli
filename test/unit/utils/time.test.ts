import { formatElapsedDuration, formatElapsedDurationSpoken } from '../../../src/utils/time'

// Spoken HUD time for the badge a11y label (scoring plan round 2): "3:12" is read
// as a clock time by screen readers, so the label spells the units out.
describe('formatElapsedDurationSpoken', () => {
  it('spells out hours, minutes and seconds, dropping zero parts', () => {
    expect(formatElapsedDurationSpoken(0)).toBe('0 seconds')
    expect(formatElapsedDurationSpoken(1_000)).toBe('1 second')
    expect(formatElapsedDurationSpoken(45_000)).toBe('45 seconds')
    expect(formatElapsedDurationSpoken(60_000)).toBe('1 minute')
    expect(formatElapsedDurationSpoken(192_000)).toBe('3 minutes 12 seconds')
    expect(formatElapsedDurationSpoken(3_725_000)).toBe('1 hour 2 minutes 5 seconds')
    expect(formatElapsedDurationSpoken(7_200_000)).toBe('2 hours')
  })

  it('agrees with the visible badge text on the same input', () => {
    expect(formatElapsedDuration(192_000)).toBe('3:12')
    expect(formatElapsedDuration(3_725_000)).toBe('1:02:05')
  })
})
