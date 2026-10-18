import {
  SETTINGS_ROW_DISABLED_TEXT_COLOR,
  SETTINGS_ROW_SECONDARY_TEXT_COLOR,
} from '../../../components/settings/settingsRowColors'

// The settings rows render inside the @expo/ui Host's own chrome and never
// learn whether it came up light or dark, so each colour is a single hardcoded
// value that has to be legible on BOTH grounds. That claim used to live only in
// a comment — and was false: the disabled description was #5A5A5F, DARKER than
// the enabled one, which reads as muted on white and as ~2.5:1 (invisible) on a
// dark row. This suite makes the claim checkable.
//
// Grounds: #FFFFFF is the light grouped-list row background, #1C1C1E the dark
// one (iOS secondarySystemGroupedBackground); #000000 is the pessimistic bound
// for an OLED-black Android Host.
const LIGHT_ROW = '#FFFFFF'
const DARK_ROW = '#1C1C1E'
const BLACK_ROW = '#000000'

// WCAG 2.1 relative luminance + contrast ratio, straight from the spec.
const channelLuminance = (channel: number): number => {
  const value = channel / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

const relativeLuminance = (hex: string): number => {
  const value = hex.replace('#', '')
  const [red, green, blue] = [0, 2, 4].map((offset) =>
    Number.parseInt(value.slice(offset, offset + 2), 16)
  )
  return (
    0.2126 * channelLuminance(red) +
    0.7152 * channelLuminance(green) +
    0.0722 * channelLuminance(blue)
  )
}

const contrastRatio = (a: string, b: string): number => {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (first, second) => second - first
  )
  return (lighter + 0.05) / (darker + 0.05)
}

// The floor is 3:1, not AA's 4.5:1, on purpose: #8E8E93 IS the resolved iOS
// secondaryLabel colour (3.2:1 on white) and matching the platform's own
// secondary text is the point. 3:1 is what separates "reads as muted" from
// "disappeared", which is the failure this suite exists to catch.
const MIN_CONTRAST = 3

describe('settings row text colours', () => {
  it('reads on a light row, a dark row and pure black', () => {
    for (const color of [
      SETTINGS_ROW_SECONDARY_TEXT_COLOR,
      SETTINGS_ROW_DISABLED_TEXT_COLOR,
    ]) {
      for (const ground of [LIGHT_ROW, DARK_ROW, BLACK_ROW]) {
        expect(contrastRatio(color, ground)).toBeGreaterThanOrEqual(MIN_CONTRAST)
      }
    }
  })

  it('never makes the disabled text HARDER to see than the enabled text', () => {
    // The exact regression: a "stepped down" disabled colour that is darker
    // than the enabled one buys legibility on white by spending it on dark.
    for (const ground of [LIGHT_ROW, DARK_ROW, BLACK_ROW]) {
      expect(contrastRatio(SETTINGS_ROW_DISABLED_TEXT_COLOR, ground)).toBeCloseTo(
        contrastRatio(SETTINGS_ROW_SECONDARY_TEXT_COLOR, ground),
        5
      )
    }
  })

  it('pins the measured ratios quoted in settingsRowColors.ts', () => {
    expect(contrastRatio(SETTINGS_ROW_SECONDARY_TEXT_COLOR, LIGHT_ROW)).toBeCloseTo(
      3.26,
      2
    )
    expect(contrastRatio(SETTINGS_ROW_SECONDARY_TEXT_COLOR, DARK_ROW)).toBeCloseTo(
      5.22,
      2
    )
  })

  it('rejects the colour this suite was written for (#5A5A5F on a dark row)', () => {
    // Guard on the guard: proof that MIN_CONTRAST actually discriminates.
    expect(contrastRatio('#5A5A5F', DARK_ROW)).toBeLessThan(MIN_CONTRAST)
  })
})
