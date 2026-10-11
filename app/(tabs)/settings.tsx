import { useLayoutEffect } from 'react'
import { FieldGroup, Host, Switch } from '@expo/ui'
import { useNavigation } from 'expo-router'
import { Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  HeaderMenuButton,
  HEADER_MENU_LEADING_PADDING,
} from '../../components/navigation/HeaderMenuButton'
import { DescribedSwitchRow } from '../../components/settings/DescribedSwitchRow'
import { DrawCountPreference } from '../../components/settings/DrawCountPreference'
import { WarningModePreference } from '../../components/settings/WarningModePreference'
import { useDrawerOpener } from '../../src/navigation/useDrawerOpener'
import {
  animationPreferenceDescriptors,
  hintButtonPreference,
  rewindToWinnablePreference,
  statisticsPreferenceDescriptors,
  useSettings,
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
    setRewindToWinnableEnabled,
    setDeveloperMode,
    setStatisticsPreference,
  } = useSettings()

  // Settings hydrate synchronously (expo-sqlite/kv-store getItemSync), so there is no
  // loading state and controls are always live.
  const animationDetailsDisabled = !state.animations.master

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
    // contentPadding and no window-inset support (as of @expo/ui in SDK 57), so the
    // inset must stay outside the scroll view.
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
            <WarningModePreference
              value={state.hints.warningMode}
              onValueChange={setWarningMode}
            />
            {/* Placed directly after the warning select on purpose: the rewind
                action only ever appears while one of those warnings is
                showing, so the two rows read as a pair. Greyed out when
                warnings are off, because the rewind rides on the warning
                (useRewindToWinnable gates on warningEraKey) — with no warning
                it can never appear, so an enabled-looking switch that silently
                does nothing would be a lie. The stored value is deliberately
                NOT cleared: turning warnings back on restores the choice. */}
            <DescribedSwitchRow
              label={rewindToWinnablePreference.label}
              description={rewindToWinnablePreference.description}
              value={state.hints.rewindToWinnable}
              onValueChange={setRewindToWinnableEnabled}
              disabled={state.hints.warningMode === 'off'}
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
