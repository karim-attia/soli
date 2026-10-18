import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Animated as NativeAnimated, Pressable, StyleSheet, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

import {
  type Card,
  type Foundations,
  type Suit,
  type Tableau,
} from '../../../../solitaire/klondike'
import { useAnimationToggles } from '../../../../state/settings'
import {
  CARD_ANIMATION_DURATION_MS,
  CARD_FLIP_HALF_DURATION_MS,
  WIGGLE_OFFSET_PX,
  WIGGLE_SEGMENT_DURATION_MS,
} from '../../constants'
import type { AbsoluteCardLayerLayouts } from './utils'
import type { CardMetrics, InvalidWiggleConfig } from '../../types'
import { WASTE_TEST_ID } from './accessibility'
import {
  areAbsoluteLayerCardPropsEqual,
  buildCardLayerItems,
  resolveWasteTapTarget,
  type AbsoluteLayerCardProps,
  type WasteTapTarget,
} from './cardLayerItems'
import type { CardTransformRegistry } from './dragGeometry'
import { CardBack, CardVisual } from './CardVisual'
import { styles as cardStyles } from './styles'

// Absolute-layer cards no longer sit inside pile-local animated wrappers, so use
// a slightly stronger invalid feedback offset to keep the motion readable on device.
const ABSOLUTE_LAYER_WIGGLE_OFFSET_PX = Math.max(8, WIGGLE_OFFSET_PX * 1.6)

// Layouts type + creator + slot-position resolvers live in ./utils, the card item
// model + memo comparator in ./cardLayerItems (both pure geometry/data, importable
// by jest without this component's tamagui-heavy CardVisual chain); re-exported
// here so existing consumers keep one canonical import site.
export {
  createEmptyAbsoluteCardLayerLayouts,
  type AbsoluteCardLayerLayouts,
} from './utils'
export { type CardLayerItem } from './cardLayerItems'

export type AbsoluteCardLayerProps = {
  // Perf (A2): pile slices instead of the full GameState so React.memo on this layer
  // can skip re-renders when the piles kept referential identity (e.g. TIMER_TICK).
  stock: Card[]
  waste: Card[]
  foundations: Foundations
  tableau: Tableau
  cardMetrics: CardMetrics
  layouts: AbsoluteCardLayerLayouts
  drawLabel: string
  invalidWiggle: InvalidWiggleConfig
  animationResetKey: number
  interactionsLocked: boolean
  celebrationActive: boolean
  // Card drag (card-drag-and-drop plan). All three are identity-stable while no
  // drag is running (null / memoized gesture), so this layer's React.memo is
  // unaffected during normal play.
  hiddenCardIds: ReadonlySet<string> | null
  cardTransforms?: CardTransformRegistry | null
  onDraw: () => void
  onWasteTap: () => void
  onFoundationPress: (suit: Suit) => void
  onTableauCardPress: (columnIndex: number, cardIndex: number) => void
  onCardSettled?: (cardId: string) => void
}

// Perf (A2): memoized so per-second TIMER_TICK renders (piles keep referential
// identity through the reducer) skip the whole layer, including the items rebuild.
export const AbsoluteCardLayer = React.memo(
  ({
    stock,
    waste,
    foundations,
    tableau,
    cardMetrics,
    layouts,
    drawLabel,
    invalidWiggle,
    animationResetKey,
    interactionsLocked,
    celebrationActive,
    hiddenCardIds,
    cardTransforms,
    onDraw,
    onWasteTap,
    onFoundationPress,
    onTableauCardPress,
    onCardSettled,
  }: AbsoluteCardLayerProps) => {
    const { cardFlights: cardFlightsEnabled, cardFlip: cardFlipEnabled } =
      useAnimationToggles()
    const wasteTapTarget = useMemo(
      () =>
        resolveWasteTapTarget({
          waste,
          cardMetrics,
          layouts,
          interactionsLocked,
          celebrationActive,
        }),
      [cardMetrics, celebrationActive, interactionsLocked, layouts, waste]
    )
    const items = useMemo(
      () =>
        buildCardLayerItems({
          stock,
          waste,
          foundations,
          tableau,
          cardMetrics,
          layouts,
          drawLabel,
          interactionsLocked,
          celebrationActive,
          hiddenCardIds,
        }),
      [
        cardMetrics,
        celebrationActive,
        drawLabel,
        foundations,
        hiddenCardIds,
        interactionsLocked,
        layouts,
        stock,
        tableau,
        waste,
      ]
    )

    const plane = (
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {items.map((item) => (
          <AbsoluteLayerCard
            key={item.card.id}
            item={item}
            metrics={cardMetrics}
            invalidWiggle={invalidWiggle}
            animationResetKey={animationResetKey}
            movementEnabled={cardFlightsEnabled}
            flipEnabled={cardFlipEnabled}
            cardTransforms={cardTransforms}
            onDraw={onDraw}
            onFoundationPress={onFoundationPress}
            onTableauCardPress={onTableauCardPress}
            onCardSettled={onCardSettled}
          />
        ))}
        {wasteTapTarget ? (
          <WasteTapZone
            target={wasteTapTarget}
            metrics={cardMetrics}
            onPress={onWasteTap}
          />
        ) : null}
      </View>
    )

    // The drag pan is deliberately NOT attached here, even though this plane's
    // origin IS the card coordinate space. This root is pointerEvents="box-none",
    // and on Android RNGH's orchestrator only collects handlers on a BOX_NONE view
    // when a DESCENDANT became a touch target — a childless, background-less view
    // does not qualify (see docs/external-package-guides/react-native-gesture-handler.md
    // §5). The waste top card is exactly that case: its visual is pointerEvents="none"
    // and WasteTapZone has no background.
    //
    // VERIFIED on an Android emulator (2026-09-09, API 36 arm64): with the detector
    // here, tableau drags logged [Drag] Begin but THREE consecutive waste drags logged
    // nothing at all. iOS was unaffected (UIKit delivers touches to recognizers on the
    // whole superview chain). The detector therefore lives on the boardShell YStack in
    // KlondikeGameView, whose pointerEvents is `auto` so handlers are always collected.
    // No coordinate change was needed: an absoluteFill child and its parent's onLayout
    // children share one origin — which is why cards already line up with the
    // structural slots today.
    return plane
  }
)

AbsoluteCardLayer.displayName = 'AbsoluteCardLayer'

const AbsoluteLayerCard = React.memo(
  ({
    item,
    metrics,
    invalidWiggle,
    animationResetKey,
    movementEnabled,
    flipEnabled,
    cardTransforms,
    onDraw,
    onFoundationPress,
    onTableauCardPress,
    onCardSettled,
  }: AbsoluteLayerCardProps) => {
    const translateX = useRef(new NativeAnimated.Value(item.x)).current
    const translateY = useRef(new NativeAnimated.Value(item.y)).current
    const wiggle = useRef(new NativeAnimated.Value(0)).current
    const flipScale = useRef(new NativeAnimated.Value(1)).current
    const [renderFaceUp, setRenderFaceUp] = useState(item.card.faceUp)
    const [isSettling, setIsSettling] = useState(false)
    const previousTargetRef = useRef({ x: item.x, y: item.y })
    const previousResetKeyRef = useRef(animationResetKey)
    const previousFaceUpRef = useRef(item.card.faceUp)
    const lastWiggleKeyRef = useRef(invalidWiggle.key)
    const targetChangedBeforeEffect =
      movementEnabled &&
      previousResetKeyRef.current === animationResetKey &&
      (previousTargetRef.current.x !== item.x || previousTargetRef.current.y !== item.y)
    // In Fabric/native-driver moves, the visual transform and React pressability can briefly
    // disagree. Disable touches in the render that first observes a new target so rapid stock
    // taps cannot hit the just-opened waste card before the settling effect runs.
    const pressDisabled =
      item.disabled || item.hidden || isSettling || targetChangedBeforeEffect

    // Card drag: expose this card's position values so a legal drop can SEED them to
    // the drop point while the card is still hidden. The existing flight below then
    // runs from the drop point to the destination, which is the whole handoff — no
    // second animation, no timer. previousTargetRef is deliberately NOT touched: it
    // tracks committed targets, not values, so the next commit still sees
    // targetChanged and starts the flight.
    useEffect(() => {
      if (!cardTransforms) {
        return
      }
      const handle = {
        setPosition: (x: number, y: number) => {
          // setValue is supported under useNativeDriver: true (it forwards to the
          // native animated node); starting a JS-driven animation on one is not.
          translateX.setValue(x)
          translateY.setValue(y)
        },
      }
      cardTransforms.register(item.card.id, handle)
      return () => cardTransforms.unregister(item.card.id, handle)
    }, [cardTransforms, item.card.id, translateX, translateY])

    useEffect(() => {
      const resetChanged = previousResetKeyRef.current !== animationResetKey
      previousResetKeyRef.current = animationResetKey
      const previousTarget = previousTargetRef.current
      const targetChanged = previousTarget.x !== item.x || previousTarget.y !== item.y
      previousTargetRef.current = { x: item.x, y: item.y }

      if (!movementEnabled || resetChanged) {
        translateX.stopAnimation()
        translateY.stopAnimation()
        translateX.setValue(item.x)
        translateY.setValue(item.y)
        setIsSettling(false)
        return
      }

      if (!targetChanged) {
        setIsSettling(false)
        return
      }

      setIsSettling(true)
      // Keep React Native's default symmetric easing here. A front-loaded curve moved stock
      // cards almost completely before the 40 ms face swap, which caused visible draw flicker.
      NativeAnimated.parallel([
        NativeAnimated.timing(translateX, {
          toValue: item.x,
          duration: CARD_ANIMATION_DURATION_MS,
          useNativeDriver: true,
        }),
        NativeAnimated.timing(translateY, {
          toValue: item.y,
          duration: CARD_ANIMATION_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsSettling(false)
          onCardSettled?.(item.card.id)
        }
      })
    }, [
      animationResetKey,
      item.card.id,
      item.x,
      item.y,
      movementEnabled,
      onCardSettled,
      translateX,
      translateY,
    ])

    useEffect(() => {
      if (!flipEnabled) {
        flipScale.stopAnimation()
        flipScale.setValue(1)
        setRenderFaceUp(item.card.faceUp)
        previousFaceUpRef.current = item.card.faceUp
        return
      }

      if (previousFaceUpRef.current === item.card.faceUp) {
        return
      }

      previousFaceUpRef.current = item.card.faceUp
      flipScale.stopAnimation()
      NativeAnimated.timing(flipScale, {
        toValue: 0,
        duration: CARD_FLIP_HALF_DURATION_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          return
        }

        setRenderFaceUp(item.card.faceUp)
        NativeAnimated.timing(flipScale, {
          toValue: 1,
          duration: CARD_FLIP_HALF_DURATION_MS,
          useNativeDriver: true,
        }).start()
      })
    }, [flipEnabled, flipScale, item.card.faceUp])

    useEffect(() => {
      if (!invalidWiggle.lookup.has(item.card.id)) {
        return
      }
      if (lastWiggleKeyRef.current === invalidWiggle.key) {
        return
      }

      lastWiggleKeyRef.current = invalidWiggle.key
      wiggle.stopAnimation()
      wiggle.setValue(0)
      NativeAnimated.sequence([
        NativeAnimated.timing(wiggle, {
          toValue: -ABSOLUTE_LAYER_WIGGLE_OFFSET_PX,
          duration: WIGGLE_SEGMENT_DURATION_MS,
          useNativeDriver: true,
        }),
        NativeAnimated.timing(wiggle, {
          toValue: ABSOLUTE_LAYER_WIGGLE_OFFSET_PX,
          duration: WIGGLE_SEGMENT_DURATION_MS,
          useNativeDriver: true,
        }),
        NativeAnimated.timing(wiggle, {
          toValue: 0,
          duration: WIGGLE_SEGMENT_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start()
    }, [invalidWiggle.key, invalidWiggle.lookup, item.card.id, wiggle])

    useEffect(() => {
      return () => {
        translateX.stopAnimation()
        translateY.stopAnimation()
        wiggle.stopAnimation()
        flipScale.stopAnimation()
      }
    }, [flipScale, translateX, translateY, wiggle])

    const cardStyle: StyleProp<ViewStyle> = [
      layerStyles.card,
      {
        width: metrics.width,
        height: metrics.height,
        // Card drag: the lifted copy in DragOverlayLayer stands in for this card, so
        // hide it rather than unmounting it — its Animated.Values must survive the
        // drag so the drop can seed them. opacity 0 also drops it from the iOS a11y
        // tree for the ~1 s of a drag, which is acceptable (VoiceOver cannot drag).
        opacity: item.hidden ? 0 : 1,
        // Boost must include targetChangedBeforeEffect, not just isSettling: isSettling
        // only flips in the post-commit effect, so the first committed frame(s) of a
        // flight would otherwise carry the *destination* zIndex un-boosted. For moves to
        // a lower z (tableau -> foundation, right column -> left column) that made the
        // flight start behind other columns' cards, visible on slow devices/simulators.
        // Hint visuals rely on sitting ABOVE this flight band (F13): keep the boost
        // below HINT_OVERLAY_Z_INDEX in HintOverlayLayer.
        zIndex:
          isSettling || targetChangedBeforeEffect ? 10000 + item.zIndex : item.zIndex,
        transform: [
          { translateX },
          { translateY },
          { translateX: wiggle },
          { scaleX: flipScale },
        ],
      },
    ]

    const body = renderFaceUp ? (
      // CardVisual only reads suit/rank (structural Pick), so no faceUp override
      // is needed here — renderFaceUp already decided the face.
      <CardVisual card={item.card} metrics={metrics} />
    ) : item.backLabel ? (
      <CardBack label={item.backLabel} metrics={metrics} variant="stock" />
    ) : (
      <View
        // Face-down tableau cards are non-pressable, so the a11y node lives on the
        // body view. `pointerEvents="none"` on the animated wrapper does not remove
        // children from the a11y tree, which is exactly what we rely on here.
        accessible={!item.press && !!item.accessibilityLabel}
        accessibilityLabel={item.press ? undefined : item.accessibilityLabel}
        testID={item.press ? undefined : item.testID}
        style={[
          cardStyles.cardBase,
          cardStyles.faceDown,
          {
            width: '100%',
            height: '100%',
            borderRadius: metrics.radius,
          },
        ]}
      />
    )

    const press = item.press
    const handlePress = () => {
      if (!press) {
        return
      }
      if (press.type === 'draw') {
        onDraw()
      } else if (press.type === 'foundation') {
        onFoundationPress(press.suit)
      } else {
        onTableauCardPress(press.columnIndex, press.cardIndex)
      }
    }

    return (
      <NativeAnimated.View
        pointerEvents={press && !pressDisabled ? 'auto' : 'none'}
        style={cardStyle}
      >
        {press ? (
          <Pressable
            onPress={handlePress}
            disabled={pressDisabled}
            accessibilityRole="button"
            accessibilityLabel={item.accessibilityLabel}
            testID={item.testID}
          >
            {body}
          </Pressable>
        ) : (
          body
        )}
      </NativeAnimated.View>
    )
  },
  areAbsoluteLayerCardPropsEqual
)

AbsoluteLayerCard.displayName = 'AbsoluteLayerCard'

type WasteTapZoneProps = {
  target: WasteTapTarget
  metrics: CardMetrics
  onPress: () => void
}

const WasteTapZone = React.memo(({ target, metrics, onPress }: WasteTapZoneProps) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={target.accessibilityLabel}
    testID={WASTE_TEST_ID}
    style={[
      layerStyles.wasteTapZone,
      {
        left: target.x,
        top: target.y,
        width: metrics.width,
        height: metrics.height,
      },
    ]}
  />
))

WasteTapZone.displayName = 'WasteTapZone'

const layerStyles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  wasteTapZone: {
    position: 'absolute',
    zIndex: 450,
  },
})
