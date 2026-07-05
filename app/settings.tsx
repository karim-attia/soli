import { useLayoutEffect } from 'react'
import { FieldGroup, Host, Switch, Text } from '@expo/ui'
import { useNavigation } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  HeaderMenuButton,
  HEADER_MENU_LEADING_PADDING,
} from '../components/navigation/HeaderMenuButton'
import { DrawCountPreference } from '../components/settings/DrawCountPreference'
import { useDrawerOpener } from '../src/navigation/useDrawerOpener'
import {
  animationPreferenceDescriptors,
  statisticsPreferenceDescriptors,
  useSettings,
} from '../src/state/settings'

export default function SettingsScreen() {
  const navigation = useNavigation()
  const openDrawer = useDrawerOpener()
  const {
    state,
    hydrated,
    setGlobalAnimationsEnabled,
    setAnimationPreference,
    setDrawCount,
    setSolvableGamesOnly,
    setAutoUpEnabled,
    setDeveloperMode,
    setStatisticsPreference,
  } = useSettings()

  const controlsDisabled = !hydrated
  const animationDetailsDisabled = controlsDisabled || !state.animations.master

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
          {!hydrated ? (
            <FieldGroup.Section>
              <Text>Loading preferences...</Text>
            </FieldGroup.Section>
          ) : null}

          <FieldGroup.Section title="New Games">
            <DrawCountPreference
              value={state.drawCount}
              onValueChange={setDrawCount}
              disabled={controlsDisabled}
            />
            <Switch
              label="Solvable deals"
              value={state.solvableGamesOnly}
              onValueChange={setSolvableGamesOnly}
              disabled={controlsDisabled}
            />
          </FieldGroup.Section>

          <FieldGroup.Section title="Gameplay">
            <Switch
              label="Auto Up"
              value={state.autoUpEnabled}
              onValueChange={setAutoUpEnabled}
              disabled={controlsDisabled}
            />
          </FieldGroup.Section>

          <FieldGroup.Section title="Statistics">
            {statisticsPreferenceDescriptors.map(({ key, label }) => (
              <Switch
                key={key}
                label={label}
                value={state.statistics[key]}
                onValueChange={(enabled) => setStatisticsPreference(key, enabled)}
                disabled={controlsDisabled}
              />
            ))}
          </FieldGroup.Section>

          <FieldGroup.Section title="Developer">
            <Switch
              label="Developer mode"
              value={state.developerMode}
              onValueChange={setDeveloperMode}
              disabled={controlsDisabled}
            />
          </FieldGroup.Section>

          {state.developerMode ? (
            <FieldGroup.Section title="Animations">
              <Switch
                label="All animations"
                value={state.animations.master}
                onValueChange={setGlobalAnimationsEnabled}
                disabled={controlsDisabled}
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
