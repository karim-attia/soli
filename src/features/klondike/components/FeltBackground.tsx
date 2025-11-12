import React from 'react'
import { StyleSheet, View, useColorScheme } from 'react-native'

const LINE_COUNT = 60
const LINE_SPACING = 30
const LINE_OFFSET = -400

export const FeltBackground: React.FC = () => {
  const colorScheme = useColorScheme()
  const patternColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.015)' : 'rgba(0, 0, 0, 0.015)'

  return (
    <View style={styles.overlay} pointerEvents="none">
      {Array.from({ length: LINE_COUNT }).map((_, index) => (
        <View
          key={`diag-${index}`}
          style={[
            styles.line,
            {
              top: index * LINE_SPACING + LINE_OFFSET,
              backgroundColor: patternColor,
              transform: [{ rotate: '45deg' }],
            },
          ]}
        />
      ))}
      {Array.from({ length: LINE_COUNT }).map((_, index) => (
        <View
          key={`diag-rev-${index}`}
          style={[
            styles.line,
            {
              top: index * LINE_SPACING + LINE_OFFSET,
              backgroundColor: patternColor,
              transform: [{ rotate: '-45deg' }],
            },
          ]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  line: {
    position: 'absolute',
    left: -500,
    width: 2000,
    height: 0.5,
  },
})

