import {
  DEFAULT_SETTINGS,
  mergeSettings,
  type SettingsState,
} from '../../../src/state/settings'

// F14: one warningMode select replaced the two F11 warning booleans. The merge
// is the whole persistence story (readPersistedSettings feeds every stored
// payload through it), so defaults + the full migration chain are tested here
// on the pure function. Chain under test (newest shape wins):
//   explicit warningMode → round-2 {stuckWarning, unwinnableWarning} →
//   pre-F11 hintsEnabled → default.
describe('hint settings defaults and migration', () => {
  it('defaults: warning mode noUsefulMoves, hint button OFF, rewind OFF', () => {
    expect(DEFAULT_SETTINGS.hints).toEqual({
      warningMode: 'noUsefulMoves',
      hintButton: false,
      rewindToWinnable: false,
    })
  })

  it('keeps defaults for empty or missing payloads', () => {
    expect(mergeSettings(DEFAULT_SETTINGS, undefined).hints).toEqual(
      DEFAULT_SETTINGS.hints
    )
    expect(mergeSettings(DEFAULT_SETTINGS, {}).hints).toEqual(DEFAULT_SETTINGS.hints)
    expect(
      mergeSettings(DEFAULT_SETTINGS, { hints: {} } as unknown as Partial<SettingsState>)
        .hints
    ).toEqual(DEFAULT_SETTINGS.hints)
  })

  describe('round-2 (F11) boolean migration matrix', () => {
    // Real F11 payloads always contain all three booleans (settings persist
    // the full state object). unwinnable outranks stuck (strictness ladder).
    const matrix: Array<{
      stuckWarning: boolean
      unwinnableWarning: boolean
      expected: SettingsState['hints']['warningMode']
    }> = [
      { stuckWarning: true, unwinnableWarning: true, expected: 'unwinnable' },
      { stuckWarning: false, unwinnableWarning: true, expected: 'unwinnable' },
      { stuckWarning: true, unwinnableWarning: false, expected: 'noUsefulMoves' },
      { stuckWarning: false, unwinnableWarning: false, expected: 'off' },
    ]

    it.each(matrix)(
      'stuck=$stuckWarning unwinnable=$unwinnableWarning → $expected',
      ({ stuckWarning, unwinnableWarning, expected }) => {
        const payload = {
          hints: { stuckWarning, hintButton: true, unwinnableWarning },
        } as unknown as Partial<SettingsState>
        expect(mergeSettings(DEFAULT_SETTINGS, payload).hints).toEqual({
          warningMode: expected,
          hintButton: true,
          rewindToWinnable: false,
        })
      }
    )

    it('resolves keys absent from partial payloads to their F11 defaults', () => {
      // stuck default was ON, unwinnable default was OFF.
      expect(
        mergeSettings(DEFAULT_SETTINGS, {
          hints: { unwinnableWarning: true },
        } as unknown as Partial<SettingsState>).hints.warningMode
      ).toBe('unwinnable')
      expect(
        mergeSettings(DEFAULT_SETTINGS, {
          hints: { stuckWarning: false },
        } as unknown as Partial<SettingsState>).hints.warningMode
      ).toBe('off')
      expect(
        mergeSettings(DEFAULT_SETTINGS, {
          hints: { unwinnableWarning: false },
        } as unknown as Partial<SettingsState>).hints.warningMode
      ).toBe('noUsefulMoves')
    })
  })

  describe('pre-F11 hintsEnabled chain', () => {
    it('migrates legacy hintsEnabled:true to hint button ON + mode unwinnable', () => {
      // F11 mapped hintsEnabled:true → hintButton + unwinnableWarning both
      // ON; feeding that through the round-2 ladder lands on 'unwinnable' —
      // the even-older chain still resolves correctly through F14.
      const legacyPayload = { hintsEnabled: true } as Partial<SettingsState>
      expect(mergeSettings(DEFAULT_SETTINGS, legacyPayload).hints).toEqual({
        warningMode: 'unwinnable',
        hintButton: true,
        // Deliberately NOT migrated: hintsEnabled predates the rewind feature
        // and never meant "rewind me".
        rewindToWinnable: false,
      })
    })

    it('treats legacy hintsEnabled:false as plain defaults', () => {
      const legacyPayload = { hintsEnabled: false } as Partial<SettingsState>
      expect(mergeSettings(DEFAULT_SETTINGS, legacyPayload).hints).toEqual(
        DEFAULT_SETTINGS.hints
      )
    })
  })

  it('lets an explicit warningMode win over both legacy generations', () => {
    const payload = {
      hintsEnabled: true,
      hints: { warningMode: 'off', stuckWarning: true, unwinnableWarning: true },
    } as unknown as Partial<SettingsState>
    const merged = mergeSettings(DEFAULT_SETTINGS, payload)
    expect(merged.hints.warningMode).toBe('off')
    // The legacy hintsEnabled mapping for the button still applies (no
    // explicit hintButton in the payload).
    expect(merged.hints.hintButton).toBe(true)
  })

  it('lets an explicit hintButton win over the legacy key', () => {
    const payload = {
      hintsEnabled: true,
      hints: { hintButton: false },
    } as unknown as Partial<SettingsState>
    expect(mergeSettings(DEFAULT_SETTINGS, payload).hints).toEqual({
      // hintsEnabled still feeds the warning ladder…
      warningMode: 'unwinnable',
      // …but the explicitly stored false beats its button mapping.
      hintButton: false,
      rewindToWinnable: false,
    })
  })

  it('accepts every valid warningMode string', () => {
    for (const mode of ['off', 'noUsefulMoves', 'unwinnable'] as const) {
      expect(
        mergeSettings(DEFAULT_SETTINGS, {
          hints: { warningMode: mode },
        } as unknown as Partial<SettingsState>).hints.warningMode
      ).toBe(mode)
    }
  })

  it('ignores junk warningMode values and non-boolean junk', () => {
    expect(
      mergeSettings(DEFAULT_SETTINGS, {
        hints: { warningMode: 'banana' },
      } as unknown as Partial<SettingsState>).hints
    ).toEqual(DEFAULT_SETTINGS.hints)
    expect(
      mergeSettings(DEFAULT_SETTINGS, {
        hints: { warningMode: 3, hintButton: 'yes' },
      } as unknown as Partial<SettingsState>).hints
    ).toEqual(DEFAULT_SETTINGS.hints)
    // Junk round-2 booleans don't trigger the migration either.
    expect(
      mergeSettings(DEFAULT_SETTINGS, {
        hints: { stuckWarning: 'yes' },
      } as unknown as Partial<SettingsState>).hints
    ).toEqual(DEFAULT_SETTINGS.hints)
  })

  describe('rewind-to-winnable toggle', () => {
    it('defaults OFF and stays off for payloads written before it existed', () => {
      expect(DEFAULT_SETTINGS.hints.rewindToWinnable).toBe(false)
      // A real pre-feature payload: full hints object, no rewind key.
      const preFeature = {
        hints: { warningMode: 'unwinnable', hintButton: true },
      } as unknown as Partial<SettingsState>
      expect(mergeSettings(DEFAULT_SETTINGS, preFeature).hints.rewindToWinnable).toBe(
        false
      )
    })

    it('round-trips an explicitly stored value', () => {
      for (const stored of [true, false]) {
        expect(
          mergeSettings(DEFAULT_SETTINGS, {
            hints: { rewindToWinnable: stored },
          } as unknown as Partial<SettingsState>).hints.rewindToWinnable
        ).toBe(stored)
      }
    })

    it('keeps a stored true when merging onto a current state that has it on', () => {
      // mergeSettings falls back to `current`, not to DEFAULT_SETTINGS — guards
      // against the fallback being hard-coded to the default.
      const current: SettingsState = {
        ...DEFAULT_SETTINGS,
        hints: { ...DEFAULT_SETTINGS.hints, rewindToWinnable: true },
      }
      expect(mergeSettings(current, {}).hints.rewindToWinnable).toBe(true)
    })

    it('ignores junk values', () => {
      expect(
        mergeSettings(DEFAULT_SETTINGS, {
          hints: { rewindToWinnable: 'yes' },
        } as unknown as Partial<SettingsState>).hints.rewindToWinnable
      ).toBe(false)
    })
  })

  it('leaves unrelated settings untouched by the migration', () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, {
      hintsEnabled: true,
      drawCount: 3,
      autoUpEnabled: false,
    } as Partial<SettingsState>)
    expect(merged.drawCount).toBe(3)
    expect(merged.autoUpEnabled).toBe(false)
    expect(merged.solvableGamesOnly).toBe(DEFAULT_SETTINGS.solvableGamesOnly)
  })
})
