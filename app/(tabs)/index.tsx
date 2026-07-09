import { useCallback, useLayoutEffect, useState } from 'react'
import { Platform, ScrollView } from 'react-native'
import { HeaderButton } from 'expo-router/react-navigation'
import { useNavigation } from 'expo-router'
import { Button, Text, XStack, YStack } from 'tamagui'

import {
  KlondikeGameSession,
  type KlondikeGameSessionControls,
} from '../../src/features/klondike/components/KlondikeGameSession'
import type { LaunchDemoGameOptions } from '../../src/features/klondike/hooks/useKlondikeGame'
import { DEMO_AUTO_STEP_INTERVAL_MS } from '../../src/features/klondike/hooks/useDemoGameLauncher'
import { CELEBRATION_MODE_METADATA } from '../../src/animation/celebrationModes'
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

  const handleStartCelebration = useCallback(
    (modeId?: number) => {
      setDemoChoiceVisible(false)
      // Delay mirrors the deep-link settle delay (DEMO_AUTO_STEP_INTERVAL_MS) so the
      // sheet dismissal doesn't race the celebration overlay mount.
      setTimeout(
        () => sessionControls?.startCelebrationPreview(modeId),
        DEMO_AUTO_STEP_INTERVAL_MS
      )
    },
    [sessionControls]
  )

  const handleResetUndoHint = useCallback(() => {
    setDemoChoiceVisible(false)
    sessionControls?.resetUndoHintForTesting()
  }, [sessionControls])

  const handleSeedHistory = useCallback(
    (action: 'seed' | 'clear') => {
      setDemoChoiceVisible(false)
      sessionControls?.seedHistoryForTesting(action)
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
        onStartCelebration={handleStartCelebration}
        onResetUndoHint={handleResetUndoHint}
        onSeedHistory={handleSeedHistory}
      />
    </>
  )
}

type DemoChoiceSheetProps = {
  isPresented: boolean
  onDismiss: () => void
  onSelect: (options: LaunchDemoGameOptions) => void
  onStartCelebration: (modeId?: number) => void
  onResetUndoHint: () => void
  onSeedHistory: (action: 'seed' | 'clear') => void
}

// Section header for the dev sheet: small muted uppercase label, tamagui
// primitives only — Expo UI controls (FieldGroup/Picker) are avoided inside the
// sheet because nested native Hosts had unreliable gestures on Android
// (demo-sheet-cleanup plan, approach B).
const SheetSectionHeader = ({ children }: { children: string }) => (
  <Text fontSize={12} color="$color10" textTransform="uppercase" pt="$2">
    {children}
  </Text>
)

const DemoChoiceSheet = ({
  isPresented,
  onDismiss,
  onSelect,
  onStartCelebration,
  onResetUndoHint,
  onSeedHistory,
}: DemoChoiceSheetProps) => {
  return (
    <AppSheet isPresented={isPresented} onDismiss={onDismiss}>
      {/* No Cancel button on purpose: the @expo/ui BottomSheet is natively
          dismissible (swipe down / scrim tap -> onDismiss), so an in-sheet
          Cancel was dead weight (demo-sheet-undo-probes-info-hud scope 1).
          Buttons use size="$3" + tight gaps: the Android sheet detent clipped
          a sixth option with default-size buttons (device smoke 2026-07-06). */}
      <YStack gap="$2" p="$4" pb="$5">
        {/* No dismiss hint on purpose: internal dev-only sheet, swipe/scrim
            dismissal is the platform convention (user feedback 2026-07-06). */}
        <Text fontSize={18} fontWeight="700">
          Run Demo
        </Text>

        {/* Dense one-row-per-section layout on purpose: the first cut (separate
            "Old demo game" + "Random" + "Reset undo hint" rows) pushed the whole
            Testing section below the default Android detent fold (device smoke
            2026-07-09) — budget ~4 rows + 4 headers for this sheet. */}
        <SheetSectionHeader>Demo games</SheetSectionHeader>
        <XStack gap="$2">
          <Button size="$3" flex={1} onPress={() => onSelect({ demoMode: 'old' })}>
            Old
          </Button>
          {/* 1/5/10/20 = generated auto-solve games (single vs playlist). */}
          <Button size="$3" flex={1} onPress={() => onSelect({ demoMode: 'single' })}>
            1
          </Button>
          <Button
            size="$3"
            flex={1}
            onPress={() => onSelect({ demoMode: 'playlist', gameLimit: 5 })}
          >
            5
          </Button>
          <Button
            size="$3"
            flex={1}
            onPress={() => onSelect({ demoMode: 'playlist', gameLimit: 10 })}
          >
            10
          </Button>
          <Button
            size="$3"
            flex={1}
            onPress={() => onSelect({ demoMode: 'playlist', gameLimit: 20 })}
          >
            20
          </Button>
        </XStack>

        <SheetSectionHeader>Fixtures</SheetSectionHeader>
        <XStack gap="$2">
          {/* Deterministic mid-game fixture (scrubber-test-automation): 40 undos +
              40 redos available for scrubber/undo/redo testing. */}
          <Button size="$3" flex={1} onPress={() => onSelect({ demoMode: 'scrubbed' })}>
            Mid-game scrub
          </Button>
          {/* Near win launches 1 move from completion (the common case); other
              values stay deep-link-only via ?demo=nearwin&left=N. */}
          <Button
            size="$3"
            flex={1}
            onPress={() => onSelect({ demoMode: 'nearwin', nearWinMovesLeft: 1 })}
          >
            Near win
          </Button>
        </XStack>

        <SheetSectionHeader>Celebration</SheetSectionHeader>
        {/* Dev-hold preview on the current board (same path as ?celebration=);
            abort by tapping the running animation. Chip labels keep the mode id
            visible for cross-referencing logs/tests. Plain RN horizontal
            ScrollView (not an Expo UI container) is fine inside RNHostView
            (verified on device 2026-07-09: measured + scrolled on first present). */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack gap="$2">
            <Button size="$3" onPress={() => onStartCelebration()}>
              Random
            </Button>
            {CELEBRATION_MODE_METADATA.map((mode) => (
              <Button key={mode.id} size="$3" onPress={() => onStartCelebration(mode.id)}>
                {`${mode.id} ${mode.name}`}
              </Button>
            ))}
          </XStack>
        </ScrollView>

        <SheetSectionHeader>Testing</SheetSectionHeader>
        <XStack gap="$2">
          {/* Manual-testing reset for the undo-scrubber hint (undo-scrubber-hint
              plan): sets lifetime past the >50 gate + hintsRemaining back to 3, so
              a 10-tap undo streak immediately shows hint 1. No confirmation on
              purpose — the action is harmless and this sheet is dev-only. */}
          <Button size="$3" flex={1} onPress={onResetUndoHint}>
            Undo hint
          </Button>
          {/* Dev-only history seeding (agent-testing-skill plan): additive `seed-`
              rows for History-tab/stats testing, reversible via the clear entry.
              Real history rows are never modified — this is Karim's main phone. */}
          <Button size="$3" flex={1} onPress={() => onSeedHistory('seed')}>
            Seed history
          </Button>
          <Button size="$3" flex={1} onPress={() => onSeedHistory('clear')}>
            Clear seeded
          </Button>
        </XStack>
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
