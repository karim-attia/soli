# 30-1 React Guide

- **Package**: `react` / `react-dom`
- **Retrieved**: 2026-03-02
- **Primary docs**:
  - React 19.2 release: https://react.dev/blog/2025/10/01/react-19-2
  - React upgrade recommendations (via Expo SDK 55 matrix): https://docs.expo.dev/versions/v55.0.0/

## Version Alignment for SDK 55
- Target `react@19.2.0`
- Target `react-dom@19.2.0` (for web builds)

## React 19.2 Highlights Relevant to This Repo
- `Activity` API is available for state-preserving hide/show flows.
- `useEffectEvent` helps isolate non-reactive logic from reactive effects.
- Server Components are stabilized, but this Expo RN app does not require adopting them for this task.

## Migration Guidance for This App
- Prioritize version alignment and runtime/test stability over feature adoption.
- Keep existing React patterns unless a concrete bug or warning appears during upgrade validation.
- Update `@types/react` to the matching major/minor for accurate TS behavior.

## Example (Optional modern pattern)
```tsx
import { useEffectEvent } from 'react'

const onConnected = useEffectEvent(() => {
  // non-reactive callback logic
})
```

## Task 30-1 Usage Notes
- No broad React API rewrite is required just to move from `19.1` to `19.2`.
- Focus on dependency consistency and warnings/errors surfaced by TypeScript, Expo doctor, and runtime tests.

