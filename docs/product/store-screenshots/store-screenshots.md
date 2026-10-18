# Store screenshots refresh (App Store + Google Play)

## User prompt

> check screenshots in both apple store and google play @README.md make similar ones, your judgement if you can make nicer. reason: we updated a lot visually since these screenshots and i want to update them.

Round 2 prompt:

> Hey, that sounds great. For yourself if you want to do Screenshot mode, I think it should be called screenshot mode, yes, not the dev mode off, screenshot mode or kind of a celebration trigger with a flag that is screenshot mode, that is fine. yeah. Please, in fact, do a couple more screenshots on both platforms on all platforms actually, on all devices with a couple of different celebrations, be because we have a couple of cool ones. my question is also Should we Do a picture of the settings maybe, because like there are quite a couple of cool settings. And should we do a picture of the history, because there's, well, a history feature. and the question is, like the draw three like you, you could always see three cards, I don't think that's a new feature. I think that's just like normally when you flip three cards, you see that just as some context. The question is also should the near win be already all cards uncovered or just like two, three cards still covered? and also the mid game is still very early, like could be three, four moves more, but I mean it's also fine. Also, but just tell me your, your thoughts, your preferences or I don't know, how to make it so it looks cool for, for users. Yeah And yeah, sure like there's an Android simulator here if it makes sense to get like nice tablet screenshots please go for it, although it's not tablet optimized, I'm not sure what's your what's your recommendation here what's like the best, best practice for it At all. I mean, we can also, always do it later, right? Quickly checking the existing ones myself. So yeah, the mid-game, at least in the one we had, was quite a bit further ahead, maybe very far, and then the near-win still had like a few covered cards. Well, I had one covered card, but it could be like two, three. and then there is one that is like no covered cards. I don't know. Like, we also don't need to overthink. also just keep in mind of what we should show. I think there's also limited, like Thank you. A little bit limited Value from having more

Round 2 decisions (orchestrator recommendations, accepted by default):

- Build **screenshot mode**: `&screenshot=1` flag on demo deep links (esp. the celebration trigger) that suppresses ALL dev UI (Demo header button, celebration debug badge) — named "screenshot mode" per Karim.
- Capture MORE celebrations on all devices (iPhone, iPad, Android phone) using screenshot mode — no real wins needed, no history pollution.
- Settings screenshot: YES (communicates Draw 1–5 / solvable-only / auto-complete without marketing text).
- History screenshot: YES, with seeded rows (`yarn seedhistory`, clear after on the phone).
- Near-win: recapture with 2–3 face-down cards left (tension + fat foundations), not fully uncovered.
- Mid-game: recapture further along (~scrub 70/80) so foundations show progress.
- Draw-3 fan: keep existing shot in the pool; first candidate to cut.
- Android tablet: DEFER — app not tablet-optimized; Play shows tablet shots to tablet users only; do after a tablet-layout pass.
- Final store set target stays ~7 images; the rest is a pool for Karim to pick from.

## Summary

Note 2026-10-18: the Play Store feature graphic generator (`src/dev/FeatureGraphicScreen.tsx` +
`app/feature-graphic.tsx`, web-only, `expo-linear-gradient`) was removed together with the web
target and Tamagui (`docs/product/tamagui-3-upgrade/tamagui-major-upgrade.md`). If a new feature
graphic is ever needed, recover it from git history (last commit before that removal) or make it
with any image tool — it was not used since 2025.

Round 3 capture DONE (2026-08-02): 10 shots at **1284x2778** (App Store Connect 6.5-inch slot) in `.test-artifacts/store-screenshots/r3-ios-1284x2778/`, captured natively on an iPhone 14 Plus sim (`ASC-65-1284`), alpha-stripped, all conformance-verified. Cause of the ASC rejection was a wrong SLOT, not wrong files — see "Round 3 capture" below. Synthetic celebration stats device-verified (every mode matched its documented pair).

Round 3 code change DONE (2026-08-02): screenshot-mode celebration previews now render deterministic synthetic MOVES/TIME (120–180 moves / 4:00–7:00, derived from the mode id) instead of MOVES 0 / TIME 0:00. Display-only — nothing enters game state, persistence or history. Optional `&moves=N&time=SECONDS` override. See "Round 3 steps" below.

iOS pass DONE (2026-07-09): full iPhone set (8 shots, 1320x2868 on a new iPhone 17 Pro Max sim) + iPad set (2 shots, 2048x2732 on a new iPad Air 13" M3 sim) captured to `.test-artifacts/store-screenshots/{ios,ipad}/`. All shots dev-UI-free (developer mode manually toggled off after each fixture deep link — see learnings), status bar 9:41/full battery. Celebration captured from a REAL win (ring/wreath Skia mode).

Round 2 iOS pass DONE (2026-07-09): 11 iPhone shots (7 celebration modes incl. 2-frame spirograph/youwin, late mid-game 70/80, near-win with exactly 2 face-down, settings, seeded history) + 4 iPad shots (spirograph, kaleidoscope, bonus infinity, settings). Screenshot mode (`&screenshot=1`) worked flawlessly — no dev UI anywhere, no manual toggling. Best modes: 36 Spirograph + 46 Kaleidoscope; 43 You Win as message shot.

Round 2 Android pass DONE (2026-07-09): 12 shots at 1080x2412 on the physical phone (5 celebration modes: spirograph a/b, kaleidoscope a/b, youwin a/b, meteorshower, fireworks; late mid-game 80 moves/4:04; near-win left=45 with exactly 2 face-down; settings; history with seeds). Screenshot mode worked flawlessly on Android too — zero dev UI across ~25 frames, NO real wins played. Fresh `yarn release` build (versionCode 13). SystemUI demo mode entered/exited (real status bar verified); seed rows cleared (Games 153→145); screen timeout untouched (600000 throughout); only 2 history rows added (1 incomplete scrubbed fixture + the active nearwin game).

Android pass DONE (2026-07-09): 8 shots at 1080x2412 on the physical phone in `.test-artifacts/store-screenshots/android/` (01-fresh-deal, 02-midgame, 03-nearwin, 04-win-dialog, 05-draw3-fan, 07a/b/c-celebration). SystemUI demo mode (09:41, full battery, no notifications) used and exited afterwards; developer mode left OFF; drawCount restored to Karim's original Draw 1; 2 real wins recorded (celebration attempt 1 = compact "card snake" mode, unusable; attempt 2 = full-screen fountain/firework mode, kept).

## Description

The store listings still show screenshots from 2025-12-15. Since then the app changed visually a lot (Skia celebrations, Draw 1–5, undo time-travel scrubber, general polish). We recapture a similar set of screenshots — same "plain app screenshot" style, no device frames or marketing text — but nicer: clean status bars, deterministic pretty boards, flashy new celebrations, and a shot showing the Draw 3 waste fan.

### Current live screenshots (reference, downloaded to /tmp/soli-store/)

- App Store (8): 1 fresh deal, 2 mid-game, 1 near-win, 2 celebration (old JS pile + ring modes), 1 win dialog ("Start a new game?" with 4 kings up top), 1 iPad fresh deal. Status bars show real times (22:59 etc.).
- Google Play (6): fresh deal (phone), 2 wide/tablet-ish shots (1080x1728), mid-game with undo, card-rain celebration, mid-game. Real status bar with notification icons.

## Acceptance Criteria

- New iPhone screenshots at an accepted App Store size (iPhone 17 Pro Max sim → 1320x2868) covering: fresh deal, mid-game (undo visible), near-win, celebration (new Skia mode, no dev badge), win dialog, Draw-3 waste fan.
- 1–2 iPad screenshots (iPad Air 13" sim → 2048x2732), at least fresh deal.
- Android phone screenshots (physical phone) covering the same storyline, with status bar in demo mode (clean clock, no notification icons).
- No developer/demo UI (badges, dev toasts) visible in any shot.
- Files organized under `.test-artifacts/store-screenshots/{ios,ipad,android}/` with descriptive names (e.g. `01-fresh-deal.png`).

## Possible approaches

- Capture manually (Karim plays) — rejected: the point is agents do it.
- Demo deep links + simctl/adb screenshots — chosen: deterministic, repeatable, documented in the soli-testing skill.
- Marketing frames/panels around screenshots — rejected for now (keep the current plain style; can be a follow-up).

## Open questions to the user

- Android tablet shots (the two 1080x1728 Play images): we have no physical Android tablet. Options: (a) skip and keep old ones / drop them, (b) Android emulator tablet profile (extra setup, `yarn release` refuses emulators so manual `adb install` of the built APK). Recommendation: skip now, decide after seeing the new sets.
- Exact final selection/order per store: Karim picks from the captured pool when uploading.

## Dependencies

None new. Uses existing demo deep-link infra + `xcrun simctl` + `adb`.

## UX/UI Considerations

- iOS status bar: `xcrun simctl status_bar <udid> override --time "9:41" --batteryState charged --batteryLevel 100 --wifiBars 3 --cellularBars 4` (Apple-classic 9:41).
- Android: SystemUI demo mode (`settings put global sysui_demo_allowed 1`, then `am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941`, battery full, notifications hidden). MUST exit demo mode afterwards (`-e command exit`) — it's Karim's main phone.
- Celebration shots (round 1, OBSOLETE since screenshot mode): captured during a REAL win to avoid the `Celebration NN · Name` badge. Round 2: `yarn celebration <modeId> --screenshot` shows the badge-less preview directly — no real wins, no history pollution.
- Prefer boards with several face-up cards and foundation progress — visually richer.

## Shot list (both platforms unless noted)

1. Fresh deal, moves 0.
2. Mid-game with undo button visible: `yarn scrubtest` fixture (deterministic board, 40/80). Verify NO dev UI in frame.
3. Near-win with fat foundations: `yarn nearwin 8` or similar.
4. Real win: from nearwin, finish the last move(s) by tapping (a11y handles per soli-testing skill). Capture (a) celebration mid-animation — several frames, pick nicest, (b) "Start a new game?" dialog after.
5. Draw 3 waste fan: `yarn deeplink 'soli://?set=drawCount:3'`, new game, draw a few times, screenshot with 3-card fan.
6. iPad only: fresh deal (and optionally one mid-game).

## Steps to implement

- [x] Download + review current store screenshots (orchestrator)
- [x] Write this plan
- [x] iOS sub-agent: build for iPhone (Pro Max sim if creatable), capture iPhone set, install same .app on iPad Air 13" sim, capture iPad set — DONE 2026-07-09, 8 iPhone + 2 iPad shots
- [ ] Orchestrator: review iOS images
- [x] Android sub-agent: `yarn release` on phone (or reuse current install), demo-mode status bar, capture set, EXIT demo mode — DONE 2026-07-09, 8 shots, installed build was current (no rebuild), demo mode exited
- [x] Orchestrator: review Android images + final summary — round 1 done

### Round 2 steps

- [x] Implementation sub-agent: screenshot mode (`&screenshot=1` on demo links; suppress Demo button + celebration badge; `--screenshot` flag on `yarn celebration`/deeplink wrapper; update soli-testing skill; cheap gates) — DONE 2026-07-09, typecheck/lint/jest green
- [x] iOS sub-agent: rebuild, capture round-2 set on iPhone 17 Pro Max + iPad Air 13" sims (celebration modes pool, improved mid-game ~70/80, near-win with 2-3 face-down, settings, history via seedhistory) — DONE 2026-07-09, 14 iPhone + 4 iPad round-2 shots; screenshot mode worked flawlessly (zero dev-UI leaks across ~40 frames); see round-2 iOS learnings below
- [x] Orchestrator: review iOS round-2 images — approved. Standouts: You Win (43), Spirograph (36), Kaleidoscope (46), Meteor Shower (32). Galaxy (27) droppable. Nit: 02b foundations only 2 cards (fixture game keeps most cards in tableau at 70/80) — acceptable, 03b covers "far along".
- [x] Android sub-agent: rebuild (`yarn release`), same round-2 set on the phone, seedhistory + clear, demo mode enter/exit — DONE 2026-07-09, 12 shots, all cleanup verified (see round-2 Android results/learnings)
- [x] Orchestrator: review Android round-2 images + final summary — approved. Nits flagged to Karim: (1) Android/iPad Spirograph frames show residual board cards top-left (preview overlays current board; iPhone frame is clean since the mandala covers the full screen); (2) Android 10-history top rows are today's agent-test rows (duplicate deals, 0-move incompletes, 95 incomplete count) — weakest shot, recommend recapture on a day with real recent games or use the iOS-style seeded look.

### Round 3 steps (celebration header stats, 2026-08-02)

> Round 3 prompt: celebration screenshots (`soli://?celebration=<modeId>&screenshot=1`) look great BUT the header still shows MOVES 0 / TIME 0:00 because no real game was played — looks fake in store shots. Approach (A) synthetic plausible stats preferred over (B) hiding the stats; must be gated to the screenshot/preview path only, never real gameplay or history.

- [x] Chose **(A) synthetic stats** — (B) would have removed the two badges that make a shot read as a real game. (A) needed no reducer/game-state change: the celebration preview already carries its own synthesized payload, so the numbers ride along on `CelebrationState.previewStats` and are consumed by exactly one reader (the statistics-HUD memo in `useKlondikeGame`). Nothing else can see them → history/persistence/win-recorder stay clean by construction.
- [x] Deterministic, not random: values derive from the RESOLVED mode id (`120 + (id*7 % 61)` moves, `240 + (id*37 % 181)` seconds → 120–180 moves, 4:00–7:00), so a re-fired link reproduces the identical screenshot on any device. Frozen timer (`timerState: 'paused'`, no start timestamp) so the TIME badge doesn't tick during a capture loop.
- [x] Gate: `screenshot=1` on a `?celebration=` link, or an explicit `&moves=N&time=SECONDS` override (which also enables the synthetic header without `screenshot=1`, for dev inspection). A plain `yarn celebration <id>` preview is unchanged (real header).
- [x] Unit test + soli-testing skill documented; cheap gates green (typecheck/lint/jest 34 suites, 361 tests).

Capture syntax for the next screenshot pass: `yarn celebration 36 --screenshot` (deterministic pair per mode: 22→152/5:30, 27→126/5:34, 32→161/5:38, 36→128/5:05, 39→149/6:56, 43→177/6:23, 46→137/5:13) or `yarn deeplink 'soli://?celebration=36&screenshot=1&moves=143&time=312' --ios` for an exact pair. The timer-nudge + wait trick is now only needed for the scrubbed/nearwin fixtures (real games).

### Round 3 capture: the 6.5-inch (1284x2778) set, 2026-08-02

> Round 3 prompt: App Store Connect rejected the round-2 uploads with "Screenshots dimensions should be: 1242 × 2688px, 2688 × 1242px, 1284 × 2778px or 2778 × 1284px". Retake at matching dimensions, in a new folder.

**Root cause — the files were never wrong, the SLOT was.** That error string is verbatim the allow-list of the App Store Connect **"iPhone 6.5-inch Display"** slot. 1320x2868 (what rounds 1-2 captured, from an iPhone 17 Pro Max sim) is the **6.9-inch** size and is the current preferred one. ASC exposes only two iPhone slots (6.9" and 6.5") and auto-derives every smaller size from whichever is populated; when a legacy 6.5" set already exists on the app, the Media Manager pre-selects that tab and 6.9" files dropped there get rejected. Validation is an exact per-slot allow-list — one pixel off fails, there is no aspect tolerance.

Two valid fixes: (a) upload the 1320x2868 set into the **6.9" slot** and delete the 6.5" set (zero work, preferred); (b) capture natively at 1284x2778. Round 3 did (b) since it satisfies either path.

Slot reference (portrait): 6.9" = 1320x2868 (also tolerates 1290x2796) · 6.5" = 1284x2778 **or** 1242x2688 · everything smaller is auto-scaled by Apple.

Device types that produce these natively (all present and iOS 26.5-compatible; empirically verified):

| Target | Device type | Sim kept on this Mac |
|---|---|---|
| 1284x2778 | `iPhone-14-Plus` (also `iPhone-12-Pro-Max`, `iPhone-13-Pro-Max`) | `ASC-65-1284` (`000F1A66-9724-4589-A40A-6246689EE9E1`) |
| 1242x2688 | `iPhone-11-Pro-Max` (`iPhone-XS-Max` exists but can't pair with iOS 26.5 — iOS 26 dropped A12) | `ASC-65-1242` (`9735A35E-57BC-4FF9-8A2E-F61466DED239`) |
| 1320x2868 | `iPhone-17-Pro-Max` | not kept (rounds 1-2 created and later removed it) |

These two ASC sims are kept deliberately for store captures — they are the documented exception to the "this Mac keeps exactly one simulator" rule in the soli-testing skill. `iPhone 11 Pro`/`iPhone XR`/`iPhone 11` are 828x1792 @2x despite being in the 6.5" marketing bucket — do not use them.

Result: 10 shots in `.test-artifacts/store-screenshots/r3-ios-1284x2778/` (alternates in `_frames/`), all verified 1284x2778, 8-bit RGB, sRGB. Rounds 1-2 folders untouched.

| File | Content | MOVES / TIME |
|---|---|---|
| `01-fresh-deal.png` | Fresh deal, empty foundations | 0 / 0:00 |
| `02-midgame-late.png` | Scrubbed fixture 70/80, Undo visible, foundations 2♥/A♣ | 80 / 3:56 |
| `03-nearwin-covered.png` | nearwin `left=45` → exactly 2 face-down, fat foundations (5♥/5♦/3♣/6♠), long ordered runs | 199 / 7:02 |
| `04-celebration-fireworks.png` | mode 39, symmetric spade fountain + club burst | 149 / 6:56 (synthetic) |
| `05-celebration-meteorshower.png` | mode 32, full-screen diagonal streaks | 161 / 5:38 (synthetic) |
| `06-celebration-spirograph.png` | mode 36, dense screen-filling mandala | 128 / 5:05 (synthetic) |
| `07-celebration-youwin.png` | mode 43, complete "YOU WIN!" before the Y re-deals | 177 / 6:23 (synthetic) |
| `08-win-dialog.png` | REAL win → "Start a new game? Nice win!" over the Kings fan | 247 / 25:05 |
| `09-settings.png` | Full settings incl. Hint button + Warnings select; Developer mode OFF | — |
| `10-history.png` | 10 games / 5 solved / 4 incomplete, seeded + active rows | — |

Round-3 verdicts: `03`, `05`, `06`, `07`, `09` are the strongest. `06` spirograph remains the best celebration (confirms the round-2 verdict). `04` fireworks is still the weakest mode — the shipped frame is `_frames/04-fireworks-d.png` (previous pick preserved as `_frames/04-fireworks-PREVIOUS-PICK.png`).

Known nits, all cosmetic and none blocking upload:

- `08-win-dialog.png` reads **25:05** — a real win driven by an agent playing manually, so the clock ran long. Unflattering but authentic; a recapture means replaying a whole win.
- `02-midgame-late.png` is sparse (foundations only 2♥/A♣, bottom half empty felt). Same complaint as round 2 — the scrubbed fixture keeps most cards in the tableau at 70/80. A richer mid-game needs a different fixture, not a different scrub index.
- `10-history.png` row 2 is an agent-test row (`0 moves · 0:00`), and the seed rows carry synthetic-looking deal ids (`0000-0001`, `0000-0002`) next to real ones (`PZ6U-C26R`). Cosmetic.
- Verified on device: the round-3 synthetic-stats change works — every celebration shot matched its documented deterministic pair exactly, and the timer stayed frozen across each capture loop.

Alpha: `xcrun simctl io ... screenshot` emits 8-bit **RGBA**, and Apple's spec says screenshots can't include alpha. Final pass is `ffmpeg -y -i in.png -pix_fmt rgb24 out.png` — note `sips -s format png` does NOT strip it. Capture with `--mask=ignored` for a clean full rectangle with no baked-in rounded corners. The rounds 1-2 sets were never alpha-stripped.

### Round 2 shot list

- Celebrations (screenshot mode, several modes so Karim can pick — suggested: 39 Fireworks, 36 Spirograph, 27 Galaxy, 32 Meteor Shower, 22 Vortex, 46 Kaleidoscope, 43 You Win): 2-3 frames each, keep the best per mode as `08-celebration-<name>-{a,b}.png`. Fire on a visually clean board (fresh deal or judge from frames — preview overlays the current board).
- `02b-midgame-late.png`: scrubbed fixture further along, e.g. `soli://?demo=scrubbed&steps=80&scrub=70&screenshot=1` — foundations visibly filled, Undo visible, plausible MOVES/TIME (nudge + wait).
- `03b-nearwin-covered.png`: nearwin with 2-3 face-down cards still visible (try `yarn nearwin 12` upward until 2-3 face-down in frame; check via snapshot --raw or visually).
- `09-settings.png`: Settings screen (drawer → Settings). Developer mode row must show OFF.
- `10-history.png`: History screen with seeded rows (`yarn seedhistory`; on the phone `yarn seedhistory clear` afterwards — real rows will also be visible on the phone, that's fine/authentic; on sims seed freely).
- iPad: best 1-2 celebrations + settings (fresh-deal/mid-game already exist from round 1).

### Round 2 iOS results (2026-07-09)

iPhone (1320x2868, `.test-artifacts/store-screenshots/ios/`, staging frames kept in `_r2frames/`):

- `08-celebration-fireworks-a.png` — mode 39, mid-burst with trails; decent but busy.
- `08-celebration-spirograph-a/b.png` — mode 36, dense screen-filling mandala; **best iPhone celebration**.
- `08-celebration-galaxy-a.png` — mode 27, small rotating cluster, lots of empty green; weakest of the pool.
- `08-celebration-meteorshower-a.png` — mode 32, full-screen diagonal streaks; strong.
- `08-celebration-vortex-a.png` — mode 22, rotating ring with comet tail; clean but center is empty.
- `08-celebration-kaleidoscope-a.png` — mode 46, dense rosette/wreath; **top-2 with spirograph**.
- `08-celebration-youwin-a/b.png` — mode 43 spells "YOU WIN!" progressively; full text at ~23-27s (a = complete + "!", b = complete but the Y is already re-dealing). Unique message shot.
- `02b-midgame-late.png` — scrubbed 70/80, foundations 2♥/A♣, Undo visible, 80 moves / 3:50.
- `03b-nearwin-covered.png` — nearwin `left=45` = exactly 2 face-down cards, fat foundations (19 cards up), 201 moves / 5:48.
- `09-settings.png` — full settings list, Developer mode OFF (screenshot mode kept it off), Draw 3 visible in picker.
- `10-history.png` — seeded rows (9 games / 5 solved / 3 incomplete, varied dates + draw counts).

iPad (2048x2732, `.test-artifacts/store-screenshots/ipad/`): `08-celebration-spirograph-a.png`, `08-celebration-kaleidoscope-a.png` (both stunning at tablet size), `08-celebration-bonus-infinity-a.png` (figure-8 mode from a real win, free bonus), `09-settings.png`.

Celebration recommendation: spirograph + kaleidoscope are the strongest store shots (screen-filling, iridescent card trails); youwin-a is the best "message" shot; galaxy can be dropped.

### Round 2 Android results (2026-07-09)

All 1080x2412, `.test-artifacts/store-screenshots/android/` (staging frames + a scrolled history alternate in `_r2frames/`); round-1 files untouched:

- `08-celebration-spirograph-a/b.png` — mode 36, dense screen-filling mandala (a = fully developed rosette, b = earlier/looser). Best Android celebration, matches iOS verdict.
- `08-celebration-kaleidoscope-a/b.png` — mode 46, dense wreath/rosette (a = densest late frame). Top-2 with spirograph.
- `08-celebration-youwin-a/b.png` — mode 43 (a = clean full "YOU WIN" at ~22s before the "!", b = full "YOU WIN!" at ~28s but the Y is already re-dealing). Same timing behavior as iOS.
- `08-celebration-meteorshower-a.png` — mode 32, full-screen diagonal streaks with trails.
- `08-celebration-fireworks-a.png` — mode 39, vertical launch trails + bursts; decent but sparser than the top-2.
- `02b-midgame-late.png` — scrubbed 80/70, foundations 2♥/A♣, Undo visible, 80 moves / 4:04.
- `03b-nearwin-covered.png` — nearwin left=45 → exactly 2 face-down cards (same as iOS), fat foundations, 199 moves / 5:15.
- `09-settings.png` — full settings list, Developer mode OFF, Draw 1 (Karim's real setting, vs Draw 3 on the iOS sim).
- `10-history.png` — summary header (153 games / 57 solved / 95 incomplete incl. seeds) + recent rows; real + seeded rows mixed, authentic. Note: the visible top rows are today's agent-test rows (several "0 moves" incompletes) — scrolled alternate in `_r2frames/10-history-scrolled.png`.

## Plan: Files to modify

None (artifact-only task). Output: `.test-artifacts/store-screenshots/`.

## Files actually modified

- `docs/product/store-screenshots/store-screenshots.md` (this plan)
- `src/features/klondike/hooks/useDemoGameLauncher.ts` — screenshot mode: `screenshot=1` (accepts 1/true/on) on any demo link forces dev mode OFF instead of ON (one shared `applyLinkDeveloperMode()` per branch); `screenshotMode` option threaded into `handleLaunchDemoGame` so the force-launch path doesn't re-enable dev mode
- `scripts/deeplink.js` — `--screenshot` flag appends `screenshot=1` (before any `#fragment`) for all shortcuts + raw URLs
- `.agents/skills/soli-testing/SKILL.md` — screenshot mode documented in the deep-link catalog + wrapper + celebration + logs sections; the "toggle developer mode OFF after every link" workaround replaced; round 3: synthetic celebration header stats (per-mode table, override syntax)
- Round 3 (`src/features/klondike/celebrationPreviewStats.ts` NEW) — pure, deterministic MOVES/TIME resolver + `CelebrationPreviewStats(Request)` types
- Round 3 (`src/features/klondike/hooks/useCelebrationController.ts`) — optional `previewStats` on `CelebrationState`; `startCelebrationPreview(modeId?, previewStatsRequest?)` resolves them against the resolved mode id
- Round 3 (`src/features/klondike/hooks/useDemoGameLauncher.ts`) — exported pure `parseCelebrationStatsLinkParams` (`screenshot=1` / `&moves=` / `&time=`), forwarded to the preview
- Round 3 (`src/features/klondike/hooks/useKlondikeGame.ts`) — statistics-HUD memo moved below the celebration controller and overridden by `celebrationState.previewStats` (display-only)
- Round 3 (`test/unit/features/klondike/celebrationPreviewStats.test.ts` NEW) — determinism, plausible band for every real mode, override + nonsense-override handling, link gating

## Intermediary learnings

- Screenshot mode (round 2, 2026-07-09): both dev-UI surfaces gate on the ONE `developerMode` setting — the Demo header button via `sessionControls.developerModeEnabled` (`app/(tabs)/index.tsx`) and the celebration badge via `celebrationLabel` (null when `!developerModeEnabled`, `useCelebrationController.ts`). So "process link + setDeveloperMode(false)" IS the whole feature; dev-hold looping/tap-to-dismiss live in refs (`celebrationHoldRef`/`celebrationPreviewRef`) independent of dev mode and keep working badge-less. Trade-off: devLog goes silent on screenshot links (accepted). Badge tap-to-cycle is unavailable without the badge — re-fire `yarn celebration <id> --screenshot` per mode.
- Round-1 learnings about toggling the Developer-mode switch after every link (tap targets x≈370/x≈954/(927,1860)) are OBSOLETE for screenshot capture — use `&screenshot=1`/`--screenshot` instead. Toggle coordinates still apply for manually flipping the setting.
- Play Store screenshot URLs live in the page HTML as `play-lh.googleusercontent.com/...` (append `=w1080` for full size); App Store as `is1-ssl.mzstatic.com/.../600x1300bb.webp`.
- Old listing sizes: App Store iPhone shots 1290x2796-class (rendered 600x1300), iPad 2048x2732-class; Play phone shots 1080x2412, plus two 1080x1728.
- iOS pass (2026-07-09):
  - First `yarn ios` build failed at `pod install` (ExpoModulesCore/ExpoModulesWorklets podspec drift vs Podfile.lock snapshot). Fix: `cd ios && pod update ExpoModulesCore ExpoModulesWorklets --no-repo-update`, then rebuild (12:24 total).
  - **Every demo deep link re-enables developer mode**, which puts a "Demo" button in the header — visible in store shots. After EACH fixture link, toggle Settings → Developer mode OFF before capturing. Tapping the row label does nothing; tap the switch control itself (right side of the row, x≈370 on Pro Max, x≈954 on iPad Air 13").
  - Fixture timers start at 0:00 and only tick after a user interaction — 80 moves at 0:00 looks fake. Tap undo or stock once, then let the sim sit a few minutes for a plausible MOVES/TIME pair.
  - Near-win finish: tapping the waste card auto-plays it to the foundation (smart tap-to-move) — the win can trigger one tap earlier than expected; start the screenshot loop BEFORE the final tap.
  - Real-win celebration mode is random; got scatter (attempt 1, frames unusable — win dialog already up) and ring/wreath (attempt 2, great frames ~2.5-7s in). Dialog appears late (~30s hold), so frames in the first ~10s are dialog-free.
  - `soli://?reset=game` does NOT dismiss an open "Start a new game?" win dialog on iOS — the dialog blocks the board; tap "Deal Again" instead (it deals with the new settings).
  - iPad: installing the DerivedData `Soli.app` onto a freshly created iPad Air 13" (M3) sim worked first try; same 9:41 status-bar override applies. First deep link popped the "Open in Soli?" alert (confirmed once via agent-device), and the cold link needed a re-fire after confirming.
  - iPad status bar shows date next to 9:41 ("Thu Jul 9") — unavoidable simctl behavior, matches Apple's own store shots.
- Android pass (2026-07-09):
  - Installed build (15:55) was newer than the last commit — reused, no rebuild.
  - A CONCURRENT agent session was driving the phone at session start (a celebration badge-cycle loop tapping `celebration-debug-badge` + firing celebration deep links) — it kept re-enabling developer mode and overwriting board state mid-capture. Waited for its shell loop to exit before proceeding. Lesson: `agent-device session list` does not reveal other Cursor shells running adb/yarn loops; check `ps` for competing soli commands too. That session also finished the hydrated demo game (one solved row at 15:57, moves=63, not part of this pass's win budget).
  - Developer-mode switch on Android Settings: tap the switch control at ~(927, 1860) on 1080x2412 (the row label does nothing) — needed after EVERY fixture/set/reset deep link, same as iOS.
  - Android fresh deal auto-reveals one stock card (waste shows a face-up card, stock 23/24 at moves 0) — app behavior, matches on repeat deals.
  - `?set=drawCount:3` delivered while the "Start a new game?" win dialog was open did NOT apply (Settings still showed Draw 1); re-firing after dismissing the dialog applied fine (devLog confirmed). Deliver `?set=` links only with no dialog up.
  - Scrubbed fixture MOVES counter shows 80 (total replayed moves), not the scrub index 40.
  - Fixture timers: nudge one interaction (undo tap / foundation select-deselect), then wait 2-4 min → plausible MOVES/TIME pairs (02: 80 moves 3:27, 03: 238 moves 4:53).
  - Celebration randomness: attempt 1 drew a compact "card snake" mode (small moving cluster, mostly empty screen — poor store shot); attempt 2 drew a full-screen fountain/firework mode with card trails (kept as 07a/b/c). Win dialog appears ~30 s after the win, so celebration frames in the first ~10 s are dialog-free; capture loop: screencap every ~0.7 s for ~14 frames.

- Round 2 iOS pass (2026-07-09):
  - **Screenshot mode works flawlessly** (first real use): ~40 frames across 7 celebration modes + fixtures, zero Demo buttons / badges / dev toasts. `yarn deeplink '<url>&screenshot=1' --ios` and re-firing per mode both behaved as documented.
  - Celebration frame timing: modes loop in dev-hold; 4 frames at ~2/4/6/9s covers most modes. Mode 43 (You Win) spells "Y-O-U W-I-N-!" progressively — full text needs frames at **~23-27s** after the link.
  - **Timer nudge gotcha**: tapping a foundation card as a "harmless" nudge MOVED two cards off the foundation (tap-to-move selected + auto-played). Undo (`undo` testID / label selector `label=Undo`) restored the board; moves counter keeps the +2/undo history (201 vs 199 — still plausible). Safer nudge: tap Undo once then Redo, or tap empty green.
  - Scrubbed fixture timer ticks WITHOUT a nudge on iOS now (0:04 right after load) — just wait ~3-4 min for a plausible pair.
  - nearwin face-down calibration on this fixture: left=12/20 → 0 face-down, left=35 → 1, **left=45 → 2**. `snapshot --raw | rg -c 'Face-down'` counts them (2 tree entries per card — divide by 2).
  - **App wedged after `simctl uninstall` + `install` + `launch` while running**: deep links went completely dead (openurl silent, no alert, no JS handling, XCTest main-thread timeouts) — cost ~30 min of debugging. Fix: `xcrun simctl terminate` + `launch`, links work again immediately. If links stop responding, restart the app FIRST before suspecting screenshot mode or the seed pipeline.
  - `seedHistory` verification without logs (screenshot links mute devLog): query the sim DB directly — `sqlite3 "$(xcrun simctl get_app_container <udid> ch.karimattia.soli data)/Documents/SQLite/soli-history.db" "SELECT count(*) FROM history_entries WHERE id LIKE 'seed-%';"` (8 rows; the 9th active seed row is skipped when a real active row exists).
  - iOS drawer navigation via agent-device: label selectors (`label=History`) resolve OFF-SCREEN drawer tabs and fail ("not safe to click"); the reliable loop is tap hamburger @ref → fresh snapshot → tap the tab's fresh @ref. Refs go stale after every navigation.
  - agent-device sessions: the shared `default` session was bound to the Android phone — use a named session (`--session ios-r2`) instead of touching it.
  - iPad: celebration previews synthesize their own 52-card payload, so the underlying board barely matters (only a few leftover cards peek at the corners on 4:3). Deep links after the round-1 alert confirmation open silently, warm links fine.

- Round 2 Android pass (2026-07-09):
  - **Screenshot mode works flawlessly on Android** — ~25 frames across 5 celebration modes + fixtures, zero Demo buttons/badges. Verified on the very first frame as instructed.
  - Cross-repo device lock: an invent-repo agent held `/tmp/android-device.lock` (fresh, actively driving the phone) at session start — polled until it was released (~4 min), then claimed it. The wait-then-claim pattern worked cleanly.
  - Celebration timing on Android matches iOS: mode 43 full text at ~22s ("YOU WIN") / ~28s ("YOU WIN!" with Y re-dealing); ~2-8s window covers modes 32/36/39/46 (late frames are denser for 36/46 — the best spirograph/kaleidoscope frames were the ~7-9s ones).
  - Timer nudge: a single tap on empty green felt (~540,2150, below the tableau) started the scrubbed-fixture timer — no card interaction needed, no board risk. The nearwin fixture timer ticked on its own (0:07 right after load), same as round-2 iOS.
  - `yarn seedhistory clear` WITHOUT `--screenshot` re-enabled developer mode (Demo button reappeared during cleanup — it's a demo link like any other). Re-firing with `--screenshot` forced it back off. Cleanup links should carry `--screenshot` too.
  - Seed-clear verification without logs: History summary counts — Games 153→145 / Solved 57→52 / Incomplete 95→92 after clear = exactly the 8 seed rows.
  - `yarn ad session close` is NOT a command — it's `yarn ad close` (ends the active session); `session` only supports `list`/`state-dir`.
  - Android drawer navigation: same as iOS — tap hamburger @ref → fresh snapshot → tap tab @ref. Tapping by label (`tap "Open navigation menu"`) did nothing; tap by @ref worked.

## Identified issues

- iPhone `01-fresh-deal.png`: captured right after app launch — board is fine (moves 0, 0:00) but the deal shown is whatever the launch dealt; if a prettier fresh deal is wanted, re-run `soli://?reset=game` + dev-mode-off dance.
- iPhone `05-draw3-fan.png`: foundations empty (fresh Draw 3 game, 3 draws in). Acceptable per shot list; a mid-game Draw 3 variant would need manual play.
- The two sims created for this run (iPhone 17 Pro Max `D7044841`, iPad Air 13-inch (M3) `8C77E36E`) were kept for future screenshot runs; original iPhone 17 Pro re-booted, status-bar overrides cleared on both new sims.
- Android `04-win-dialog.png` shows MOVES 244 / TIME 0:26 (nearwin fixture finished immediately) — slightly implausible pair, but the dialog is the focus; recapture with a timer nudge if it bothers.
- Android history rows added by this pass: 2 solved (both real wins for celebration capture) + ~6 incomplete (fixture loads and resets). One additional solved row (15:57) came from the concurrent agent session, not this pass.
- `sysui_demo_allowed` was left at 1 (just the permission flag; demo mode itself was exited and the real status bar is back).

- Round 2 iOS: iPhone sim history now contains 8 `seed-` rows + this session's fixture rows (disposable, left in place); Draw setting on the iPhone sim left at Draw 3 (from round 1 pass), iPad at Draw 1. Status-bar overrides cleared on both sims; iPad shut down, original iPhone 17 Pro re-booted. Staging frames kept in `ios/_r2frames/` + `ipad/_r2frames/` as alternates.

- Round 2 Android: phone history rows added by this pass: 1 incomplete (scrubbed fixture, 80 moves / 4:31) + 1 active nearwin game (left on the Play screen; becomes incomplete when Karim deals next). Seed rows cleared. Demo mode exited (real status bar screenshot-verified), `sysui_demo_allowed` left at 1 (permission flag only, same as round 1). Screen timeout never changed (600000 ms throughout). Developer mode OFF, agent-device session closed, device lock released. `10-history.png` top rows include today's agent-test debris (several "0 moves" incomplete rows) — recapture later if it bothers, seeded rows are further down the list.

## Testing

- Visual review of every captured PNG by orchestrator (image reads) before declaring done.
- iOS: every captured PNG was read + checked by the testing sub-agent (no dev badges/toasts, 9:41 status bar, full battery, correct resolutions via `file`): 8x 1320x2868 iPhone, 2x 2048x2732 iPad.
- Android: every captured PNG read + checked (09:41 demo-mode status bar, full battery, wifi bars, no notification icons, no Demo button/dev badges): 8x 1080x2412. Cleanup verified: demo mode exited, screen timeout restored (600000 ms, unchanged), drawCount back to 1 (Karim's original), developer mode OFF, agent-device session closed (no live runner processes).
- Round 2 Android: every kept PNG read + checked against the same bar (09:41, full battery, no notification icons, no dev UI): 12x 1080x2412, `file` spot-checked. Cleanup verified via screenshots: real status bar back, Demo button gone after the `--screenshot` re-clear, seed counts down by exactly 8.

## Follow-ups

- Round 3: the change is unit-tested but NOT yet device-verified — the next screenshot agent should confirm on the first frame that a `--screenshot` celebration link shows a plausible pair (e.g. mode 36 → MOVES 128 / TIME 5:05) and that a plain `yarn celebration 36` still shows the real header. Cheap: one link, one screencap.
- Round 3 nice-to-have (skipped, avoid gold plating): a `yarn celebration <id> --moves N --time S` wrapper flag. Raw `yarn deeplink 'soli://?celebration=<id>&screenshot=1&moves=N&time=S'` already covers it and keeps the wrapper a delivery tool, not a link catalog.

- Android tablet screenshots via emulator, if the Play tablet slots should be refreshed (manual `adb install` of the release APK since `yarn release` refuses emulators). Medium effort; recommendation: only if Play flags stale tablet assets.
- Optional recaptures if the pairs bother: Android win dialog (244 moves / 0:26) and Android Draw-3 fan (1 move / 0:56) have slightly implausible MOVES/TIME pairs; a timer nudge fixes both. Low effort.
- Marketing-framed screenshots (device frame + caption text) — different style from today's plain shots; bigger lift, only if Karim wants a store-page redesign.
- Testing-skill learning already applied by sub-agents (dev-mode switch tap targets, concurrent-session gotcha).
