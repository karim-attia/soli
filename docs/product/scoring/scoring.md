# Scoring (Off / Standard / Vegas)

Status: v1 IMPLEMENTED 2026-10-11/12 (implementation sub-agent) with the round-2 decisions from the user's second prompt; cheap gates green; device smoke test (S11) DONE 2026-10-12 on Android phone + iOS simulator, all checks pass (§ Testing). Nothing staged or committed. **Phase 2: slices P2-A (rules core) + P2-B (Vegas-aware detection + game end) IMPLEMENTED 2026-10-13, cheap gates green, device test (P2-D) DONE 2026-10-13 on the iOS simulator — all checks pass, no bugs (Android phone unreachable; § Testing (Phase 2) results); P2-C (cumulative bankroll) and P2-E not started** — see § Phase 2 at the end of this file. **Round 2 (prompt 5, 2026-10-13): casino experience — game-over wording, hint button hidden in Vegas, Vegas settings note, spoken HUD badges (P2-E), cumulative total (P2-C) with "every deal costs $52" — see § Phase 2 round 2 at the very end (status there).** **Round 3 (prompt 6, 2026-10-13): Vegas game-end detection REMOVED (no bubble of any kind in Vegas), New Game button in the dock's Hint slot at stock exhaustion, shorter Scoring copy / clearer Vegas-total copy, three Vegas fixtures (`?demo=vegas|vegaslastpass|vegasnearwin`) — IMPLEMENTED, gates green (43 suites / 455 tests), device test round 3 DONE 2026-10-13 on Android phone + iOS simulator: all script checks pass, one real bug (TOTAL badge double-counts a win that happens during hydration — display only; **FIXED as G8 2026-10-13, gates 45 suites / 458 tests, Android re-check PASS**) and three cosmetic observations (Demo sheet labels fixed with G8) — see § Phase 2 round 3 at the very end.**

## User prompt

> Hey, please figure out the concept for scoring the solitaire game. I've had the request for like standard and Vegas counting. I feel like this should be an option, even counting overall, should probably be off by default in the settings, but l you can kind of turn it on or like you have a drop down that's like off standard in Vegas, please like research these three things and how you would then add that visually and so on. Thank you.

> Hey, yeah, please start implementing this question what should be like the like format of number formatting for example from 1240 is that like device specific or how does that work and Do we really need to show this in like the win alert? Because like we also don't show the time and move count either probably so I'm not sure I would show this extra when we still show like the we still also show movement time regularly, like in the field after win, right? So, I'm not sure about that. yeah the history I don't know would we just like store both counts by the way and then in the history show whatever is active in the settings or I yeah or even write that does that make sense And about your questions, please research how others do this. And like what are like best practices and you know how do like especially how does like the Microsoft and the mobilityware do this if they have this? And no, I don't mean it running total. I meant as whether it's you read this correctly whether as a whole it's off by default
>
> Question: Does Vegas really need that plus or just show the total? Would the total be sufficient? What do you think? Thank you

> Hey, I just checked it a bit. It's the first time for me playing Vegas. Now I kind of just start to understand the interestingness of it. It's an actual casino game, I guess I feel like it should be a toggle to show score, and if score is shown, to kind of show what kind of score is shown, and or no, I mean maybe it's also just fine with drop down off standard Vegas, but I guess it should be a separate thing to have Vegas cumulative. I'm sorry, I feel like to stay close to the actual casino game. I don't think timed scoring makes a lot of sense because it just gives super random numbers, and especially if you play cumulative, there's you'll be like if you ever win a game, it'll be like sky high. I just played Microsoft Solitaire Collection, and 3 passes are enforced, which feels kind of wrong. I guess we should probably do the mobility wear thing because then you actually play with a casino model. I guess draw 3 should have 3 passes, otherwise 1 passes or draw 2 gets 2 passes, draw 4 hits 4 passes, draw 5 hits 5 passes if that makes sense. Please do some further research on non-doo cost and also figure out what it would mean to have a pass limit. Do we just show an X when you can't pass no more, or do we show a dialogue like game over or whatever? Maybe the pass limit you recommend for we won, but I guess this right now is the follow-up. Do we have accessibility labels for all the other things? If yes, then we should just be consistent.

> Does it even make sense to have a solver when playing Vegas? And the Unwinnable warning, does it matter, and that kind of vague scenario? Or, for example, would it just make sense to turn off the Unwinnable warning because if you have a pass limit, then after 3 times, you're done anyway? I think the Unwinnable warning is more important because otherwise you can continue forever and it gives you a hint, hey, you know, man, stop it, you're done.

("non-doo cost" = undo cost.)

> Hey, no more useful moves. Is that really the right thing to do at the Vegas game? It's just more like the end. I feel like no more useful moves is more confusing. For Vegas about the hint button, I'm unsure. Either we completely hide it. I think that would make a lot of sense. My logic is general: if you're playing that Vegas thing, you're playing the gambling thing, and honestly I think it's utterly stupid to give $5,000 at the end for time bonus because the whole point of this is you're playing the casino game, and that would speak against the hinting because in the casino you don't get a hint. Also, kind of the hand thing doesn't really work that well potentially with the limited passes that makes me think to turn the hints off the hint button. We could also argue to keep the hint button and just show any move, but this any move thing is kind of, so anyway, it helps you if you're tired, but I feel like in a Vegas thing the game is so short potentially. Probably, I would turn it off for now and probably when Vegas is selected, then we should maybe below in the scoring section show that what this means that we don't show hints and solvable games because we want to do the casino thing and it doesn't make that much sense, but do this super non-technical, super concise, just very short, very nice. And yes, I do think it makes sense to switch into or out of Vegas, starting from the next game. Yes, please label all three batches with accessibility, why not? I would say abandoning in a game costs 52, yes abandoning, and new game without a move should also cost because in the casino it costs you and you know you could otherwise just cycle through until you see 4 aces. And retry. I would also pay this. Let's make this a casino experience. By the way, the phone is connected via ADB now.

("hand thing" = hint; "batches" = badges.)

> Hey, where do we show this game end text? And should we even show a game end text if the user's not winning? Maybe I have an idea, I'm not sure if it's good. What do you think? So we're not showing the hint button so we have a free slot. So when we're through the passes that are available in Vegas, should we instead of the hint button show a new game button that appears and you can then restart because you're not naturally at the end of the game? And by the way, I don't like the settings text with Vegas selected. It's like it describes it too much. Just say hints are off and the solvable games are off, and whatever, these things don't need to explain the whole thing. I feel like it's super. Both, the keep Vegas Total Switch and reset Vegas Total button under the drop-down and wonder what you mean. Please explain better, thanks. You already changed the sentences you mentioned, please tell me what they are now, thanks. And you're saying game over can occasionally be premature. I don't like this question. Is it really, I mean, I'll also already mentioned above, do we even should we even have something that even says game over? I feel like the user should decide themselves, they check if they can do anything still and then start a new game. Also probably makes the Codex simpler. By the way, you don't need to do tell me what it did on my phone if you starting a game or whatever. This is totally fine, just do your job and also the data, the Vegas Total or whatever, I don't care, and also the history, there's a demo fixture even with a demo sheet, maybe it makes sense to have to load a winnable Vegas game or different stuff like this to have a couple of specific Vegas test cases to manually run, but also for an agent to automatically run. What do you think?

## Summary

(update as we go)

- 2026-10-13 (round 3 device test, testing sub-agent, Android Nothing A065 Release versionCode 16 + iPhone 17 Pro simulator iOS 26.5 build 15): every step of the round-3 script PASS on both platforms — no bubble/announcement in Vegas under both warning modes with 0 `[solver]` lines until the Standard phase, New Game pill appears exactly at exhaustion / hides on undo / opens the existing alert / Deal Again charges once, captions 2 left → 1 left → ⊘ on undo, Vegas near-win win at $208 with TOTAL +5 once and Deal Again −52 once (History: one `Vegas $208` row per win), Reset on a won board → `$0` then `−$52` (iOS), settings strings verbatim, Demo sheet row present, Standard/Off regression (SCORE, Hint, `[solver] source=auto/hint`, unlimited recycle, no pill). **Bug found**: after kill + relaunch of the near-win fixture with Auto Up on, auto-complete wins the game during hydration and the TOTAL badge shows the win TWICE (+$208 settled row + $208 live; iOS −$359 → −$146, Android −$220 → −$7) until Deal Again — the stored data is right (one row; next deal shows the correct total). Cosmetic: Android Scoring picker label blank right after a `?set=scoring:vegas` link (recovers on relaunch), Demo sheet labels truncated "Vegas last …" on both, Android sheet's Testing row needs a swipe at the default detent, iOS Warnings description truncated to one line (pre-existing). Results + screenshots `p2r3-*` in § Testing (round 3).
- 2026-10-13 (round 3 / prompt 6, implementation sub-agent): the Vegas "Game over — result …" bubble and every other warning are gone from Vegas-rules games (one gate: `useHint` runs with warning mode `'off'` when `state.vegasRules`; `formatVegasResultNotice`, the pass-aware `collectReachableWasteTops` parameter and `UsefulMoveBoard.stockPasses/vegasRules` deleted with their tests); a **New Game** pill appears in the dock's left (Hint) slot once a Vegas game's stock is empty with no pass left and calls the existing `requestNewGame` (header New Game stays — redundancy reported); Scoring copy shortened (`Hints, warnings and solvable deals are off in Vegas. Applies to your next game.`), Keep/Reset Vegas total copy made clearer per the user's "explain better"; three Vegas fixtures (`vegas`, `vegaslastpass&left=N`, `vegasnearwin&left=N`, Demo sheet row + `yarn vegas …`) charged like real deals. Gates green. Device test round 3 pending (script below).
- 2026-10-13 (round 2 device test, testing sub-agent, Android phone Nothing A065 / 411 dp, Release build versionCode 16): gates green (42 suites / 455 tests); every executed check PASS — settings copy + row visibility, Hint button hidden only on Vegas-rules games, spoken badge labels, "Game over — result −$47" bubble with 0 `[solver]` lines, cumulative arithmetic step by step (−52 → −104 → −156 → −208 → −203 → −255 → −307 via abandon / zero-move abandon / `?deal=` / foundation card / Retry), reset, switch off/on, kill+relaunch without double charge, Draw 3 "2 left"/"1 left"/⊘ captions + Draw 1 single pass, refused tap, undo gives the pass back, History segments under all three modes, Standard/Off regression. NOT RUN: real Vegas win (step 7) and reset on a won board (step 9). Screenshots `p2r2-android-*.png`.
- 2026-10-13 (round 2 / prompt 5 — casino experience, implementation sub-agent): Vegas bubble now "Game over — result −$47. Undo or deal again." (false-end analysis in § Phase 2 round 2: rare, game stays playable); Hint button hidden on Vegas-rules games (game's `vegasRules`, not the setting; dead Vegas hint branch removed); Scoring description switches to a short casino note when Vegas is selected; all HUD badges carry spoken a11y labels + testIDs; EVERY Vegas deal costs $52 (zero-move abandons, retries, shared deals; the won-session crash-repair now writes scores too); cumulative total (P2-C) shipped as "Keep Vegas total" switch + TOTAL badge (settled history − reset offset + live game) + "Reset Vegas total" button; `?set=vegasTotal:on|off`. Gates green (42 suites / 455 tests). Device test pending (Android phone).
- 2026-10-13 (P2-D device test, testing sub-agent): full Phase 2 script run on the iPhone 17 Pro simulator (iOS 26.5, Release build 15) — every check PASS, no bugs. Android phone was not reachable over wireless adb, so no Android pass. Deterministic fixture used for the Vegas game end: deal `E1_3wg0zvd1izdp5860yamwkszzaj908rw031kavl52rtlu` (after tapping through all passes with no plays, the only useful move is A♦ from column 7; after it nothing is useful → bubble "result −$47"; works for Draw 1 and Draw 3). Not run: auto-complete at the pass limit (step 12, jest-covered), foundation→tableau dig inside the era (fixture has no legal target), `yarn nearwin` (covered 2026-10-12). Results table + screenshots (`p2-ios-*.png`) in § Testing (Phase 2).
- 2026-10-13 (Phase 2 implementation, slices P2-A + P2-B, implementation sub-agent): Vegas is now a rules mode. `GameSnapshot.vegasRules` is copied from the Scoring setting at deal time (draw-count precedent; applies to the NEXT game); pass limit = draw count via `recyclesAllowed`/`recyclesLeft`/`canRecycle` in `scoring.ts`; ONE enforcement point (`recycleWasteToStock` returns the state unchanged → no log entry, no undo snapshot, no moveCount, no `MOVE_LOG_VERSION` bump); auto-complete stops at the limit. Stock slot: "N left" caption on the recycle card (Vegas games only) and a 4th `CardBack` variant `'exhausted'` (lucide `Ban`, disabled, label "Stock, no passes left", same testID). HUD badge rule: Off → none; Vegas-rules game → VEGAS; else SCORE. `useHint`: a Vegas-rules game never calls the solver — `unwinnable` behaves as `noUsefulMoves`, the pass-aware stuck heuristic fires directly at the end of the last pass with the result in the bubble ("No more useful moves — result −$17. Undo or deal again."), the Hint button goes straight to the classic fallback. History: `vegas_score` only for Vegas-rules games that were played (NULL for unlimited games and zero-move abandons); `standard_score` for every game. Settings: Scoring row moved to **New Games** (next to Draw count / Solvable deals — the app has no "Gameplay next to Draw count"; the plan's section name was off) with the Phase 2 copy; Warnings copy gained the Vegas sentence. Vegas deals skip the solvable catalog (random deal; `solvable` is DERIVED from the catalog on the row, so it comes out false by itself — no write needed). Open questions 1–5, 8–10, 12 proceeding with the recommendation. Deviations from the plan: `createSolvableGameState` gained no argument (Vegas never uses it); the "N left" caption/label helpers live in `accessibility.ts` (`getStockRecycleLabel`, `formatRecyclesLeft`); `scoresForGameRecord` is a pure exported helper next to `moveLogForGameRecord`; persistence stores `deal.vegasRules` (optional, old payloads = unlimited). Gates: typecheck/lint/jest green (41 suites). Device test P2-D not run (separate agent).
- 2026-10-12 (planning round 3, after the user played Vegas — nothing implemented): decisions from the two new prompts: keep the single Off / Standard / Vegas picker; **timed scoring rejected** (arbitrary huge numbers, would swamp a cumulative bankroll — moved out of follow-ups); **Vegas becomes a rules mode**: passes through the stock limited to the draw count (Draw N = N passes), solver-backed features switched off in Vegas (no pass-aware solver), the cheap "no more useful moves" detection made pass-aware and used as the Vegas game end; **cumulative bankroll** as a separate switch shown under the picker when Vegas is selected. Research (§ Phase 2 research): no app found that charges for or forbids undo in Vegas (MobilityWare states an undo cost only for Standard; PySolFC's undo gives the pass back); pass exhaustion is handled by simply refusing the recycle (PySolFC `canDealCards` → false, a "Round N" counter next to the talon; Aisleriot "Redeals left" status text) — no app found that pops a game-over dialog; cumulative = running total settled at game end incl. abandoned games (PySolFC `endGame`, classic Windows "Keep score"), reset by an explicit action. Concept + slices in § Phase 2. **a11y**: the Moves/Time badges are plain `Text` without `accessibilityLabel` (convention: labels on interactive/board elements and announced bubbles only), so nothing was changed for the score badge; a one-line "all three badges" label is listed as an optional slice.
- 2026-10-11 (implementation, round 2 decisions from the user's second prompt):
  - **No score line in the win alert** — the HUD (Moves/Time, now Score) stays visible on the board after a win (verified in code: `KlondikeGameView` always renders the header `StatisticsHud`; the celebration overlay lives inside the board shell below it), so the alert would duplicate it.
  - **History stores BOTH tallies** (`standard_score`, `vegas_score`, nullable INTEGER) with no mode column; the row shows whichever matches the current Scoring setting, nothing when Off or NULL (old rows). The setting is display-only, so switching mode later still shows meaningful history.
  - **Number formatting**: Standard uses device-locale digit grouping via `Number.prototype.toLocaleString()` (Hermes ships Intl on both platforms; the app already uses `Intl.DateTimeFormat` in the history screen). Note: untimed Standard maxes at 740, so grouping only matters once timed scoring (F1) exists.
  - **Vegas: no plus sign** — `−$52`, `$0`, `$158` (literal `$`, U+2212 minus). One-line change in `formatVegasScore` if the plus is wanted back.
  - "Even counting overall" = scoring as a whole is off by default (confirmed). No cumulative total.
  - Pass limits / timed scoring / undo penalty / hints: proceeding with the recommendations (display-only, none, none, free); competitor research (Microsoft, MobilityWare) pending in a separate agent.
- 2026-10-11: Research + concept + plan done. Recommended v1: one setting `scoring: 'off' | 'standard' | 'vegas'` (default off), both tallies computed in the reducer on every board-changing action and stored on `GameSnapshot` (so undo/scrub/persistence/replay stay consistent for free), the setting only selects what the HUD shows. Untimed Standard (Windows point table, no −2/10 s decay, no time bonus) and display-only Vegas (−$52 buy-in, +$5/foundation card, −$5 when a card leaves a foundation [Soli decision, sources silent], pass limits NOT enforced) for v1. Research (2026-10-11) confirmed the Windows table across five independent sources; MSC/MobilityWare exact values remain unverified (no official pages exist). Score badge in the existing stats HUD, score line in the win dialog, score + mode recorded on the history row. Timed scoring, undo penalty, pass-limit enforcement, cumulative Vegas bankroll, best-score tiles and floating "+10" feedback are follow-ups.

## Description

Players have asked for the two classic Klondike scoring systems popularised by Windows Solitaire: **Standard** (points per move type, optional time decay/bonus) and **Vegas** (you "buy" the deck for $52 and earn $5 per card you get onto a foundation; the running total is your profit or loss). Scoring is a classic part of the genre, and it adds a light "beat my best" loop that pure win/loss does not. It is also a feature a lot of players simply expect from a solitaire app.

Soli's vision is a calm, best-in-class, ad-free solitaire. Scoring must therefore be **opt-in and silent when off**: a single Settings dropdown "Scoring: Off / Standard / Vegas", default Off, and with Off the game looks and behaves exactly as today (zero visual change). When on, the score appears as one more badge in the existing top-right statistics HUD (next to Moves/Time), in the win dialog, and on the history row.

## Research (2026-10-11)

Sources were fetched by a research sub-agent on 2026-10-11; see "Sources" at the end of this section. Anything marked *unverified* could not be confirmed against a primary source.

### Standard scoring (Windows Solitaire scheme)

The canonical table (Windows 3.x → XP → 7 `sol.exe`; still what Wikipedia and most clones describe):

| Event | Points |
| --- | --- |
| Waste → tableau | +5 |
| Waste → foundation | +10 |
| Tableau → foundation | +10 |
| Turn over a face-down tableau card | +5 |
| Foundation → tableau | −15 |
| Recycle the waste into the stock, Draw 1 | −100 per pass after the first — i.e. EVERY recycle costs −100 (the 1st recycle starts pass 2) |
| Recycle the waste into the stock, Draw 3 | −20 per pass after the third — i.e. the first two recycles are free, the 3rd recycle (pass 4) and every later one cost −20 |
| Undo | no penalty in the Windows scheme (no source lists one) |
| Timed game: time decay | −2 every 10 seconds |
| Timed game: win bonus | `700,000 / elapsedSeconds`, only if the game took ≥ 30 s |
| Score floor | 0 ("minimum score is 0", Wikipedia) |
| Untimed maximum | 740 (every card 5 + 10 via the waste, flips) |

Sources agreeing on the table: Wikipedia (Klondike), rarepike.com, solitaire.com, Dummies' Windows 7 Solitaire guide ("flip through the deck once with no penalty" / "three times with no penalty", then 100 / 20 points per later pass), Solitaire Bliss' summary.

Where sources disagree / what current apps do:

- **Recycle penalty**: Windows table (−100 Draw 1 after pass 1 / −20 Draw 3 after pass 3) vs solitaire.com's OWN site rule (graduated −100 / −40 / −20 for the 1st/2nd/3rd recycle) vs casteel.org's Mac Klondike (−25 / −100). We follow the Windows table.
- **Time bonus threshold**: "at least 30 seconds" (Wikipedia) vs "more than 30 seconds" (Dummies). Irrelevant for v1 (untimed); if F1 ships use `>= 30 s`.
- **Outliers to ignore**: classicklondikesolitaire.com ("−15 or −2 per second after 30 s") contradicts all others; Solitaire Bliss uses a completely different scheme (+100 per foundation card, −5 per undo, −20 per stock cycle); casteel.org uses −5 for foundation→tableau.
- **Microsoft Solitaire Collection (MSC)**: no official scoring page exists (support.microsoft.com, Zendesk, Microsoft Q&A searched). A TrueAchievements walkthrough snippet (5 per card to a column, 10 per card to foundation, 520 for a finished game + time bonus) and a Microsoft Q&A user thread observing 5/10/15 awards are consistent with the Windows table — *likely but unverified*. MSC offers THREE scoring types in Game options: **Standard / Las Vegas / Cumulative Vegas**, and a Statistics screen with a "High score".
- **MobilityWare** and **Brainium**: store listings advertise "Standard and Vegas scoring", Draw 1/3, "Unlimited Undo"; MobilityWare also has "Vegas Cumulative" (leaderboard) and an "Average Winning Score" statistic. Exact point values *unverified*.
- **Google's in-search Solitaire**: a TechRadar snippet says it shows "a running tally of your score, moves and playing time"; point values *unverified*; no Vegas mode found.
- **Solitaired**: does NOT use the Windows table — its Klondike score is `moves + seconds`, lower is better. Vegas is a separate game there ("Las Vegas Solitaire Turn 1/3"), not a setting.

Recommendation for Soli: ship the Windows table above (it is what players mean by "standard scoring"), UNTIMED in v1 (see Open question 1). Draw counts 2, 4, 5 (Soli supports 1–5) take the Draw-3 recycle rule; Draw 1 keeps its own harsh rule — the two Windows modes imply exactly that split. Undo: free (matches every source).

### Vegas scoring

| Event | Dollars |
| --- | --- |
| Start of game ("buy the deck") | −$52 |
| Card moved onto a foundation (from waste or tableau) | +$5 |
| Card moved off a foundation back to the tableau | −$5 (Soli's choice — see note below; sources are silent or forbid the move) |
| Break-even / maximum | 11 cards = +$3; win (52 cards) = +$208 (52 × $5 − $52); range −$52 … +$208 |
| Time | no time bonus or penalty (solitaire.com, casteel, Solitaired) |
| Passes through the stock | Draw 1: one pass only ("the game is simply over" — Dummies); Draw 3: three passes |
| "Keep score" / cumulative variant | Windows Options: "Keep Score — keep a running total of your score from game to game when using Vegas scoring"; MSC: a third scoring type "Cumulative Vegas" (new hand starts at last total − $52) |

Consistent across rarepike, solitaire.com, Solitaired, PySolFC, Dummies and MSC user posts. Where sources disagree / are silent:

- **Buy-in**: $52 everywhere except Wikipedia's "$50" — outlier, ignored.
- **Foundation → tableau**: rarepike says that in Vegas "moves to foundation are permanent" (the move is not allowed); no source documents what MSC/MobilityWare charge if they allow it. Soli keeps the move legal (same board rules in every mode — see Open question 3) and refunds **−$5**, which is the only choice that keeps "undo a foundation move" and "move the card back down" consistent with each other. *Decision, not sourced.*
- **Pass limits**: Windows, MSC ("can only flip through the draw pile three times" in Draw 3) and PySolFC enforce them; one third-party store listing describes "limited passes when Vegas scoring is enabled and unlimited when standard" — the common pattern is that **Vegas changes the rules, Standard does not**. rarepike notes variations that allow three passes in Draw 1. Enforcing is a *rules* change (see Open question 3).
- **Undo**: strict casino rules say "no undo and no hints" (rarepike), but MobilityWare and Brainium advertise unlimited undo with no Vegas exception, and MSC has undo in Vegas. Whether any app charges for an undo in Vegas is *unverified*; nothing suggests one does.
- **Bonus**: a 2015 MSC user report complains MSC added a > $3,000 bonus in Vegas and failed to deduct $52 on the first hand — treat as an MSC bug report, not a rule.
- **Cumulative reset behaviour**: MobilityWare — *unverified*; PySolFC resets when you switch games; Solitaired uses a daily-refilled coin bankroll instead.

### How leading apps present scoring (UI)

- **Placement**: the score sits in the same strip as Time and Moves. Classic Windows: status bar along the bottom ("show your score and time"); World of Solitaire: timer, score and moves at the bottom with "Show Timer / Score / Moves Made" toggles; Solitaired: toolbar counters "Score" and (Vegas) "Total". Mobile apps (MobilityWare, Brainium) put time/moves/score in the top strip — *HUD details unverified from official sources*.
- **Change feedback**: no source documents a floating "+10" for any app — *unverified*; the safe baseline is "the number updates".
- **Win screen**: Solitaired's Vegas win dialog shows "Coins Earned" and "Total Coins"; MSC shows a score plus a "Total score" (meaning disputed in a Q&A thread). Time bonus is shown when timed.
- **Statistics**: MSC "High score"; MobilityWare "Average Winning Score" + Vegas Cumulative leaderboard; Solitaired "Best Score, Win %, # Moves, Best Time, Streak".
- **Mode selection**: classic Windows Options dialog — Draw 1/3, Scoring **Standard / Vegas / None**, Timed game, Keep score (Vegas running total). MSC — Game options → Scoring type **Standard / Las Vegas / Cumulative Vegas**. MobilityWare — Settings "standard or vegas scoring". Solitaired — Vegas is a separate game, not a setting. Classic Windows had Standard scoring ON by default; defaults of the mobile apps *unverified*.
- **Rules coupling**: in Windows/MSC/PySolFC choosing Vegas also enforces the pass limit; Standard never changes rules.

Takeaways for Soli's UI: (1) a single "Scoring" picker is exactly the genre convention; (2) MSC's precedent means a cumulative Vegas, if added later, is most naturally a 4th picker option "Vegas (cumulative)" rather than an extra switch; (3) score next to Moves/Time in the existing HUD strip is where every reference app puts it.

### Sources

Fetched 2026-10-11 by the research sub-agent (65 tool calls). Pages marked "snippet" returned 403/timeouts on direct fetch and were read from search snippets only.

- Wikipedia — Klondike (solitaire): https://en.wikipedia.org/wiki/Klondike_(solitaire) ; Microsoft Solitaire: https://en.wikipedia.org/wiki/Microsoft_Solitaire
- rarepike — Standard: https://rarepike.com/solitaire/scoring/ ; Vegas: https://rarepike.com/solitaire/vegas-scoring/
- solitaire.com — scoring system: https://solitaire.com/blog/solitaire-scoring-system/ ; Vegas rules: https://solitaire.com/blog/vegas-solitaire-rules-scoring/
- Solitaired — https://solitaired.com/how-is-solitaire-scored ; https://solitaired.com/las-vegas-solitaire ; https://solitaired.com/las-vegas-solitaire-turn-3
- Dummies — Windows 7 Solitaire guide: https://www.dummies.com/article/technology/computers/operating-systems/windows/windows-10/game-cheats-for-solitaire-in-windows-7-195330
- Classic Windows Solitaire help (Options dialog, snippet): https://documentation.help/Solitaire/sol788g.htm
- casteel.org Mac Klondike scoring: https://casteel.org/Pages/Scoring.html
- PySolFC Vegas Klondike rules: https://pysolfc.sourceforge.io/doc/rules/vegasklondike.html
- Solitaire Bliss scoring: https://www.solitairebliss.com/blog/solitaire-scoring
- classicklondikesolitaire.com FAQ (outlier): https://classicklondikesolitaire.com/faq/what-is-considered-a-good-score-for-solitaire
- Microsoft Q&A threads (user posts, no official answers): MSC Klondike scoring https://learn.microsoft.com/en-us/answers/questions/98d737f4-3537-438f-8657-f28ace80230d/ ; MSC Vegas defective https://learn.microsoft.com/en-us/answers/questions/9f14573f-1ee7-4686-8622-3248a6df9623/ ; MSC High score https://learn.microsoft.com/en-us/answers/questions/a94469b5-746f-4f7f-90c9-d3875c2c8976/
- Microsoft Answers — MSC scoring types (snippet): https://answers.microsoft.com/en-us/windows/forum/windows_8-gaming/how-do-i-change-the-klondike-solitaire-game-style/f4f4cff3-461d-4617-a0fa-bd071cbce202
- TrueAchievements MSC walkthrough (snippet): https://www.trueachievements.com/game/Microsoft-Solitaire-Collection-Windows-Phone/walkthrough/3
- Giant Bomb MSC (snippet): https://www.giantbomb.com/games/3030-39318/
- MobilityWare App Store listings: https://apps.apple.com/us/app/solitaire/id284791396 ; https://apps.apple.com/app/id1556715867
- Brainium Solitaire: https://www.brainium.com/solitaire (listing fetch timed out; snippets)
- World of Solitaire: https://worldofsolitaire.com/blog/2018/01/menu-bar-is-back/ ; https://worldofsolitaire.com/
- Google search Solitaire coverage: https://www.pcworld.com/article/3112579/now-you-can-play-solitaire-and-more-in-google-search.html ; https://techcrunch.com/2016/08/25/google-now-lets-you-play-a-game-of-solitaire-or-tic-tac-toe-in-search ; https://www.techradar.com/news/internet/google-adds-two-classic-games-to-its-search-engine-page-1327280 (truncated)

## Acceptance Criteria

1. Settings → Statistics section shows a new picker row "Scoring" with options **Off / Standard / Vegas**; default **Off**; the choice persists across app restarts (same `soli/settings/v1` payload, crash-safe merge for old payloads).
2. With **Off**: no visual or behavioural change anywhere (HUD, win dialog, history rows, dock).
3. With **Standard**: a third HUD badge "SCORE" shows the current Standard score; it updates on every scoring event (see table); undo and the scrubber show the score that belonged to the restored position (score is part of the timeline); the score never drops below 0.
4. With **Vegas**: the badge reads "VEGAS" and shows the bankroll as a signed dollar amount starting at `−$52`; +$5 per card landing on a foundation, −$5 per card leaving one; undo/scrub consistent as above; nothing about the rules changes (recycling stays unlimited in v1).
5. Changing the setting mid-game switches the badge immediately to the other tally for the *same* game (both tallies are always computed), without touching the board or undo history.
6. Auto-complete ("Auto Up") moves score exactly like manual moves (they go through the same reducer paths).
7. ~~The "Nice win!" dialog shows the final score line~~ — DROPPED (round 2): the HUD stays visible after a win, so the alert stays as it is.
8. History rows record BOTH tallies when a game ends (`standard_score`, `vegas_score`; NULL on rows written before this version) regardless of the setting, and show the one matching the current Scoring setting in the metadata line ("… · Score 385 · Draw 3" / "… · Vegas −$17 · Draw 3"). Nothing is shown when Scoring is Off or the stored value is NULL.
9. In-progress game persistence survives the change: a game saved by the current version (no score fields) loads with scores recomputed by the move-log replay, or zeroed/derived on the snapshot-fallback path, without ever crashing.
10. `yarn typecheck && yarn lint && yarn jest` green; new jest coverage for the pure scoring rules and the settings merge.

## Possible approaches

### A. Where the score lives

| | A1. Score fields on `GameSnapshot`, deltas computed in the reducer (RECOMMENDED) | A2. Derive from `moveLog` on demand | A3. Derive by diffing consecutive snapshots in a selector |
| --- | --- | --- | --- |
| Undo / scrubber | Free: restoring a snapshot restores the score (like every other board field). | Must replay the whole log through the reducer to know flips/recycles → O(n) per render, and `undo`/`scrub` entries make the log non-monotonic. | Free for undo; but diffing all `history` snapshots on every render is O(n·52). |
| Persistence | `finalSnapshot` carries it; replay recomputes it deterministically (no setting involved). Old payloads: default missing fields to 0 in `cloneSnapshot`/hydrate. | Nothing new persisted, but load-time replay cost (already paid) + render-time cost. | Nothing new persisted. |
| Lines of code | ~60 in `klondike.ts` (one pure `scoring.ts` helper + 4 call sites) + defaults in clone/snapshot. | ~120, duplicated knowledge of what a move "did". | ~100, fragile diffing (which card flipped? recycle vs draw?). |
| Correctness | The reducer knows exactly what happened (source/target pile, whether a card flipped, recycle) at the moment it happens. | Needs the board anyway. | Diff heuristics. |
| Risk | Touches the engine; `MOVE_LOG_VERSION` does NOT need a bump (board/history outcomes unchanged) but tests must prove it. | Low engine risk, high complexity. | Low engine risk, medium complexity. |

**Recommendation: A1.** It is the pattern `moveCount` already uses.

### B. Which tallies to compute

| | B1. Compute BOTH tallies always; the setting only selects the display (RECOMMENDED) | B2. Bind the scoring mode to the game at deal time (like `drawCount`) and compute one tally |
| --- | --- | --- |
| Mid-game mode change | Instant and correct: switching Standard ↔ Vegas just shows the other number. Turning on mid-game shows the real score of the game so far. | Game keeps the mode it was dealt with ("applies to the next game"), extra state + UI copy to explain it. |
| Reducer ↔ settings coupling | None. Reducer stays a pure function of actions; replay needs no setting. | Must thread the mode into `createGameStateFromExactId`, persistence payload, hydrate, deep links. |
| Cost | Two integers per snapshot + ~3 extra lines per delta. Negligible. | One integer. |
| Vegas rule enforcement later | Pass limits would still need a mode on the game — that is a follow-up decision anyway (Open question 3). | Natural place for it. |

**Recommendation: B1** for v1. Store `score: { standard: number; vegas: number }` plus `stockPasses: number` (recycle count — needed for the Draw-3 "−20 from the 4th pass" rule and useful for a later "Pass 2/3" indicator). If pass-limit enforcement is ever added, THAT feature introduces a deal-time `vegasRules` flag; the tallies stay as they are.

### C. Timed Standard scoring

See Open question 1. Technically: time decay is `−2 × floor(elapsedMs / 10 000)` computed at display time from the live-only clock (never stored in snapshots — the clock is not part of the timeline by design, see `GameSnapshot` comments), and the win bonus is added once in the win dialog / history record. ~25 lines, but it adds a number that visibly ticks down every 10 s and interacts with the pause-on-background timer.

## Open questions to the user

Each with options, trade-offs and a recommendation. The plan proceeds with the recommendation unless told otherwise.

Round-2 status (2026-10-11, after the user's second prompt): Q1 (timed), Q2 (undo penalty), Q3 (pass limits), Q5 (hints) — proceeding with the recommendation, competitor research (Microsoft Solitaire Collection, MobilityWare) pending in a separate agent. Q4 (cumulative) — closed: not in v1. Q6/Q7/Q10/Q11 — proceeding as recommended. Q8 — CLOSED: reading (a), scoring as a whole is off by default. Q9 — CLOSED with a change: store BOTH tallies, no mode column (see Summary). New Q12/Q13 below are closed by the user.

1. **Timed scoring (−2/10 s decay + 700,000/s win bonus) in v1?**
   - (a) Out of v1, follow-up "Timed scoring" switch — simple, no ticking number, no interaction with the pause-on-background timer; Standard = pure move points. Downside: Windows purists will notice the missing time bonus.
   - (b) In v1, always on when Standard is selected — faithful to Windows, but the score visibly decays while you think, and when the "Game timer" statistic is off the player cannot see why the score drops.
   - (c) In v1 as a second switch "Timed scoring" (default off).
   - **Recommendation: (a).** Smallest scope; the formula is documented here so (c) can be added later without research.
2. **Undo penalty?**
   - (a) None: undo simply restores the previous position's score (the undone move's points vanish). Matches Microsoft Solitaire Collection and is the only option that keeps the scrubber coherent (a 10-step scrub is not "10 undos").
   - (b) Flat penalty per undo (some clones use −2 or −5): would have to live outside snapshots (like `moveCount`'s "undo keeps counting" rule) and be defined for scrubs too.
   - **Recommendation: (a).**
3. **Vegas pass limits (Draw 1: one pass, Draw 3: three passes) — enforce or display-only?**
   - (a) Display-only in v1: Vegas changes the number shown, nothing else. Recycling stays unlimited.
   - (b) Enforce: refuse recycling after the limit. This changes the *rules* and breaks three existing features at once: the bundled Lonelybot solver assumes unlimited recycles (hints and the unwinnable warning would be wrong), the "Solvable deals" catalog is proven for unlimited passes only, and `usefulMoves.ts` simulates unlimited recycles. Auto-complete also recycles. Doing this properly means a solver-side rule flag — a separate project.
   - **Recommendation: (a)**, with a follow-up entry. Optional cheap middle ground (also follow-up): show "Pass 2/3" in the Vegas badge label without enforcing.
4. **Cumulative Vegas bankroll (Windows "Keep score")?**
   - (a) Per-game only in v1. Each game starts at −$52.
   - (b) Add it as a 4th picker option "Vegas (cumulative)" — MSC's exact precedent (Standard / Las Vegas / Cumulative Vegas) — plus a persisted running total (one kv number) and a "Reset Vegas total" row that only appears in that mode. ~80 lines; no extra switch needed.
   - (c) Classic Windows style: separate "Keep score" switch under the picker. Two controls for one concept.
   - **Recommendation: (a) now, (b) as the first follow-up** — it is the most-requested Vegas flavour, but the user's "even counting overall" most likely refers to the setting being off by default (see question 8), so do not pre-empt it.
5. **Do hints affect the score?**
   - (a) No. The hint button is already opt-in and its own setting; charging for it couples two settings.
   - (b) −X per hint (Microsoft Solitaire Collection does not charge; some clones do).
   - **Recommendation: (a).**
6. **Does auto-complete (Auto Up) score?**
   - (a) Yes, like manual moves (it runs through `applyMove`/`drawFromStock`/`recycleWasteToStock`, so it scores automatically — zero extra code). Recycles inside an auto-complete run can incur the Draw-1 −100 / Draw-3 −20 penalties exactly as if the player had tapped.
   - (b) Exempt auto-complete from recycle penalties — needs a flag through `planAutoActions`.
   - **Recommendation: (a)** — Windows awards auto-complete points too, and the auto-complete only starts when the tableau is fully face-up, so extra passes are rare.
7. **Mode changed mid-game?** With approach B1 this is a non-question: the badge switches tally instantly; turning scoring off hides it; turning it on shows the game's real score so far. **Recommendation: B1, no "applies to next game" copy needed.**
8. **"Even counting overall" in the prompt** — two readings:
   - (a) "Even the overall feature (counting at all) should be off by default" → the Off default. Most likely given the sentence flow ("even counting overall, should probably be off by default").
   - (b) A cumulative/overall score across games (Vegas "Keep score" or a lifetime Standard total).
   - **Recommendation: treat as (a) for v1; (b) is covered by follow-up 4.** Please confirm.
9. **Record scores in history / best-score tiles?**
   - (a) v1: store `score` + `scoring_mode` on finished rows and show the score in the row's metadata line. Cheap (one additive migration, two params, one segment).
   - (b) Also add "Best score" / "Vegas total" tiles to the History header, shown only when the current mode has data.
   - **Recommendation: (a) in v1, (b) follow-up** — the tiles need per-mode aggregation SQL and a design decision about which mode's best to show.
10. **Standard score floor at 0 (Windows behaviour)?** Recommendation: **yes, clamp at 0** after every delta (Windows does; it also keeps the first −100 recycle from producing an ugly "−95"). Vegas is naturally negative and is NOT clamped.
11. **Vegas: card moved from a foundation back to the tableau.** Sources either forbid the move in Vegas ("moves to foundation are permanent", rarepike) or are silent.
   - (a) Keep the move legal (board rules identical in every mode) and charge −$5. Undo of a foundation move and "playing the card back down" then agree with each other, and the tally stays a pure function of the foundation card count (`5 × cardsOnFoundations − 52`).
   - (b) Forbid the move in Vegas — a rules change with the same solver/catalog problems as pass limits.
   - **Recommendation: (a).** Note the nice invariant: Vegas = `5 × (cards on foundations) − 52`, which the jest suite should assert directly.
12. **Score line in the win alert?** — CLOSED (user, round 2): no. The HUD stays on the board after the win (Moves/Time are not repeated in the alert either).
13. **Vegas plus sign (`+$158`) or plain total (`$158`)?** — CLOSED (user, round 2): plain total. `−$52` / `$0` / `$158`. Kept in `formatVegasScore` so re-adding the sign is one line.
14. **Number formatting** — CLOSED: device locale via `toLocaleString()` (1,240 / 1.240 / 1’240); no explicit locale, following the history screen's `Intl.DateTimeFormat(undefined, …)` convention.

### Competitor research (2026-10-11)

Facts gathered by a separate research agent (recorded here verbatim; no further web research done by the testing agent):

- **MobilityWare** (official help page https://mobilityware.helpshift.com/hc/en/10-solitaire/faq/87-what-s-the-difference-between-standard-scoring-and-vegas-scoring/): Standard has mandatory timed scoring (−2 per 10 s, win bonus 700,000/seconds); undo costs 2 points plus reverting the move's points; Vegas enforces pass limits (Draw 3: three passes, otherwise one), described in "points" not dollars; cumulative is a toggle under Vegas.
- **Microsoft Solitaire Collection** (player reports only, no official spec): scoring types Standard / Las Vegas / Cumulative Vegas in Game options; a win time bonus exists with unknown formula; undo allowed in all modes, cost not found; win screen shows score, total score, high score; one weak source says three passes enforced in Vegas.
- No app found charging for hints. No evidence on "+$158" vs "$158". No app found offering Vegas without pass limits.
- **Consequence**: v1 deviates from convention on Vegas pass limits (first follow-up) and timed scoring (second follow-up); undo free and hints free are defensible.

## Dependencies

None. No new packages (`@expo/ui` Picker, existing kv-store settings, existing SQLite history). No package guide needed.

## UX/UI Considerations

### Settings (Statistics section)

```
┌ Statistics ───────────────────────────────┐
│ Move counter                        [ on ]│
│ Game timer                          [ on ]│
│ Scoring                        Off ▾      │   ← iOS: label left, picker right
│ Standard points or a Vegas bankroll       │     Android: label above picker (Compose
│ shown next to Moves and Time.             │     row can't fit both — see WarningModePreference)
└───────────────────────────────────────────┘
```

Options: `Off` / `Standard` / `Vegas`. Same component pattern as `WarningModePreference` (incl. the `key={value}` Android stale-label workaround). Lives in the **Statistics** section next to Move counter / Game timer because it is a display preference in v1 (it does not change rules); if pass-limit enforcement ever ships, revisit.

### HUD (top-right stats badges) — zero change when Off

```
Off (today):                     Standard:                              Vegas:
            ┌───────┐ ┌───────┐            ┌───────┐ ┌───────┐ ┌───────┐           ┌───────┐ ┌───────┐ ┌───────┐
            │ MOVES │ │ TIME  │            │ SCORE │ │ MOVES │ │ TIME  │           │ VEGAS │ │ MOVES │ │ TIME  │
            │  42   │ │ 3:12  │            │  385  │ │  42   │ │ 3:12  │           │ −$17  │ │  42   │ │ 3:12  │
            └───────┘ └───────┘            └───────┘ └───────┘ └───────┘           └───────┘ └───────┘ └───────┘
```

- Score badge goes FIRST (leftmost) so Moves/Time keep their positions relative to the right edge the user is used to.
- Badge reuses `StatisticsHud`'s row builder (`buildStatisticsRows`), so it inherits the existing style, `STAT_BADGE_MIN_WIDTH`, and the screenshot-preview override path.
- Vegas formatting: `−$52`, `−$17`, `$0`, `$158` (true minus sign U+2212; NO plus sign — user decision round 2; literal `$` because Vegas dollars are notional, not the device currency). Standard: plain integer with device-locale grouping via `toLocaleString()` ("1,240" / "1.240" / "1’240").
- Three badges at `minWidth 96` = 288 + spacing; fits phones ≥ 360 dp wide at the current font sizes (the row is `justifyContent: flex-end`, badges don't shrink). If a device test shows overflow on small phones, reduce `STAT_BADGE_MIN_WIDTH` to 84 when three badges are shown — note it in Intermediary learnings.
- No floating "+10" animation in v1 (follow-up).

### Win dialog (existing `Alert`)

Unchanged (round 2 decision): the HUD with Score/Moves/Time stays visible on the board behind the "Nice win!" alert, so the alert does not repeat any of them.

### History row

```
♠ Deal 7F3K-…                          Solved
Today, 5:33 PM · 112 moves · 4:02 · Score 385 · Draw 3 · Solvable
```
Vegas setting: `· Vegas $158` (or `· Vegas −$17` for an abandoned game). Both tallies are stored on every finished row; the row shows the one matching the CURRENT Scoring setting. Off or NULL (rows from before this version): segment omitted. Best-score tiles: follow-up.

### Accessibility

Badge label/value are plain `Text` (already read by screen readers). Vegas value gets an `accessibilityLabel` like "Vegas, minus 17 dollars" so the minus sign and `$` read correctly.

## Components

- Reuse: `StatisticsHud` + `buildStatisticsRows` (HUD), `WarningModePreference`'s layout (settings), `Alert` win dialog, History row metadata line.
- **Simplification opportunity**: generalise `components/settings/WarningModePreference.tsx` into `components/settings/PickerPreference.tsx` (`label`, `description`, `options`, `value`, `onValueChange`) and render both the warning mode and the new scoring picker through it. `WarningModePreference` becomes a 5-line wrapper (or is inlined in `settings.tsx`). Keeps the Android `key={value}` workaround in ONE place. Recommended; small and it removes a future copy-paste.
- New pure module: `src/solitaire/scoring.ts` — point tables, `ZERO_SCORE`, `applyScoreDelta`, formatting helpers (`formatStandardScore`, `formatVegasScore`). Lives in the engine folder (pure, no RN imports) so it can be unit-tested and reused by history/UI.

## How to fetch data, how to cache

Not applicable (local state only). Settings: existing `soli/settings/v1` payload via `mergeSettings` (add `scoring` with validation like `parseWarningMode`). History: SQLite migration v2 adds two nullable columns.

## Related tasks

- Draw-count setting plan (`docs/product/draw-count-setting/solitaire-stock-draw-count.md`) — the "setting applies to next game" precedent we deliberately do NOT need thanks to approach B1.
- Hints plan (`docs/product/hints/hints-and-unwinnable-warning.md`) — `WarningModePreference` pattern, `?set=` deep links, solver assumption of unlimited recycles (why Vegas pass limits are a follow-up).
- Move-log persistence plan (`docs/product/move-log-persistence/…`) — `MOVE_LOG_VERSION` rules; adding score fields to snapshots does not change board/history outcomes → no bump, but `cloneSnapshot`/load must default missing fields.

## Simplification ideas

- Both tallies always on (B1) removes a whole class of "which mode was this game dealt with" state, migration and UI copy.
- One `ScoreDelta` per reducer event, computed by a pure helper; `applyMove` already knows source/target and whether a card flipped (`flipNewTopCard` → return a boolean).
- No undo penalty, no hint penalty, no timed scoring in v1 → the score is a pure function of the board timeline, which is why undo/scrub/replay need zero special handling.
- Generic `PickerPreference` instead of a third copy of the picker row.
- Win dialog: one extra string, no new screen.

## Steps to implement

All unchecked (nothing implemented yet). Update status after each step — never skip this.

- [x] **S1. Pure scoring module** `src/solitaire/scoring.ts` — DONE 2026-10-11. `ScoreTally`, `INITIAL_SCORE` (named so instead of `ZERO_SCORE` because Vegas starts at −52), `scoreMove`, `scoreRecycle({ drawCount, recyclesSoFar })`, `addScore` (clamps Standard at 0), `formatStandardScore` (toLocaleString), `formatVegasScore` (−$52 / $0 / $158, no plus).
- [x] **S2. Engine integration** `src/solitaire/klondike.ts` — DONE. `GameSnapshot.score`/`stockPasses`; init in both state factories; `snapshotFromState`; `cloneSnapshot` + `HYDRATE_STATE` default missing fields. `applyMove` derives `flipped` from the PRE-move column (`state.tableau[col][cardIndex − 1]?.faceUp === false`) — simpler than threading a boolean out of `extractMovingCards`/`flipNewTopCard`. `recycleWasteToStock` bumps `stockPasses` + applies `scoreRecycle`. `MOVE_LOG_VERSION` unchanged with a comment why. Test-side state factories (`helpers.ts` + three test files with their own literals) gained the two fields.
- [x] **S3. Jest (engine)** — DONE. `scoring.test.ts` (tables, clamp, formatting incl. locale-robust grouping assertion) + `klondike.scoring.test.ts` (every move row, flip only when face-down exposed, Draw 1/3/5 recycle rules, undo restores score while moveCount keeps counting, scrub restores timeline score, auto-queue scores, Vegas invariant + $208 on the near-win fixture win, `replayMoveLog` reproduces the tally). `gamePersistence.test.ts`: replay round-trip of score + history snapshot tallies; pre-scoring payload loads via replay (recomputed) and via snapshot fallback (defaults).
- [x] **S4. Settings** — DONE. `SCORING_MODES`, `ScoringMode`, `statistics.scoring` (default `'off'`), `parseScoringMode` (exported; also used by the deep link), `setScoringMode`, `scoringPreference` copy. `StatisticsPreferenceKey` now excludes `scoring` so the boolean-switch loop stays typed. Jest `settingsScoring.test.ts`: default, pre-scoring payload, round-trip, junk.
- [x] **S5. Settings UI** — DONE. New generic `components/settings/PickerPreference.tsx` (`label/description/options/value/onValueChange`, keeps the Android `key={value}` remount workaround + platform-split layout). `WarningModePreference.tsx` DELETED — its single call site in `settings.tsx` now spreads `warningModePreference` into `PickerPreference` (simplification: one picker-row implementation instead of two; trade-off: none, same markup). Scoring row added at the end of the Statistics section with a comment why it lives there.
- [x] **S6. HUD** — DONE. `buildStatisticsRows({ scoring, score, … })` pushes the Score/Vegas badge FIRST. `useKlondikeGame` passes `scoring` + `state.score`. Simplification: the `!showMoves && !showTime → []` early return was removed — `buildStatisticsRows` already returns `[]` when nothing is on (trade-off: one extra `Date.now()` per render when everything is off; negligible). Score is NOT synthesised in `?celebration=&screenshot=1` previews (comment left; scoring is off by default anyway).
- [x] **S7. Win dialog** — DROPPED (round 2): no score line; HUD stays visible after the win (verified in `KlondikeGameView`: header HUD is rendered independently of the celebration overlay).
- [x] **S8. History** — DONE. `DATABASE_VERSION = 2`; migration step `toVersion: 2` = two `ALTER TABLE … ADD COLUMN` (`standard_score INTEGER CHECK (… >= 0)`, `vegas_score INTEGER`), no `scoring_mode` column (comment explains why). `HistoryRow`/`toHistoryEntry`/insert+update params carry both; the three row SELECTs share a new `ROW_COLUMNS_SQL` constant (simplification: the column list was copy-pasted three times). `HistoryEntry.standardScore`/`vegasScore` + input/update types, `createEntry`, `applyHistoryEntryUpdates`, `normalizeHistoryEntry`. `recordCurrentGameResult` writes both tallies on EVERY game end (solved and incomplete — a Vegas loss is meaningful). `formatEntryMetadata(entry, scoring)` in `app/(tabs)/history.tsx` (list row + preview sheet, both read the setting via `useSettings`). Seeds: `SeedSpec.standardScore?/vegasScore?` → two seeded rows carry scores (solved 685/$208, incomplete 65/−$37), the rest NULL = pre-scoring rows. Jest: fresh DB lands on v2 with baseline unchanged; v1 → v2 runs only the ALTER step; up-to-date DB untouched; newer DB (3) refused; insert/update params + NULL mapping; REAL node:sqlite upgrade of a populated v1 DB (row survives with NULL scores, scored insert OK, negative Standard rejected by CHECK). `historySeeds.test.ts` already exercises the full v1+v2 migration chain against node:sqlite.
- [x] **S9. Deep link** — DONE. `?set=scoring:off|standard|vegas` (case-insensitive) in `parseSettingsLinkParam` + applied via `setScoringMode` (threaded through `useDemoGameLauncher` props from `useKlondikeGame`). SKILL.md catalog row updated. Jest in `demoLinkParsing.test.ts`.
- [x] **S10. Cheap gates** — GREEN 2026-10-12 (final run): `yarn typecheck` exit 0, `yarn lint` exit 0, `yarn jest` 38 suites / 412 tests passed.
- [x] **S11. Device smoke test** — DONE 2026-10-12: full 11-step script on the Android phone (all PASS) + reduced pass on the iOS simulator (all PASS). Results and screenshot paths in § Testing. No scoring bugs found.
- [x] **S12. Plan upkeep** — done for the implementation round (Summary, Files actually modified, Intermediary learnings, Identified issues, Testing). Follow-ups table unchanged except F-notes.

## Plan: Files to modify

| File | Change |
| --- | --- |
| `src/solitaire/scoring.ts` (new) | Point tables, delta helpers, formatters |
| `src/solitaire/klondike.ts` | `GameSnapshot.score`/`stockPasses`, deltas in `applyMove`/`recycleWasteToStock`, defaults in `cloneSnapshot`/`snapshotFromState`/`HYDRATE_STATE`/state factories |
| `src/state/settings.tsx` | `statistics.scoring`, setter, merge/validation, copy |
| `components/settings/PickerPreference.tsx` (new) | Generic picker row (from `WarningModePreference`) |
| `components/settings/WarningModePreference.tsx` | Thin wrapper over `PickerPreference` (or removed) |
| `app/(tabs)/settings.tsx` | Scoring row in Statistics section |
| `src/features/klondike/components/StatisticsHud.tsx` | Score badge in `buildStatisticsRows` |
| `src/features/klondike/hooks/useKlondikeGame.ts` | Pass scoring mode + tally to rows (no win-dialog change, round 2) |
| `src/features/klondike/hooks/useKlondikeHistoryEntry.ts` | Record `standardScore`/`vegasScore` (both) on result |
| `src/state/history.tsx` | `HistoryEntry.standardScore`/`vegasScore`, input/update types, `createEntry`/`applyHistoryEntryUpdates` |
| `src/storage/historyRepository.native.ts` (+ `.web.ts` stub) | Migration v2, columns in SQL + row mapping |
| `src/storage/gamePersistence.ts` | Nothing structural (snapshot carries fields); verify old-payload path defaults + a test |
| `app/(tabs)/history.tsx` | Score segment in `formatEntryMetadata` |
| `src/features/klondike/hooks/useDemoGameLauncher.ts` | `?set=scoring:` key |
| `.agents/skills/soli-testing/SKILL.md` | Deep-link catalog row |
| `test/unit/solitaire/scoring.test.ts`, `test/unit/solitaire/klondike.scoring.test.ts`, `test/unit/state/settingsScoring.test.ts`, `test/unit/storage/historyRepository.test.ts`, `test/unit/storage/gamePersistence.test.ts` | Coverage per S3/S4/S8 |

## Files actually modified

Implementation 2026-10-11/12 (nothing staged or committed):

| File | Change |
| --- | --- |
| `src/solitaire/scoring.ts` (new) | Tables, `INITIAL_SCORE`, `scoreMove`, `scoreRecycle`, `addScore`, `formatStandardScore`, `formatVegasScore` |
| `src/solitaire/klondike.ts` | `GameSnapshot.score`/`stockPasses`; factories, `snapshotFromState`, `cloneSnapshot` + `HYDRATE_STATE` defaults; deltas in `applyMove`/`recycleWasteToStock`; `MOVE_LOG_VERSION` comment |
| `src/state/settings.tsx` | `SCORING_MODES`/`ScoringMode`, `statistics.scoring`, `setScoringMode`, `parseScoringMode`, `scoringPreference`, merge |
| `components/settings/PickerPreference.tsx` (new) | Generic picker row |
| `components/settings/WarningModePreference.tsx` | DELETED (replaced by `PickerPreference` at its single call site) |
| `app/(tabs)/settings.tsx` | Warnings + Scoring rows via `PickerPreference` |
| `src/features/klondike/components/StatisticsHud.tsx` | Score/Vegas badge first in `buildStatisticsRows` |
| `src/features/klondike/hooks/useKlondikeGame.ts` | Passes `scoring`/`score`; dropped the empty-stats early return; threads `setScoringMode` to the demo launcher |
| `src/features/klondike/hooks/useKlondikeHistoryEntry.ts` | Records `standardScore`/`vegasScore` on every game end |
| `src/features/klondike/hooks/useDemoGameLauncher.ts` | `?set=scoring:` key |
| `src/state/history.tsx` | `HistoryEntry`/input/update types + create/apply/normalize |
| `src/storage/historyRepository.native.ts` | v2 migration, columns in SQL, `ROW_COLUMNS_SQL`, row mapping |
| `src/storage/historySeeds.ts` | Optional seed scores (two rows carry them) |
| `app/(tabs)/history.tsx` | Score segment per current setting (list row + sheet) |
| `.agents/skills/soli-testing/SKILL.md` | Deep-link catalog row |
| Tests | new `test/unit/solitaire/scoring.test.ts`, `klondike.scoring.test.ts`, `test/unit/state/settingsScoring.test.ts`; extended `gamePersistence.test.ts`, `historyRepository.test.ts`, `demoLinkParsing.test.ts`; fixtures gained the new fields (`solitaire/helpers.ts`, `klondike.autoMoveFallback/autoUpSetting/drawCount.test.ts`, `history.pagination.test.ts`, `historySeeds.test.ts`) |

Not touched: `historyRepository.web.ts` (the stub has no column knowledge — nothing to mirror), `gamePersistence.ts` (snapshot carries the fields; `cloneSnapshot` defaults cover old payloads).

## Intermediary learnings

- 2026-10-11 (planning): `moveCount` is the precedent for "a counter on `GameSnapshot` that the reducer maintains"; undo deliberately does NOT revert `moveCount` (explicit product decision in `handleUndo`), whereas the score SHOULD revert — the plan keeps the score as an ordinary snapshot field so `handleUndo`/`scrubToIndex` restore it with no special case. Do not copy the `moveCount: state.moveCount` override for `score`.
- 2026-10-11 (planning): The timer is live-only state, not on `GameSnapshot` (by design, see comments on `GameState.elapsedMs`). Any timed-scoring follow-up must compute time decay at display time from `elapsedMs`, never store it in snapshots.
- 2026-10-11 (planning): The Lonelybot solver, the solvable-deal catalog and `usefulMoves.ts` all assume unlimited stock recycles. Enforcing Vegas pass limits is therefore a rules + solver project, not a scoring tweak.
- 2026-10-11 (planning): The history SQLite schema is frozen at v1 with an append-only migration rule ("never edit the baseline step; never drop user data after 1.0") — new columns go in a `toVersion: 2` step with `ALTER TABLE … ADD COLUMN`. (Round 2 removed the paired-null rule entirely: two independent nullable columns, no mode.)
- 2026-10-12 (implementation): Intl / locale formatting under Hermes — the app already relies on `Intl.DateTimeFormat(undefined, …)` in `app/(tabs)/history.tsx` (wrapped in try/catch), RN 0.86 Hermes ships Intl on iOS and Android, and `Number.prototype.toLocaleString()` degrades to `toString()` on an Intl-less Hermes instead of throwing. So the score helpers use `toLocaleString()` directly (no try/catch needed). NOT device-verified yet: whether grouping actually renders ("1,240"); untimed Standard caps at 740 so no live game can show it — the smoke test checks it via the Vegas formatter only indirectly (no 4-digit Vegas values either, range −$52…$208). Grouping becomes observable only with timed scoring (F1).
- 2026-10-12: `applyMove` can derive the flip bonus from the PRE-move column (`state.tableau[col][cardIndex − 1]?.faceUp === false`) — no need to make `flipNewTopCard`/`extractMovingCards` return a boolean.
- 2026-10-12: `createTestState` in `test/unit/solitaire/helpers.ts` is NOT the only GameState fixture — `klondike.autoMoveFallback/autoUpSetting/drawCount.test.ts` have their own literals; adding a `GameSnapshot` field means touching all four (possible cleanup: route them through the shared helper).
- 2026-10-12: SQLite accepts a column-level CHECK on `ALTER TABLE … ADD COLUMN` in a STRICT table (proven by the node:sqlite upgrade test).
- 2026-10-12: Win-alert verification — `KlondikeGameView` renders the header `StatisticsHud` unconditionally (placeholder only when no rows); the celebration overlay/touch blocker live inside the board shell. So Moves/Time/Score stay visible behind the "Nice win!" alert; no score line needed there.

## Identified issues

- (open, cosmetic) With `?celebration=…&screenshot=1` AND scoring on, the HUD shows the unplayed board's real tally (0 / −$52) next to synthetic MOVES/TIME. Scoring is off by default; extend `CelebrationPreviewStats` only if store screenshots ever want a score badge.
- (CLOSED 2026-10-12) Three badges at `STAT_BADGE_MIN_WIDTH` fit without wrapping on both test devices (411 dp Android phone, 402 pt iPhone 17 Pro) — see screenshots. No min-width change needed.
- (observation, not scoring, low priority) iOS Settings: the **Warnings** description is truncated to one line with an ellipsis ("…or as soon as…") while the new Scoring description wraps to two lines (`ios-01-settings-scoring-row.png`). Same `PickerPreference` component for both, so most likely the longer two-line picker label ("No more useful moves") is what squeezes the row; pre-existing layout from `WarningModePreference` — not introduced by this change.
- (CLOSED 2026-10-12 as "consistent with the neighbours") The plan's Accessibility note ("Vegas, minus 17 dollars" `accessibilityLabel`) was not implemented — the badge is plain `Text` reading "−$47". Checked 2026-10-12: the Moves and Time badges are plain `Text` too (no `accessibilityLabel`/`testID` anywhere in `StatisticsHud.tsx`), and the history row metadata line is plain text as well. The app's convention (`cards/accessibility.ts`, `UndoScrubber`, `GameNoticeBubble`, header buttons, history retry) is: labels + testIDs on **interactive** board elements and buttons, and on bubbles that are announced; passive stat text relies on the screen reader reading the rendered string. Labelling only the score badge would be inconsistent, so nothing was changed. If spoken stats are wanted, label all three badges in one go (optional slice P2-E below: `accessibilityLabel={`${label}, ${spoken}`}` on the badge `View` with `spoken` = "minus 17 dollars" / "3 minutes 12 seconds"; ~10 lines + a jest on the pure formatter). Note for the testing skill: a label on the badge would ADD new a11y nodes (`Score, …`), not rename existing handles, so no device recipe breaks.
- (observation, not scoring) Android History list order mixes dates on the seeded data ("1 Oct 23:25" → "26 Sept" → "1 Oct 23:22"), i.e. incomplete rows sort by a different timestamp than solved rows. Pre-existing, visible only with seeds.

## Testing

- Cheap gates: `yarn typecheck && yarn lint && yarn jest` — all green 2026-10-12.
- Pure logic covered by jest (see S3/S4/S8/S9 statuses).

### Device smoke test results (2026-10-12, testing sub-agent)

**Android (Nothing A065, 1080×2412 @ 420 dpi ≈ 411 dp wide, Release APK versionCode 16 via `yarn release`)** — the full 11-step script below was run on the phone; every step passed. Evidence per step (HUD values read from the a11y tree, screenshots in `docs/product/scoring/screenshots/`):

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Scoring picker under Statistics, description text, default Off, persists across kill/relaunch | PASS | `android-02-settings-off.png`, `android-03-settings-scoring-row.png`; after `am force-stop` + relaunch the picker reads "Standard" |
| 2 | Off: HUD only MOVES / TIME | PASS | `android-01-off-hud.png` (tree: `MOVES | TIME | 0 | 0:00`) |
| 3 | Standard + fresh deal: SCORE 0 left of MOVES/TIME, three badges fit | PASS | `android-04-standard-three-badges.png` — no clipping/wrapping at 411 dp |
| 4 | +15 for A♥→foundation with flip; plain tableau move +0; waste→tableau +5; Undo restores score while MOVES keeps counting | PASS | 0→15 (A♥, flip), undo →0 with MOVES 1; 4♠→5♥ stayed 0; K♥ waste→empty column 15→20 |
| 5 | Draw 1 recycle −100, clamped at 0; undo of the recycle restores | PASS | 20 → 0 on recycle, Undo → 20 |
| 6 | Draw 3: two free recycles, third −20 | PASS | 25 → 25 → 25 → 5 |
| 7 | Vegas mid-game switch, −$5 for foundation→tableau, no plus sign, U+2212 minus | PASS | `?set=scoring:vegas` on the Draw-3 game: `VEGAS −$47` (one foundation card), MOVES untouched; A♦ foundation→tableau → `−$52`; switching back to Standard showed 10 (= 25 +5 −15 +10 −15) — both tallies tracked the same timeline; `android-05-vegas-badge.png` |
| 8 | Win: HUD stays visible with VEGAS $208; alert has no score line | PASS | `android-06-win-alert-hud.png` (celebration), `android-07-win-alert.png` — alert reads "Start a new game?" / "Nice win! Ready for another round?" / DEAL AGAIN only; fresh deal after → `−$52` |
| 9 | History: finished rows show the segment matching the current setting; pre-scoring rows show nothing; seeded rows; sheet line | PASS | Win row: `Vegas $208` ↔ `Score 320` ↔ nothing (Off); abandoned rows `Vegas −$52 / −$47` ↔ `Score 10 / 20`; a row from before the scoring build (yesterday 21:09, Draw 5) shows no segment in any mode. Seeds: `seed-solved-draw1-a` → `Vegas $208` / `Score 685`, `seed-incomplete-draw1` → `Vegas −$37` / `Score 65`, the other seeded rows show no segment. Sheet: `android-08-history-sheet-vegas.png`. Seeds cleared afterwards |
| 10 | Persistence: kill + relaunch keeps the score; undo still restores | PASS | SCORE 5 → force-stop → relaunch → 5; Undo → 25 |
| 11 | Regression: Off restores MOVES/TIME-only HUD; Warnings picker (now `PickerPreference`) opens, changes and shows the new label on Android | PASS | HUD `MOVES | TIME` after `?set=scoring:off`; Warnings → "Unwinnable game" label updated immediately, then restored to "No more useful moves" |

Also verified on Android: the "Scoring" picker label updates immediately after each selection (the `key={value}` workaround works for the new row too). Settings restored afterwards (Scoring Off, Draw 1, Warnings "No more useful moves"); developer mode was already on and was left on. Test games were recorded as real history rows on the phone (4 rows today: 2 incomplete test games, the near-win win, and the previously active game marked incomplete by `?reset=game`) — nothing deleted.

**iOS (iPhone 17 Pro simulator, iOS 26.5, Release build 15)** — reduced pass after the full Android pass (same JS bundle, so only the platform-specific surfaces were re-checked):

| Check | Result | Evidence |
| --- | --- | --- |
| Settings row (iOS layout: label left, picker right), description, select Standard | PASS | `ios-01-settings-scoring-row.png`; picker button reads "Standard" after selection |
| Fresh deal: SCORE 0 left of MOVES/TIME, three badges fit on 402 pt | PASS | `ios-02-standard-three-badges.png` |
| Waste→tableau +5, Undo → 0 (MOVES keeps 1), replay + tableau move with flip → 10 | PASS | HUD `5 → 0 → 10` |
| Vegas mid-game switch | PASS | `VEGAS −$52` on a game with no foundation cards, MOVES unchanged; `ios-03-vegas-badge.png` |
| Persistence: `simctl terminate` + relaunch | PASS | `VEGAS −$52 / MOVES 3` restored |
| History rows under Vegas | PASS | two finished rows read `· Vegas −$52 ·` |
| Off regression (HUD back to MOVES/TIME) | PASS | HUD `MOVES | TIME` after `?set=scoring:off` |
| Not re-run on iOS (covered on Android) | — | recycle penalties, foundation→tableau −$5, win alert, seeded rows, History under Off, Warnings picker |

Build note: `yarn ios` compiled fine but its install step failed (Expo CLI routed the booted iOS 27.0 "iPhone 17" sim through `devicectl`: "Install Application is not supported by this device"). Unrelated to scoring; the built `.app` was installed with `xcrun simctl install` on the iOS 26.5 iPhone 17 Pro sim. Recipe added to the testing skill's troubleshooting table.
- **Device smoke test script for the testing sub-agent** (read `.agents/skills/soli-testing/SKILL.md` first; one device; no video/frame analysis — the score is a number in a badge):
  1. Build/run per skill. Settings → Statistics: a "Scoring" picker row with description "Show Standard points or a Vegas bankroll next to Moves and Time." sits under Move counter / Game timer, showing **Off**. Switch to Standard, kill + relaunch the app, confirm it still reads Standard. Set it back to Off.
  2. Off: game header shows only MOVES / TIME (unchanged layout).
  3. `soli://?set=scoring:standard` then `soli://?reset=game` (fresh deal): a third badge **SCORE 0** appears LEFT of MOVES/TIME. Check that all three badges fit on one line without clipping (report the phone model/width).
  4. Play: a waste → tableau move → SCORE 5; a tableau move that flips a face-down card → +5; any card to a foundation → +10 (+5 more if it flipped one). Tap Undo → the score returns to the previous value while MOVES still increments. Drag the scrubber back/forward → score follows the timeline.
  5. Draw 1 recycle penalty: `soli://?set=drawCount:1`, `?reset=game`, tap the stock until it is empty, then tap the empty stock (recycle) → SCORE drops by 100 but never below 0 (early in a game it just shows 0).
  6. Draw 3: `soli://?set=drawCount:3`, `?reset=game`, recycle three times → the first two recycles cost nothing, the third costs −20 (needs ≥ 20 points first; make a few moves before).
  7. `soli://?set=scoring:vegas` (mid-game, no reset): the badge instantly switches to **VEGAS** with a value of `−$52 + $5 × (cards on foundations)`, e.g. `−$52` on a fresh deal, `−$47` after one foundation card. Move a card from a foundation back down → −$5. No `+` sign ever appears; the minus is the long U+2212 sign.
  8. Win: `soli://?demo=nearwin&left=1`, play the last move → celebration + "Nice win!" alert; the HUD behind it reads VEGAS $208 (or SCORE n with Standard). The alert text is unchanged (no score line). Deal Again.
  9. History tab: with Vegas selected the finished row shows `· Vegas $208 ·`; switch Settings to Standard → the same row shows `· Score n ·`; switch to Off → neither segment. Run `soli://?seedHistory=default`: "seed-solved-draw1-a" shows Score 685 / Vegas $208, "seed-incomplete-draw1" shows Score 65 / Vegas −$37, the other seeded rows show no score segment (they simulate pre-scoring rows). Open a row's sheet: same metadata line. `?seedHistory=clear` afterwards.
  10. Persistence: with Standard on, make a few scoring moves, note SCORE, kill the app, relaunch → the same SCORE (replay) and undo still restores the previous score.
  11. Regression: `?set=scoring:off` → header back to MOVES/TIME only; Warnings picker in Settings still opens and changes (it now renders through the shared `PickerPreference`); Android: picker label updates after selection (the `key={value}` workaround).

## Follow-ups

| Follow-up | Description | Pros | Cons | Recommendation |
| --- | --- | --- | --- | --- |
| ~~F1. Timed Standard scoring~~ | **DECIDED AGAINST (user, 2026-10-12)**: the −2/10 s decay and the `700,000 / seconds` bonus produce arbitrary, huge numbers ("if you ever win a game, it'll be sky high") and would swamp a cumulative bankroll. Not a follow-up any more; the formula stays documented in § Research only as reference. The `toLocaleString()` grouping in `formatStandardScore` is therefore never observable in practice (max 740) — harmless, leave it. | — | — | Rejected. |
| F2. Cumulative Vegas bankroll | → **Phase 2, slice P2-C** (separate switch under the picker, bankroll derived from history, reset row). | | | See § Phase 2. |
| F3. Vegas pass-limit indicator / enforcement | → **Phase 2, slices P2-A/P2-B** (enforced, passes = draw count, solver-backed features off in Vegas). | | | See § Phase 2. |
| F4. Best-score tiles / per-mode stats | History header tiles "Best score", "Vegas total". | Beat-my-best loop. | Aggregation SQL + which mode to show. | After F2. |
| F5. Floating "+10" feedback | Small transient label near the badge or card. | Delightful. | Animation budget; must be gated by the animations master switch. | Later; ask Karim first. |
| F6. Undo penalty option | Flat −N per undo. | Purist option. | Scrubber semantics; most modern apps don't. | Skip unless requested (re-confirmed by the Phase 2 research: no app charges for undo in Vegas). |

---

# Phase 2: Vegas pass limits + cumulative bankroll

Status: PLANNED 2026-10-12 (planning sub-agent), nothing implemented. Read this whole part before implementing a slice. Decisions already made by the user (prompts 3 and 4 above): keep the single picker; timed scoring rejected; cumulative Vegas as a separate control; pass limits enforced, passes = draw count; in Vegas drop the solver-backed features instead of making them pass-aware; the "no more useful moves" detection is what matters in Vegas.

## Phase 2 research (2026-10-12)

Fetched by the planning sub-agent. Confidence: **high** = official doc or source code read directly; **med** = secondary site or search snippet of an official page; **low** = single informal source. "Not found" means searched and nothing usable turned up — do not guess.

| Question | Finding | Confidence | Source |
| --- | --- | --- | --- |
| Undo in Vegas: allowed? | MobilityWare's official FAQ states an undo cost ONLY under Standard ("2 points plus reverting the move's points"); the Vegas section says nothing about undo. Microsoft Solitaire Collection: undo exists in all modes, no cost documented. Solitaired's Vegas game has Undo/Redo (keys `a`/`d`), no Vegas-specific rule. PySolFC Vegas/Casino Klondike: full undo. rarepike: "true casino style means no undo button and no hints" (describes purist table play, not an app). **No app found that forbids undo in Vegas or charges for it.** | high (MW FAQ, PySolFC code), med (others) | https://mobilityware.helpshift.com/hc/en/10-solitaire/faq/87-what-s-the-difference-between-standard-scoring-and-vegas-scoring/ ; https://solitaired.com/las-vegas-solitaire ; https://rarepike.com/solitaire/vegas-scoring/ |
| Can a pass be "un-used" by undoing a recycle? | PySolFC: the recycle is an undoable atomic move (`ANextRoundMove.redo: stack.round += 1`, `undo: stack.round -= 1`), so undo gives the pass back. Other apps: not found. Soli gets the same for free (`stockPasses` lives on the snapshot). | high | https://github.com/shlomif/PySolFC/blob/master/pysollib/move.py |
| Pass counts | MobilityWare: "When the Draw 3 option is on, 3 passes are allowed through the stock pile, otherwise only one pass is allowed." Classic Windows / MSC / solitaire.com / Dummies / straightdope players: Draw 1 → 1 pass, Draw 3 → 3 passes. PySolFC: "Vegas Klondike" = 1 pass (`max_rounds=1`, "No redeal"), "Casino Klondike" = 3 passes (`max_rounds=3`). Aisleriot Klondike (no Vegas mode): one-card deals = two redeals (three passes), three-card = unlimited, plus an "Unlimited redeals" option. **No source offers Draw 2/4/5 in Vegas** — the draw-count rule for those is Soli's own. | high | MW FAQ (above); https://github.com/shlomif/PySolFC/blob/master/pysollib/games/klondike.py ; https://gitlab.gnome.org/GNOME/aisleriot/-/raw/master/help/C/klondike.xml ; https://www.trueachievements.com/game/Microsoft-Solitaire-Collection-Windows-Phone/walkthrough/3 ; https://boards.straightdope.com/t/solitaire/793467 |
| What happens when passes run out | PySolFC: `WasteTalonStack.canDealCards()` returns `False` once `round == max_rounds` — the talon simply refuses the tap; the game continues with tableau/waste moves; the separate "You are stuck" dialog is the generic stuck detection, not tied to the pass limit. Aisleriot: status-bar text "Redeals left: N" and the stock stops responding. MobilityWare/MSC/Windows: the UI at exhaustion is **not found** in any text source (the classic Windows red "⊘"-on-the-stock memory could not be verified — treat as not found). **No app found that pops a "game over" dialog on pass exhaustion.** | high (PySolFC code, Aisleriot doc), not found (commercial apps) | https://github.com/shlomif/PySolFC/blob/master/pysollib/stack.py ; https://man.archlinux.org/man/sol.6.en.raw ("Watch for the Redeals Left message") |
| Remaining passes shown before exhaustion? | PySolFC Casino Klondike: a "Round N" text anchored next to the talon (`lay.createRoundText(self.s.talon, 'ne')`). Aisleriot: "Redeals left" status message. Commercial apps: not found. | high / not found | PySolFC klondike.py (above) |
| Cumulative: when is the −$52 charged? | PySolFC: the game's casino score is `−52 + 5 × foundation cards` at any moment; the running total `gameid_balance` is updated in `endGame()` — i.e. when a new game is started, a game is restored or the app quits — with the CURRENT game result, unless the game is a *restart of the same deal*, a loaded game, or a manually selected deal number (`shallUpdateBalance`). So abandoning counts the loss; restarting the same deal does not. Classic Windows "Keep score" (help page, snippet only — direct fetch 403): running total across games; reset by switching scoring to None/Standard and back to Vegas; changing the scoring option mid-game ends the game and deals a new one. MobilityWare: "cumulative on → the point total is maintained between games; off → reset at the start of each new game"; nothing on abandon/reset. rarepike: "$52 is deducted from your balance before you make any moves", "some players prefer to abandon losing games early (in cumulative mode)". Solitaired: coin wallet (200/day refill) instead of a bankroll. | high (PySolFC), med (Windows snippet, MW), low (rarepike) | https://github.com/shlomif/PySolFC/blob/master/pysollib/game/__init__.py ; https://documentation.help/Solitaire/sol28bz.htm (snippet) ; MW FAQ; rarepike (above); https://solitaired.com/las-vegas-solitaire |
| Cumulative display | PySolFC: one text "Balance $N" = stored total + current game (live). MSC win screen: score + "Total score". MobilityWare: iOS listing advertises four scoring options "Standard, Standard Cumulative, Vegas, Vegas Cumulative" (store-listing mirror; not verified against the app). | high (PySolFC) / low (listings) | PySolFC klondike.py `updateText`; https://apptopia.com/ios/app/284791396/about |
| "Microsoft disables its Solver in Vegas" (user) | **Not found** — no text source describes MSC's solver availability per scoring type. | not found | — |

## Does "passes = draw count" hold up?

Yes, as Soli's rule; it generalises the only two conventions that exist (1 → 1, 3 → 3) and keeps the amount of stock the player can see roughly constant: one pass at Draw N shows ≈ 24 / N waste tops (plays shift the grouping on later passes, so later passes show *different* tops), so N passes ≈ 24 top exposures for every draw count. MobilityWare's literal "Draw 3 gets three, otherwise one" would give Draw 5 a single pass of ~5 reachable cards — effectively unplayable — and Draw 2 one pass of 12. Nobody offers Draw 2/4/5 in Vegas, so there is no convention to violate. One caveat to write into the setting description: Draw 1 Vegas is genuinely hard (players report ~10 % wins at Draw 3 Vegas; Draw 1 is harder), which is the authentic casino feel the user asked for.

## Description

Vegas stops being a display flavour and becomes the casino rule set: you buy the deck for $52, earn $5 per foundation card, and may only go through the stock as many times as your draw count. When no pass is left the stock shows a "no more passes" mark and refuses the tap; the game goes on with waste/tableau moves until nothing useful is left, at which point the existing stuck-warning bubble reports the final result. Optionally the bankroll carries over from game to game ("Keep Vegas total"), settled whenever a game ends — won or abandoned — and resettable from Settings.

Why: the user played Vegas and found that the limited passes ARE the game ("then you actually play with a casino model"). A Vegas tally on an unlimited-pass game is a fake number.

## Acceptance Criteria (Phase 2)

1. With Scoring = Vegas, every NEW deal is a Vegas-rules game: `passLimit = drawCount` (Draw 1 → 1 pass = 0 recycles, Draw 3 → 3 passes = 2 recycles, …). Games dealt under Off/Standard stay unlimited. The current game is never changed by flipping the setting (draw-count precedent).
2. On a Vegas-rules game, tapping the empty stock when no recycle is left does nothing: no board change, no move-log entry, no `moveCount` bump, no undo snapshot. The stock slot shows a distinct "no more passes" mark (not the recycle icon) and its a11y label reads "Stock, no passes left".
3. While recycles remain, the recycle card back shows how many are left ("2 left" / "1 left"); nothing extra is shown while the stock still has cards.
4. Undo/scrub of a recycle gives the pass back (restored `stockPasses`); the stock mark follows the restored state.
5. Auto-complete never recycles past the limit (it stops instead), so a Vegas game can end with cards stuck in the waste.
6. In a Vegas-rules game: no solver call is ever made (warnings, background checks). ~~The hint button hints the classic first useful move (pass-aware)~~ → ROUND 2: the Hint button is HIDDEN on Vegas-rules games (a Standard game in progress keeps it); the warning mode `unwinnable` behaves as `noUsefulMoves`; the stuck detection treats an unavailable recycle as "no more cards reachable".
7. Vegas game end: when the stock is exhausted on the last pass (or stock + waste are empty) and no useful move is left, the persistent notice bubble shows **"Game over — result −$17. Undo or deal again."** (round 2 wording; was "No more useful moves — result …"). Undo below the boundary clears it like today; forward moves keep it with the live amount.
8. "Winnable deals only" is ignored for Vegas deals (random deal; history `solvable` = false; Settings description says so).
9. HUD: Off → no badge; Vegas-rules game → "VEGAS −$17" (or "TOTAL …" with cumulative on) regardless of a later setting flip; Standard-rules game with Scoring = Vegas → "SCORE n" (the Vegas rule applies to the next game). Settings description says it applies to the next game. Every badge has an a11y label (round 2).
10. History: `vegas_score` is written only for Vegas-rules games (NULL otherwise); `standard_score` is written for every game as today. The row segment shows "Vegas −$17" only when the row has one; a Standard-rules row under Scoring = Vegas shows nothing (not a fake Vegas number).
11. Cumulative (round 2): switch "Keep Vegas total" (visible only with Scoring = Vegas, default off) + a "Reset Vegas total" button (no number — see P-H). The total = sum of `vegas_score` over all finished Vegas rows − the settled sum at the last reset, plus the live tally of the current Vegas game (unless its row is already settled, i.e. a won board). EVERY Vegas deal costs $52: abandoning (New Game / Retry / deep-link reset), zero-move abandons and retries all settle −$52 + earnings. Reset only stores the offset (history untouched).
12. Deep links: `?set=scoring:vegas` keeps working; new `?set=vegasTotal:on|off`.
13. Persistence: a saved Vegas game reloads with its rules (replay and snapshot-fallback paths); pre-Phase-2 payloads load as unlimited games. `MOVE_LOG_VERSION` unchanged (rules are per game, defaulted for old payloads — a test proves old logs replay identically).
14. `yarn typecheck && yarn lint && yarn jest` green; device smoke test per § Phase 2 testing.

## Possible approaches (Phase 2)

### P-A. Where the rule lives

| | A1. `vegasRules: boolean` on `GameSnapshot`, copied from the setting at deal time (RECOMMENDED) | A2. `passLimit: number \| null` on the snapshot | A3. Read the setting live in the reducer |
| --- | --- | --- | --- |
| Semantics | Same pattern as `drawCount` ("active games never read the global setting after creation"). Pass limit derived: `vegasRules ? drawCount : null`. | Same, but stores a derived number; a future "custom pass count" would want it — YAGNI. | Reducer no longer pure; replay would need the setting; mid-game flips change rules under the player. |
| Persistence | One boolean in `snapshotFromState`/`cloneSnapshot`/`HYDRATE_STATE` defaults (false for old payloads). | One nullable number, same places. | None, but wrong. |
| Elsewhere | `createInitialState`/`createGameStateFromExactId`/`createSolvableGameState` take `vegasRules` like they take `drawCount`; demo/fixture factories pass `false`. | Same. | — |

**Recommendation: A1.** Add a pure helper in `scoring.ts`: `recyclesAllowed(state) = vegasRules ? drawCount − 1 : Infinity` and `canRecycle(state) = waste.length > 0 && stockPasses < recyclesAllowed(state)`.

### P-B. Enforcement point

`drawFromStock` (klondike.ts:642) is the only path to `recycleWasteToStock` for player taps (DRAW_OR_RECYCLE) and `planAutoActions`/`advanceAutoQueue` are the only other callers. Gate both on `canRecycle`: in `drawFromStock` return `state` unchanged (the reducer already skips the move-log entry when `nextState === workingState`, so a refused tap leaves no trace — exactly what AC 2 needs); in `planAutoActions` `break` instead of planning a recycle; `advanceAutoQueue` gets the same guard defensively. ~8 lines. No `MOVE_LOG_VERSION` bump: a 'draw' entry is only logged when the board changed, and old logs come from unlimited games (`vegasRules` defaults to false), so they replay identically — add a jest that proves a pre-Phase-2 payload replays to the same board.

### P-C. UI at exhaustion

Existing visuals (TopRow.tsx:110-116 + CardVisual.tsx `CardBack`): three variants — `'stock'` (face-down card + draw label), `'recycle'` (dashed outline + `RefreshCcw` icon, label "Recycle waste into stock"), `'empty'` (dashed outline, label "Stock, empty", disabled). Existing notices: `GameNoticeBubble` (persistent while a dead era lasts; text "No more useful moves — undo or start a new game."), win `Alert` ("Start a new game?").

| | (a) Stock mark only; game continues until the player gives up | (b) Game-over dialog when no pass is left and nothing useful remains | (c) Both: mark on the stock + the existing stuck BUBBLE (not a modal) with the result |
| --- | --- | --- | --- |
| Precedent | PySolFC, Aisleriot (refuse + counter). | None found. | PySolFC's refuse + its separate stuck dialog, folded into Soli's bubble. |
| Player | Knows passes are gone, but may grind tableau moves forever (the user's exact complaint: "otherwise you can continue forever"). | Clear ending, but a modal blocks undo — and undo is legitimately allowed (gives the pass back). The win flow's modal is justified because the board is finished; here it is not. | Clear ending ("result −$17"), stays dismissible by undo (era exit), zero new components. |
| Effort | New card-back variant + label: ~25 lines. | + a second Alert flow + lock handling: ~40 lines. | (a) + wording change in `useHint` (needs the Vegas tally for the text): ~35 lines. |

**Recommendation: (c).** Mark: 4th `CardBack` variant `'exhausted'` — same dashed outline as `'empty'` with lucide `Ban` (circle-slash) in place of `RefreshCcw`, `PileButton` disabled, label `STOCK_EXHAUSTED_LABEL = 'Stock, no passes left'`, testID unchanged (`stock-recycle`, so device recipes keep resolving the slot). Remaining passes: show "N left" under the recycle icon on the `'recycle'` variant (player sees the information exactly at the decision point; nothing to add to the HUD, no extra badge). No "Pass 2/3" while cards remain in the stock — the stock count label is already there and a second number clutters the card.

### P-D. Solver-backed features in Vegas (user direction: drop, don't adapt)

| Feature | What breaks with pass limits | Options | Effort | Recommendation |
| --- | --- | --- | --- | --- |
| Lonelybot solver (`solverBridge`, Rust `solve.rs`, deck pointer wraps unlimited) | Any verdict assumes unlimited recycles: "solved" lines may need passes the player does not have; "unsolvable" stays true (fewer passes cannot help) but is rarely what matters. | (i) Pass-aware solver: a redeal counter in lonelybot's state + pruning changes + FFI field — a Rust project, weeks, and the search space changes character. (ii) Never call it on a Vegas-rules game. | (i) large; (ii) ~5 lines (`vegasRules` gate in `requestHint` and the background effect). | **(ii).** Vegas is about the bankroll, not winning; most limited deals are unwinnable anyway. |
| Hint button | The solver line is unusable, but the classic fallback (`showClassicFallback` → `findFirstUsefulMove`) is a non-solver path that already exists. | (i) Hide the button in Vegas (casino purist). (ii) Classic hint only (pass-aware enumeration). | (i) ~3 lines; (ii) ~10 lines (call `showClassicFallback` directly; `findFirstUsefulMove` must get `canRecycle`). | **(ii).** The button is its own opt-in setting; the classic hint leaks nothing about winnability (F11 design) and still says "draw" only when a reachable card helps. |
| Unwinnable-game warning (mode `unwinnable`, solver per move) | Needs the solver. | (i) Silently behave as `noUsefulMoves` in Vegas. (ii) Grey out the option in Settings when Vegas is on. | (i) ~3 lines (`effectiveWarningMode`); (ii) + Settings copy. | **(i) + one sentence in the Warnings description** ("In Vegas games the unwinnable check is replaced by the useful-moves check"). |
| "No more useful moves" detection (`usefulMoves.ts` rule 6 simulates two passes = unlimited recycles; `useHint` end-of-stock trigger + solver confirmation) | Rule 6 counts cards only reachable via a recycle the player no longer has; the solver confirmation can veto a correct warning ("solved" with extra passes). | Make the reachable-stock scan pass-aware: `collectReachableWasteTops(stock, waste, drawCount, { canRecycle })` skips pass 2 when no recycle is left (one boolean; after one recycle every further pass is identical, so "≥ 1 recycle left" is exactly today's two-pass bound). In Vegas fire the warning straight from the heuristic (no `enqueueSolve` confirmation) and include the result in the text. Trigger timing stays "stock empty" — on the last pass the stock stays empty while the player plays waste/tableau cards, and the effect re-runs per position key, so each further move re-evaluates (already the case: the gate is `board.stock.length !== 0 → return`). | ~25 lines + tests (`usefulMoves.test.ts`, `hintWarnings.test.tsx` driver). | **Do it — this IS the Vegas game end** (AC 7) and, with cumulative, the moment the player reads the final result (the bankroll itself is settled on the next deal, see P-F). |
| Solvable-deal catalog ("Winnable deals only") | Proven for unlimited passes; under Vegas limits a cataloged deal may be unwinnable (and the history row would say "Solvable"). | (i) Keep (deals are still "easier"). (ii) Ignore in Vegas: random deal, `solvable: false` on the row, description note. | (i) 0 + a misleading label; (ii) ~6 lines in `dealNewGame`/`useSolvableDealSelector` call site + copy. | **(ii).** An honest casino deal is random. |
| Auto-complete | `planAutoActions` recycles freely; Draw 1 triggers early (face-up tableau) and may need recycles. | Guard on `canRecycle` (P-B). | ~3 lines | Do it. |
| Demo/fixture deals (`?demo=…`, playlist, nearwin, scrubbed) | Replays were generated with unlimited recycles. | Their state factories pass `vegasRules: false` — unaffected. Document in the skill. | 0 | — |
| Rewind/scrubber | — | Snapshot-based; `stockPasses` and the stock mark follow the restored board. | 0 | — |

### P-E. Mid-game setting / draw-count changes (Vegas is now a rules mode)

| | E1. Applies from the next deal (RECOMMENDED) | E2. Windows style: changing the option ends the game and deals a new one | E3. Prompt "Start a new Vegas game?" |
| --- | --- | --- | --- |
| Precedent | Draw count (`docs/product/draw-count-setting/…`: "Active games never read the global draw-count setting after creation, so changing Settings only affects the next game"). | Classic Windows help (snippet). | — |
| Player | Nothing destructive; the description says "applies to your next game". The badge shows the current game's honest tally (AC 9). | Loses a game from a settings tap. | Extra dialog in Settings for a rare action. |

**Recommendation: E1**, badge rule `scoring === 'off' → none; game.vegasRules → Vegas; else Standard` (one expression in `buildStatisticsRows`, which gets `vegasRules` from the state). Draw count already applies next deal; `passLimit = drawCount` is read from the game's own `drawCount`, so the two cannot disagree. Switching Vegas → Standard mid-game keeps the Vegas game's limit (it was dealt as a casino game) and shows its Vegas badge; `?set=scoring:…` behaves the same.

### P-F. Both tallies vs. honest scores; history

A limited game has an honest **Standard** score (stricter rules, same point table) but an unlimited game has NO honest **Vegas** score (the player used passes a casino would not sell). So: keep computing both tallies in the reducer (zero change — `score.vegas` is still the pure `5 × foundation − 52`), but **record `vegas_score` only for Vegas-rules games** (NULL otherwise) and keep `standard_score` for all. No schema change (`vegas_score` is already nullable; its presence = "played under Vegas rules"). Rows written by the v1 build on Karim's devices carry unlimited-pass Vegas tallies — v1 was never released, so no migration; note it in Identified issues. Alternative (rejected): a `vegas_rules` column via migration v3 — more honest typing for ~30 extra lines and a migration; revisit only if a third rule set ever appears. History display: unchanged code path (`formatEntryMetadata` already skips NULL), so a Standard-rules row under Scoring = Vegas shows nothing. `solvable` is written false for Vegas deals (P-D).

### P-G. Cumulative bankroll

| Topic | Options | Recommendation |
| --- | --- | --- |
| Control | (i) Switch "Keep Vegas total" under the Scoring picker, visible only when Vegas is selected (user: "a separate thing"; Windows "Keep score"; MobilityWare "Vegas cumulative" toggle). (ii) 4th picker option "Vegas (cumulative)" (MSC). | **(i)** — the user asked for a separate control; also keeps the picker's three values. |
| Where the total lives | (i) Derive: `SUM(vegas_score)` over rows with `vegas_score IS NOT NULL AND status != 'active' AND started_at > resetAt` (`started_at` is NOT NULL for every row; `finished_at` is NULL for incomplete rows — verified in `historyRepository.native.ts`), `resetAt` = one kv value (`soli/vegasTotal/v1`), plus the live tally of the current Vegas game. (ii) A persisted ledger number updated on every game end + reset. | **(i)** — one source of truth (history already persists every game end incl. abandons); the ledger in (ii) can drift from history and needs its own write on every path (new game, retry, win, deep-link reset). Cost: one aggregate query (the `started_at` index exists) at startup and after each recorded result. Trade-off to note in code: deleting history rows changes the total (acceptable; history has no delete UI today). Keying on `started_at` means a game dealt before a reset but finished after it does NOT count — the reset row's "current total" preview should say "games started from now on". |
| When the −$52 is charged | (i) At game end (PySolFC `endGame`, i.e. when the row gets its final `vegas_score`): the total shown live = settled rows + current game tally, so the player SEES the −$52 the moment the deal starts and it becomes final at game end. (ii) At deal time as a separate ledger write. | **(i)** — identical on screen, no extra write, and abandoned games settle through the same `recordCurrentGameResult` call they already go through (New Game, Retry, `?reset=game`, win). **Zero-move abandons** (verified in `useKlondikeHistoryEntry.ts:214-227`): every deal has a tracked active row, so New Game at `moveCount === 0` still writes an incomplete row (the `moveCount === 0` early return only covers the lost-linkage path). Charging $52 for every "deal, dislike, re-deal" tap would be casino-faithful but punishes browsing; PySolFC exempts a same-deal restart. Recommendation: write `vegasScore: null` for incomplete rows with `moveCount === 0` (nothing was played → not a Vegas result; the row then shows no Vegas segment either). ~1 line, note the trade-off in code. |
| Reset | "Reset Vegas total" row (expo-ui Button) showing the current total, Alert confirmation, sets `vegasTotalResetAt = now`. The current game's live tally keeps counting after the reset (it will settle after the reset timestamp). | Do it. |
| HUD | (i) One badge, label "TOTAL", value = settled + live (PySolFC "Balance"). (ii) Two badges GAME + TOTAL — four badges do not fit 360 dp. | **(i)**; the per-game result is in the end-of-game bubble and the history row. |
| History | Rows unchanged (per-game `vegas_score`). Optional later: a header tile "Vegas total" (F4). | Rows only. |
| Undo cost in a bankroll context | Free (no app charges; purists forbid it entirely). Undo cannot touch the settled total (only the live game). | Free. A "no undo in Vegas" purist switch is not recommended. |
| Switch off → on | Total resumes from the stored reset timestamp (MobilityWare "maintained between games"). Turning the switch off only hides the total. | Simplest; no reset on toggle. |

## Open questions to the user (Phase 2)

The plan proceeds with the recommendation unless told otherwise. Status 2026-10-13: Q1–Q5, Q8–Q10, Q12 — **proceeding with recommendation** (implemented in P2-A/B; Q10 lands in the "New Games" section, which is where Draw count actually lives). Q6, Q7, Q11 belong to P2-C (not started).

1. **Passes = draw count** (Draw 1 → 1 … Draw 5 → 5)? Alternatives: MobilityWare literal (3 → 3, else 1) — Draw 4/5 unplayable; fixed 3 for all — Draw 1 gets 3× the cards it should. **Recommendation: passes = draw count.**
2. **Exhaustion UI**: (a) stock mark only, (b) game-over dialog, (c) mark + existing bubble with the result. **Recommendation: (c)** — no modal, undo stays possible.
3. **Remaining-pass indicator**: "N left" on the recycle card back (recommended) vs nothing (Windows) vs a HUD element.
4. **Mid-game switch**: next deal (recommended, draw-count precedent) vs Windows-style re-deal vs prompt.
5. **History without a rules column**: `vegas_score` NULL for non-Vegas games (recommended, no migration) vs a `vegas_rules` column.
6. **Bankroll derived from history + reset timestamp** (recommended) vs a stored ledger number. — ROUND 2: derived from history, but the reset is an **offset** (the settled sum at reset time), not a timestamp — see § Phase 2 round 2, P-H.
7. **Charge at game end incl. abandon** (recommended; PySolFC) — note that "Retry this deal" also counts as an abandon (PySolFC exempts a same-deal restart; Soli's retry creates a new row, so it charges — simpler and casino-faithful). — CLOSED by the user (round 2): abandon, zero-move new game AND retry all cost the $52. No exemptions.
8. **Hint button in Vegas**: classic non-solver hints (recommended) vs hidden. — CLOSED by the user (round 2): **hidden** (tried the "any useful move" hints, found them not worth it in a short casino game).
9. **"Winnable deals only" in Vegas**: ignored + random deal (recommended) vs kept.
10. **Picker location**: move "Scoring" from Statistics to the Gameplay section next to Draw count, since it now changes rules (recommended; v1 left a note to revisit exactly here) vs leave.
11. **Cumulative badge label** "TOTAL" (recommended) vs keeping "VEGAS".
12. **Warnings copy**: silently treat `unwinnable` as `noUsefulMoves` in Vegas + one sentence in the description (recommended) vs disabling the option.

## UX/UI (Phase 2)

Settings ("New Games" section — the one that holds Draw count / Solvable deals; iOS layout; Android stacks label above picker as today):

```
┌ New Games ────────────────────────────────┐
│ Draw count                       Draw 3 ▾ │
│ Solvable deals                      [ on ]│
│ Scoring                           Vegas ▾ │
│ Standard points, or Vegas: buy the deck   │
│ for $52, earn $5 per foundation card, and │
│ pass through the stock only as many times │
│ as your draw count. Applies to your next  │
│ game. Vegas games are random deals and    │
│ use the useful-moves check instead of the │
│ unwinnable check.                         │
│ Keep Vegas total                    [ on ]│   ← only when Scoring = Vegas
│ Carry the bankroll from game to game.     │
│ Reset Vegas total          −$69  [Reset]  │   ← only when Keep Vegas total is on
└───────────────────────────────────────────┘
```

Stock slot states on a Vegas Draw-3 game (dashed outline = existing `'empty'`/`'recycle'` styling):

```
 stock has cards      recycle, 2 left      recycle, 1 left      no passes left
 ┌────────┐           ┌ ─ ─ ─ ─┐           ┌ ─ ─ ─ ─┐           ┌ ─ ─ ─ ─┐
 │ ▒▒▒▒▒▒ │           │   ↻    │           │   ↻    │           │   ⊘    │
 │ ▒ 17 ▒ │           │ 2 left │           │ 1 left │           │        │
 │ ▒▒▒▒▒▒ │           └ ─ ─ ─ ─┘           └ ─ ─ ─ ─┘           └ ─ ─ ─ ─┘
 └────────┘           "Recycle waste       "Recycle waste       "Stock, no passes
 "Stock, 17 cards"     into stock, 2 left"  into stock, 1 left"  left" (disabled)
```

(The Standard/Off game keeps today's three states; the "N left" caption appears only on Vegas-rules games.)

HUD:

```
Vegas game, per-game:           Vegas game, Keep total on:      Standard game while Scoring = Vegas:
┌───────┐ ┌───────┐ ┌───────┐   ┌───────┐ ┌───────┐ ┌───────┐   ┌───────┐ ┌───────┐ ┌───────┐
│ VEGAS │ │ MOVES │ │ TIME  │   │ TOTAL │ │ MOVES │ │ TIME  │   │ SCORE │ │ MOVES │ │ TIME  │
│ −$17  │ │  42   │ │ 3:12  │   │ −$121 │ │  42   │ │ 3:12  │   │  385  │ │  42   │ │ 3:12  │
└───────┘ └───────┘ └───────┘   └───────┘ └───────┘ └───────┘   └───────┘ └───────┘ └───────┘
```

Game-end bubble (existing `GameNoticeBubble`, persistent while the dead era lasts):

```
┌──────────────────────────────────────────────────┐
│ No more useful moves — result −$17.              │
│ Undo or deal again.                              │
└──────────────────────────────────────────────────┘
```

With Keep Vegas total: "No more useful moves — result −$17, total −$121. Undo or deal again." The a11y announcement uses the same text. The hint button inside the era re-affirms the bubble as today.

## Components (Phase 2)

- Reuse: `CardBack` (new `'exhausted'` variant + optional caption), `PileButton`, `GameNoticeBubble`, `PickerPreference`, the Statistics-section switch rows (`DescribedSwitchRow` pattern from the hints plan) for "Keep Vegas total", expo-ui `Button` for the reset row, `Alert` for the reset confirmation.
- New pure helpers in `src/solitaire/scoring.ts`: `recyclesAllowed`, `canRecycle`, `formatVegasResultNotice(vegas, total?)`.
- New `src/storage/vegasTotal.ts` (kv: `soli/vegasTotal/v1` = `{ resetAt: number }`) + `historyRepository` aggregate `sumVegasScoreSince(resetAt)`.

## Simplification ideas (Phase 2)

- `vegasRules` boolean on the snapshot, pass limit derived from `drawCount` — no second number to persist, cannot disagree with the draw count.
- A refused recycle is a reducer no-op → no new action, no log entry, no version bump.
- Pass-aware stuck detection is one boolean into `collectReachableWasteTops`; "no solver in Vegas" is one gate at the two `enqueueSolve` call sites.
- Bankroll = SUM over history since a reset timestamp — no ledger, no new write paths.
- `vegas_score` NULL = "not a Vegas game" — no migration.

## Steps to implement (Phase 2)

Slice P2-A — Vegas rules core — DONE 2026-10-13 (implementation sub-agent; shippable only together with P2-B, which is also done):

- [x] **A1.** DONE. `GameSnapshot.vegasRules: boolean`; `createGameStateFromExactId` option `vegasRules` (default false), `createInitialState(drawCount, vegasRules = false)`; `createSolvableGameState` deliberately gained NO argument (the catalog is never used for Vegas deals — comment in klondike.ts); demo board passes false; `snapshotFromState`, `cloneSnapshot` (`?? false`), `HYDRATE_STATE` (`?? false`); the four GameState fixtures gained the field. Persistence: `deal.vegasRules` (optional) in the kv payload + replay base; snapshot fallback covered by `cloneSnapshot`.
- [x] **A2.** DONE. `scoring.ts`: `recyclesAllowed`, `recyclesLeft` (Infinity on unlimited games), `canRecycle`. ONE gate in `recycleWasteToStock` (not `drawFromStock`): every recycle path (player tap, `planAutoActions`, `advanceAutoQueue`) funnels through it and a refused recycle returns `state` → the reducer logs nothing. `planAutoActions` breaks when the recycle came back unchanged (it used to loop on `waste.length`). `MOVE_LOG_VERSION` comment extended.
- [x] **A3.** DONE. New `test/unit/solitaire/klondike.vegasRules.test.ts`: helper table Draw 1/2/3/5 + unlimited; refused tap is reference-equal (no log/history/moveCount); recycle while a pass is left (Vegas tally untouched); unlimited ignores `stockPasses`; undo of a recycle gives the pass back; auto-complete stops at the limit (unlimited fixture plans a recycle, Vegas fixture ends with the waste stuck); Vegas log replays identically and an unlimited log is unaffected; `HYDRATE_STATE` default. `gamePersistence.test.ts`: pre-Phase-2 payload (no `vegasRules` anywhere) loads as unlimited with identical board/depth/passes on both load paths; Vegas game round-trips through replay AND fallback.
- [x] **A4.** DONE. `useKlondikeGame`: `vegasRules = scoring === 'vegas'`; `createFreshGameState` skips the catalog in Vegas; `startGameFromExactDeal` (`?deal=`) and the retry/play-deal path pass `{ vegasRules }` (current setting's rules — comment). `solvable` on the row is DERIVED from the catalog (`createEntry`/`normalizeHistoryEntry`), so a random Vegas deal is false by itself — no write. NOTE: another agent (retry-and-share-deal plan) refactored `requestRetryDeal` → `requestPlayDeal` in the same file concurrently and carried the `vegasRules` edit over.
- [x] **A5.** DONE. `TopRow` prop `recyclesLeft: number` (Infinity = unlimited); `drawVariant 'exhausted'` when stock empty + waste non-empty + `recyclesLeft === 0`, `stockDisabled` includes it; `CardBack` variant `'exhausted'` (lucide `Ban`, recycle outline style) + `caption` prop ("2 left", style `cardBackCaption`); `accessibility.ts`: `STOCK_EXHAUSTED_LABEL`, `getStockRecycleLabel(recyclesLeft)` → "Recycle waste into stock, 2 left" (plain label on unlimited games), `formatRecyclesLeft`. testID unchanged (`stock-recycle`). Jest in `cardAccessibility.test.ts`.
- [x] **A6.** DONE. `buildStatisticsRows({ vegasRules, … })`: `scoring !== 'off'` → Vegas badge if the game has `vegasRules`, else Score. New `test/unit/features/klondike/statisticsHudBadge.test.ts`.
- [x] **A7.** DONE. Scoring row moved to the **New Games** section (the app has no Draw count in "Gameplay" — New Games holds Draw count + Solvable deals); new description (UX above); `parseScoringMode`/deep link unchanged.
- [x] **A8.** DONE. Pure `scoresForGameRecord(state, solved)` exported from `useKlondikeHistoryEntry.ts` (next to `moveLogForGameRecord`): `standardScore` always, `vegasScore` only when `vegasRules && (solved || moveCount > 0)`, otherwise `undefined` (the active row's NULL stays). Jest in `historyMoveLogRecord.test.ts`. Consequence for the Standard tally of a Vegas-rules game: recorded as before (stricter rules, same table → honest), and the row shows "Score n" under Scoring = Standard / "Vegas −$x" under Vegas / nothing under Off — unchanged display code.
- [x] **A9.** DONE. Testing skill: `scoring:vegas` catalog entry rewritten (rules mode, next deal, what to look for); caveat that every `?demo=` fixture and the demo board is unlimited; `?reset=game`/`?deal=` take the current setting's rules.

Slice P2-B — Vegas-aware detection + game end — DONE 2026-10-13:

- [x] **B1.** DONE. `collectReachableWasteTops(stock, waste, drawCount, recycleAvailable = true)`; `UsefulMoveBoard` gains `stockPasses` + `vegasRules` and `findFirstUsefulMove` passes `canRecycle(board)`. Jest: recycled pass skipped without a recycle; with a recycle left unchanged; last pass → only the current stock counts; unlimited ignores `stockPasses`.
- [x] **B2.** DONE. `useHint`: `warningMode` = effective mode (`vegasRules && 'unwinnable' → 'noUsefulMoves'`, the setting is received as `warningModeSetting`); end-of-stock trigger on a Vegas board → `fireWarning('noUsefulMoves', board)` directly; `requestHint` on a Vegas board → `showClassicFallback` (no solve; fire-on-discovery unreachable — comment); `stuckTextFor(board)` → `formatVegasResultNotice(score.vegas)` on Vegas games (`scoring.ts`), used by the persistent bubble (live tally → honest after a foundation dig), the announcement and the transient hint notice; `getHintFallbackNoticeText(board)` now takes a board slice (hintOverlay test updated). Jest (`hintWarnings.test.tsx`, new describe): zero `solvePosition` calls; warning at the last-pass stock end with the result text; refused recycle keeps the era; undo clears; re-evaluation after a waste play; `unwinnable` behaves as `noUsefulMoves`; hint press → classic fallback / re-affirm; mode off + empty fallback → transient result notice.
- [x] **B3.** DONE. Warnings description: "… Vegas games always use the useful-moves check."
- [x] **B4.** DONE 2026-10-13: `yarn typecheck` 0, `yarn lint` 0, `yarn jest` 41 suites / 448 tests green.

Slice P2-C — Cumulative bankroll (~100 lines incl. tests):

- [x] **C1.** DONE (round 2, F7) — plus `vegasTotalOffset` for the reset.
- [x] **C2.** DONE differently (round 2, P-H): no `vegasTotal.ts` module and no timestamp — `getHistorySummary().vegasTotal` (param-less SUM over finished rows) + a reset OFFSET in settings.
- [x] **C3.** DONE (round 2, F7). Bubble text deliberately WITHOUT the total (the badge shows it).
- [x] **C4.** DONE (round 2, F4) — the reset row shows NO number (it would differ from the HUD by the live game).
- [x] **C5.** DONE (round 2, F7).

Slice P2-D — Device smoke test (testing sub-agent, after A+B, again after C): script in § Phase 2 testing.

- [x] **D1 (after A+B).** DONE 2026-10-13 on the iOS simulator (iPhone 17 Pro, iOS 26.5): steps 1–11 and 14 PASS, step 12 not run, step 13 is P2-C. Android: NOT RUN (phone unreachable over wireless adb that night — rerun the Android pass when the phone is available; the JS bundle is identical, so only platform surfaces matter: Compose picker label refresh, caption fit at 411 dp, a11y labels). Results in § Testing (Phase 2).
- [x] **D2 (after C).** DONE 2026-10-13 on the Android phone (Nothing A065, 411 dp): round-2 script steps 1–6, 8, 10, 11 PASS, plus the Android pass-limit basics from the P2-D script; step 7 (real Vegas win) and 9 (reset on a won board) NOT RUN — no cheap way to win a Vegas deal on device. No bugs. Results in § Testing (round 2) results.

Slice P2-E — spoken HUD badges: DONE (round 2, F5).

## Plan: Files to modify (Phase 2)

| File | Slice | Change |
| --- | --- | --- |
| `src/solitaire/klondike.ts` | A | `vegasRules` on snapshot + factories + defaults; `canRecycle` gates in `drawFromStock`/`planAutoActions`/`advanceAutoQueue` |
| `src/solitaire/scoring.ts` | A/B/C | `recyclesAllowed`, `canRecycle`, `formatVegasResultNotice` |
| `src/solitaire/usefulMoves.ts` | B | pass-aware reachable-stock scan |
| `src/features/klondike/components/cards/TopRow.tsx`, `CardVisual.tsx` (`CardBack`), `accessibility.ts` | A | `'exhausted'` variant, "N left" caption, labels |
| `src/features/klondike/components/StatisticsHud.tsx` | A/C | badge rule, TOTAL badge |
| `src/features/klondike/hooks/useKlondikeGame.ts` | A/C | deal with `vegasRules`, skip catalog in Vegas, total into rows |
| `src/features/klondike/hooks/useHint.ts` | B | Vegas gates, result text |
| `src/features/klondike/hooks/useKlondikeHistoryEntry.ts` | A | `vegasScore` only for Vegas games, `solvable` false |
| `src/state/settings.tsx`, `app/(tabs)/settings.tsx` | A/C | copy, section move, `vegasTotal` switch + reset row |
| `src/state/history.tsx`, `src/storage/historyRepository.native.ts` (+ `.web.ts`) | C | `sumVegasScoreSince` |
| `src/storage/vegasTotal.ts` (new) | C | reset timestamp |
| `src/features/klondike/hooks/useDemoGameLauncher.ts`, `.agents/skills/soli-testing/SKILL.md` | A/C | deep-link keys, notes |
| Tests: `klondike.scoring.test.ts`, `klondike.autoQueue.test.ts`, `usefulMoves.test.ts`, `hintWarnings.test.tsx`, `cardAccessibility.test.ts`, `gamePersistence.test.ts`, `historyRepository.test.ts`, `settingsScoring.test.ts`, `demoLinkParsing.test.ts` | A/B/C | per step |

## Testing (Phase 2)

Cheap gates per slice — P2-A/B: green 2026-10-13 (41 suites / 448 tests). Device script for slice P2-D (testing sub-agent; read `.agents/skills/soli-testing/SKILL.md` first; Android phone preferred, one device; no video/frame analysis). Exact strings are what the build renders — report any mismatch verbatim:

1. Settings: the **Scoring** picker now sits in the **New Games** section under Draw count / Solvable deals (no longer under Statistics) with the description "Standard points, or Vegas: buy the deck for $52, earn $5 per foundation card, and pass through the stock only as many times as your draw count. Applies to your next game. Vegas games are random deals and use the useful-moves check instead of the unwinnable check." The **Warnings** description (Gameplay) ends with "Vegas games always use the useful-moves check." Picker still shows Off / Standard / Vegas, default Off, Android label updates after a pick.
2. `soli://?set=scoring:vegas,drawCount:3,solvableOnly:off` then `soli://?reset=game`: fresh deal reads **VEGAS −$52** (badge left of MOVES/TIME); the stock card shows the normal "Draw" label and count; the History row of the previous (Standard) game is unchanged.
3. Tap through the stock (Draw 3 → 8 taps): when the stock is empty the recycle card shows the recycle icon with the caption **"2 left"** and a11y label "Recycle waste into stock, 2 left". Recycle (tap) → play through again → **"1 left"** / "…, 1 left". Recycle again → play through → the slot shows the **⊘ (circle-slash) mark**, no caption; its a11y label is **"Stock, no passes left"**; tapping it does nothing (MOVES unchanged, no undo snapshot: Undo still undoes the previous draw, not a recycle).
4. Undo back past the last recycle → the recycle card returns with "1 left"; scrub forward again → ⊘ again. (Undo gives the pass back.)
5. Play remaining waste/tableau cards until nothing useful is left (with Warnings = "No more useful moves", the default) → persistent bubble **"No more useful moves — result −$X. Undo or deal again."** (X = 52 − 5 × foundation cards; U+2212 minus, no plus sign). The bubble is announced for a11y. Stream logs: **no `[solver]` log line at any point of the Vegas game**. Undo below the stuck point → the bubble clears; moving a foundation card back down while stuck keeps the bubble and updates the amount (−$5).
6. Hint button on the Vegas game (enable via `?set=hintButton:on`): mid-game → a ring on a useful move (or "No hint found."), never a `[solver]` line; inside the stuck era → the bubble re-affirms (pulse + announcement). With Warnings = "Unwinnable game" (`?set=warnings:unwinnable`) a Vegas game behaves exactly like "No more useful moves" (same bubble text, still no `[solver]` line); a Standard game in that mode still shows the "No winning moves left" warning (solver line present) — regression.
7. Draw 1 Vegas (`?set=drawCount:1`, `?reset=game`): ⊘ immediately when the stock runs out (no "N left" caption ever); Draw 5 Vegas shows "4 left" at the first run-through.
8. Setting applies to the next deal: switch Scoring to Standard mid-game (`?set=scoring:standard`, no reset): the badge stays **VEGAS**, the ⊘ / "N left" stays. New Game → **SCORE** badge, unlimited recycles (plain recycle icon, no caption, label "Recycle waste into stock"). Switch back to Vegas mid-game on that Standard game: badge still SCORE, recycle unlimited; next deal Vegas again.
9. Solvable deals on + Vegas (`?set=solvableOnly:on,scoring:vegas`, `?reset=game`): the new Vegas row in History carries no "Solvable" segment; a Standard deal with the setting on does.
10. History: Vegas rows show "Vegas −$X" under Scoring = Vegas and "Score n" under Standard; a Standard-rules row shows "Score n" under Standard and NOTHING under Vegas (no fake Vegas number); a Vegas row abandoned at 0 moves (deal → immediately New Game) shows no Vegas segment; pre-Phase-2 rows unchanged (rows from the 2026-10-11/12 dev builds DO carry unlimited-pass Vegas numbers — expected, see Identified issues).
11. Persistence: kill + relaunch mid Vegas game (after at least one recycle) → "N left"/⊘, badge VEGAS and the tally are restored; Undo still works.
12. Auto-complete on a Vegas game that needs a recycle it does not have (Draw 1 Vegas, tableau fully face-up, Auto Up on): the run plays what it can, draws the stock out and stops with cards in the waste — no recycle, no endless loop; the stuck bubble then reports the result.
13. (After P2-C) Keep Vegas total on: badge TOTAL = −$52 on a fresh deal, carries after New Game (abandon) and after a win (`?demo=nearwin&left=1` is a Standard fixture — use a real Vegas game); Reset Vegas total → TOTAL = live game tally only; switch off hides the total but a later switch-on restores it.
14. Regression: `?set=scoring:off` → MOVES/TIME only, unlimited recycles; Standard unchanged (recycle penalties, stuck warning WITH solver confirmation = `[solver] source=auto` line at the end of the stock); demo playlist (`?demo=autosolve&games=1`) still solves even with Scoring = Vegas (unlimited fixture); `yarn nearwin` win + celebration unchanged.

### Device test results P2-D (2026-10-13, testing sub-agent)

**iOS simulator iPhone 17 Pro (iOS 26.5, 402 pt wide), Release build 15 from `yarn ios`.** Driven with agent-device (session `p2d`) + `yarn deeplink … --ios`; `[solver]` / `[SoliDev]` lines captured with `log stream --level debug`. Screenshots in `docs/product/scoring/screenshots/` (prefix `p2-ios-`). Fixture deal for the game end: `E1_3wg0zvd1izdp5860yamwkszzaj908rw031kavl52rtlu` (`?deal=<id>&draw=N` while Scoring = Vegas; found by a throw-away jest search over seeded shuffles — note `createRandomExactDealId()` is NOT random under jest, every call yields the same deal).

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Scoring picker in **New Games** under Cards drawn / Solvable deals, description verbatim (five lines, no truncation), Warnings description ends with the Vegas sentence, default Off, pick Standard → kill + relaunch keeps it | PASS | `p2-ios-01-settings-new-games.png`; tree text matched the plan strings exactly; SCORE badge on the (unlimited) game after `simctl terminate` + launch |
| 2 | Vegas + Draw 3 fresh deal: `VEGAS −$52` left of MOVES/TIME, "Stock, 21 cards" | PASS | tree: `VEGAS / −$52 / MOVES 0`, `Stock, 21 cards` |
| 3 | Pass captions + exhaustion: after pass 1 "Recycle waste into stock, 2 left" (caption `2 left` under the icon), after pass 2 "…, 1 left", after pass 3 the ⊘ slot "Stock, no passes left" `[disabled]`, no caption; tapping it leaves MOVES at 25; Undo undoes the last draw (Stock, 3 cards), not a recycle | PASS | `p2-ios-02-recycle-2-left.png`, `p2-ios-03-recycle-1-left.png`, `p2-ios-04-stock-exhausted.png` |
| 4 | Undo back past the recycle gives the pass back ("…, 1 left"); replaying the pass → ⊘ again (iOS: re-tapped instead of scrubbing — no Appium) | PASS | tree labels after 9 undos / after 9 taps |
| 5 | Game end: A♦ → foundation → persistent bubble **"No more useful moves — result −$47. Undo or deal again."** (U+2212, no plus), a11y node carries the text; **0 `[solver]` lines** during the whole Vegas game; Undo → bubble gone, `−$52`, A♦ back in column 7 | PASS | `p2-ios-05-vegas-result-bubble.png` |
| 6 | Hint: inside the era the bubble stays (re-affirm); mid-game Hint → amber rings on A♦ + diamonds foundation, no solver; `?set=warnings:unwinnable` on the Vegas game → same bubble text, still 0 solver lines; Standard game in unwinnable mode → `[solver] source=auto status=solved … stock=24 depth=11` after one tap | PASS | `p2-ios-06-vegas-classic-hint.png`; log |
| 7 | Draw 1 Vegas: ⊘ immediately after the 23rd tap, never a caption; A♦ → bubble −$47. Draw 5 Vegas: "Recycle waste into stock, 4 left" after the first run-through | PASS | `p2-ios-07-draw1-exhausted.png`, `p2-ios-08-draw5-4-left.png` |
| 8 | Next-deal semantics: `?set=scoring:standard` on the Draw-5 Vegas game → badge stays VEGAS, "4 left" stays; `?reset=game` → SCORE, plain "Recycle waste into stock" (no caption), recycle refills to 24 (unlimited); `?set=scoring:vegas` on that Standard game → still SCORE; `?set=scoring:off` → no badge | PASS | tree |
| 9 | Solvable deals on + Vegas → row "Vegas −$52 · Draw 5" without "Solvable"; Standard deal with the setting on → "… · Draw 5 · Solvable" | PASS | `p2-ios-09-history-vegas.png` |
| 10 | History: Vegas rows show "Vegas −$52" under Vegas, "Score 0" under Standard, nothing under Off; Standard-rules rows show NOTHING under Vegas; zero-move Vegas abandon (deal → `?reset=game`) shows no Vegas segment | PASS | `p2-ios-09-history-vegas.png` + tree under Standard / Off |
| 11 | Persistence: `simctl terminate` + launch inside the Draw-3 era → `VEGAS −$47`, ⊘ "Stock, no passes left", bubble restored; Undo works (−$52, foundation empty) | PASS | tree |
| 12 | Auto-complete stopping at the pass limit | NOT RUN | needs a fully face-up tableau on a Draw-1 Vegas deal; covered by `klondike.vegasRules.test.ts` |
| 14 | Regression: Off → MOVES/TIME only; `?demo=autosolve&games=1` with Scoring = Vegas → "Playlist completed", SCORE 320 (unlimited fixture → Score badge, as designed); Standard stuck check at the end of the stock logged NO solver line — expected, the solver confirmation only runs when the heuristic already says dead (a useful move existed); the solver-backed paths were proven via the unwinnable-mode line in #6. `yarn nearwin` not re-run (2026-10-12 pass) | PASS | log |
| — | Pre-build saved game loads | NOT VERIFIABLE | another session re-dealt on the sim between the install and my first look; the app launched normally on the existing data (no crash) |

Settings restored afterwards via `?set=drawCount:1,solvableOnly:on,warnings:stuck,hintButton:off,scoring:off` (Auto Up untouched; developer mode left ON — deep links enable it). Test data left on the simulator: ~10 incomplete rows from 01:04–01:12 (fixture deals `PZ6U…`-style ids, the Draw-5 games, one zero-move Vegas row `07C2-VJLT`) plus the solved playlist game; the won game's "Deal Again" alert was left open. Nothing seeded, nothing deleted.

Shared-machine notes: the Android phone was not reachable; the iOS build's Expo install step hung on "Connecting to: iPhone 17 Pro" for 55 min although the `.app` was already installed (checksums identical) — see the skill's troubleshooting row. Another agent's tester drove the simulator 00:33–00:40 with this same build (shared tree) while my install was hanging and closed its session before I started; no state of theirs was touched.

## Files actually modified (Phase 2, slices A + B — 2026-10-13, nothing staged or committed)

| File | Change |
| --- | --- |
| `src/solitaire/scoring.ts` | Header comment (Vegas = rules mode, timed scoring rejected); `recyclesAllowed`, `recyclesLeft`, `canRecycle`, `formatVegasResultNotice` |
| `src/solitaire/klondike.ts` | `GameSnapshot.vegasRules` + comment; factory option/argument; demo board false; `HYDRATE_STATE`/`snapshotFromState`/`cloneSnapshot`; `canRecycle` gate in `recycleWasteToStock`; `planAutoActions` break on refused recycle; `MOVE_LOG_VERSION` comment |
| `src/solitaire/usefulMoves.ts` | Pass-aware `collectReachableWasteTops` (4th arg); `UsefulMoveBoard` + `stockPasses`/`vegasRules`; header comment |
| `src/storage/gamePersistence.ts` | `deal.vegasRules` (optional) serialized + used for the replay base |
| `src/features/klondike/hooks/useHint.ts` | Effective warning mode, direct fire on Vegas boards, no-solve hint path, result text helpers, `getHintFallbackNoticeText(board)` |
| `src/features/klondike/hooks/useKlondikeGame.ts` | `vegasRules` from the setting; catalog skipped in Vegas; `?deal=`/retry pass the flag; HUD gets `vegasRules`; `recyclesLeft` into `TopRow` (file concurrently refactored by the retry-and-share-deal agent — edits merged there) |
| `src/features/klondike/hooks/useKlondikeHistoryEntry.ts` | `scoresForGameRecord` (exported) replaces the inline both-tallies write |
| `src/features/klondike/components/cards/TopRow.tsx` | `recyclesLeft` prop, `'exhausted'` variant, labels, caption |
| `src/features/klondike/components/cards/CardVisual.tsx` | `CardBack` variant `'exhausted'` (lucide `Ban`) + `caption` |
| `src/features/klondike/components/cards/styles.ts` | `cardBackCaption` |
| `src/features/klondike/components/cards/accessibility.ts` | `STOCK_EXHAUSTED_LABEL`, `getStockRecycleLabel`, `formatRecyclesLeft` |
| `src/features/klondike/components/StatisticsHud.tsx` | Badge rule with `vegasRules` |
| `src/state/settings.tsx` | Comments + Scoring / Warnings description copy |
| `app/(tabs)/settings.tsx` | Scoring row moved to New Games |
| `.agents/skills/soli-testing/SKILL.md` | `scoring:vegas` catalog text; fixtures-are-unlimited caveat |
| Tests | new `test/unit/solitaire/klondike.vegasRules.test.ts`, `test/unit/features/klondike/statisticsHudBadge.test.ts`; extended `usefulMoves.test.ts`, `hintWarnings.test.tsx`, `hintOverlay.test.ts`, `cardAccessibility.test.ts`, `historyMoveLogRecord.test.ts`, `gamePersistence.test.ts`; fixtures `solitaire/helpers.ts`, `klondike.autoMoveFallback/autoUpSetting/drawCount.test.ts` gained `vegasRules: false` |

Not touched: `historyRepository.*` and `src/state/history.tsx` (no schema/type change — `vegasScore` was already optional/nullable), `useDemoGameLauncher.ts` (`?set=scoring:` unchanged), `demoReplay.ts` (fixtures default to unlimited).

## Intermediary learnings (Phase 2)

- 2026-10-13: Gating the pass limit inside `recycleWasteToStock` (not `drawFromStock`) is the whole enforcement — all three recycle paths funnel through it. The only ripple was `planAutoActions`, which decided to recycle on `waste.length` and would have pushed a `'recycle'` action forever (until `MAX_AUTO_COMPLETE_ITERATIONS`) when the recycle is refused; it now breaks when the recycle returns the same state.
- 2026-10-13: `finalizeState` returns the same reference when nothing changes (no win flag flip, Auto Up off or no plan), so a refused tap is reference-equal to the input — the jest asserts `toBe(state)`.
- 2026-10-13: The history row's `solvable` flag is DERIVED from the catalog in `createEntry`/`normalizeHistoryEntry` (not an input), so "solvable false for Vegas deals" needs no write — skipping the catalog is enough. The plan's "`solvable: false` on the row" wording was misleading.
- 2026-10-13: The Settings screen has no Draw count in a "Gameplay" section — Draw count + Solvable deals live in **New Games**; Scoring moved there.
- 2026-10-13: `UpdateEntryInput.vegasScore?: number` merges with `??`, so `undefined` keeps the active row's NULL — `scoresForGameRecord` returns `undefined` (not `null`) for non-Vegas games; no type change needed.
- 2026-10-13: `useKlondikeGame.ts` was being refactored by another agent (retry-and-share-deal) while this slice landed; the file on disk carries both changes (verified via `git diff`), and the gates ran against that merged state.
- 2026-10-13: Draw-count nuance for pass-aware tests: a buried waste card only surfaces after a recycle if it is the LAST card of a recycled draw group (draw 3 over a 2-card waste exposes only the top) — the useful-moves fixtures use draw 2 over three waste cards.

## Identified issues (Phase 2)

- (open, dev data only) History rows written by the v1 build (2026-10-11/12, Karim's devices only, never released) carry `vegas_score` values from unlimited-pass games. After P2-A they read as Vegas-rules games (row shows "Vegas …" under Scoring = Vegas). Acceptable; no migration.
- (by design) `?demo=nearwin`, the playlist and the scrubbed fixture are unlimited games by construction; a Vegas game-end test must use a real deal (skill caveat added).
- (REVERSED 2026-10-13, round 2) Zero-move abandons: the user wants EVERY Vegas deal charged — `scoresForGameRecord` now writes `score.vegas` (−$52) for zero-move Vegas games too; the row shows "Vegas −$52" and the cumulative total counts it.
- (CLOSED 2026-10-13, iOS) Caption fit: "2 left" / "1 left" / "4 left" render centred under the recycle icon with room to spare at 402 pt; the ⊘ mark reads clearly (`p2-ios-02/03/04/08`). Android (411 dp, Compose) still unverified.
- (CLOSED 2026-10-13, iOS) Settings description length: the five-line Scoring description wraps fully, nothing truncated (`p2-ios-01`). The **Warnings** row still truncates its description to one line with an ellipsis — pre-existing v1 observation, unchanged.
- (observation, by design) A zero-move Vegas abandon shows "Score 0" under Scoring = Standard and (since round 2) "Vegas −$52" under Vegas.
- (observation, test infra) Under jest, `createRandomExactDealId()` returns the same deal on every call (the Crypto polyfill is deterministic there) — a fixture search must shuffle `createCanonicalDealCards()` itself and encode with `encodeExactDealId`.
- (observation) Inside a Vegas stuck era the bubble text follows the live tally (`state.score`), so a foundation→tableau dig changes "result −$17" to "−$22" while the era stays — intended (honest number), but note the bubble does not re-announce on the change.

## Follow-ups (Phase 2)

| Follow-up | Description | Recommendation |
| --- | --- | --- |
| Vegas total tile in History header | "Vegas total" + "Best Vegas game" tiles (F4). | After P2-C ships and the user wants it. |
| Purist switch "No undo in Vegas" | Disable undo/scrubber on Vegas games (rarepike's casino purism). | Not recommended; no app does it. |
| Pass-aware solver | Redeal counter in lonelybot. | Not recommended (user: drop solver in Vegas). |

---

# Phase 2 round 2: casino experience (prompt 5, 2026-10-13)

Status: IMPLEMENTED 2026-10-13 (implementation sub-agent), cheap gates green, device test DONE 2026-10-13 on the Android phone (all run checks PASS, no bugs; win-path checks 7/9 not run — § Testing (round 2) results). Decisions from prompt 5 replace the earlier recommendations where they differ (listed below). Nothing staged or committed. **Superseded in part by round 3 (below): the game-over bubble (R1) and the Vegas-sentence in the Warnings copy are gone; the round-2 strings table and device script are history.**

## Decisions (user, prompt 5) and how they land

| # | Topic | Decision | Replaces |
| --- | --- | --- | --- |
| R1 | Vegas game-end wording | "No more useful moves…" is confusing in Vegas — it is the END. Bubble now reads **"Game over — result −$47. Undo or deal again."** (one line, shared `formatVegasScore`, same text announced for a11y). Still a bubble, no modal, undo stays possible. | AC 7 wording ("No more useful moves — result …") |
| R2 | Hint button in Vegas | **Hidden** on Vegas-rules games (driven by the game's `vegasRules`, so a Standard game in progress keeps it while Vegas is selected). Casino: no hints. The pass-aware classic-hint path that only existed for Vegas hints is removed; the pass-aware useful-moves check stays (it IS the game end). | Open question 8 (classic hints) |
| R3 | Settings note | When Vegas is selected the Scoring description switches to a short casino note (no hints, no guaranteed-winnable deals, limited passes, next game). No jargon. | Phase 2 five-line description |
| R4 | Next-game semantics | Confirmed: switching into/out of Vegas applies from the next deal (E1). | — |
| R5 | a11y on HUD badges | **All three badges** get an `accessibilityLabel` (and a testID): "Vegas, minus 47 dollars" / "Score, 385" / "Moves, 42" / "Time, 3 minutes 12 seconds". | P2-E optional → done |
| R6 | Every deal costs $52 | Abandon, **zero-move** New Game, Retry/Play deal: all store −$52 (+ earnings) — otherwise players cycle deals until aces show. Applies with cumulative off too (history row shows "Vegas −$52"). | P-G zero-move exemption; Identified-issue "(decided, P-G) Zero-move abandons" |
| R7 | Cumulative total (P2-C) | Implemented: switch "Keep Vegas total" under the picker (Vegas only), TOTAL badge = settled history + live game − reset offset, "Reset Vegas total" button with confirmation. | — |

## Can the pass-aware useful-moves check declare "Game over" too early? (R1 analysis)

The check (`findFirstUsefulMove`, rules 1–6) runs WITHOUT solver confirmation on Vegas games and counts: tops → foundation, waste → foundation/tableau, full-run moves that reveal a face-down card or free a column, splits whose exposed card plays to a foundation NOW, and a draw when a reachable waste top (within the passes left) plays anywhere. It deliberately excludes (like every classic app) foundation → tableau digs and non-revealing rearrangements. So it says "stuck" although a multi-step line could still put a card on a foundation in exactly these cases:

1. **Foundation dig**: a card must come back DOWN from a foundation to receive a tableau run, which then reveals a face-down card (or frees a column) that leads to a foundation play. Not a casino move anyway (classic Vegas rules make foundation plays permanent; Soli keeps it legal and charges −$5).
2. **Two-step rearrangement**: split a run at a card that does NOT play to a foundation (rule 5 skips it), so that ANOTHER run can move onto the exposed card and reveal a face-down card. Rule 4 only sees targets that already exist; rule 5 only counts splits with an immediate foundation payoff. Realistic but rare (it needs the stock to be exhausted on the last pass AND such a two-step line to be the only progress left). In Standard games this is exactly the class the solver confirmation rescues (`[stuck-heuristic] false positive` warn).
3. **Reachable-stock subtleties**: none on the last pass — the stock is empty, the waste top is the only accessible card, and that card is checked by rules 2–3. Before the last pass rule 6 simulates the exact remaining passes.

Conclusion: false ends are **possible but rare** (cases 1–2). Consequences chosen: the game stays fully playable (no modal, no lock), undo clears the bubble, forward moves keep the bubble with the LIVE result (so a player who finds a continuation still sees an honest number), and the wording "Game over" is the product definition of the Vegas end (the user asked for end-of-game wording; "the pass-aware check finds nothing useful" IS the rule, as in P-D). Flagged in the report so Karim can pick a softer wording if he prefers; the string lives in ONE place (`formatVegasResultNotice`).

## P-H. Cumulative total — final design (replaces P-G's reset/zero-move details)

- **Settings**: `statistics.vegasTotal: boolean` (default false) = "Keep Vegas total" switch, visible only when Scoring = Vegas. `statistics.vegasTotalOffset: number` (default 0) = the settled sum at the last reset. Stored in the settings payload (one tiny number; no new kv key/module — simplification, see trade-offs).
- **Settled sum**: `getHistorySummary()` gains `vegasTotal = COALESCE(SUM(vegas_score), 0)` over non-active rows (param-less; refreshed by `refreshMetadata` after every history write like the other counts). Exposed as `useHistory().vegasTotal`.
- **Current game**: `useKlondikeHistoryEntry` exposes `boardEntryId` (the history row of the game on the board, kept across the win → Deal Again window — unlike `currentGameEntryIdRef`, which is nulled on record). HUD total = `settled − offset + (row already carries a vegas_score ? 0 : live tally)`. The current row is looked up in the in-memory entries (it is always the newest row). This makes a won game count exactly once (row settled → live excluded) and an in-progress game count via its live tally.
- **Reset**: Settings button "Reset Vegas total" → Alert → `offset = settled` (sync, from `useHistory().vegasTotal`). On a won board the total reads $0, mid-game it reads the live game only; the next deal starts at −$52 again.
- **Why offset, not timestamp** (plan P-G said `started_at > resetAt`): with a timestamp the game in progress at reset time would be shown live now but EXCLUDED once it settles (started before the reset) — the total would jump at the next deal. The offset keeps the live game consistent and makes Settings' reset synchronous. Trade-off: deleting history rows (`?seedHistory=clear` after a reset taken while seeds were present; `clearHistory` has no UI) shifts the total — dev-only, documented.
- **Gap note**: in-memory rows update synchronously, the SQL summary a few ms later → the TOTAL badge can be off by one game's result for ~1 frame right after a win/abandon write. Accepted (correct by the next refresh; no visible flicker expected). The alternative (a dedicated query that awaits the write queue) has the same-sized gap in the other direction with more code.
- **Bubble**: stays "Game over — result −$47. Undo or deal again." — NO ", total −$121" (the TOTAL badge is right there; simplification).
- **Badge label**: TOTAL (Q11 recommendation). Switching "Keep Vegas total" off only hides it; the offset persists.
- **Deep link**: `?set=vegasTotal:on|off`.

## Deal paths — how each Vegas-rules deal is charged exactly once (R6 audit)

Charging = the row's `vegas_score` written at game end by `recordCurrentGameResult` (now `score.vegas` for EVERY Vegas-rules game, zero-move included) + the live tally of the game on the board.

| Path | What happens | Charged |
| --- | --- | --- |
| New Game (drawer/alert "Deal Again") | `performDealAgain` → `recordCurrentGameResult` (old row settled) → `dealNewGame` → `recordStartedGame` (new active row, `vegas_score` NULL; its −$52 shows live) | once |
| Deal Again after a win | the win already settled the row (solved, +$208 …); `performDealAgain` skips recording (`hasWon`) | once |
| Retry this deal / Play shared deal | `requestPlayDeal` → `performDealAgain` (same as New Game). Confirmation now also shown for a zero-move **Vegas** board (money is at stake); still skipped on a won board or a zero-move non-Vegas board | once |
| `?reset=game`, `?deal=` | `performDealAgain` | once |
| App start, no saved game | fresh deal via `useKlondikePersistence` → the history hydration effect creates the active row | once (at its end) |
| App start, saved game WON | row already solved; the repair path (`getActiveEntry` still active) now also writes both scores from the payload (was missing) | once |
| App start, saved game in progress | row re-linked (`historyEntryId`), nothing new | — |
| Corrupted save → fresh deal | the lost game's active row is flipped to incomplete by the new active insert with `vegas_score` NULL — a game whose tally is lost cannot be charged | not charged (documented) |
| Draw-count / Scoring / other setting changes | never force a deal (draw count + Vegas apply to the NEXT deal) | n/a |
| Dev demo links (`?demo=…`, playlist, nearwin, scrubbed, old demo) | `handleLaunchDemoGame` settles the current game first (`recordCurrentGameResult`), then hydrates a fixture with `vegasRules: false` → never a Vegas result | current game once; fixtures never |
| `?seedHistory=default` | seeded rows carry `vegas_score` (208 / −37) and therefore COUNT in the settled sum while seeded (`=clear` removes them) | dev only |
| Untracked fallback (`recordCurrentGameResult` without a linked row) | used to skip zero-move games; now records a Vegas-rules game even at zero moves (the deal was bought) | once |

History keeps a row for zero-move games on every path above: the active row is created at deal time (`recordStartedGame`) or by the hydration effect, and `recordCurrentGameResult` updates the tracked row regardless of `moveCount`.

## Final UI strings (verbatim)

- Bubble / announcement: `Game over — result −$47. Undo or deal again.`
- Scoring description, Off/Standard selected: `Standard points, or Vegas for dollars under casino rules. Applies to your next game.`
- Scoring description, Vegas selected: `Casino rules from your next game: $52 to play, $5 back per card on a foundation, limited passes. No hints, no guaranteed wins.`
- Warnings description: `Warn when you run out of useful moves, or as soon as the game can't be won anymore. Vegas games end when you run out of useful moves.`
- Keep Vegas total row: label `Keep Vegas total`, description `Carry your winnings and losses from game to game.`
- Reset row: button `Reset Vegas total`; Alert title `Reset Vegas total?`, message `Your total starts over from the current game.`, buttons Cancel / Reset.
- HUD badge labels (a11y): `Score, 385` · `Vegas, minus 47 dollars` · `Total, minus 121 dollars` · `Moves, 42` · `Time, 3 minutes 12 seconds` (testIDs `stat-score` / `stat-vegas` / `stat-total` / `stat-moves` / `stat-time`).

## Steps (round 2)

- [x] **F1.** DONE. Plan upkeep before coding (prompt, decisions, AC, P-H, deal audit) — this section.
- [x] **F2.** DONE. `formatVegasResultNotice` → "Game over — result −$47. Undo or deal again." (one place; comment with the false-end trade-off). Tests updated: `scoring.test.ts` (+ spoken helper), `hintWarnings.test.tsx` (text + a new "foundation dig inside the era keeps the bubble, live result" test replacing the two removed Vegas-hint tests), `hintOverlay.test.ts`.
- [x] **F3.** DONE. `useKlondikeGame`: `hintButtonEnabled = hintButtonSetting && !state.vegasRules` feeds `useHint` AND the dock (`visible`/`hintButtonVisible`), so the button, its bubble notices and rings are all off on Vegas games. `useHint`: the Vegas-only `showClassicFallback` branch in `requestHint` removed (dead), `getHintFallbackNoticeText(board: Pick<GameState,'stock'>)` back to Standard wording only, comments updated. Kept: `stuckTextFor`/`warningTextFor` (game-end bubble), pass-aware `collectReachableWasteTops`/`canRecycle` in `usefulMoves.ts` (the game end needs them).
- [x] **F4.** DONE. `scoringPreference.description` (Off/Standard) + `vegasDescription` (Vegas) switched by value in `settings.tsx` (screen); Warnings copy ends "Vegas games end when you run out of useful moves."; `vegasTotalPreference` copy; `DescribedSwitchRow` "Keep Vegas total" (Vegas only) + expo-ui `Button` (outlined) "Reset Vegas total" (Vegas + switch on) with `Alert` confirm → `setVegasTotalOffset(useHistory().vegasTotal)`.
- [x] **F5.** DONE. `formatVegasScoreSpoken` (scoring.ts), `formatElapsedDurationSpoken` (utils/time.ts), `StatisticsRow.accessibilityLabel`, badge `View` is `accessible` with the label and `testID="stat-<label>"`. Jest: `statisticsHudBadge.test.ts` (labels, TOTAL), new `test/unit/utils/time.test.ts`.
- [x] **F6.** DONE. `scoresForGameRecord(state)` (no `solved`/`moveCount` args any more — every Vegas-rules game records `score.vegas`); untracked fallback in `recordCurrentGameResult` records a zero-move Vegas game; `useKlondikePersistence` won-repair spreads `scoresForGameRecord(persisted.state)`; `requestPlayDeal` prompts on a zero-move Vegas board. Jest `historyMoveLogRecord.test.ts`.
- [x] **F7.** DONE. Settings `statistics.vegasTotal` / `vegasTotalOffset` + `setVegasTotalEnabled` / `setVegasTotalOffset` + merge (`getInteger`); `?set=vegasTotal:on|off` (parser + launcher + devLog); `HistorySummary.vegasTotal` (native SQL `SUM(CASE WHEN status <> 'active' THEN vegas_score END)`, web stub 0, provider `EMPTY_HISTORY_SUMMARY` + context value `vegasTotal`); `boardEntryId` state from `useKlondikeHistoryEntry` (set in `recordStartedGame` and the hydration effect's linked/matchingActive branches); `useKlondikeGame` composes `vegasTotal = settled − offset + (boardRowSettled ? 0 : live)` and `buildStatisticsRows` shows TOTAL. Jest: `settingsScoring.test.ts`, `demoLinkParsing.test.ts`, `historyRepository.test.ts` (summary SQL against node:sqlite: finished rows summed, NULL and active rows ignored), `statisticsHudBadge.test.ts`.
- [x] **F8.** DONE. Skill: `?set=` row (`vegasTotal`, no Hint button, game-over text, every deal charged, seeds count), a11y matrix rows for the HUD badges and the reset button.
- [x] **F9.** GREEN 2026-10-13: `yarn typecheck` 0, `yarn lint` 0, `yarn jest` 42 suites / 455 tests.
- [x] **F10.** DONE (this section's status, files, learnings, issues, § Testing round 2 script). Device test: NOT run (separate testing agent, Android phone per the user).

## Files actually modified (round 2 — 2026-10-13, nothing staged or committed)

| File | Change |
| --- | --- |
| `src/solitaire/scoring.ts` | `formatVegasResultNotice` → "Game over — …" (+ false-end comment); `formatVegasScoreSpoken` |
| `src/utils/time.ts` | `formatElapsedDurationSpoken` |
| `src/features/klondike/components/StatisticsHud.tsx` | `StatisticsRow.accessibilityLabel`, badge `accessible` + `testID="stat-<label>"`, `vegasTotal` param → TOTAL badge |
| `src/features/klondike/hooks/useHint.ts` | Vegas hint branch removed from `requestHint`; `getHintFallbackNoticeText(Pick<'stock'>)`; comments |
| `src/features/klondike/hooks/useKlondikeGame.ts` | `hintButtonEnabled = setting && !state.vegasRules`; `useHistory()` entries + `vegasTotal`; `boardRowSettled` / `vegasTotal` composition; `setVegasTotalEnabled` to the launcher; `requestPlayDeal` prompts on a zero-move Vegas board |
| `src/features/klondike/hooks/useKlondikeHistoryEntry.ts` | `scoresForGameRecord(state)` charges every Vegas game; untracked fallback records zero-move Vegas games; `boardEntryId` state |
| `src/features/klondike/hooks/useKlondikePersistence.ts` | Won-session repair writes both scores |
| `src/features/klondike/hooks/useDemoGameLauncher.ts` | `?set=vegasTotal:` key, `setVegasTotalEnabled` prop |
| `src/state/settings.tsx` | `statistics.vegasTotal` / `vegasTotalOffset` + setters + merge (`getInteger`); `scoringPreference.description`/`vegasDescription`; Warnings copy; `vegasTotalPreference` |
| `app/(tabs)/settings.tsx` | Value-dependent Scoring description; Keep Vegas total switch; Reset Vegas total button + Alert (`useHistory().vegasTotal` → offset) |
| `src/storage/historyRepository.types.ts`, `.native.ts`, `.web.ts` | `HistorySummary.vegasTotal` (SQL SUM over finished rows; web 0) |
| `src/state/history.tsx` | `vegasTotal` in the empty summary + context value |
| `.agents/skills/soli-testing/SKILL.md` | `?set=` row (vegasTotal, no Hint button, game-over text, every deal charged), a11y matrix rows (HUD badges, reset button) |
| Tests | `scoring.test.ts`, `hintWarnings.test.tsx`, `hintOverlay.test.ts`, `statisticsHudBadge.test.ts`, `historyMoveLogRecord.test.ts`, `settingsScoring.test.ts`, `demoLinkParsing.test.ts`, `historyRepository.test.ts`; new `test/unit/utils/time.test.ts` |

## Simplifications / removals (round 2)

- Removed the Vegas-only classic-hint branch in `useHint.requestHint` and the Vegas slice of `getHintFallbackNoticeText` (dead once the button is hidden). Trade-off: re-enabling Vegas hints later means re-adding ~8 lines (the enumeration itself is still pass-aware for the game end).
- No `src/storage/vegasTotal.ts` kv module and no `sumVegasScoreSince(resetAt)` query: the settled sum rides on the existing summary query (refreshed after every write anyway) and the reset is one integer in the settings payload. Trade-off: the offset is a preference-store field holding data; dev-only history deletions after a reset shift the total.
- Reset row shows no number (it cannot see the live game); the bubble carries no total (the TOTAL badge does).
- `scoresForGameRecord` lost two parameters.

## Intermediary learnings (round 2)

- `currentGameEntryIdRef` is nulled the moment a result is recorded (so the next deal creates a fresh row) — anything that must know "which row is the board's game" across the win → Deal Again window needs its own sticky id (`boardEntryId`).
- In-memory history entries update synchronously (optimistic) while the SQL summary refreshes a few ms later; a derived number that mixes the two (settled sum + a per-row lookup) can be off for ~1 frame after a write. Accepted for the TOTAL badge; if it ever shows as a visible blink, compute the settled sum from `entries` for the loaded rows and SQL only for the rest.
- The won-session crash-repair path in `useKlondikePersistence` wrote no scores at all (pre-existing gap since v1) — fixed by spreading `scoresForGameRecord`.
- `requestPlayDeal`'s "nothing at stake" skip is now Vegas-aware; the other agent's refactor of that callback was kept intact (one condition changed).
- expo-ui universal `Button` (`label`, `variant`, `onPress`, `testID`) renders as a SwiftUI bordered button on iOS / Compose on Android inside a `FieldGroup.Section` — not device-verified in this round.

## Identified issues (round 2)

- (open, product) "Game over" can be a false end in rare cases (foundation dig, two-step rearrangement — § R1 analysis). Game stays playable; wording is one string. Karim to confirm or soften.
- (open, UX) A zero-move Vegas board now PROMPTS on Retry/shared-deal ("Your current game will end and be recorded as incomplete.") because $52 is at stake; New Game always prompted. If that feels like friction, drop the `!current.vegasRules` term in `requestPlayDeal`.
- (by design) Seeded history rows (`?seedHistory=default`) carry Vegas scores and count in the TOTAL while seeded; `=clear` removes them (and shifts a total reset taken while they were present).
- (by design) A game lost to a corrupted save is not charged (no tally to settle).
- (CLOSED 2026-10-13, Android) Outlined `Button` renders as a pill-shaped outlined Compose button, left-aligned in its own card row under the Keep Vegas total switch (`p2r2-android-07-settings-vegas-total-reset-button.png`). Badge a11y: one accessible group node per badge carrying the spoken label (`Vegas, minus 52 dollars` / `Total, minus 307 dollars` / `Moves, 35` / `Time, 1 minute 36 seconds`); real TalkBack output not exercised. TOTAL width: −$359 uses ≈140 px of the 252 px (96 dp) badge, so a four-digit total should fit — NOT reached on device (would cost ~14 junk history rows on Karim's phone); the badge has only a min width, so it would grow rather than clip.
- (open, test side-effect) The round-2 device test tapped "Reset Vegas total" on Karim's phone: `vegasTotalOffset` is now the settled sum at 20:44 (his TOTAL under Keep Vegas total would read ≈ −$359 instead of ≈ +$727 + later games). Keep Vegas total was left OFF as found; a second Reset makes the total start over from the current game if the old number was never wanted anyway.
- (observation, not scoring) Fresh deals start with the first draw already made (Draw 1: "Stock, 23 cards" + a waste card at MOVES 0; Draw 3: 21 cards) — pre-existing auto-first-draw behaviour, noted so pass counts in device scripts are 7 taps for the first Draw-3 pass, 8 afterwards.

## Testing (round 2) — device script for the testing sub-agent

Read `.agents/skills/soli-testing/SKILL.md` first. Android phone (connected via adb per the user); one device; no video. Exact strings are what the build renders — report any mismatch verbatim. Record the phone model/width. Restore settings at the end (`?set=scoring:off,vegasTotal:off,hintButton:off,drawCount:1,solvableOnly:on,warnings:stuck`). Test games become real history rows on Karim's phone — do not delete anything; `?seedHistory=clear` only if you seeded.

1. **Settings note.** Settings → New Games → Scoring. With Off or Standard selected the description reads exactly `Standard points, or Vegas for dollars under casino rules. Applies to your next game.` Pick Vegas → the description switches to `Casino rules from your next game: $52 to play, $5 back per card on a foundation, limited passes. No hints, no guaranteed wins.` and a new row **Keep Vegas total** (`Carry your winnings and losses from game to game.`, switch off) appears under it; no reset button yet. Gameplay → Warnings description ends with `Vegas games end when you run out of useful moves.` Check nothing is truncated and the rows look like their neighbours (screenshot).
2. **Hint button hidden on Vegas games.** `soli://?set=hintButton:on,scoring:standard` then `?reset=game`: the dock shows the Hint button on this Standard game. `?set=scoring:vegas` (no reset): the button STAYS (Standard game in progress). `?reset=game` (now a Vegas deal): the Hint button is GONE from the dock (Undo pill behaviour unchanged). `?set=scoring:standard` on this Vegas game: still no button. Back: `?set=scoring:vegas`.
3. **Badge a11y labels.** On the Vegas game read the header a11y tree: three nodes `Vegas, minus 52 dollars` / `Moves, 0` / `Time, 0 seconds` (one node per badge; the raw "−$52" / "0:00" strings are NOT separate nodes). Play one foundation card → `Vegas, minus 47 dollars`; after the timer runs e.g. `Time, 1 minute 5 seconds`. On a Standard game the first node reads `Score, N`.
4. **Game over text.** `soli://?set=drawCount:3` then `?deal=E1_3wg0zvd1izdp5860yamwkszzaj908rw031kavl52rtlu&draw=3` (Scoring = Vegas; fixture from P2-D): tap through all three passes without playing, then play A♦ (column 7) to its foundation → persistent bubble **`Game over — result −$47. Undo or deal again.`** (U+2212, no plus), announced for a11y, no modal, board still responds. Undo → bubble gone, `−$52`. No `[solver]` log line at any point.
5. **Cumulative — zero-move new game and abandon.** `soli://?set=vegasTotal:on` → the badge label becomes **TOTAL** (value = all finished Vegas rows on this phone − nothing, plus −$52 live; note the starting value T0). Settings → New Games now also shows the **Reset Vegas total** button. Tap it → Alert `Reset Vegas total?` / `Your total starts over from the current game.` / Cancel / Reset → Reset → TOTAL reads **−$52** (the live game only). Drawer → New Game → Deal Again WITHOUT any move → TOTAL reads **−$104** (the abandoned zero-move deal cost $52; the new deal's −$52 is live). History: the abandoned row shows `Vegas −$52`.
6. **Cumulative — abandon with moves, retry.** Play one foundation card (TOTAL −$99), New Game → Deal Again → TOTAL **−$151**. History → open the row of the −$47 game → **Retry this deal** → confirmation → Retry → TOTAL **−$203** (the current zero-move deal was charged; the retried deal starts at −$52 live). A zero-move Vegas board on Retry DOES prompt (`Your current game will end and be recorded as incomplete.`).
7. **Cumulative — win.** Vegas needs a REAL win (`?demo=nearwin` is an unlimited fixture → it shows SCORE, not TOTAL — expected). If a Vegas deal can be won in reasonable time (Draw 1 Vegas + `?set=solvableOnly:off` is random; try a few `?reset=game` deals, otherwise skip and say so): note TOTAL right before the winning move; the winning move changes it by exactly **+$5** (like every foundation card) and it then STAYS at that value through the celebration and the "Nice win!" alert (no jump by ±$208/$260 = no double count); after Deal Again the new deal reads that value **− $52**.
8. **Cumulative — switch off/on, kill and relaunch.** `?set=vegasTotal:off` → badge back to **VEGAS −$52** (per game). `?set=vegasTotal:on` → TOTAL returns with the same value as before switching off. Force-stop + relaunch → TOTAL unchanged (settled sum + live), Undo still works.
9. **Reset on a won board (if step 7 ran).** Settings → Reset Vegas total while the won board is still showing → TOTAL reads **$0**; Deal Again → **−$52**.
10. **Unchanged Standard/Off.** `?set=scoring:standard,vegasTotal:on` + `?reset=game` → SCORE badge (never TOTAL), Hint button present if on, stuck warning still says "No more useful moves — undo or start a new game." with the `[solver] source=auto` line; `?set=scoring:off` → MOVES/TIME only; badges still carry `Moves, N` / `Time, …` labels (the only behaviour change outside Vegas).
11. **Regression.** Warnings picker and Scoring picker still update their label after a pick (Android `key={value}` workaround); Keep Vegas total row disappears when Scoring leaves Vegas; the Reset button disappears when the switch is off.

### Device test results (round 2) — 2026-10-13, testing sub-agent

**Android phone Nothing A065 (1080×2412 @ 420 dpi ≈ 411 dp), Release APK versionCode 16 via `yarn release` (1:20 incremental).** Driven with agent-device (session `p2r2`, Android labels) + `yarn deeplink … --serial 192.168.1.12:5555` + `adb input tap` on the stock; `[solver]`/`[SoliDev]` lines captured with a filtered `adb logcat`. Gates before the run: typecheck 0, lint 0, jest 42 suites / 455 tests. Screenshots in `docs/product/scoring/screenshots/` (prefix `p2r2-android-`). Fixture: `?deal=E1_3wg0zvd1izdp5860yamwkszzaj908rw031kavl52rtlu&draw=3`.

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Settings note: Off/Standard description `Standard points, or Vegas for dollars under casino rules. Applies to your next game.`; Vegas → `Casino rules from your next game: $52 to play, $5 back per card on a foundation, limited passes. No hints, no guaranteed wins.` + Keep Vegas total row (`Carry your winnings and losses from game to game.`, off), no Reset button; Warnings ends with `Vegas games end when you run out of useful moves.`; nothing truncated | PASS | tree labels exact; `p2r2-android-00-settings-as-found.png` (Vegas), `p2r2-android-01-settings-standard.png` (Standard, row gone) |
| 2 | Hint button: Standard game → `Hint` present; `?set=scoring:vegas` → still present; `?reset=game` (Vegas deal) → gone; `?set=scoring:standard` on that Vegas game → still gone | PASS | tree: `Hint` node present/absent as expected in all four states |
| 3 | Badge a11y: one group node per badge `Vegas, minus 52 dollars` / `Moves, 0` / `Time, 0 seconds`; after A♦ `Vegas, minus 47 dollars`; Standard → `Score, 0`; `Total, minus 307 dollars`; `Time, 1 minute 36 seconds` | PASS | raw tree; each badge 252 px (96 dp), three fit in 1080 px (`p2r2-android-02-vegas-fresh-deal-hud.png`) |
| 4 | Game over: fixture Draw 3, all passes tapped, A♦ → foundation → node `Game over — result −$47. Undo or deal again.` (U+2212, no plus), badge −$47, board responsive; Undo → bubble gone, −$52; **0 `[solver]` lines** over the whole Vegas run | PASS | `p2r2-android-06-game-over-bubble.png`; logcat count 0 until the Standard unwinnable check in #10 |
| P2-D 3/4/7 | Pass-limit basics on Android: pass 1 (7 taps) → `Recycle waste into stock, 2 left` with caption "2 left"; pass 2 → "1 left"; pass 3 → `Stock, no passes left` [disabled], ⊘ mark, no caption; two refused taps leave MOVES 25; Undo undoes the draw (`Stock, 3 cards`), 8 more undos → "1 left" again (pass given back); replay → ⊘. Draw 1 Vegas: ⊘ after 23 taps, never a caption, no Hint | PASS | `p2r2-android-03-recycle-2-left.png`, `-04-recycle-1-left.png`, `-05-stock-exhausted.png`, `-12-draw1-exhausted.png` — caption centred with room to spare at 411 dp |
| 5 | Cumulative: `?set=vegasTotal:on` → `Total, 727 dollars` (T0, settled rows on the phone + live −52); Reset button appears; Alert `Reset Vegas total?` / `Your total starts over from the current game.` / CANCEL / RESET → TOTAL **−$52**; Deal Again (fixture, 0 foundation cards) → **−$104**; zero-move New Game → Deal Again → **−$156**; History rows `Vegas −$52` | PASS | `p2r2-android-07-settings-vegas-total-reset-button.png`, `-08-reset-alert.png`, `-09-history-vegas-rows.png` |
| 6 | `?deal=` fixture (abandons the zero-move deal) → **−$208**; A♦ → **−$203**; New Game → **−$255**; History → −$47 row → Retry this deal → prompt `Retry this deal?` / `Your current game will end and be recorded as incomplete.` on the zero-move Vegas board → RETRY → **−$307** | PASS | `p2r2-android-10-retry-prompt.png`; arithmetic exact at every step |
| 7 | Cumulative win: +$5 on the winning move, no ±$208 jump, Deal Again = value − $52 | NOT RUN | no cheap way to win a Vegas deal on device (fixtures are unlimited games); the once-only settlement is covered by the deal-path audit + jest |
| 8 | `?set=vegasTotal:off` → `Vegas, minus 52 dollars`; on → `Total, minus 307 dollars`; A♦ → −$302; `am force-stop` + relaunch → −$302 (no double charge); Undo → −$307 | PASS | `p2r2-android-11-total-badge-hud.png` |
| 9 | Reset on a won board | NOT RUN | depends on #7 |
| 10 | `?set=scoring:standard,vegasTotal:on,warnings:unwinnable` + reset → `Score, 0` (never TOTAL), `Hint` present; two stock taps → `[solver] source=auto status=solved …` logged (solver still used on Standard games); `?set=scoring:off` → only `Moves, 2` / `Time, 12 seconds` nodes | PASS | logcat; tree |
| 11 | Scoring picker label refreshes (Vegas → Standard); Warnings picker refreshes (→ Unwinnable game → No more useful moves); Keep Vegas total row gone under Standard; Reset button gone with the switch off and back after toggling the switch in the UI | PASS | tree after each pick |
| P2-D 10 | History under Standard: Vegas rows `Score 0` / `Score 15`; under Off: no segment; under Vegas: Standard-rules row `K0ND-CZLM … Draw 3 · Solvable` shows no Vegas segment | PASS | tree dumps |
| P2-D 11 | Kill + relaunch inside the Draw-1 exhausted era → `Stock, no passes left`, TOTAL −$359, MOVES 23 restored | PASS | tree |

Settings restored to AS FOUND (not the plan's "Scoring Off" — Karim had Vegas selected himself): Draw 1, Solvable deals on, Scoring **Vegas**, Keep Vegas total off, Auto Up on, Hint button on, Warnings "No more useful moves", developer mode left on. Side-effect: `vegasTotalOffset` changed by the Reset tap (Identified issues). Screen-off timeout restored to 60 s; `/tmp/android-device.lock` removed; agent-device session closed.

History rows left on the phone (all today, nothing deleted, nothing seeded): Karim's own Standard game (58 moves, Score 15) recorded incomplete at 20:36 by the first `?reset=game`; a zero-move Standard deal 20:36; `ZPYB-6IOK` 20:37 (0 moves, Vegas −$52, Draw 1); `VL52-RTLU` 20:39 (35 moves, Vegas −$52); `IMKS-Q6GO` 20:45 (0 moves, −$52); `C9TL-61HJ` 20:46 (0 moves, −$52); `VL52-RTLU` 20:46 (1 move, −$47); `LJOM-IEYD` 20:46 (0 moves, −$52); `VL52-RTLU` 20:47 (1 move, −$52, retried); `K0ND-CZLM` 20:49 (2 moves, Standard, Solvable); `TRY4-QMKP` 20:49 ACTIVE on the board (Draw 1 Vegas, stock exhausted, 23 moves).

Shared-machine notes: `yarn release` killed the other session's retained agent-device iOS XCTest runner (pid 88748) as a "competing build process" — the script's standard behaviour. Wireless adb dropped once mid-run and the phone dozed (60 s timeout); `ANDROID_SERIAL=192.168.1.12:5555 scripts/android-ready.sh --keep-awake` fixed both. The phone is listed twice in adb (wifi pin + mDNS TLS), so `yarn deeplink` and the ready script need `--serial` / `ANDROID_SERIAL`. A `snapshot --raw` renumbers the refs — a following `press @eN` from the earlier `-i` snapshot hit the launcher's Home button once (recovered with `am start`).

---

# Phase 2 round 3: no game end in Vegas, New Game in the dock, shorter copy, Vegas fixtures (prompt 6, 2026-10-13)

Status: IMPLEMENTED 2026-10-13 (implementation sub-agent), cheap gates green (43 suites / 455 tests), device test round 3 DONE 2026-10-13 on Android phone + iOS simulator (all checks pass; one display bug → G8, FIXED 2026-10-13 and re-checked on the Android phone, see § Identified issues (round 3) and § Device test results (G8 fix)). Nothing staged or committed. Another agent (retry-and-share-deal) edits `useKlondikeGame.ts` concurrently — edits here were merged on top of its version.

## Decisions (user, prompt 6) and how they land

| # | Topic | Decision | Replaces |
| --- | --- | --- | --- |
| R8 | Vegas game end | **No game-end detection at all** in Vegas-rules games: no "Game over" bubble, no "no more useful moves" bubble, no unwinnable warning. The player decides when they are done. Reason: the heuristic end could fire early without the solver (R1 analysis), the user prefers to decide, and the code gets simpler. ONE gate in `useHint`: a Vegas-rules game runs with warning mode `'off'` (the Hint button is already hidden by the caller). Deleted: the Vegas direct-fire path, the effective-warning-mode mapping, `formatVegasResultNotice`, the pass-aware `recycleAvailable` parameter of `collectReachableWasteTops` + the `stockPasses`/`vegasRules` fields of `UsefulMoveBoard` (nothing reads them any more), their tests, the Vegas sentence in the Warnings description. Kept: solver never runs for Vegas games, Hint button hidden, pass limit enforcement + ⊘ mark. | R1, AC 7, P2-B B1/B2/B3 |
| R9 | New Game in the free dock slot | On a Vegas-rules game, once the stock is empty and no pass is left (`stock.length === 0 && recyclesLeft === 0` — the ⊘ state, plus the stock+waste-empty case where there is nothing left to draw either), the dock shows a **New Game** button where the Hint button normally sits. It calls the existing `requestNewGame({ reason: 'manual' })` (same "Start a new game?" confirmation as the header button — no second flow). Undo back to a state with stock cards or a pass left hides it again. After a Vegas win the dock is hidden as before (win alert handles it). Redundancy: the header already shows "New Game" on every board — reported, implemented as asked. a11y label `New Game`, testID `new-game-button`. | — |
| R10 | Settings copy | Vegas-selected Scoring description no longer explains Vegas: `Hints, warnings and solvable deals are off in Vegas. Applies to your next game.`; Off/Standard: `Standard points or Vegas dollars. Applies to your next game.`; Warnings: Vegas sentence dropped. **Keep/Reset Vegas total: the user asked to EXPLAIN BETTER (not shorter)** → clearer copy (see Final UI strings). | R3 strings |
| R11 | Vegas fixtures | Three `?demo=` fixtures, also in the Demo sheet (Fixtures row), all `vegasRules: true`: `vegas` (fresh Draw-3 deal with A♦ playable), `vegaslastpass&left=N` (Draw 3, two recycles used, N taps before the stock is exhausted), `vegasnearwin&left=N` (Draw 1 solution folded under unlimited rules then flagged Vegas — see Intermediary learnings). They are charged like real deals: the hydration effect creates an active row, game end writes `vegas_score` (so a win adds $208 once and Deal Again charges the next deal once if Scoring = Vegas). | skill caveat "every fixture is unlimited" |
| R12 | Retry/shared confirmation on an untouched Vegas board | Unchanged (kept). | — |

## Acceptance Criteria (round 3)

1. In a Vegas-rules game no bubble of any kind appears — not at the end of the stock, not when stuck, not in warning mode "Unwinnable game"; no `[solver]` log line. Standard/Off games are unchanged (solver-backed warnings + hints as before).
2. Dock: New Game button visible exactly while `vegasRules && stock empty && recyclesLeft === 0` (and the board is not won/celebrating); tapping it opens the existing "Start a new game?" alert; Undo past the last draw/recycle hides it; a Standard game never shows it.
3. Hint button hidden on Vegas-rules games, present on Standard games with the setting on (unchanged).
4. Settings strings exactly as listed under "Final UI strings (round 3)".
5. Fixtures reachable via deep link and the Demo sheet; `vegasnearwin` wins with the remaining move(s) and records `Vegas $208`; `vegaslastpass` shows ⊘ + New Game after `left` taps; `vegas` starts at `VEGAS −$52` with A♦ playable and "2 left" after the first pass.
6. `yarn typecheck && yarn lint && yarn jest` green.

## Steps (round 3)

- [x] **G1.** DONE. Plan upkeep before coding (prompt, decisions, AC) — this section.
- [x] **G2.** DONE. `useHint`: `warningMode = state.vegasRules ? 'off' : setting` is the only Vegas logic left (comment records why); `stuckTextFor`/`StuckTextBoard`, the Vegas `fireWarning` branch and the board argument of `warningTextFor` removed. `scoring.ts`: `formatVegasResultNotice` removed (note left). `usefulMoves.ts`: `recycleAvailable` parameter, `canRecycle` import and the `stockPasses`/`vegasRules` fields of `UsefulMoveBoard` removed (unlimited recycles assumed again; comment says why that is safe). Warnings description: Vegas sentence dropped. Tests: `hintWarnings.test.tsx` Vegas describe replaced by "no evaluation, no bubble in either mode" + a Standard control case; `usefulMoves.test.ts` pass-aware blocks removed; `scoring.test.ts` notice test removed.
- [x] **G3.** DONE. `UndoScrubber`: shared `DockActionButton` (Hint + New Game pills, same `dockActionButton` style), props `newGameButtonVisible`/`onNewGamePress`; `useKlondikeGame`: `vegasNewGameButtonVisible = vegasRules && !hasWon && !celebrationState && stock.length === 0 && recyclesLeft === 0`, `requestNewGameFromDock` → `requestNewGame({ reason: 'manual' })`. Skill handle table: `New Game` / `new-game-button` (+ Hint and header rows).
- [x] **G4.** DONE. Strings below.
- [x] **G5.** DONE. `demoReplay.ts`: `VEGAS_FIXTURE_EXACT_ID`, `createVegasDealGameState`, `createVegasLastPassGameState(tapsLeft)` + `resolveVegasLastPassTapsLeft`, `createVegasNearWinGameState(movesLeft)`; launcher: modes `vegas|vegaslastpass|vegasnearwin` (`createDemoFixtureState` switch replaces the scrubbed/nearwin ternary), `&left=N`; Demo sheet second Fixtures row; `yarn vegas [deal|lastpass|nearwin] [left]` (cold); skill catalog/caveat/shortcut rows; new `test/unit/solitaire/demoReplay.vegas.test.ts`.
- [x] **G6.** GREEN 2026-10-13: `yarn typecheck` 0, `yarn lint` 0, `yarn jest` 43 suites / 455 tests.
- [x] **G7.** DONE (this section). Device test round 3: DONE 2026-10-13 (testing sub-agent) — results table below; bug G8 open.
- [x] **G8.** FIXED 2026-10-13 (fix sub-agent): TOTAL badge double-counted a win recorded during hydration (auto-complete on relaunch). Root cause + fix in § Identified issues (round 3) and § Intermediary learnings (round 3, G8). Two regression tests (`historyEntryBoardRow.test.tsx`, `history.lateUpdate.test.tsx`), both red before the fix. Gates green (45 suites / 458 tests). Device check: see § Device test results (G8 fix).

## Final UI strings (round 3, verbatim)

- Scoring description, Off/Standard selected: `Standard points or Vegas dollars. Applies to your next game.`
- Scoring description, Vegas selected: `Hints, warnings and solvable deals are off in Vegas. Applies to your next game.`
- Warnings description: `Warn when you run out of useful moves, or as soon as the game can't be won anymore.`
- Keep Vegas total row: label `Keep Vegas total`, description `Carry your balance from game to game. The header then shows your running total instead of this game’s result.` (user asked to explain better, so this got LONGER, not shorter)
- Reset row: button `Reset Vegas total`; Alert title `Reset Vegas total?`, message `Your running total starts again from $0. The game on the board still counts.`, buttons Cancel / Reset.
- Dock New Game pill: text + a11y label `New Game`, testID `new-game-button` (Hint pill unchanged: `Hint` / `hint-button`). Tapping it opens the existing alert `Start a new game?` / `Ready for another round?` / Cancel / Deal Again.
- No Vegas bubble text exists any more. Standard bubbles unchanged (`No more useful moves — undo or start a new game.`, `No winning moves left — undo or start a new game.`, `No hint found.`).
- HUD badge labels unchanged (round 2).

## Files actually modified (round 3 — 2026-10-13, nothing staged or committed)

| File | Change |
| --- | --- |
| `src/features/klondike/hooks/useHint.ts` | Single Vegas gate (`warningMode 'off'`), Vegas branches/text helpers removed (−≈35 lines) |
| `src/solitaire/scoring.ts` | `formatVegasResultNotice` removed (−12), header comment |
| `src/solitaire/usefulMoves.ts` | Pass-aware parameter/fields/import removed (−≈15), header comment |
| `src/state/settings.tsx` | Scoring / Warnings / Vegas-total copy + comments |
| `app/(tabs)/settings.tsx` | Comment only |
| `src/features/klondike/components/UndoScrubber.tsx` | `DockActionButton`, New Game pill props, `hintButton` style → `dockActionButton` |
| `src/features/klondike/hooks/useKlondikeGame.ts` | `vegasNewGameButtonVisible`, `requestNewGameFromDock`, dock props (merged on top of the retry-and-share-deal agent's version) |
| `src/solitaire/demoReplay.ts` | Three Vegas fixture factories (+≈85) |
| `src/features/klondike/hooks/useDemoGameLauncher.ts` | `DemoLaunchMode` ×3, `vegasLastPassTapsLeft`, `createDemoFixtureState`, `?demo=vegas*` links |
| `app/(tabs)/index.tsx` | Demo sheet: second Fixtures row (Vegas deal / Vegas last pass / Vegas near win) |
| `scripts/deeplink.js`, `package.json` | `yarn vegas [deal\|lastpass\|nearwin] [left]` shortcut (cold) |
| `.agents/skills/soli-testing/SKILL.md` | Decision tree, catalog row, `?set=` row text, shortcut row, caveat, handle rows |
| Tests | `hintWarnings.test.tsx` (Vegas block rewritten, −≈55), `usefulMoves.test.ts` (−≈70), `scoring.test.ts` (−8); new `demoReplay.vegas.test.ts` (+≈100) |

Net: ≈ −200 lines of Vegas game-end code/tests removed, ≈ +300 added for the dock button and the fixtures (most of it fixture + test code).

### Files modified for the G8 fix (2026-10-13, fix sub-agent, nothing staged or committed)

| File | Change |
| --- | --- |
| `src/features/klondike/hooks/useKlondikeHistoryEntry.ts` | `recordCurrentGameResult` publishes the written row as `boardEntryId` in all three branches (tracked ref, in-memory active match, async fallback — the latter only while no newer deal has been linked); invariant comment on the result type |
| `src/state/history.tsx` | `updateEntry` DB-only branch: after the write, replace the row in the loaded page if it paged in meanwhile (stale copy loaded by the initial page read) |
| `src/features/klondike/hooks/useKlondikeGame.ts` | Comment only (invariant on `boardRowSettled`) — merged on top of the retry-and-share-deal agent's version |
| `app/(tabs)/index.tsx` | Demo sheet Fixtures row 2 labels: `Vegas deal` / `Last pass` / `Near win $` (were truncating) |
| `test/unit/features/klondike/historyEntryBoardRow.test.tsx` (new) | Hook harness (react-test-renderer + mocked `useHistory`): win written before history hydration → `boardEntryId` = the scored row; lost-link abandon → links the matched active row |
| `test/unit/state/history.lateUpdate.test.tsx` (new) | `HistoryProvider` with a mocked repository: `updateEntry` queued before `initializeHistoryRepository` resolves → the loaded stale row is replaced by the updated one |

## Intermediary learnings (round 3)

- No playlist entry can be folded under Vegas rules: all 20 Lonelybot solutions are Draw 1 and recycle (entry 0 ten times; the first refused recycle breaks every fold at step 25–39). A Vegas near-win fixture therefore flags an unlimited fold as Vegas (snapshot + every history snapshot) and clears the move log; its `stockPasses` (10) exceeds the Draw-1 limit, which only means `recyclesLeft` reads 0 (⊘ when the stock is empty — at `left=1` the last card is in the waste, so the ⊘ mark AND the dock New Game pill are visible next to the winning move; expected).
- `UsefulMoveBoard` is a `Pick` of `GameSnapshot`, so dropping fields from it needed no caller changes — `findFirstUsefulMove(fullState)` still type-checks.
- A dead era can never exist on a Vegas game now (mode `'off'` short-circuits the evaluation effect and the render gate), so no era-clearing on the Standard→Vegas deal transition is needed beyond the existing exactId check.
- The deep-link family for fixtures grows per mode (`demoRequestsScrubbed`, `…NearWin`, now `vegasDemoMode`); a table-driven parser would be the next simplification if a fourth family appears.
- **G8 (TOTAL double count) — root cause.** The auto-queue wins the relaunched near-win board ~35 ms after `HYDRATE_STATE` (`AUTO_QUEUE_MOVE_DELAY_MS`), typically BEFORE history hydration (SQLite migrations + three queries) has finished. Two things then went wrong: (1) the hydration effect in `useKlondikeHistoryEntry` is the only place that linked `boardEntryId` for a hydrated game, and it bails on `hasWon` — so the win was written via the tracked `currentGameEntryIdRef` (data correct) but the scored row stayed unlinked → `boardRowSettled` false → settled sum + live $208; (2) `updateEntry` on a row that is not loaded yet takes the DB-only branch, while the provider's initial page read runs BEFORE queued writes (`queueRepositoryTask` awaits `ready`) — so the page loaded the stale 'active'/unscored copy and nothing ever replaced it (the History tab would have shown an active row too). Fix: the write itself publishes `boardEntryId` ("whichever row receives the result is the board's row"), and the DB-only update replaces the row in the loaded page once the write lands. Deriving the settled-ness from the SQL sum itself was considered (e.g. the summary returning the id of its newest settled Vegas row) and rejected: seeded/older rows can be newer than the board's row by `startedAt`, and it adds a query column for a display check — the in-memory row IS the sum's data, one queue task ahead of it.
- **G8 — sibling cases walked through** (all land on the same two paths): a real saved game one move from a win + Auto Up on hydrates identically to the fixture (replay path → same `HYDRATE_STATE` + auto-queue) → covered; a win recorded normally then relaunch → persisted `status: 'won'` → crash-repair no-op (row already solved) → fresh deal → `recordStartedGame` links the new row; the won-session crash-repair itself (`useKlondikePersistence`) is an `updateEntry` of a row that may not be loaded → fix (2) keeps its copy current, then the fresh deal links its own row; relaunch on an in-progress Vegas game → hydration effect links the active row (unscored → live added) → later result write hits the tracked branch → linked; async fallback (active row paged out) → `publishBoardRow` only while no newer deal has been linked (`currentGameEntryIdRef` null), so a late completion cannot steal the next deal's link.
- **Not removed: the ~1-frame "off by one game" window** after a normal result write (in-memory row settles synchronously, the SQL sum one queue task later). Removing it would need an optimistic summary delta in `recordResult`/`updateEntry` (a second, transient source for the sum) — not worth it: the round-3 device test saw no visible jump even through the win alert.
- `mergeHistoryEntries` prefers the CURRENT copy on id collisions (pagination semantics), so a stale loaded row cannot be refreshed by merging — the DB-only update path replaces by id explicitly.

## Identified issues (round 3)

- (reported, by design) The header already shows "New Game" on every board (Android: button text `New Game`; iOS: `Start a new game`), so the dock pill is a second entry point to the same `requestNewGame`. Implemented as asked; dropping either later is a two-line change.
- (by design) The dock pill condition is `stock empty && no pass left` — a superset of the ⊘ mark (which also needs a non-empty waste): with stock AND waste empty there is nothing to draw either, and hiding the pill because the player played out the waste would be odd.
- (by design) `vegasnearwin` loses its undo depth on kill + relaunch (snapshot fallback) and its history row stores a NULL move log.
- (open, product) Keep/Reset Vegas total copy is now longer and more explicit; the orchestrator's brief said "shorten", the user's prompt said "explain better" — went with the user. Karim to confirm the wording.
- (unchanged, round 2) Zero-move Vegas boards prompt on Retry / shared deal.
- **(FIXED 2026-10-13, G8 — was: BUG, device test 2026-10-13, both platforms) TOTAL badge double-counts a win that happens during hydration.** Fix + root cause in § Intermediary learnings (round 3, G8); device re-check in § Device test results (G8 fix). Original report: Repro: `?set=scoring:vegas,vegasTotal:on`, Auto Up ON (default), `yarn vegas nearwin`, note TOTAL (iOS −$359 / Android −$220), kill + relaunch. Hydration takes the snapshot fallback, auto-complete plays the last card ("[Game] hasWon set true (moves=244)" right after "Hydrating saved in-progress session"), celebration + forced alert. Expected TOTAL = old + $5 (iOS −$354 / Android −$215). Actual −$146 / −$7 = old + $5 + $208: the won row is settled in the SQL sum AND the live $208 tally is still added (`boardRowSettled` false — the win is recorded before `boardEntryId` is linked by the hydration effect). Data is correct: History shows exactly one `Vegas $208` row per win and Deal Again shows the right total (iOS −$406 = settled −$354 − $52). Display only, until Deal Again. Screenshot `p2r3-ios-05-nearwin-relaunch-autowin-total.png`. Likely also reachable with a real saved game one move from a win + Auto Up on (replay path hydrates the same way) — not verified.
- (closed 2026-10-13, unreachable in production — G8 sub-agent, few-minute check per the orchestrator) The blank Scoring label is the documented Expo UI 57 universal Picker bug (hints plan item 2b, `PickerPreference.tsx` `key={value}` comment, expo-ui guide "Android screen lifecycle fix"). The ONLY writer of `scoring` outside the Settings screen is the dev deep link (`useDemoGameLauncher` → `setScoringMode`); a real user changes it only via the picker, which the keyed remount handles (device-verified). The dev-link case remounts the picker while the Settings drawer screen is mounted-but-detached, so the Compose TextField's one-time label seed never runs until a relaunch. Nothing changed; finding recorded next to item 2b in the hints plan. Original observation: After `?set=scoring:vegas…` the Settings Scoring picker shows a BLANK value although the description and the Keep Vegas total row already reflect Vegas (`p2r3-android-05-reset-alert.png`, `p2r3-android-07-settings-restored.png`); after a force-stop + relaunch it reads "Vegas" again (`p2r3-android-09-settings-after-relaunch.png`). Same class as the fixed-by-`key={value}` stale-label issue (commit d3c21ec), but triggered by a value change from outside the picker; UI picks still refresh correctly (round 2 #11). Not seen for `scoring:standard`.
- (FIXED 2026-10-13 with G8) Demo sheet Fixtures row 2 truncated to "Vegas last …" / "Vegas near …" at 402 pt (iOS) and 411 dp (Android) — labels are now `Vegas deal` / `Last pass` / `Near win $`.
- (cosmetic, Android) At the default detent the sheet's Testing row sits under the bottom edge (`p2r3-android-06-demo-sheet.png`); a swipe up expands the sheet and shows everything (`p2r3-android-08-demo-sheet-scrolled.png`). Was already tight before the extra row.
- (pre-existing, iOS) The Warnings description renders on ONE line with an ellipsis ("Warn when you run out of useful moves, or as soon as…") while the Scoring / Keep Vegas total descriptions wrap — identical in the P2-D screenshot `p2-ios-01-settings-new-games.png`, so not a round-3 regression. The a11y text is complete. Android wraps it fully.
- (noted, by design) On relaunch the fixture's `autoUpEnabled: false` is live-only state and is NOT persisted, so with the Auto Up setting on the near-win fixture wins itself at hydration (that is what exposed the bug above).

## Testing (round 3) — device script for the testing sub-agent

Read `.agents/skills/soli-testing/SKILL.md` first. Android phone first, then the iOS simulator (one device per agent; no video). Exact strings are what the build renders — report any mismatch verbatim. Test games become real history rows; do not delete anything. Restore settings at the end to what you found (read them from Settings before starting).

1. **No bubble in Vegas, ever.** `soli://?set=scoring:vegas,warnings:stuck,hintButton:on` then `yarn vegas lastpass` (cold). Board: `VEGAS −$52` (or `TOTAL …` if Keep Vegas total is on), stock has ≤ 3 cards, no Hint button in the dock, no bubble. Tap the stock once → ⊘ `Stock, no passes left` [disabled]; still NO bubble, no announcement, no `[solver]` log line. Play A♦ (column 7) to its foundation → `−$47`, still no bubble. `?set=warnings:unwinnable` (no reset) → still nothing. Screenshot.
2. **New Game pill.** In the state of step 1 the dock shows a white pill **New Game** (a11y `New Game`, testID `new-game-button`) in the left half, next to Undo; it was NOT there while the stock still had cards. Tap Undo (A♦ back) → pill still there (stock still exhausted); tap Undo again (the last draw comes back, stock 3 cards) → pill GONE. Redo/draw again → pill back. Tap the pill → alert `Start a new game?` / `Ready for another round?` / Cancel / Deal Again; Cancel keeps the board; Deal Again deals (Vegas, since Scoring = Vegas; the old game's row shows `Vegas −$52` or `−$47`).
3. **Captions on the way back.** From `yarn vegas lastpass`, scrub/undo back ~9 moves → recycle card with caption `1 left` (`Recycle waste into stock, 1 left`); further back → `2 left`. Redo forward to the end.
4. **Hint button.** `?set=scoring:standard` then `?reset=game` → Standard game: `Hint` pill present, SCORE badge; tap Hint → ring or "No hint found."; stuck warning still works as before (play the stock out until the heuristic + `[solver] source=auto` line fire the bubble `No more useful moves — undo or start a new game.`). `?set=scoring:vegas` + `?reset=game` → no Hint pill, no New Game pill yet (stock has cards).
5. **Settings copy.** Settings → New Games → Scoring: with Off/Standard `Standard points or Vegas dollars. Applies to your next game.`; with Vegas `Hints, warnings and solvable deals are off in Vegas. Applies to your next game.`; Keep Vegas total description `Carry your balance from game to game. The header then shows your running total instead of this game’s result.`; Gameplay → Warnings `Warn when you run out of useful moves, or as soon as the game can't be won anymore.` (no Vegas sentence). Reset Vegas total (switch on) → alert `Reset Vegas total?` / `Your running total starts again from $0. The game on the board still counts.` — Cancel (do NOT reset on Karim's phone unless step 7 needs it; on the simulator reset freely). Nothing truncated; screenshot.
6. **Vegas win via fixture, cumulative total, single charge.** `?set=scoring:vegas,vegasTotal:on` then `yarn vegas nearwin` (cold). Note TOTAL T0 (settled rows − offset + live $203). Play the last card (waste → foundation) → celebration + `Nice win!` alert; TOTAL = T0 + $5 and STAYS there through the alert (no ±$208 jump). Deal Again → new Vegas deal reads T0 + 5 − 52. History: the fixture row shows `Vegas $208`, Solved. `?set=vegasTotal:off` → `VEGAS −$52`; on again → the same total.
7. **Reset on a won board** (simulator only, or with Karim's OK): win via `yarn vegas nearwin`, then Settings → Reset Vegas total → Reset → TOTAL reads `$0`; Deal Again → `−$52`.
8. **Fresh Vegas fixture.** `yarn vegas` (cold): Draw-3 Vegas deal, `VEGAS −$52`, `Stock, 21 cards`, A♦ on top of column 7; tap it → `−$47`; tap through the stock → `Recycle waste into stock, 2 left`; recycle → `1 left` after the next pass; TOTAL counts it live if the switch is on.
9. **Standard/Off regression.** `?set=scoring:standard,warnings:unwinnable,hintButton:on` + `?reset=game`: SCORE badge, Hint pill, `[solver]` line after a move, `No winning moves left — …` bubble when proven; `?set=warnings:stuck`: stuck bubble + solver confirmation at the end of the stock; `?set=scoring:off` → MOVES/TIME only; never a New Game pill on a Standard game (play a Draw-1 Standard game to an empty stock: plain recycle card, no pill).
10. **Demo sheet.** Developer mode on → Demo → the Fixtures section shows a second row `Vegas deal` / `Vegas last pass` / `Vegas near win`; each loads the matching fixture; the sheet still fits (Android detent) — screenshot.
11. **Persistence.** Kill + relaunch inside `vegas lastpass` after the exhausting tap → ⊘, badge, New Game pill restored, Undo works. Kill + relaunch inside `vegas nearwin` → board restored, undo EMPTY (expected: snapshot fallback), win still records $208.

### Device test results (round 3) — 2026-10-13, testing sub-agent

**Android phone Nothing A065 (1080×2412 ≈ 411 dp), Release APK versionCode 16 via `yarn release` (1:52 incremental, serial `192.168.1.12:5555`). iPhone 17 Pro simulator (iOS 26.5), Release build 15 via `yarn ios` (hung on `- Connecting to: iPhone 17 Pro` after `› Build Succeeded` for 18 min — md5 of the installed binary equalled DerivedData, killed the CLI, `simctl launch`; skill troubleshooting row confirmed).** Driven with agent-device (sessions `p2r3` iOS / `p2r3a…d` Android) + `yarn deeplink … --ios` / `--serial`. `[solver]` lines counted from a `log stream` / `logcat` capture: **0 on both platforms during every Vegas step**; the first line on each platform is the Standard phase (`source=auto status=solved`). Screenshots in `docs/product/scoring/screenshots/` (`p2r3-ios-*`, `p2r3-android-*`). iOS cannot redo-scrub, so "redo forward" steps were replaced by fixture reloads on both platforms (Android scrubber pan covered in round 2 / scrubber plan).

| # | Check | Android | iOS | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `vegas lastpass`: VEGAS −$52, Stock 3, no Hint pill, no bubble; exhausting tap → `Stock, no passes left` [disabled], no bubble, no announcement node; A♦ → −$47, still nothing; `?set=warnings:unwinnable` → still nothing; 0 `[solver]` lines | PASS | PASS | tree before/after; `p2r3-android-01-lastpass-exhausted-no-bubble.png`, `p2r3-ios-01-lastpass-exhausted-no-bubble.png` |
| 2 | New Game pill: absent while Stock 3; present after the exhausting tap (`New Game` / `new-game-button`, left of Undo); Undo (A♦) → still there; Undo (draw) → gone; redraw → back; tap → `Start a new game?` / `Ready for another round?` / Cancel / Deal Again; Cancel keeps the board (Moves 27); Deal Again → new Vegas deal (−$52, Moves 0, Stock 23 = Draw 1 setting), old row `Vegas −$52` | PASS | PASS | settle diffs; pill next to the header New Game in both screenshots above (Android header has a second "New Game" button — redundancy as reported) |
| 3 | Captions on the way back: 8 undos → `Recycle waste into stock, 1 left`; 9 more → `2 left` (Moves stays 24: undo does not count) | PASS | PASS | tree |
| 4 | Standard game: `Score, 0`, `Hint` pill, no New Game pill; stock tap → `[solver] source=auto status=solved`; Hint → `[solver] source=hint …` | PASS | PASS | logs (first solver line 22:30:19 Android / 22:31:50 iOS); stuck/unwinnable BUBBLES not shown on device: the fixture deal and 4 random Draw-1 deals (`solvableOnly:off`) were all solver-solvable, so the solver suppressed the heuristic — bubble text is jest-covered and unchanged |
| 5 | Settings copy: Off/Standard `Standard points or Vegas dollars. Applies to your next game.`; Vegas `Hints, warnings and solvable deals are off in Vegas. Applies to your next game.`; Keep Vegas total `Carry your balance from game to game. The header then shows your running total instead of this game’s result.`; Warnings `Warn when you run out of useful moves, or as soon as the game can't be won anymore.`; Reset alert `Reset Vegas total?` / `Your running total starts again from $0. The game on the board still counts.` / Cancel / Reset; Reset button only with the switch on | PASS | PASS | trees exact; `p2r3-android-00-settings-as-found.png`, `p2r3-android-05-reset-alert.png` (Cancel pressed on the phone), `p2r3-ios-06-settings-vegas.png`, `p2r3-ios-08-settings-off.png`; iOS Warnings description visually one-line-truncated (pre-existing) |
| 6 | `vegas nearwin` + total on: T0 (iOS −$515, Android −$376), ⊘ + New Game pill visible next to the last move (expected); K♠ waste → foundation → TOTAL T0+5 and unchanged through celebration + `Nice win! Ready for another round?`; Deal Again → T0+5−52 (iOS −$562, Android −$423 after relaunch case); History `Vegas $208`, Solved; `vegasTotal:off` → `Vegas, 208 dollars`; on → same total | PASS | PASS | `p2r3-ios-02-nearwin-total-badge-pill.png`, `p2r3-ios-03-vegas-win-alert-total.png`, `p2r3-ios-04-win-alert.png`, `p2r3-android-02-nearwin-total-badge-pill.png`, `p2r3-android-03-vegas-win-total.png`; TOTAL badge fits at both widths |
| 7 | Reset on a won board: win, drawer → Settings → Reset Vegas total → Reset (before the forced alert pops) → TOTAL `$0` on the won board; Deal Again → `−$52` | not run (Karim's phone) | PASS | `p2r3-ios-07-reset-on-won-board.png`; note the forced win alert is non-cancelable, so Settings is only reachable during the celebration window |
| 8 | `yarn vegas`: VEGAS −$52, Stock 21, A♦ col 7 → −$47 (auto-plays on tap); 7 taps → `Recycle waste into stock, 2 left`; recycle + 8 taps → `1 left` | PASS | PASS | tree |
| 9 | `?set=scoring:off` → only `Moves, N` / `Time, …`; Draw-1 Standard stock run to empty → plain recycle (Stock 24 after recycle), `Hint` present, never a New Game pill | PASS | PASS | tree |
| 10 | Demo sheet: Fixtures row 2 `Vegas deal` / `Vegas last pass` / `Vegas near win` present and loading | PASS | PASS | `p2r3-ios-09-demo-sheet.png`, `p2r3-android-06-demo-sheet.png` (+ `-08-demo-sheet-scrolled.png`); labels truncated "Vegas last …" (cosmetic), Android Testing row under the default detent |
| 11a | Kill + relaunch in the exhausted last-pass state → ⊘, −$52, Moves 25, New Game pill, Undo works (Stock 3, pill gone) | PASS | PASS | tree |
| 11b | Kill + relaunch in `vegas nearwin` → snapshot fallback; with Auto Up ON the last card auto-plays at hydration → win recorded once (`$208` row) | PASS (data) / **FAIL (TOTAL badge display, +$208 too high until Deal Again)** | same | `p2r3-ios-05-nearwin-relaunch-autowin-total.png`; § Identified issues (round 3) |

Settings restored on the phone to AS FOUND: Draw 1, Solvable deals on, Scoring Vegas, Keep Vegas total off, Auto Up on, Hint button on, Warnings "No more useful moves", developer mode on (`p2r3-android-07-settings-restored.png` — Scoring label blank there, see issues; reads "Vegas" after relaunch). Simulator left with Scoring Off, warnings unwinnable, Hint on, Keep Vegas total on (offset reset in step 7). Screen-off timeout back to 60 s; `/tmp/android-device.lock` removed; all agent-device sessions closed.

### Device test results (G8 fix) — 2026-10-13, fix sub-agent, Android phone only

Nothing A065 (411 dp), Release versionCode 16 via `yarn release` (0:47 incremental, serial `192.168.1.12:5555`, agent-device session `g8`, `--device A065`). Settings via `?set=scoring:vegas,vegasTotal:on,autoUp:on`. Note: the phone's screen was off after the force-stop/relaunch — `scripts/android-ready.sh --keep-awake` first, then snapshots work.

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | `yarn vegas nearwin` (cold): `Total, minus 64 dollars` (T0), Moves 243, ⊘ + dock New Game | PASS | tree |
| 2 | `am force-stop` + `am start` → snapshot fallback (`Replayed board mismatches stored snapshot; hydrating final snapshot` → `Hydrating saved in-progress session` → `hasWon set true (moves=244)` 180 ms later — the exact repro ordering) → **`Total, minus 59 dollars` = T0 + 5** through the celebration (Fountain) and the win alert | **PASS (was FAIL: T0 + 5 + 208)** | `scratchpad/relaunch.png` (TOTAL −$59, MOVES 244) |
| 3 | `DEAL AGAIN` → `Total, minus 111 dollars` = T0 + 5 − 52, Moves 0, Stock 23 | PASS | tree |
| 4 | Control, no relaunch: `yarn vegas nearwin` → `Total, 92 dollars` (T1 = −111 settled incl. the abandoned −52 + live 203); tap `Waste, King of spades` → win, `Total, 97 dollars` = T1 + 5, stays through celebration + alert; `DEAL AGAIN` → `Total, 45 dollars` = 97 − 52 | PASS | tree |
| 5 | Demo sheet Fixtures row 2 reads `Vegas deal` / `Last pass` / `Near win $` without truncation at 411 dp | PASS | `scratchpad/demo-sheet.png` |
| 6 | Android Scoring picker blank label | not re-tested (nothing changed; see Identified issues) | — |

Phone restored: `?set=vegasTotal:off` (Scoring Vegas + Auto Up on as found), screen-off timeout back to 60 s, session closed, `/tmp/android-device.lock` removed. Three new real history rows on the phone (two `Vegas $208` wins, one `Vegas −$52` abandon) plus the fresh Vegas deal on the board.

Shared-machine notes: an `invent` EAS local Android build was running at start (pid 83379); `yarn release`/`yarn ios` would have preflight-killed it (`gradlew` pattern), so the iOS build waited ~10 min for it to finish. The phone was unreachable over wireless adb for the first 25 min (four discovery attempts) and came back at 22:00; it appears twice in adb (wifi + mDNS) — `--serial` / `ANDROID_SERIAL` everywhere. Android snapshots stalled (>10 s settle) on alerts; `text="DEAL AGAIN"` (uppercase) is the Android win-alert button. agent-device `press --count N` did NOT repeat presses on iOS — loop single presses instead.
