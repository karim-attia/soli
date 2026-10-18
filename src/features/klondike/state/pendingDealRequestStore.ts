import type { DealShareRequest } from '../../../solitaire/dealShareLink'
import { createValueStore } from '../../../utils/valueStore'

// Hand-off slot between expo-router's +native-intent (which sees an incoming
// https://karimattia.ch/soli/deal/… or soli://soli/deal/… link before any screen
// exists) and the game session (which owns the "replace the running game?" prompt).
// A store rather than a route screen because on a cold start the game session is
// not mounted yet — useKlondikeGame consumes the request once persistence has
// hydrated, so the link is never dropped and never races the saved-game restore.
// Opening the same link twice sets the slot twice → two prompts, by design (no dedup).
const store = createValueStore<DealShareRequest | null>(null)

export const setPendingDealRequest = store.set
export const clearPendingDealRequest = () => store.set(null)
export const usePendingDealRequest = store.use
