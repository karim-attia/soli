import { act, createElement, useRef } from 'react'
import TestRenderer from 'react-test-renderer'

import {
  parseSettingsLinkParam,
  resolveWarningLinkUpdate,
  useDemoGameLauncher,
  type WarningLinkUpdate,
} from '../../../../src/features/klondike/hooks/useDemoGameLauncher'
import { createInitialState, type GameState } from '../../../../src/solitaire/klondike'
import {
  createStuckGameState,
  createUnwinnableGameState,
} from '../../../../src/solitaire/demoReplay'
import { boardSignature } from '../../../../src/storage/gamePersistence'
import type { WarningMode } from '../../../../src/state/settings'

// Only Linking is used from react-native on this path, and mocking it lets the
// end-to-end describe at the bottom deliver a real URL to the real
// processDemoLink.
jest.mock('react-native', () => {
  const listeners: Array<(event: { url: string }) => void> = []
  return {
    Linking: {
      getInitialURL: () => Promise.resolve(null),
      addEventListener: (_type: string, handler: (event: { url: string }) => void) => {
        listeners.push(handler)
        return {
          remove: () => {
            listeners.splice(listeners.indexOf(handler), 1)
          },
        }
      },
      emitUrl: (url: string) => {
        listeners.forEach((handler) => handler({ url }))
      },
    },
  }
})

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

  it('parses the rewind-to-winnable key and its long spelling', () => {
    expect(parseSettingsLinkParam('rewind:on')).toEqual({
      rewindToWinnable: true,
      warningUpdates: [],
      ignoredPairs: [],
    })
    expect(parseSettingsLinkParam('rewindToWinnable:off')).toEqual({
      rewindToWinnable: false,
      warningUpdates: [],
      ignoredPairs: [],
    })
    // The realistic verification link: warning mode + rewind in one go.
    expect(parseSettingsLinkParam('warnings:unwinnable,rewind:on')).toEqual({
      rewindToWinnable: true,
      warningUpdates: [{ set: 'unwinnable' }],
      ignoredPairs: [],
    })
  })

  it('ignores a rewind pair with a junk value', () => {
    expect(parseSettingsLinkParam('rewind:maybe')).toEqual({
      warningUpdates: [],
      ignoredPairs: ['rewind:maybe'],
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
    expect(apply('unwinnable', { alias: 'unwinnable', enabled: true })).toBe('unwinnable')
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

// --- Regression for the 2026-09-10 device report ---------------------------
// Reported: `?set=warnings:unwinnable` did not apply on the phone while
// `hintButton:on` and `rewind:on` in the SAME link did. These cases drive the
// REAL processDemoLink with a real URL, so they cover the whole link path the
// pure tests above skip: the `soli://` URL parse, the wrapper's
// `#retry-<nonce>` fragment (which must not leak into the `set` value), the
// key's position in the list, and the functional-setter application order.
// Result: the link path is correct — see the plan doc for what else can
// explain the device observation.
const { Linking } = jest.requireMock('react-native') as {
  Linking: { emitUrl: (url: string) => void }
}
// React act() outside react-dom needs the env flag (React 19).
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('?set= links through processDemoLink', () => {
  type Applied = {
    hintButton?: boolean
    rewindToWinnable?: boolean
    warningMode?: WarningMode
  }

  const deliver = async (url: string, startMode: WarningMode = 'noUsefulMoves') => {
    const applied: Applied = {}
    // Mirrors SettingsProvider: one store, functional warning setter, so the
    // alias semantics resolve against the mode as earlier pairs left it.
    let warningMode = startMode

    const Harness = () => {
      useDemoGameLauncher({
        stateRef: useRef<GameState>(createInitialState(1)),
        dispatch: jest.fn(),
        dispatchGameAction: jest.fn(),
        developerModeEnabled: true,
        setDeveloperMode: jest.fn(),
        boardLockedRef: useRef(false),
        clearCelebrationDialogTimer: jest.fn(),
        recordCurrentGameResult: jest.fn(),
        setCelebrationState: jest.fn(),
        winCelebrationsRef: useRef(0),
        clearCurrentGameEntryLink: jest.fn(),
        demoPlaybackActiveRef: useRef(false),
        updateBoardLocked: jest.fn(),
        clearGameState: () => Promise.resolve(),
        preferredDrawCount: 1,
        autoUpEnabled: true,
        seedHistoryForTesting: jest.fn(),
        setDrawCount: jest.fn(),
        setAutoUpEnabled: jest.fn(),
        setSolvableGamesOnly: jest.fn(),
        setWarningMode: (mode) => {
          warningMode = typeof mode === 'function' ? mode(warningMode) : mode
          applied.warningMode = warningMode
        },
        setHintButtonEnabled: (enabled) => {
          applied.hintButton = enabled
        },
        setRewindToWinnableEnabled: (enabled) => {
          applied.rewindToWinnable = enabled
        },
        resetUndoHintForTesting: jest.fn(),
        dealNewGameForTesting: jest.fn(),
        startGameFromExactDeal: jest.fn(),
        startCelebrationPreview: jest.fn(),
      })
      return null
    }

    let renderer: TestRenderer.ReactTestRenderer | undefined
    await act(async () => {
      renderer = TestRenderer.create(createElement(Harness))
    })
    await act(async () => {
      Linking.emitUrl(url)
    })
    await act(async () => {
      renderer?.unmount()
    })
    return applied
  }

  it('applies warnings:unwinnable next to hintButton and rewind', async () => {
    expect(
      await deliver('soli://?set=warnings:unwinnable,hintButton:on,rewind:on')
    ).toEqual({
      hintButton: true,
      rewindToWinnable: true,
      warningMode: 'unwinnable',
    })
  })

  it('is unaffected by the wrapper’s #retry fragment or the key’s position', async () => {
    // yarn deeplink always appends `#retry-<nonce>`; the fragment must never
    // land inside the `set` value.
    expect(
      await deliver(
        'soli://?set=hintButton:on,warnings:unwinnable,rewind:on#retry-1757462400000'
      )
    ).toEqual({
      hintButton: true,
      rewindToWinnable: true,
      warningMode: 'unwinnable',
    })
    expect(
      await deliver(
        'soli:///?set=hintButton:on,rewind:on,warnings:unwinnable#retry-1757462400001'
      )
    ).toEqual({
      hintButton: true,
      rewindToWinnable: true,
      warningMode: 'unwinnable',
    })
  })

  it('upgrades from the default mode through the alias key too', async () => {
    expect(await deliver('soli://?set=unwinnableWarning:on#retry-2')).toEqual({
      warningMode: 'unwinnable',
    })
  })
})

// --- Fixture demo links (rewind-to-winnable round 2) ------------------------
// The two warning fixtures are reachable by name, and `deadend` still works as
// the original spelling of `unwinnable`. Asserted through the real
// processDemoLink so the alias and the routing are covered, not just the parser.
describe('?demo= fixture links', () => {
  const launch = async (url: string) => {
    const dispatch = jest.fn()
    const Harness = () => {
      useDemoGameLauncher({
        stateRef: useRef<GameState>(createInitialState(1)),
        dispatch,
        dispatchGameAction: jest.fn(),
        developerModeEnabled: true,
        setDeveloperMode: jest.fn(),
        boardLockedRef: useRef(false),
        clearCelebrationDialogTimer: jest.fn(),
        recordCurrentGameResult: jest.fn(),
        setCelebrationState: jest.fn(),
        winCelebrationsRef: useRef(0),
        clearCurrentGameEntryLink: jest.fn(),
        demoPlaybackActiveRef: useRef(false),
        updateBoardLocked: jest.fn(),
        clearGameState: () => Promise.resolve(),
        preferredDrawCount: 1,
        autoUpEnabled: true,
        seedHistoryForTesting: jest.fn(),
        setDrawCount: jest.fn(),
        setAutoUpEnabled: jest.fn(),
        setSolvableGamesOnly: jest.fn(),
        setWarningMode: jest.fn(),
        setHintButtonEnabled: jest.fn(),
        setRewindToWinnableEnabled: jest.fn(),
        resetUndoHintForTesting: jest.fn(),
        dealNewGameForTesting: jest.fn(),
        startGameFromExactDeal: jest.fn(),
        startCelebrationPreview: jest.fn(),
      })
      return null
    }

    jest.useFakeTimers()
    let renderer: TestRenderer.ReactTestRenderer | undefined
    await act(async () => {
      renderer = TestRenderer.create(createElement(Harness))
    })
    await act(async () => {
      Linking.emitUrl(url)
    })
    // The launcher settles every deep link by DEMO_AUTO_STEP_INTERVAL_MS.
    await act(async () => {
      jest.advanceTimersByTime(1000)
    })
    await act(async () => {
      renderer?.unmount()
    })
    jest.useRealTimers()

    const hydrate = dispatch.mock.calls
      .map(([action]) => action as { type: string; state?: GameState })
      .find((action) => action.type === 'HYDRATE_STATE')
    return hydrate?.state
  }

  it('routes ?demo=unwinnable to the unwinnable fixture', async () => {
    const state = await launch('soli://?demo=unwinnable#retry-1')
    expect(state).toBeDefined()
    expect(boardSignature(state!)).toBe(boardSignature(createUnwinnableGameState()))
  })

  it('keeps ?demo=deadend working as the original spelling', async () => {
    const state = await launch('soli://?demo=deadend#retry-2')
    expect(state).toBeDefined()
    expect(boardSignature(state!)).toBe(boardSignature(createUnwinnableGameState()))
  })

  it('routes ?demo=stuck to the stuck fixture', async () => {
    const state = await launch('soli://?demo=stuck#retry-3')
    expect(state).toBeDefined()
    expect(boardSignature(state!)).toBe(boardSignature(createStuckGameState()))
  })
})
