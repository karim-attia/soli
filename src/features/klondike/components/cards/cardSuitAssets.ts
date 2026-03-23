import type { ImageSourcePropType } from 'react-native'

import type { Suit } from '../../../../solitaire/klondike'

type CardSuitAsset = {
  aspectRatio: number
  source: ImageSourcePropType
}

// PBI-33: Use the exact Android emoji suit artwork so iOS cards match the approved Android heart.
export const CARD_SUIT_ASSETS: Record<Suit, CardSuitAsset> = {
  clubs: {
    aspectRatio: 171 / 178,
    source: require('../../../../../assets/card-suits/clubs-android-emoji.png'),
  },
  diamonds: {
    aspectRatio: 132 / 179,
    source: require('../../../../../assets/card-suits/diamonds-android-emoji.png'),
  },
  hearts: {
    aspectRatio: 177 / 165,
    source: require('../../../../../assets/card-suits/hearts-android-emoji.png'),
  },
  spades: {
    aspectRatio: 159 / 177,
    source: require('../../../../../assets/card-suits/spades-android-emoji.png'),
  },
}
