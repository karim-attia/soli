// PBI-33: keep cards on one embedded+registered font family on both platforms.
// The binaries come from the reference phone's Roboto/Noto sources, with vertical
// metrics matched to Roboto (head bbox drives Android includeFontPadding; hhea drives
// iOS/CoreText — both carry the same values so platforms render identically) and suit
// advances matched to NotoColorEmoji so centered/corner suit ink lands exactly like
// the approved fallback. See scripts/patch-card-font-metrics.py for the full contract.
// Do not remove native registration: falling back makes card text vary by device font.
export const CARD_FONT_FAMILY = 'CardTextAndroid'
export const CARD_RANK_FONT_FAMILY = CARD_FONT_FAMILY
export const CARD_RANK_FONT_WEIGHT = '700'
export const CARD_SUIT_FONT_FAMILY = CARD_FONT_FAMILY
export const CARD_SUIT_FONT_WEIGHT = '600'
export const CARD_CENTER_SUIT_FONT_WEIGHT = '600'
