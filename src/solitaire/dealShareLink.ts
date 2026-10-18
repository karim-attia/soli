import { EXACT_ID_PREFIX, type ExactDealId, parseExactDealId } from './dealIdentity'
import { type DrawCount, isDrawCount } from './drawCount'

// Public "share a deal" links (retry-and-share-deal plan).
//
//   https://karimattia.ch/soli/deal/<exactId>?draw=<n>   ← what people share
//   soli://soli/deal/<exactId>?draw=<n>                  ← same path via the app scheme
//
// The identifier is the existing E1_ exact deal id (full 52-card order, ~44 base36
// chars) so there is no server, database or short-code registry — the link IS the
// deal. `draw` is optional; a missing/invalid value means "receiver's preferred draw
// count". Both forms map to the same expo-router path (`/soli/deal/<id>`), which is
// what lets the web fallback page offer an "Open in Soli" button and lets agents test
// before the domain association is live. Deliberately separate from the dev-only
// `soli://?deal=` link (useDemoGameLauncher): that one replaces the game silently and
// turns developer mode on — fine for testing, wrong for a link a friend taps.
export const DEAL_SHARE_HOST = 'karimattia.ch'
export const DEAL_SHARE_PATH_PREFIX = '/soli/deal'

export type DealShareRequest = {
  exactId: ExactDealId
  drawCount?: DrawCount
}

const dealPath = (exactId: ExactDealId, drawCount?: DrawCount) =>
  `${DEAL_SHARE_PATH_PREFIX}/${exactId}${drawCount ? `?draw=${drawCount}` : ''}`

export const buildDealShareUrl = (exactId: ExactDealId, drawCount: DrawCount): string =>
  `https://${DEAL_SHARE_HOST}${dealPath(exactId, drawCount)}`

export const buildDealSchemeUrl = (exactId: ExactDealId, drawCount?: DrawCount): string =>
  `soli://${dealPath(exactId, drawCount).slice(1)}`

// Shape match only. Accepts `https://[www.]karimattia.ch/soli/deal/<id>`, the scheme
// twin `soli://soli/deal/<id>` and `soli:///soli/deal/<id>` (Android sometimes adds the
// third slash), each with optional `?draw=n` and `#fragment` (the deeplink wrapper's
// retry nonce). Groups: 1 = raw id, 2 = query string.
const DEAL_SHARE_LINK_PATTERN =
  /^(?:https?:\/\/(?:www\.)?karimattia\.ch|soli:\/\/\/?)\/?soli\/deal\/([^/?#]+)\/?(?:\?([^#]*))?(?:#.*)?$/i

export const isDealShareLink = (url: string): boolean => DEAL_SHARE_LINK_PATTERN.test(url)

// Returns the request for a valid deal link, null for anything else — including a
// deal-shaped link whose id does not decode (callers then land on the game screen
// and devLog, never throw: this runs inside expo-router's redirectSystemPath).
export const parseDealShareUrl = (url: string): DealShareRequest | null => {
  const match = DEAL_SHARE_LINK_PATTERN.exec(url)
  if (!match) {
    return null
  }
  // Ids are base36 and compared case-sensitively against history rows, so normalise
  // to the lowercase form encodeExactDealId produces.
  const rawId = decodeURIComponent(match[1])
  if (!rawId.toUpperCase().startsWith(EXACT_ID_PREFIX)) {
    return null
  }
  const exactId = `${EXACT_ID_PREFIX}${rawId.slice(EXACT_ID_PREFIX.length).toLowerCase()}`
  try {
    // Prefix, base36 payload and permutation range — the same check the dev link uses.
    parseExactDealId(exactId)
  } catch {
    return null
  }
  const draw = Number(new URLSearchParams(match[2] ?? '').get('draw'))
  return {
    exactId: exactId as ExactDealId,
    drawCount: isDrawCount(draw) ? draw : undefined,
  }
}
