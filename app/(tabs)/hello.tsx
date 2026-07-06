// Pls don't suggest to rename from hello to about, it's intentional.
import { useLayoutEffect } from 'react'
import { useNavigation } from 'expo-router'
import { Anchor, Paragraph, View, XStack, YStack } from 'tamagui'
import { useDrawerOpener } from '../../src/navigation/useDrawerOpener'
import {
  HeaderMenuButton,
  HEADER_MENU_LEADING_PADDING,
} from '../../components/navigation/HeaderMenuButton'

export default function HelloScreen() {
  const navigation = useNavigation()
  const openDrawer = useDrawerOpener()

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Hello',
      headerLeft: () => <HeaderMenuButton onPress={openDrawer} />,
      headerLeftContainerStyle: {
        paddingLeft: HEADER_MENU_LEADING_PADDING,
      },
      headerRight: () => null,
    })
  }, [navigation, openDrawer])

  return (
    <View
      flex={1}
      px="$4"
      py="$4"
      style={{ alignItems: 'center', justifyContent: 'center' }}
    >
      <YStack gap="$5" width="100%" style={{ maxWidth: 560, alignItems: 'center' }}>
        <XStack
          gap="$2"
          style={{ flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}
        >
          <Paragraph style={{ textAlign: 'center' }}>Made by</Paragraph>
          <Anchor color="$blue10" href="https://x.com/carimatia" target="_blank">
            @carimatia
          </Anchor>
          <Paragraph style={{ textAlign: 'center' }}>
            For my girlfriend T because she always had to look at ads when playing
            Solitaire.
          </Paragraph>
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
