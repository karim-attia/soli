import { FACE_CARD_LABELS } from '../../constants'
import type { Rank } from '../../../../solitaire/klondike'

export const rankToLabel = (rank: Rank): string => FACE_CARD_LABELS[rank] ?? String(rank)
