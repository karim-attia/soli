// Pls don't suggest to rename from hello to about, it's intentional.
import { useLayoutEffect } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { useNavigation } from 'expo-router'

import { useDrawerOpener } from '../../src/navigation/useDrawerOpener'
import { SPACE, usePalette } from '../../src/theme/tokens'
import { AppText } from '../../components/AppText'
import {
  HeaderMenuButton,
  HEADER_MENU_LEADING_PADDING,
} from '../../components/navigation/HeaderMenuButton'

const openUrl = (url: string) => () => void Linking.openURL(url)

export default function HelloScreen() {
  const navigation = useNavigation()
  const openDrawer = useDrawerOpener()
  const palette = usePalette()

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

  // Plain RN here on purpose (Tamagui removal 2026-10-18, Expo UI audit): static copy with
  // inline links; Expo UI's universal Text has no inline links and a Host adds nothing.
  // The links keep Tamagui `Anchor`'s look: Paragraph metrics (`body`) + a link colour.
  return (
    <View style={styles.screen}>
      <View style={styles.column}>
        <View style={styles.byline}>
          <AppText style={styles.centered}>Made by</AppText>
          <AppText color={palette.blue10} onPress={openUrl('https://x.com/carimatia')}>
            @carimatia
          </AppText>
          <AppText style={styles.centered}>
            For my girlfriend T because she always had to look at ads when playing
            Solitaire.
          </AppText>
        </View>

        <View style={styles.paragraphs}>
          <AppText style={styles.centered}>
            Free and{' '}
            <AppText
              color={palette.accent10}
              onPress={openUrl('https://github.com/karim-attia/soli')}
            >
              open source
            </AppText>{' '}
            Solitaire app.
          </AppText>
          <AppText style={styles.centered}>
            No ads, in-app purchases, or gamification to get you to play more.
          </AppText>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: SPACE[4],
    paddingVertical: SPACE[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  column: {
    gap: SPACE[5],
    width: '100%',
    maxWidth: 560,
    alignItems: 'center',
  },
  byline: {
    flexDirection: 'row',
    gap: SPACE[2],
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paragraphs: {
    gap: SPACE[2],
    maxWidth: 560,
  },
  centered: {
    textAlign: 'center',
  },
})
