import { formatElapsedDuration } from '../../../src/utils/time'

// The spoken form moved to src/i18n/format.ts (test/unit/i18n/format.test.ts).
describe('formatElapsedDuration', () => {
  it('formats the visible badge text', () => {
    expect(formatElapsedDuration(192_000)).toBe('3:12')
    expect(formatElapsedDuration(3_725_000)).toBe('1:02:05')
  })
})
