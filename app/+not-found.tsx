import { Link, Stack } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { AppText } from '../components/AppText'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <AppText variant="plain">This screen doesn't exist.</AppText>
        <Link href="/" style={styles.link}>
          <AppText variant="plain" style={styles.linkText}>
            Go to home screen!
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
