import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'

import {
  CELEBRATION_WOBBLE_FREQUENCY,
  TAU,
  computeCelebrationFrame,
  type CelebrationAssignment,
} from '../../../../animation/celebrationModes'
import type { Card } from '../../../../solitaire/klondike'
import type { CelebrationState } from '../../hooks/useCelebrationController'
import type { CardMetrics, CelebrationBindings } from '../../types'
import { CardVisual } from './CardVisual'

export const CELEBRATION_OVERLAY_SLOT_COUNT = 52

type CelebrationOverlayAssignment = {
  card: Card
  assignment: CelebrationAssignment
}

type CelebrationOverlayLayerProps = {
  celebrationState: CelebrationState | null
  celebrationBindings: CelebrationBindings
  cardMetrics: CardMetrics
}

export const CelebrationOverlayLayer = ({
  celebrationState,
  celebrationBindings,
  cardMetrics,
}: CelebrationOverlayLayerProps) => {
  const assignments = useMemo(() => {
    const slots: Array<CelebrationOverlayAssignment | null> = Array.from(
      { length: CELEBRATION_OVERLAY_SLOT_COUNT },
      () => null
    )

    celebrationState?.cards
      .slice(0, CELEBRATION_OVERLAY_SLOT_COUNT)
      .forEach((config, index) => {
        slots[index] = {
          card: config.card,
          assignment: {
            baseX: config.baseX,
            baseY: config.baseY,
            stackIndex: config.stackIndex,
            suitIndex: config.suitIndex,
            randomSeed: config.randomSeed,
            index,
          },
        }
      })

    return slots
  }, [celebrationState])

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {assignments.map((assignment, slot) => (
        <CelebrationOverlaySlot
          key={slot}
          assignment={assignment}
          bindings={celebrationBindings}
          metrics={cardMetrics}
        />
      ))}
    </View>
  )
}

type CelebrationOverlaySlotProps = {
  assignment: CelebrationOverlayAssignment | null
  bindings: CelebrationBindings
  metrics: CardMetrics
}

const CelebrationOverlaySlot = React.memo(
  ({ assignment, bindings, metrics }: CelebrationOverlaySlotProps) => {
    const animatedStyle = useAnimatedStyle(() => {
      const inactiveStyle = {
        opacity: 0,
        transform: [{ translateX: 0 }, { translateY: 0 }],
      }

      if (!assignment || bindings.active.value <= 0) {
        return inactiveStyle
      }

      const frame = computeCelebrationFrame({
        modeId: bindings.mode.value,
        assignment: assignment.assignment,
        metrics,
        board: bindings.board.value,
        totalCards: bindings.total.value,
        progress: bindings.progress.value,
      })

      if (!frame) {
        return inactiveStyle
      }

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
      const { baseX, baseY, randomSeed, index } = assignment.assignment
      const wobblePhase =
        rawProgress * TAU * CELEBRATION_WOBBLE_FREQUENCY + randomSeed * TAU
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
      const translateX = baseX * (1 - launchEased) + pathX * launchEased + wobbleX
      const translateY = baseY * (1 - launchEased) + pathY * launchEased + wobbleY
      const scale = 1 + (targetScale - 1) * launchEased
      const clampedOpacity = targetOpacity < 0 ? 0 : targetOpacity
      const opacity = Math.min(1, clampedOpacity * (0.5 + 0.5 * launchEased))

      return {
        opacity,
        zIndex: 6000 + index,
        transform: [
          { translateX },
          { translateY },
          { scale },
          { rotate: `${rotation * launchEased}deg` },
        ],
      }
    })

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.slot,
          { width: metrics.width, height: metrics.height },
          animatedStyle,
        ]}
      >
        {assignment ? <CardVisual card={assignment.card} metrics={metrics} /> : null}
      </Animated.View>
    )
  }
)

CelebrationOverlaySlot.displayName = 'CelebrationOverlaySlot'

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
})
