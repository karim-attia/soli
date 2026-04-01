import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import type { ViewStyle } from 'react-native'
import Animated, {
  cancelAnimation,
  createAnimatedComponent,
  measure,
  runOnJS,
  runOnUI,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import {
  areCardFlightSnapshotsEquivalent,
  isValidCardFlightSnapshot,
  type CardFlightSnapshot,
} from '../../../../animation/flightController'
import {
  CELEBRATION_WOBBLE_FREQUENCY,
  TAU,
  computeCelebrationFrame,
} from '../../../../animation/celebrationModes'
import type { Card } from '../../../../solitaire/klondike'
import { useAnimationToggles } from '../../../../state/settings'
import {
  CARD_FLIGHT_TIMING,
  CARD_FLIP_HALF_TIMING,
  FOUNDATION_GLOW_IN_TIMING,
  FOUNDATION_GLOW_MAX_OPACITY,
  FOUNDATION_GLOW_OUT_TIMING,
  FOUNDATION_GLOW_OUTSET,
  WASTE_TIMING_CONFIG,
  WIGGLE_OFFSET_PX,
  WIGGLE_TIMING_CONFIG,
} from '../../constants'
import type {
  CardFlightRegistry,
  CardMetrics,
  CelebrationBindings,
  InvalidWiggleConfig,
} from '../../types'
export const AnimatedView = createAnimatedComponent(View)

export type UseCardAnimationsParams = {
  card: Card
  metrics: CardMetrics
  offsetTop?: number
  offsetLeft?: number
  isSelected?: boolean
  suppressFlightOnFaceUpChange?: boolean
  layoutTrackingEnabled?: boolean
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  cardFlightMemory?: Record<string, CardFlightSnapshot>
  onCardMeasured?: (cardId: string, snapshot: CardFlightSnapshot) => void
  onFlightSettled?: (cardId: string) => void
  celebrationBindings?: CelebrationBindings
}

const MAX_MEASURE_RETRY_FRAMES = 3

export const useCardAnimations = ({
  card,
  metrics,
  offsetTop,
  offsetLeft,
  isSelected: _isSelected,
  suppressFlightOnFaceUpChange = false,
  layoutTrackingEnabled = true,
  invalidWiggle,
  cardFlights,
  cardFlightMemory,
  onCardMeasured,
  onFlightSettled,
  celebrationBindings,
}: UseCardAnimationsParams) => {
  const {
    cardFlights: cardFlightsEnabled,
    invalidMoveWiggle: invalidMoveEnabled,
    cardFlip: cardFlipEnabled,
  } = useAnimationToggles()

  const [renderFaceUp, setRenderFaceUp] = useState(card.faceUp)
  const cardRef = useAnimatedRef<Animated.View>()
  const wiggle = useSharedValue(0)
  const flightX = useSharedValue(0)
  const flightY = useSharedValue(0)
  const flightZ = useSharedValue(0)
  const previousSnapshot = cardFlightMemory?.[card.id]
  const flightOpacity = useSharedValue(
    cardFlightsEnabled && layoutTrackingEnabled && previousSnapshot ? 0 : 1
  )
  const flipScale = useSharedValue(1)
  const lastTriggerRef = useRef(invalidWiggle.key)
  const previousFaceUpRef = useRef(card.faceUp)
  const shouldFloat = typeof offsetTop === 'number' || typeof offsetLeft === 'number'
  const baseZIndex = shouldFloat ? 2 : 0
  const faceUpChanged = previousFaceUpRef.current !== card.faceUp
  const notifyFlightSettled = useCallback(
    (settledCardId: string) => {
      onFlightSettled?.(settledCardId)
    },
    [onFlightSettled]
  )

  const positionStyle = useMemo<ViewStyle | undefined>(
    () =>
      shouldFloat
        ? {
            position: 'absolute',
            top: typeof offsetTop === 'number' ? offsetTop : 0,
            left: typeof offsetLeft === 'number' ? offsetLeft : 0,
          }
        : undefined,
    [offsetLeft, offsetTop, shouldFloat]
  )

  const motionStyle = useAnimatedStyle<ViewStyle>(() => {
    let translateX = wiggle.value + flightX.value
    let translateY = flightY.value
    let rotationDeg = 0
    let scale = 1
    let opacity = flightOpacity.value
    let zIndex = flightZ.value > 0 ? flightZ.value : baseZIndex

    const celebrationActiveValue = celebrationBindings?.active.value ?? 0
    if (celebrationActiveValue > 0 && celebrationBindings) {
      const assignment = celebrationBindings.assignments.value?.[card.id]
      if (assignment) {
        const frame = computeCelebrationFrame({
          modeId: celebrationBindings.mode.value,
          assignment,
          metrics,
          board: celebrationBindings.board.value,
          totalCards: celebrationBindings.total.value,
          progress: celebrationBindings.progress.value,
        })

        if (frame) {
          const {
            pathX,
            pathY,
            rotation,
            targetScale,
            targetOpacity,
            launchEased,
            rawProgress,
            relativeIndex,
            stackFactor,
          } = frame

          const seed = assignment.randomSeed
          const wobblePhase =
            rawProgress * TAU * CELEBRATION_WOBBLE_FREQUENCY + seed * TAU
          const wobbleEnvelope = 0.15 + 0.85 * Math.pow(Math.sin(wobblePhase), 2)
          const wobbleX =
            Math.sin(wobblePhase * 1.25 + relativeIndex * 0.4) *
            metrics.width *
            0.1 *
            wobbleEnvelope
          const wobbleY =
            Math.cos(wobblePhase * 0.95 + stackFactor * 4) *
            metrics.height *
            0.11 *
            wobbleEnvelope

          const finalX =
            assignment.baseX * (1 - launchEased) + pathX * launchEased + wobbleX
          const finalY =
            assignment.baseY * (1 - launchEased) + pathY * launchEased + wobbleY
          const finalScale = 1 + (targetScale - 1) * launchEased
          const finalRotation = rotation * launchEased
          const clampedOpacity = targetOpacity < 0 ? 0 : targetOpacity
          const finalOpacity = Math.min(1, clampedOpacity * (0.5 + 0.5 * launchEased))

          translateX = wiggle.value + flightX.value + (finalX - assignment.baseX)
          translateY = flightY.value + (finalY - assignment.baseY)
          scale = finalScale
          rotationDeg = finalRotation
          opacity = Math.min(opacity, finalOpacity)
          zIndex = Math.max(zIndex, 4000 + assignment.index)
        }
      }
    }

    const transforms: Array<
      | { translateX: number }
      | { translateY: number }
      | { rotate: string }
      | { scale: number }
    > = [{ translateX }, { translateY }]

    if (scale !== 1) {
      transforms.push({ scale })
    }
    if (rotationDeg !== 0) {
      transforms.push({ rotate: `${rotationDeg}deg` })
    }

    return {
      transform: transforms,
      opacity,
      zIndex,
    }
  })

  const flipStyle = useAnimatedStyle(() => {
    if (!cardFlipEnabled) {
      return {}
    }
    return {
      transform: [{ scaleX: flipScale.value }],
    }
  })

  useEffect(() => {
    if (!invalidMoveEnabled) {
      cancelAnimation(wiggle)
      wiggle.value = 0
      return
    }

    const shouldAnimate = invalidWiggle.lookup.has(card.id)
    if (!shouldAnimate) {
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
      withTiming(0, WIGGLE_TIMING_CONFIG)
    )
  }, [card.id, invalidMoveEnabled, invalidWiggle.key, invalidWiggle.lookup, wiggle])

  useEffect(() => {
    return () => {
      cancelAnimation(wiggle)
      cancelAnimation(flightX)
      cancelAnimation(flightY)
      cancelAnimation(flightZ)
      cancelAnimation(flightOpacity)
      cancelAnimation(flipScale)
    }
  }, [flightOpacity, flightX, flightY, flightZ, flipScale, wiggle])

  useEffect(() => {
    if (layoutTrackingEnabled) {
      return
    }

    // If a card mounts while layout tracking is intentionally disabled
    // (for example during scrubber stabilization), do not leave it hidden just
    // because an older flight snapshot exists.
    cancelAnimation(flightX)
    cancelAnimation(flightY)
    cancelAnimation(flightZ)
    cancelAnimation(flightOpacity)
    flightX.value = 0
    flightY.value = 0
    flightZ.value = 0
    flightOpacity.value = 1
  }, [flightOpacity, flightX, flightY, flightZ, layoutTrackingEnabled])

  useEffect(() => {
    if (!cardFlipEnabled) {
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
  }, [card.faceUp, cardFlipEnabled, flipScale, renderFaceUp])

  useEffect(() => {
    previousFaceUpRef.current = card.faceUp
  }, [card.faceUp])

  const handleCardLayout = useCallback(() => {
    const cardId = card.id
    const snapshotBeforeLayout =
      suppressFlightOnFaceUpChange && faceUpChanged
        ? undefined
        : cardFlightMemory?.[cardId]
    if (cardFlightsEnabled && snapshotBeforeLayout) {
      flightOpacity.value = 0
    }

    runOnUI((prevSnapshot: CardFlightSnapshot | null) => {
      'worklet'
      const snapshotTolerance = 0.5
      const isFiniteNumber = (value: unknown): value is number =>
        typeof value === 'number' && isFinite(value)

      // Keep the shared registry quiet when layout metrics have not materially
      // changed; this avoids extra worklet churn and redundant JS callbacks.
      const upsertSharedSnapshot = (snapshot: CardFlightSnapshot): boolean => {
        const previous = cardFlights.value[cardId] as CardFlightSnapshot | undefined
        if (areCardFlightSnapshotsEquivalent(previous, snapshot)) {
          return false
        }
        cardFlights.modify((currentFlights) => {
          'worklet'
          const currentRegistry = currentFlights as Record<string, CardFlightSnapshot>
          currentRegistry[cardId] = snapshot
          return currentRegistry as typeof currentFlights
        })
        return true
      }

      type MeasuredLayout = NonNullable<ReturnType<typeof measure>>

      const isValidLayout = (
        layout: ReturnType<typeof measure>
      ): layout is MeasuredLayout => {
        return (
          !!layout &&
          isFiniteNumber(layout.pageX) &&
          isFiniteNumber(layout.pageY) &&
          isFiniteNumber(layout.width) &&
          isFiniteNumber(layout.height) &&
          layout.width > 0 &&
          layout.height > 0
        )
      }

      // PBI-14-4: `measure()` can temporarily return undefined/meaningless LayoutMetrics; retry briefly.
      let attempts = 0
      const attemptMeasure = () => {
        const layout = measure(cardRef)
        if (!isValidLayout(layout)) {
          attempts += 1
          if (attempts <= MAX_MEASURE_RETRY_FRAMES) {
            requestAnimationFrame(attemptMeasure)
            return
          }
          // After retries, fall back to rendering the card in-place (no flight) to avoid invisible cards.
          flightX.value = 0
          flightY.value = 0
          flightZ.value = 0
          flightOpacity.value = 1
          return
        }

        if (!cardFlightsEnabled) {
          const snapshot: CardFlightSnapshot = {
            pageX: layout.pageX,
            pageY: layout.pageY,
            width: layout.width,
            height: layout.height,
          }
          const snapshotChanged = !areCardFlightSnapshotsEquivalent(
            prevSnapshot,
            snapshot
          )
          flightX.value = 0
          flightY.value = 0
          flightZ.value = 0
          flightOpacity.value = 1
          if (snapshotChanged && onCardMeasured) {
            runOnJS(onCardMeasured)(cardId, snapshot)
          }
          if (onFlightSettled) {
            runOnJS(notifyFlightSettled)(cardId)
          }
          return
        }

        const existingSnapshot = cardFlights.value[cardId] as
          | CardFlightSnapshot
          | undefined
        const previousCandidate = prevSnapshot ?? existingSnapshot
        const previous = isValidCardFlightSnapshot(previousCandidate)
          ? previousCandidate
          : null
        if (previous) {
          const deltaX = previous.pageX - layout.pageX
          const deltaY = previous.pageY - layout.pageY
          const hasXMovement = Math.abs(deltaX) > snapshotTolerance
          const hasYMovement = Math.abs(deltaY) > snapshotTolerance
          if (hasXMovement || hasYMovement) {
            flightX.value = deltaX
            flightY.value = deltaY
            flightZ.value = 1000

            const handleFlightComplete = (finished?: boolean) => {
              if (!finished) {
                return
              }
              flightZ.value = 0
              if (onFlightSettled) {
                runOnJS(notifyFlightSettled)(cardId)
              }
            }

            if (hasXMovement) {
              flightX.value = withTiming(0, CARD_FLIGHT_TIMING, handleFlightComplete)
            } else {
              flightX.value = 0
            }

            if (hasYMovement) {
              flightY.value = withTiming(
                0,
                CARD_FLIGHT_TIMING,
                hasXMovement ? undefined : handleFlightComplete
              )
            } else {
              flightY.value = 0
            }
          }
        }

        const nextSnapshot: CardFlightSnapshot = {
          pageX: layout.pageX,
          pageY: layout.pageY,
          width: layout.width,
          height: layout.height,
        }
        const snapshotChanged = upsertSharedSnapshot(nextSnapshot)
        flightOpacity.value = 1
        if (snapshotChanged && onCardMeasured) {
          runOnJS(onCardMeasured)(cardId, nextSnapshot)
        }
        if (!previous || areCardFlightSnapshotsEquivalent(previous, nextSnapshot)) {
          if (onFlightSettled) {
            runOnJS(notifyFlightSettled)(cardId)
          }
        }
      }

      // Let newly mounted cards land in their destination layout before we
      // compare against the previous snapshot. Draw/undo flights are especially
      // sensitive to measuring one frame too early because the card often mounts
      // inside a new waste/foundation wrapper on the same commit.
      requestAnimationFrame(attemptMeasure)
    })(snapshotBeforeLayout ?? null)
  }, [
    card.id,
    cardFlightMemory,
    cardFlights,
    cardFlightsEnabled,
    cardRef,
    faceUpChanged,
    flightOpacity,
    flightX,
    flightY,
    flightZ,
    onCardMeasured,
    onFlightSettled,
    notifyFlightSettled,
    suppressFlightOnFaceUpChange,
  ])

  const containerStyle = useMemo(
    () => ({ width: metrics.width, height: metrics.height }),
    [metrics.height, metrics.width]
  )

  return {
    cardRef,
    renderFaceUp,
    motionStyle,
    flipStyle,
    positionStyle,
    containerStyle,
    handleCardLayout,
  }
}

export const useWasteFanCardAnimation = (targetOffset: number) => {
  const { wasteFan: wasteFanEnabled } = useAnimationToggles()
  const translateX = useSharedValue(targetOffset)

  const positionStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  useEffect(() => {
    cancelAnimation(translateX)
    if (!wasteFanEnabled) {
      translateX.value = targetOffset
      return
    }
    translateX.value = withTiming(targetOffset, WASTE_TIMING_CONFIG)
  }, [targetOffset, translateX, wasteFanEnabled])

  useEffect(() => {
    return () => {
      cancelAnimation(translateX)
    }
  }, [translateX])

  return { positionStyle }
}

export type UseFoundationGlowAnimationParams = {
  cards: Card[]
  cardMetrics: CardMetrics
  celebrationActive: boolean
  onCardArrived?: (cardId: string | null | undefined) => void
}

export const useFoundationGlowAnimation = ({
  cards,
  cardMetrics,
  celebrationActive,
  onCardArrived,
}: UseFoundationGlowAnimationParams) => {
  const { foundationGlow: foundationGlowEnabled } = useAnimationToggles()
  const glowOpacity = useSharedValue(0)
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }))

  const lastGlowCardRef = useRef<string | null>(null)
  const previousCountRef = useRef(cards.length)
  const glowWidth = cardMetrics.width + FOUNDATION_GLOW_OUTSET * 2
  const glowHeight = cardMetrics.height + FOUNDATION_GLOW_OUTSET * 2

  useEffect(() => {
    const previousCount = previousCountRef.current
    previousCountRef.current = cards.length
    const removedCard = cards.length < previousCount
    const previousId = lastGlowCardRef.current
    const topCard = cards[cards.length - 1] ?? null
    const currentId = topCard?.id ?? null

    if (!foundationGlowEnabled) {
      glowOpacity.value = 0
      if (!removedCard && currentId && currentId !== previousId) {
        onCardArrived?.(currentId)
      }
      lastGlowCardRef.current = currentId
      return
    }

    if (celebrationActive) {
      // Once celebration takes over, the foundation glow no longer adds useful
      // feedback and just keeps extra animation work alive on the UI thread.
      lastGlowCardRef.current = currentId
      glowOpacity.value = 0
      return
    }

    if (!currentId) {
      lastGlowCardRef.current = null
      glowOpacity.value = 0
      return
    }

    if (removedCard) {
      lastGlowCardRef.current = currentId
      glowOpacity.value = 0
      return
    }

    if (lastGlowCardRef.current === currentId) {
      return
    }

    lastGlowCardRef.current = currentId
    onCardArrived?.(currentId)
    cancelAnimation(glowOpacity)
    glowOpacity.value = 0
    glowOpacity.value = withSequence(
      withTiming(FOUNDATION_GLOW_MAX_OPACITY, FOUNDATION_GLOW_IN_TIMING),
      withTiming(0, FOUNDATION_GLOW_OUT_TIMING)
    )
  }, [cards, celebrationActive, foundationGlowEnabled, glowOpacity, onCardArrived])

  useEffect(() => {
    return () => {
      cancelAnimation(glowOpacity)
    }
  }, [glowOpacity])

  return {
    glowStyle,
    glowDimensions: {
      width: glowWidth,
      height: glowHeight,
      borderRadius: cardMetrics.radius + FOUNDATION_GLOW_OUTSET,
      offset: FOUNDATION_GLOW_OUTSET,
    },
  }
}
