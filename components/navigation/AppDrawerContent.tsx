import { Linking, Platform } from 'react-native'
import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
  type DrawerContentComponentProps,
} from 'expo-router/drawer'
import { useTheme } from 'tamagui'
import { Star } from '@tamagui/lucide-icons-2'

// Product decision: "Rate Soli" opens the store's review page instead of the native in-app
// rating sheet (expo-store-review). The in-app sheet is quota-limited on both platforms, never
// shows for people who already rated / TestFlight / sideloaded builds, and gives no signal when
// it was suppressed -> a button wired to it would sometimes silently do nothing. Apple and
// Google both recommend a store link for persistent buttons. We also deliberately have no
// automatic review prompt: Soli should never nag.
const STORE_REVIEW_URLS = Platform.select({
  ios: {
    // Opens the App Store directly on the "Write a Review" sheet.
    app: 'itms-apps://apps.apple.com/app/id6755950876?action=write-review',
    web: 'https://apps.apple.com/app/id6755950876?action=write-review',
  },
  default: {
    // Android has no write-review deep link; showAllReviews lands on the reviews section.
    app: 'market://details?id=ch.karimattia.soli&showAllReviews=true',
    web: 'https://play.google.com/store/apps/details?id=ch.karimattia.soli&showAllReviews=true',
  },
})

// Falls back to the https link where no store app exists (iOS simulator, devices without Play).
const openStoreReview = () =>
  Linking.openURL(STORE_REVIEW_URLS.app).catch(() => Linking.openURL(STORE_REVIEW_URLS.web))

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const theme = useTheme()

  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Rate Soli"
        inactiveTintColor={theme.color?.val}
        icon={({ color, size }) => <Star color={color as any} size={size} />}
        onPress={() => {
          // Close first so the drawer isn't still open when the user comes back from the store.
          props.navigation.closeDrawer()
          void openStoreReview()
        }}
      />
    </DrawerContentScrollView>
  )
}
