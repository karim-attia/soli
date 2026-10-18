import { setPendingDealRequest } from '../src/features/klondike/state/pendingDealRequestStore'
import { isDealShareLink, parseDealShareUrl } from '../src/solitaire/dealShareLink'
import { devLog } from '../src/utils/devLogger'

// expo-router hook for incoming links (retry-and-share-deal plan). Despite the name,
// `path` is the raw URL expo-router got from Linking (verified in
// expo-router/build/getLinkingConfig.js + link/linking.js, SDK 57), for the cold-start
// URL (initial: true) and for warm links alike. Public deal links are stashed for the
// game session and rewritten to `/` so the user lands on the game screen instead of a
// `/soli/deal/<id>` route (which would hit +not-found). Everything else — including
// the dev-only soli://?deal= family, which useDemoGameLauncher's own Linking listener
// handles — passes through untouched. Must never throw (expo docs).
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (!isDealShareLink(path)) {
      return path
    }
    const request = parseDealShareUrl(path)
    if (request) {
      setPendingDealRequest(request)
    } else {
      devLog('warn', '[Link] Ignoring deal link with an invalid id', { url: path })
    }
    return '/'
  } catch (error) {
    devLog('warn', '[Link] redirectSystemPath failed; falling back to home', error)
    return '/'
  }
}
