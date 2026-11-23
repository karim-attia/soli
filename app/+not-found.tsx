import { Link, Stack } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { AppText } from '../components/AppText'
import { t } from '../src/i18n'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: t('nav.notFoundTitle') }} />
      <View style={styles.container}>
        <AppText variant="plain">{t('nav.notFoundBody')}</AppText>
        <Link href="/" style={styles.link}>
          <AppText variant="plain" style={styles.linkText}>
            {t('nav.notFoundLink')}
          </AppText>
        </Link>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    margin: 10,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
})
