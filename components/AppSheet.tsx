import { forwardRef, useEffect, useRef } from 'react'
import type React from 'react'
import { BackHandler, Platform } from 'react-native'
import { Sheet } from 'tamagui'

type TamaguiSheetProps = React.ComponentPropsWithoutRef<typeof Sheet>
type TamaguiSheetRef = React.ComponentRef<typeof Sheet>

type AppSheetProps = Omit<TamaguiSheetProps, 'open' | 'onOpenChange'> & {
  open: boolean
  onOpenChange: NonNullable<TamaguiSheetProps['onOpenChange']>
  dismissOnAndroidBack?: boolean
}

const AppSheetRoot = forwardRef<TamaguiSheetRef, AppSheetProps>(
  (
    { dismissOnAndroidBack = true, open, onOpenChange, ...sheetProps }: AppSheetProps,
    ref
  ) => {
    const onOpenChangeRef = useRef(onOpenChange)
    onOpenChangeRef.current = onOpenChange

    useEffect(() => {
      if (Platform.OS !== 'android' || !open || !dismissOnAndroidBack) {
        return
      }

      // Tamagui's Android modal Sheet is portal-based, so consume Back before the
      // navigator can change the route underneath it.
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        onOpenChangeRef.current(false)
        return true
      })

      return () => {
        subscription.remove()
      }
    }, [dismissOnAndroidBack, open])

    return <Sheet {...sheetProps} ref={ref} open={open} onOpenChange={onOpenChange} />
  }
)

AppSheetRoot.displayName = 'AppSheet'

export const AppSheet = Object.assign(AppSheetRoot, {
  Frame: Sheet.Frame,
  Overlay: Sheet.Overlay,
  Handle: Sheet.Handle,
  ScrollView: Sheet.ScrollView,
})
