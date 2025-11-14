import { Button, Paragraph, XStack } from 'tamagui'

import type { GameState } from '../../../solitaire/klondike'
import { SUIT_SYMBOLS } from '../constants'
import { rankToLabel } from './cards'

type SelectionHintProps = {
  state: GameState
  onClear: () => void
}

const describeSelection = (state: GameState): string => {
  const selection = state.selected
  if (!selection) {
    return 'None'
  }
  if (selection.source === 'waste') {
    return 'Waste top card'
  }
  if (selection.source === 'foundation') {
    return `${selection.suit.toUpperCase()} foundation top`
  }
  const columnLabel = selection.columnIndex + 1
  const card = state.tableau[selection.columnIndex]?.[selection.cardIndex]
  const cardLabel = card ? `${rankToLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}` : 'card'
  return `Column ${columnLabel} – ${cardLabel}`
}

export const SelectionHint = ({ state, onClear }: SelectionHintProps) => {
  if (!state.selected) {
    return null
  }

  const selectionLabel = describeSelection(state)

  return (
    <XStack gap="$2" style={{ alignItems: 'center' }}>
      <Paragraph color="$color11">Selected: {selectionLabel}</Paragraph>
      <Button size="$2" variant="outlined" onPress={onClear}>
        Clear
      </Button>
    </XStack>
  )
}

