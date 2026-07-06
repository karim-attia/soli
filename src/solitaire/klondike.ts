import type { SolvableDealV2 } from '../data/solvableDealsV2'
import {
  computeDeckChecksum,
  createCanonicalDealCards,
  createRandomExactDealId,
  decodeExactDealId,
  hasDrawCountInMask,
  type DealCard,
} from './dealIdentity'
import { DEFAULT_DRAW_COUNT, normalizeDrawCount, type DrawCount } from './drawCount'
import {
  DEMO_DEAL_CONFIG,
  DEMO_DECK_CHECKSUM,
  DEMO_EXACT_DEAL_ID,
  DEMO_STOCK_ORDER,
} from './demoDeal'

const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const

export const FOUNDATION_SUIT_ORDER = ['hearts', 'diamonds', 'clubs', 'spades'] as const
export const TABLEAU_COLUMN_COUNT = 7
const MAX_AUTO_COMPLETE_ITERATIONS = 500

const ACE_RANK = 1
const KING_RANK = 13
const TOTAL_CARDS_PER_SUIT = 13
const RED_SUITS = new Set(['hearts', 'diamonds'])
let deckInstanceCounter = 0

export type Suit = (typeof SUITS)[number]
export type Rank = (typeof RANKS)[number]

export const getCardStableId = (card: { suit: Suit; rank: Rank }): string =>
  `${card.suit}-${card.rank}`

export interface Card {
  id: string
  suit: Suit
  rank: Rank
  faceUp: boolean
}

export type TableauColumn = Card[]
export type Tableau = TableauColumn[]
export type Foundations = Record<Suit, Card[]>

export type Selection =
  | { source: 'tableau'; columnIndex: number; cardIndex: number }
  | { source: 'waste' }
  | { source: 'foundation'; suit: Suit }

export type TimerState = 'idle' | 'running' | 'paused'

export type MoveTarget =
  | { type: 'tableau'; columnIndex: number }
  | { type: 'foundation'; suit: Suit }

export interface GameSnapshot {
  stock: Card[]
  waste: Card[]
  foundations: Foundations
  tableau: Tableau
  moveCount: number
  autoCompleteRuns: number
  autoQueue: AutoAction[]
  isAutoCompleting: boolean
  hasWon: boolean
  winCelebrations: number
  // Canonical 52-card permutation ID for normal deals. The hidden developer demo
  // also carries an exact-format ID so the live model never needs nullable identity.
  exactId: string
  deckChecksum: string
  drawCount: DrawCount
  elapsedMs: number
  timerState: TimerState
  timerStartedAt: number | null
}

export interface GameState extends GameSnapshot {
  history: GameSnapshot[]
  future: GameSnapshot[]
  selected: Selection | null
  autoUpEnabled: boolean
}

export type GameAction =
  | { type: 'DRAW_OR_RECYCLE'; recordHistory?: boolean }
  | { type: 'UNDO' }
  | { type: 'SCRUB_TO_INDEX'; index: number }
  | { type: 'HYDRATE_STATE'; state: GameState; autoUpEnabled?: boolean }
  | { type: 'SELECT_TABLEAU'; columnIndex: number; cardIndex: number }
  | { type: 'SELECT_WASTE' }
  | { type: 'SELECT_FOUNDATION_TOP'; suit: Suit }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'PLACE_ON_TABLEAU'; columnIndex: number }
  | { type: 'PLACE_ON_FOUNDATION'; suit: Suit }
  | { type: 'ADVANCE_AUTO_QUEUE' }
  | { type: 'SET_AUTO_UP_ENABLED'; enabled: boolean }
  | {
      type: 'APPLY_MOVE'
      selection: Selection
      target: MoveTarget
      recordHistory?: boolean
    }
  | { type: 'TIMER_START'; startedAt: number }
  | { type: 'TIMER_TICK'; timestamp: number }
  | { type: 'TIMER_STOP'; timestamp: number }
  | { type: 'TIMER_RESET' }

export interface DropHints {
  tableau: boolean[]
  foundations: Record<Suit, boolean>
}

export type AutoAction =
  | { type: 'move'; selection: Selection; target: MoveTarget }
  | { type: 'draw' }
  | { type: 'recycle' }

export const getNextStockDrawCards = ({
  stock,
  drawCount,
}: Pick<GameSnapshot, 'stock' | 'drawCount'>): Card[] => {
  const count = Math.min(stock.length, normalizeDrawCount(drawCount))
  return stock.slice(stock.length - count).reverse()
}

// Product decision: every new deal reveals the first stock draw into the waste as part
// of the deal itself — moveCount stays 0 and no history entry is recorded (it is not a
// player move, so it must not be undoable). Device testers: "Waste, <card>" at moves 0
// on a fresh game is therefore expected, not a bug (flagged as an anomaly once, 2026-07-06).
const revealInitialWaste = (
  stock: Card[],
  drawCount: DrawCount
): { stock: Card[]; waste: Card[] } => {
  if (!stock.length) {
    return { stock, waste: [] }
  }

  const drawn = getNextStockDrawCards({ stock, drawCount })
  const nextStock = stock.slice(0, stock.length - drawn.length)
  return {
    stock: nextStock,
    waste: drawn.map((card) => ({ ...card, faceUp: true })),
  }
}

const createExactDealIdentity = (
  exactId: string,
  deck: readonly DealCard[]
): Pick<GameSnapshot, 'exactId' | 'deckChecksum'> => ({
  // Exact ID is both the history key and the replay recipe; no separate local
  // deal identifier is kept in phase 1.
  exactId,
  deckChecksum: computeDeckChecksum(deck),
})

type CreateGameStateFromExactIdOptions = {
  revealInitialWaste?: boolean
  autoUpEnabled?: boolean
}

export const createGameStateFromExactId = (
  exactId: string,
  drawCount: DrawCount = DEFAULT_DRAW_COUNT,
  options: CreateGameStateFromExactIdOptions = {}
): GameState => {
  const normalizedDrawCount = normalizeDrawCount(drawCount)
  const deck = createDeckFromExactId(exactId)
  const dealIdentity = createExactDealIdentity(exactId, deck)
  const { tableau, stock: dealtStock } = dealTableau(deck)
  const { stock, waste } =
    options.revealInitialWaste === false
      ? { stock: dealtStock, waste: [] }
      : revealInitialWaste(dealtStock, normalizedDrawCount)

  const snapshot: GameSnapshot = {
    stock,
    waste,
    foundations: createEmptyFoundations(),
    tableau,
    moveCount: 0,
    autoCompleteRuns: 0,
    autoQueue: [],
    isAutoCompleting: false,
    hasWon: false,
    winCelebrations: 0,
    ...dealIdentity,
    drawCount: normalizedDrawCount,
    elapsedMs: 0,
    timerState: 'idle',
    timerStartedAt: null,
  }

  return {
    ...snapshot,
    history: [],
    future: [],
    selected: null,
    autoUpEnabled: options.autoUpEnabled ?? true,
  }
}

export const createInitialState = (
  drawCount: DrawCount = DEFAULT_DRAW_COUNT
): GameState => {
  const exactId = createRandomExactDealId()
  return createGameStateFromExactId(exactId, drawCount)
}

export const createSolvableGameState = (
  deal: SolvableDealV2,
  drawCount: DrawCount = DEFAULT_DRAW_COUNT
): GameState => {
  if (!hasDrawCountInMask(deal.drawMask, drawCount)) {
    throw new Error(
      `Solvable deal ${deal.exactId} is not cataloged for Draw ${drawCount}.`
    )
  }

  return createGameStateFromExactId(deal.exactId, drawCount)
}

export const createDemoGameState = (
  drawCount: DrawCount = DEFAULT_DRAW_COUNT
): GameState => {
  const deck = createDeck()
  const lookup = new Map<string, Card>()
  deck.forEach((card) => {
    lookup.set(`${card.suit}-${card.rank}`, card)
  })

  const takeDemoCard = (suit: Suit, rank: Rank, faceUp: boolean): Card => {
    const key = `${suit}-${rank}`
    const card = lookup.get(key)
    if (!card) {
      throw new Error(`Demo game is missing card ${key}.`)
    }
    lookup.delete(key)
    return {
      ...card,
      faceUp,
    }
  }

  // The developer demo is a custom internal board, not a standard Klondike deal:
  // it uses 42 tableau cards so the hidden auto-solve path is short and readable.
  // Its exact-format ID is for non-null identity/logging, not public catalog replay.
  const tableau: Tableau = DEMO_DEAL_CONFIG.tableau.map((columnConfig) => {
    const column: Card[] = []

    columnConfig.down.forEach((cardConfig) => {
      column.push(takeDemoCard(cardConfig.suit, cardConfig.rank, false))
    })

    columnConfig.up.forEach((cardConfig) => {
      column.push(takeDemoCard(cardConfig.suit, cardConfig.rank, true))
    })

    return column
  })

  const demoStock = DEMO_STOCK_ORDER.map(({ suit, rank }) =>
    takeDemoCard(suit, rank, false)
  )
  const { stock, waste } = revealInitialWaste(demoStock, drawCount)

  const snapshot: GameSnapshot = {
    stock,
    waste,
    foundations: createEmptyFoundations(),
    tableau,
    moveCount: 0,
    autoCompleteRuns: 0,
    autoQueue: [],
    isAutoCompleting: false,
    hasWon: false,
    winCelebrations: 0,
    exactId: DEMO_EXACT_DEAL_ID,
    deckChecksum: DEMO_DECK_CHECKSUM,
    drawCount,
    elapsedMs: 0,
    timerState: 'idle',
    timerStartedAt: null,
  }

  return {
    ...snapshot,
    history: [],
    future: [],
    selected: null,
    autoUpEnabled: true,
  }
}

// A4: the reducer must stay pure — no NEW_GAME action here. Fresh deals use
// expo-crypto randomness (createRandomExactDealId), and React may invoke reducers
// twice in dev (StrictMode), which would deal two different decks with only one
// committed. Always build fresh games outside the reducer (createInitialState)
// and dispatch HYDRATE_STATE instead.
export const klondikeReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'DRAW_OR_RECYCLE':
      return finalizeState(
        drawFromStock(haltAutoQueue(state), { recordHistory: action.recordHistory })
      )
    case 'UNDO':
      return finalizeState(handleUndo(haltAutoQueue(state)))
    case 'SCRUB_TO_INDEX': {
      const workingState = haltAutoQueue(state)
      const nextState = scrubToIndex(workingState, action.index)
      return nextState === workingState ? workingState : finalizeState(nextState)
    }
    case 'HYDRATE_STATE': {
      const hydratedState = {
        ...action.state,
        selected: null,
        autoUpEnabled: action.autoUpEnabled ?? state.autoUpEnabled,
      }
      return finalizeState(
        hydratedState.autoUpEnabled ? hydratedState : haltAutoQueue(hydratedState)
      )
    }
    case 'SELECT_TABLEAU':
      return handleSelectTableau(
        haltAutoQueue(state),
        action.columnIndex,
        action.cardIndex
      )
    case 'SELECT_WASTE':
      return handleSelectWaste(haltAutoQueue(state))
    case 'SELECT_FOUNDATION_TOP':
      return handleSelectFoundation(haltAutoQueue(state), action.suit)
    case 'CLEAR_SELECTION': {
      const workingState = haltAutoQueue(state)
      return workingState.selected ? { ...workingState, selected: null } : workingState
    }
    case 'PLACE_ON_TABLEAU':
      if (!state.selected) {
        return state
      }
      {
        const workingState = haltAutoQueue(state)
        const nextState = applyMove(workingState, workingState.selected!, {
          type: 'tableau',
          columnIndex: action.columnIndex,
        })
        return nextState ? finalizeState(nextState) : workingState
      }
    case 'PLACE_ON_FOUNDATION':
      if (!state.selected) {
        return state
      }
      {
        const workingState = haltAutoQueue(state)
        const nextState = applyMove(workingState, workingState.selected!, {
          type: 'foundation',
          suit: action.suit,
        })
        return nextState ? finalizeState(nextState) : workingState
      }
    case 'ADVANCE_AUTO_QUEUE':
      return finalizeState(advanceAutoQueue(state))
    case 'SET_AUTO_UP_ENABLED': {
      const nextState =
        state.autoUpEnabled === action.enabled
          ? state
          : { ...state, autoUpEnabled: action.enabled }

      return action.enabled ? finalizeState(nextState) : haltAutoQueue(nextState)
    }
    case 'APPLY_MOVE': {
      const workingState = haltAutoQueue(state)
      const nextState = applyMove(workingState, action.selection, action.target, {
        recordHistory: action.recordHistory,
      })
      return nextState ? finalizeState(nextState) : workingState
    }
    case 'TIMER_START':
      return startTimer(state, action.startedAt)
    case 'TIMER_TICK':
      return tickTimer(state, action.timestamp)
    case 'TIMER_STOP':
      return stopTimer(state, action.timestamp)
    case 'TIMER_RESET':
      return resetTimer(state)
    default:
      return state
  }
}

const haltAutoQueue = (state: GameState): GameState =>
  state.autoQueue.length || state.isAutoCompleting
    ? { ...state, autoQueue: [], isAutoCompleting: false }
    : state

// Narrow input so callers (useKlondikeGame) can memoize drop hints on just the state
// slices that affect them instead of the whole GameState (render memoization).
export type DropHintsInput = Pick<
  GameState,
  'selected' | 'tableau' | 'foundations' | 'waste'
>

export const getDropHints = (state: DropHintsInput): DropHints => {
  const tableauHints = Array.from({ length: TABLEAU_COLUMN_COUNT }, () => false)
  const foundationHints: Record<Suit, boolean> = createSuitRecord(false)

  if (!state.selected) {
    return { tableau: tableauHints, foundations: foundationHints }
  }
  const targets = listDropTargets(state, state.selected)
  targets.tableau.forEach((columnIndex) => {
    tableauHints[columnIndex] = true
  })
  targets.foundations.forEach((suit) => {
    foundationHints[suit] = true
  })

  return { tableau: tableauHints, foundations: foundationHints }
}

const findAutoMoveTarget = (
  state: GameState,
  selection: Selection
): MoveTarget | null => {
  const targets = listDropTargets(state, selection)
  if (targets.foundations.length) {
    return { type: 'foundation', suit: targets.foundations[0] }
  }
  if (targets.tableau.length) {
    return { type: 'tableau', columnIndex: targets.tableau[0] }
  }
  return null
}

// PBI-29: Tableau tap-to-auto-move fallback retries the adjacent card.
const TABLEAU_TAP_ADJACENT_CARD_OFFSET = 1

export const findAutoMoveTargetWithTableauAdjacentFallback = (
  state: GameState,
  selection: Selection
): { selection: Selection; target: MoveTarget } | null => {
  const target = findAutoMoveTarget(state, selection)
  if (target) {
    return { selection, target }
  }

  if (selection.source !== 'tableau') {
    return null
  }

  // Task 29-1: If a tableau tap misses, try adjacent face-up card before invalid feedback.
  const column = state.tableau[selection.columnIndex]
  if (!column) {
    return null
  }

  const adjacentCandidateIndices = [
    selection.cardIndex - TABLEAU_TAP_ADJACENT_CARD_OFFSET,
    selection.cardIndex + TABLEAU_TAP_ADJACENT_CARD_OFFSET,
  ]

  for (const candidateCardIndex of adjacentCandidateIndices) {
    const candidateCard = column[candidateCardIndex]
    if (!candidateCard?.faceUp) {
      continue
    }

    const candidateSelection: Selection = {
      source: 'tableau',
      columnIndex: selection.columnIndex,
      cardIndex: candidateCardIndex,
    }
    const candidateTarget = findAutoMoveTarget(state, candidateSelection)
    if (candidateTarget) {
      return { selection: candidateSelection, target: candidateTarget }
    }
  }

  return null
}

export const hasUndoHistory = (state: GameState): boolean => state.history.length > 0

const listDropTargets = (
  state: DropHintsInput,
  selection: Selection
): { tableau: number[]; foundations: Suit[] } => {
  const stack = previewSelectionStack(state, selection)
  if (!stack.length) {
    return { tableau: [], foundations: [] }
  }

  const tableauTargets: number[] = []
  state.tableau.forEach((column, columnIndex) => {
    if (selection.source === 'tableau' && selection.columnIndex === columnIndex) {
      return
    }
    if (canDropOnTableau(column, stack)) {
      tableauTargets.push(columnIndex)
    }
  })

  const foundationTargets: Suit[] = []
  if (stack.length === 1) {
    FOUNDATION_SUIT_ORDER.forEach((suit) => {
      if (selection.source === 'foundation' && selection.suit === suit) {
        return
      }
      if (canDropOnFoundation(stack[0], state.foundations[suit], suit)) {
        foundationTargets.push(suit)
      }
    })
  }

  return { tableau: tableauTargets, foundations: foundationTargets }
}

const drawFromStock = (
  state: GameState,
  options: { recordHistory?: boolean; allowRecycle?: boolean } = {}
): GameState => {
  const recordHistory = options.recordHistory !== false
  const allowRecycle = options.allowRecycle !== false

  if (!state.stock.length) {
    if (allowRecycle && state.waste.length) {
      return recycleWasteToStock(state, { recordHistory })
    }
    return state
  }

  const history = recordHistory ? pushHistory(state) : state.history
  const drawn = getNextStockDrawCards(state)
  const nextStock = state.stock.slice(0, state.stock.length - drawn.length)
  const nextWaste = [...state.waste, ...drawn.map((card) => ({ ...card, faceUp: true }))]

  return {
    ...state,
    stock: nextStock,
    waste: nextWaste,
    history,
    future: history === state.history ? state.future : [],
    selected: null,
    moveCount: state.moveCount + 1,
  }
}

const recycleWasteToStock = (
  state: GameState,
  options: { recordHistory?: boolean } = {}
): GameState => {
  if (!state.waste.length) {
    return state
  }

  const recycled = state.waste
    .slice()
    .reverse()
    .map((card) => ({ ...card, faceUp: false }))

  const history = options.recordHistory !== false ? pushHistory(state) : state.history

  return {
    ...state,
    stock: recycled,
    waste: [],
    history,
    future: history === state.history ? state.future : [],
    selected: null,
    moveCount: state.moveCount + 1,
  }
}

const handleUndo = (state: GameState): GameState => {
  if (!state.history.length) {
    return state
  }

  const previousSnapshot = state.history[state.history.length - 1]
  const nextHistory = state.history.slice(0, -1)
  const nextFuture = [snapshotFromState(state), ...state.future]

  const restoredState = cloneSnapshot(previousSnapshot, state.autoUpEnabled)
  return {
    ...restoredState,
    history: nextHistory,
    future: nextFuture,
    selected: null,
    // Undo rewinds board state, but not the move counter: taking the undo is still
    // player activity and should remain visible in game stats/history.
    moveCount: state.moveCount,
  }
}

const scrubToIndex = (state: GameState, targetIndex: number): GameState => {
  const totalHistory = state.history.length
  const totalFuture = state.future.length
  const maxIndex = totalHistory + totalFuture
  const clampedIndex = Math.max(0, Math.min(targetIndex, maxIndex))

  if (clampedIndex === totalHistory) {
    return state
  }

  const timeline: GameSnapshot[] = [
    ...state.history,
    snapshotFromState(state),
    ...state.future,
  ]

  const nextSnapshot = timeline[clampedIndex]
  if (!nextSnapshot) {
    return state
  }

  const nextHistory = timeline.slice(0, clampedIndex)
  const nextFuture = timeline.slice(clampedIndex + 1)

  const baseState = cloneSnapshot(nextSnapshot, state.autoUpEnabled)
  return {
    ...baseState,
    history: nextHistory,
    future: nextFuture,
    moveCount: state.moveCount,
    timerState: state.timerState,
    timerStartedAt: state.timerStartedAt,
    elapsedMs: state.elapsedMs,
  }
}

const handleSelectTableau = (
  state: GameState,
  columnIndex: number,
  cardIndex: number
): GameState => {
  const column = state.tableau[columnIndex]
  const selectedCard = column?.[cardIndex]

  if (!selectedCard || !selectedCard.faceUp) {
    return state
  }

  if (
    state.selected?.source === 'tableau' &&
    state.selected.columnIndex === columnIndex &&
    state.selected.cardIndex === cardIndex
  ) {
    return { ...state, selected: null }
  }

  return {
    ...state,
    selected: { source: 'tableau', columnIndex, cardIndex },
  }
}

const handleSelectWaste = (state: GameState): GameState => {
  if (!state.waste.length) {
    return state
  }

  if (state.selected?.source === 'waste') {
    return { ...state, selected: null }
  }

  return {
    ...state,
    selected: { source: 'waste' },
  }
}

const handleSelectFoundation = (state: GameState, suit: Suit): GameState => {
  const pile = state.foundations[suit]
  if (!pile.length) {
    return state
  }

  if (state.selected?.source === 'foundation' && state.selected.suit === suit) {
    return { ...state, selected: null }
  }

  return {
    ...state,
    selected: { source: 'foundation', suit },
  }
}

const applyMove = (
  state: GameState,
  selection: Selection,
  target: MoveTarget,
  options: { recordHistory?: boolean } = {}
): GameState | null => {
  const stack = previewSelectionStack(state, selection)
  if (!stack.length) {
    return null
  }

  if (target.type === 'tableau') {
    if (selection.source === 'tableau' && selection.columnIndex === target.columnIndex) {
      return null
    }
    const destinationColumn = state.tableau[target.columnIndex]
    if (!destinationColumn || !canDropOnTableau(destinationColumn, stack)) {
      return null
    }
  } else {
    if (stack.length !== 1) {
      return null
    }
    if (!canDropOnFoundation(stack[0], state.foundations[target.suit], target.suit)) {
      return null
    }
  }

  const recordHistory = options.recordHistory ?? true
  const history = recordHistory ? pushHistory(state) : state.history

  // Perf (render memoization): clone only the piles this move touches so unchanged
  // piles keep referential identity across moves and memoized board components can
  // skip re-renders. Previously all piles were deep-cloned per move, which defeated
  // React.memo everywhere. extractMovingCards mutates (splice/pop) the piles it is
  // given, so every pile the selection can touch must be cloned before the call.
  let nextTableau = state.tableau
  let nextFoundations = state.foundations
  let nextWaste = state.waste

  const cloneTableauColumnAt = (columnIndex: number) => {
    if (nextTableau === state.tableau) {
      nextTableau = state.tableau.slice()
    }
    nextTableau[columnIndex] = cloneCards(state.tableau[columnIndex])
  }

  if (selection.source === 'tableau') {
    cloneTableauColumnAt(selection.columnIndex)
  } else if (selection.source === 'waste') {
    nextWaste = cloneCards(state.waste)
  } else {
    nextFoundations = {
      ...state.foundations,
      [selection.suit]: cloneCards(state.foundations[selection.suit]),
    }
  }
  if (target.type === 'tableau') {
    cloneTableauColumnAt(target.columnIndex)
  }

  const movingCards = extractMovingCards({
    selection,
    tableau: nextTableau,
    foundations: nextFoundations,
    waste: nextWaste,
  })

  if (!movingCards.length) {
    return null
  }

  if (target.type === 'tableau') {
    const destination = nextTableau[target.columnIndex]
    movingCards.forEach((card) => destination.push(card))
  } else {
    nextFoundations = {
      ...nextFoundations,
      [target.suit]: [...nextFoundations[target.suit], movingCards[0]],
    }
  }

  return {
    ...state,
    tableau: nextTableau,
    foundations: nextFoundations,
    waste: nextWaste,
    history,
    future: history === state.history ? state.future : [],
    selected: null,
    moveCount: state.moveCount + 1,
  }
}

const extractMovingCards = ({
  selection,
  tableau,
  foundations,
  waste,
}: {
  selection: Selection
  tableau: Tableau
  foundations: Foundations
  waste: Card[]
}): Card[] => {
  if (selection.source === 'tableau') {
    const column = tableau[selection.columnIndex]
    if (!column) {
      return []
    }

    const moving = column.splice(selection.cardIndex)
    flipNewTopCard(column)
    return moving
  }

  if (selection.source === 'waste') {
    const card = waste.pop()
    return card ? [{ ...card }] : []
  }

  const pile = foundations[selection.suit]
  const card = pile.pop()
  return card ? [{ ...card }] : []
}

const flipNewTopCard = (column: TableauColumn) => {
  if (column.length === 0) {
    return
  }
  const newTop = column[column.length - 1]
  if (!newTop.faceUp) {
    newTop.faceUp = true
  }
}

const canDropOnTableau = (column: TableauColumn, stack: Card[]): boolean => {
  if (!stack.length || !isDescendingAlternating(stack)) {
    return false
  }

  if (!column.length) {
    return stack[0].rank === KING_RANK
  }

  const targetTop = column[column.length - 1]
  return (
    targetTop.faceUp &&
    targetTop.rank === stack[0].rank + 1 &&
    getCardColor(targetTop.suit) !== getCardColor(stack[0].suit)
  )
}

const canDropOnFoundation = (card: Card, pile: Card[], suit: Suit): boolean => {
  if (card.suit !== suit) {
    return false
  }

  if (!pile.length) {
    return card.rank === ACE_RANK
  }

  const topCard = pile[pile.length - 1]
  return topCard.rank + 1 === card.rank
}

const previewSelectionStack = (
  state: DropHintsInput,
  selection: Selection | null
): Card[] => {
  if (!selection) {
    return []
  }

  if (selection.source === 'tableau') {
    const column = state.tableau[selection.columnIndex]
    if (!column) {
      return []
    }
    return column.slice(selection.cardIndex)
  }

  if (selection.source === 'waste') {
    const card = state.waste[state.waste.length - 1]
    return card ? [card] : []
  }

  const pile = state.foundations[selection.suit]
  const card = pile[pile.length - 1]
  return card ? [card] : []
}

const finalizeState = (state: GameState): GameState => {
  const withWinFlag = maybeSetWinFlag(state)
  return scheduleAutoQueue(withWinFlag)
}

const maybeSetWinFlag = (state: GameState): GameState => {
  const allFoundationsComplete = FOUNDATION_SUIT_ORDER.every(
    (suit) => state.foundations[suit].length === TOTAL_CARDS_PER_SUIT
  )

  if (allFoundationsComplete && !state.hasWon) {
    return { ...state, hasWon: true, winCelebrations: state.winCelebrations + 1 }
  }

  if (!allFoundationsComplete && state.hasWon) {
    return { ...state, hasWon: false }
  }

  return state
}

const scheduleAutoQueue = (state: GameState): GameState => {
  if (
    !state.autoUpEnabled ||
    !isAutoCompleteReady(state) ||
    state.isAutoCompleting ||
    state.autoQueue.length
  ) {
    return state
  }

  const planned = planAutoActions(state)
  if (!planned.length) {
    return state
  }

  return {
    ...state,
    autoQueue: planned,
    isAutoCompleting: true,
    history: pushHistory(state),
    future: [],
  }
}

const planAutoActions = (state: GameState): AutoAction[] => {
  let workingState: GameState = state
  const planned: AutoAction[] = []
  let steps = 0

  while (steps < MAX_AUTO_COMPLETE_ITERATIONS) {
    const selection = findAutoCompleteSource(workingState)
    if (selection) {
      const preview = previewSelectionStack(workingState, selection)
      const topCard = preview[0]
      if (!topCard) break
      const target: MoveTarget = { type: 'foundation', suit: topCard.suit }
      const nextState = applyMove(workingState, selection, target, {
        recordHistory: false,
      })

      if (!nextState || nextState === workingState) {
        break
      }

      planned.push({ type: 'move', selection, target })
      workingState = nextState
      steps += 1
      continue
    }

    const supportMove = findTableauSupportMove(workingState)
    if (supportMove) {
      const nextState = applyMove(
        workingState,
        supportMove.selection,
        supportMove.target,
        {
          recordHistory: false,
        }
      )

      if (nextState && nextState !== workingState) {
        planned.push({
          type: 'move',
          selection: supportMove.selection,
          target: supportMove.target,
        })
        workingState = nextState
        steps += 1
        continue
      }
    }

    if (!workingState.stock.length) {
      if (workingState.waste.length) {
        workingState = recycleWasteToStock(workingState, { recordHistory: false })
        planned.push({ type: 'recycle' })
        steps += 1
        continue
      }
      break
    }

    workingState = drawFromStock(workingState, {
      recordHistory: false,
      allowRecycle: false,
    })
    planned.push({ type: 'draw' })
    steps += 1
  }

  return planned
}

const findTableauSupportMove = (
  state: GameState
): { selection: Selection; target: MoveTarget } | null => {
  if (state.waste.length) {
    const wasteSelection: Selection = { source: 'waste' }
    const wasteTarget = findAutoMoveTarget(state, wasteSelection)
    if (wasteTarget && wasteTarget.type === 'tableau') {
      return { selection: wasteSelection, target: wasteTarget }
    }
  }

  return null
}

const advanceAutoQueue = (state: GameState): GameState => {
  if (!state.autoQueue.length) {
    return state.isAutoCompleting ? { ...state, isAutoCompleting: false } : state
  }

  const [current, ...rest] = state.autoQueue
  let nextState: GameState = state

  if (current.type === 'move') {
    nextState =
      applyMove(state, current.selection, current.target, { recordHistory: false }) ??
      state
  } else if (current.type === 'draw') {
    nextState = drawFromStock(state, { recordHistory: false, allowRecycle: false })
  } else if (current.type === 'recycle') {
    nextState = recycleWasteToStock(state, { recordHistory: false })
  }

  return {
    ...nextState,
    autoQueue: rest,
    isAutoCompleting: rest.length > 0,
    autoCompleteRuns: rest.length
      ? nextState.autoCompleteRuns
      : nextState.autoCompleteRuns + 1,
  }
}

const isAutoCompleteReady = (state: GameState): boolean => {
  const tableauIsFaceUp = state.tableau.every((column) =>
    column.every((card) => card.faceUp)
  )

  // Draw 1 keeps its established early trigger. Higher draw rules wait until the
  // whole top-right draw area is empty: no face-down stock and no face-up waste.
  return (
    tableauIsFaceUp &&
    (state.drawCount === 1 || (!state.stock.length && !state.waste.length))
  )
}

const findAutoCompleteSource = (state: GameState): Selection | null => {
  for (let columnIndex = 0; columnIndex < state.tableau.length; columnIndex += 1) {
    const column = state.tableau[columnIndex]
    if (!column.length) {
      continue
    }
    const cardIndex = column.length - 1
    const candidate = column[cardIndex]
    if (
      candidate.faceUp &&
      canDropOnFoundation(candidate, state.foundations[candidate.suit], candidate.suit)
    ) {
      return { source: 'tableau', columnIndex, cardIndex }
    }
  }

  const wasteCard = state.waste[state.waste.length - 1]
  if (
    wasteCard &&
    canDropOnFoundation(wasteCard, state.foundations[wasteCard.suit], wasteCard.suit)
  ) {
    return { source: 'waste' }
  }

  return null
}

const isDescendingAlternating = (stack: Card[]): boolean => {
  for (let index = 0; index < stack.length - 1; index += 1) {
    const current = stack[index]
    const next = stack[index + 1]
    const isRankDescending = current.rank === next.rank + 1
    const hasAlternatingColor = getCardColor(current.suit) !== getCardColor(next.suit)

    if (!isRankDescending || !hasAlternatingColor) {
      return false
    }
  }

  return true
}

const getCardColor = (suit: Suit): 'red' | 'black' =>
  RED_SUITS.has(suit) ? 'red' : 'black'

const pushHistory = (state: GameState): GameSnapshot[] => {
  const snapshot = snapshotFromState(state)
  return [...state.history, snapshot]
}

const startTimer = (state: GameState, startedAt: number): GameState => {
  if (!Number.isFinite(startedAt)) {
    return state
  }
  if (state.timerState === 'running' && state.timerStartedAt !== null) {
    return state
  }

  return {
    ...state,
    timerState: 'running',
    timerStartedAt: Number.isFinite(state.timerStartedAt ?? NaN)
      ? state.timerStartedAt
      : startedAt,
  }
}

const tickTimer = (state: GameState, timestamp: number): GameState => {
  if (
    state.timerState !== 'running' ||
    state.timerStartedAt === null ||
    !Number.isFinite(timestamp)
  ) {
    return state
  }

  const delta = timestamp - state.timerStartedAt
  if (!Number.isFinite(delta) || delta <= 0) {
    return state
  }

  return {
    ...state,
    elapsedMs: state.elapsedMs + delta,
    timerStartedAt: timestamp,
  }
}

const stopTimer = (state: GameState, timestamp: number): GameState => {
  if (state.timerState === 'idle') {
    return state
  }

  const updated = state.timerState === 'running' ? tickTimer(state, timestamp) : state

  return {
    ...updated,
    timerState: 'paused',
    timerStartedAt: null,
  }
}

const resetTimer = (state: GameState): GameState => {
  if (
    state.timerState === 'idle' &&
    state.elapsedMs === 0 &&
    state.timerStartedAt === null
  ) {
    return state
  }

  return {
    ...state,
    elapsedMs: 0,
    timerState: 'idle',
    timerStartedAt: null,
  }
}

const snapshotFromState = (state: GameState): GameSnapshot => ({
  stock: cloneCards(state.stock),
  waste: cloneCards(state.waste),
  foundations: cloneFoundations(state.foundations),
  tableau: cloneTableau(state.tableau),
  moveCount: state.moveCount,
  autoCompleteRuns: state.autoCompleteRuns,
  autoQueue: [],
  isAutoCompleting: false,
  hasWon: state.hasWon,
  winCelebrations: state.winCelebrations,
  exactId: state.exactId,
  deckChecksum: state.deckChecksum,
  drawCount: state.drawCount,
  elapsedMs: state.elapsedMs,
  timerState: state.timerState,
  timerStartedAt: state.timerStartedAt,
})

const cloneSnapshot = (snapshot: GameSnapshot, autoUpEnabled = true): GameState => ({
  stock: cloneCards(snapshot.stock),
  waste: cloneCards(snapshot.waste),
  foundations: cloneFoundations(snapshot.foundations),
  tableau: cloneTableau(snapshot.tableau),
  moveCount: snapshot.moveCount,
  autoCompleteRuns: snapshot.autoCompleteRuns,
  autoQueue: [],
  isAutoCompleting: false,
  hasWon: snapshot.hasWon,
  winCelebrations: snapshot.winCelebrations,
  exactId: snapshot.exactId,
  deckChecksum: snapshot.deckChecksum,
  drawCount: normalizeDrawCount(snapshot.drawCount),
  elapsedMs: snapshot.elapsedMs,
  timerState: snapshot.timerState,
  timerStartedAt: snapshot.timerStartedAt,
  history: [],
  future: [],
  selected: null,
  autoUpEnabled,
})

const cloneCards = (cards: Card[]): Card[] => cards.map((card) => ({ ...card }))

const cloneFoundations = (foundations: Foundations): Foundations =>
  FOUNDATION_SUIT_ORDER.reduce((acc, suit) => {
    acc[suit] = cloneCards(foundations[suit])
    return acc
  }, createEmptyFoundations())

const cloneTableau = (tableau: Tableau): Tableau =>
  tableau.map((column) => cloneCards(column))

const createDeckFromDealCards = (dealCards: readonly DealCard[]): Card[] => {
  const deckInstanceId = (deckInstanceCounter += 1).toString(36)
  return dealCards.map((card) => ({
    // Card ids must be unique per deal so animated card views do not reuse
    // face-up or flight state from a previous game.
    id: `${card.suit}-${card.rank}-${deckInstanceId}`,
    suit: card.suit,
    rank: card.rank,
    faceUp: false,
  }))
}

const createDeckFromExactId = (exactId: string): Card[] =>
  createDeckFromDealCards(decodeExactDealId(exactId))

const createDeck = (): Card[] => {
  return createDeckFromDealCards(createCanonicalDealCards())
}

const dealTableau = (deck: Card[]): { tableau: Tableau; stock: Card[] } => {
  const tableau: Tableau = Array.from({ length: TABLEAU_COLUMN_COUNT }, () => [])
  const deckCopy = [...deck]

  for (let columnIndex = 0; columnIndex < TABLEAU_COLUMN_COUNT; columnIndex += 1) {
    const cardsInColumn = columnIndex + 1
    for (let cardOffset = 0; cardOffset < cardsInColumn; cardOffset += 1) {
      const card = deckCopy.shift()
      if (!card) break
      const isTopCard = cardOffset === cardsInColumn - 1
      tableau[columnIndex].push({ ...card, faceUp: isTopCard })
    }
  }

  const stock = deckCopy.map((card) => ({ ...card, faceUp: false }))

  return { tableau, stock }
}

const createEmptyFoundations = (): Foundations =>
  FOUNDATION_SUIT_ORDER.reduce((acc, suit) => {
    acc[suit] = []
    return acc
  }, {} as Foundations)

const createSuitRecord = <T>(value: T): Record<Suit, T> =>
  FOUNDATION_SUIT_ORDER.reduce(
    (acc, suit) => {
      acc[suit] = value
      return acc
    },
    {} as Record<Suit, T>
  )
