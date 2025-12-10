import { useLayoutEffect, useEffect, useState } from 'react'
import { Platform, Pressable, ScrollView } from 'react-native'
import { useNavigation } from 'expo-router'
import {
  Button,
  H2,
  Paragraph,
  Separator,
  Switch,
  Text,
  XStack,
  YStack,
  useTheme,
} from 'tamagui'
import { Menu } from '@tamagui/lucide-icons'

import {
  animationPreferenceDescriptors,
  type RefreshRateMode,
  type ThemeMode,
  useSettings,
  statisticsPreferenceDescriptors,
} from '../src/state/settings'
import { useDrawerOpener } from '../src/navigation/useDrawerOpener'

const themeOptions: Array<{ mode: ThemeMode; label: string }> = [
  { mode: 'auto', label: 'Auto' },
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
]

// PBI-27: Refresh rate mode options
const refreshRateOptions: Array<{ mode: RefreshRateMode; label: string; description: string }> = [
  { mode: 'high', label: 'High', description: 'Use maximum refresh rate for smoothest animations' },
  { mode: 'auto', label: 'Auto', description: 'Let Android decide based on content and battery' },
]

export default function SettingsScreen() {
  const navigation = useNavigation()
  const theme = useTheme()
  const openDrawer = useDrawerOpener()

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={openDrawer}
          accessibilityLabel="Open navigation menu"
          style={{ padding: 8 }}
        >
          <Menu size={32} color={theme.color.val as any} />
        </Pressable>
      ),
    })
  }, [navigation, openDrawer, theme])

  const {
    state,
    hydrated,
    setGlobalAnimationsEnabled,
    setAnimationPreference,
    setThemeMode,
    setSolvableGamesOnly,
    setDeveloperMode,
    setStatisticsPreference,
    setRefreshRateMode,
  } = useSettings()

  // PBI-27: Check if high refresh rate is supported (Android only)
  const [isHighRefreshRateSupported, setIsHighRefreshRateSupported] = useState(false)
  const [maxRefreshRate, setMaxRefreshRate] = useState<number | null>(null)

  useEffect(() => {
    if (Platform.OS !== 'android') return

    import('../modules/expo-refresh-rate/src')
      .then((module) => {
        setIsHighRefreshRateSupported(module.isHighRefreshRateSupported())
        setMaxRefreshRate(module.getMaxRefreshRate())
      })
      .catch(() => {
        // Module not available
      })
  }, [])

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
      <YStack gap="$5">
        <YStack gap="$2">
          <H2>Settings</H2>
          <Paragraph color="$color10">
            Personalise Solitaire animations and appearance to match your preference.
          </Paragraph>
          {!hydrated && (
            <Paragraph color="$color9">Loading your saved preferences…</Paragraph>
          )}
        </YStack>

        <YStack gap="$3">
          <Text fontSize={16} fontWeight="700">
            Animations
          </Text>
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

        <YStack gap="$3">
          <Text fontSize={16} fontWeight="700">
            Gameplay
          </Text>
          <ToggleRow
            label="Only deal solvable games"
            description="Use curated solvable layouts when starting a new game."
            value={state.solvableGamesOnly}
            onValueChange={setSolvableGamesOnly}
            disabled={!hydrated}
          />
        </YStack>

        <YStack gap="$3">
          <Text fontSize={16} fontWeight="700">
            Game statistics
          </Text>
          <Paragraph color="$color10">
            Select which in-game statistics are visible while playing Klondike.
          </Paragraph>
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
          <Paragraph color="$color10">
            Developer tooling for internal builds. Toggle to reveal experimental utilities in the app.
          </Paragraph>
          <ToggleRow
            label="Developer mode"
            description="Expose internal tooling such as solver experiments and demo games."
            value={state.developerMode}
            onValueChange={setDeveloperMode}
            disabled={!hydrated}
          />

          {/* PBI-27: Refresh rate control - Android only, devices with >60Hz support */}
          {Platform.OS === 'android' && isHighRefreshRateSupported && maxRefreshRate !== null && maxRefreshRate > 60 && (
            <>
              <Separator marginVertical="$2" />
              <YStack gap="$2">
                <Text fontWeight="600">Display refresh rate</Text>
                <Paragraph color="$color10">
                  Higher refresh rates provide smoother animations but use more battery.
                  {maxRefreshRate ? ` Your display supports up to ${Math.round(maxRefreshRate)}Hz.` : ''}
                </Paragraph>
                <XStack gap="$2" flexWrap="wrap" marginTop="$1">
                  {refreshRateOptions.map((option) => (
                    <Button
                      key={option.mode}
                      size="$2"
                      variant={state.refreshRateMode === option.mode ? undefined : 'outlined'}
                      onPress={() => setRefreshRateMode(option.mode)}
                      disabled={!hydrated}
                    >
                      {option.mode === 'high' && maxRefreshRate
                        ? `High (${Math.round(maxRefreshRate)}Hz)`
                        : option.label}
                    </Button>
                  ))}
                </XStack>
                <Paragraph color="$color9" fontSize={12}>
                  {refreshRateOptions.find((o) => o.mode === state.refreshRateMode)?.description}
                </Paragraph>
              </YStack>
            </>
          )}
        </YStack>

        <YStack gap="$3">
          <Text fontSize={16} fontWeight="700">
            Appearance
          </Text>
          <Paragraph color="$color10">
            Choose how the app adapts to light and dark environments.
          </Paragraph>

          <XStack gap="$2" flexWrap="wrap">
            {themeOptions.map((option) => (
              <Button
                key={option.mode}
                size="$2"
                variant={state.themeMode === option.mode ? undefined : 'outlined'}
                onPress={() => setThemeMode(option.mode)}
                disabled={!hydrated}
              >
                {option.label}
              </Button>
            ))}
          </XStack>
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

// PBI-17-13: Apply Material Design styling to native Android switches
const ToggleRow = ({ label, description, value, onValueChange, disabled, inactive }: ToggleRowProps) => {
  const theme = useTheme()

  // PBI-17-13: Theme-aware colors for Android native switch
  const androidNativeProps = Platform.OS === 'android' ? {
    thumbColor: value ? theme.color.val : theme.color6.val,
    trackColor: {
      false: theme.color4.val,
      true: theme.color10.val,
    },
  } : undefined

  return (
    <XStack gap="$3" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
      <YStack flex={1} gap="$1">
        <Text fontWeight="600" color={inactive ? '$color8' : '$color'}>
          {label}
        </Text>
        {description ? (
          <Paragraph color={inactive ? '$color9' : '$color10'}>{description}</Paragraph>
        ) : null}
      </YStack>
      <Switch
        native
        nativeProps={androidNativeProps}
        size="$3"
        checked={value}
        disabled={disabled}
        onCheckedChange={(checked) => onValueChange(checked === true)}
        opacity={inactive ? 0.7 : 1}
      >
        <Switch.Thumb />
      </Switch>
    </XStack>
  )
}

