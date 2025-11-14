import React from 'react'
import { Pressable } from 'react-native'

import { styles } from './styles'

export const CelebrationTouchBlocker = ({ onAbort }: { onAbort: () => void }) => (
  <Pressable style={styles.celebrationOverlay} onPress={onAbort} />
)
