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
    navigation.setOptions({
      headerTitle: 'Klondike',
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

const HeaderControls = ({ onMenuPress, onNewGame, onDemoGame }: HeaderControlsProps) => (
  <XStack gap="$4" style={{ alignItems: 'center' }}>
    {onDemoGame ? (
      <Button size="$4" onPress={onDemoGame}>
        Demo Game
      </Button>
    ) : null}
    <Button size="$4" onPress={onNewGame}>
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


