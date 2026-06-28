import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import type { Card } from '../../../../solitaire/klondike'
import type { CardFlightSnapshot } from '../../../../animation/flightController'
import { CARD_FLIGHT_TIMING } from '../../constants'
import type { CardMetrics } from '../../types'
import { CardVisual } from './CardView'
import { styles as cardStyles } from './styles'

export const CARD_FLIGHT_OVERLAY_SLOT_COUNT = 16

export type CardFlightOverlayItem = {
  key: string
  slot: number
  card: Card
  from: CardFlightSnapshot
  to: CardFlightSnapshot
  metrics: CardMetrics
}

type OverlayOrigin = {
  ready: boolean
  pageX: number
  pageY: number
}

type CardFlightOverlayLayerProps = {
  items: CardFlightOverlayItem[]
  onFlightComplete: (key: string) => void
}

export const CardFlightOverlayLayer = ({
  items,
  onFlightComplete,
}: CardFlightOverlayLayerProps) => {
  const layerRef = useRef<View>(null)
  const [origin, setOrigin] = useState<OverlayOrigin>({
    ready: false,
    pageX: 0,
    pageY: 0,
  })

  const measureOrigin = useCallback(() => {
    layerRef.current?.measureInWindow((pageX, pageY) => {
      setOrigin((previous) => {
        if (
          previous.ready &&
          Math.abs(previous.pageX - pageX) <= 0.5 &&
          Math.abs(previous.pageY - pageY) <= 0.5
        ) {
          return previous
        }

        return { ready: true, pageX, pageY }
      })
    })
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(measureOrigin)
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [items.length, measureOrigin])

  const assignmentsBySlot = useMemo(() => {
    const map = new Map<number, CardFlightOverlayItem>()
    items.forEach((item) => {
      map.set(item.slot, item)
    })
    return map
  }, [items])

  return (
    <View
      ref={layerRef}
      pointerEvents="none"
      onLayout={measureOrigin}
      style={StyleSheet.absoluteFill}
    >
      {Array.from({ length: CARD_FLIGHT_OVERLAY_SLOT_COUNT }, (_, slot) => (
        <CardFlightOverlaySlot
          key={slot}
          assignment={assignmentsBySlot.get(slot) ?? null}
          origin={origin}
          onFlightComplete={onFlightComplete}
        />
      ))}
    </View>
  )
}

type CardFlightOverlaySlotProps = {
  assignment: CardFlightOverlayItem | null
  origin: OverlayOrigin
  onFlightComplete: (key: string) => void
}

const CardFlightOverlaySlot = React.memo(
  ({ assignment, origin, onFlightComplete }: CardFlightOverlaySlotProps) => {
    const translateX = useSharedValue(0)
    const translateY = useSharedValue(0)
    const opacity = useSharedValue(0)

    useEffect(() => {
      if (!assignment || !origin.ready) {
        opacity.value = 0
        return
      }

      const fromX = assignment.from.pageX - origin.pageX
      const fromY = assignment.from.pageY - origin.pageY
      const toX = assignment.to.pageX - origin.pageX
      const toY = assignment.to.pageY - origin.pageY
      const assignmentKey = assignment.key

      translateX.value = fromX
      translateY.value = fromY
      opacity.value = 1

      const frame = requestAnimationFrame(() => {
        translateX.value = withTiming(toX, CARD_FLIGHT_TIMING)
        translateY.value = withTiming(toY, CARD_FLIGHT_TIMING, (finished) => {
          if (finished) {
            runOnJS(onFlightComplete)(assignmentKey)
          }
        })
      })

      return () => {
        cancelAnimationFrame(frame)
      }
    }, [assignment, onFlightComplete, opacity, origin, translateX, translateY])

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    }))

    if (!assignment || !origin.ready) {
      return <Animated.View pointerEvents="none" style={[styles.slot, animatedStyle]} />
    }

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.slot,
          {
            width: assignment.metrics.width,
            height: assignment.metrics.height,
          },
          animatedStyle,
        ]}
      >
        {assignment.card.faceUp ? (
          <CardVisual card={assignment.card} metrics={assignment.metrics} />
        ) : (
          <View
            style={[
              cardStyles.cardBase,
              cardStyles.faceDown,
              {
                width: '100%',
                height: '100%',
                borderRadius: assignment.metrics.radius,
              },
            ]}
          />
        )}
      </Animated.View>
    )
  }
)

CardFlightOverlaySlot.displayName = 'CardFlightOverlaySlot'

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 5000,
  },
})
