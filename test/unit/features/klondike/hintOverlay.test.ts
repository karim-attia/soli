import type { LayoutRectangle } from 'react-native'

// resolveHintRects moved to cards/utils in F8: HintOverlayLayer now renders a
// ghost CardVisual (tamagui import chain), so tests import the pure resolver
// from the geometry module instead of the component module.
import {
  computeTableauStackOffsets,
  computeWasteFanGeometry,
  createEmptyAbsoluteCardLayerLayouts,
  resolveHintRects,
  resolveStockRect,
  type AbsoluteCardLayerLayouts,
} from '../../../../src/features/klondike/components/cards/utils'
import {
  NO_HINT_BUBBLE_TEXT,
  STUCK_BUBBLE_TEXT,
  UNWINNABLE_BUBBLE_TEXT,
  getHintAnnouncement,
  getHintFallbackNoticeText,
} from '../../../../src/features/klondike/hooks/useHint'
import type { CardMetrics } from '../../../../src/features/klondike/types'
import type { SolverMoveHint } from '../../../../src/solitaire/solverBridge'
import { card, tableauWith } from '../../solitaire/helpers'

const METRICS: CardMetrics = { width: 50, height: 70, stackOffset: 20, radius: 6 }

const rect = (x: number, y: number, width = 120, height = 80): LayoutRectangle => ({
  x,
  y,
  width,
  height,
})

// Layout registry mirroring what useKlondikeGame measures: top row at the
// board origin, tableau row below it, columns spaced 55px apart.
const createLayouts = (): AbsoluteCardLayerLayouts => ({
  ...createEmptyAbsoluteCardLayerLayouts(),
  topRow: rect(0, 0, 400, 80),
  stock: rect(300, 5),
  waste: rect(240, 5),
  foundations: { clubs: rect(10, 5), spades: rect(70, 5) },
  tableauRow: rect(0, 100, 400, 300),
  tableauColumns: Array.from({ length: 7 }, (_, i) => rect(i * 55, 4)),
})

const moveHint = (
  cardCode: string,
  from: SolverMoveHint['from'],
  to: SolverMoveHint['to']
): SolverMoveHint => ({ kind: 'move', card: cardCode, from, to })

describe('resolveHintRects', () => {
  it('rings the whole moved run for a tableau source and the target column top card', () => {
    // Column 2: face-down base + a 3-card run whose base (7♥) is the hint card.
    const tableau = tableauWith(
      [card('spades', 9)],
      [],
      [card('clubs', 5, false), card('hearts', 7), card('spades', 6), card('diamonds', 5)]
    )
    const result = resolveHintRects(
      moveHint('h7', { type: 'tableau', index: 2 }, { type: 'tableau', index: 0 }),
      { wasteCount: 0, tableau },
      createLayouts(),
      METRICS
    )

    // Offsets in column 2: face-down 0, then 10/30/50 (face-down offset = 20/2).
    const offsets = computeTableauStackOffsets(tableau[2], METRICS.stackOffset)
    expect(offsets).toEqual([0, 10, 30, 50])
    // Column 2 origin = tableauRow (0,100) + column slot (110,4); run spans the
    // 7♥ top edge through the 5♦ bottom edge.
    expect(result?.source).toEqual({ x: 110, y: 104 + 10, width: 50, height: 110 })
    // Target = top card of column 0 (single 9♠ at the column origin).
    expect(result?.target).toEqual({ x: 0, y: 104, width: 50, height: 70 })
  })

  it('targets the empty-column slot when the destination column is empty', () => {
    const tableau = tableauWith([card('hearts', 13)])
    const result = resolveHintRects(
      moveHint('h13', { type: 'tableau', index: 0 }, { type: 'tableau', index: 3 }),
      { wasteCount: 0, tableau },
      createLayouts(),
      METRICS
    )
    expect(result?.target).toEqual({ x: 3 * 55, y: 104, width: 50, height: 70 })
  })

  it('rings the top card of the waste fan for waste sources', () => {
    const result = resolveHintRects(
      moveHint('d4', { type: 'waste' }, { type: 'tableau', index: 0 }),
      { wasteCount: 5, tableau: tableauWith([card('spades', 5)]) },
      createLayouts(),
      METRICS
    )
    // 5 waste cards → 3 visible in the fan; the ring hugs the fan's top card.
    const fan = computeWasteFanGeometry(3, METRICS.width)
    expect(result?.source).toEqual({
      x: 240 + fan.baseXOffset + 2 * fan.overlap,
      y: 5,
      width: 50,
      height: 70,
    })
  })

  it('resolves foundation source and target slots (suit from hint fields)', () => {
    // Foundation → tableau (StackPile) hint: source suit comes from `from`.
    const down = resolveHintRects(
      moveHint('s9', { type: 'foundation', suit: 's' }, { type: 'tableau', index: 0 }),
      { wasteCount: 0, tableau: tableauWith([card('hearts', 10)]) },
      createLayouts(),
      METRICS
    )
    expect(down?.source).toEqual({ x: 70, y: 5, width: 50, height: 70 })

    // Tableau → foundation hint: target suit is implied by the hinted card.
    const up = resolveHintRects(
      moveHint('c1', { type: 'tableau', index: 0 }, { type: 'foundation' }),
      { wasteCount: 0, tableau: tableauWith([card('clubs', 1)]) },
      createLayouts(),
      METRICS
    )
    expect(up?.target).toEqual({ x: 10, y: 5, width: 50, height: 70 })
  })

  it('returns null when layouts are unmeasured or the hinted card is not face up', () => {
    const tableau = tableauWith([card('hearts', 7)])
    const hint = moveHint('h7', { type: 'tableau', index: 0 }, { type: 'foundation' })

    expect(
      resolveHintRects(
        hint,
        { wasteCount: 0, tableau },
        createEmptyAbsoluteCardLayerLayouts(),
        METRICS
      )
    ).toBeNull()

    expect(
      resolveHintRects(
        hint,
        { wasteCount: 0, tableau: tableauWith([card('hearts', 7, false)]) },
        createLayouts(),
        METRICS
      )
    ).toBeNull()
  })
})

// The draw-hint ring rect (F13: the ring moved from TopRow into the
// above-cards overlay; geometry must keep coming from the shared registry).
describe('resolveStockRect', () => {
  it('returns the card-sized stock slot rect from the layout registry', () => {
    expect(resolveStockRect(createLayouts(), METRICS)).toEqual({
      x: 300,
      y: 5,
      width: 50,
      height: 70,
    })
  })

  it('returns null while the top row or stock slot is unmeasured', () => {
    expect(resolveStockRect(createEmptyAbsoluteCardLayerLayouts(), METRICS)).toBeNull()
    const noStock = { ...createLayouts(), stock: null }
    expect(resolveStockRect(noStock, METRICS)).toBeNull()
  })
})

describe('getHintAnnouncement', () => {
  it('narrates all three hint shapes', () => {
    expect(getHintAnnouncement({ kind: 'draw' })).toBe('Hint: draw from the stock.')
    expect(
      getHintAnnouncement(
        moveHint('h7', { type: 'waste' }, { type: 'tableau', index: 2 })
      )
    ).toBe('Hint: move Seven of hearts to column 3.')
    expect(
      getHintAnnouncement(
        moveHint('s1', { type: 'tableau', index: 0 }, { type: 'foundation' })
      )
    ).toBe('Hint: move Ace of spades to the foundation.')
  })
})

// GameNoticeBubble variants are text-keyed (one shared visual); these pin the
// three copies apart and the button-fallback notice choice (F11).
describe('notice bubble texts', () => {
  it('keeps the three notice texts distinct', () => {
    expect(
      new Set([UNWINNABLE_BUBBLE_TEXT, STUCK_BUBBLE_TEXT, NO_HINT_BUBBLE_TEXT]).size
    ).toBe(3)
    // The classic warning must NOT claim unwinnability (faultiness verdict in
    // the research: heuristics never earn the strong wording).
    expect(STUCK_BUBBLE_TEXT).toContain('useful moves')
    expect(UNWINNABLE_BUBBLE_TEXT).toContain('winning moves')
  })

  // Standard wording only: the Hint button is hidden on Vegas-rules games (round
  // 2), so the fallback notice never needs the Vegas result text.
  it('picks the stuck wording only when the stock is played out', () => {
    const board = (stockLength: number) => ({
      stock: Array.from({ length: stockLength }, () => ({}) as never),
    })
    expect(getHintFallbackNoticeText(board(0))).toBe(STUCK_BUBBLE_TEXT)
    expect(getHintFallbackNoticeText(board(1))).toBe(NO_HINT_BUBBLE_TEXT)
    expect(getHintFallbackNoticeText(board(24))).toBe(NO_HINT_BUBBLE_TEXT)
  })
})
