# Rust Mobile Guide

Last refreshed: 2026-07-03

## Scope

- Package/tool: `uniffi`, `cargo-ndk`, and Rust mobile bridge tooling
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this guide as the current source-backed reference for Soli work involving this package or tool.

## Source-backed notes

Date researched: 2026-06-17

## Source links

- React Native Turbo Native Modules: https://reactnative.dev/docs/turbo-native-modules-introduction
- Expo native module tutorial: https://docs.expo.dev/modules/native-module-tutorial/
- Expo modules API reference: https://docs.expo.dev/modules/module-api/
- UniFFI docs: https://docs.rs/crate/uniffi/latest
- UniFFI for React Native: https://github.com/jhugman/uniffi-bindgen-react-native
- UniFFI for React Native docs: https://jhugman.github.io/uniffi-bindgen-react-native/
- cargo-ndk: https://github.com/bbqsrc/cargo-ndk
- Android NDK ABIs: https://developer.android.com/ndk/guides/abis
- Rust rand `SmallRng`: https://docs.rs/rand/latest/rand/rngs/struct.SmallRng.html
- Rust Rand reproducibility: https://rust-random.github.io/book/crate-reprod.html
- MIT license text: https://opensource.org/license/mit

## Rust in a React Native / Expo app

Rust can run inside native iOS and Android apps, but it is not "just import a crate from TypeScript." It needs a native module boundary.

Likely integration paths:

- Expo Module wrapping a native library.
- React Native Turbo Native Module.
- UniFFI-generated Swift/Kotlin bindings, optionally with `uniffi-bindgen-react-native`.
- Manual C ABI/JNI/Swift bridging.

For this app, an Expo Module or Turbo Module wrapper is the most natural app-facing shape. UniFFI is attractive because it can generate cross-platform bindings from one Rust API instead of hand-writing Swift and Kotlin glue.

## Android build notes

Android needs Rust compiled into native `.so` libraries for target ABIs. `cargo-ndk` is the common helper because it configures Android NDK builds and can generate the correct `jniLibs` structure.

## iOS build notes

iOS needs Rust compiled as a static or dynamic library for iOS simulator and device targets, then linked through Xcode/CocoaPods or an Expo native module. The build scripts must produce separate simulator/device artifacts or an XCFramework.

## Performance expectations

Generating a deck/tableau from a seed is tiny work and does not require shipping Rust. JavaScript or TypeScript can do it instantly if the shuffle algorithm is fixed and simple.

Running the solver on-device is different. Lonelybot is very fast on local desktop tests, but worst-case solving can still take milliseconds to seconds depending on draw step and position. In-app solving should therefore be asynchronous, cancelable, and bounded. A hint button can ask for "first solving move within budget" instead of blocking the UI until a proof is complete.

## Seed reproducibility warning

Lonelybot `default` currently uses `SmallRng::seed_from_u64(seed)` and `SliceRandom::shuffle`. `SmallRng` is deterministic for a given build, but its docs describe it as a small, fast generator, not a portable deal standard. Some `rand` documentation has explicitly warned that small RNG algorithms may change and should not be treated as reproducible across versions/platforms.

Do not make Lonelybot `default` seeds the only durable on-device identity unless we also freeze:

- lonelybot version/commit
- `rand` version
- exact shuffle implementation
- card ordering
- stock/tableau orientation

Safer options:

- Store the canonical 52-card permutation.
- Store Lonelybot `exact` seed, which encodes the permutation.
- Define our own app seed type using a named stable PRNG and checked fixture tests.
- Store both `seed` and a compact deck checksum/permutation for migration confidence.

## License note

Lonelybot's local `LICENSE` is MIT. MIT is permissive and generally allows use, modification, distribution, sublicensing, and sale as long as the copyright and permission notice are included. This is not legal advice, but there is no GPL-style copyleft issue from Lonelybot itself.

## Recommended app boundary

Phase 1: do not ship Rust. Generate and solve offline, ship a compact curated index.

Phase 2: if hint/current-position solving becomes a real product feature, ship a Rust native module with:

- `generateDeal(seedType, seed) -> Deal`
- `solveInitial(seedType, seed, drawCount, budgetMs) -> SolveResult`
- `solvePosition(position, drawCount, budgetMs) -> SolveResult`
- `nextHint(position, drawCount, budgetMs) -> HintResult`

The module should never run long work on the JS thread.

## Refresh check (2026-07-03)

- Status: still useful as the "do not ship Rust yet" boundary, with updated
  version facts for future native-module planning.
- Current checks: `uniffi` latest is `0.32.0`, `uniffi-bindgen-react-native` npm
  latest is `0.31.0-3`, `cargo-ndk` latest is `4.1.2`, and `rand` latest is
  `0.10.2`.
- The React Native Turbo Native Modules docs now explicitly target the New
  Architecture path; for Expo SDK 56, an Expo Module remains the most natural
  app-facing wrapper if this product ever needs in-app solving.
- `uniffi-bindgen-react-native` now also documents `@ubjs/core` and `@ubjs/node`
  package identities. Treat it as a serious option for a future cross-platform
  Rust API, but only after a dedicated spike because it adds generated native
  code, JSI/TurboModule wiring, and platform build complexity.
- The `SmallRng` warning is stronger, not weaker: Rust Rand documents limited
  reproducibility guarantees and permits value-breaking changes for
  non-portable deterministic items. Store exact deck identity or a named stable
  PRNG/permutation format for app data.
