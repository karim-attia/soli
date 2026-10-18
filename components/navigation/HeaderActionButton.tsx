import { HeaderTextButton } from './HeaderTextButton'

// The Play-screen header actions ("New Game", dev "Demo"), native per platform — Karim's
// decision 2026-10-18 (plan "prompt 6"): iOS keeps the router text action (HeaderTextButton,
// the UIBarButtonItem look), Android gets a Material 3 FilledTonalButton — see
// HeaderActionButton.android.tsx. Same props on both so call sites don't branch.
export type HeaderActionButtonProps = {
  label: string
  onPress: () => void
  accessibilityLabel?: string
}

export const HeaderActionButton = HeaderTextButton
