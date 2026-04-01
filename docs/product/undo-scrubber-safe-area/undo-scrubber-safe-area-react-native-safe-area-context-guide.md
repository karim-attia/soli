# Undo Scrubber Safe Area react-native-safe-area-context guide

Date: 2026-04-01

## Purpose

Fresh cache of the safe-area API details relevant to the Android undo scrubber regression fix.

## Source links

- Expo library reference: [react-native-safe-area-context](https://docs.expo.dev/versions/latest/sdk/safe-area-context/)
- Expo system bars guide: [System bars](https://docs.expo.dev/develop/user-interface/system-bars/)
- Safe Area Context API: [SafeAreaView](https://appandflow.github.io/react-native-safe-area-context/api/safe-area-view/)

## Key takeaways

- Expo SDK 55 currently bundles `react-native-safe-area-context` `~5.6.2`.
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
