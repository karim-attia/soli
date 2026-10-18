import type { LayoutRectangle } from 'react-native'

import {
  buildDragSourceModel,
  buildDropCandidates,
  computeLiftedRunOffsets,
  hitTestDragSource,
  intersectionArea,
  resolveDropCandidate,
} from '../../../../src/features/klondike/components/cards/dragGeometry'
import {
  areAbsoluteLayerCardPropsEqual,
  buildCardLayerItems,
} from '../../../../src/features/klondike/components/cards/cardLayerItems'
import {
  computeTableauStackOffsets,
  computeWasteFanGeometry,
  createEmptyAbsoluteCardLayerLayouts,
  type AbsoluteCardLayerLayouts,
} from '../../../../src/features/klondike/components/cards/utils'
import {
  DRAG_DROP_EXTEND_Y_RATIO,
  DRAG_DROP_ZONE_PAD_X,
} from '../../../../src/features/klondike/constants'
import { EMPTY_INVALID_WIGGLE } from '../../../../src/features/klondike/types'
import type { CardMetrics, DropHints } from '../../../../src/features/klondike/types'
import {
  getDropHints,
  TABLEAU_COLUMN_COUNT,
  type Card,
  type Foundations,
  type Suit,
  type Tableau,
} from '../../../../src/solitaire/klondike'
import { card, resetCardCounter, tableauWith } from '../../solitaire/helpers'

beforeEach(() => {
  resetCardCounter()
})

const METRICS: CardMetrics = { width: 50, height: 70, stackOffset: 20, radius: 6 }

// Same fixture style as hintOverlay.test.ts: top row at the board origin, tableau
// row below it, columns spaced 55 px apart.
const rect = (x: number, y: number, width = 120, height = 80): LayoutRectangle => ({
  x,
  y,
  width,
  height,
})

const createLayouts = (): AbsoluteCardLayerLayouts => ({
  ...createEmptyAbsoluteCardLayerLayouts(),
  topRow: rect(0, 0, 400, 80),
  stock: rect(300, 5),
  waste: rect(240, 5),
  foundations: { clubs: rect(10, 5), spades: rect(70, 5) },
  tableauRow: rect(0, 100, 400, 300),
  tableauColumns: Array.from({ length: 7 }, (_, i) => rect(i * 55, 4)),
})

const emptyFoundations = (): Foundations => ({
  hearts: [],
  diamonds: [],
  clubs: [],
  spades: [],
})

const noHints = (): DropHints => ({
  tableau: Array.from({ length: TABLEAU_COLUMN_COUNT }, () => false),
  foundations: { hearts: false, diamonds: false, clubs: false, spades: false },
})

const buildModel = (options: {
  tableau?: Tableau
  waste?: Card[]
  foundations?: Foundations
  layouts?: AbsoluteCardLayerLayouts
  enabled?: boolean
}) =>
  buildDragSourceModel({
    tableau: options.tableau ?? tableauWith(),
    waste: options.waste ?? [],
    foundations: options.foundations ?? emptyFoundations(),
    layouts: options.layouts ?? createLayouts(),
    cardMetrics: METRICS,
    enabled: options.enabled ?? true,
  })

// Column 0 origin in the fixture layouts: tableauRow (0,100) + column slot (0,4).
const COLUMN_0 = { x: 0, y: 104 }

describe('buildDragSourceModel', () => {
  it('lists only face-up tableau cards, at the shared stacking offsets', () => {
    const column = [card('clubs', 10, false), card('spades', 8), card('hearts', 7)]
    const model = buildModel({ tableau: tableauWith(column) })

    // Face-down cards stack at half spacing (FACE_DOWN_STACK_OFFSET_DIVISOR).
    const offsets = computeTableauStackOffsets(column, METRICS.stackOffset)
    expect(offsets).toEqual([0, 10, 30])

    expect(model?.columns[0]).toEqual({
      columnIndex: 0,
      x: COLUMN_0.x,
      width: METRICS.width,
      cards: [
        { cardId: column[1].id, cardIndex: 1, y: COLUMN_0.y + 10, height: METRICS.height },
        { cardId: column[2].id, cardIndex: 2, y: COLUMN_0.y + 30, height: METRICS.height },
      ],
    })
  })

  it('puts the waste entry on the fanned top card and lists foundation tops', () => {
    const wasteTop = card('diamonds', 4)
    const foundations = emptyFoundations()
    const clubsTop = card('clubs', 2)
    foundations.clubs = [card('clubs', 1), clubsTop]

    const model = buildModel({
      waste: [card('spades', 9), card('hearts', 3), wasteTop],
      foundations,
    })

    const fan = computeWasteFanGeometry(3, METRICS.width)
    expect(model?.waste).toEqual({
      cardId: wasteTop.id,
      rect: {
        x: 240 + fan.baseXOffset + 2 * fan.overlap,
        y: 5,
        width: METRICS.width,
        height: METRICS.height,
      },
    })
    expect(model?.foundations).toEqual([
      {
        suit: 'clubs',
        cardId: clubsTop.id,
        rect: { x: 10, y: 5, width: METRICS.width, height: METRICS.height },
      },
    ])
  })

  it('omits entries whose layout slot is not measured yet', () => {
    const model = buildModel({
      tableau: tableauWith([card('hearts', 5)]),
      waste: [card('hearts', 9)],
      layouts: createEmptyAbsoluteCardLayerLayouts(),
    })

    expect(model).toEqual({ columns: [], waste: null, foundations: [] })
  })

  it('returns null when dragging is disabled', () => {
    expect(buildModel({ tableau: tableauWith([card('hearts', 5)]), enabled: false })).toBeNull()
  })
})

describe('hitTestDragSource', () => {
  it('returns the visually topmost card where stacked rects overlap', () => {
    const column = [card('spades', 8), card('hearts', 7), card('clubs', 6)]
    const model = buildModel({ tableau: tableauWith(column) })

    // y = 104 + 20 + 5 is inside both the 8♠ (104..174) and the 7♥ (124..194)
    // rects; the lower (visually topmost) card must win.
    const hit = hitTestDragSource(model, 25, COLUMN_0.y + 25)
    expect(hit).toEqual({
      source: 'tableau',
      columnIndex: 0,
      cardIndex: 1,
      cardId: column[1].id,
      rect: { x: 0, y: COLUMN_0.y + 20, width: METRICS.width, height: METRICS.height },
    })

    // Just above the 7♥'s top edge still belongs to the 8♠.
    expect(hitTestDragSource(model, 25, COLUMN_0.y + 19)).toMatchObject({ cardIndex: 0 })
    // Below the last card's own height there is nothing.
    expect(hitTestDragSource(model, 25, COLUMN_0.y + 40 + METRICS.height + 1)).toBeNull()
  })

  it('never hits face-down cards, empty columns, the stock or empty felt', () => {
    const model = buildModel({
      tableau: tableauWith([card('clubs', 10, false)]),
      waste: [card('hearts', 2)],
    })

    expect(hitTestDragSource(model, 25, COLUMN_0.y + 5)).toBeNull() // face-down
    expect(hitTestDragSource(model, 3 * 55 + 25, COLUMN_0.y + 5)).toBeNull() // empty column
    expect(hitTestDragSource(model, 325, 40)).toBeNull() // stock slot
    expect(hitTestDragSource(model, 200, 300)).toBeNull() // empty felt
  })

  it('hits the waste top card and foundation tops', () => {
    const wasteTop = card('diamonds', 4)
    const foundations = emptyFoundations()
    foundations.spades = [card('spades', 1)]
    const model = buildModel({ waste: [wasteTop], foundations })

    const fan = computeWasteFanGeometry(1, METRICS.width)
    expect(hitTestDragSource(model, 240 + fan.baseXOffset + 5, 10)).toMatchObject({
      source: 'waste',
      cardId: wasteTop.id,
    })
    expect(hitTestDragSource(model, 95, 40)).toMatchObject({
      source: 'foundation',
      suit: 'spades',
    })
  })

  it('is null for a null model (drag disabled)', () => {
    expect(hitTestDragSource(null, 25, COLUMN_0.y + 5)).toBeNull()
  })
})

describe('buildDropCandidates', () => {
  it('mirrors the drop-hint mask, marks the source pile and extends columns downward', () => {
    const run = [card('spades', 8), card('hearts', 7)]
    const tableau = tableauWith(run, [card('clubs', 9)])
    const hints = noHints()
    hints.tableau[1] = true
    hints.foundations.clubs = true

    const candidates = buildDropCandidates({
      tableau,
      layouts: createLayouts(),
      cardMetrics: METRICS,
      hints,
      selection: { source: 'tableau', columnIndex: 0, cardIndex: 0 },
    })

    const column0 = candidates.find(
      (candidate) =>
        candidate.target.type === 'tableau' && candidate.target.columnIndex === 0
    )
    expect(column0).toEqual({
      target: { type: 'tableau', columnIndex: 0 },
      rect: {
        x: COLUMN_0.x - DRAG_DROP_ZONE_PAD_X,
        y: COLUMN_0.y,
        width: METRICS.width + 2 * DRAG_DROP_ZONE_PAD_X,
        // Two face-up cards: last offset 20 + card height, plus the downward extension.
        height: 20 + METRICS.height + METRICS.height * DRAG_DROP_EXTEND_Y_RATIO,
      },
      legal: false,
      isSource: true,
    })

    expect(
      candidates.find(
        (candidate) =>
          candidate.target.type === 'tableau' && candidate.target.columnIndex === 1
      )
    ).toMatchObject({ legal: true, isSource: false })

    // Empty columns get a plain card-sized slot plus the same extension.
    expect(
      candidates.find(
        (candidate) =>
          candidate.target.type === 'tableau' && candidate.target.columnIndex === 3
      )?.rect.height
    ).toBe(METRICS.height + METRICS.height * DRAG_DROP_EXTEND_Y_RATIO)

    // Only measured foundations are candidates; the mask decides legality.
    expect(
      candidates.filter((candidate) => candidate.target.type === 'foundation')
    ).toEqual([
      {
        target: { type: 'foundation', suit: 'clubs' },
        rect: {
          x: 10 - DRAG_DROP_ZONE_PAD_X,
          y: 5,
          width: METRICS.width + 2 * DRAG_DROP_ZONE_PAD_X,
          height: METRICS.height,
        },
        legal: true,
        isSource: false,
      },
      {
        target: { type: 'foundation', suit: 'spades' },
        rect: {
          x: 70 - DRAG_DROP_ZONE_PAD_X,
          y: 5,
          width: METRICS.width + 2 * DRAG_DROP_ZONE_PAD_X,
          height: METRICS.height,
        },
        legal: false,
        isSource: false,
      },
    ])
  })

  it('marks the source foundation so dropping a card back on it is silent', () => {
    const foundations = emptyFoundations()
    foundations.clubs = [card('clubs', 1)]
    const candidates = buildDropCandidates({
      tableau: tableauWith(),
      layouts: createLayouts(),
      cardMetrics: METRICS,
      hints: noHints(),
      selection: { source: 'foundation', suit: 'clubs' },
    })

    expect(
      candidates.find(
        (candidate) =>
          candidate.target.type === 'foundation' && candidate.target.suit === 'clubs'
      )
    ).toMatchObject({ isSource: true })
  })
})

describe('resolveDropCandidate', () => {
  const zone = (
    x: number,
    y: number,
    overrides: { legal?: boolean; isSource?: boolean; columnIndex?: number } = {}
  ) => ({
    target: { type: 'tableau' as const, columnIndex: overrides.columnIndex ?? 0 },
    rect: { x, y, width: METRICS.width, height: METRICS.height },
    legal: overrides.legal ?? true,
    isSource: overrides.isSource ?? false,
  })

  const cardRect = (x: number, y: number) => ({
    x,
    y,
    width: METRICS.width,
    height: METRICS.height,
  })

  it('picks the legal zone with the biggest overlap', () => {
    const resolution = resolveDropCandidate(
      [zone(0, 0, { columnIndex: 0 }), zone(40, 0, { columnIndex: 1 })],
      cardRect(35, 0)
    )
    expect(resolution).toEqual({ kind: 'legal', target: { type: 'tableau', columnIndex: 1 } })
  })

  it('ignores an illegal neighbour even when it overlaps more', () => {
    const resolution = resolveDropCandidate(
      [
        zone(0, 0, { columnIndex: 0, legal: true }),
        zone(45, 0, { columnIndex: 1, legal: false }),
      ],
      cardRect(35, 0)
    )
    expect(resolution).toEqual({ kind: 'legal', target: { type: 'tableau', columnIndex: 0 } })
  })

  it('reports an illegal drop when only illegal zones are overlapped', () => {
    expect(
      resolveDropCandidate([zone(0, 0, { legal: false })], cardRect(5, 5))
    ).toEqual({ kind: 'illegal' })
  })

  it('reports self when the card is dropped back on its own pile', () => {
    expect(
      resolveDropCandidate(
        [zone(0, 0, { legal: false, isSource: true }), zone(300, 300, { columnIndex: 1 })],
        cardRect(4, 4)
      )
    ).toEqual({ kind: 'self' })
  })

  it('reports none below the minimum overlap ratio', () => {
    // 5 px of a 50 px wide card = 10 % of the area, under the 20 % floor.
    expect(resolveDropCandidate([zone(0, 0)], cardRect(45, 0))).toEqual({ kind: 'none' })
    expect(resolveDropCandidate([], cardRect(0, 0))).toEqual({ kind: 'none' })
  })

  it('breaks ties on centre distance', () => {
    // Both zones overlap the card by exactly 25 x 70 px, but the wide one's centre
    // is far away — the nearer zone must win.
    const near = {
      target: { type: 'tableau' as const, columnIndex: 1 },
      rect: { x: 25, y: 0, width: 50, height: METRICS.height },
      legal: true,
      isSource: false,
    }
    const farWide = {
      target: { type: 'tableau' as const, columnIndex: 2 },
      rect: { x: -100, y: 0, width: 125, height: METRICS.height },
      legal: true,
      isSource: false,
    }

    expect(resolveDropCandidate([farWide, near], cardRect(0, 0))).toEqual({
      kind: 'legal',
      target: { type: 'tableau', columnIndex: 1 },
    })
    expect(resolveDropCandidate([near, farWide], cardRect(0, 0))).toEqual({
      kind: 'legal',
      target: { type: 'tableau', columnIndex: 1 },
    })
  })
})

describe('intersectionArea', () => {
  it('is zero for disjoint and touching rects', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 }
    expect(intersectionArea(a, { x: 10, y: 0, width: 10, height: 10 })).toBe(0)
    expect(intersectionArea(a, { x: 50, y: 50, width: 10, height: 10 })).toBe(0)
    expect(intersectionArea(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(25)
  })
})

describe('computeLiftedRunOffsets', () => {
  it('spaces the lifted run at the face-up offset, always', () => {
    // Everything in the drag overlay renders face up, so the half-spacing
    // face-down rule must NOT apply to a lifted run.
    expect(computeLiftedRunOffsets(3, METRICS.stackOffset)).toEqual([0, 20, 40])
    expect(computeLiftedRunOffsets(1, METRICS.stackOffset)).toEqual([0])
    expect(computeLiftedRunOffsets(0, METRICS.stackOffset)).toEqual([])
  })
})

// The highest-value test in the drag plan: buildDragSourceModel + hitTestDragSource
// must be the exact inverse of buildCardLayerItems, which is what actually renders
// the cards. If the two ever drift, a drag would grab a different card than the one
// under the finger.
describe('hitTestDragSource is the inverse of buildCardLayerItems', () => {
  it('recovers every grabbable rendered card at its own rect centre', () => {
    const tableau: Tableau = tableauWith(
      [card('clubs', 10, false), card('spades', 8), card('hearts', 7), card('clubs', 6)],
      [card('diamonds', 13)],
      [card('hearts', 4, false), card('spades', 3)],
      [],
      [card('clubs', 12, false), card('hearts', 11, false), card('spades', 5)],
      [card('diamonds', 9)],
      [card('clubs', 7)]
    )
    const waste = [card('hearts', 10), card('spades', 2), card('diamonds', 6)]
    const foundations = emptyFoundations()
    foundations.clubs = [card('clubs', 1), card('clubs', 2)]
    foundations.spades = [card('spades', 1)]
    const layouts = createLayouts()

    const items = buildCardLayerItems({
      stock: [card('hearts', 12)],
      waste,
      foundations,
      tableau,
      cardMetrics: METRICS,
      layouts,
      drawLabel: 'Draw',
      interactionsLocked: false,
      celebrationActive: false,
      hiddenCardIds: null,
    })
    const model = buildDragSourceModel({
      tableau,
      waste,
      foundations,
      layouts,
      cardMetrics: METRICS,
      enabled: true,
    })

    const grabbableIds = new Set<string>()
    tableau.forEach((column) => {
      column.forEach((columnCard) => {
        if (columnCard.faceUp) {
          grabbableIds.add(columnCard.id)
        }
      })
    })
    grabbableIds.add(waste[waste.length - 1].id)
    grabbableIds.add(foundations.clubs[foundations.clubs.length - 1].id)
    grabbableIds.add(foundations.spades[foundations.spades.length - 1].id)

    // Sanity: the fixture really does exercise all three sources
    // (8 face-up tableau cards + the waste top + two foundation tops).
    expect(grabbableIds.size).toBe(11)

    let checked = 0
    items.forEach((item) => {
      if (!grabbableIds.has(item.card.id)) {
        return
      }
      // A card's exclusive band is from its own y to the next card's y, so probe
      // just below the top-left corner rather than the geometric centre (which for
      // a covered card belongs to the card stacked on top of it).
      const hit = hitTestDragSource(model, item.x + METRICS.width / 2, item.y + 2)
      expect({ id: item.card.id, hit: hit?.cardId }).toEqual({
        id: item.card.id,
        hit: item.card.id,
      })
      checked += 1
    })
    expect(checked).toBe(grabbableIds.size)
  })

  it('produces drop candidates that agree with the reducer about legality', () => {
    // 7♥ in column 0 can go onto the 8♠ in column 1 and nowhere else.
    const tableau = tableauWith([card('hearts', 7)], [card('spades', 8)])
    const selection = { source: 'tableau' as const, columnIndex: 0, cardIndex: 0 }
    const hints = getDropHints({
      selected: selection,
      tableau,
      foundations: emptyFoundations(),
      waste: [],
    })

    const candidates = buildDropCandidates({
      tableau,
      layouts: createLayouts(),
      cardMetrics: METRICS,
      hints,
      selection,
    })

    expect(
      candidates.filter((candidate) => candidate.legal).map((candidate) => candidate.target)
    ).toEqual([{ type: 'tableau', columnIndex: 1 }])

    // Dropping the 7♥ over column 1 resolves to exactly that move.
    expect(
      resolveDropCandidate(candidates, {
        x: 55,
        y: COLUMN_0.y,
        width: METRICS.width,
        height: METRICS.height,
      })
    ).toEqual({ kind: 'legal', target: { type: 'tableau', columnIndex: 1 } })
  })
})

// The card memo comparator became unit-testable when it moved into cardLayerItems.
// Its own WARNING comment says any new item field that affects rendering must be
// compared here or updates to it are silently swallowed — `hidden` is exactly such
// a field, and it regressed once during this feature.
describe('areAbsoluteLayerCardPropsEqual', () => {
  const baseProps = (overrides: { hidden?: boolean; x?: number } = {}) => ({
    item: {
      card: card('hearts', 7),
      x: overrides.x ?? 10,
      y: 20,
      zIndex: 1000,
      hidden: overrides.hidden ?? false,
    },
    metrics: METRICS,
    invalidWiggle: EMPTY_INVALID_WIGGLE,
    animationResetKey: 0,
    movementEnabled: true,
    flipEnabled: true,
    onDraw: () => {},
    onFoundationPress: (_suit: Suit) => {},
    onTableauCardPress: (_columnIndex: number, _cardIndex: number) => {},
  })

  it('re-renders when the hidden flag flips', () => {
    const previous = baseProps({ hidden: false })
    const next = { ...previous, item: { ...previous.item, hidden: true } }

    expect(areAbsoluteLayerCardPropsEqual(previous, next)).toBe(false)
  })

  it('still ignores function props (handlers read live state through refs)', () => {
    const previous = baseProps()
    const next = { ...previous, onDraw: () => {}, onCardSettled: () => {} }

    expect(areAbsoluteLayerCardPropsEqual(previous, next)).toBe(true)
  })

  it('re-renders when a position target changes', () => {
    const previous = baseProps({ x: 10 })
    const next = { ...previous, item: { ...previous.item, x: 60 } }

    expect(areAbsoluteLayerCardPropsEqual(previous, next)).toBe(false)
  })
})
