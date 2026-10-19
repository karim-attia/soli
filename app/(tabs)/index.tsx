import { useCallback, useLayoutEffect, useState } from 'react'
import { Platform, ScrollView, StyleSheet, View } from 'react-native'
import { useNavigation } from 'expo-router'

import { KlondikeGameSession } from '../../src/features/klondike/components/KlondikeGameSession'
import type { LaunchDemoGameOptions } from '../../src/features/klondike/hooks/useKlondikeGame'
import { useSessionControls } from '../../src/features/klondike/state/sessionControlsStore'
import { DEMO_AUTO_STEP_INTERVAL_MS } from '../../src/features/klondike/hooks/useDemoGameLauncher'
import { CELEBRATION_MODE_METADATA } from '../../src/animation/celebrationModes'
import { useDrawerOpener } from '../../src/navigation/useDrawerOpener'
import { SPACE, usePalette } from '../../src/theme/tokens'
import { AppButton } from '../../components/AppButton'
import { AppSheet } from '../../components/AppSheet'
import { AppText } from '../../components/AppText'
import {
  HeaderMenuButton,
  HEADER_MENU_LEADING_PADDING,
} from '../../components/navigation/HeaderMenuButton'
import { HeaderActionButton } from '../../components/navigation/HeaderActionButton'

const IOS_HEADER_TEXT_SIZE = 17
const IOS_HEADER_TRAILING_PADDING = 8
const HEADER_ACTION_GAP = 4

export default function TabOneScreen() {
  const navigation = useNavigation()
  const openDrawer = useDrawerOpener()
  // Published by KlondikeGameSession via the module store (retry-and-share-deal plan);
  // the History tab's Retry button reads the same controls.
  const sessionControls = useSessionControls()
  const [demoChoiceVisible, setDemoChoiceVisible] = useState(false)

  const openDemoChoice = useCallback(() => {
    setDemoChoiceVisible(true)
  }, [])

  const handleDemoChoice = (options: LaunchDemoGameOptions) => {
    setDemoChoiceVisible(false)
    sessionControls?.handleLaunchDemoGame(options)
  }

  const handleStartCelebration = (modeId?: number) => {
    setDemoChoiceVisible(false)
    // Delay mirrors the deep-link settle delay (DEMO_AUTO_STEP_INTERVAL_MS) so the
    // sheet dismissal doesn't race the celebration overlay mount.
    setTimeout(
      () => sessionControls?.startCelebrationPreview(modeId),
      DEMO_AUTO_STEP_INTERVAL_MS
    )
  }

  const handleResetUndoHint = () => {
    setDemoChoiceVisible(false)
    sessionControls?.resetUndoHintForTesting()
  }

  const handleSeedHistory = (action: 'seed' | 'clear') => {
    setDemoChoiceVisible(false)
    sessionControls?.seedHistoryForTesting(action)
  }

  const closeDemoChoice = () => {
    setDemoChoiceVisible(false)
  }

  useLayoutEffect(() => {
    const onNewGame = () => sessionControls?.requestNewGame({ reason: 'manual' })
    const onDemoGame = sessionControls?.developerModeEnabled ? openDemoChoice : undefined

    // One header setup for both platforms since the 2026-10-18 Tamagui removal; the
    // actions themselves are native per platform (HeaderActionButton: iOS router text
    // action, Android Material 3 tonal button). PBI-17: title "Soli" (was Klondike).
    navigation.setOptions({
      headerTitle: 'Soli',
      headerLeft: () => <HeaderMenuButton onPress={openDrawer} />,
      headerRight: () => <HeaderActions onNewGame={onNewGame} onDemoGame={onDemoGame} />,
      headerLeftContainerStyle: {
        paddingLeft: HEADER_MENU_LEADING_PADDING,
      },
      // PBI-32 (iOS only): centered title in the standard bar slots so the visible New
      // Game action stays readable without crowding the title on compact phones; the
      // trailing padding tightens from the drawer default 16 to 8. Android keeps its
      // platform-default left title and the drawer layout's trailing padding — spread so
      // those keys stay absent there (an explicit `undefined` would override the default).
      ...(Platform.OS === 'ios'
        ? {
            headerTitleAlign: 'center' as const,
            headerTitleStyle: {
              fontSize: IOS_HEADER_TEXT_SIZE,
              fontWeight: '600' as const,
            },
            headerRightContainerStyle: {
              paddingRight: IOS_HEADER_TRAILING_PADDING,
            },
          }
        : {}),
    })
  }, [navigation, openDemoChoice, openDrawer, sessionControls])

  return (
    <>
      <KlondikeGameSession />
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

// Section header for the dev sheet: small muted uppercase label, plain RN text only —
// Expo UI controls (FieldGroup/Picker) are avoided inside the sheet because nested
// native Hosts had unreliable gestures on Android (demo-sheet-cleanup plan, approach B).
const SheetSectionHeader = ({ children }: { children: string }) => {
  const palette = usePalette()
  return (
    <AppText variant="plain" color={palette.color10} style={styles.sectionHeader}>
      {children}
    </AppText>
  )
}

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
          AppButton (36 px, the old Tamagui size="$3") + tight gaps: the Android
          sheet detent clipped a sixth option with default-size buttons (device
          smoke 2026-07-06). */}
      <View style={styles.sheet}>
        {/* No dismiss hint on purpose: internal dev-only sheet, swipe/scrim
            dismissal is the platform convention (user feedback 2026-07-06). */}
        <AppText variant="plain" style={styles.sheetTitle}>
          Run Demo
        </AppText>

        {/* Dense one-row-per-section layout on purpose: the first cut (separate
            "Old demo game" + "Random" + "Reset undo hint" rows) pushed the whole
            Testing section below the default Android detent fold (device smoke
            2026-07-09) — budget ~4 rows + 4 headers for this sheet. */}
        <SheetSectionHeader>Demo games</SheetSectionHeader>
        <View style={styles.row}>
          <AppButton
            label="Old"
            style={styles.rowButton}
            onPress={() => onSelect({ demoMode: 'old' })}
          />
          {/* 1/5/10/20 = generated auto-solve games (single vs playlist). */}
          <AppButton
            label="1"
            style={styles.rowButton}
            onPress={() => onSelect({ demoMode: 'single' })}
          />
          <AppButton
            label="5"
            style={styles.rowButton}
            onPress={() => onSelect({ demoMode: 'playlist', gameLimit: 5 })}
          />
          <AppButton
            label="10"
            style={styles.rowButton}
            onPress={() => onSelect({ demoMode: 'playlist', gameLimit: 10 })}
          />
          <AppButton
            label="20"
            style={styles.rowButton}
            onPress={() => onSelect({ demoMode: 'playlist', gameLimit: 20 })}
          />
        </View>

        <SheetSectionHeader>Fixtures</SheetSectionHeader>
        <View style={styles.row}>
          {/* Deterministic mid-game fixture (scrubber-test-automation): 40 undos +
              40 redos available for scrubber/undo/redo testing. */}
          <AppButton
            label="Mid-game scrub"
            style={styles.rowButton}
            onPress={() => onSelect({ demoMode: 'scrubbed' })}
          />
          {/* Near win launches 1 move from completion (the common case); other
              values stay deep-link-only via ?demo=nearwin&left=N. */}
          <AppButton
            label="Near win"
            style={styles.rowButton}
            onPress={() => onSelect({ demoMode: 'nearwin', nearWinMovesLeft: 1 })}
          />
        </View>
        {/* Vegas-rules fixtures (scoring plan round 3): fresh Draw-3 deal with A♦
            playable, last pass one tap from exhaustion (⊘ + dock New Game), and
            the near-win board under Vegas rules (win → $208 recorded once). A
            second Fixtures row without its own header to stay within the sheet's
            row budget (see the comment above). Labels are short on purpose: three
            buttons per row truncate "Vegas last pass" at ~400 pt (round 3 device
            test); "Near win $" = the Vegas twin of row 1's "Near win". */}
        <View style={styles.row}>
          <AppButton
            label="Vegas deal"
            style={styles.rowButton}
            onPress={() => onSelect({ demoMode: 'vegas' })}
          />
          <AppButton
            label="Last pass"
            style={styles.rowButton}
            onPress={() =>
              onSelect({ demoMode: 'vegaslastpass', vegasLastPassTapsLeft: 1 })
            }
          />
          <AppButton
            label="Near win $"
            style={styles.rowButton}
            onPress={() => onSelect({ demoMode: 'vegasnearwin', nearWinMovesLeft: 1 })}
          />
        </View>

        <SheetSectionHeader>Celebration</SheetSectionHeader>
        {/* Dev-hold preview on the current board (same path as ?celebration=);
            abort by tapping the running animation. Chip labels keep the mode id
            visible for cross-referencing logs/tests. Plain RN horizontal
            ScrollView (not an Expo UI container) is fine inside RNHostView
            (verified on device 2026-07-09: measured + scrolled on first present). */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.row}>
            <AppButton label="Random" onPress={() => onStartCelebration()} />
            {CELEBRATION_MODE_METADATA.map((mode) => (
              <AppButton
                key={mode.id}
                label={`${mode.id} ${mode.name}`}
                onPress={() => onStartCelebration(mode.id)}
              />
            ))}
          </View>
        </ScrollView>

        <SheetSectionHeader>Testing</SheetSectionHeader>
        <View style={styles.row}>
          {/* Manual-testing reset for the undo-scrubber hint (undo-scrubber-hint
              plan): sets lifetime past the >50 gate + hintsRemaining back to 3, so
              a 10-tap undo streak immediately shows hint 1. No confirmation on
              purpose — the action is harmless and this sheet is dev-only. */}
          <AppButton
            label="Undo hint"
            style={styles.rowButton}
            onPress={onResetUndoHint}
          />
          {/* Dev-only history seeding (agent-testing-skill plan): additive `seed-`
              rows for History-tab/stats testing, reversible via the clear entry.
              Real history rows are never modified — this is Karim's main phone. */}
          <AppButton
            label="Seed history"
            style={styles.rowButton}
            onPress={() => onSeedHistory('seed')}
          />
          <AppButton
            label="Clear seeded"
            style={styles.rowButton}
            onPress={() => onSeedHistory('clear')}
          />
        </View>
      </View>
    </AppSheet>
  )
}

type HeaderActionsProps = {
  onNewGame: () => void
  onDemoGame?: () => void
}

const HeaderActions = ({ onNewGame, onDemoGame }: HeaderActionsProps) => (
  <View style={styles.headerActions}>
    {onDemoGame ? <HeaderActionButton label="Demo" onPress={onDemoGame} /> : null}
    {/* a11y handle `Start a new game` on both platforms since 2026-10-18 (was the
        button text "New Game" on Android) — soli-testing SKILL.md a11y matrix. */}
    <HeaderActionButton
      label="New Game"
      onPress={onNewGame}
      accessibilityLabel="Start a new game"
    />
  </View>
)

// Gaps/paddings are the Tamagui space tokens the sheet used ($2/$4/$5).
const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HEADER_ACTION_GAP,
  },
  sheet: {
    gap: SPACE[2],
    padding: SPACE[4],
    paddingBottom: SPACE[5],
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 12,
    textTransform: 'uppercase',
    paddingTop: SPACE[2],
  },
  row: {
    flexDirection: 'row',
    gap: SPACE[2],
  },
  rowButton: {
    flex: 1,
  },
})
