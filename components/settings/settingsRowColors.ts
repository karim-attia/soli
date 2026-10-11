// Text colours for the settings rows built on @expo/ui primitives.
//
// These have to be ONE hardcoded value each, with no theme branch: the rows
// render inside the Host's own chrome (light or dark, following the system),
// and nothing in this tree ever learns which one it got — there is no theme
// context to read and no useColorScheme value that is guaranteed to match the
// Host. So every value here must be legible on BOTH grounds at once.
//
// #8E8E93 is iOS systemGray: the colour secondaryLabel actually resolves to on
// the light AND the dark grouped-list background, which is exactly the property
// a single hardcoded value needs. Measured (WCAG contrast, pinned in
// test/unit/components/settingsRowColors.test.ts):
//   vs #FFFFFF (light row)  ≈ 3.26:1
//   vs #1C1C1E (dark row)   ≈ 5.22:1
export const SETTINGS_ROW_SECONDARY_TEXT_COLOR = '#8E8E93'

// A disabled row uses the SAME secondary gray for its description and steps its
// LABEL down to it from the Host's primary text colour; together with the inert
// switch, that is the disabled signal.
//
// Deliberately not a third, dimmer value. "Muted" means lower contrast, and
// lower contrast is LIGHTER on a light ground but DARKER on a dark one, so no
// single hex can be muted on both. The previous attempt (#5A5A5F for the
// disabled description) proved it: darker than the enabled colour, it read as
// muted on white but collapsed to ~2.5:1 on a dark row — the description
// vanished instead of reading as disabled, which is worse than not dimming it.
export const SETTINGS_ROW_DISABLED_TEXT_COLOR = SETTINGS_ROW_SECONDARY_TEXT_COLOR
