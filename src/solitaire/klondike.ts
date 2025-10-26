const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const

export const FOUNDATION_SUIT_ORDER = ['hearts', 'diamonds', 'clubs', 'spades'] as const
export const TABLEAU_COLUMN_COUNT = 7
export const MAX_UNDO_HISTORY = 200
const MAX_AUTO_COMPLETE_ITERATIONS = 500

const ACE_RANK = 1
const KING_RANK = 13
const TOTAL_CARDS_PER_SUIT = 13
const RED_SUITS = new Set(['hearts', 'diamonds'])

export type Suit = (typeof SUITS)[number]
export type Rank = (typeof RANKS)[number]

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
}

export interface GameState extends GameSnapshot {
  history: GameSnapshot[]
  selected: Selection | null
}

export type GameAction =
  | { type: 'NEW_GAME' }
  | { type: 'DRAW_OR_RECYCLE' }
  | { type: 'UNDO' }
  | { type: 'SELECT_TABLEAU'; columnIndex: number; cardIndex: number }
  | { type: 'SELECT_WASTE' }
  | { type: 'SELECT_FOUNDATION_TOP'; suit: Suit }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'PLACE_ON_TABLEAU'; columnIndex: number }
  | { type: 'PLACE_ON_FOUNDATION'; suit: Suit }
  | { type: 'ADVANCE_AUTO_QUEUE' }
  | { type: 'APPLY_MOVE'; selection: Selection; target: MoveTarget; recordHistory?: boolean }

export interface DropHints {
  tableau: boolean[]
  foundations: Record<Suit, boolean>
}

export type AutoAction =
  | { type: 'move'; selection: Selection; target: MoveTarget }
  | { type: 'draw' }
  | { type: 'recycle' }

let cardIdCounter = 0

export const createInitialState = (): GameState => {
  const deck = shuffle(createDeck())
  const { tableau, stock } = dealTableau(deck)
  const snapshot: GameSnapshot = {
    stock,
    waste: [],
    foundations: createEmptyFoundations(),
    tableau,
    moveCount: 0,
    autoCompleteRuns: 0,
    autoQueue: [],
    isAutoCompleting: false,
    hasWon: false,
    winCelebrations: 0,
  }

  return {
    ...snapshot,
    history: [],
    selected: null,
  }
}

export const klondikeReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState()
    case 'DRAW_OR_RECYCLE':
      return finalizeState(drawFromStock(haltAutoQueue(state)))
    case 'UNDO':
      return finalizeState(handleUndo(haltAutoQueue(state)))
    case 'SELECT_TABLEAU':
      return handleSelectTableau(haltAutoQueue(state), action.columnIndex, action.cardIndex)
    case 'SELECT_WASTE':
      return handleSelectWaste(haltAutoQueue(state))
    case 'SELECT_FOUNDATION_TOP':
      return handleSelectFoundation(haltAutoQueue(state), action.suit)
    case 'CLEAR_SELECTION':
      {
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
    case 'APPLY_MOVE':
      {
        const workingState = haltAutoQueue(state)
        const nextState = applyMove(workingState, action.selection, action.target, {
          recordHistory: action.recordHistory,
        })
        return nextState ? finalizeState(nextState) : workingState
      }
    default:
      return state
  }
}

const haltAutoQueue = (state: GameState): GameState =>
  state.autoQueue.length || state.isAutoCompleting
    ? { ...state, autoQueue: [], isAutoCompleting: false }
    : state

export const getDropHints = (state: GameState): DropHints => {
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

export const findAutoMoveTarget = (state: GameState, selection: Selection): MoveTarget | null => {
  const targets = listDropTargets(state, selection)
  if (targets.foundations.length) {
    return { type: 'foundation', suit: targets.foundations[0] }
  }
  if (targets.tableau.length) {
    return { type: 'tableau', columnIndex: targets.tableau[0] }
  }
  return null
}

export const hasUndoHistory = (state: GameState): boolean => state.history.length > 0

const listDropTargets = (
  state: GameState,
  selection: Selection,
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
  options: { recordHistory?: boolean; allowRecycle?: boolean } = {},
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
  const nextStock = state.stock.slice(0, -1)
  const drawn = state.stock[state.stock.length - 1]
  const nextWaste = [...state.waste, { ...drawn, faceUp: true }]

  return {
    ...state,
    stock: nextStock,
    waste: nextWaste,
    history,
    selected: null,
    moveCount: state.moveCount + 1,
  }
}

const recycleWasteToStock = (
  state: GameState,
  options: { recordHistory?: boolean } = {},
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

  return {
    ...cloneSnapshot(previousSnapshot),
    history: nextHistory,
    selected: null,
    autoQueue: [],
    isAutoCompleting: false,
    moveCount: state.moveCount + 1,
  }
}

const handleSelectTableau = (state: GameState, columnIndex: number, cardIndex: number): GameState => {
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
  options: { recordHistory?: boolean } = {},
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
  const nextTableau = cloneTableau(state.tableau)
  const nextFoundations = cloneFoundations(state.foundations)
  const nextWaste = cloneCards(state.waste)

  const movingCards = extractMovingCards({
    state,
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
    nextFoundations[target.suit] = [...nextFoundations[target.suit], movingCards[0]]
  }

  return {
    ...state,
    tableau: nextTableau,
    foundations: nextFoundations,
    waste: nextWaste,
    history,
    selected: null,
    moveCount: state.moveCount + 1,
  }
}

const extractMovingCards = ({
  state,
  selection,
  tableau,
  foundations,
  waste,
}: {
  state: GameState
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
    targetTop.rank === (stack[0].rank + 1) &&
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

const previewSelectionStack = (state: GameState, selection: Selection | null): Card[] => {
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
    (suit) => state.foundations[suit].length === TOTAL_CARDS_PER_SUIT,
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
  if (!isAutoCompleteReady(state) || state.isAutoCompleting || state.autoQueue.length) {
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
      const nextState = applyMove(workingState, selection, target, { recordHistory: false })

      if (!nextState || nextState === workingState) {
        break
      }

      planned.push({ type: 'move', selection, target })
      workingState = nextState
      steps += 1
      continue
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

    workingState = drawFromStock(workingState, { recordHistory: false, allowRecycle: false })
    planned.push({ type: 'draw' })
    steps += 1
  }

  return planned
}

const advanceAutoQueue = (state: GameState): GameState => {
  if (!state.autoQueue.length) {
    return state.isAutoCompleting ? { ...state, isAutoCompleting: false } : state
  }

  const [current, ...rest] = state.autoQueue
  let nextState: GameState = state

  if (current.type === 'move') {
    nextState =
      applyMove(state, current.selection, current.target, { recordHistory: false }) ?? state
  } else if (current.type === 'draw') {
    nextState = drawFromStock(state, { recordHistory: false, allowRecycle: false })
  } else if (current.type === 'recycle') {
    nextState = recycleWasteToStock(state, { recordHistory: false })
  }

  return {
    ...nextState,
    autoQueue: rest,
    isAutoCompleting: rest.length > 0,
    autoCompleteRuns: rest.length ? nextState.autoCompleteRuns : nextState.autoCompleteRuns + 1,
  }
}

const isAutoCompleteReady = (state: GameState): boolean =>
  state.tableau.every((column) => column.every((card) => card.faceUp))

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
  const nextHistory = [...state.history, snapshot]
  if (nextHistory.length > MAX_UNDO_HISTORY) {
    nextHistory.shift()
  }
  return nextHistory
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
})

const cloneSnapshot = (snapshot: GameSnapshot): GameState => ({
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
  history: [],
  selected: null,
})

const cloneCards = (cards: Card[]): Card[] => cards.map((card) => ({ ...card }))

const cloneFoundations = (foundations: Foundations): Foundations =>
  FOUNDATION_SUIT_ORDER.reduce((acc, suit) => {
    acc[suit] = cloneCards(foundations[suit])
    return acc
  }, createEmptyFoundations())

const cloneTableau = (tableau: Tableau): Tableau =>
  tableau.map((column) => cloneCards(column))

const createDeck = (): Card[] => {
  const deck: Card[] = []
  SUITS.forEach((suit) => {
    for (let rankIndex = 0; rankIndex < TOTAL_CARDS_PER_SUIT; rankIndex += 1) {
      const rank = (rankIndex + 1) as Rank
      deck.push({
        id: `${suit}-${rank}-${cardIdCounter += 1}`,
        suit,
        rank,
        faceUp: false,
      })
    }
  })
  return deck
}

const shuffle = (cards: Card[]): Card[] => {
  const copy = [...cards]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]]
  }
  return copy
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

const createSuitRecord = <T,>(value: T): Record<Suit, T> =>
  FOUNDATION_SUIT_ORDER.reduce((acc, suit) => {
    acc[suit] = value
    return acc
  }, {} as Record<Suit, T>)
