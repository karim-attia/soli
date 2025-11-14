import { StyleSheet } from 'react-native'

import {
  COLOR_CARD_BACK,
  COLOR_CARD_BORDER,
  COLOR_CARD_FACE,
  COLOR_COLUMN_BORDER,
  COLOR_COLUMN_SELECTED,
  COLOR_DROP_BORDER,
  COLOR_FELT_TEXT_PRIMARY,
  COLOR_FELT_TEXT_SECONDARY,
  COLOR_SELECTED_BORDER,
  COLOR_TEXT_MUTED,
  COLUMN_MARGIN,
  FOUNDATION_GLOW_COLOR,
  FOUNDATION_GLOW_OUTSET,
} from '../../constants'

export const styles = StyleSheet.create({
  tableauRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    flexWrap: 'nowrap',
    paddingHorizontal: COLUMN_MARGIN,
  },
  column: {
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
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'auto',
  },
  emptySlot: {
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLabel: {
    color: COLOR_FELT_TEXT_SECONDARY,
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
    borderColor: COLOR_FELT_TEXT_SECONDARY,
  },
  cardBackEmpty: {
    borderColor: COLOR_COLUMN_BORDER,
  },
  cardBackText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  stockContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockCardWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  stockLabel: {
    position: 'relative',
    zIndex: 5000,
    textAlign: 'center',
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
    overflow: 'visible',
  },
  foundationGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0,
    shadowColor: FOUNDATION_GLOW_COLOR,
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  foundationCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  foundationStackedCard: {
    opacity: 0,
  },
  foundationSymbol: {
    fontSize: 28,
    color: COLOR_FELT_TEXT_PRIMARY,
  },
  wasteFanCardWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  hiddenCard: {
    opacity: 0,
  },
})
