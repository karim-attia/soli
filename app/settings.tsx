import { useCallback, useLayoutEffect } from 'react'
import { ScrollView } from 'react-native'
import { DrawerActions } from '@react-navigation/native'
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
} from 'tamagui'
import { Menu } from '@tamagui/lucide-icons'

import {
  animationPreferenceDescriptors,
  type ThemeMode,
  useSettings,
} from '../src/state/settings'

const themeOptions: Array<{ mode: ThemeMode; label: string }> = [
  { mode: 'auto', label: 'Auto' },
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
]

export default function SettingsScreen() {
  const navigation = useNavigation()

  const openDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer())
  }, [navigation])

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button
          size="$2.5"
          circular
          icon={Menu}
          accessibilityLabel="Open navigation menu"
          onPress={openDrawer}
        />
      ),
    })
  }, [navigation, openDrawer])

  const {
    state,
    hydrated,
    setGlobalAnimationsEnabled,
    setAnimationPreference,
    setThemeMode,
    setSolvableGamesOnly,
  } = useSettings()

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

const ToggleRow = ({ label, description, value, onValueChange, disabled, inactive }: ToggleRowProps) => (
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
      size="$3"
      checked={value}
      disabled={disabled}
      onCheckedChange={(checked) => onValueChange(checked === true)}
      opacity={inactive ? 0.7 : 1}
    >
      <Switch.Thumb animation="quick" />
    </Switch>
  </XStack>
)

