import { StyleSheet } from 'react-native'

import {
  COLOR_CARD_BACK,
  COLOR_CARD_BORDER,
  COLOR_CARD_FACE,
  COLOR_COLUMN_BORDER,
  COLOR_FELT_TEXT_PRIMARY,
  COLOR_FELT_TEXT_SECONDARY,
  FOUNDATION_GLOW_COLOR,
  FOUNDATION_GLOW_FILL_COLOR,
} from '../../constants'

export const styles = StyleSheet.create({
  tableauRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    flexWrap: 'nowrap',
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
    fontSize: 16,
  },
  cardCornerSuit: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  cardSymbol: {
    alignSelf: 'center',
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
    shadowOpacity: 0.85,
    shadowRadius: 14,
    backgroundColor: FOUNDATION_GLOW_FILL_COLOR,
  },
  foundationSymbol: {
    fontSize: 28,
    color: COLOR_FELT_TEXT_PRIMARY,
  },
  // Note: pile-local card wrapper styles (cardFlipWrapper, stockCardWrapper, ...)
  // were removed in the clean-code review — card visuals render exclusively in
  // AbsoluteCardLayer since the absolute-card refactor.
})
