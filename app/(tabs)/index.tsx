import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  ReactNode,
} from 'react'
import {
  Alert,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  measure,
  runOnJS,
  runOnUI,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import type { AnimatedRef, SharedValue } from 'react-native-reanimated'
import { Link, useNavigation } from 'expo-router'
import { Button, H2, Paragraph, Text, XStack, YStack } from 'tamagui'
import { RefreshCcw, Undo2 } from '@tamagui/lucide-icons'
import { useToastController } from '@tamagui/toast'

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

const BASE_CARD_WIDTH = 72
const BASE_CARD_HEIGHT = 102
const CARD_ASPECT_RATIO = BASE_CARD_HEIGHT / BASE_CARD_WIDTH
const BASE_STACK_OFFSET = 28
const TABLEAU_GAP = 10
const MAX_CARD_WIDTH = 96
const MIN_CARD_WIDTH = 24
const WASTE_FAN_OVERLAP_RATIO = 0.35
const WASTE_ENTER_EXTRA_RATIO = 0.25
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
const CARD_ANIMATION_DURATION_MS = 90
const CARD_MOVE_EASING = Easing.bezier(0.15, 0.9, 0.2, 1)
const CARD_FLIGHT_TIMING = {
  duration: CARD_ANIMATION_DURATION_MS,
  easing: CARD_MOVE_EASING,
}

const ENABLE_ANIMATIONS = true
const ENABLE_STACK_ANIMATION = false
const ENABLE_CARD_FLIP_ANIMATION = false
const CARD_FLIP_HALF_DURATION_MS = 40
const CARD_FLIP_HALF_TIMING = {
  duration: CARD_FLIP_HALF_DURATION_MS,
  easing: Easing.bezier(0.45, 0, 0.55, 1),
}
const WASTE_SLIDE_DURATION_MS = 70
const WASTE_SLIDE_EASING = Easing.bezier(0.15, 0.9, 0.2, 1)
const WASTE_TIMING_CONFIG = {
  duration: WASTE_SLIDE_DURATION_MS,
  easing: WASTE_SLIDE_EASING,
}
const WIGGLE_OFFSET_PX = 5
const WIGGLE_SEGMENT_DURATION_MS = 70
const WIGGLE_EASING = Easing.bezier(0.4, 0, 0.2, 1)
const WIGGLE_TIMING_CONFIG = {
  duration: WIGGLE_SEGMENT_DURATION_MS,
  easing: WIGGLE_EASING,
}

const AnimatedView = Animated.createAnimatedComponent(View)
type CardFlightSnapshot = {
  pageX: number
  pageY: number
  width: number
  height: number
}

type CardFlightRegistry = SharedValue<Record<string, CardFlightSnapshot>>

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
  const cardFlights = useSharedValue<Record<string, CardFlightSnapshot>>({})
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
    <YStack flex={1} bg="$background" px="$2" pt="$6" pb="$2" gap="$4">
      <H2 style={styles.centeredHeading}>Klondike Solitaire</H2>
      <Paragraph style={styles.centeredParagraph} color="$color11">
        Tap to auto-move cards; long-press to pick one up and choose a destination.
      </Paragraph>

      <YStack
        flex={1}
        onLayout={handleBoardLayout}
        style={styles.boardShell}
        px="$2"
        py="$2"
        gap="$3"
      >
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
          cardFlights={cardFlights}
        />

        <TableauSection
          state={state}
          cardMetrics={cardMetrics}
          dropHints={dropHints}
          onAutoMove={attemptAutoMove}
          onLongPress={handleManualSelectTableau}
          onColumnPress={handleColumnPress}
          invalidWiggle={invalidWiggle}
          cardFlights={cardFlights}
        />

        <SelectionHint state={state} onClear={clearSelection} />
        <XStack gap="$2" items="center">
          <Text style={styles.movesLabel}>Moves</Text>
          <Text style={styles.movesValue}>{state.moveCount}</Text>
        </XStack>
      </YStack>

      <ControlBar
        onDraw={handleDraw}
        drawLabel={drawLabel}
        onUndo={handleUndo}
        canUndo={state.history.length > 0}
        canDraw={Boolean(state.stock.length || state.waste.length)}
      />
    </YStack>
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
  cardFlights: CardFlightRegistry
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
  cardFlights,
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
            cardFlights={cardFlights}
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
              cardFlights={cardFlights}
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
  cardFlights: CardFlightRegistry
}

const TableauSection = ({
  state,
  cardMetrics,
  dropHints,
  onAutoMove,
  onLongPress,
  onColumnPress,
  invalidWiggle,
  cardFlights,
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
        cardFlights={cardFlights}
      />
    ))}
  </View>
)

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
  cardFlights: CardFlightRegistry
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
  cardFlights,
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
          cardFlights={cardFlights}
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
  cardFlights: CardFlightRegistry
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
  cardFlights,
}: CardViewProps) => {
  const [renderFaceUp, setRenderFaceUp] = useState(card.faceUp)
  const shouldFloat = typeof offsetTop === 'number' || typeof offsetLeft === 'number'
  const positionStyle = shouldFloat
    ? {
        position: 'absolute' as const,
        top: typeof offsetTop === 'number' ? offsetTop : 0,
        left: typeof offsetLeft === 'number' ? offsetLeft : 0,
      }
    : undefined
  const cardRef = useAnimatedRef<View>()
  const wiggle = useSharedValue(0)
  const flightX = useSharedValue(0)
  const flightY = useSharedValue(0)
  const flightZ = useSharedValue(0)
  const hasPreviousSnapshot = ENABLE_ANIMATIONS && !!cardFlights.value[card.id]
  const flightOpacity = useSharedValue(hasPreviousSnapshot ? 0 : 1)
  const flipScale = useSharedValue(1)
  const lastTriggerRef = useRef(invalidWiggle.key)
  const shouldAnimateInvalid = invalidWiggle.lookup.has(card.id)
  const baseZIndex = shouldFloat ? 2 : 0
  const motionStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: wiggle.value + flightX.value },
      { translateY: flightY.value },
    ],
    opacity: flightOpacity.value,
    zIndex: flightZ.value > 0 ? flightZ.value : baseZIndex,
  }))
  const flipStyle = useAnimatedStyle(() => {
    if (!ENABLE_ANIMATIONS || !ENABLE_CARD_FLIP_ANIMATION) {
      return {}
    }
    return {
      transform: [{ scaleX: flipScale.value }],
    }
  })
  const handleCardLayout = useCallback(() => {
    const cardId = card.id
    const previousSnapshot = cardFlights.value[cardId]
    if (ENABLE_ANIMATIONS && previousSnapshot) {
      flightOpacity.value = 0
    }
    runOnUI((prevSnapshot: CardFlightSnapshot | null) => {
      'worklet'
      const layout = measure(cardRef)
      if (!layout) {
        return
      }
      if (!ENABLE_ANIMATIONS) {
        cardFlights.value = {
          ...cardFlights.value,
          [cardId]: {
            pageX: layout.pageX,
            pageY: layout.pageY,
            width: layout.width,
            height: layout.height,
          },
        }
        flightX.value = 0
        flightY.value = 0
        flightZ.value = 0
        flightOpacity.value = 1
        return
      }
      const existingSnapshot = cardFlights.value[cardId] as CardFlightSnapshot | undefined
      const previous = prevSnapshot ?? existingSnapshot
      if (previous) {
        const deltaX = previous.pageX - layout.pageX
        const deltaY = previous.pageY - layout.pageY
        if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
          flightX.value = deltaX
          flightY.value = deltaY
          flightZ.value = 1000
          flightX.value = withTiming(0, CARD_FLIGHT_TIMING, (finished) => {
            if (finished) {
              flightZ.value = 0
            }
          })
          flightY.value = withTiming(0, CARD_FLIGHT_TIMING)
        }
      }
      cardFlights.value = {
        ...cardFlights.value,
        [cardId]: {
          pageX: layout.pageX,
          pageY: layout.pageY,
          width: layout.width,
          height: layout.height,
        },
      }
      flightOpacity.value = 1
    })(previousSnapshot ?? null)
  }, [cardFlights, card.id, cardRef, flightOpacity, flightX, flightY, flightZ])

  useEffect(() => {
    if (!ENABLE_ANIMATIONS) {
      return
    }
    if (!shouldAnimateInvalid) {
      return
    }
    if (lastTriggerRef.current === invalidWiggle.key) {
      return
    }
    lastTriggerRef.current = invalidWiggle.key
    cancelAnimation(wiggle)
    wiggle.value = 0
    wiggle.value = withSequence(
      withTiming(-WIGGLE_OFFSET_PX, WIGGLE_TIMING_CONFIG),
      withTiming(WIGGLE_OFFSET_PX, WIGGLE_TIMING_CONFIG),
      withTiming(0, WIGGLE_TIMING_CONFIG),
    )
  }, [invalidWiggle.key, shouldAnimateInvalid, wiggle])

  useEffect(() => {
    if (!ENABLE_ANIMATIONS || !ENABLE_CARD_FLIP_ANIMATION) {
      setRenderFaceUp(card.faceUp)
      flipScale.value = 1
      return
    }
    if (card.faceUp === renderFaceUp) {
      return
    }
    flipScale.value = withTiming(0, CARD_FLIP_HALF_TIMING, (finished) => {
      if (!finished) {
        return
      }
      runOnJS(setRenderFaceUp)(card.faceUp)
      flipScale.value = withTiming(1, CARD_FLIP_HALF_TIMING)
    })
  }, [card.faceUp, flipScale, renderFaceUp])

  const containerStaticStyle = {
    width: metrics.width,
    height: metrics.height,
  }

  const borderColor =
    renderFaceUp && isSelected ? COLOR_SELECTED_BORDER : COLOR_CARD_BORDER

  const frontContent = (
    <Pressable
      style={[
        styles.cardBase,
        styles.faceUp,
        {
          width: '100%',
          height: '100%',
          borderRadius: metrics.radius,
          borderColor,
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
  )

  const backContent = (
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
  )

  return (
    <AnimatedView
      ref={cardRef}
      onLayout={handleCardLayout}
      style={[positionStyle, motionStyle, containerStaticStyle]}
    >
      <Animated.View style={[styles.cardFlipWrapper, flipStyle]}>
        {renderFaceUp ? frontContent : backContent}
      </Animated.View>
    </AnimatedView>
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
  cardFlights: CardFlightRegistry
}

const WasteFan = ({
  cards,
  metrics,
  isSelected,
  onPress,
  onLongPress,
  invalidWiggle,
  cardFlights,
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
            cardFlights={cardFlights}
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
  cardFlights: CardFlightRegistry
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
  cardFlights,
}: WasteFanCardProps) => {
  const enterOffset = targetOffset + metrics.width * WASTE_ENTER_EXTRA_RATIO
  const translateX = useSharedValue((!ENABLE_ANIMATIONS || !ENABLE_STACK_ANIMATION) ? targetOffset : (isEntering ? enterOffset : targetOffset))
  const positionStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  useEffect(() => {
    cancelAnimation(translateX)
    if (!ENABLE_ANIMATIONS || !ENABLE_STACK_ANIMATION) {
      translateX.value = targetOffset
      return
    }
    translateX.value = withTiming(targetOffset, WASTE_TIMING_CONFIG)
  }, [targetOffset, translateX])

  return (
    <AnimatedView
      pointerEvents="box-none"
      style={[
        styles.wasteFanCardWrapper,
        {
          width: metrics.width,
          height: metrics.height,
          zIndex,
        },
        positionStyle,
      ]}
    >
      <CardView
        card={card}
        metrics={metrics}
        isSelected={isSelected}
        onPress={onPress}
        onLongPress={onLongPress}
        invalidWiggle={invalidWiggle}
        cardFlights={cardFlights}
      />
    </AnimatedView>
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
  cardFlights: CardFlightRegistry
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
  cardFlights,
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
        <CardView
          card={topCard}
          metrics={cardMetrics}
          invalidWiggle={invalidWiggle}
          cardFlights={cardFlights}
        />
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
  cardFlipWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
