# Expo UI Guide For History Preview Sheet

- Package: `@expo/ui`
- Retrieved: 2026-06-14
- Primary docs:
  - https://docs.expo.dev/versions/latest/sdk/ui/
  - https://docs.expo.dev/versions/latest/sdk/ui/universal/bottomsheet/
  - https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/bottomsheet/
  - https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/bottomsheet/
  - https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/host/
  - https://docs.expo.dev/versions/latest/sdk/ui/universal/rnhostview/
  - https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/rnhostview/

## Package facts

- Expo UI provides native UI components backed by Jetpack Compose and SwiftUI, plus
  universal components for Android, iOS, and web.
- Expo SDK 56 docs list `@expo/ui` bundled version `~56.0.17`.
- Install with:

```sh
npx expo install @expo/ui
```

## Universal BottomSheet API notes

- Import:

```ts
import { BottomSheet, Host, RNHostView } from '@expo/ui'
```

- Visibility is controlled with `isPresented`.
- Dismissal is reported with `onDismiss`.
- The drag handle can be hidden with `showDragIndicator={false}`.
- `snapPoints` accepts:
  - `'half'`
  - `'full'`
  - `{ fraction: number }`
  - `{ height: number }`
- `{ fraction }` and `{ height }` are precise on iOS and web.
- On Android, fixed and fractional snap points map to the nearest `half` or `full`
  native state.
- React Native scrollable content should be wrapped in `RNHostView` when used inside
  the universal Expo UI sheet.
- `RNHostView` bridges React Native layout into native Expo UI layout. `matchContents`
  sizes the native parent to the child; omitting it lets flexible children fill the
  available parent.

## Drop-in BottomSheet API notes

- Import:

```ts
import { BottomSheet, BottomSheetView } from '@expo/ui/community/bottom-sheet'
```

- The API is compatible with `@gorhom/bottom-sheet` where native platform behavior
  allows.
- `BottomSheet` defaults to opening at `index={0}` on mount; `index={-1}` starts
  closed.
- `snapPoints` accepts `(string | number)[]`, so current percentage snap points should
  be passed as strings such as `65%`.
- `enablePanDownToClose` allows pan-down dismissal. Expo docs note that this also
  enables Android Back and scrim dismissal for the native sheet.
- `onClose` fires when the sheet fully closes.
- `onDismiss` is an alias for `onClose` for modal compatibility.
- `BottomSheetView` is the documented content wrapper for non-scroll dynamic content.
- `BottomSheetFlatList` and `BottomSheetScrollView` are compatibility re-exports of
  React Native list/scroll components.
- Platform behavior:
  - Android: Jetpack Compose modal bottom sheet.
  - iOS: SwiftUI sheet.
  - Web: drawer overlay.
- Snap behavior:
  - Android maps snap points to native partial and expanded states.
  - iOS and web support provided snap points.
- Compatibility note: animation, over-drag, keyboard, custom backdrop, custom
  background, custom footer, and related props can be accepted but may not change
  native behavior.

## Choice for Soli History preview

Use the universal `BottomSheet` from `@expo/ui` on Android, iOS, and web. Omit
`snapPoints` so the sheet sizes itself to its content, and wrap the existing
React Native/Tamagui preview in universal `RNHostView matchContents`.

Reasons:

- This is Expo's documented cross-platform API for new code.
- History preview does not need multiple detents or full-screen expansion.
- Omitting `snapPoints` uses Expo's documented fit-to-content behavior.
- The native drag indicator, pan, Android Back, scrim, and dismissal behavior stay
  owned by Expo UI and the platform.
- Universal `RNHostView matchContents` is the documented bridge for React Native
  content whose intrinsic size should determine the native sheet size.
- The universal web implementation includes the required hidden Vaul/Radix title and
  avoids the community web fallback's accessibility warnings.

Implementation notes:

- Do not pass `snapPoints`; content-sized sheets avoid the unnecessary full-screen
  state and preserve the native drag indicator.
- Keep the shared wrapper at the API minimum:

```tsx
<BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
  <RNHostView matchContents>{children}</RNHostView>
</BottomSheet>
```

- `BottomSheet` renders a Compose/SwiftUI hierarchy. Tamagui and React Native elements
  belong to React Native's Yoga/native-view hierarchy, so they are not native Expo UI
  children that Compose or SwiftUI can render directly.
- `RNHostView` creates the bridge point where that React Native hierarchy is mounted
  inside the native Expo UI hierarchy.
- `matchContents` makes the host report the React Native child's measured size to the
  native layout so the sheet can derive its intrinsic height. Without it, the host
  fills the native parent and reports that parent size back to Yoga.
- Keep feature-specific layout outside the wrapper. History gives its seven-column
  board a responsive width equal to the viewport minus Expo's 16-per-side content
  inset; this replaces the previous board `onLayout` state and height feedback.
- Android Material can still create a partial anchor when intrinsic sheet content is
  taller than half the available height. The universal Expo API does not currently
  expose Compose's `skipPartiallyExpanded` independently of full-height snap-point
  behavior, so accepting that native settle is simpler than adding a platform wrapper.
- The published SDK 56 package predates an upstream
  `ShadowNodeProxy` validity guard for deferred size updates after unmount. Using
  `matchContents` avoids the Compose-size-to-Yoga callback involved in the reproduced
  crash, but repeated connected-device dismissal remains required validation.
- Clear the selected History entry directly from Expo UI's native `onDismiss`
  callback; no separate open state or animation timeout is needed.
