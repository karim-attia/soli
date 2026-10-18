import { useCallback, useRef } from 'react'
import type { MutableRefObject } from 'react'

import {
  createInitialState,
  getDropHints,
  klondikeReducer,
  previewSelectionStack,
  TABLEAU_COLUMN_COUNT,
  type Card,
  type Foundations,
  type GameState,
  type MoveTarget,
  type Rank,
  type Selection,
  type Suit,
  type Tableau,
} from '../../../solitaire/klondike'
import { devLog } from '../../../utils/devLogger'
import {
  buildDragSourceModel,
  buildDropCandidates,
  hitTestDragSource,
  resolveDropCandidate,
  type DragSourceHit,
  type DropResolution,
} from '../components/cards/dragGeometry'
import {
  computeTableauStackOffsets,
  computeWasteFanGeometry,
  resolveTableauPosition,
  resolveTopRowPosition,
  type AbsoluteCardLayerLayouts,
  type HintRect,
} from '../components/cards/utils'
import type { CardMetrics } from '../types'

// Dev-only drag self-test: `soli://?dragtest=1` (developer mode gated, same
// pattern as ?reset= / ?celebration= in useDemoGameLauncher).
//
// What it verifies, and what it deliberately does NOT.
// It drives the drag DECISION pipeline directly — build the source model, hit-test
// a card, derive the selection, compute the drop-hint mask, build the drop zones,
// resolve a release rect, and finally run the resolved move through the REAL
// reducer — against the live, measured layout registry and the live card metrics
// of the device it is running on. That is the part unit tests cannot cover: they
// use fixture layouts, so a device-specific measurement bug (an unmeasured column,
// a zero metric, a mis-scaled stack offset) would slip through them.
// It does NOT exercise RNGH plumbing (activation thresholds, touch cancellation,
// pointerEvents collection). Those need real touches — see the plan doc's Testing
// section for what a human/Appium still has to check.
//
// Every case runs on a SYNTHETIC board, so the player's actual game is never
// touched: no dispatch reaches the live reducer, nothing is persisted.

type DragTestCase = {
  name: string
  state: GameState
  // Where the finger goes down, in board space.
  probe: (context: GeometryContext, state: GameState) => { x: number; y: number } | null
  // Where the base card's top-left ends up at release, in board space.
  release: (context: GeometryContext, state: GameState) => HintRect | null
  expectCardId: (state: GameState) => string
  expectLiftedCount: number
  expectResolution: DropResolution['kind']
  expectTarget?: MoveTarget
}

type GeometryContext = {
  layouts: AbsoluteCardLayerLayouts
  cardMetrics: CardMetrics
}

const suitRankId = (suit: Suit, rank: Rank, tag: string): string => `${suit}-${rank}-${tag}`

const makeCard = (suit: Suit, rank: Rank, faceUp = true, tag = 'dt'): Card => ({
  id: suitRankId(suit, rank, tag),
  suit,
  rank,
  faceUp,
})

const emptyFoundations = (): Foundations => ({
  hearts: [],
  diamonds: [],
  clubs: [],
  spades: [],
})

const padTableau = (...columns: Card[][]): Tableau => [
  ...columns,
  ...Array.from({ length: TABLEAU_COLUMN_COUNT - columns.length }, () => [] as Card[]),
]

// A full GameState is only needed for the reducer round-trip at the end of each
// case; everything before that reads the four pile slices. Auto Up stays off so
// finalizeState never schedules an auto queue mid-assertion.
const harnessState = (overrides: {
  tableau?: Tableau
  waste?: Card[]
  foundations?: Foundations
}): GameState => ({
  ...createInitialState(1),
  stock: [],
  waste: overrides.waste ?? [],
  foundations: overrides.foundations ?? emptyFoundations(),
  tableau: overrides.tableau ?? padTableau(),
  history: [],
  future: [],
  selected: null,
  moveLog: [],
  autoQueue: [],
  isAutoCompleting: false,
  autoUpEnabled: false,
  moveCount: 0,
})

const tableauCardRect = (
  { layouts, cardMetrics }: GeometryContext,
  tableau: Tableau,
  columnIndex: number,
  cardIndex: number
): HintRect | null => {
  const position = resolveTableauPosition(
    layouts.tableauRow,
    layouts.tableauColumns[columnIndex] ?? null
  )
  const column = tableau[columnIndex]
  if (!position || !column) {
    return null
  }
  const offsets = computeTableauStackOffsets(column, cardMetrics.stackOffset)
  // An empty column's "card rect" is the slot itself (drop target for a King).
  const offset = column.length ? offsets[Math.min(cardIndex, column.length - 1)] : 0
  return {
    x: position.x,
    y: position.y + offset,
    width: cardMetrics.width,
    height: cardMetrics.height,
  }
}

// Where a dropped run's base card lands when the player aims at a column: on top
// of that column's last card (or on the empty slot).
const tableauDropRect = (
  context: GeometryContext,
  tableau: Tableau,
  columnIndex: number
): HintRect | null =>
  tableauCardRect(context, tableau, columnIndex, Math.max(tableau[columnIndex].length - 1, 0))

const foundationRect = (
  { layouts, cardMetrics }: GeometryContext,
  suit: Suit
): HintRect | null => {
  const position = resolveTopRowPosition(layouts.topRow, layouts.foundations[suit] ?? null)
  return position
    ? {
        x: position.x,
        y: position.y,
        width: cardMetrics.width,
        height: cardMetrics.height,
      }
    : null
}

const wasteTopRect = (
  { layouts, cardMetrics }: GeometryContext,
  waste: Card[]
): HintRect | null => {
  const position = resolveTopRowPosition(layouts.topRow, layouts.waste)
  const visibleCount = Math.min(waste.length, 3)
  if (!position || !visibleCount) {
    return null
  }
  const fan = computeWasteFanGeometry(visibleCount, cardMetrics.width)
  return {
    x: position.x + fan.baseXOffset + (visibleCount - 1) * fan.overlap,
    y: position.y,
    width: cardMetrics.width,
    height: cardMetrics.height,
  }
}

// Probe just inside a rect's top-left: a covered card's exclusive band runs from
// its own top edge to the next card's top edge, so its geometric centre can belong
// to the card stacked on top of it.
const probeInside = (rect: HintRect): { x: number; y: number } => ({
  x: rect.x + rect.width / 2,
  y: rect.y + 2,
})

const selectionFromHit = (hit: DragSourceHit): Selection => {
  if (hit.source === 'tableau') {
    return { source: 'tableau', columnIndex: hit.columnIndex, cardIndex: hit.cardIndex }
  }
  if (hit.source === 'waste') {
    return { source: 'waste' }
  }
  return { source: 'foundation', suit: hit.suit }
}

const buildCases = (): DragTestCase[] => {
  // 1. Single card, tableau -> tableau.
  const singleSource = makeCard('hearts', 7, true, 'a')
  const singleState = harnessState({
    tableau: padTableau([singleSource], [makeCard('spades', 8, true, 'b')]),
  })

  // 2. Three-card run, tableau -> tableau. The whole run lifts; only the base
  //    card has to land.
  const runBase = makeCard('hearts', 7, true, 'c')
  const runState = harnessState({
    tableau: padTableau(
      [makeCard('clubs', 10, false, 'd'), runBase, makeCard('spades', 6, true, 'e'), makeCard('diamonds', 5, true, 'f')],
      [makeCard('spades', 8, true, 'g')]
    ),
  })

  // 3. Waste -> foundation.
  const wasteAce = makeCard('clubs', 1, true, 'h')
  const wasteState = harnessState({
    waste: [makeCard('hearts', 9, true, 'i'), makeCard('spades', 3, true, 'j'), wasteAce],
  })

  // 4. Foundation -> tableau (pulling a card back down).
  const foundationTop = makeCard('spades', 2, true, 'k')
  const foundations = emptyFoundations()
  foundations.spades = [makeCard('spades', 1, true, 'l'), foundationTop]
  const foundationState = harnessState({
    tableau: padTableau([makeCard('hearts', 3, true, 'm')]),
    foundations,
  })

  // 5. King -> empty column, and 6. non-King -> empty column (illegal).
  const king = makeCard('spades', 13, true, 'n')
  const kingState = harnessState({ tableau: padTableau([king]) })
  const nonKing = makeCard('spades', 9, true, 'o')
  const nonKingState = harnessState({ tableau: padTableau([nonKing]) })

  // 7. Drop over nothing, and 8. sloppy tap (released where it started).
  const lonely = makeCard('hearts', 4, true, 'p')
  const lonelyState = harnessState({ tableau: padTableau([lonely]) })

  return [
    {
      name: 'single card tableau -> tableau',
      state: singleState,
      probe: (context, state) => {
        const rect = tableauCardRect(context, state.tableau, 0, 0)
        return rect ? probeInside(rect) : null
      },
      release: (context, state) => tableauDropRect(context, state.tableau, 1),
      expectCardId: () => singleSource.id,
      expectLiftedCount: 1,
      expectResolution: 'legal',
      expectTarget: { type: 'tableau', columnIndex: 1 },
    },
    {
      name: '3-card run tableau -> tableau',
      state: runState,
      probe: (context, state) => {
        const rect = tableauCardRect(context, state.tableau, 0, 1)
        return rect ? probeInside(rect) : null
      },
      release: (context, state) => tableauDropRect(context, state.tableau, 1),
      expectCardId: () => runBase.id,
      expectLiftedCount: 3,
      expectResolution: 'legal',
      expectTarget: { type: 'tableau', columnIndex: 1 },
    },
    {
      name: 'waste -> foundation',
      state: wasteState,
      probe: (context, state) => {
        const rect = wasteTopRect(context, state.waste)
        return rect ? probeInside(rect) : null
      },
      release: (context) => foundationRect(context, 'clubs'),
      expectCardId: () => wasteAce.id,
      expectLiftedCount: 1,
      expectResolution: 'legal',
      expectTarget: { type: 'foundation', suit: 'clubs' },
    },
    {
      name: 'foundation -> tableau',
      state: foundationState,
      probe: (context) => {
        const rect = foundationRect(context, 'spades')
        return rect ? probeInside(rect) : null
      },
      release: (context, state) => tableauDropRect(context, state.tableau, 0),
      expectCardId: () => foundationTop.id,
      expectLiftedCount: 1,
      expectResolution: 'legal',
      expectTarget: { type: 'tableau', columnIndex: 0 },
    },
    {
      name: 'King -> empty column',
      state: kingState,
      probe: (context, state) => {
        const rect = tableauCardRect(context, state.tableau, 0, 0)
        return rect ? probeInside(rect) : null
      },
      release: (context, state) => tableauDropRect(context, state.tableau, 3),
      expectCardId: () => king.id,
      expectLiftedCount: 1,
      expectResolution: 'legal',
      expectTarget: { type: 'tableau', columnIndex: 3 },
    },
    {
      name: 'non-King -> empty column (illegal, wiggles)',
      state: nonKingState,
      probe: (context, state) => {
        const rect = tableauCardRect(context, state.tableau, 0, 0)
        return rect ? probeInside(rect) : null
      },
      release: (context, state) => tableauDropRect(context, state.tableau, 3),
      expectCardId: () => nonKing.id,
      expectLiftedCount: 1,
      expectResolution: 'illegal',
    },
    {
      name: 'drop over nothing (silent snap back)',
      state: lonelyState,
      probe: (context, state) => {
        const rect = tableauCardRect(context, state.tableau, 0, 0)
        return rect ? probeInside(rect) : null
      },
      release: (context, state) => {
        const rect = tableauCardRect(context, state.tableau, 0, 0)
        // Far below every drop zone: the board's bottom edge is nothing but felt.
        return rect ? { ...rect, y: rect.y + context.cardMetrics.height * 8 } : null
      },
      expectCardId: () => lonely.id,
      expectLiftedCount: 1,
      expectResolution: 'none',
    },
    {
      name: 'sloppy tap (released on its own card -> tap fallback)',
      state: lonelyState,
      probe: (context, state) => {
        const rect = tableauCardRect(context, state.tableau, 0, 0)
        return rect ? probeInside(rect) : null
      },
      release: (context, state) => tableauCardRect(context, state.tableau, 0, 0),
      expectCardId: () => lonely.id,
      expectLiftedCount: 1,
      // Dropped back on the source pile: silent, and useCardDrag routes it to the
      // tap handler because the release point is inside the origin card's rect.
      expectResolution: 'self',
    },
  ]
}

type UseDragSelfTestOptions = {
  stateRef: MutableRefObject<GameState>
  layouts: AbsoluteCardLayerLayouts
  cardMetrics: CardMetrics
}

export const useDragSelfTest = ({
  stateRef,
  layouts,
  cardMetrics,
}: UseDragSelfTestOptions): (() => void) => {
  const contextRef = useRef<GeometryContext>({ layouts, cardMetrics })
  contextRef.current = { layouts, cardMetrics }

  return useCallback(() => {
    const context = contextRef.current
    if (!context.layouts.topRow || !context.layouts.tableauRow) {
      devLog('warn', '[DragTest] FAIL setup: board layout not measured yet.')
      return
    }

    let passed = 0
    let failed = 0
    const fail = (name: string, reason: string, detail?: Record<string, unknown>) => {
      failed += 1
      devLog('warn', `[DragTest] FAIL ${name}: ${reason}`, detail ?? {})
    }

    buildCases().forEach((testCase) => {
      const point = testCase.probe(context, testCase.state)
      const release = testCase.release(context, testCase.state)
      if (!point || !release) {
        fail(testCase.name, 'could not resolve probe/release geometry from the layouts')
        return
      }

      const model = buildDragSourceModel({
        tableau: testCase.state.tableau,
        waste: testCase.state.waste,
        foundations: testCase.state.foundations,
        layouts: context.layouts,
        cardMetrics: context.cardMetrics,
        enabled: true,
      })
      const hit = hitTestDragSource(model, point.x, point.y)
      if (!hit) {
        fail(testCase.name, 'hit test found no draggable card under the probe', { point })
        return
      }
      if (hit.cardId !== testCase.expectCardId(testCase.state)) {
        fail(testCase.name, 'hit test grabbed the wrong card', {
          got: hit.cardId,
          want: testCase.expectCardId(testCase.state),
        })
        return
      }

      const selection = selectionFromHit(hit)
      const lifted = previewSelectionStack(testCase.state, selection)
      if (lifted.length !== testCase.expectLiftedCount) {
        fail(testCase.name, 'wrong number of cards lifted', {
          got: lifted.length,
          want: testCase.expectLiftedCount,
        })
        return
      }

      const hints = getDropHints({
        selected: selection,
        tableau: testCase.state.tableau,
        foundations: testCase.state.foundations,
        waste: testCase.state.waste,
      })
      const resolution = resolveDropCandidate(
        buildDropCandidates({
          tableau: testCase.state.tableau,
          layouts: context.layouts,
          cardMetrics: context.cardMetrics,
          hints,
          selection,
        }),
        release
      )
      if (resolution.kind !== testCase.expectResolution) {
        fail(testCase.name, 'wrong drop resolution', {
          got: resolution.kind,
          want: testCase.expectResolution,
          release,
        })
        return
      }

      if (resolution.kind === 'legal') {
        const want = testCase.expectTarget
        if (JSON.stringify(resolution.target) !== JSON.stringify(want)) {
          fail(testCase.name, 'wrong drop target', { got: resolution.target, want })
          return
        }
        // Close the loop with the REAL reducer: a drop must be accepted as the very
        // same APPLY_MOVE a tap produces, and must log the same { k:'move' } entry
        // (which is why MOVE_LOG_VERSION does not move for this feature).
        const next = klondikeReducer(testCase.state, {
          type: 'APPLY_MOVE',
          selection,
          target: resolution.target,
        })
        const entry = next.moveLog[next.moveLog.length - 1]
        if (next === testCase.state || next.moveCount !== 1) {
          fail(testCase.name, 'reducer refused the resolved move')
          return
        }
        if (!entry || entry.k !== 'move') {
          fail(testCase.name, 'move log entry is not a plain move', { entry })
          return
        }
      }

      passed += 1
      devLog('log', `[DragTest] PASS ${testCase.name}`, {
        resolution: resolution.kind,
        lifted: lifted.length,
      })
    })

    // One case against the LIVE board: the source model must describe the cards
    // the player is actually looking at on this device's measured layout.
    const live = stateRef.current
    const liveModel = buildDragSourceModel({
      tableau: live.tableau,
      waste: live.waste,
      foundations: live.foundations,
      layouts: context.layouts,
      cardMetrics: context.cardMetrics,
      enabled: true,
    })
    const liveColumn = liveModel?.columns[0]
    const liveEntry = liveColumn?.cards[liveColumn.cards.length - 1]
    if (!liveColumn || !liveEntry) {
      fail('live board', 'no face-up tableau card found in the first measured column')
    } else {
      const liveHit = hitTestDragSource(
        liveModel,
        liveColumn.x + liveColumn.width / 2,
        liveEntry.y + 2
      )
      if (liveHit?.cardId !== liveEntry.cardId) {
        fail('live board', 'hit test disagrees with the live source model', {
          got: liveHit?.cardId,
          want: liveEntry.cardId,
        })
      } else {
        passed += 1
        devLog('log', '[DragTest] PASS live board top card is grabbable', {
          cardId: liveEntry.cardId,
          columnIndex: liveColumn.columnIndex,
        })
      }
    }

    devLog(
      failed ? 'warn' : 'info',
      `[DragTest] ${failed ? 'FAIL' : 'PASS'} summary: ${passed} passed, ${failed} failed`,
      { cardMetrics: context.cardMetrics }
    )
  }, [stateRef])
}
