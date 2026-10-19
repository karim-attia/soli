import { useLayoutEffect } from 'react'
import { Button, FieldGroup, Host, Switch } from '@expo/ui'
import { useNavigation } from 'expo-router'
import { Alert, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  HeaderMenuButton,
  HEADER_MENU_LEADING_PADDING,
} from '../../components/navigation/HeaderMenuButton'
import { DescribedSwitchRow } from '../../components/settings/DescribedSwitchRow'
import { DrawCountPreference } from '../../components/settings/DrawCountPreference'
import { PickerPreference } from '../../components/settings/PickerPreference'
import { useDrawerOpener } from '../../src/navigation/useDrawerOpener'
import { useHistory } from '../../src/state/history'
import {
  animationPreferenceDescriptors,
  hintButtonPreference,
  scoringPreference,
  statisticsPreferenceDescriptors,
  useSettings,
  vegasTotalPreference,
  warningModePreference,
} from '../../src/state/settings'

export default function SettingsScreen() {
  const navigation = useNavigation()
  const openDrawer = useDrawerOpener()
  const {
    state,
    setGlobalAnimationsEnabled,
    setAnimationPreference,
    setDrawCount,
    setSolvableGamesOnly,
    setAutoUpEnabled,
    setWarningMode,
    setHintButtonEnabled,
    setDeveloperMode,
    setStatisticsPreference,
    setScoringMode,
    setVegasTotalEnabled,
    setVegasTotalOffset,
  } = useSettings()
  // Settled Vegas sum (finished rows) — the reset offset (P2-C, plan § P-H).
  const { vegasTotal: settledVegasTotal } = useHistory()

  // Settings hydrate synchronously (expo-sqlite/kv-store getItemSync), so there is no
  // loading state and controls are always live.
  const animationDetailsDisabled = !state.animations.master
  const vegasSelected = state.statistics.scoring === 'vegas'

  // "Reset Vegas total": the offset becomes the settled sum, so the HUD total reads
  // the live game only (or $0 on a won board). No number shown in Settings on
  // purpose — it would differ from the HUD by the live game, which this screen
  // cannot see (simplification; the TOTAL badge is the one source).
  const confirmResetVegasTotal = () => {
    Alert.alert(vegasTotalPreference.resetTitle, vegasTotalPreference.resetMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => setVegasTotalOffset(settledVegasTotal),
      },
    ])
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackButtonDisplayMode: 'minimal',
      headerBackVisible: false,
      headerLeft: () => <HeaderMenuButton onPress={openDrawer} />,
      headerLeftContainerStyle: {
        paddingLeft: HEADER_MENU_LEADING_PADDING,
      },
      headerRight: () => null,
    })
  }, [navigation, openDrawer])

  return (
    // Bottom safe area is platform-specific: on iOS the SwiftUI Form behind FieldGroup
    // handles the home-indicator inset inside its own scroll content (content scrolls
    // edge-to-edge under it), so an outer inset would double up and cut the scroll area
    // short. On Android the Compose LazyColumn behind FieldGroup has hardcoded 16dp
    // contentPadding and no window-inset support (re-checked on @expo/ui 58.0.20:
    // still true — `FieldGroup.android.tsx` contentPadding 16, only `imePadding`
    // modifier), so the inset must stay outside the scroll view.
    <SafeAreaView edges={Platform.OS === 'ios' ? [] : ['bottom']} style={{ flex: 1 }}>
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section title="New Games">
            <DrawCountPreference value={state.drawCount} onValueChange={setDrawCount} />
            <Switch
              label="Solvable deals"
              value={state.solvableGamesOnly}
              onValueChange={setSolvableGamesOnly}
            />
            {/* Scoring moved here from Statistics in Phase 2: Vegas is now a rules
                mode (pass limit = draw count) that, like the draw count, is fixed
                at deal time — so it belongs with the other next-game settings. */}
            {/* The description switches with the value: once Vegas is picked it
                only says what is switched off (hints, warnings, solvable deals)
                and that it applies from the next game — no rules explanation
                (user, prompt 6). */}
            <PickerPreference
              {...scoringPreference}
              description={
                vegasSelected
                  ? scoringPreference.vegasDescription
                  : scoringPreference.description
              }
              value={state.statistics.scoring}
              onValueChange={setScoringMode}
            />
            {vegasSelected ? (
              <DescribedSwitchRow
                label={vegasTotalPreference.label}
                description={vegasTotalPreference.description}
                value={state.statistics.vegasTotal}
                onValueChange={setVegasTotalEnabled}
              />
            ) : null}
            {vegasSelected && state.statistics.vegasTotal ? (
              <Button
                variant="outlined"
                label={vegasTotalPreference.resetLabel}
                onPress={confirmResetVegasTotal}
                testID="reset-vegas-total"
              />
            ) : null}
          </FieldGroup.Section>

          <FieldGroup.Section title="Gameplay">
            <Switch
              label="Auto Up"
              value={state.autoUpEnabled}
              onValueChange={setAutoUpEnabled}
            />
            {/* Hint/warning rows carry a description (unlike the plain label
                switches above): both features change gameplay in ways the
                labels alone can't carry. The warning modes are ONE select
                (F14) — they form a strictness ladder, not independent
                features. */}
            <DescribedSwitchRow
              label={hintButtonPreference.label}
              description={hintButtonPreference.description}
              value={state.hints.hintButton}
              onValueChange={setHintButtonEnabled}
            />
            <PickerPreference
              {...warningModePreference}
              value={state.hints.warningMode}
              onValueChange={setWarningMode}
            />
          </FieldGroup.Section>

          <FieldGroup.Section title="Statistics">
            {statisticsPreferenceDescriptors.map(({ key, label }) => (
              <Switch
                key={key}
                label={label}
                value={state.statistics[key]}
                onValueChange={(enabled) => setStatisticsPreference(key, enabled)}
              />
            ))}
          </FieldGroup.Section>

          <FieldGroup.Section title="Developer">
            <Switch
              label="Developer mode"
              value={state.developerMode}
              onValueChange={setDeveloperMode}
            />
          </FieldGroup.Section>

          {state.developerMode ? (
            <FieldGroup.Section title="Animations">
              <Switch
                label="All animations"
                value={state.animations.master}
                onValueChange={setGlobalAnimationsEnabled}
              />
              {animationPreferenceDescriptors.map(({ key, label }) => (
                <Switch
                  key={key}
                  label={label}
                  value={state.animations[key]}
                  onValueChange={(enabled) => setAnimationPreference(key, enabled)}
                  disabled={animationDetailsDisabled}
                />
              ))}
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </Host>
    </SafeAreaView>
  )
}
