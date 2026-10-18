import type { KlondikeGameSessionControls } from '../components/KlondikeGameSession'
import { createValueStore } from '../../../utils/valueStore'

// The live game session's controls (retry-and-share-deal plan). There is exactly one
// KlondikeGameSession per app, and sibling drawer screens (History → Retry/Share)
// need to reach it without threading props through the router. This replaced the
// onControlsChange prop + useState in app/(tabs)/index.tsx — router params were
// rejected (nonce + consume-once effect) and so was re-firing the soli://?deal= deep
// link (OS round-trip, link dedup swallows a repeated retry, and the dev-link path
// turns developer mode on).
const store = createValueStore<KlondikeGameSessionControls | null>(null)

export const setSessionControls = store.set
// null until the game screen has mounted its session (drawer screens mount lazily).
export const useSessionControls = store.use
