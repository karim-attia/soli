import React from 'react'
import { Image, StyleSheet, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

import type { Suit } from '../../../../solitaire/klondike'
import { CARD_SUIT_ASSETS } from './cardSuitAssets'

type CardSuitGlyphProps = {
  suit: Suit
  style?: StyleProp<ViewStyle>
}

export const getSuitGlyphWidth = (suit: Suit, height: number) =>
  height * CARD_SUIT_ASSETS[suit].aspectRatio

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
})

export const CardSuitGlyph = ({ suit, style }: CardSuitGlyphProps) => {
  const { source } = CARD_SUIT_ASSETS[suit]

  return (
    <View pointerEvents="none" style={style}>
      <Image source={source} style={styles.image} resizeMode="contain" />
    </View>
  )
}
