import { useLayoutEffect } from 'react'
import { Platform } from 'react-native'
import { HeaderButton } from '@react-navigation/elements'
import { useNavigation } from 'expo-router'
import { Button, Text, XStack, useTheme } from 'tamagui'
import { Menu } from '@tamagui/lucide-icons'

import { KlondikeGameView } from '../../src/features/klondike/components/KlondikeGameView'
import { useKlondikeGame } from '../../src/features/klondike/hooks/useKlondikeGame'
import { useDrawerOpener } from '../../src/navigation/useDrawerOpener'

const IOS_HEADER_CONTROL_SIZE = 44
const IOS_HEADER_ICON_SIZE = 26
const IOS_HEADER_ICON_STROKE_WIDTH = 2.25
const IOS_HEADER_TEXT_SIZE = 17
const IOS_HEADER_ACTION_FONT_WEIGHT = '400'
const IOS_HEADER_LEADING_PADDING = 4
const IOS_HEADER_TRAILING_PADDING = 8
const IOS_HEADER_ACTION_GAP = 4
const IOS_HEADER_TEXT_HORIZONTAL_PADDING = 6
const ANDROID_HEADER_CONTROL_SIZE = 48
const ANDROID_HEADER_ICON_SIZE = 32

export default function TabOneScreen() {
  const navigation = useNavigation()
  const openDrawer = useDrawerOpener()
  const { developerModeEnabled, requestNewGame, handleLaunchDemoGame, viewProps } =
    useKlondikeGame()
  const isIOS = Platform.OS === 'ios'

  useLayoutEffect(() => {
    const onNewGame = () => requestNewGame({ reason: 'manual' })
    const onDemoGame = developerModeEnabled ? () => handleLaunchDemoGame() : undefined

    if (isIOS) {
      // PBI-32: Use standard leading/trailing iOS bar slots so the visible New Game
      // action stays readable without crowding the centered title on compact phones.
      navigation.setOptions({
        headerTitle: 'Soli',
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontSize: IOS_HEADER_TEXT_SIZE,
          fontWeight: '600',
        },
        headerLeft: () => <IOSHeaderMenuButton onPress={openDrawer} />,
        headerRight: () => (
          <IOSHeaderActions onNewGame={onNewGame} onDemoGame={onDemoGame} />
        ),
        headerLeftContainerStyle: {
          paddingLeft: IOS_HEADER_LEADING_PADDING,
        },
        headerRightContainerStyle: {
          paddingRight: IOS_HEADER_TRAILING_PADDING,
        },
      })
      return
    }

    // PBI-17: Renamed from Klondike to Soli (iOS centers title by platform convention)
    navigation.setOptions({
      headerTitle: 'Soli',
      headerLeft: () => null,
      headerRight: () => (
        <AndroidHeaderControls
          onMenuPress={openDrawer}
          onNewGame={onNewGame}
          onDemoGame={onDemoGame}
        />
      ),
    })
  }, [
    developerModeEnabled,
    handleLaunchDemoGame,
    isIOS,
    navigation,
    openDrawer,
    requestNewGame,
  ])

  return <KlondikeGameView {...viewProps} />
}

type HeaderControlsProps = {
  onMenuPress: () => void
  onNewGame: () => void
  onDemoGame?: () => void
}

const AndroidHeaderControls = ({
  onMenuPress,
  onNewGame,
  onDemoGame,
}: HeaderControlsProps) => (
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

const IOSHeaderActions = ({
  onNewGame,
  onDemoGame,
}: Pick<HeaderControlsProps, 'onNewGame' | 'onDemoGame'>) => (
  <XStack gap={IOS_HEADER_ACTION_GAP} style={{ alignItems: 'center' }}>
    {onDemoGame ? <IOSHeaderTextAction label="Demo" onPress={onDemoGame} /> : null}
    <IOSHeaderTextAction
      label="New Game"
      onPress={onNewGame}
      accessibilityLabel="Start a new game"
    />
  </XStack>
)

type IOSHeaderMenuButtonProps = {
  onPress: () => void
}

const IOSHeaderMenuButton = ({ onPress }: IOSHeaderMenuButtonProps) => {
  const theme = useTheme()

  return (
    <HeaderButton
      // PBI-32: Use the shared header-button primitive on iOS so both sides of the
      // bar follow the same spacing/alignment model while keeping a larger burger.
      onPress={onPress}
      accessibilityLabel="Open navigation menu"
      pressOpacity={0.65}
      style={{
        minHeight: IOS_HEADER_CONTROL_SIZE,
        justifyContent: 'center',
      }}
    >
      <Menu
        size={IOS_HEADER_ICON_SIZE}
        strokeWidth={IOS_HEADER_ICON_STROKE_WIDTH}
        color={theme.color.val as any}
      />
    </HeaderButton>
  )
}

type HeaderMenuButtonProps = {
  onPress: () => void
}

const HeaderMenuButton = ({ onPress }: HeaderMenuButtonProps) => {
  const theme = useTheme()

  return (
    <Button
      unstyled
      onPress={onPress}
      width={ANDROID_HEADER_CONTROL_SIZE}
      height={ANDROID_HEADER_CONTROL_SIZE}
      accessibilityLabel="Open navigation menu"
      pressStyle={{ opacity: 0.65 }}
      style={{ alignItems: 'center', justifyContent: 'center' }}
    >
      <Menu size={ANDROID_HEADER_ICON_SIZE} color={theme.color.val as any} />
    </Button>
  )
}

type HeaderTextActionProps = {
  label: string
  onPress: () => void
  accessibilityLabel?: string
}

const IOSHeaderTextAction = ({
  label,
  onPress,
  accessibilityLabel,
}: HeaderTextActionProps) => {
  const theme = useTheme()

  return (
    <HeaderButton
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      pressOpacity={0.65}
      style={{
        minHeight: IOS_HEADER_CONTROL_SIZE,
        justifyContent: 'center',
        paddingHorizontal: IOS_HEADER_TEXT_HORIZONTAL_PADDING,
      }}
    >
      <Text
        color={theme.color.val as any}
        fontSize={IOS_HEADER_TEXT_SIZE}
        fontWeight={IOS_HEADER_ACTION_FONT_WEIGHT}
        numberOfLines={1}
      >
        {label}
      </Text>
    </HeaderButton>
  )
}
