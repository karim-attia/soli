# React Native Safe Area Context Guide

Last refreshed: 2026-07-05

## Scope

- Package/tool: `react-native-safe-area-context`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this guide as the current source-backed reference for Soli work involving this package or tool.

## Source-backed notes

Date: 2026-04-01
Refresh check: 2026-07-03

## Purpose

Fresh cache of the safe-area API details relevant to Android edge-to-edge and bottom
system navigation overlap fixes.

## Source links

- Expo library reference: [react-native-safe-area-context](https://docs.expo.dev/versions/latest/sdk/safe-area-context/)
- Expo SDK 56 library reference: [react-native-safe-area-context](https://docs.expo.dev/versions/v56.0.0/sdk/safe-area-context/)
- Expo system bars guide: [System bars](https://docs.expo.dev/develop/user-interface/system-bars/)
- React Navigation safe areas: [Supporting safe areas](https://reactnavigation.org/docs/handling-safe-area/)
- Safe Area Context API: [SafeAreaView](https://appandflow.github.io/react-native-safe-area-context/api/safe-area-view/)
- npm latest metadata: [react-native-safe-area-context latest](https://registry.npmjs.org/react-native-safe-area-context/latest)

## Refresh check (2026-07-03)

Status: updated and still useful.

- Soli currently has `react-native-safe-area-context` `~5.7.0` in `package.json`.
- The Expo SDK 56 library reference recommends `~5.7.0`; npm latest is `5.8.0`, so
  use `npx expo install react-native-safe-area-context` for any future upgrade rather
  than taking npm latest directly.
- The App & Flow API docs still support object-form `edges` with `off`, `additive`,
  and `maximum` modes, and still document `mode="margin"` / `mode="padding"`.

## Refresh check (2026-07-05)

Status: updated for the Expo UI Settings screen.

- Soli currently has `react-native-safe-area-context` `~5.7.0` in `package.json`.
- Current Expo docs still document `SafeAreaView`, `SafeAreaProvider`, and
  `useSafeAreaInsets`.
- Expo docs say `SafeAreaView` applies safe-area edges as padding, and custom padding is
  added to the safe-area padding.
- React Navigation docs note Android edge-to-edge draws under translucent system bars and
  recommend explicit safe-area handling.
- Clean iOS simulator validation confirmed the current bottom-edged `SafeAreaView` does
  not prevent the native Expo UI `FieldGroup`/SwiftUI Form from reaching its final row.
  The initial viewport shows only part of the Animations section, but a direct Form swipe
  reaches the absolute end with `Win celebrations` and the rounded section bottom fully
  visible above the system area. No extra iOS padding or nested ScrollView is needed.

## Key takeaways

- Expo SDK 56 currently recommends `react-native-safe-area-context` `~5.7.0`.
- Expo’s system-bars guide says Android edge-to-edge layouts now need explicit safe-area handling so content does not overlap system bars.
- `useSafeAreaInsets()` gives direct access to `top`, `right`, `bottom`, and `left` insets, but the docs call it a more advanced use case.
- The docs recommend `SafeAreaView` when possible because it is implemented natively.
- `SafeAreaView` can apply insets as `padding` or `margin`.
- `edges` can be an object using edge modes:
  - `additive`: add safe area and style value together
  - `maximum`: use the larger of safe area or style value
- The official example for a floating bottom element is:
  - `style={{ paddingBottom: 24 }}`
  - `edges={{ bottom: 'maximum' }}`

## Relevant examples

```tsx
import { SafeAreaView } from 'react-native-safe-area-context'

<SafeAreaView
  mode="margin"
  edges={{ bottom: 'maximum', left: 'off', right: 'off', top: 'off' }}
  style={{ marginBottom: 20 }}
>
  {children}
</SafeAreaView>
```

Why this matters here:
- `mode="margin"` keeps the floating control’s internal height stable.
- `bottom: 'maximum'` preserves a minimum offset on flat-bottom devices while still clearing larger Android/iOS bottom insets.
- This avoids blindly summing `safeArea.bottom + fixedPadding`, which can create larger-than-intended gaps for floating bottom UI.

## Implementation note for this repo

- Prefer `SafeAreaView` for the undo scrubber wrapper instead of manual bottom padding when the goal is “float above the system area by at least X”.
- Keep the change local to the scrubber so the board layout and other overlays do not inherit new bottom spacing rules accidentally.
- For the Expo UI Settings form, wrap the full-height native `Host` in a bottom-edged
  `SafeAreaView` instead of nesting `FieldGroup` in a React Native `ScrollView`.
  `FieldGroup` should keep owning the scroll behavior while the outer safe-area wrapper
  prevents Android's system navigation area from covering the last rows.
- Do not infer clipping from an intermediate iOS scroll position. Verify the Form's true
  scroll end before changing safe-area geometry.
