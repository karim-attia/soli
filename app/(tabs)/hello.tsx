import { useLayoutEffect } from 'react'
import { Pressable } from 'react-native'
import { useNavigation } from 'expo-router'
import { Anchor, Button, Paragraph, View, XStack, YStack, YGroup, ListItem, Separator, useTheme } from 'tamagui'
import { Menu } from '@tamagui/lucide-icons'
import { useDrawerOpener } from '../../src/navigation/useDrawerOpener'

export default function HelloScreen() {
  const navigation = useNavigation()
  const theme = useTheme()
  const openDrawer = useDrawerOpener()

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Hello',
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

  return (
    <View flex={1} px="$4" py="$4" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <YStack gap="$5" width="100%" style={{ maxWidth: 560, alignItems: 'center' }}>
        <XStack gap="$2" style={{ flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
          <Paragraph style={{ textAlign: 'center' }}>Made by</Paragraph>
          <Anchor color="$blue10" href="https://x.com/carimatia" target="_blank">
            @carimatia
          </Anchor>
        </XStack>

        <YStack gap="$2" style={{ maxWidth: 560 }}>
          <Paragraph style={{ textAlign: 'center' }}>
            Free and{' '}
            <Anchor
              color="$accent10"
              href="https://github.com/karim-attia/soli"
              target="_blank"
              rel="noreferrer"
            >
              open source
            </Anchor>{' '}
            Solitaire app.
          </Paragraph>
          <Paragraph style={{ textAlign: 'center' }}>
            No ads, in-app purchases, or gamification to get you to play more.
          </Paragraph>
        </YStack>

      </YStack>
    </View>
  )
}

