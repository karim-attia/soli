import { useLayoutEffect } from 'react'
import { Pressable } from 'react-native'
import { useNavigation } from 'expo-router'
import { Button, XStack, useTheme } from 'tamagui'
import { Menu } from '@tamagui/lucide-icons'

import { KlondikeGameView } from '../../src/features/klondike/components/KlondikeGameView'
import { useKlondikeGame } from '../../src/features/klondike/hooks/useKlondikeGame'
import { useDrawerOpener } from '../../src/navigation/useDrawerOpener'

export default function TabOneScreen() {
  const navigation = useNavigation()
  const openDrawer = useDrawerOpener()
  const { developerModeEnabled, requestNewGame, handleLaunchDemoGame, viewProps } = useKlondikeGame()

  useLayoutEffect(() => {
    // PBI-17: Renamed from Klondike to Soli (iOS centers title by platform convention)
    navigation.setOptions({
      headerTitle: 'Soli',
      headerRight: () => (
        <HeaderControls
          onMenuPress={openDrawer}
          onNewGame={() => requestNewGame({ reason: 'manual' })}
          onDemoGame={developerModeEnabled ? () => handleLaunchDemoGame() : undefined}
        />
      ),
    })
  }, [developerModeEnabled, handleLaunchDemoGame, navigation, openDrawer, requestNewGame])

  return <KlondikeGameView {...viewProps} />
}

type HeaderControlsProps = {
  onMenuPress: () => void
  onNewGame: () => void
  onDemoGame?: () => void
}

// PBI-17: Reduced button size from $4 to $3 for iOS best practice (compact nav bar buttons)
const HeaderControls = ({ onMenuPress, onNewGame, onDemoGame }: HeaderControlsProps) => (
  <XStack gap="$3" style={{ alignItems: 'center' }}>
    {onDemoGame ? (
      <Button size="$3" onPress={onDemoGame}>
        Demo
      </Button>
    ) : null}
    <Button size="$3" onPress={onNewGame}>
      New Game
    </Button>
    <HeaderMenuButton onPress={onMenuPress} />
  </XStack>
)

const HeaderMenuButton = ({ onPress }: { onPress: () => void }) => {
  const theme = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Open navigation menu"
      style={{ padding: 8 }}
    >
      <Menu size={32} color={theme.color.val as any} />
    </Pressable>
  )
}


