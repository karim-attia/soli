import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  Alert,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
  ScrollView,
} from 'react-native'
import { Link, useNavigation } from 'expo-router'
import { Button, H2, Paragraph, Text, XStack, YStack } from 'tamagui'
import { RefreshCcw, Undo2 } from '@tamagui/lucide-icons'
import { useToastController } from '@tamagui/toast'

// @ts-ignore - JSON import for predefined shuffles
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import shuffles from '../../scripts/shuffles-100.json'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const atomicSolver = require('../../src/solitaire/klondike_solver_atomic')

import {
  FOUNDATION_SUIT_ORDER,
  TABLEAU_COLUMN_COUNT,
  createInitialState,
  findAutoMoveTarget,
  getDropHints,
  klondikeReducer,
} from '../../src/solitaire/klondike'
import type {
  Card,
  GameState,
  Rank,
  Selection,
  Suit,
} from '../../src/solitaire/klondike'

// Atomic solver types for visualization
type AtomicSnapshot = {
  tableau: Array<Array<{ suit: Suit; rank: Rank; faceUp?: boolean }>>
  foundations: Record<Suit, Array<{ suit: Suit; rank: Rank }>>
  stock: Array<{ suit: Suit; rank: Rank }>
}
type AtomicCandidate = { steps: number; path: any[]; state: AtomicSnapshot }

const BASE_CARD_WIDTH = 72
const BASE_CARD_HEIGHT = 102
const CARD_ASPECT_RATIO = BASE_CARD_HEIGHT / BASE_CARD_WIDTH
const BASE_STACK_OFFSET = 28
const TABLEAU_GAP = 10
const MAX_CARD_WIDTH = 96
const MIN_CARD_WIDTH = 24
const WASTE_FAN_OVERLAP_RATIO = 0.35
const WASTE_FAN_MAX_OFFSET = 28
const AUTO_QUEUE_INTERVAL_MS = 200
const COLUMN_MARGIN = TABLEAU_GAP / 2
const COLOR_CARD_FACE = '#ffffff'
const COLOR_CARD_BACK = '#3b4d75'
const COLOR_CARD_BORDER = '#cbd5f5'
const COLOR_SELECTED_BORDER = '#c084fc'
const COLOR_DROP_BORDER = '#22a06b'
const COLOR_COLUMN_BORDER = '#d0d5dd'
const COLOR_COLUMN_SELECTED = 'rgba(147, 197, 253, 0.25)'
const COLOR_FOUNDATION_BORDER = '#94a3b8'
const COLOR_TEXT_MUTED = '#94a3b8'
const COLOR_TEXT_STRONG = '#1f2933'
const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
}
const SUIT_COLORS: Record<Suit, string> = {
  clubs: '#111827',
  spades: '#111827',
  diamonds: '#c92a2a',
  hearts: '#c92a2a',
}
const FACE_CARD_LABELS: Partial<Record<Rank, string>> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
}

// Solver visual tweaks: grey only for covered cards in solver mode
const COLOR_SOLVER_COVERED_FACE = '#f3f4f6'


type CardMetrics = {
  width: number
  height: number
  stackOffset: number
  radius: number
}

type InvalidWiggleConfig = {
  key: number
  lookup: Set<string>
}

const EMPTY_INVALID_WIGGLE: InvalidWiggleConfig = {
  key: 0,
  lookup: new Set<string>(),
}

const DEFAULT_METRICS: CardMetrics = {
  width: BASE_CARD_WIDTH,
  height: BASE_CARD_HEIGHT,
  stackOffset: BASE_STACK_OFFSET,
  radius: 12,
}

function computeCardMetrics(availableWidth: number | null): CardMetrics {
  if (!availableWidth || availableWidth <= 0) {
    return DEFAULT_METRICS
  }

  const totalGap = TABLEAU_GAP * (TABLEAU_COLUMN_COUNT - 1)
  const widthAvailable = Math.max(availableWidth - totalGap, MIN_CARD_WIDTH * TABLEAU_COLUMN_COUNT)
  const rawWidth = widthAvailable / TABLEAU_COLUMN_COUNT
  const unclampedWidth = Math.max(Math.floor(rawWidth), MIN_CARD_WIDTH)
  const constrainedWidth = Math.min(Math.max(unclampedWidth, MIN_CARD_WIDTH), MAX_CARD_WIDTH)
  const height = Math.round(constrainedWidth * CARD_ASPECT_RATIO)
  const stackOffset = Math.max(24, Math.round(constrainedWidth * (BASE_STACK_OFFSET / BASE_CARD_WIDTH + 0.12)))
  const radius = Math.max(6, Math.round(constrainedWidth * 0.12))

  return {
    width: constrainedWidth,
    height,
    stackOffset,
    radius,
  }
}

function collectSelectionCardIds(state: GameState, selection?: Selection | null): string[] {
  if (!selection) {
    return []
  }

  if (selection.source === 'waste') {
    const topWaste = state.waste[state.waste.length - 1]
    return topWaste ? [topWaste.id] : []
  }

  if (selection.source === 'foundation') {
    const topFoundation = state.foundations[selection.suit][state.foundations[selection.suit].length - 1]
    return topFoundation ? [topFoundation.id] : []
  }

  if (selection.source === 'tableau') {
    const column = state.tableau[selection.columnIndex] ?? []
    return column.slice(selection.cardIndex).map((card) => card.id)
  }

  return []
}

export default function TabOneScreen() {
  const [state, dispatch] = useReducer(klondikeReducer, undefined, createInitialState)
  const [boardWidth, setBoardWidth] = useState<number | null>(null)
  const cardMetrics = useMemo(() => computeCardMetrics(boardWidth), [boardWidth])
  const toast = useToastController()
  const navigation = useNavigation()
  const dropHints = useMemo(() => getDropHints(state), [state])
  const autoCompleteRunsRef = useRef(state.autoCompleteRuns)
  const winCelebrationsRef = useRef(state.winCelebrations)
  const [invalidWiggle, setInvalidWiggle] = useState<InvalidWiggleConfig>(() => ({
    ...EMPTY_INVALID_WIGGLE,
    lookup: new Set<string>(),
  }))
  const triggerInvalidSelectionWiggle = useCallback(
    (selection?: Selection | null) => {
      const ids = collectSelectionCardIds(state, selection)
      if (!ids.length) {
        return
      }
      setInvalidWiggle({
        key: Date.now(),
        lookup: new Set(ids),
      })
    },
    [state],
  )
  const notifyInvalidMove = useCallback(
    (options?: { selection?: Selection | null }) => {
      triggerInvalidSelectionWiggle(options?.selection ?? null)
    },
    [triggerInvalidSelectionWiggle],
  )

  // --- Atomic solver visualization state ---
  const [atomicSnapshot, setAtomicSnapshot] = useState<AtomicSnapshot | null>(null)
  const [atomicCandidates, setAtomicCandidates] = useState<AtomicCandidate[]>([])
  const [atomicReady, setAtomicReady] = useState(false)
  const [atomicStepCount, setAtomicStepCount] = useState(0)

  useEffect(() => {
    // Initialize from shuffle 91 (1-based)
    const idx = 90
    const deckOrder: number[] = Array.isArray(shuffles) && shuffles[idx] ? shuffles[idx] : []
    try {
      const frame = atomicSolver.getAtomicFrame(deckOrder, {
        maxLocalNodes: 20000,
        maxTimeMs: 1000,
        maxApproachSteps: 20,
        avoidEmptyUnlessKing: true,
        strategy: 'leastSteps',
      })
      setAtomicSnapshot(frame.snapshot)
      setAtomicCandidates(frame.candidates || [])
      setAtomicReady(true)
      setAtomicStepCount(0)
    } catch (e) {
      // ignore if solver unavailable
      setAtomicReady(false)
    }
  }, [])

  const drawLabel = state.stock.length ? 'Draw' : ''

  const handleBoardLayout = useCallback((event: LayoutChangeEvent) => {
    setBoardWidth(event.nativeEvent.layout.width)
  }, [])

  const handleDraw = useCallback(() => {
    if (!state.stock.length && !state.waste.length) {
      notifyInvalidMove()
      return
    }
    dispatch({ type: 'DRAW_OR_RECYCLE' })
  }, [dispatch, notifyInvalidMove, state.stock.length, state.waste.length])

  const handleUndo = useCallback(() => {
    if (!state.history.length) {
      notifyInvalidMove()
      return
    }
    dispatch({ type: 'UNDO' })
  }, [dispatch, notifyInvalidMove, state.history.length])

  const handleNewGame = useCallback(() => {
    Alert.alert('Start a new game?', 'Current progress will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'New Game',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'NEW_GAME' })
          toast.show('New game', { message: 'Shuffled cards and reset the board.' })
        },
      },
    ])
  }, [dispatch, toast])

  const attemptAutoMove = useCallback(
    (selection: Selection) => {
      const target = findAutoMoveTarget(state, selection)
      if (!target) {
        notifyInvalidMove({ selection })
        return
      }
      dispatch({ type: 'APPLY_MOVE', selection, target })
    },
    [dispatch, notifyInvalidMove, state],
  )

  const handleManualSelectTableau = useCallback(
    (columnIndex: number, cardIndex: number) => {
      dispatch({ type: 'SELECT_TABLEAU', columnIndex, cardIndex })
    },
    [dispatch],
  )

  const handleManualWasteSelect = useCallback(() => {
    dispatch({ type: 'SELECT_WASTE' })
  }, [dispatch])

  const handleManualFoundationSelect = useCallback(
    (suit: Suit) => {
      dispatch({ type: 'SELECT_FOUNDATION_TOP', suit })
    },
    [dispatch],
  )

  const handleColumnPress = useCallback(
    (columnIndex: number) => {
      if (!state.selected) {
        return
      }
      if (dropHints.tableau[columnIndex]) {
        dispatch({ type: 'PLACE_ON_TABLEAU', columnIndex })
      } else {
        notifyInvalidMove({ selection: state.selected })
      }
    },
    [dispatch, dropHints.tableau, notifyInvalidMove, state.selected],
  )

const handleFoundationPress = useCallback(
  (suit: Suit) => {
    if (!state.selected) {
      if (state.foundations[suit].length) {
        attemptAutoMove({ source: 'foundation', suit })
      }
      return
    }
    if (dropHints.foundations[suit]) {
      dispatch({ type: 'PLACE_ON_FOUNDATION', suit })
    } else {
      notifyInvalidMove({ selection: state.selected })
    }
  },
  [attemptAutoMove, dispatch, dropHints.foundations, notifyInvalidMove, state.foundations, state.selected],
)

  const clearSelection = useCallback(() => {
    if (state.selected) {
      dispatch({ type: 'CLEAR_SELECTION' })
    }
  }, [dispatch, state.selected])

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <XStack gap="$2" mr="$4">
          <Link href="/modal" asChild>
            <Button size="$2.5">Hello!</Button>
          </Link>
          <Button size="$2.5" variant="outlined" onPress={handleNewGame}>
            New Game
          </Button>
        </XStack>
      ),
    })
  }, [handleNewGame, navigation])

  useEffect(() => {
    if (state.autoCompleteRuns > autoCompleteRunsRef.current) {
      toast.show('Auto-complete engaged', {
        message: 'Finishing the remaining cards for you…',
      })
      autoCompleteRunsRef.current = state.autoCompleteRuns
    }
  }, [state.autoCompleteRuns, toast])

  useEffect(() => {
    if (state.winCelebrations > winCelebrationsRef.current) {
      toast.show('🎉 Tada!', { message: 'Foundations complete!' })
      winCelebrationsRef.current = state.winCelebrations
    }
  }, [state.winCelebrations, toast])

  useEffect(() => {
    if (!state.isAutoCompleting || state.autoQueue.length === 0) {
      return
    }
    const timer = setTimeout(() => {
      dispatch({ type: 'ADVANCE_AUTO_QUEUE' })
    }, AUTO_QUEUE_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [dispatch, state.autoQueue.length, state.isAutoCompleting])

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
    <YStack flex={1} bg="$background" px="$2" pt="$0" pb="$0" gap="$0">
      <YStack
        flex={1}
        onLayout={handleBoardLayout}
        style={styles.boardShell}
        px="$2"
        py="$2"
        gap="$3"
      >
        {atomicReady && atomicSnapshot ? (
          <SolverTopRow snapshot={atomicSnapshot} cardMetrics={cardMetrics} />
        ) : (
          <TopRow
            state={state}
            drawLabel={drawLabel}
            onDraw={handleDraw}
            onWasteTap={() => attemptAutoMove({ source: 'waste' })}
            onWasteHold={handleManualWasteSelect}
            onFoundationPress={handleFoundationPress}
            onFoundationHold={handleManualFoundationSelect}
            cardMetrics={cardMetrics}
            dropHints={dropHints}
            notifyInvalidMove={notifyInvalidMove}
            invalidWiggle={invalidWiggle}
          />
        )}

        {atomicReady && atomicSnapshot ? (
          <SolverTableau snapshot={atomicSnapshot} cardMetrics={cardMetrics} />
        ) : (
          <TableauSection
            state={state}
            cardMetrics={cardMetrics}
            dropHints={dropHints}
            onAutoMove={attemptAutoMove}
            onLongPress={handleManualSelectTableau}
            onColumnPress={handleColumnPress}
            invalidWiggle={invalidWiggle}
          />
        )}

        {!atomicReady || !atomicSnapshot ? (
          <>
            <SelectionHint state={state} onClear={clearSelection} />
            <XStack gap="$2" items="center">
              <Text style={styles.movesLabel}>Moves</Text>
              <Text style={styles.movesValue}>{state.moveCount}</Text>
            </XStack>
          </>
        ) : (
          <>
            <SolverStockGrid snapshot={atomicSnapshot} cardMetrics={cardMetrics} />
            <YStack gap="$2">
              <Text style={styles.movesLabel}>Next Approaches</Text>
              {atomicCandidates.map((cand, i) => {
                const flip = getFlipCoverInfo(atomicSnapshot, cand.state)
                const header = flip
                  ? `C${flip.column + 1} | ${rankToLabel(flip.uncovered.rank)}${SUIT_SYMBOLS[flip.uncovered.suit]} | ${cand.steps} steps`
                  : `— | — | ${cand.steps} steps`
                const steps = formatPathShort(atomicSnapshot, cand.path)
                return (
                  <YStack key={`cand-${i}`} gap="$1">
                    <Paragraph color="$color12">{header}</Paragraph>
                    {steps.map((line, li) => (
                      <Paragraph key={`cand-${i}-s-${li}`} color="$color12">- {line}</Paragraph>
                    ))}
                  </YStack>
                )
              })}
              <XStack gap="$3" mt="$2">
                <Button
                  size="$3"
                  onPress={() => {
                    if (!atomicSnapshot || !atomicCandidates.length) return
                    const chosen = atomicCandidates[0]
                    const next = atomicSolver.applyPath(atomicSnapshot, chosen.path)
                    const nextFrame = atomicSolver.getAtomicFrameFromState(next, {
                      maxLocalNodes: 20000,
                      maxTimeMs: 1000,
                      maxApproachSteps: 20,
                      avoidEmptyUnlessKing: true,
                      strategy: 'leastSteps',
                    })
                    setAtomicSnapshot(nextFrame.snapshot)
                    setAtomicCandidates(nextFrame.candidates || [])
                    setAtomicStepCount(atomicStepCount + 1)
                  }}
                >
                  Next atomic position
                </Button>
                <Button
                  size="$3"
                  variant="outlined"
                  onPress={() => {
                    if (!atomicSnapshot || !atomicCandidates.length) return
                    const chosen = atomicCandidates[0]
                    const next = atomicSolver.applyPath(atomicSnapshot, chosen.path)
                    const nextFrame = atomicSolver.getAtomicFrameFromState(next, {
                      maxLocalNodes: 20000,
                      maxTimeMs: 1000,
                      maxApproachSteps: 20,
                      avoidEmptyUnlessKing: true,
                      strategy: 'mostCovered',
                    })
                    setAtomicSnapshot(nextFrame.snapshot)
                    setAtomicCandidates(nextFrame.candidates || [])
                    setAtomicStepCount(atomicStepCount + 1)
                  }}
                >
                  Next (Most Covered)
                </Button>
                <Text style={styles.movesValue}>Depth {atomicStepCount}</Text>
              </XStack>
            </YStack>
          </>
        )}
      </YStack>

      {!atomicReady || !atomicSnapshot ? (
        <ControlBar
          onDraw={handleDraw}
          drawLabel={drawLabel}
          onUndo={handleUndo}
          canUndo={state.history.length > 0}
          canDraw={Boolean(state.stock.length || state.waste.length)}
        />
      ) : null}
    </YStack>
    </ScrollView>
  )
}

type TopRowProps = {
  state: GameState
  drawLabel: string
  onDraw: () => void
  onWasteTap: () => void
  onWasteHold: () => void
  onFoundationPress: (suit: Suit) => void
  onFoundationHold: (suit: Suit) => void
  cardMetrics: CardMetrics
  dropHints: ReturnType<typeof getDropHints>
  notifyInvalidMove: (options?: { selection?: Selection | null }) => void
  invalidWiggle: InvalidWiggleConfig
}

const TopRow = ({
  state,
  drawLabel,
  onDraw,
  onWasteTap,
  onWasteHold,
  onFoundationPress,
  onFoundationHold,
  cardMetrics,
  dropHints,
  notifyInvalidMove,
  invalidWiggle,
}: TopRowProps) => {
  const stockDisabled = !state.stock.length && !state.waste.length
  const wasteSelected = state.selected?.source === 'waste'
  const showRecycle = !state.stock.length && state.waste.length > 0
  const drawVariant = showRecycle
    ? 'recycle'
    : state.stock.length
      ? 'stock'
      : 'empty'

  const handleWastePress = useCallback(() => {
    if (!state.waste.length) {
      notifyInvalidMove()
      return
    }
    onWasteTap()
  }, [notifyInvalidMove, onWasteTap, state.waste.length])

  return (
    <XStack gap="$4" width="100%" items="flex-start">
      <XStack gap="$2" flexWrap="nowrap" justify="flex-start" shrink={0}>
        {FOUNDATION_SUIT_ORDER.map((suit) => (
          <FoundationPile
            key={suit}
            suit={suit}
            cards={state.foundations[suit]}
            cardMetrics={cardMetrics}
            isDroppable={dropHints.foundations[suit]}
            isSelected={state.selected?.source === 'foundation' && state.selected.suit === suit}
            onPress={() => onFoundationPress(suit)}
            onLongPress={() => onFoundationHold(suit)}
            invalidWiggle={invalidWiggle}
          />
        ))}
      </XStack>

      <XStack flex={1} gap="$3" justify="flex-end" items="flex-end">
        <PileButton
          label={`${state.waste.length}`}
          onPress={handleWastePress}
          disabled={!state.waste.length}
          disablePress
        >
          {state.waste.length ? (
            <WasteFan
              cards={state.waste}
              metrics={cardMetrics}
              isSelected={wasteSelected}
              onPress={handleWastePress}
              onLongPress={onWasteHold}
              invalidWiggle={invalidWiggle}
            />
          ) : (
            <EmptySlot highlight={false} metrics={cardMetrics} />
          )}
        </PileButton>

        {!state.hasWon && (
          <PileButton label={`${state.stock.length}`} onPress={onDraw} disabled={stockDisabled}>
            <CardBack
              label={state.stock.length ? drawLabel : undefined}
              metrics={cardMetrics}
              variant={drawVariant}
              icon={showRecycle ? <RefreshCcw color="#0f172a" size={18} /> : undefined}
            />
          </PileButton>
        )}
      </XStack>
    </XStack>
  )
}

type TableauSectionProps = {
  state: GameState
  cardMetrics: CardMetrics
  dropHints: ReturnType<typeof getDropHints>
  onAutoMove: (selection: Selection) => void
  onLongPress: (columnIndex: number, cardIndex: number) => void
  onColumnPress: (columnIndex: number) => void
  invalidWiggle: InvalidWiggleConfig
}

const TableauSection = ({
  state,
  cardMetrics,
  dropHints,
  onAutoMove,
  onLongPress,
  onColumnPress,
  invalidWiggle,
}: TableauSectionProps) => (
  <View style={styles.tableauRow}>
    {state.tableau.map((column, columnIndex) => (
      <TableauColumn
        key={`col-${columnIndex}`}
        column={column}
        columnIndex={columnIndex}
        state={state}
        cardMetrics={cardMetrics}
        isDroppable={dropHints.tableau[columnIndex]}
        onCardPress={(cardIndex) =>
          onAutoMove({ source: 'tableau', columnIndex, cardIndex })
        }
        onCardLongPress={(cardIndex) => onLongPress(columnIndex, cardIndex)}
        onColumnPress={() => onColumnPress(columnIndex)}
        invalidWiggle={invalidWiggle}
      />
    ))}
  </View>
)
// ---- Solver read-only UI (keeps exact positions/design; uses light grey open cards) ----
const SolverTopRow = ({ snapshot, cardMetrics }: { snapshot: AtomicSnapshot; cardMetrics: CardMetrics }) => {
  const foundations = FOUNDATION_SUIT_ORDER
  return (
    <XStack gap="$4" width="100%" items="flex-start">
      <XStack gap="$2" flexWrap="nowrap" justify="flex-start" shrink={0}>
        {foundations.map((suit) => (
          <FoundationPile
            key={suit}
            suit={suit}
            cards={snapshot.foundations[suit].map((c) => ({ id: `${suit}-${c.rank}`, suit, rank: c.rank as Rank, faceUp: true }))}
            cardMetrics={cardMetrics}
            isDroppable={false}
            isSelected={false}
            onPress={() => {}}
            onLongPress={() => {}}
            invalidWiggle={EMPTY_INVALID_WIGGLE}
          />
        ))}
      </XStack>

      <XStack flex={1} gap="$3" justify="flex-end" items="flex-end">
        <PileButton label={`${snapshot.stock.length}`} onPress={() => {}} disabled disablePress>
          <CardBack metrics={cardMetrics} variant={snapshot.stock.length ? 'stock' : 'empty'} />
        </PileButton>
      </XStack>
    </XStack>
  )
}

const SolverTableau = ({ snapshot, cardMetrics }: { snapshot: AtomicSnapshot; cardMetrics: CardMetrics }) => (
  <View style={styles.tableauRow}>
    {snapshot.tableau.map((column, columnIndex) => (
      <Pressable
        key={`scol-${columnIndex}`}
        style={[
          styles.column,
          {
            width: cardMetrics.width,
            height: column.length ? cardMetrics.height + (column.length - 1) * cardMetrics.stackOffset : cardMetrics.height,
            borderColor: column.length === 0 ? 'transparent' : COLOR_COLUMN_BORDER,
            marginHorizontal: COLUMN_MARGIN,
          },
        ]}
      >
        {column.length === 0 && <EmptySlot highlight={false} metrics={cardMetrics} />}
        {column.map((c, idx) => {
          const isCovered = idx < column.length - 1
          return (
            <CardView
              key={`${c.suit}-${c.rank}-${idx}`}
              card={{ id: `${c.suit}-${c.rank}-${idx}`, suit: c.suit as Suit, rank: c.rank as Rank, faceUp: true }}
              metrics={cardMetrics}
              offsetTop={idx * cardMetrics.stackOffset}
              invalidWiggle={EMPTY_INVALID_WIGGLE}
              variant={isCovered ? 'solver' : 'normal'}
              onPress={undefined}
              onLongPress={undefined}
            />
          )
        })}
      </Pressable>
    ))}
  </View>
)

const SolverStockGrid = ({ snapshot, cardMetrics }: { snapshot: AtomicSnapshot; cardMetrics: CardMetrics }) => {
  // render stock as 4 columns below, open and sorted by suit+rank
  const sorted = snapshot.stock
    .slice()
    .sort((a, b) => (a.suit === b.suit ? a.rank - b.rank : FOUNDATION_SUIT_ORDER.indexOf(a.suit as any) - FOUNDATION_SUIT_ORDER.indexOf(b.suit as any)))
  const cols = 4
  const perCol = Math.ceil(sorted.length / cols)
  const stacks: Array<typeof sorted> = Array.from({ length: cols }, (_, i) => sorted.slice(i * perCol, (i + 1) * perCol))
  return (
    <YStack gap="$2">
      <Text style={styles.movesLabel}>Stock</Text>
      <XStack width="100%" justify="center" items="flex-start" style={styles.tableauRow}>
        {stacks.map((stack, si) => (
          <Pressable
            key={`stack-${si}`}
            style={[
              styles.column,
              {
                width: cardMetrics.width,
                height: stack.length ? cardMetrics.height + (stack.length - 1) * cardMetrics.stackOffset : cardMetrics.height,
                borderColor: stack.length === 0 ? 'transparent' : COLOR_COLUMN_BORDER,
                marginHorizontal: COLUMN_MARGIN,
              },
            ]}
          >
            {stack.length === 0 && <EmptySlot highlight={false} metrics={cardMetrics} />}
            {stack.map((c, idx) => (
              <CardView
                key={`s-${si}-${c.suit}-${c.rank}-${idx}`}
                card={{ id: `s-${si}-${c.suit}-${c.rank}-${idx}`, suit: c.suit as Suit, rank: c.rank as Rank, faceUp: true }}
                metrics={cardMetrics}
                offsetTop={idx * cardMetrics.stackOffset}
                invalidWiggle={EMPTY_INVALID_WIGGLE}
                variant="normal"
              />
            ))}
          </Pressable>
        ))}
      </XStack>
    </YStack>
  )
}

function describePath(path: any[]): string {
  if (!Array.isArray(path) || !path.length) return '—'
  return path
    .map((mv) => {
      if (mv.kind === 't2f') return `Move top of Column ${mv.ci + 1} to Foundation (${SUIT_SYMBOLS[mv.suit]})`
      if (mv.kind === 't2t') return `Move stack from Column ${mv.from + 1} (from index ${mv.index + 1}) to Column ${mv.to + 1}`
      if (mv.kind === 'stock2f') return `Move Stock card to Foundation (${SUIT_SYMBOLS[mv.suit]})`
      if (mv.kind === 'stock2t') return `Move Stock card to Column ${mv.to + 1}`
      if (mv.kind === 'f2t') return `Move top of Foundation (${SUIT_SYMBOLS[mv.suit]}) to Column ${mv.to + 1}`
      return mv.kind
    })
    .join(', ')
}

// Determine uncovered card and the covering card (the card that was above it before the flip)
function getFlipCoverInfo(before: AtomicSnapshot, after: AtomicSnapshot): null | { column: number; uncovered: { suit: Suit; rank: Rank }; cover: { suit: Suit; rank: Rank } } {
  for (let ci = 0; ci < Math.max(before.tableau.length, after.tableau.length); ci += 1) {
    const b = before.tableau[ci] || []
    const a = after.tableau[ci] || []
    // count face-downs before/after
    const bDown = b.reduce((acc, c) => acc + (c.faceUp ? 0 : 1), 0)
    const aDown = a.reduce((acc, c) => acc + (c.faceUp ? 0 : 1), 0)
    if (aDown === bDown - 1) {
      // last face-down index in 'before'
      let lastDownIdx = -1
      for (let i = 0; i < b.length; i += 1) if (!b[i].faceUp) lastDownIdx = i
      if (lastDownIdx >= 0) {
        const uncovered = b[lastDownIdx]
        const cover = b[lastDownIdx + 1]
        if (uncovered && cover) {
          return {
            column: ci,
            uncovered: { suit: uncovered.suit as Suit, rank: uncovered.rank as Rank },
            cover: { suit: cover.suit as Suit, rank: cover.rank as Rank },
          }
        }
      }
    }
  }
  return null
}

// Human-friendly compact step list (e.g., "2♥ → F♥", "2♥ 3♣ → C5")
function formatPathShort(root: AtomicSnapshot, path: any[]): string[] {
  const sim = {
    tableau: root.tableau.map((col) => col.map((c) => ({ suit: c.suit as Suit, rank: c.rank as Rank, faceUp: true }))),
    foundations: FOUNDATION_SUIT_ORDER.reduce((acc, s) => { acc[s] = root.foundations[s].map((c) => ({ suit: c.suit as Suit, rank: c.rank as Rank })); return acc }, {} as Record<Suit, { suit: Suit; rank: Rank }[]>),
    stock: root.stock.map((c) => ({ suit: c.suit as Suit, rank: c.rank as Rank })),
  }
  const lines: string[] = []
  const cardLabel = (c: { suit: Suit; rank: Rank }) => `${rankToLabel(c.rank)}${SUIT_SYMBOLS[c.suit]}`
  const stackLabel = (arr: { suit: Suit; rank: Rank }[]) => arr.map(cardLabel).join(' ')
  const isRed = (s: Suit) => new Set(['hearts', 'diamonds']).has(s)
  const canDropOn = (target: { suit: Suit; rank: Rank } | undefined, moving: { suit: Suit; rank: Rank }) => {
    if (!target) return moving.rank === 13
    return target.rank === moving.rank + 1 && isRed(moving.suit) !== isRed(target.suit)
  }
  for (const mv of path || []) {
    if (mv.kind === 't2f') {
      const src = sim.tableau[mv.ci]
      const top = src[src.length - 1]
      lines.push(`${cardLabel(top)} → F${SUIT_SYMBOLS[mv.suit]}`)
      src.pop()
      sim.foundations[mv.suit].push(top)
    } else if (mv.kind === 't2t') {
      const fromCol = sim.tableau[mv.from]
      const moving = fromCol.slice(mv.index)
      lines.push(`${stackLabel(moving)} → C${mv.to + 1}`)
      sim.tableau[mv.to].push(...moving)
      sim.tableau[mv.from] = fromCol.slice(0, mv.index)
    } else if (mv.kind === 'stock2f') {
      const pile = sim.foundations[mv.suit]
      const need = (pile[pile.length - 1]?.rank || 0) + 1
      const idx = sim.stock.findIndex((c) => c.suit === mv.suit && c.rank === need)
      const card = idx >= 0 ? sim.stock.splice(idx, 1)[0] : { suit: mv.suit as Suit, rank: need as Rank }
      lines.push(`${cardLabel(card)} → F${SUIT_SYMBOLS[mv.suit]}`)
      sim.foundations[mv.suit].push(card)
    } else if (mv.kind === 'stock2t') {
      const targetTop = sim.tableau[mv.to][sim.tableau[mv.to].length - 1]
      let idx = -1
      for (let i = 0; i < sim.stock.length; i += 1) { if (canDropOn(targetTop, sim.stock[i])) { idx = i; break } }
      const card = idx >= 0 ? sim.stock.splice(idx, 1)[0] : sim.stock[0]
      if (card) lines.push(`${cardLabel(card)} → C${mv.to + 1}`)
      if (card) sim.tableau[mv.to].push({ suit: card.suit, rank: card.rank, faceUp: true })
    } else if (mv.kind === 'f2t') {
      const pile = sim.foundations[mv.suit]
      const card = pile[pile.length - 1]
      lines.push(`${cardLabel(card)} → C${mv.to + 1}`)
      sim.tableau[mv.to].push({ suit: card.suit, rank: card.rank, faceUp: true })
      pile.pop()
    }
  }
  return lines
}

type TableauColumnProps = {
  column: Card[]
  columnIndex: number
  state: GameState
  cardMetrics: CardMetrics
  isDroppable: boolean
  onCardPress: (cardIndex: number) => void
  onCardLongPress: (cardIndex: number) => void
  onColumnPress: () => void
  invalidWiggle: InvalidWiggleConfig
}

const TableauColumn = ({
  column,
  columnIndex,
  state,
  cardMetrics,
  isDroppable,
  onCardPress,
  onCardLongPress,
  onColumnPress,
  invalidWiggle,
}: TableauColumnProps) => {
  const columnHeight = column.length
    ? cardMetrics.height + (column.length - 1) * cardMetrics.stackOffset
    : cardMetrics.height
  const columnSelected =
    state.selected?.source === 'tableau' && state.selected.columnIndex === columnIndex
  const selectedCardIndex =
    columnSelected && state.selected?.source === 'tableau' ? state.selected.cardIndex : null

  return (
    <Pressable
      style={[
        styles.column,
        {
          width: cardMetrics.width,
          height: columnHeight,
          borderColor:
            column.length === 0
              ? 'transparent'
              : isDroppable
                ? COLOR_DROP_BORDER
                : COLOR_COLUMN_BORDER,
          backgroundColor: columnSelected ? COLOR_COLUMN_SELECTED : 'transparent',
          marginHorizontal: COLUMN_MARGIN,
        },
      ]}
      onPress={onColumnPress}
    >
      {column.length === 0 && (
        <EmptySlot highlight={isDroppable} metrics={cardMetrics} />
      )}
      {column.map((card, cardIndex) => (
        <CardView
          key={card.id}
          card={card}
          metrics={cardMetrics}
          offsetTop={cardIndex * cardMetrics.stackOffset}
          isSelected={
            columnSelected &&
            selectedCardIndex !== null &&
            selectedCardIndex <= cardIndex &&
            card.faceUp
          }
          onPress={card.faceUp ? () => onCardPress(cardIndex) : undefined}
          onLongPress={card.faceUp ? () => onCardLongPress(cardIndex) : undefined}
          invalidWiggle={invalidWiggle}
        />
      ))}
    </Pressable>
  )
}

type CardViewProps = {
  card: Card
  metrics: CardMetrics
  offsetTop?: number
  offsetLeft?: number
  isSelected?: boolean
  onPress?: () => void
  onLongPress?: () => void
  invalidWiggle: InvalidWiggleConfig
  variant?: 'normal' | 'solver'
}

const CardView = ({
  card,
  metrics,
  offsetTop,
  offsetLeft,
  isSelected,
  onPress,
  onLongPress,
  invalidWiggle,
  variant = 'normal',
}: CardViewProps) => {
  const shouldFloat = typeof offsetTop === 'number' || typeof offsetLeft === 'number'
  const positionStyle = shouldFloat
    ? {
        position: 'absolute' as const,
        top: typeof offsetTop === 'number' ? offsetTop : 0,
        left: typeof offsetLeft === 'number' ? offsetLeft : 0,
      }
    : undefined

  const containerStyle = [
    positionStyle,
    {
      width: metrics.width,
      height: metrics.height,
    },
  ]

  if (!card.faceUp) {
    return (
      <View style={containerStyle}>
        <View
          style={[
            styles.cardBase,
            styles.faceDown,
            {
              width: '100%',
              height: '100%',
              borderRadius: metrics.radius,
            },
          ]}
        />
      </View>
    )
  }

  const borderColor = isSelected ? COLOR_SELECTED_BORDER : COLOR_CARD_BORDER
  const faceColor = variant === 'solver' ? COLOR_SOLVER_COVERED_FACE : COLOR_CARD_FACE

  return (
    <View style={containerStyle}>
      <Pressable
        style={[
          styles.cardBase,
          styles.faceUp,
          {
            width: '100%',
            height: '100%',
            borderRadius: metrics.radius,
            borderColor,
              backgroundColor: faceColor,
          },
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={!onPress && !onLongPress}
      >
        <Text
          style={[styles.cardCornerRank, { color: SUIT_COLORS[card.suit] }]}
          ellipsizeMode="clip"
          numberOfLines={1}
          allowFontScaling={false}
        >
          {rankToLabel(card.rank)}
        </Text>
        <Text
          style={[styles.cardCornerSuit, { color: SUIT_COLORS[card.suit] }]}
          ellipsizeMode="clip"
          numberOfLines={1}
          allowFontScaling={false}
        >
          {SUIT_SYMBOLS[card.suit]}
        </Text>
        <Text
          style={[styles.cardSymbol, { color: SUIT_COLORS[card.suit] }]}
          ellipsizeMode="clip"
          numberOfLines={1}
          allowFontScaling={false}
        >
          {SUIT_SYMBOLS[card.suit]}
        </Text>
      </Pressable>
    </View>
  )
}

const EmptySlot = ({
  label,
  highlight,
  metrics,
}: {
  label?: string
  highlight: boolean
  metrics: CardMetrics
}) => (
  <View
    style={[
      styles.emptySlot,
      {
        width: metrics.width,
        height: metrics.height,
        borderRadius: metrics.radius,
        borderColor: highlight ? COLOR_DROP_BORDER : COLOR_COLUMN_BORDER,
      },
    ]}
  >
    {!!label && <Text style={styles.emptyLabel}>{label}</Text>}
  </View>
)

type CardBackProps = {
  label?: string
  metrics: CardMetrics
  variant: 'stock' | 'recycle' | 'empty'
  icon?: React.ReactNode
}

const CardBack = ({ label, metrics, variant, icon }: CardBackProps) => {
  const baseStyle =
    variant === 'stock'
      ? styles.cardBack
      : [
          styles.cardBackOutline,
          variant === 'recycle' ? styles.cardBackRecycle : styles.cardBackEmpty,
        ]

  return (
    <View
      style={[
        baseStyle,
        {
          width: metrics.width,
          height: metrics.height,
          borderRadius: metrics.radius,
        },
      ]}
    >
      {icon ? icon : label ? <Text style={styles.cardBackText}>{label}</Text> : null}
    </View>
  )
}

type WasteFanProps = {
  cards: Card[]
  metrics: CardMetrics
  isSelected: boolean
  onPress: () => void
  onLongPress: () => void
  invalidWiggle: InvalidWiggleConfig
}

const WasteFan = ({
  cards,
  metrics,
  isSelected,
  onPress,
  onLongPress,
  invalidWiggle,
}: WasteFanProps) => {
  const visible = cards.slice(-3)
  const overlap = Math.min(metrics.width * WASTE_FAN_OVERLAP_RATIO, WASTE_FAN_MAX_OFFSET)
  const width = metrics.width + overlap * (visible.length - 1)
  const previousVisibleIdsRef = useRef<Set<string>>(new Set())
  const animationSignature = `${cards[cards.length - 1]?.id ?? 'none'}-${cards.length}`
  const enteringLookup = useMemo(() => {
    const prev = previousVisibleIdsRef.current
    const entering = new Set<string>()
    visible.forEach((card) => {
      if (!prev.has(card.id)) {
        entering.add(card.id)
      }
    })
    return entering
  }, [visible])

  useEffect(() => {
    previousVisibleIdsRef.current = new Set(visible.map((card) => card.id))
  }, [animationSignature, visible])

  return (
    <View style={{ width, height: metrics.height, position: 'relative' }}>
      {visible.map((card, index) => {
        const isTop = index === visible.length - 1
        return (
          <WasteFanCard
            key={card.id}
            card={card}
            metrics={metrics}
            targetOffset={index * overlap}
            isSelected={isTop && isSelected}
            onPress={isTop ? onPress : undefined}
            onLongPress={isTop ? onLongPress : undefined}
            invalidWiggle={invalidWiggle}
            isEntering={enteringLookup.has(card.id)}
            zIndex={index}
          />
        )
      })}
    </View>
  )
}

type WasteFanCardProps = {
  card: Card
  metrics: CardMetrics
  targetOffset: number
  isSelected: boolean
  onPress?: () => void
  onLongPress?: () => void
  invalidWiggle: InvalidWiggleConfig
  isEntering: boolean
  zIndex: number
}

const WasteFanCard = ({
  card,
  metrics,
  targetOffset,
  isSelected,
  onPress,
  onLongPress,
  invalidWiggle,
  isEntering,
  zIndex,
}: WasteFanCardProps) => {
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wasteFanCardWrapper,
        {
          width: metrics.width,
          height: metrics.height,
          zIndex,
          transform: [{ translateX: targetOffset }],
        },
      ]}
    >
      <CardView
        card={card}
        metrics={metrics}
        isSelected={isSelected}
        onPress={onPress}
        onLongPress={onLongPress}
        invalidWiggle={invalidWiggle}
      />
    </View>
  )
}

type PileButtonProps = {
  label: string
  children: React.ReactNode
  onPress: () => void
  disabled?: boolean
  disablePress?: boolean
}

const PileButton = ({ label, children, onPress, disabled, disablePress }: PileButtonProps) => {
  const commonStyle = [styles.pilePressable, disabled && styles.disabledPressable]

  return (
    <YStack gap="$1" items="center">
      {disablePress ? (
        <View style={commonStyle}>{children}</View>
      ) : (
        <Pressable onPress={onPress} disabled={disabled} style={commonStyle}>
          {children}
        </Pressable>
      )}
      <Text color="$color10" fontSize={12}>
        {label}
      </Text>
    </YStack>
  )
}

type FoundationPileProps = {
  suit: Suit
  cards: Card[]
  cardMetrics: CardMetrics
  isDroppable: boolean
  isSelected: boolean
  onPress: () => void
  onLongPress: () => void
  invalidWiggle: InvalidWiggleConfig
  variant?: 'normal' | 'solver'
}

const FoundationPile = ({
  suit,
  cards,
  cardMetrics,
  isDroppable,
  isSelected,
  onPress,
  onLongPress,
  invalidWiggle,
  variant,
}: FoundationPileProps) => {
  const topCard = cards[cards.length - 1]
  const hasCards = cards.length > 0
  const borderColor = isDroppable
    ? COLOR_DROP_BORDER
    : isSelected
      ? COLOR_SELECTED_BORDER
      : hasCards
        ? COLOR_FOUNDATION_BORDER
        : COLOR_COLUMN_BORDER

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.foundation,
        {
          width: cardMetrics.width,
          height: cardMetrics.height,
          borderRadius: cardMetrics.radius,
          borderColor,
        },
      ]}
    >
      {topCard ? (
        <CardView card={topCard} metrics={cardMetrics} invalidWiggle={invalidWiggle} variant={variant} />
      ) : (
        <Text
          style={[
            styles.foundationSymbol,
            { color: hasCards ? SUIT_COLORS[suit] : COLOR_TEXT_MUTED },
          ]}
        >
          {SUIT_SYMBOLS[suit]}
        </Text>
      )}
    </Pressable>
  )
}

const SelectionHint = ({ state, onClear }: { state: GameState; onClear: () => void }) => {
  if (!state.selected) {
    return null
  }

  const selectionLabel = describeSelection(state)

  return (
    <XStack gap="$2" items="center">
      <Paragraph color="$color11">Selected: {selectionLabel}</Paragraph>
      <Button size="$2" variant="outlined" onPress={onClear}>
        Clear
      </Button>
    </XStack>
  )
}

type ControlBarProps = {
  onDraw: () => void
  drawLabel: string
  onUndo: () => void
  canUndo: boolean
  canDraw: boolean
}

const ControlBar = ({ onDraw, drawLabel, onUndo, canUndo, canDraw }: ControlBarProps) => (
  <XStack gap="$3">
    <Button flex={1} icon={RefreshCcw} onPress={onDraw} disabled={!canDraw}>
      {drawLabel}
    </Button>
    <Button flex={1} icon={Undo2} onPress={onUndo} disabled={!canUndo}>
      Undo
    </Button>
  </XStack>
)

const describeSelection = (state: GameState): string => {
  const selection = state.selected
  if (!selection) {
    return 'None'
  }
  if (selection.source === 'waste') {
    return 'Waste top card'
  }
  if (selection.source === 'foundation') {
    return `${selection.suit.toUpperCase()} foundation top`
  }
  const columnLabel = selection.columnIndex + 1
  const card = state.tableau[selection.columnIndex]?.[selection.cardIndex]
  const cardLabel = card ? `${rankToLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}` : 'card'
  return `Column ${columnLabel} – ${cardLabel}`
}

const rankToLabel = (rank: Rank): string => FACE_CARD_LABELS[rank] ?? String(rank)

const styles = StyleSheet.create({
  centeredHeading: {
    textAlign: 'center',
  },
  centeredParagraph: {
    textAlign: 'center',
  },
  boardShell: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: COLUMN_MARGIN,
  },
  tableauRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    flexWrap: 'nowrap',
    paddingHorizontal: COLUMN_MARGIN,
  },
  column: {
    // borderWidth: 0,
    // borderStyle: 'dashed',
    // borderRadius: 12,
    // position: 'relative',
    overflow: 'visible',
    paddingBottom: 8,
  },
  cardBase: {
    shadowColor: 'rgba(0,0,0,0.25)',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 6,
    justifyContent: 'center',
    backgroundColor: COLOR_CARD_FACE,
    overflow: 'hidden',
  },
  faceDown: {
    backgroundColor: COLOR_CARD_BACK,
    borderWidth: 1,
    borderColor: COLOR_CARD_BORDER,
  },
  faceUp: {
    borderWidth: 1,
  },
  cardCornerRank: {
    position: 'absolute',
    top: -2,
    left: 3,
    fontWeight: '700',
    fontSize: 16,
  },
  cardCornerSuit: {
    position: 'absolute',
    top: 0,
    right: 0,
    fontSize: 12,
  },
  cardSymbol: {
    textAlignVertical: 'center',
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '600',
    marginTop: 16,
  },
  movesLabel: {
    fontSize: 12,
    color: COLOR_TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  movesValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR_TEXT_STRONG,
  },
  emptySlot: {
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLabel: {
    color: COLOR_TEXT_MUTED,
  },
  cardBack: {
    backgroundColor: COLOR_CARD_BACK,
    borderWidth: 1,
    borderColor: COLOR_CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackOutline: {
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cardBackRecycle: {
    borderColor: COLOR_TEXT_STRONG,
  },
  cardBackEmpty: {
    borderColor: COLOR_COLUMN_BORDER,
  },
  cardBackText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  pilePressable: {
    opacity: 1,
  },
  disabledPressable: {
    opacity: 0.4,
  },
  foundation: {
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foundationSymbol: {
    fontSize: 28,
    color: COLOR_TEXT_STRONG,
  },
  wasteFanCardWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
})
