# Retry a deal from History + Share a deal

## User prompt

"Hey, please think through what restarting a game and what sharing a game would mean. I guess restarting would be adding, like, I don't know, button or I don't know some way in like the sheet in the history to restart the game. I guess it would be like from the current like where it was left off or from scratch would also be fine honestly. I don't even know if we have like the history up to like the last point or like you know if we call it a retry button, if you also hear what would be our recommendation if we call it a retry button to just start this deal from scratch. And if this is rather simple, or like think it through, and if this is rather simple and easy doable, please directly implement it. And similarly, for share game, how would the mechanism be for like sharing a game? Well, first of all, maybe more phrased as a question. Would that also be in that sheet to share a game? And then would you what would be needed? I think at this point, it's still like more of a concept. like, do we generate a URL? Would I need to buy a domain for that? Or is it just like a soli:// link? And like would we would probably need to for the app like on both platforms probably to make it accept that link or like you know a link type to accept these and then kind of you know figure out what identifier we use for this so you can share games with your friends Please think this through. Thank you very much."

"Hey, yeah, please implement this. Would it make sense to do karmatia.ch/Soli, which already kind of exists, and then kind of some URL afterwards? And yeah, please, let's make it that it doesn't replace the running game without asking, but that it does. And the question is also, should it be kind of a slash deal, deal like should it replace that developer model thingy or be something kind of even new potentially? What do you think? Please go ahead and implement the best solution. Thank you."

## Summary

**Round 1 (2026-10-11, device-smoked 2026-10-12 on iOS): "Retry" in the History preview
sheet — same deal from scratch, new history row, confirmation unless nothing is at stake,
switches to the game tab.**

**Round 2 (2026-10-12/13): "Share" next to Retry + incoming public deal links.**
Link = `https://karimattia.ch/soli/deal/<exactId>?draw=<n>` (scheme twin
`soli://soli/deal/<exactId>?draw=<n>`, same expo-router path). In-app: `app/+native-intent.tsx`
parses the link, stashes it in `pendingDealRequestStore`, rewrites the route to `/`;
`useKlondikeGame` consumes it after persistence hydrated and asks "Play shared deal?"
(skip when won / 0 moves) via the generalised `requestPlayDeal`. The dev-only
`soli://?deal=` link is untouched. `app.json` got `ios.associatedDomains` +
`android.intentFilters` (native rebuild + store release needed). Website repo
(`karimattia.ch`, uncommitted): AASA + assetlinks.json in `public/.well-known/`, headers +
`/soli` redirect in `next.config.js`, fallback page `/soli/deal/[id]`. Cheap gates green in
both repos; site verified locally with `next start` + curl (see Testing). Device smoke of
round 2 pending (separate testing agent). **Blocked on Karim before it works end-to-end
in production: Play App Signing fingerprint, Apple Associated Domains capability + new
provisioning profile, site deploy — see "Required inputs from Karim".**

## Description

The History tab lists every recorded deal (solved / incomplete / active) and opens a
preview sheet per row. Round 1 made the sheet actionable with **Retry** (deal the exact
same cards again from scratch, same `exactId` + draw count, jump to the game tab). Round 2
adds **Share**: a public https link that opens the same deal in a friend's Soli, with a web
fallback page for people without the app.

Why this matters: "I almost had that one, let me try again" and "try THIS deal" are the two
most natural replay wishes in solitaire; the deal identity work (`E1_` exact ids encode the
full 52-card order) makes both pure UI/link features — no server, no database.

### Decisions (orchestrator; recorded with trade-offs)

| # | Decision | Trade-off |
|---|---|---|
| R1 | Label **"Retry"**, semantics = **same deal from scratch**. | "Resume where it was left off" is feasible (Follow-ups) but needs replay/hydration + timer continuity + a policy for the old row. |
| R2 | Retry/Share-play create a **new history row**; existing rows stay untouched. | Simplest mental model; what New Game does. |
| R3 | The running game ends like **New Game** (recorded incomplete) after a **confirmation Alert**; skipped only when the board is won or has no moves. | Consistent with "Start a new game?"; the skip is two lines because the confirm lives next to `stateRef` in `useKlondikeGame`. |
| R4 | Retry/Share shown for **all statuses**. | No special-casing. |
| S1 | **Link format** `https://karimattia.ch/soli/deal/<exactId>?draw=<n>`; lowercase path; `draw` optional → receiver's preferred draw count; identifier = existing `E1_` id. | Karim's own domain, no purchase; `/soli` already pointed at the project (now a redirect to `/projects/soli`). The id is ~47 chars — long but self-contained (the link IS the deal). |
| S2 | **New public handler, NOT the dev link.** `soli://?deal=` stays exactly as is (silent replace + developer mode on; testing agents rely on it). The public path never touches developer mode, validates id + draw, **asks before replacing** the running game. | Two code paths that both end in `performDealAgain`; worth it because the dev path's side effects (dev mode on, 200 ms settle hack, link dedup) are all wrong for a friend's link. |
| S3 | **Scheme twin** `soli://soli/deal/<id>?draw=n` maps to the same route (expo-router concatenates host + path for custom schemes). | Lets the web fallback offer "Open in Soli" and lets agents test before the domain association is live. |
| S4 | **Incoming handling via `+native-intent.tsx`** (not a route file). | See Possible approaches. |
| S5 | **Share button** next to Retry (two buttons in a row), RN `Share.share`, message "Play this Klondike deal in Soli (Draw n)" + url (iOS: `url` separately for a clean preview; Android: URL inline in `message`, the only field it reads). No win-dialog share yet. | — |
| S6 | `ios.associatedDomains: ["applinks:karimattia.ch"]`, Android `intentFilters` with `autoVerify`, https, host `karimattia.ch`, pathPrefix `/soli/deal`. | Native change → `yarn release`/`yarn ios` prebuild picks it up locally; store users need a new build. iOS additionally needs the Associated Domains capability on the App ID and a regenerated provisioning profile — **manual** here because Soli signs with uploaded credentials from Timo's Individual account (EAS only syncs capabilities when it owns the Apple login). |
| S7 | Website: `public/.well-known/*` + `next.config.js` headers/redirect + `/soli/deal/[id]` page reusing the Soli card's store buttons. | Static files + one header rule is the idiomatic Next-on-Vercel way; route handlers would be more code for the same result. |

## Acceptance Criteria

| When | Then |
|---|---|
| I open a history row's sheet | "Retry" and "Share" buttons are visible side by side (all statuses). |
| I tap Retry while the current game has moves and is not won | Alert "Retry this deal?" (Cancel / Retry). Cancel leaves the sheet open and the game untouched. |
| I confirm Retry | Sheet closes, game tab shown, the row's deal freshly dealt with its draw count; previous game recorded incomplete; new Active row with the same display name / "Solvable". |
| I tap Retry while the board is won or has no moves | No Alert; retry happens directly. |
| I tap Share | The OS share sheet opens with `https://karimattia.ch/soli/deal/<id>?draw=<n>` (iOS: link preview; Android: text containing the link). Sheet stays open; nothing else changes. |
| Someone opens that https link on a phone with Soli (after site deploy + domain verification + new app build) or the scheme twin | Soli opens on the game screen; if the current game has moves and is not won: Alert "Play shared deal?" (Cancel / Play). Play → that deal is dealt with the link's draw count (or the receiver's preferred one if absent/invalid). Cancel → nothing changes. |
| The link arrives on a cold start | Same behaviour; the request waits until the saved game is restored (no race, never dropped). |
| The link's id is garbage | App lands on the game screen unchanged; devLog `[Link] Ignoring deal link…`. No `+not-found` screen. |
| The same link is opened twice | Second prompt (no dedup — a friend may send the same deal again). |
| Someone without the app opens the https link | Web page: explanation, "Open in Soli" (scheme link), App Store / Google Play buttons. Invalid id → 404. `/soli` → `/projects/soli`. |

## Possible approaches

### Wiring History → game session (round 1)

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **(a) module-level store** (`useSyncExternalStore`) published by `KlondikeGameSession` | Existing repo pattern (`demoProgressStore`); no provider nesting; works regardless of mount order; removed `onControlsChange` prop + `useState` from `index.tsx` | Module singleton — fine, one game session per app | **Chosen** |
| (b) router params on `/` consumed once | No new module | Nonce + consume-once effect + stale params | Rejected |
| (c) `Linking.openURL('soli://?deal=…')` | Least code | OS round-trip; dedup swallows a repeat; **turns developer mode on**; no confirmation | Rejected |

### Incoming public links (round 2)

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **`app/+native-intent.tsx` `redirectSystemPath` + `pendingDealRequestStore`** | Runs before any screen exists (cold AND warm), so one place rewrites `/soli/deal/<id>` → `/` and the user never sees a flash of a route or `+not-found`; store decouples "link seen" from "game session ready + hydrated"; `+` files are not routes (typed routes unaffected); documented expo-router API | `path` is actually the raw URL (verified in `getLinkingConfig.js`/`linking.js`) — parse defensively; must not throw | **Chosen** |
| Route file `app/soli/deal/[id].tsx` that stashes + `router.replace('/')` | Pure routing, no special file | Mounts a Stack screen outside `(tabs)` on cold start (flash), still needs the store for hydration timing, and the `(tabs)` group isn't mounted yet when it runs | Rejected |
| Branch in the dev launcher's `Linking` listener | Reuses the existing listener | expo-router would still route `/soli/deal/<id>` → `+not-found`; mixes public and dev semantics (the orchestrator explicitly wants them separate) | Rejected |

Consumption point: `useKlondikeGame` subscribes to the store and acts only when
`storageHydrated` is true. Before that the reducer holds the pre-hydration state, so a
prompt (or a 0-move skip-confirm) would be decided on the wrong board and the saved-game
restore could then stomp the new deal — the dev links paper over the same race with a
200 ms settle delay; here the gate is explicit.

### Web fallback page

Thin server page (`page.tsx`: shape-validate id, pick draw, build scheme URL) + a `"use
client"` card (`SoliDealCard.tsx`) — the first cut rendered Mantine compound components
(`List.Item`, `Button leftSection`) straight from the server component and `next start`
returned 500 "Element type is invalid"; the existing `/projects/soli` page uses the same
server-page + client-card split, so we match it.

## Open questions to the user

1. **Alert over the Expo UI BottomSheet** — resolved on iOS (device smoke 2026-10-12: Alert
   renders above the sheet). Android still to verify.
2. **Which Android fingerprints should be live?** Recommendation: both the upload key
   (already in `assetlinks.json`; makes `yarn release` installs verify) and the **Play App
   Signing key** (must be added; see Required inputs). Listing both is explicitly supported.
3. **Share copy** — "Play this Klondike deal in Soli (Draw 3)". Change freely in
   `app/(tabs)/history.tsx` `handleShare`.

## Dependencies

None new. `useSyncExternalStore` (React 19), `useRouter` (expo-router 57), `Alert` / `Share`
/ `Platform` (react-native 0.86), tamagui `Button`. Guides: `docs/external-package-guides/`
`expo-linking.md` (new — universal/app links config, fingerprints, verification),
`expo-router.md` (new section: `+native-intent`), `react-native.md` (new section: `Share`).
Website: no new packages (Mantine `Button/List/Title`, `@tabler/icons-react` `IconPlayerPlay`).

## UX/UI Considerations

- Two tamagui `Button size="$3" flex={1}` in an `XStack` at the bottom of the sheet (demo
  sheet style; no Expo UI controls inside sheets — nested native Hosts had unreliable
  gestures on Android).
- a11y: Retry `accessibilityLabel="Retry this deal"` / `testID="history-retry"`; Share
  `accessibilityLabel="Share this deal"` / `testID="history-share"` (SKILL.md §5 conventions).
- Retry disabled when controls are null or the row's id is malformed; Share has no disabled
  state (building the URL needs only the id).
- Alerts: "Retry this deal?" (Cancel / Retry) and "Play shared deal?" (Cancel / Play), both
  "Your current game will end and be recorded as incomplete.", confirm button destructive
  like "Deal Again".
- Web page copy: "Someone shared a Solitaire deal with you" + 3 bullets + "Open in Soli" +
  store buttons; `robots: noindex`.

## Components

- Reuse: `AppSheet`, tamagui `Button`/`XStack`, `StatusText`, `BoardPreview`. Website:
  `Layout`, `SmallDivider`, new shared `SoliStoreButtons` (extracted from `SoliCard`).
- New: `src/utils/valueStore.ts` (`createValueStore`) — the third copy of the same 15-line
  external-store boilerplate (`demoProgressStore`, `sessionControlsStore`,
  `pendingDealRequestStore`) was folded into one helper; `demoProgressStore` refactored onto
  it (same exports, same equality shortcut).

## How to fetch data, how to cache

n/a. The link carries everything; no server.

## Related tasks

- `docs/product/move-log-persistence/` — move logs per history row (resume prerequisite).
- `docs/product/agent-testing-skill/` — `?deal=` dev deep link (same `performDealAgain` path).
- `docs/product/deal-identity-cleanup/` — `E1_` exact ids.
- `docs/publishing/ios-release-build.md` — uploaded-credentials story (why the Associated
  Domains capability is a manual step).

## Simplification ideas

- `createValueStore` removed ~25 duplicated lines across three stores (done).
- `requestRetryDeal` was generalised to `requestPlayDeal(exactId, drawCount, { prompt,
  onConfirmed })` instead of adding a sibling — one confirm/skip implementation for both
  sources (done).
- `startGameFromExactDeal` (dev link) and `requestPlayDeal` both end in `performDealAgain`
  with `createGameStateFromExactId`; kept separate on purpose (dev link must NOT confirm,
  logs a different reason, forces dev mode).
- Not done on purpose: porting the exact-id range check to the website (shape check is
  enough for a page whose job is a button).

## Steps to implement

| # | Step | Status |
|---|---|---|
| 1 | Plan (round 1) | done |
| 2 | `sessionControlsStore.ts` | done |
| 3 | `KlondikeGameSession.tsx` publishes to the store | done |
| 4 | `app/(tabs)/index.tsx` reads the store | done |
| 5 | `useKlondikeGame.ts` `requestRetryDeal` | done (now `requestPlayDeal`) |
| 6 | History sheet Retry button | done |
| 7 | Cheap gates round 1 | done |
| 8 | Device smoke round 1 | done iOS (2026-10-12, all PASS); Android not run |
| 9 | Plan round 2 (decisions, approaches, research) | done |
| 10 | `src/solitaire/dealShareLink.ts` (`buildDealShareUrl`, `buildDealSchemeUrl`, `isDealShareLink`, `parseDealShareUrl`) + jest | done (7 tests) |
| 11 | `src/utils/valueStore.ts`; refactor `demoProgressStore`, `sessionControlsStore`; new `pendingDealRequestStore` | done |
| 12 | `app/+native-intent.tsx` | done |
| 13 | `useKlondikeGame.ts`: `requestPlayDeal` (prompt variants) + pending-request consumer after hydration | done |
| 14 | History sheet Share button (+ Retry call-site update) | done |
| 15 | `app.json` `associatedDomains` + `intentFilters` (verified via `npx expo config`) | done |
| 16 | `scripts/deeplink.js` accepts `https://karimattia.ch/…`; SKILL.md catalog updated | done |
| 17 | Guides: `expo-linking.md` (new), `expo-router.md`, `react-native.md` | done |
| 18 | Website: `public/.well-known/apple-app-site-association` + `assetlinks.json`, `next.config.js`, `/soli/deal/[id]` page + `SoliDealCard`, `SoliStoreButtons` extraction | done |
| 19 | Website lint + build + local `next start` verification | done (see Testing) |
| 20 | Soli cheap gates round 2 | done — all green |
| 21 | Device smoke round 2 (testing agent) | pending |
| 22 | Karim: Play App Signing fingerprint → `assetlinks.json`; Apple capability + profile; deploy site; store build | **pending — required inputs below** |

## Plan: Files to modify

Soli: `src/solitaire/dealShareLink.ts` (new), `src/utils/valueStore.ts` (new),
`src/features/klondike/state/{sessionControlsStore,demoProgressStore,pendingDealRequestStore}.ts`,
`app/+native-intent.tsx` (new), `src/features/klondike/hooks/useKlondikeGame.ts`,
`src/features/klondike/components/KlondikeGameSession.tsx`, `app/(tabs)/history.tsx`,
`app.json`, `scripts/deeplink.js`, `.agents/skills/soli-testing/SKILL.md`, guides, tests.
Website: `public/.well-known/*`, `next.config.js`, `src/app/soli/deal/[id]/*`,
`src/app/projects/ProjectCards.tsx`.

## Files actually modified

Soli (this feature only — the tree also carries another session's scoring work):
- `src/solitaire/dealShareLink.ts` (new), `test/unit/solitaire/dealShareLink.test.ts` (new)
- `src/utils/valueStore.ts` (new)
- `src/features/klondike/state/sessionControlsStore.ts` (new, round 1; now on `createValueStore`)
- `src/features/klondike/state/pendingDealRequestStore.ts` (new)
- `src/features/klondike/state/demoProgressStore.ts` (refactored onto `createValueStore`)
- `app/+native-intent.tsx` (new)
- `src/features/klondike/hooks/useKlondikeGame.ts` (`requestPlayDeal`, pending consumer)
- `src/features/klondike/components/KlondikeGameSession.tsx`
- `app/(tabs)/index.tsx` (round 1), `app/(tabs)/history.tsx` (Retry + Share)
- `app.json`, `scripts/deeplink.js`, `.agents/skills/soli-testing/SKILL.md`
- `docs/external-package-guides/expo-linking.md` (new), `expo-router.md`, `react-native.md`
- this plan

Website (`/Users/karim/kDrive/Code/karimattia.ch`, left uncommitted):
- `public/.well-known/apple-app-site-association` (new), `public/.well-known/assetlinks.json` (new)
- `next.config.js` (headers + `/soli` redirect)
- `src/app/soli/deal/[id]/page.tsx` (new), `src/app/soli/deal/[id]/SoliDealCard.tsx` (new)
- `src/app/projects/ProjectCards.tsx` (`SoliStoreButtons` extracted, `SoliCard` uses it)
- (`yarn install` wanted to touch `.yarnrc.yml`/`yarn.lock`; both restored — see learnings)

## Intermediary learnings

- `displayName` and `solvable` derive from `exactId` + `drawCount` in `createEntry`, so a
  retried/shared solvable deal gets the same name and "Solvable" automatically.
- `createSolvableGameState` is literally `createGameStateFromExactId(deal.exactId, drawCount)`
  — the retried board is card-for-card identical, incl. the initial waste reveal.
- The dev `?deal=` path calls `applyLinkDeveloperMode()` → would switch developer mode ON
  for a regular user; the public handler must stay separate (decision S2).
- A 0-move game linked to an active row IS recorded as incomplete (the "meaningful play"
  guard only covers the untracked path). Skipping the confirm at 0 moves is still right.
- Seeded rows use short ids like `E1_3` (permutation index 3) — valid; Retry/Share work.
- **`redirectSystemPath({ path })` receives the raw URL**, not a path (expo-router 57
  `getLinkingConfig.js` passes `Linking.getInitialURL()`/the `url` event through). The
  returned value is then run through `extractExpoPathFromURL`: `soli://soli/deal/x` →
  `soli/deal/x` (host + pathname), `https://karimattia.ch/soli/deal/x` → `/soli/deal/x`,
  `'/'` → root. That is why the scheme twin shares the path.
- The dev launcher's `processDemoLink` sees the raw public URL too and falls through
  silently (no `seedHistory/set/reset/deal/celebration/demo` param, host ≠ `demo-game`).
- Exact ids are lowercase base36 (`toString(36)`); `parseExactDealId` lowercases, but
  history matching is case-sensitive → the parser normalises to lowercase.
- iOS signing: Soli uses **uploaded** distribution cert + App Store profile from Timo's
  Individual account (`docs/publishing/ios-release-build.md`). Adding the
  `associated-domains` entitlement therefore needs the capability enabled on the App ID
  and a regenerated profile re-uploaded via `eas credentials` — otherwise the EAS build
  fails code signing. Not automatic.
- Android fingerprints: upload key `C0:85:A1:BC:…:DF:36:46` confirmed from both
  `.test-artifacts/release/Soli-1.1.0-16.aab` (`keytool -printcert -jarfile`) and
  `android/app/build/outputs/apk/release/app-release.apk` (`apksigner verify
  --print-certs`), i.e. what `yarn release` installs. The **Play App Signing** key
  fingerprint is not available locally (only in Play Console) — left out, flagged.
- Website: Mantine compound components rendered from a server component crashed at
  runtime (`Element type is invalid … undefined`) although `next build` passed; the
  client-card split fixed it. Next serves `public/.well-known/` dotfolders fine; the AASA
  needed the explicit `Content-Type: application/json` header (extensionless file),
  `assetlinks.json` gets it from the extension.
- Website repo: the committed `yarn.lock`/`.yarnrc.yml` are stale for Yarn 4.17.1 —
  `yarn install` rewrites 3 lines (`npmMinimalAgeGate: 0`, a lockfile metadata line) and
  without that rewrite `yarn lint/build` fail ("cv@workspace: not present in lockfile").
  Restored to HEAD after verification so the diff only contains feature files; Karim may
  want to commit the regenerated lockfile separately (pre-existing, not caused here).
- Transient: one soli `yarn jest` run showed 3 failures in suites of the concurrent scoring
  session mid-edit; the immediate re-run was 41/41 green.

## Identified issues

- None in this feature. Watch items: Alert layering on Android (iOS verified); Android
  `Share` chooser shows the URL inline (by design).
- Pre-existing, out of scope: website `yarn.lock` staleness (above); the testing agent's
  environment notes from round 1 (Xcode 27 pod issue, iOS 27 runtime crash) are recorded
  in the Testing section.

## Testing

Cheap gates round 1 (2026-10-11): typecheck 0 · lint 0 · jest 35/375.
Cheap gates round 2 (2026-10-13): `yarn typecheck` exit 0 · `yarn lint` exit 0 · `yarn
jest` 41 suites / 448 tests passed (incl. the new `dealShareLink` suite: build/parse,
round-trips for both link forms, nonce/extra params, uppercase normalisation, invalid
draw, invalid ids with shape recognition, unrelated links ignored). `npx expo config`
shows `associatedDomains` and the intent filter as expected.

Website (2026-10-13): `yarn lint` 0 · `yarn build` 0 (`/soli/deal/[id]` dynamic route) ·
`next start` + curl — results in the "Website verification" subsection below.

Device smoke round 1 (iOS, 2026-10-12): all PASS — see table further below.

### Device test steps round 2 (testing agent — read `.agents/skills/soli-testing/SKILL.md` first)

Everything below works **before** the site is deployed (scheme twin + explicit-package
https intent). A new build is required (`yarn release` / `yarn ios` prebuild the new
intent filter/entitlement; iOS local builds may need the Associated Domains capability on
the dev team's App ID — if `yarn ios` fails on the entitlement, test iOS with the scheme
form only after temporarily removing `associatedDomains` locally, and say so).

Handles: Retry `Retry this deal` / `history-retry`; Share `Share this deal` / `history-share`.
Use an id from a seeded or real row; `E1_8nk351v2ahh1oyr6mdo9nv3g6xi7nm5c6dfqpz6uc26r` is a
valid id from the demo playlist.

1. Build/install. `yarn seedhistory`. Tap Stock once (≥1 move).
2. **Share**: Drawer → History → any row → **Share**. Expect the OS share sheet. iOS sim:
   choose "Copy", then `xcrun simctl pbpaste booted` (or paste into Notes) → exactly
   `https://karimattia.ch/soli/deal/<row id>?draw=<row draw>`. Android: the chooser text
   is `Play this Klondike deal in Soli (Draw N): https://…`. Dismiss → the history sheet
   is still open, game unchanged.
3. **Warm incoming link, with moves**: on the game screen with ≥1 move,
   `yarn deeplink 'soli://soli/deal/<id>?draw=3' --ios` (Android: the https form
   `yarn deeplink 'https://karimattia.ch/soli/deal/<id>?draw=3'` — explicit-package intent,
   no verification needed). Expect Alert **"Play shared deal?"** (Cancel / Play), NO Demo
   button appearing (developer mode untouched). Cancel → board unchanged. Re-fire → Play →
   new deal, MOVES 0, Draw 3; History: new Active row for `<id>`, old game Incomplete.
4. **Warm link from the History tab**: open History first, fire the link → app switches to
   the game tab, prompt as above.
5. **Skip-confirm**: with the fresh 0-move board, fire the link again → no Alert, new deal
   directly. (`yarn nearwin`, win, fire → also no Alert.)
6. **Cold start**: `yarn deeplink 'soli://soli/deal/<id>?draw=1' --cold --ios` (Android:
   https form `--cold`). Expect app launch → game screen → (if the saved game had moves)
   prompt → Play → deal with Draw 1. Nothing dropped, no `+not-found` screen.
7. **Missing / invalid draw**: `…/deal/<id>` without `?draw` and with `?draw=9` → deal uses
   the Settings draw count.
8. **Invalid id**: `yarn deeplink 'soli://soli/deal/E1_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz' --ios`
   → app shows the game screen unchanged; with dev mode on, log `[Link] Ignoring deal link`.
9. **Dev links still work**: `yarn deeplink 'soli://?deal=<id>&draw=3' --ios` → silent
   replace + Demo button (unchanged behaviour); `yarn seedhistory clear` at the end.
10. Android only: `adb shell pm get-app-links ch.karimattia.soli` → lists `karimattia.ch`
    (state `none`/`unverified` until the site is deployed — expected).

### Website verification (local `next start` on :3977, 2026-10-13)

| Request | Result |
|---|---|
| `GET /.well-known/apple-app-site-association` | 200, `Content-Type: application/json` (via `next.config.js` header) |
| `GET /.well-known/assetlinks.json` | 200, `Content-Type: application/json; charset=UTF-8` |
| `GET /soli/deal/E1_8nk35…r?draw=3` | 200; page contains `href="soli://soli/deal/E1_8nk35…r?draw=3"`, "(Draw 3)", both store links, `<meta name="robots" content="noindex">` |
| `GET /soli/deal/E1_3` (no draw) | 200; `href="soli://soli/deal/E1_3"` |
| `GET /soli/deal/not-a-deal` | 404 |
| `GET /soli` | 307 → `/projects/soli` |
| `GET /projects/soli` | 200 (card still renders with the extracted `SoliStoreButtons`) |

Server log: 0 errors; server stopped afterwards. Not verifiable locally: Apple CDN pickup,
Android verification (both need the deployed site + the fingerprints/capability inputs).

### Device smoke result round 2 — Share + public links (2026-10-13, iOS simulator iPhone 17 Pro / iOS 26.5)

Build under test: the Release build another session produced at 00:05–00:06 (installed on
the sim by that session's `yarn ios`; verified identical to the tree — no source file newer
than its log — and it contains the Share/`+native-intent` code). A **fresh prebuild could
not be run**: that session's `expo run:ios` hung after install (the known "Connecting to:
iPhone 17 Pro" hang) and held `/tmp/soli-build.lock` for the whole 60-min window; killing
another session's process was out of scope. Consequence: `ios/` is still the Oct 11 prebuild
→ `ios/Soli/Soli.entitlements` is empty, i.e. the **associated-domains entitlement was NOT
exercised**; the scheme twin does not need it. Dev mode was forced OFF before testing via
`yarn seedhistory --ios --screenshot`.

| Step | Result | Observed |
|---|---|---|
| 1 Build/seed/move | PASS (build reused, see above) | 8 seed rows; Stock tap → MOVES 4 (saved game) |
| 2 Share | PASS | Retry + Share side by side (`r2-step2-sheet-retry-share.png`); OS share sheet with "karimattia.ch" link preview; Copy → `simctl pbpaste`/agent-device `clipboard read` only return the text item ("Play this Klondike deal in Soli (Draw 1)"); the URL item was verified via the Reminders target: `https://karimattia.ch/soli/deal/E1_10025mgs3vltykwwe3tcdgyq02tdkw8t-lcp7vo56fezi?draw=1` (`r2-step2-reminders.png`, id tail = row "VO56-FEZI", Draw 1). Dismissing the share sheet leaves the history sheet open. |
| 3 Warm link, ≥1 move | PASS | "Play shared deal?" (Cancel/Play), no Demo button; Cancel → MOVES 1 / Stock 18 unchanged; re-fire → Play → MOVES 0, Stock 21 (Draw 3); History: "Deal PZ6U-C26R · Active · Draw 3" on top, old game "Incomplete · 1 move" |
| 4 Link from History tab | PASS | App switched to the game tab and prompted there (`r2-step4-prompt-from-history.png`); Play → dealt |
| 5 0-move board | PASS | No prompt, dealt directly; row count +1 |
| 6 Cold start | PASS | `--cold` with a 1-move saved game → app relaunched (new pid) on the game screen with the prompt (`r2-step6-cold-prompt.png`), Play → Draw 1 deal (Stock 23). No not-found screen |
| 7 draw missing / `draw=9` | PASS | Settings = Draw 1; both links dealt with Stock 23 (Draw 1); History 60 → 63 confirms two new deals |
| 8 Invalid id | PASS | No prompt, no crash (same pid), game screen unchanged; `[Link] Ignoring deal link with an invalid id` logged (run with dev mode on after step 9; the ≥1-move variant could not be driven because the XCTest runner was busy — 0-move board) |
| 9 Dev link + Retry | PASS | `?deal=…&draw=3` replaced silently (log `deepLink-deal`), Demo button appeared; History → Active row → Retry → "Retry this deal?" → Retry → MOVES 0 (log `retry`) |
| 10 Android | SKIPPED | `/tmp/android-device.lock` = `soli:karim:…` (Karim's own lock) and no adb device |
| 11 Cleanup | PASS | `yarn seedhistory clear --ios --screenshot` → 65 → 57 rows, Demo button gone (dev mode off) |

Observations: (a) when a share link arrives while the History **preview sheet is open**, the
app switches to the game tab but the Expo UI sheet stays presented over the game (it had to be
dismissed by hand) — minor UX nit, worth closing the sheet in `+native-intent`/the consumer.
(b) The "Play shared deal?" alert also rendered on top of a system share extension sheet
(test artefact, not user-reachable in practice). Logs: no JS errors.

### Device smoke result round 1 (2026-10-12, iOS simulator iPhone 17 Pro / iOS 26.5, Release build 1.1.0 (15))

| Step | Result | Observed |
|---|---|---|
| 1 Seed + 1 move | PASS | `yarn seedhistory --ios` inserted 8 rows; Stock tap → MOVES 1. |
| 2 Retry → Alert above sheet → Cancel | PASS | Alert "Retry this deal?" rendered ABOVE the Expo UI sheet; Cancel left the sheet open. |
| 3 Confirm → fresh deal + rows | PASS | Sheet closed, game tab shown, MOVES 0, Draw 3; new Active row on top, seeded row untouched, old game Incomplete. |
| 4 Skip-confirm at 0 moves | PASS | No Alert; 0-move game recorded "Incomplete · 0 moves" (expected). |
| 5 Active row retry | PASS | Identical deal re-dealt; previous row Incomplete. |
| 6 Sheet layout | PASS | Full-width Retry below the preview; seeded rows show an empty dashed preview (seed data, pre-existing). |
| 7 Cleanup | PASS | Only `seed-` rows removed. |

Environment findings (not feature bugs): Xcode 27 + stale `ios/` prebuild needed
`LANG=en_US.UTF-8` and a local `Podfile` post_install deployment-target bump; the app
hard-crashes on the iOS 27.0 runtime (`_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`),
tested on iOS 26.5 instead; another session's `yarn ios` reinstalled the app mid-test once.

## Required inputs from Karim (deploy order matters)

1. **Play App Signing fingerprint** → add to `karimattia.ch/public/.well-known/assetlinks.json`
   `sha256_cert_fingerprints` (keep the upload-key one). Play Console → app → Test and
   release → Setup → **App signing** (older UI) / **App integrity** → "App signing key
   certificate" SHA-256 (also offered as a ready "Digital Asset Links JSON" snippet).
   Without it, Play-installed apps never verify the domain (links open the website).
2. **Apple**: developer.apple.com → Identifiers → `ch.karimattia.soli` → enable
   **Associated Domains** → regenerate the App Store provisioning profile (Timo, Individual
   account) → `npx eas-cli credentials -p ios` → upload the new `.mobileprovision`. Needed
   before the next `yarn build:ios`, or code signing fails on the new entitlement.
3. **Deploy the site first** (push `karimattia.ch` to Vercel; verify
   `curl -I https://karimattia.ch/.well-known/apple-app-site-association` → 200 +
   `application/json`, same for `assetlinks.json`, `https://karimattia.ch/soli/deal/E1_3`
   renders, `/soli` → `/projects/soli`). Apple's CDN then picks the AASA up (hours);
   Android verifies on install.
4. **Then** build + release the app (`soli-release` skill); only installs made after the
   site is live verify the domain. Re-check on a device: `adb shell pm get-app-links
   ch.karimattia.soli` → `verified`; iOS: tap the https link from Notes/Messages.
5. Optional: commit the regenerated `yarn.lock`/`.yarnrc.yml` in `karimattia.ch` (stale
   for Yarn 4.17; `yarn install` rewrites them).

## Follow-ups

1. **Resume from history (continue where it was left off).** Feasibility: the
   move-log-persistence story (D1) persists `exactId` + `drawCount` + the ordered move log
   on every finished/incomplete row and ships `replayMoveLog` (used at app start to rebuild
   undo depth). Missing is purely session glue: build the base state from the row, replay
   its log, hydrate the session, restore `elapsedMs`/move count, decide the old row's fate.
   Medium-sized; recommended after Retry has proven itself.
2. **Share from the win dialog / "beat my score"** — same `buildDealShareUrl`; optionally
   append `&moves=N&time=S` so the receiver sees the sharer's result (parser already
   ignores unknown params, so it is forward compatible).
3. **Retry from the win dialog** ("Play this deal again") — `requestPlayDeal`, zero plumbing.
4. **Dev-mode independent logging for ignored links** — `[Link] Ignoring deal link` is
   devLog-gated; fine for now, revisit if real users report "link does nothing".
5. **`applinks:karimattia.ch?mode=developer`** in a dev build profile if iterating on the
   AASA ever becomes necessary (bypasses Apple's CDN for development builds only).
