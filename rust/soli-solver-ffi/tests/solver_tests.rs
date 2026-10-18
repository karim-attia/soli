//! Integration tests for the soli-solver-ffi JSON API and for the SOLI PATCH
//! mid-game constructors in the vendored lonelybot. The equivalence tests are
//! the ground truth for every ordering convention at the app↔lonelybot
//! boundary (hidden order, deck/waste layout, draw cycling) — if you change a
//! convention, these must catch it.

use std::num::NonZeroU8;

use serde_json::{json, Value};

use lonelybot::card::Card;
use lonelybot::convert::convert_moves;
use lonelybot::deck::{Deck, N_DECK_CARDS, N_PILES, N_PILE_CARDS};
use lonelybot::moves::{Move, N_MOVES_MAX};
use lonelybot::shuffler::{default_shuffle, CardDeck};
use lonelybot::solver::{solve, SearchResult};
use lonelybot::stack::Stack;
use lonelybot::standard::{HiddenVec, PileVec, Pos, StandardMove, StandardSolitaire};
use lonelybot::state::Solitaire;

use soli_solver_ffi::app_model::AppState;
use soli_solver_ffi::protocol::{format_app_card, parse_app_card, APP_SUIT_LETTERS};
use soli_solver_ffi::solve_request_json;

fn solve_json(request: &str) -> Value {
    serde_json::from_str(&solve_request_json(request)).unwrap()
}

/// Build the same fresh deal as `StandardSolitaire::new(cards, step)` but via
/// the SOLI PATCH `from_midgame` constructor.
fn midgame_from_fresh(cards: &CardDeck, draw_step: NonZeroU8) -> StandardSolitaire {
    let mut hidden_piles: [HiddenVec; N_PILES as usize] = Default::default();
    let mut piles: [PileVec; N_PILES as usize] = Default::default();
    for i in 0..usize::from(N_PILES) {
        let start = i * (i + 1) / 2;
        hidden_piles[i].extend(cards[start..start + i].iter().copied());
        piles[i].push(cards[start + i]);
    }
    StandardSolitaire::from_midgame(
        hidden_piles,
        piles,
        &cards[usize::from(N_PILE_CARDS)..],
        0,
        Stack::default(),
        draw_step,
    )
}

#[test]
fn fresh_deal_equivalence() {
    for seed in 0..20u64 {
        for draw in [1u8, 3] {
            let cards = default_shuffle(seed);
            let step = NonZeroU8::new(draw).unwrap();

            let reference = StandardSolitaire::new(&cards, step);
            let midgame = midgame_from_fresh(&cards, step);

            assert_eq!(reference.get_piles(), midgame.get_piles());
            assert_eq!(reference.get_hidden(), midgame.get_hidden());
            assert_eq!(
                reference.get_deck().iter().collect::<Vec<_>>(),
                midgame.get_deck().iter().collect::<Vec<_>>()
            );
            assert!(reference.get_deck().equivalent_to(midgame.get_deck()));

            let mut ref_game = Solitaire::from(&reference);
            let mut mid_game = Solitaire::from(&midgame);
            assert!(mid_game.is_valid(), "seed {seed} draw {draw}");
            assert!(ref_game.equivalent_to(&mid_game), "seed {seed} draw {draw}");

            let (ref_result, _) = solve(&mut ref_game);
            let (mid_result, _) = solve(&mut mid_game);
            assert_eq!(ref_result, mid_result, "seed {seed} draw {draw}");
        }
    }
}

#[test]
fn draw_cycle_equivalence() {
    for seed in 0..10u64 {
        let cards = default_shuffle(seed);
        let deck_cards: [Card; N_DECK_CARDS as usize] =
            cards[usize::from(N_PILE_CARDS)..].try_into().unwrap();

        for draw in 1..=5u8 {
            let step = NonZeroU8::new(draw).unwrap();

            // Play the reference deck forward: deal, occasionally consume the
            // current card (like playing it from the waste), repeat.
            let mut reference = Deck::new(deck_cards, step);
            for round in 0..8 {
                for _ in 0..round {
                    reference.deal_once();
                }
                if round % 2 == 1 {
                    reference.draw_current(); // None when waste empty — fine
                }

                // Rebuild from the observable state (physical order + offset)
                // — exactly what the FFI does from an app request. offset(0)
                // is the public accessor for the current draw offset.
                let physical: Vec<Card> = reference.iter().collect();
                let rebuilt = Deck::from_remaining(&physical, reference.offset(0), step);
                assert!(reference.equivalent_to(&rebuilt));

                // Both decks must cycle identically through at least one full
                // recycle wrap.
                let mut a = reference.clone();
                let mut b = rebuilt;
                let n_steps = 2 * (usize::from(N_DECK_CARDS) / usize::from(draw) + 2);
                for step_idx in 0..n_steps {
                    assert_eq!(
                        a.offset(0),
                        b.offset(0),
                        "seed {seed} draw {draw} round {round} step {step_idx}"
                    );
                    assert_eq!(a.peek_current(), b.peek_current());
                    assert_eq!(a.iter().collect::<Vec<_>>(), b.iter().collect::<Vec<_>>());
                    a.deal_once();
                    b.deal_once();
                }
            }
        }
    }
}

fn assert_hint_legal(app: &AppState, hint: &Value) {
    if hint.is_null() {
        assert!(app.is_won(), "hint missing in unfinished game");
        return;
    }
    match hint["kind"].as_str().unwrap() {
        "draw" => {
            assert!(
                !app.stock.is_empty() || !app.waste.is_empty(),
                "draw hint with empty stock and waste"
            );
        }
        "move" => {
            let card = parse_app_card(hint["card"].as_str().unwrap()).unwrap();
            let from = &hint["from"];
            match from["type"].as_str().unwrap() {
                "tableau" => {
                    let i = from["index"].as_u64().unwrap() as usize;
                    assert!(
                        app.tableau[i].1.contains(&card),
                        "hint card {} not visible in tableau[{i}]",
                        format_app_card(card)
                    );
                }
                "waste" => assert_eq!(app.waste.last(), Some(&card)),
                "foundation" => {
                    let suit = AppState::app_suit(card);
                    assert_eq!(app.foundations[suit], card.rank() + 1);
                    assert_eq!(
                        from["suit"].as_str().unwrap(),
                        APP_SUIT_LETTERS[suit].to_string()
                    );
                }
                other => panic!("bad from type {other}"),
            }
            let to = &hint["to"];
            match to["type"].as_str().unwrap() {
                "tableau" => {
                    let i = to["index"].as_u64().unwrap() as usize;
                    let top = app.tableau[i].1.last().copied();
                    assert!(card.go_after(top), "hint target tableau[{i}] not legal");
                }
                "foundation" => {
                    assert_eq!(app.foundations[AppState::app_suit(card)], card.rank());
                }
                other => panic!("bad to type {other}"),
            }
        }
        other => panic!("bad hint kind {other}"),
    }
}

#[test]
fn replay_along_solution() {
    // Default seed 0, draw 1 is a known-solvable baseline.
    let seed = 0u64;
    let draw = 1u8;
    let cards = default_shuffle(seed);
    let step = NonZeroU8::new(draw).unwrap();

    let mut game = Solitaire::new(&cards, step);
    let (result, history) = solve(&mut game);
    assert_eq!(result, SearchResult::Solved);
    let history = history.unwrap();

    let mut std_game = StandardSolitaire::new(&cards, step);
    let standard_moves = lonelybot::convert::convert_moves(&mut std_game, &history).unwrap();
    assert!(std_game.is_win());

    let mut app = AppState::from_fresh_deal(&cards, draw);
    for (step_idx, m) in standard_moves.iter().take(30).enumerate() {
        app.apply(m);

        let response = solve_json(&app.to_request_json(5000));
        assert_eq!(response["status"], "solved", "step {step_idx}: {response}");
        assert!(response["winMovesRemaining"].as_u64().is_some());
        assert!(response["solveMs"].as_f64().is_some());
        assert!(response["visited"].as_u64().is_some());
        assert_hint_legal(&app, &response["hint"]);
    }
}

// --- F9 board-first hint tests -----------------------------------------
//
// Fixtures below were found by scanning winning-line positions of default
// seeds (temporary examples/find_f9_fixtures.rs, 2026-07-23; scan stats: of
// 3041 positions probed, 1493 had a draw-first raw line and 580 of those now
// hint a board move). Pinned as full request JSON so they are immune to
// future changes in solver line selection or walk order.

/// Rebuild the `StandardSolitaire` a request describes, mirroring
/// solve.rs::build_state via public APIs only — lets tests re-derive the RAW
/// main line (pre-F9 hint behavior) for the exact same position.
fn std_game_from_request(request: &Value) -> StandardSolitaire {
    let card_list = |v: &Value| -> Vec<Card> {
        v.as_array()
            .unwrap()
            .iter()
            .map(|s| parse_app_card(s.as_str().unwrap()).unwrap())
            .collect()
    };
    let mut hidden_piles: [HiddenVec; N_PILES as usize] = Default::default();
    let mut piles: [PileVec; N_PILES as usize] = Default::default();
    for (i, col) in request["tableau"].as_array().unwrap().iter().enumerate() {
        hidden_piles[i].extend(card_list(&col["hidden"]));
        piles[i].extend(card_list(&col["visible"]));
    }
    let waste = card_list(&request["waste"]);
    let stock = card_list(&request["stock"]);
    // Deck layout: waste bottom→top, then stock reversed (see solve.rs).
    let mut deck_cards = waste.clone();
    deck_cards.extend(stock.iter().rev());
    let f = &request["foundations"];
    let count = |k: &str| u8::try_from(f[k].as_u64().unwrap()).unwrap();
    // Stack::from_counts takes lonelybot suit order h, d, c, s.
    let stack = Stack::from_counts([count("h"), count("d"), count("c"), count("s")]);
    let draw_step =
        NonZeroU8::new(u8::try_from(request["drawCount"].as_u64().unwrap()).unwrap()).unwrap();
    #[allow(clippy::cast_possible_truncation)]
    StandardSolitaire::from_midgame(
        hidden_piles,
        piles,
        &deck_cards,
        waste.len() as u8,
        stack,
        draw_step,
    )
}

/// The raw main line's first STANDARD move (what pre-F9 hints followed).
/// (Rebuilt field-by-field: StandardMove derives neither Clone nor Debug.)
fn raw_first_standard_move(std_game: &StandardSolitaire) -> StandardMove {
    let mut compact = Solitaire::from(std_game);
    let (result, history) = solve(&mut compact);
    assert_eq!(result, SearchResult::Solved, "fixture must be winnable");
    let standard = convert_moves(&mut std_game.clone(), &history.unwrap()).unwrap();
    let first = &standard[0];
    StandardMove::new(first.from, first.to, first.card)
}

/// Same filter as solve.rs::board_first_candidates (private there): no-draw
/// progress moves via non-dominance generation.
fn no_draw_candidates(game: &Solitaire) -> Vec<Move> {
    let waste_top = game.get_deck().peek_current();
    game.gen_moves::<false>()
        .to_vec::<N_MOVES_MAX>()
        .into_iter()
        .filter(|m| match m {
            Move::PileStack(_) | Move::Reveal(_) => true,
            Move::DeckStack(c) | Move::DeckPile(c) => Some(*c) == waste_top,
            Move::StackPile(_) => false,
        })
        .collect()
}

/// Default seed 0, draw 1, one move into the winning line (found by scan —
/// see section comment). The raw line starts with a draw, but 7♦ (on hidden
/// cards in column 3) can move onto 8♠ in column 0 and the game stays
/// winnable — the hint must be that board move, not the draw.
const BOARD_FIRST_FIXTURE: &str = r#"{"budgetMs":5000,"drawCount":1,"foundations":{"c":0,"d":0,"h":0,"s":0},"stock":["d3","h5","c5","c3","d13","d4","s11","s2","d9","d11","h3","s12","h2","h6","s6","c11","c13","c7","c1","s13","c6","h10","s10"],"tableau":[{"hidden":[],"visible":["s8"]},{"hidden":["h1"],"visible":["d2"]},{"hidden":["s5","d5"],"visible":["s4"]},{"hidden":["c4","h11","h7"],"visible":["d7"]},{"hidden":["d8","c8","s9","d1"],"visible":["d6"]},{"hidden":["s7","h4","c2","d10","s3"],"visible":["c9"]},{"hidden":["d12","s1","h12","c10","h13","h8"],"visible":["c12"]}],"waste":["h9"]}"#;

/// Default seed 0, draw 1, 59 moves into the winning line (found by scan).
/// Exactly one no-draw candidate exists — K♠ from the waste to the empty
/// column — but playing it provably makes the game UNWINNABLE, so the
/// verified-fail path must fall back to the draw hint.
const DRAW_ONLY_FIXTURE: &str = r#"{"budgetMs":5000,"drawCount":1,"foundations":{"c":1,"d":0,"h":1,"s":0},"stock":["d3","h5","d13","s11","d9","d11","s12","h2","h6","s6","c11","c13","c7"],"tableau":[{"hidden":[],"visible":["s8","d7"]},{"hidden":[],"visible":[]},{"hidden":["s5","d5"],"visible":["s4","h3","s2"]},{"hidden":["c4","h11"],"visible":["h7"]},{"hidden":["d8","c8","s9","d1"],"visible":["d6","c5","d4","c3","d2"]},{"hidden":["s7","h4","c2","d10","s3"],"visible":["c9"]},{"hidden":["d12","s1","h12","c10","h13","h8"],"visible":["c12"]}],"waste":["h9","s10","h10","c6","s13"]}"#;

/// Default seed 0, draw 1, 11 moves into the winning line (found by scan).
/// The raw line starts with a draw, but the WASTE TOP 6♠ plays onto 7♦ and
/// keeps the game winnable — pins the waste-top candidate classes (b/d),
/// whose absence would otherwise silently degrade to draw hints (both the
/// broken and working filter look "legal" everywhere else).
const WASTE_TOP_FIXTURE: &str = r#"{"budgetMs":5000,"drawCount":1,"foundations":{"c":1,"d":0,"h":0,"s":0},"stock":["d3","h5","c5","c3","d13","d4","s11","s2","d9","d11","h3","s12","h2","h6"],"tableau":[{"hidden":[],"visible":["s8","d7"]},{"hidden":["h1"],"visible":["d2"]},{"hidden":["s5","d5"],"visible":["s4"]},{"hidden":["c4","h11"],"visible":["h7"]},{"hidden":["d8","c8","s9","d1"],"visible":["d6"]},{"hidden":["s7","h4","c2","d10","s3"],"visible":["c9"]},{"hidden":["d12","s1","h12","c10","h13","h8"],"visible":["c12"]}],"waste":["h9","s10","h10","c6","s13","c7","c13","c11","s6"]}"#;

#[test]
fn board_first_hint_beats_draw_line() {
    let request: Value = serde_json::from_str(BOARD_FIRST_FIXTURE).unwrap();
    let std_game = std_game_from_request(&request);

    // Pre-F9 behavior would have hinted a draw: the raw line starts with one.
    // (assert! not assert_eq!: StandardMove has no Debug impl.)
    assert!(
        raw_first_standard_move(&std_game) == StandardMove::DRAW_NEXT,
        "fixture invalidated: raw main line no longer starts with a draw"
    );

    let response = solve_json(BOARD_FIRST_FIXTURE);
    assert_eq!(response["status"], "solved", "{response}");
    let hint = &response["hint"];
    assert_eq!(
        hint["kind"], "move",
        "expected a board move hint: {response}"
    );
    assert_eq!(hint["card"], "d7");
    assert_eq!(hint["from"]["type"], "tableau");
    assert_eq!(hint["from"]["index"], 3);
    assert_eq!(hint["to"]["type"], "tableau");
    assert_eq!(hint["to"]["index"], 0);

    // The hinted move must keep the game winnable (F9's core guarantee).
    let mut after = std_game.clone();
    after
        .do_move(&StandardMove::new(
            Pos::Pile(3),
            Pos::Pile(0),
            parse_app_card("d7").unwrap(),
        ))
        .unwrap();
    let (result, _) = solve(&mut Solitaire::from(&after));
    assert_eq!(result, SearchResult::Solved);
}

#[test]
fn draw_hint_when_only_board_move_loses_the_game() {
    let request: Value = serde_json::from_str(DRAW_ONLY_FIXTURE).unwrap();
    let std_game = std_game_from_request(&request);

    // The fixture's point: a no-draw candidate EXISTS (this is the
    // verified-fail path, not the trivial empty-candidate-list path) …
    let candidates = no_draw_candidates(&Solitaire::from(&std_game));
    let king_spades = parse_app_card("s13").unwrap();
    assert_eq!(candidates, vec![Move::DeckPile(king_spades)]);

    // … but playing it (K♠ from waste onto the empty column 1) provably
    // makes the game unwinnable.
    let mut after = std_game.clone();
    after
        .do_move(&StandardMove::new(Pos::Deck, Pos::Pile(1), king_spades))
        .unwrap();
    let (result, _) = solve(&mut Solitaire::from(&after));
    assert_eq!(result, SearchResult::Unsolvable);

    // So the hint must stay a draw.
    let response = solve_json(DRAW_ONLY_FIXTURE);
    assert_eq!(response["status"], "solved", "{response}");
    assert_eq!(response["hint"]["kind"], "draw", "{response}");
}

#[test]
fn waste_top_play_beats_draw_line() {
    let request: Value = serde_json::from_str(WASTE_TOP_FIXTURE).unwrap();
    let std_game = std_game_from_request(&request);

    assert!(
        raw_first_standard_move(&std_game) == StandardMove::DRAW_NEXT,
        "fixture invalidated: raw main line no longer starts with a draw"
    );

    let response = solve_json(WASTE_TOP_FIXTURE);
    assert_eq!(response["status"], "solved", "{response}");
    let hint = &response["hint"];
    assert_eq!(
        hint["kind"], "move",
        "expected a waste play hint: {response}"
    );
    assert_eq!(hint["card"], "s6");
    assert_eq!(hint["from"]["type"], "waste");
    assert_eq!(hint["to"]["type"], "tableau");
    assert_eq!(hint["to"]["index"], 0);

    // Winnability after the hinted waste play (6♠ onto 7♦).
    let mut after = std_game.clone();
    after
        .do_move(&StandardMove::new(
            Pos::Deck,
            Pos::Pile(0),
            parse_app_card("s6").unwrap(),
        ))
        .unwrap();
    let (result, _) = solve(&mut Solitaire::from(&after));
    assert_eq!(result, SearchResult::Solved);
}

#[test]
fn board_first_hint_is_deterministic() {
    let first = solve_json(BOARD_FIRST_FIXTURE);
    let second = solve_json(BOARD_FIRST_FIXTURE);
    // Everything except wall-clock timing must be identical run-to-run
    // (candidate order, main line, and visited counts are all deterministic;
    // sub-solve budgets only matter near the slice boundary, far from these
    // sub-ms fixtures).
    for field in ["status", "hint", "winMovesRemaining", "visited"] {
        assert_eq!(first[field], second[field], "field {field} differs");
    }
}

/// Map a response hint back to a `StandardMove` for the app model.
fn hint_to_standard_move(hint: &Value) -> StandardMove {
    if hint["kind"] == "draw" {
        return StandardMove::DRAW_NEXT;
    }
    let card = parse_app_card(hint["card"].as_str().unwrap()).unwrap();
    let pos = |v: &Value| -> Pos {
        match v["type"].as_str().unwrap() {
            "tableau" => Pos::Pile(u8::try_from(v["index"].as_u64().unwrap()).unwrap()),
            "waste" => Pos::Deck,
            "foundation" => Pos::Stack(card.suit()),
            other => panic!("bad pos type {other}"),
        }
    };
    StandardMove::new(pos(&hint["from"]), pos(&hint["to"]), card)
}

#[test]
fn following_hints_wins_the_game() {
    // End-to-end user flow on a fresh known-solvable deal: every hint must be
    // legal, keep the game winnable (status stays solved by construction —
    // candidates are verified, fallbacks come from a proven line), and lead
    // to an actual win in a bounded number of steps.
    let mut app = AppState::from_fresh_deal(&default_shuffle(0), 1);
    let mut board_move_hints = 0usize;
    for step in 0..400 {
        if app.is_won() {
            break;
        }
        let response = solve_json(&app.to_request_json(5000));
        assert_eq!(response["status"], "solved", "step {step}: {response}");
        let hint = &response["hint"];
        assert_hint_legal(&app, hint);
        if hint["kind"] == "move" {
            board_move_hints += 1;
        }
        app.apply(&hint_to_standard_move(hint));
    }
    assert!(app.is_won(), "did not win within 400 hint-follows");
    // The F9 point on fresh draw-1 deals: play opens with board moves rather
    // than a pure draw streak.
    assert!(
        board_move_hints > 0,
        "no board-move hints on the whole walk"
    );
}

#[test]
fn hint_completes_fast_on_midgame_state() {
    // Perf sanity for the added candidate verification: total request time
    // (main solve + all sub-solves) must stay far below the interactive
    // budget on the host. Scan across 3041 positions saw max 0.8 ms; the
    // 500 ms bound only guards against pathological regressions.
    for fixture in [BOARD_FIRST_FIXTURE, DRAW_ONLY_FIXTURE] {
        let response = solve_json(fixture);
        assert_eq!(response["status"], "solved");
        let solve_ms = response["solveMs"].as_f64().unwrap();
        assert!(solve_ms < 500.0, "hint took {solve_ms} ms");
    }
}

#[test]
fn unsolvable_fresh_deal() {
    // Scan for a proven-Impossible fresh deal; earlier research found one
    // within default seeds 0..50 (e.g. seed 4 draw 5).
    let mut found = None;
    'outer: for seed in 0..50u64 {
        for draw in 1..=5u8 {
            let app = AppState::from_fresh_deal(&default_shuffle(seed), draw);
            let response = solve_json(&app.to_request_json(2000));
            if response["status"] == "unsolvable" {
                assert!(response["hint"].is_null());
                assert!(response["visited"].as_u64().unwrap() > 0);
                found = Some((seed, draw));
                break 'outer;
            }
        }
    }
    let (seed, draw) = found.expect("no unsolvable deal in default seeds 0..50 × draw 1..=5");
    println!("unsolvable fixture: default seed {seed}, draw {draw}");
}

#[test]
fn budget_zero_returns_unknown() {
    // A fresh deal can never be proven in literally zero time: the deadline
    // check fires on the first visited node.
    let app = AppState::from_fresh_deal(&default_shuffle(0), 3);
    let response = solve_json(&app.to_request_json(0));
    assert_eq!(response["status"], "unknown");
    assert!(response["hint"].is_null());
}

#[test]
fn hint_for_forced_foundation_play_uses_app_suits() {
    // 51 cards on the foundations, K♣ alone on the tableau: exactly one move.
    let request = json!({
        "drawCount": 1,
        "budgetMs": 1000,
        "foundations": { "c": 12, "d": 13, "h": 13, "s": 13 },
        "tableau": [
            { "hidden": [], "visible": ["c13"] },
            { "hidden": [], "visible": [] },
            { "hidden": [], "visible": [] },
            { "hidden": [], "visible": [] },
            { "hidden": [], "visible": [] },
            { "hidden": [], "visible": [] },
            { "hidden": [], "visible": [] }
        ],
        "stock": [],
        "waste": []
    })
    .to_string();

    let response = solve_json(&request);
    assert_eq!(response["status"], "solved", "{response}");
    assert_eq!(response["winMovesRemaining"], 1);
    let hint = &response["hint"];
    assert_eq!(hint["kind"], "move");
    assert_eq!(hint["card"], "c13");
    assert_eq!(hint["from"]["type"], "tableau");
    assert_eq!(hint["from"]["index"], 0);
    assert_eq!(hint["to"]["type"], "foundation");
}

#[test]
fn won_state_returns_solved_without_hint() {
    let request = json!({
        "drawCount": 3,
        "foundations": { "c": 13, "d": 13, "h": 13, "s": 13 },
        "tableau": (0..7).map(|_| json!({ "hidden": [], "visible": [] })).collect::<Vec<_>>(),
        "stock": [],
        "waste": []
    })
    .to_string();

    let response = solve_json(&request);
    assert_eq!(response["status"], "solved");
    assert_eq!(response["winMovesRemaining"], 0);
    assert!(response["hint"].is_null());
}

#[test]
fn duplicate_card_is_invalid() {
    let mut app = AppState::from_fresh_deal(&default_shuffle(0), 3);
    let dup = app.stock[0];
    let last = app.stock.len() - 1;
    app.stock[last] = dup;

    let response = solve_json(&app.to_request_json(1000));
    assert_eq!(response["status"], "invalid");
    assert!(response["message"]
        .as_str()
        .unwrap()
        .contains("duplicate card"));
}

#[test]
fn structural_validation_errors() {
    // Missing a tableau column.
    let response = solve_json(
        &json!({
            "drawCount": 3,
            "foundations": { "c": 0, "d": 0, "h": 0, "s": 0 },
            "tableau": (0..6).map(|_| json!({ "hidden": [], "visible": [] })).collect::<Vec<_>>(),
            "stock": [],
            "waste": []
        })
        .to_string(),
    );
    assert_eq!(response["status"], "invalid");

    // drawCount out of range.
    let mut app = AppState::from_fresh_deal(&default_shuffle(0), 3);
    app.draw_count = 0;
    assert_eq!(solve_json(&app.to_request_json(0))["status"], "invalid");

    // Hidden cards without a visible card cannot exist in the app.
    let mut app = AppState::from_fresh_deal(&default_shuffle(0), 3);
    app.tableau[3].1.clear(); // drop the face-up card entirely
    let response = solve_json(&app.to_request_json(0));
    assert_eq!(response["status"], "invalid");

    // Malformed JSON.
    let response = solve_json("{not json");
    assert_eq!(response["status"], "invalid");

    // Missing cards (49 of 52).
    let mut app = AppState::from_fresh_deal(&default_shuffle(0), 3);
    app.stock.truncate(app.stock.len() - 3);
    let response = solve_json(&app.to_request_json(0));
    assert_eq!(response["status"], "invalid");
}

#[test]
fn ffi_round_trip_and_null_safety() {
    use std::ffi::{CStr, CString};

    let app = AppState::from_fresh_deal(&default_shuffle(0), 1);
    let request = CString::new(app.to_request_json(2000)).unwrap();
    let raw = unsafe { soli_solver_ffi::soli_solver_solve(request.as_ptr()) };
    assert!(!raw.is_null());
    let response: Value =
        serde_json::from_str(unsafe { CStr::from_ptr(raw) }.to_str().unwrap()).unwrap();
    unsafe { soli_solver_ffi::soli_solver_free_string(raw) };
    assert!(matches!(
        response["status"].as_str().unwrap(),
        "solved" | "unsolvable" | "unknown"
    ));

    // Null request → error response, no crash.
    let raw = unsafe { soli_solver_ffi::soli_solver_solve(std::ptr::null()) };
    assert!(!raw.is_null());
    let response: Value =
        serde_json::from_str(unsafe { CStr::from_ptr(raw) }.to_str().unwrap()).unwrap();
    unsafe { soli_solver_ffi::soli_solver_free_string(raw) };
    assert_eq!(response["status"], "error");

    // Freeing null is a no-op.
    unsafe { soli_solver_ffi::soli_solver_free_string(std::ptr::null_mut()) };
}

/// Pins the two verdicts the `?demo=unwinnable` fixture depends on
/// (`src/solitaire/demoReplay.ts`, `createUnwinnableGameState`): the fixture is
/// a dead end ONLY if the solver proves the position after its killing move
/// unsolvable AND the position before it solvable — otherwise the rewind
/// boundary the fixture exists to exercise would not exist at all.
///
/// The two request strings are byte-identical copies of the ones pinned in
/// `test/unit/solitaire/demoReplay.unwinnable.test.ts`, which asserts that they are
/// exactly what `buildSolverRequest` produces for the fixture. So the TS side
/// pins the boards and this test pins their verdicts; drift on either side
/// fails a gate instead of silently shipping a fixture that is still winnable.
#[test]
fn unwinnable_demo_fixture_boundary_is_real() {
    // After 81 primitive steps of playlist entry 0's solution (the 81st is the
    // draw that puts the K♠ on the waste). The only empty column is column 2.
    let before_killing_move = r#"{"drawCount":1,"budgetMs":2000,"foundations":{"c":1,"d":0,"h":2,"s":0},"tableau":[{"hidden":[],"visible":["s8","d7","c6"]},{"hidden":[],"visible":[]},{"hidden":["s5","d5"],"visible":["s4","h3","s2"]},{"hidden":["c4","h11"],"visible":["h7"]},{"hidden":["d8","c8","s9","d1"],"visible":["d6","c5","d4","c3","d2"]},{"hidden":["s7","h4","c2","d10","s3"],"visible":["c9"]},{"hidden":["d12","s1","h12","c10","h13","h8"],"visible":["c12"]}],"stock":["d3","h5","d13","s11","d9","d11","s12","h6","s6","c11","c13","c7"],"waste":["h9","s10","h10","s13"]}"#;
    // Same board after the killing move: the K♠ now fills that empty column, so
    // the Q♣ on column 7 can never move and the A♠ under it is buried forever.
    let after_killing_move = r#"{"drawCount":1,"budgetMs":2000,"foundations":{"c":1,"d":0,"h":2,"s":0},"tableau":[{"hidden":[],"visible":["s8","d7","c6"]},{"hidden":[],"visible":["s13"]},{"hidden":["s5","d5"],"visible":["s4","h3","s2"]},{"hidden":["c4","h11"],"visible":["h7"]},{"hidden":["d8","c8","s9","d1"],"visible":["d6","c5","d4","c3","d2"]},{"hidden":["s7","h4","c2","d10","s3"],"visible":["c9"]},{"hidden":["d12","s1","h12","c10","h13","h8"],"visible":["c12"]}],"stock":["d3","h5","d13","s11","d9","d11","s12","h6","s6","c11","c13","c7"],"waste":["h9","s10","h10"]}"#;

    assert_eq!(solve_json(before_killing_move)["status"], "solved");
    assert_eq!(solve_json(after_killing_move)["status"], "unsolvable");
}

/// Pins the two verdicts the `?demo=stuck` fixture depends on
/// (`src/solitaire/demoReplay.ts`, `createStuckGameState`). That fixture exists
/// to trip the DEFAULT `noUsefulMoves` warning, whose predicate is
/// `stock.length == 0 && !hasUsefulMove(board)` — but the app only WARNS after
/// the solver confirms the heuristic, so a stuck-LOOKING board that is still
/// solvable would never show the warning at all. That is not hypothetical: the
/// first hundred candidates the search produced satisfied the predicate and
/// were every one of them `solved`, because the heuristic ignores non-revealing
/// rearrangements and foundation digs while the solver uses both.
///
/// The stuck predicate itself is pinned on the TS side
/// (`test/unit/solitaire/demoReplay.stuck.test.ts`), which also asserts that
/// these two request strings are exactly what `buildSolverRequest` produces.
#[test]
fn stuck_demo_fixture_boundary_is_real() {
    // Playlist entry 19 (`default-20-draw-1`) after 210 primitive solution
    // steps: two stock cards left and the 6D still on the waste.
    let before_killing_moves = r#"{"drawCount":1,"budgetMs":2000,"foundations":{"c":3,"d":5,"h":2,"s":0},"tableau":[{"hidden":[],"visible":["d13","s12","h11","s10","h9","s8","h7","s6"]},{"hidden":[],"visible":["c13","h12","s11","h10","s9","d8","c7","h6","s5","h4","s3"]},{"hidden":[],"visible":["d9","c8","d7"]},{"hidden":[],"visible":["s13","d12","c11","d10"]},{"hidden":[],"visible":["c6","h5","c4","h3","s2"]},{"hidden":["c12","c10"],"visible":["d11"]},{"hidden":["s1","c9","h13"],"visible":["c5"]}],"stock":["h8","s7"],"waste":["s4","d6"]}"#;
    // After the four killing moves: the 6D is on its foundation, column 5 is
    // empty and the stock is out. The AS is buried under three cards in column 7
    // with nothing on the spade foundation, and no red six is left in play to
    // move the 5C off it.
    let after_killing_moves = r#"{"drawCount":1,"budgetMs":2000,"foundations":{"c":3,"d":6,"h":2,"s":0},"tableau":[{"hidden":[],"visible":["d13","s12","h11","s10","h9","s8","h7","s6"]},{"hidden":[],"visible":["c13","h12","s11","h10","s9","d8","c7","h6","s5","h4","s3"]},{"hidden":[],"visible":["d9","c8","d7","c6","h5","c4","h3","s2"]},{"hidden":[],"visible":["s13","d12","c11","d10"]},{"hidden":[],"visible":[]},{"hidden":["c12","c10"],"visible":["d11"]},{"hidden":["s1","c9","h13"],"visible":["c5"]}],"stock":[],"waste":["s4","s7","h8"]}"#;

    assert_eq!(solve_json(before_killing_moves)["status"], "solved");
    assert_eq!(solve_json(after_killing_moves)["status"], "unsolvable");
}
