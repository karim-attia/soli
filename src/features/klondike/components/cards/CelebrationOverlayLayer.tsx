import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'

import {
  CELEBRATION_DURATION_MS,
  CELEBRATION_WOBBLE_FREQUENCY,
  TAU,
  computeCelebrationFrame,
  getCelebrationModeMetadata,
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

  // Trail ghosts mount ONLY while a trail-enabled mode is active: 52 × count extra views
  // is a real perf cost, so we don't pay it for regular modes or while idle. Deriving from
  // celebrationState is enough — it changes on every celebration start AND on every dev
  // badge mode cycle (cycling restarts the run with a new state), so mounting always
  // tracks the active mode.
  const trail = celebrationState
    ? getCelebrationModeMetadata(celebrationState.modeId).trail
    : undefined

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {assignments.map((assignment, slot) => {
        // zIndex bands: each card owns a contiguous block of (count + 1) z values so its
        // ghosts stack strictly beneath its main view without interleaving into other
        // cards' ghost/main ordering. Without trails, keep the plain 6000 + slot layout.
        const band = trail ? 6000 + slot * (trail.count + 1) : 6000 + slot
        return (
          <React.Fragment key={slot}>
            {trail
              ? Array.from({ length: trail.count }, (_, k) => (
                  <CelebrationOverlaySlot
                    key={`ghost-${k}`}
                    assignment={assignment}
                    bindings={celebrationBindings}
                    metrics={cardMetrics}
                    // Ghost k rides the exact same path, lagged by (k+1) * gap. Pure
                    // function of progress → no position history needed.
                    lagProgress={((k + 1) * trail.gapMs) / CELEBRATION_DURATION_MS}
                    opacityMultiplier={0.45 * (1 - k / (trail.count + 1))}
                    zIndex={band + (trail.count - 1 - k)}
                  />
                ))
              : null}
            <CelebrationOverlaySlot
              assignment={assignment}
              bindings={celebrationBindings}
              metrics={cardMetrics}
              zIndex={trail ? band + trail.count : band}
            />
          </React.Fragment>
        )
      })}
    </View>
  )
}

type CelebrationOverlaySlotProps = {
  assignment: CelebrationOverlayAssignment | null
  bindings: CelebrationBindings
  metrics: CardMetrics
  zIndex: number
  // Trail-ghost parametrization: same slot component, evaluated at a lagged progress
  // with faded opacity — avoids duplicating the frame/wobble worklet logic.
  lagProgress?: number
  opacityMultiplier?: number
}

const CelebrationOverlaySlot = React.memo(
  ({
    assignment,
    bindings,
    metrics,
    zIndex,
    lagProgress = 0,
    opacityMultiplier = 1,
  }: CelebrationOverlaySlotProps) => {
    // Unlike finite card/glow timings, celebration paths are recalculated from shared
    // progress every frame; keeping this worklet prevents JS from driving 52 slots.
    const animatedStyle = useAnimatedStyle(() => {
      const inactiveStyle = {
        opacity: 0,
        transform: [{ translateX: 0 }, { translateY: 0 }],
      }

      if (!assignment || bindings.active.value <= 0) {
        return inactiveStyle
      }

      // Clamped at 0: early on, a ghost simply coincides with the card at its base —
      // an invisible overlap, not a glitch.
      const laggedProgress = Math.max(0, bindings.progress.value - lagProgress)

      const frame = computeCelebrationFrame({
        modeId: bindings.mode.value,
        assignment: assignment.assignment,
        metrics,
        board: bindings.board.value,
        totalCards: bindings.total.value,
        progress: laggedProgress,
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
      const { baseX, baseY, randomSeed } = assignment.assignment
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
      // End fade: without it, all cards vanish in a single frame when the 60s run
      // completes and celebrationState is cleared. Driven by the unlagged shared
      // progress so a card and its trail ghosts fade together over the last ~2s.
      const endFade = Math.min(1, Math.max(0, (1 - bindings.progress.value) / 0.033))
      const opacity =
        Math.min(1, clampedOpacity * (0.5 + 0.5 * launchEased)) *
        opacityMultiplier *
        endFade

      return {
        opacity,
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
        // zIndex is constant per slot, so it lives in the static style instead of being
        // re-emitted by the worklet every frame.
        style={[
          styles.slot,
          { width: metrics.width, height: metrics.height, zIndex },
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
