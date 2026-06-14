import { type ReactElement } from 'react'
import { BottomSheet, RNHostView } from '@expo/ui'

type AppSheetProps = {
  children: ReactElement
  isPresented: boolean
  onDismiss: () => void
}

export function AppSheet({ children, isPresented, onDismiss }: AppSheetProps) {
  return (
    <BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
      <RNHostView matchContents>{children}</RNHostView>
    </BottomSheet>
  )
}
