# Solvable Harvest Strategy Expo Crypto Guide

Date researched: 2026-06-18

## Sources

- Expo Crypto docs: https://docs.expo.dev/versions/latest/sdk/crypto/
- MDN `Crypto.getRandomValues`: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
- MDN `Math.random`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random

## Why This Package

The v2 deal identity plan needs random bytes so the app can sample a full-deck permutation number uniformly. This is not because the solitaire deck is secret. The benefit is better entropy, a stable Expo-supported native API on Android/iOS, and clean rejection sampling into `[0, 52! - 1]`.

`Math.random()` returns a floating-point pseudo-random number. MDN documents that the implementation chooses the seed and the user cannot choose or reset it. That is fine for casual effects, but it is a poor fit for exact-ID sampling because it pushes us toward float scaling and engine-specific behavior.

## Install

```sh
npx expo install expo-crypto
```

## API To Use

Use `Crypto.getRandomValues(typedArray)`.

Relevant Expo docs notes:

- Supported on Android, iOS, tvOS, and web.
- It fills an integer typed array in place.
- It returns the same typed array.

Example shape for implementation:

```ts
import * as Crypto from 'expo-crypto'

export function randomBytes(byteCount: number): Uint8Array {
  const bytes = new Uint8Array(byteCount)
  Crypto.getRandomValues(bytes)
  return bytes
}
```

Use those bytes to build a `BigInt`, reject values outside the accepted range, then encode the accepted value as the base36 `E1_` exact ID.

## Notes And Caveats

- Prefer `getRandomValues` over `getRandomBytes` for this feature because it is synchronous and matches the Web Crypto API shape.
- Expo documents `getRandomBytes` and `getRandomBytesAsync` as accepting `byteCount` from `0` to `1024`; our exact-ID sampler only needs small fixed-size byte buffers.
- Keep `Math.random()` only for non-durable UI randomness if needed. Do not use it for new deck identity generation.
