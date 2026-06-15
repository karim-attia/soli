import { useLayoutEffect } from 'react'
import { Pressable, ScrollView, useColorScheme } from 'react-native'
import { Host, Switch } from '@expo/ui'
import { SegmentedControl } from '@expo/ui/community/segmented-control'
import { useNavigation } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { H2, Paragraph, Separator, Text, XStack, YStack } from 'tamagui'
import { Menu } from '@tamagui/lucide-icons-2'

import { DrawCountSelector } from '../components/settings/DrawCountSelector'
import {
  animationPreferenceDescriptors,
  type ThemeMode,
  useSettings,
  statisticsPreferenceDescriptors,
} from '../src/state/settings'
import { useDrawerOpener } from '../src/navigation/useDrawerOpener'
import { resolveThemeName } from '../src/theme'

const themeOptions: Array<{ mode: ThemeMode; label: string }> = [
  { mode: 'auto', label: 'Auto' },
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
]

export default function SettingsScreen() {
  const navigation = useNavigation()
  const openDrawer = useDrawerOpener()
  const safeArea = useSafeAreaInsets()
  const systemColorScheme = useColorScheme()

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={openDrawer}
          accessibilityLabel="Open navigation menu"
          style={{ padding: 8 }}
        >
          <Menu size={32} color="$color" />
        </Pressable>
      ),
    })
  }, [navigation, openDrawer])

  const {
    state,
    hydrated,
    setGlobalAnimationsEnabled,
    setAnimationPreference,
    setThemeMode,
    setDrawCount,
    setSolvableGamesOnly,
    setAutoUpEnabled,
    setDeveloperMode,
    setStatisticsPreference,
  } = useSettings()
  const segmentedControlAppearance = resolveThemeName(state.themeMode, systemColorScheme)
  // Android edge-to-edge can place scroll content behind the system dock, so keep
  // the existing visual breathing room and add the device bottom inset.
  const settingsContentPaddingBottom = 48 + safeArea.bottom

  return (
    <ScrollView
      contentContainerStyle={{ padding: 24, paddingBottom: settingsContentPaddingBottom }}
    >
      <YStack gap="$5">
        <YStack gap="$2">
          <H2>Settings</H2>
          {!hydrated && (
            <Paragraph color="$color9">Loading your saved preferences…</Paragraph>
          )}
        </YStack>

        <YStack gap="$3">
          <Text fontSize={16} fontWeight="700">
            Gameplay
          </Text>
          <DrawCountSelector
            value={state.drawCount}
            onValueChange={setDrawCount}
            disabled={!hydrated}
            appearance={segmentedControlAppearance}
          />
          <ToggleRow
            label="Only deal solvable games"
            description="Use curated solvable layouts when starting a new game."
            value={state.solvableGamesOnly}
            onValueChange={setSolvableGamesOnly}
            disabled={!hydrated}
          />
          <ToggleRow
            label="Auto Up"
            description="Automatically move remaining cards to foundations once every card is uncovered."
            value={state.autoUpEnabled}
            onValueChange={setAutoUpEnabled}
            disabled={!hydrated}
          />
        </YStack>

        <YStack gap="$3">
          <Text fontSize={16} fontWeight="700">
            Appearance
          </Text>
          <Paragraph color="$color10">
            Choose how the app adapts to light and dark environments.
          </Paragraph>

          <SegmentedControl
            values={themeOptions.map(({ label }) => label)}
            selectedIndex={themeOptions.findIndex(({ mode }) => mode === state.themeMode)}
            onChange={({ nativeEvent: { selectedSegmentIndex } }) => {
              const option = themeOptions[selectedSegmentIndex]
              if (option) {
                setThemeMode(option.mode)
              }
            }}
            enabled={hydrated}
            appearance={segmentedControlAppearance}
            style={{ width: '100%' }}
          />
        </YStack>

        <YStack gap="$3">
          <Text fontSize={16} fontWeight="700">
            Statistics
          </Text>
          {statisticsPreferenceDescriptors.map(({ key, label, description }) => (
            <ToggleRow
              key={key}
              label={label}
              description={description}
              value={state.statistics[key]}
              onValueChange={(enabled) => setStatisticsPreference(key, enabled)}
              disabled={!hydrated}
            />
          ))}
        </YStack>

        <YStack gap="$3">
          <Text fontSize={16} fontWeight="700">
            Advanced
          </Text>
          <ToggleRow
            label="Developer mode"
            description="Expose internal tools such as demo games and motion tuning."
            value={state.developerMode}
            onValueChange={setDeveloperMode}
            disabled={!hydrated}
          />

          {/* Developer mode keeps motion tuning out of the everyday settings flow while
              still making it easy to reach. */}
          {state.developerMode ? (
            <>
              <Separator my="$2" />
              <YStack gap="$3">
                <Text fontWeight="600">Animations</Text>
                <ToggleRow
                  label="All animations"
                  description="Turn this off to disable motion effects across the game."
                  value={state.animations.master}
                  onValueChange={setGlobalAnimationsEnabled}
                  disabled={!hydrated}
                />

                <Separator />

                <YStack gap="$3" opacity={state.animations.master ? 1 : 0.6}>
                  {animationPreferenceDescriptors.map(({ key, label, description }) => (
                    <ToggleRow
                      key={key}
                      label={label}
                      description={description}
                      value={state.animations[key]}
                      onValueChange={(enabled) => setAnimationPreference(key, enabled)}
                      disabled={!hydrated}
                      inactive={!state.animations.master}
                    />
                  ))}
                </YStack>
              </YStack>
            </>
          ) : null}
        </YStack>
      </YStack>
    </ScrollView>
  )
}

type ToggleRowProps = {
  label: string
  description?: string
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
  inactive?: boolean
}

const ToggleRow = ({
  label,
  description,
  value,
  onValueChange,
  disabled,
  inactive,
}: ToggleRowProps) => (
  <XStack gap="$3" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
    <YStack flex={1} gap="$1">
      <Text fontWeight="600" color={inactive ? '$color8' : '$color'}>
        {label}
      </Text>
      {description ? (
        <Paragraph color={inactive ? '$color9' : '$color10'}>{description}</Paragraph>
      ) : null}
    </YStack>
    <Host matchContents style={{ opacity: inactive ? 0.7 : 1 }}>
      <Switch value={value} disabled={disabled} onValueChange={onValueChange} />
    </Host>
  </XStack>
)
