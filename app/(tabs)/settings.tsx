import { useLayoutEffect } from 'react'
import { FieldGroup, Host, Switch } from '@expo/ui'
import { useNavigation } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  HeaderMenuButton,
  HEADER_MENU_LEADING_PADDING,
} from '../../components/navigation/HeaderMenuButton'
import { DrawCountPreference } from '../../components/settings/DrawCountPreference'
import { useDrawerOpener } from '../../src/navigation/useDrawerOpener'
import {
  animationPreferenceDescriptors,
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
    <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
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
