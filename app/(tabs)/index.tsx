import { useCallback, useLayoutEffect, useState } from 'react'
import { Platform } from 'react-native'
import { HeaderButton } from 'expo-router/react-navigation'
import { useNavigation } from 'expo-router'
import { Button, Text, XStack, YStack } from 'tamagui'

import {
  KlondikeGameSession,
  type KlondikeGameSessionControls,
} from '../../src/features/klondike/components/KlondikeGameSession'
import type { LaunchDemoGameOptions } from '../../src/features/klondike/hooks/useKlondikeGame'
import { useDrawerOpener } from '../../src/navigation/useDrawerOpener'
import { AppSheet } from '../../components/AppSheet'
import {
  HeaderMenuButton,
  HEADER_MENU_LEADING_PADDING,
  IOS_HEADER_CONTROL_SIZE,
} from '../../components/navigation/HeaderMenuButton'

const IOS_HEADER_TEXT_SIZE = 17
const IOS_HEADER_ACTION_FONT_WEIGHT = '400'
const IOS_HEADER_TRAILING_PADDING = 8
const IOS_HEADER_ACTION_GAP = 4
const IOS_HEADER_TEXT_HORIZONTAL_PADDING = 6

export default function TabOneScreen() {
  const navigation = useNavigation()
  const openDrawer = useDrawerOpener()
  const [sessionControls, setSessionControls] =
    useState<KlondikeGameSessionControls | null>(null)
  const [demoChoiceVisible, setDemoChoiceVisible] = useState(false)
  const isIOS = Platform.OS === 'ios'

  const handleSessionControlsChange = useCallback(
    (controls: KlondikeGameSessionControls | null) => {
      setSessionControls(controls)
    },
    []
  )

  const openDemoChoice = useCallback(() => {
    setDemoChoiceVisible(true)
  }, [])

  const handleDemoChoice = useCallback(
    (options: LaunchDemoGameOptions) => {
      setDemoChoiceVisible(false)
      sessionControls?.handleLaunchDemoGame(options)
    },
    [sessionControls]
  )

  const closeDemoChoice = useCallback(() => {
    setDemoChoiceVisible(false)
  }, [])

  useLayoutEffect(() => {
    const onNewGame = () => sessionControls?.requestNewGame({ reason: 'manual' })
    const onDemoGame = sessionControls?.developerModeEnabled ? openDemoChoice : undefined

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
        headerLeft: () => <HeaderMenuButton onPress={openDrawer} />,
        headerRight: () => (
          <IOSHeaderActions onNewGame={onNewGame} onDemoGame={onDemoGame} />
        ),
        headerLeftContainerStyle: {
          paddingLeft: HEADER_MENU_LEADING_PADDING,
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
      headerLeft: () => <HeaderMenuButton onPress={openDrawer} />,
      headerRight: () => (
        <AndroidHeaderControls onNewGame={onNewGame} onDemoGame={onDemoGame} />
      ),
      headerLeftContainerStyle: {
        paddingLeft: HEADER_MENU_LEADING_PADDING,
      },
    })
  }, [isIOS, navigation, openDemoChoice, openDrawer, sessionControls])

  return (
    <>
      <KlondikeGameSession onControlsChange={handleSessionControlsChange} />
      <DemoChoiceSheet
        isPresented={demoChoiceVisible}
        onDismiss={closeDemoChoice}
        onSelect={handleDemoChoice}
      />
    </>
  )
}

type DemoChoiceSheetProps = {
  isPresented: boolean
  onDismiss: () => void
  onSelect: (options: LaunchDemoGameOptions) => void
}

const DemoChoiceSheet = ({ isPresented, onDismiss, onSelect }: DemoChoiceSheetProps) => {
  return (
    <AppSheet isPresented={isPresented} onDismiss={onDismiss}>
      {/* No Cancel button on purpose: the @expo/ui BottomSheet is natively
          dismissible (swipe down / scrim tap -> onDismiss), so an in-sheet
          Cancel was dead weight (demo-sheet-undo-probes-info-hud scope 1).
          Buttons use size="$3" + tight gaps: the Android sheet detent clipped
          the sixth option with default-size buttons (device smoke 2026-07-06). */}
      <YStack gap="$2" p="$4" pb="$5">
        {/* No dismiss hint on purpose: internal dev-only sheet, swipe/scrim
            dismissal is the platform convention (user feedback 2026-07-06). */}
        <Text fontSize={18} fontWeight="700" pb="$2">
          Run Demo
        </Text>
        <Button size="$3" onPress={() => onSelect({ demoMode: 'old' })}>
          Old demo game
        </Button>
        <Button size="$3" onPress={() => onSelect({ demoMode: 'single' })}>
          One generated game
        </Button>
        <Button
          size="$3"
          onPress={() => onSelect({ demoMode: 'playlist', gameLimit: 5 })}
        >
          5 generated games
        </Button>
        <Button
          size="$3"
          onPress={() => onSelect({ demoMode: 'playlist', gameLimit: 10 })}
        >
          10 generated games
        </Button>
        <Button
          size="$3"
          onPress={() => onSelect({ demoMode: 'playlist', gameLimit: 20 })}
        >
          20 generated games
        </Button>
        {/* Deterministic mid-game fixture (scrubber-test-automation): 40 undos +
            40 redos available for scrubber/undo/redo testing. */}
        <Button size="$3" onPress={() => onSelect({ demoMode: 'scrubbed' })}>
          Mid-game, scrubbed to middle
        </Button>
      </YStack>
    </AppSheet>
  )
}

type HeaderControlsProps = {
  onNewGame: () => void
  onDemoGame?: () => void
}

const AndroidHeaderControls = ({ onNewGame, onDemoGame }: HeaderControlsProps) => (
  <XStack gap="$3" style={{ alignItems: 'center' }}>
    {onDemoGame ? (
      <Button size="$3" onPress={onDemoGame}>
        Demo
      </Button>
    ) : null}
    <Button size="$3" onPress={onNewGame}>
      New Game
    </Button>
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
        color="$color"
        fontSize={IOS_HEADER_TEXT_SIZE}
        fontWeight={IOS_HEADER_ACTION_FONT_WEIGHT}
        numberOfLines={1}
      >
        {label}
      </Text>
    </HeaderButton>
  )
}
