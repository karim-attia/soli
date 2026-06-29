import { useEffect, useRef } from 'react'
import { Animated as NativeAnimated } from 'react-native'

import type { Card } from '../../../../solitaire/klondike'
import { useAnimationToggles } from '../../../../state/settings'
import {
  FOUNDATION_GLOW_IN_TIMING,
  FOUNDATION_GLOW_MAX_OPACITY,
  FOUNDATION_GLOW_OUT_TIMING,
  FOUNDATION_GLOW_OUTSET,
} from '../../constants'
import type { CardMetrics } from '../../types'

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
  const glowOpacity = useRef(new NativeAnimated.Value(0)).current

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
      glowOpacity.stopAnimation()
      glowOpacity.setValue(0)
      if (!removedCard && currentId && currentId !== previousId) {
        onCardArrived?.(currentId)
      }
      lastGlowCardRef.current = currentId
      return
    }

    if (celebrationActive) {
      // Absolute celebration cards take over the visual stack; keep the structural
      // foundation glow quiet so it does not animate underneath the win overlay.
      lastGlowCardRef.current = currentId
      glowOpacity.stopAnimation()
      glowOpacity.setValue(0)
      return
    }

    if (!currentId) {
      lastGlowCardRef.current = null
      glowOpacity.stopAnimation()
      glowOpacity.setValue(0)
      return
    }

    if (removedCard) {
      lastGlowCardRef.current = currentId
      glowOpacity.stopAnimation()
      glowOpacity.setValue(0)
      return
    }

    if (lastGlowCardRef.current === currentId) {
      return
    }

    lastGlowCardRef.current = currentId
    onCardArrived?.(currentId)
    glowOpacity.stopAnimation()
    glowOpacity.setValue(0)
    // A foundation arrival is a finite opacity pulse. The native driver keeps its
    // frames off the JS thread without retaining a Reanimated worklet per pile.
    NativeAnimated.sequence([
      NativeAnimated.timing(glowOpacity, {
        toValue: FOUNDATION_GLOW_MAX_OPACITY,
        ...FOUNDATION_GLOW_IN_TIMING,
        useNativeDriver: true,
      }),
      NativeAnimated.timing(glowOpacity, {
        toValue: 0,
        ...FOUNDATION_GLOW_OUT_TIMING,
        useNativeDriver: true,
      }),
    ]).start()
  }, [cards, celebrationActive, foundationGlowEnabled, glowOpacity, onCardArrived])

  useEffect(() => {
    return () => {
      glowOpacity.stopAnimation()
    }
  }, [glowOpacity])

  return {
    glowStyle: { opacity: glowOpacity },
    glowDimensions: {
      width: glowWidth,
      height: glowHeight,
      borderRadius: cardMetrics.radius + FOUNDATION_GLOW_OUTSET,
      offset: FOUNDATION_GLOW_OUTSET,
    },
  }
}
