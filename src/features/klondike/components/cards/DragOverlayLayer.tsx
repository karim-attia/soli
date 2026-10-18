import React from 'react'
import { StyleSheet, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'

import type { Card } from '../../../../solitaire/klondike'
import { DRAG_CARD_SHADOW, DRAG_LIFT_SCALE } from '../../constants'
import type { CardMetrics } from '../../types'
import { CardVisual } from './CardVisual'

// Lifted cards during a drag (card-drag-and-drop plan). Mirrors HintOverlayLayer:
// own z-band, pointerEvents="none" throughout, mounted by KlondikeGameView only
// while a drag session exists (null during normal play), so it can never disturb
// the card layer's memo boundaries or add a11y focus nodes.
//
// This is the ONLY Reanimated surface in the card system. AbsoluteLayerCard stays
// on legacy Animated with the native driver on purpose: Reanimated shared values
// cannot drive Animated.Values, so converting it would mean moving flights, flip,
// wiggle and the whole isSettling/onCardSettled/pressDisabled machinery at once —
// see docs/product/game-history-performance/absolute-card-layer-animation-architecture.md.
// A drag is the one place where "each frame depends on gesture input" applies, and
// this component only exists while a finger is down.

// Same orderIndex mechanism as HINT_OVERLAY_Z_INDEX (see HintOverlayLayer.tsx for
// why sibling JSX order is NOT enough). Above the card flight band's ceiling
// (10000 + max item zIndex ≈ 11700) so a lifted run paints over cards that are
// mid-flight; below HINT_OVERLAY_Z_INDEX (20000) so hint language stays
// authoritative when a hint is on screen during a drag.
const DRAG_OVERLAY_Z_INDEX = 15000

const overlayStyle: StyleProp<ViewStyle> = [
  StyleSheet.absoluteFill,
  { zIndex: DRAG_OVERLAY_Z_INDEX },
]

export type DragOverlayLayerProps = {
  cards: Card[]
  // Y offset of each lifted card inside the run, relative to the run's top-left.
  offsets: number[]
  // Board-space top-left of the run's base (grabbed) card when the drag started.
  origin: { x: number; y: number }
  cardMetrics: CardMetrics
  // Owned by useCardDrag so they outlive this component's mount/unmount.
  dragX: SharedValue<number>
  dragY: SharedValue<number>
  lift: SharedValue<number>
}

export const DragOverlayLayer = React.memo(
  ({ cards, offsets, origin, cardMetrics, dragX, dragY, lift }: DragOverlayLayerProps) => {
    // ONE animated wrapper for the whole run (not one per card), so the lift scale
    // applies about the run's top-left and the run keeps its internal spacing.
    const runStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: origin.x + dragX.value },
        { translateY: origin.y + dragY.value },
        { scale: 1 + lift.value * (DRAG_LIFT_SCALE - 1) },
      ],
    }))

    if (!cards.length) {
      return null
    }

    const runHeight = offsets[offsets.length - 1] + cardMetrics.height

    return (
      <View pointerEvents="none" style={overlayStyle}>
        <Animated.View
          testID="drag-overlay-run"
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              transformOrigin: 'top left',
              width: cardMetrics.width,
              height: runHeight,
            },
            runStyle,
          ]}
        >
          {cards.map((card, index) => (
            <View
              key={card.id}
              style={{
                position: 'absolute',
                top: offsets[index],
                left: 0,
                width: cardMetrics.width,
                height: cardMetrics.height,
                borderRadius: cardMetrics.radius,
                // boxShadow is native on RN 0.76+/New Arch (same as the hint rings).
                boxShadow: DRAG_CARD_SHADOW,
              }}
            >
              <CardVisual card={card} metrics={cardMetrics} />
            </View>
          ))}
        </Animated.View>
      </View>
    )
  }
)

DragOverlayLayer.displayName = 'DragOverlayLayer'
