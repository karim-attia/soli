import {
  parseSettingsLinkParam,
  resolveWarningLinkUpdate,
  type WarningLinkUpdate,
} from '../../../../src/features/klondike/hooks/useDemoGameLauncher'
import type { WarningMode } from '../../../../src/state/settings'

// ?set=key:value[,key:value...] parsing (agent-testing-skill C1). The parser is
// pure; unknown keys/values land in ignoredPairs and the launcher applies the
// rest. Since F14 the warning mode has one canonical key
// (warnings:off|stuck|unwinnable) plus the round-2 boolean keys as aliases
// (collected in link order, resolved against the current mode); `hints` stays
// as an alias for the Hint button (the pre-split link name).
describe('parseSettingsLinkParam', () => {
  it('parses the core keys plus the hints alias', () => {
    expect(
      parseSettingsLinkParam('drawCount:3,autoUp:off,solvableOnly:on,hints:on')
    ).toEqual({
      drawCount: 3,
      autoUp: false,
      solvableOnly: true,
      hintButton: true,
      warningUpdates: [],
      ignoredPairs: [],
    })
  })

  it('parses the canonical warnings key for all three modes', () => {
    expect(parseSettingsLinkParam('warnings:off').warningUpdates).toEqual([
      { set: 'off' },
    ])
    expect(parseSettingsLinkParam('warnings:stuck').warningUpdates).toEqual([
      { set: 'noUsefulMoves' },
    ])
    expect(parseSettingsLinkParam('warnings:unwinnable').warningUpdates).toEqual([
      { set: 'unwinnable' },
    ])
    // The setting's real key spelling works too.
    expect(parseSettingsLinkParam('warnings:noUsefulMoves').warningUpdates).toEqual([
      { set: 'noUsefulMoves' },
    ])
  })

  it('parses the scoring key (case-insensitive) and rejects unknown modes', () => {
    expect(parseSettingsLinkParam('scoring:vegas').scoring).toBe('vegas')
    expect(parseSettingsLinkParam('scoring:Standard').scoring).toBe('standard')
    expect(parseSettingsLinkParam('scoring:off').scoring).toBe('off')
    expect(parseSettingsLinkParam('scoring:casino')).toEqual({
      warningUpdates: [],
      ignoredPairs: ['scoring:casino'],
    })
  })

  it('parses the vegasTotal switch (P2-C) like the other booleans', () => {
    expect(parseSettingsLinkParam('vegasTotal:on').vegasTotal).toBe(true)
    expect(parseSettingsLinkParam('VegasTotal:off').vegasTotal).toBe(false)
    expect(parseSettingsLinkParam('vegasTotal:maybe')).toEqual({
      warningUpdates: [],
      ignoredPairs: ['vegasTotal:maybe'],
    })
  })

  it('rejects unknown warnings values', () => {
    expect(parseSettingsLinkParam('warnings:loud')).toEqual({
      warningUpdates: [],
      ignoredPairs: ['warnings:loud'],
    })
  })

  it('collects round-2 alias keys as semantic updates in link order', () => {
    expect(
      parseSettingsLinkParam('stuckWarning:off,hintButton:on,unwinnableWarning:on')
    ).toEqual({
      hintButton: true,
      warningUpdates: [
        { alias: 'stuck', enabled: false },
        { alias: 'unwinnable', enabled: true },
      ],
      ignoredPairs: [],
    })
  })

  it('lets a later hintButton pair override the hints alias', () => {
    expect(parseSettingsLinkParam('hints:on,hintButton:off')).toEqual({
      hintButton: false,
      warningUpdates: [],
      ignoredPairs: [],
    })
  })

  it('is case-insensitive for keys and accepts boolean aliases', () => {
    expect(
      parseSettingsLinkParam('DRAWCOUNT:1,AutoUp:true,solvableonly:0,UnwinnableWarning:1')
    ).toEqual({
      drawCount: 1,
      autoUp: true,
      solvableOnly: false,
      warningUpdates: [{ alias: 'unwinnable', enabled: true }],
      ignoredPairs: [],
    })
  })

  it('ignores unknown keys but applies the rest', () => {
    expect(parseSettingsLinkParam('theme:dark,drawCount:2')).toEqual({
      drawCount: 2,
      warningUpdates: [],
      ignoredPairs: ['theme:dark'],
    })
  })

  it('ignores invalid values but applies the rest', () => {
    expect(
      parseSettingsLinkParam(
        'drawCount:9,autoUp:maybe,solvableOnly:off,stuckWarning:maybe'
      )
    ).toEqual({
      solvableOnly: false,
      warningUpdates: [],
      ignoredPairs: ['drawCount:9', 'autoUp:maybe', 'stuckWarning:maybe'],
    })
  })

  it('ignores pairs without a value and empty segments', () => {
    expect(parseSettingsLinkParam('autoUp,,  ,drawCount:4,hintButton')).toEqual({
      drawCount: 4,
      warningUpdates: [],
      ignoredPairs: ['autoUp', 'hintButton'],
    })
  })

  it('rejects non-integer draw counts', () => {
    expect(parseSettingsLinkParam('drawCount:2.5')).toEqual({
      warningUpdates: [],
      ignoredPairs: ['drawCount:2.5'],
    })
  })

  it('tolerates whitespace around pairs and values', () => {
    expect(parseSettingsLinkParam(' drawCount : 5 , warnings: stuck ')).toEqual({
      drawCount: 5,
      warningUpdates: [{ set: 'noUsefulMoves' }],
      ignoredPairs: [],
    })
  })
})

// Alias resolution semantics (F14): the round-2 keys map INTO the select
// without silently downgrading a stronger mode. Full truth table.
describe('resolveWarningLinkUpdate', () => {
  const apply = (current: WarningMode, update: WarningLinkUpdate) =>
    resolveWarningLinkUpdate(current, update)

  it('warnings:<mode> sets the mode outright', () => {
    for (const mode of ['off', 'noUsefulMoves', 'unwinnable'] as const) {
      expect(apply('unwinnable', { set: mode })).toBe(mode)
      expect(apply('off', { set: mode })).toBe(mode)
    }
  })

  it('stuckWarning:on upgrades to noUsefulMoves except from unwinnable', () => {
    expect(apply('off', { alias: 'stuck', enabled: true })).toBe('noUsefulMoves')
    expect(apply('noUsefulMoves', { alias: 'stuck', enabled: true })).toBe(
      'noUsefulMoves'
    )
    // Round-2 semantics: enabling the weak warning never turned the strong
    // one off.
    expect(apply('unwinnable', { alias: 'stuck', enabled: true })).toBe('unwinnable')
  })

  it('stuckWarning:off only turns the classic mode off', () => {
    expect(apply('noUsefulMoves', { alias: 'stuck', enabled: false })).toBe('off')
    expect(apply('off', { alias: 'stuck', enabled: false })).toBe('off')
    expect(apply('unwinnable', { alias: 'stuck', enabled: false })).toBe('unwinnable')
  })

  it('unwinnableWarning:on always wins (strongest mode)', () => {
    expect(apply('off', { alias: 'unwinnable', enabled: true })).toBe('unwinnable')
    expect(apply('noUsefulMoves', { alias: 'unwinnable', enabled: true })).toBe(
      'unwinnable'
    )
    expect(apply('unwinnable', { alias: 'unwinnable', enabled: true })).toBe(
      'unwinnable'
    )
  })

  it('unwinnableWarning:off steps back down to the classic default', () => {
    expect(apply('unwinnable', { alias: 'unwinnable', enabled: false })).toBe(
      'noUsefulMoves'
    )
    expect(apply('noUsefulMoves', { alias: 'unwinnable', enabled: false })).toBe(
      'noUsefulMoves'
    )
    expect(apply('off', { alias: 'unwinnable', enabled: false })).toBe('off')
  })

  it('resolves the F11 restore-defaults link sequence to the F14 default', () => {
    // The old three-toggle default restore (stuckWarning:on, hintButton:off,
    // unwinnableWarning:off) must land on the new default mode.
    let mode: WarningMode = 'unwinnable'
    for (const update of parseSettingsLinkParam(
      'stuckWarning:on,hintButton:off,unwinnableWarning:off'
    ).warningUpdates) {
      mode = apply(mode, update)
    }
    expect(mode).toBe('noUsefulMoves')
  })
})
