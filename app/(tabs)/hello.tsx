import { useCallback, useLayoutEffect } from 'react'
import { DrawerActions } from '@react-navigation/native'
import { useNavigation } from 'expo-router'
import { Anchor, Button, Paragraph, View, XStack } from 'tamagui'
import { Menu } from '@tamagui/lucide-icons'

export default function HelloScreen() {
  const navigation = useNavigation()

  const openDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer())
  }, [navigation])

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Hello',
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

  return (
    <View flex={1} items="center" justify="center" px="$4">
      <XStack gap="$2" flexWrap="wrap" justify="center">
        <Paragraph text="center">Made by</Paragraph>
        <Anchor color="$blue10" href="https://x.com/carimatia" target="_blank">
          @carimatia
        </Anchor>
        <Paragraph text="center">·</Paragraph>
        <Anchor
          color="$accent10"
          href="https://github.com/karim-attia/soli"
          target="_blank"
          rel="noreferrer"
        >
          Source is here
        </Anchor>
      </XStack>
      <Paragraph text="center" mt="$4">Free and open source Solitaire app.</Paragraph>
      <Paragraph text="center">No ads, in-app purchases, or gamification to get you to play more.</Paragraph>
      <Paragraph text="center" mt="$2">Features</Paragraph>
      <Paragraph text="center">• Klondike with draw 1 and undo.</Paragraph>
      <Paragraph text="center">• Auto-complete whan all cards are face up.</Paragraph>
    </View>
  )
}

