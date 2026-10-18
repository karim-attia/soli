import {
  DEFAULT_SETTINGS,
  mergeSettings,
  parseScoringMode,
  type SettingsState,
} from '../../../src/state/settings'

// Scoring picker (docs/product/scoring/scoring.md): off by default, persisted
// inside `statistics`, junk and pre-scoring payloads fall back to the default.
describe('scoring setting defaults and merge', () => {
  it('defaults to off', () => {
    expect(DEFAULT_SETTINGS.statistics.scoring).toBe('off')
  })

  it('keeps the default for payloads written before scoring existed', () => {
    const legacy = {
      statistics: { showMoves: false, showTime: true },
    } as unknown as Partial<SettingsState>
    expect(mergeSettings(DEFAULT_SETTINGS, legacy).statistics).toEqual({
      showMoves: false,
      showTime: true,
      scoring: 'off',
      vegasTotal: false,
      vegasTotalOffset: 0,
    })
  })

  // Cumulative Vegas total (P2-C): switch + reset offset live next to the picker.
  it('round-trips the Keep Vegas total switch and its reset offset, rejecting junk', () => {
    expect(DEFAULT_SETTINGS.statistics.vegasTotal).toBe(false)
    expect(DEFAULT_SETTINGS.statistics.vegasTotalOffset).toBe(0)
    const merged = mergeSettings(DEFAULT_SETTINGS, {
      statistics: { ...DEFAULT_SETTINGS.statistics, vegasTotal: true, vegasTotalOffset: -121 },
    })
    expect(merged.statistics.vegasTotal).toBe(true)
    expect(merged.statistics.vegasTotalOffset).toBe(-121)
    const junk = {
      statistics: { vegasTotal: 'yes', vegasTotalOffset: '12' },
    } as unknown as Partial<SettingsState>
    expect(mergeSettings(DEFAULT_SETTINGS, junk).statistics.vegasTotal).toBe(false)
    expect(mergeSettings(DEFAULT_SETTINGS, junk).statistics.vegasTotalOffset).toBe(0)
  })

  it('round-trips every valid mode and rejects junk', () => {
    for (const scoring of ['off', 'standard', 'vegas'] as const) {
      const merged = mergeSettings(DEFAULT_SETTINGS, {
        statistics: { ...DEFAULT_SETTINGS.statistics, scoring },
      })
      expect(merged.statistics.scoring).toBe(scoring)
    }
    const junk = {
      statistics: { scoring: 'casino' },
    } as unknown as Partial<SettingsState>
    expect(mergeSettings(DEFAULT_SETTINGS, junk).statistics.scoring).toBe('off')
    expect(parseScoringMode('Vegas')).toBeNull()
    expect(parseScoringMode(3)).toBeNull()
    expect(parseScoringMode('vegas')).toBe('vegas')
  })
})
