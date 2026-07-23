/**
 * Celebration mode metadata and motion helpers shared by the Klondike screen.
 */

export type CelebrationAssignment = {
  baseX: number
  baseY: number
  stackIndex: number
  suitIndex: number
  randomSeed: number
  index: number
}

export type CelebrationMetadata = {
  id: number
  name: string
  // Motion-trail opt-in: the overlay renders `count` ghost copies per card, each
  // evaluating the SAME frame function at progress lagged by (k+1) * gapMs. Works
  // because every mode is a pure function of progress — no position history needed.
  // Perf note (Atlas renderer, 2026-07-08): ghosts are extra sprites in the SAME GPU
  // draw call, so `count` no longer scales Fabric view updates (the old budget that
  // forced the 2026-07-07 detune: Meteor 5→3→2, Cascade 4→3, Comet Halo 4→removed,
  // Galaxy 3→removed). Translucent overdraw is still a GPU fill cost on modes that
  // CLUSTER cards (Comet Halo, Galaxy) — re-measure on the A065 when raising counts.
  trail?: { count: number; gapMs: number }
  // Wobble opt-OUT (polish round 2, user 2026-07-08): the overlay adds a global
  // sin/cos positional jitter to every card. On modes where cards REST or sit
  // (Avalanche 31, Cascade Imprint 33) that jitter reads as a weird wiggle instead
  // of life — `wobble: false` zeroes it for the whole mode. Absent = wobble on.
  wobble?: false
  // Imprint-surface opt-in (ten-crazy-modes story, 2026-07-08 — generalized from the
  // hardcoded 33/36 pair): presence mounts the accumulating offscreen surface
  // (CascadeImprintLayer in CelebrationOverlayLayer). policy:
  // - 'cascade': mode 33's bespoke Windows behavior (pile reveals + launch-window
  //   live-card visibility) — do not reuse for new modes.
  // - 'path': stamps along the whole path on a fixed time lattice.
  // - 'events': stamps at discrete per-card event times (wall impacts, rests, bursts).
  // 'path'/'events' behave identically in the renderer (both drive the generic
  // write-once schedule via getImprintStampCount/Raw) — the split is documentation.
  // alpha: stamp paint alpha (Fireworks' faint burst marks); default 1 (opaque ink).
  // launchStamps: also ink stamps whose frozen time falls INSIDE the anchored launch
  // blend (base→path lerp positions). Default false — blended ink is fatal for
  // You-Win's message and stray marks for Pinball walls. Spirograph 36 opts IN:
  // the messy launch-transit streaks are part of its look (full-review culling
  // story, 2026-07-09 — the generalization's blanket skip had silently removed
  // them and the user missed the messiness).
  imprint?: {
    policy: 'cascade' | 'path' | 'events'
    alpha?: number
    launchStamps?: true
  }
}

// Stable-id contract: ids are permanent identifiers, NOT array indices. When a mode is
// removed later, delete its metadata entry here and retire its switch case number in
// computeCelebrationFrame — never renumber or reuse ids. Selection always picks a random
// entry from this list (see useCelebrationController), so gaps in the id sequence are fine.
//
// TOMBSTONE (full-review culling, user voice review 2026-07-09): ids 4 (Ellipse
// Drift), 7 (Wave Loop), 11 (Resonance Field), 14 (Wave Sweep), 15 (Constellation
// Waltz), 16 (Pulse Orbit), 18 (Horizon Arc), 19 (Jitter Swarm) are RETIRED —
// all "generic circle / group of cards moving around" variants the user culled.
// Tuning round 2 (2026-07-12): id 25 (Flock) RETIRED too — the murmuration rework
// didn't convince on device, user decided remove (the pre-agreed outcome).
// Never reuse these ids. A `?celebration=<retired id>` deep link devLogs
// "unknown mode" and is ignored (metadata lookup miss — verified on device).
export const CELEBRATION_MODE_METADATA: CelebrationMetadata[] = [
  { id: 0, name: 'Spiral Bloom' },
  // Mode-uplift story (2026-07-08): trails added to the user's "boring set"
  // (1, 2, 7, 9, 11, 14, 18) + Vortex 22 — all patterns that SPREAD cards out, so
  // clustered-overdraw risk is low (the Galaxy/Comet caveat above). Counts kept at
  // 2-3 ghosts; the Meteor family (32/34/35) owns the long/dense trails.
  { id: 1, name: 'Lissajous Weave', trail: { count: 3, gapMs: 70 } },
  { id: 2, name: 'Pendulum Cascade', trail: { count: 2, gapMs: 80 } },
  { id: 3, name: 'Orbit Carousel' },
  { id: 5, name: 'Starburst Spur' },
  { id: 6, name: 'Dual Spiral' },
  { id: 8, name: 'Ring Cascade' },
  { id: 9, name: 'Drift Orbit', trail: { count: 2, gapMs: 80 } },
  // Trail re-enabled 2026-07-08 (renderer-polish story): the 2026-07-07 removal was a
  // VIEW-renderer measurement (6fps — per-ghost Fabric views on a tight cluster); the
  // Atlas draws ghosts in the same draw call at ~122fps with 5ms GPU headroom.
  // Polish round 2 (2026-07-08): restored the ORIGINAL 4-ghost count the user liked.
  // The original gap was never committed (git history only ever had 31:3/80 and
  // 32:2/75), so the 70ms reconstruction stays.
  { id: 10, name: 'Comet Halo', trail: { count: 4, gapMs: 70 } },
  { id: 12, name: 'Column Glide' },
  { id: 13, name: 'Aurora Twist' },
  { id: 17, name: 'Clover Spin' },
  { id: 20, name: 'Fountain' },
  { id: 21, name: 'Card Rain' },
  // Short trail only: the vortex funnels cards into its center — deeper overdraw than
  // the spread-out modes above, so 3 tight ghosts, not more (see the Galaxy caveat).
  { id: 22, name: 'Vortex', trail: { count: 3, gapMs: 60 } },
  { id: 23, name: 'Infinity Loop' },
  { id: 24, name: 'Suit Orbits' },
  { id: 26, name: 'Shockwave' },
  // Trail re-enabled 2026-07-08 (renderer-polish story): the 2026-07-07 removal (16fps
  // with GPU stalls) was a view-renderer cost class the Atlas eliminated. The log
  // spiral still piles cards into a small center region — the deepest translucent
  // overdraw of any mode — so this is the first candidate to detune if the A065
  // re-measure regresses.
  { id: 27, name: 'Galaxy', trail: { count: 3, gapMs: 70 } },
  { id: 28, name: 'Big Bounce' },
  { id: 29, name: 'Heartbeat' },
  { id: 30, name: 'Diamond Drift' },
  // 3→4 ghosts 2026-07-08 (renderer-polish story): slightly longer classic tail now
  // that ghosts are same-draw-call sprites; cascade spreads cards out, low overdraw.
  // Renamed "Classic Cascade" → "Avalanche" (polish round 2, user 2026-07-08): it is
  // its own sliding/bouncing card flood, not the Windows cascade — that's mode 33.
  // wobble off: cards slide and rest upright; the global jitter read as weird wiggle.
  { id: 31, name: 'Avalanche', trail: { count: 4, gapMs: 80 }, wobble: false },
  // 2/75→4/60 2026-07-08 (renderer-polish story): the 2-ghost detune was for the view
  // renderer (Meteor was its most GPU-bound mode at 32fps; Atlas measured it at
  // ~123-131fps). Polish round 2: restored the user-remembered ORIGINAL 5 ghosts /
  // 55ms (pre-detune values were never committed — see the Comet Halo note).
  { id: 32, name: 'Meteor Shower', trail: { count: 5, gapMs: 55 } },
  // TRUE Windows-3.1/95 cascade (imprint-cascade story, 2026-07-08): cards launch ONE
  // AT A TIME and leave permanent imprints along their bounce path. Deliberately NO
  // trail config — the imprints are a RENDERER feature (CascadeImprintLayer in
  // CelebrationOverlayLayer), not lagged ghosts. Kept IN ADDITION to Avalanche 31
  // (user decision: 31's parallel homage "is also cool"). wobble off: resting cards
  // wiggling looked "really weird" (user 2026-07-08) and Windows cards were static.
  { id: 33, name: 'Cascade Imprint', wobble: false, imprint: { policy: 'cascade' } },
  // Mode-uplift story (2026-07-08), user: "more meteor shower variants? crazy ones?".
  // Meteor Storm = "more cards visible at the same time": reduced offscreen span +
  // four coherent wave sheets (see case 34). Streaks stay spread out → trail-safe.
  { id: 34, name: 'Meteor Storm', trail: { count: 4, gapMs: 50 } },
  // Shooting Stars = the LONG-trail variant: 10 ghosts × 60 ms ≈ a solid 600 ms tail
  // (ghosts overlap into one luminous streak at the mode's slow speeds). 52×11 = 572
  // sprites — trivial for the Atlas single draw call (mode 33 ran 3.4k), and lanes
  // are spread so overdraw stays shallow.
  { id: 35, name: 'Shooting Stars', trail: { count: 10, gapMs: 60 } },
  // Spirograph (alignment/wild-imprint story 2026-07-08, user: "one new celebration
  // with mechanism from 33 but not classic, but wild"): all 52 cards fly at once on
  // quasi-periodic hypotrochoid orbits (see case 36) while the imprint surface
  // engraves their traces into a growing 4-ring mandala. Deliberately NO trail (the
  // imprint surface IS the trail) and wobble off (stamps must reproduce the live
  // card exactly — jitter would smear the engraving). launchStamps: stamp from
  // frame 0 INCLUDING the launch transit (full-review culling story, 2026-07-09 —
  // user liked the "kind of messy but also kind of cool" pile→orbit streaks the
  // schedule generalization had accidentally removed; Kaleidoscope 46 stays clean
  // on purpose, per the same review).
  {
    id: 36,
    name: 'Spirograph',
    wobble: false,
    imprint: { policy: 'path', launchStamps: true },
  },
  // Ten crazy modes (37-46, ten-crazy-modes story 2026-07-08, user: "implement all").
  // All imprint modes below are wobble-off: stamps are computed WITHOUT wobble, so a
  // wobbling live card would visibly separate from its own freshly laid ink.
  // Pinball: straight-ish diagonals ricocheting off all four edges; ink ONLY at the
  // wall contacts (two event streams: x walls, y walls) — walls collect impact marks.
  { id: 37, name: 'Pinball', wobble: false, imprint: { policy: 'events' } },
  // Pollock action painting: chaotic tumble (fast spin + deep scale swing) laying
  // opaque rotated/scaled stamps along the whole path.
  { id: 38, name: 'Pollock', wobble: false, imprint: { policy: 'path' } },
  // Fireworks: 13-card suit shells bursting from bottom volleys, long ghost tails.
  // Imprint REMOVED (tuning round 2, user 2026-07-12): real fireworks vanish — the
  // lingering burst rings read as distracting residue, not effect. Don't re-add.
  { id: 39, name: 'Fireworks', trail: { count: 6, gapMs: 60 }, wobble: false },
  // Black Hole: no imprint, no trail — the vanish/re-emerge cycle is the effect.
  { id: 40, name: 'Black Hole' },
  // Dominoes: still formation is the point — wobble would ruin the standing rows.
  { id: 41, name: 'Dominoes', wobble: false },
  // Warp Drive: the long trail IS the hyperspace streak. Perf detune 2026-07-09
  // (device run measured 10×50 ms at ~93–101 fps, 90th pct 24–26 ms — the cost is
  // radial translucent overdraw near the jump center, not the draw call): 10→7
  // ghosts (572→416 sprites) at 55 ms keeps a ~385 ms solid tail; paired with the
  // smaller card scale in case 42. Don't raise count/scale without re-measuring.
  { id: 42, name: 'Warp Drive', trail: { count: 7, gapMs: 55 } },
  // You Win: the card train writes "YOU / WIN!" in permanent ink (see case 43).
  { id: 43, name: 'You Win', wobble: false, imprint: { policy: 'path' } },
  // Solar System: crisp hierarchical orbits; short trails on ALL cards (trail config
  // is per-mode, not per-card — moons get the same 2 short ghosts as the planets,
  // which reads fine; a per-card trail split would need renderer surgery).
  { id: 44, name: 'Solar System', trail: { count: 2, gapMs: 80 }, wobble: false },
  // Gravity Flip: pure bounce mode. Rest imprints REMOVED entirely (full-review
  // culling story, 2026-07-09 — the single mark row per plane read as one stuck
  // card, not an effect; do not re-add without a new design).
  { id: 45, name: 'Gravity Flip', wobble: false },
  // Kaleidoscope: 4-fold mirrored wedges engraving a symmetric mandala. Wobble MUST
  // stay off — its phase uses randomSeed, which differs across wedge counterparts
  // and would break the symmetry.
  { id: 46, name: 'Kaleidoscope', wobble: false, imprint: { policy: 'path' } },
]

export const CELEBRATION_DURATION_MS = 60_000
export const CELEBRATION_WOBBLE_FREQUENCY = 5.5
export const TAU = Math.PI * 2

// Exported since polish round 2: the overlay's imprint sampler needs to convert
// normalized progress into raw units (the continuity test mirrors it on purpose).
export const CELEBRATION_SPEED_MULTIPLIER = 10.4
// PBI-28 follow-up: celebration cards must break out of stacked foundations immediately.
// This used to be done with a 0.08 launch head start, but that rendered frame 1 already
// ~22% toward the path — a visible one-frame snap off the piles. A steeper quint ease
// from exactly 0 keeps the breakout fast (~29% eased after 100ms) AND position-continuous.
// Exported since the cascade-fixes story: the overlay re-derives the launch ease from an
// ANCHORED progress (progress at the moment the atlas texture became ready) because the
// Skia renderer's canvas/texture init delays the first visible frame past the point where
// this ease has mostly saturated — see the launchAnchor comment in CelebrationOverlayLayer.
export const CELEBRATION_LAUNCH_SPEED_MULTIPLIER = 40
const FOUNDATION_STACK_MAX = 13

// Avalanche (mode 31) launch cadence, exported for the overlay's foundation-pile
// visibility rule (cascade-fixes story). 0.06 → 0.04 raw units 2026-07-08 (user: "make
// avalanche a bit faster"); 0.04 → 0.035 in tuning round 2 (2026-07-12, "a little bit
// faster" again, ~1.15× with matching drift/bounce speedups in case 31) ≈ 0.2 s
// between launches; the last card launches ~10.5 s in.
export const AVALANCHE_LAUNCH_INTERVAL_RAW = 0.035

// Cascade Imprint (mode 33) timing, shared between case 33 and the overlay's imprint
// sampler (both must agree on when each card flies). Polish round 2 (user 2026-07-08:
// "feels a bit slow"): launch interval 0.2 → 0.11 raw units. Tuning round 2
// (2026-07-12, "a little bit faster" again): 0.11 → 0.095 = 19/200 (≈0.55 s/card,
// deck done ≈ 28.5 s) with flight drift/fall ×1.15 in case 33.
//
// LATTICE CONSTRAINTS (re-derived 2026-07-12 — the first retune attempt, 3/32,
// FAILED the continuity suite): TWO event families must stay away from the
// integer-raw boundaries the suite samples (window ±0.00144 raw, ref sample at
// −0.00433):
// 1. LAUNCH times k·interval (k = launchOrder + 52·pass ≤ ~105): the launch is a
//    velocity KINK on a card whose reference delta is 0 (it was resting on the
//    pile) — a launch inside (boundary − ~0.0023, boundary + 0.0015) fails the
//    3×ref+2dp heuristic. 3/32 put k=32 EXACTLY on raw 3.0. With 19/200 the
//    closest launch for any k ≤ 105 is 0.005 below a boundary (k=21 → 1.995),
//    which sits safely BEFORE the reference sample; all others are ≥ 0.01 away.
// 2. RETURN-SNAP times k·interval + RETURN (position jump offscreen→base): only a
//    strict before/after straddle (±0.00144) is fatal (a snap in the ref window
//    just inflates the reference delta). Min distance 0.0045 (k=9 → 0.9955).
// If the interval changes again, re-derive BOTH families — launches included.
export const IMPRINT_LAUNCH_INTERVAL_RAW = 0.095
// Imprint sampling window per card: must cover the WORST-CASE exit (slowest drift
// ≈ boardWidth·1.1 at 8.6·boardWidth/raw ≈ 0.128 raw) or late imprints go missing.
export const IMPRINT_FLIGHT_SPAN_RAW = 0.135
// Cascade-fixes story (user item 5, 2026-07-08): after its flight the card returns to
// its foundation base and waits for its NEXT pass (launches wrap modulo the deck), so
// a King reappears on the pile right behind the last Ace — seamless repeat. The
// offscreen→base snap at launch + RETURN is invisible (alpha-gated in the overlay AND
// fully offscreen: worst exit 0.128 < 0.135 span < RETURN) but IS a position
// discontinuity — lattice-tuned per constraint 2 above.
export const IMPRINT_RETURN_RAW = 0.1405

// Spirograph (mode 36) imprint sampling cadence: every card stamps once per this many
// raw units (absolute lattice — all 52 cards fly for the whole run, so unlike mode 33
// there are no launch windows). 0.01 raw ≈ 58 ms ≈ 9-12 dp of path per stamp at the
// mode's speeds — stamps overlap into solid engraved ribbons. Budget: 52 cards /
// 0.01 raw ≈ 9 stamps per 120 Hz frame, comfortably cheap for the offscreen surface.
export const SPIRO_STAMP_INTERVAL_RAW = 0.01

// ---------------------------------------------------------------------------
// Ten crazy modes (37-46) — shared constants, per-card param helpers, and the
// generalized imprint stamp schedules (ten-crazy-modes story, 2026-07-08).
// ---------------------------------------------------------------------------

// Cascade Imprint (mode 33) flight sampling density. Lives here (not in the
// overlay) since the imprint-config generalization: the schedule functions below
// own ALL stamp timing, the renderer just replays them write-once.
const IMPRINT_SAMPLES_PER_CARD = 110

// Path-lattice stamp cadences (raw units between stamps, per card). Budgets at
// 120 Hz (frame = 0.00144 raw): Pollock ~3.8, You-Win ~9.4, Kaleidoscope ~6.3
// stamps/frame — same class as Spirograph's ~7.5, far under the 52/frame ceiling.
const POLLOCK_STAMP_INTERVAL_RAW = 0.02
const WINPATH_STAMP_INTERVAL_RAW = 0.008
const KALEIDO_STAMP_INTERVAL_RAW = 0.012

// Fireworks (39): one volley per suit per cycle (suit phase offset 0.25 cycles →
// a burst somewhere every ~0.8 s).
const FIREWORK_CYCLE_RAW = 0.55

// Gravity Flip (45): gravity inverts every epoch. 1.4 → 0.7 raw ≈ 4 s (tuning
// round 2, user 2026-07-12: "duration between going up and down significantly
// faster"). HARD FLOOR: the bounce chain settles at ≤ delay 0.06 + fall 0.12 +
// bounces 2·0.12·0.65/(1−0.65) ≈ 0.63 raw — epochs shorter than that break the
// rest-before-flip continuity contract (epoch boundaries are only continuous
// because the card is at rest on the source plane). Shrink gravityFlipParams
// first if this ever needs to go lower.
const GRAVITY_FLIP_EPOCH_RAW = 0.7
// Warp Drive (42) jump-epoch length (was shared with Gravity Flip until the
// 2026-07-12 retune; 42 keeps its ~8 s beat).
const WARP_EPOCH_RAW = 1.4

const fract = (v: number): number => {
  'worklet'
  return v - Math.floor(v)
}

// Smoothstep with clamping — the workhorse of the new modes: every phase
// transition uses it because its ZERO derivative at both ends keeps the
// continuity suite's boundary-vs-reference delta ratio bounded even when a test
// sample lands exactly on a phase junction (piecewise-LINEAR ramps are risky
// there: a sample straddling a plateau→ramp kink has reference delta ≈ 0).
const smooth01 = (t: number): number => {
  'worklet'
  const c = t < 0 ? 0 : t > 1 ? 1 : t
  return c * c * (3 - 2 * c)
}

// Triangle wave in [0, 1]: 0 at even integers of t, 1 at odd — a reflection off
// the "walls" 0/1 at every integer. Continuous everywhere (kinks are velocity-only).
const pingPong01 = (t: number): number => {
  'worklet'
  return 1 - Math.abs(1 - 2 * fract(t / 2))
}

// Pinball (37) per-card constants, shared by case 37 AND the stamp schedule so
// the wall-impact stamps land exactly where the live card reflects. Impacts on
// each axis happen exactly at the integer crossings of (raw·f + o).
const pinballParams = (assignment: CelebrationAssignment) => {
  'worklet'
  const seed = assignment.randomSeed
  const s2 = fract(seed * 7.5313 + 0.19)
  const s3 = fract(seed * 12.9898 + 0.41)
  const s4 = fract(seed * 4.7177 + 0.63)
  return {
    // Reflections per raw unit per axis — incommensurate so paths never repeat.
    // ×1.15 (full-review culling story, 2026-07-09, user: "a tiny bit faster"),
    // then ×1.35 on top (tuning round 2, 2026-07-12, user: "faster, but actually
    // more than a little bit") — ×1.55 total vs the original.
    fx: (0.85 + 0.75 * s2) * 1.55,
    fy: (1.05 + 0.85 * s3) * 1.55,
    // Offsets tightened to [3.0, 3.08] with the ×1.55 speedup so the FIRST impact
    // still lands ≥ ~0.31 raw in (worst case (4−o)/f = 0.92/2.945), after the
    // anchored launch blend has saturated (stamps are computed with the blend
    // applied — an earlier impact would be skipped by the stamp loop's blend
    // guard, i.e. a missing wall mark, not stray ink; keep it out of the window).
    ox: 3.0 + 0.08 * seed,
    oy: 3.0 + 0.08 * s4,
  }
}

// Gravity Flip (45) per-card constants (rest imprints removed 2026-07-09, so this
// only feeds case 45's motion now; restOffset stays exported-shape for the math).
// restitution ≤ 0.65 caps the bounce chain at ~0.63 raw — well inside the epoch.
const gravityFlipParams = (assignment: CelebrationAssignment) => {
  'worklet'
  const seed = assignment.randomSeed
  const sA = fract(seed * 12.9898 + 0.17)
  const sB = fract(seed * 7.5313 + 0.43)
  const sC = fract(seed * 4.7177 + 0.71)
  const delay = 0.06 * sA
  const fallTime = 0.09 + 0.03 * sB
  const restitution = 0.4 + 0.25 * sC
  const bounceTotal = (2 * fallTime * restitution) / (1 - restitution)
  return { delay, fallTime, restitution, restOffset: delay + fallTime + bounceTotal }
}

// You Win (43) letter strokes. Format: per glyph a list of pen strokes, each a
// polyline of [x, y] points in a LOCAL 1×1 box (y DOWN, screen-style). The
// builder lays glyphs out in message space (fractions of the board), inserts
// pen-up MOVE segments between strokes, and arc-length-parametrizes the whole
// thing (y weighted 2× to approximate the portrait board aspect, so traversal
// speed is roughly uniform in dp). Cards ping-pong along the total length.
const WIN_GLYPHS: Record<string, number[][][]> = {
  Y: [
    [
      [0, 0],
      [0.5, 0.45],
    ],
    [
      [1, 0],
      [0.5, 0.45],
      [0.5, 1],
    ],
  ],
  O: [
    [
      [0.5, 0],
      [0.85, 0.15],
      [1, 0.5],
      [0.85, 0.85],
      [0.5, 1],
      [0.15, 0.85],
      [0, 0.5],
      [0.15, 0.15],
      [0.5, 0],
    ],
  ],
  U: [
    [
      [0, 0],
      [0, 0.72],
      [0.2, 1],
      [0.8, 1],
      [1, 0.72],
      [1, 0],
    ],
  ],
  W: [
    [
      [0, 0],
      [0.25, 1],
      [0.5, 0.3],
      [0.75, 1],
      [1, 0],
    ],
  ],
  I: [
    [
      [0.5, 0],
      [0.5, 1],
    ],
  ],
  N: [
    [
      [0, 1],
      [0, 0],
      [1, 1],
      [1, 0],
    ],
  ],
  // "!" = bar + CLEAR gap + dot (full-review culling story, 2026-07-09 — the user
  // screenshot showed it rendering as one full line; the old 0.6→0.82 gap was
  // narrower than a card and got bridged visually). Gap widened again 0.30 → 0.40
  // of the glyph (tuning round 2, 2026-07-12: "a tiny little bit more space
  // between the long part and the dot") — bar shortened AND dot pushed down.
  '!': [
    [
      [0.5, 0],
      [0.5, 0.48],
    ],
    [
      [0.5, 0.88],
      [0.5, 1],
    ],
  ],
}

// [glyph, x, y, width, height] in message space (board fractions). "YOU" / "WIN!"
// over two lines — picked over one-line "WIN!" for legibility on a portrait board.
// "!" narrowed + pushed right 2026-07-09: its bar was reading as glued to the N
// (cards are ~0.05 board widths wide at scale 0.34 — the old 0.06 gap disappeared
// under them; now the N→! gap is 0.10 ≈ two card widths).
const WIN_LAYOUT: [string, number, number, number, number][] = [
  ['Y', 0.09, 0.24, 0.22, 0.14],
  ['O', 0.39, 0.24, 0.22, 0.14],
  ['U', 0.69, 0.24, 0.22, 0.14],
  ['W', 0.06, 0.46, 0.26, 0.14],
  ['I', 0.38, 0.46, 0.1, 0.14],
  ['N', 0.54, 0.46, 0.22, 0.14],
  ['!', 0.86, 0.46, 0.06, 0.14],
]

const buildWinPath = () => {
  const x0: number[] = []
  const y0: number[] = []
  const x1: number[] = []
  const y1: number[] = []
  const len: number[] = []
  const cum: number[] = []
  const draw: number[] = []
  let total = 0
  let penX: number | null = null
  let penY = 0
  const pushSegment = (ax: number, ay: number, bx: number, by: number, isDraw: number) => {
    const weighted = Math.max(1e-6, Math.hypot(bx - ax, 2 * (by - ay)))
    x0.push(ax)
    y0.push(ay)
    x1.push(bx)
    y1.push(by)
    draw.push(isDraw)
    cum.push(total)
    len.push(weighted)
    total += weighted
  }
  let firstX = 0
  let firstY = 0
  for (const [glyph, gx, gy, gw, gh] of WIN_LAYOUT) {
    for (const stroke of WIN_GLYPHS[glyph]) {
      const points = stroke.map(([px, py]) => [gx + px * gw, gy + py * gh])
      if (penX !== null) {
        pushSegment(penX, penY, points[0][0], points[0][1], 0)
      } else {
        firstX = points[0][0]
        firstY = points[0][1]
      }
      for (let i = 1; i < points.length; i += 1) {
        pushSegment(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], 1)
      }
      penX = points[points.length - 1][0]
      penY = points[points.length - 1][1]
    }
  }
  // Closing pen-up connector back to the very first stroke: the path becomes a
  // CLOSED LOOP, so case 43's forward fract() traversal is position-continuous at
  // the wrap (d = total and d = 0 are the same point) — no ping-pong needed. The
  // long connector doubles as the waiting room where the card train hides
  // (opacity-dipped) before entering the message.
  if (penX !== null) {
    pushSegment(penX, penY, firstX, firstY, 0)
  }
  return {
    x0,
    y0,
    x1,
    y1,
    len,
    cum,
    draw,
    total,
    count: draw.length,
    // Where the closing connector begins, as a fraction of the loop — the train's
    // parking spot at raw 0 (see WIN_PHASE0 below).
    connectorStart: cum[cum.length - 1] / total,
  }
}

// Plain object of number arrays — serializes cleanly into the worklet closure.
const WIN_PATH = buildWinPath()

// Stroke-order fix (full-review culling story, 2026-07-09, user screenshot read
// "rOU WIN"): the train used to START at d = 0 — ON the Y's first stroke — so the
// Y's top-left diagonal was traversed entirely inside the launch blend, its stamps
// were skipped (blended ink is never laid), and the stroke only appeared a full
// lap later. Parking the whole train on the closing PEN-UP connector at raw 0
// makes it march INTO the Y a moment later (blend long saturated for most of the
// train), so every letter inks in natural stroke order: Y completes before O, etc.
const WIN_PHASE0 = WIN_PATH.connectorStart
// Train span capped to the connector so ALL cards start parked on it (was a fixed
// 0.18 of the loop regardless of where that landed).
const WIN_TRAIN_SPAN = (1 - WIN_PATH.connectorStart) * 0.92
// Lap speed via a fixed dp budget instead of a fixed laps/raw: the continuity
// suite allows 2 dp of unexplained movement per sample window (2 half-frames =
// 0.00289 raw) at polyline junctions where one axis's reference delta ≈ 0, and
// window dp = speed·total·0.00289·boardWidth (the y weight of 2 makes both axes
// scale with boardWidth). speed·total = 1.65 → 1.91 dp worst-case window (old
// 0.2 laps/raw on total ≈ 7.58 was 1.75 dp — its "480 dp/raw" comment had
// underestimated the path length) — lap 26.5 s vs 28.8 s, ~9% faster (user:
// "could be a little bit faster"; the hard 2 dp cap forbids more without
// shrinking the path). Do not raise the 1.65 budget.
const WIN_SPEED = 1.65 / WIN_PATH.total

// ---------------------------------------------------------------------------
// Generalized imprint stamp schedules (ten-crazy-modes story): the renderer's
// CascadeImprintLayer replays these write-once — for every imprint mode it asks
// "how many stamps are due by rawProgress?" (monotonic count) and "at which raw
// time does stamp n fire?", then draws the mode frame frozen at that time. The
// schedules live HERE, next to the mode math, because event stamps must derive
// from the SAME per-card constants as the motion (pinballParams etc.) — a
// renderer-side duplicate would drift. Mode 33's flight-window sampler and 36's
// lattice moved into this switch verbatim from the overlay.
// ---------------------------------------------------------------------------

// WORKLET ORDERING RULE (mode-33 crash fix, 2026-07-09): a worklet that calls
// another worklet in this file must be defined AFTER its callee. The worklets
// babel plugin snapshots a worklet's closure when its `const` initializer runs
// at module init — a later-defined const is still uninitialized then (TDZ,
// transpiled to var → undefined) and stays undefined FOREVER in the UI-runtime
// copy. Plain JS calls resolve at call time, so typecheck/jest can't catch it;
// the failure is a deterministic on-device crash ("undefined is not a function"
// inside useAnimatedReaction). getImprintLaunchOrder therefore lives ABOVE the
// schedule functions that call it (it used to sit ~110 lines below — that
// crashed mode 33 within ~1 s of mounting).
//
// Sorted launch order for Cascade Imprint (user item 6, 2026-07-08): Windows-style —
// Kings first, cycling the four foundations (K,K,K,K,Q,Q,Q,Q,…). stackIndex is the
// position in the foundation pile: 0 = Ace (bottom) … 12 = King (top) — verified in
// useCelebrationController (pile.forEach / DEAL_RANKS are Ace→King). Derived from the
// assignment's intrinsic fields, so the controller's visual shuffle (kept for all
// other modes) does not matter here.
export const getImprintLaunchOrder = (assignment: CelebrationAssignment): number => {
  'worklet'
  return (
    (FOUNDATION_STACK_MAX - 1 - assignment.stackIndex) * 4 + assignment.suitIndex
  )
}

// Independent event streams per card: Pinball stamps x-wall and y-wall impacts
// on two separate monotonic counters; every other imprint mode has one stream.
export const getImprintStreamCount = (modeId: number): number => {
  'worklet'
  return modeId === 37 ? 2 : 1
}

export const getImprintStampCount = (
  modeId: number,
  assignment: CelebrationAssignment,
  rawProgress: number,
  totalCards: number,
  stream: number
): number => {
  'worklet'
  switch (modeId) {
    case 33: {
      // Per-launch flight windows, cumulative across the seamless-repeat passes
      // (moved from the overlay; see case 33 + IMPRINT_LAUNCH_INTERVAL_RAW).
      const launchStart =
        getImprintLaunchOrder(assignment) * IMPRINT_LAUNCH_INTERVAL_RAW
      const rel = rawProgress - launchStart
      if (rel < 0) {
        return 0
      }
      const cycle = Math.max(totalCards, 1) * IMPRINT_LAUNCH_INTERVAL_RAW
      const pass = Math.floor(rel / cycle)
      const tIn = rel - pass * cycle
      return (
        pass * IMPRINT_SAMPLES_PER_CARD +
        Math.min(
          IMPRINT_SAMPLES_PER_CARD,
          Math.max(
            0,
            Math.floor((tIn / IMPRINT_FLIGHT_SPAN_RAW) * IMPRINT_SAMPLES_PER_CARD)
          )
        )
      )
    }
    case 36:
      return Math.max(0, Math.floor(rawProgress / SPIRO_STAMP_INTERVAL_RAW))
    case 37: {
      // Wall impacts = integer crossings of raw·f + o (see pinballParams).
      const params = pinballParams(assignment)
      const f = stream === 0 ? params.fx : params.fy
      const o = stream === 0 ? params.ox : params.oy
      return Math.max(0, Math.floor(f * rawProgress + o) - Math.floor(o))
    }
    case 38:
      return Math.max(0, Math.floor(rawProgress / POLLOCK_STAMP_INTERVAL_RAW))
    // Case 39 removed 2026-07-12 (Fireworks is imprint-free now — see metadata).
    case 43:
      return Math.max(0, Math.floor(rawProgress / WINPATH_STAMP_INTERVAL_RAW))
    // Case 45 removed 2026-07-09 (Gravity Flip is imprint-free now — see metadata).
    case 46:
      return Math.max(0, Math.floor(rawProgress / KALEIDO_STAMP_INTERVAL_RAW))
    default:
      return 0
  }
}

export const getImprintStampRaw = (
  modeId: number,
  assignment: CelebrationAssignment,
  n: number,
  totalCards: number,
  stream: number
): number => {
  'worklet'
  switch (modeId) {
    case 33: {
      const launchStart =
        getImprintLaunchOrder(assignment) * IMPRINT_LAUNCH_INTERVAL_RAW
      const cycle = Math.max(totalCards, 1) * IMPRINT_LAUNCH_INTERVAL_RAW
      const samplePass = Math.floor(n / IMPRINT_SAMPLES_PER_CARD)
      const sampleIndex = n - samplePass * IMPRINT_SAMPLES_PER_CARD
      return (
        launchStart +
        samplePass * cycle +
        ((sampleIndex + 1) / IMPRINT_SAMPLES_PER_CARD) * IMPRINT_FLIGHT_SPAN_RAW
      )
    }
    case 36:
      return (n + 1) * SPIRO_STAMP_INTERVAL_RAW
    case 37: {
      const params = pinballParams(assignment)
      const f = stream === 0 ? params.fx : params.fy
      const o = stream === 0 ? params.ox : params.oy
      return (Math.floor(o) + 1 + n - o) / f
    }
    case 38:
      return (n + 1) * POLLOCK_STAMP_INTERVAL_RAW
    case 43:
      return (n + 1) * WINPATH_STAMP_INTERVAL_RAW
    case 46:
      return (n + 1) * KALEIDO_STAMP_INTERVAL_RAW
    default:
      return 0
  }
}

export type CelebrationFrameInput = {
  modeId: number
  assignment: CelebrationAssignment
  metrics: { width: number; height: number }
  // floorY: y of the VISIBLE floor (boardHeight − bottom safe-area inset). Optional
  // with a boardHeight fallback so callers without inset data keep the old behavior.
  board: { width: number; height: number; floorY?: number }
  totalCards: number
  progress: number
}

export type CelebrationFrameResult = {
  pathX: number
  pathY: number
  rotation: number
  targetScale: number
  targetOpacity: number
  launchEased: number
  rawProgress: number
  relativeIndex: number
  normalizedIndex: number
  stackFactor: number
}

// Exported for the overlay's anchored launch blend (cascade-fixes story).
export const easeOutQuint = (t: number): number => {
  'worklet'
  return 1 - Math.pow(1 - t, 5)
}

/**
 * Compute the target animation frame for a given celebration mode.
 *
 * This mirrors the switch statement originally embedded in the Klondike screen and keeps
 * the underlying math centralized so that UI code can remain lean.
 */
export function computeCelebrationFrame({
  modeId,
  assignment,
  metrics,
  board,
  totalCards,
  progress,
}: CelebrationFrameInput): CelebrationFrameResult | null {
  'worklet'

  const boardWidth = board?.width ?? 0
  const boardHeight = board?.height ?? 0
  // Per-mode floor semantics (renderer-polish story, user decision 2026-07-08): ONLY
  // modes that treat the bottom as a physical RESTING/bouncing floor (31 Avalanche,
  // 28 Big Bounce, 33 Cascade Imprint) use this inset-aware floor, so cards don't settle inside
  // the Android nav dock. PASS-THROUGH modes (20 Fountain, 21 Card Rain, 32 Meteor, …)
  // deliberately keep full boardHeight — cards flying through the dock area is cool.
  const visibleFloorY = board?.floorY ?? boardHeight

  if (boardWidth <= 0 || boardHeight <= 0) {
    return null
  }

  const safeTotalCards = Math.max(totalCards, 1)
  const totalProgress = progress * CELEBRATION_SPEED_MULTIPLIER
  // Never wrap this with `% 1`: several modes use non-integer frequency multipliers
  // (e.g. `theta * 1.5` in modes 2/3/10, `theta * 1.7` / `theta * 2.3` in mode 11) and the
  // overlay wobble runs at 5.5 * 1.25 / 5.5 * 0.95 — none of which are periodic over one
  // cycle. Wrapping caused a visible position/rotation jump every ~5.8s in those modes.
  // Unwrapped progress keeps every path continuous by construction (guarded by
  // test/unit/animation/celebrationModes.test.ts).
  const rawProgress = totalProgress
  const launchProgress = Math.min(
    1,
    Math.max(0, progress * CELEBRATION_LAUNCH_SPEED_MULTIPLIER)
  )
  const launchEased = easeOutQuint(launchProgress)
  const seed = assignment.randomSeed
  const relativeIndex = assignment.index - safeTotalCards / 2
  const normalizedIndex = (assignment.index + 1) / safeTotalCards
  const stackFactor = Math.min(
    1,
    Math.max(0, assignment.stackIndex / FOUNDATION_STACK_MAX)
  )
  const theta = TAU * rawProgress
  const thetaSeed = TAU * (rawProgress + seed)
  const thetaDouble = TAU * (rawProgress * 2 + seed * 0.5)
  const direction = assignment.index % 2 === 0 ? 1 : -1

  const boardRadius = Math.min(boardWidth, boardHeight)
  const centerX = boardWidth / 2 - metrics.width / 2
  const centerY = boardHeight / 2 - metrics.height / 2

  let pathX = assignment.baseX
  let pathY = assignment.baseY
  let rotation = 0
  let targetScale = 1
  let targetOpacity = 1

  // Switch directly on the stable mode id (see CELEBRATION_MODE_METADATA); a retired or
  // unknown id falls through to the default orbit instead of being remapped by modulo.
  switch (modeId) {
    case 0: {
      const radius = boardRadius * (0.24 + 0.18 * Math.sin(thetaDouble))
      pathX =
        centerX + Math.cos(thetaSeed) * radius + relativeIndex * metrics.width * 0.25
      pathY = centerY + Math.sin(thetaSeed) * radius - stackFactor * metrics.height * 0.4
      rotation = (thetaSeed * 180) / Math.PI
      targetScale = 1 + 0.06 * Math.sin(theta * 2 + stackFactor)
      break
    }
    // Lissajous Weave (uplift 2026-07-08, was in the user's "boring" set): the figure
    // is traced with a time-warped phase (speed 0.7-1.3x, rushing through crossings and
    // lingering at the lobes), bigger amplitudes, stronger scale breath, plus a trail.
    // The warp is phase-based (theta + c*sin) so it is continuous by construction.
    // Rounder (tuning round 2, user 2026-07-12: "a little bit rounder, not just up
    // and down"): y blends the 1:2 Lissajous term with a QUADRATURE cos(warped) —
    // (sin φ, cos φ) is a circle, so the trace loops in open rounded arcs instead
    // of scanning vertically. Pure sines, continuity-safe.
    case 1: {
      const warped = theta + 0.6 * Math.sin(theta * 0.5)
      const ampX = boardRadius * (0.36 + 0.1 * Math.sin(thetaDouble))
      const ampY = boardRadius * (0.3 + 0.06 * Math.cos(thetaDouble + seed))
      pathX = centerX + Math.sin(warped) * ampX
      pathY =
        centerY +
        (0.55 * Math.sin(warped * 2 + seed * TAU) + 0.45 * Math.cos(warped)) * ampY
      rotation = (Math.sin(warped) * 540) / Math.PI
      targetScale = 1 + 0.18 * Math.sin(theta * 2 + normalizedIndex)
      break
    }
    // Pendulum Cascade (uplift 2026-07-08, "boring" set): taller swings, a wider
    // per-card fan, a slow whole-field horizontal sway, and more scale play + trail.
    // Rounder (tuning round 2, user 2026-07-12, same request as mode 1): y gains a
    // quadrature term at the SWING's own frequency (x = sin(1.5θ+…), extra
    // y = −cos of the same argument → elliptical loops), so each swing traces an
    // open oval instead of retracing its line. Main vertical term scaled down to
    // keep the total y amplitude ≈ unchanged.
    case 2: {
      const ampX = boardRadius * (0.22 + stackFactor * 0.16)
      const ampY = boardRadius * 0.44
      const fieldSway = Math.sin(theta * 0.35) * boardRadius * 0.1
      const swingPhase = theta * 1.5 + seed * TAU
      pathX = centerX + fieldSway + Math.sin(swingPhase) * ampX
      pathY =
        centerY -
        (0.75 * Math.cos(theta + seed * 0.5) + 0.28 * Math.cos(swingPhase)) * ampY
      rotation = (theta * 360) / Math.PI
      targetScale = 1 + 0.14 * Math.cos(theta * 3 + seed)
      break
    }
    // Orbit Carousel (uplift 2026-07-08, user: "faster when outside of ring?").
    // Ring-closure fix (full-review culling story, 2026-07-09, user screenshot: a
    // persistent ~2-card gap at the top of the ring): the old per-card terms
    // (seed*TAU angular scatter + a speed warp whose phase used normalizedIndex)
    // stretched spacing unevenly, leaving a permanent hole where the warp piled
    // cards up. Now every card rides the SAME warped trajectory at a uniform TIME
    // offset, and the chain provably closes: with t_i = raw + (i/52)*(2/3), the
    // base term 1.5*TAU*t spreads i over exactly one full turn, and the warp/breath
    // frequency 3 (in t) has period 1/3, which divides the chain span 2/3 — so
    // card 52 lands exactly on card 0. The whip-when-out feel survives: angular
    // speed 1.5*TAU + 1.35*TAU*sin(3*TAU*t) peaks exactly when the radius breath
    // peaks. Don't reintroduce seed into angle/radius — that's what opened the gap.
    case 3: {
      const t = rawProgress + ((assignment.index / safeTotalCards) * 2) / 3
      const warpPhase = 3 * TAU * t
      const angle = 1.5 * TAU * t - 0.45 * Math.cos(warpPhase)
      const radius = boardRadius * (0.25 + 0.2 * Math.sin(warpPhase))
      pathX = centerX + Math.cos(angle) * radius
      pathY = centerY + Math.sin(angle) * radius
      rotation = (angle * 180) / Math.PI
      targetScale = 1 + 0.07 * Math.sin(theta + stackFactor)
      break
    }
    // Cases 4/7/11/14/15/16/18/19 retired 2026-07-09 — see the tombstone above
    // CELEBRATION_MODE_METADATA. A retired id falls through to the default orbit.
    // Starburst Spur — REBUILT (uplift 2026-07-08, user: "has potential, but hard to
    // see concept"). Old version gave every card its own fast seed-phased spur, which
    // read as noise. Now a coherent radial FIREWORK: cards sit on fixed spokes
    // (normalizedIndex), and ONE shared smoothstepped burst throws them all from a
    // tight core out to 0.48R and pulls them back (~4s period). Cards align to their
    // spoke and grow on the way out. Tiny stackFactor phase lag = bloom ripple.
    case 5: {
      const spokeAngle = normalizedIndex * TAU * 3 + theta * 0.12
      const burstWave =
        0.5 + 0.5 * Math.sin(theta * 1.5 - Math.PI / 2 + stackFactor * 0.35)
      const burst = burstWave * burstWave * (3 - 2 * burstWave)
      const radius = boardRadius * (0.05 + 0.43 * burst)
      pathX = centerX + Math.cos(spokeAngle) * radius
      pathY = centerY + Math.sin(spokeAngle) * radius
      rotation = (spokeAngle * 180) / Math.PI + 90
      targetScale = 0.8 + 0.5 * burst
      break
    }
    case 6: {
      const angle = theta * 2 + seed * TAU * direction
      const radius = boardRadius * (0.16 + 0.18 * Math.sin(theta + direction * 0.5))
      pathX =
        centerX +
        direction * Math.cos(angle) * radius +
        relativeIndex * metrics.width * 0.2
      pathY = centerY + Math.sin(angle) * radius
      rotation = (angle * 180) / Math.PI
      targetScale = 1 + 0.04 * Math.sin(theta * 3 + stackFactor)
      break
    }
    // Ring Cascade (uplift 2026-07-08, "potential for more"): the old version gave all
    // cards of a ring the SAME angle (no per-card term) — each "ring" was really an
    // orbiting clump. Now cards spread around their ring (posInRing) and the four full
    // rings counter-rotate at ring-dependent speeds. Ring clamped to 3: normalizedIndex
    // hits exactly 1 for the last card, which used to leak into a phantom 5th ring.
    case 8: {
      const ring = Math.min(3, Math.floor(normalizedIndex * 4))
      const posInRing = normalizedIndex * 4 - ring
      const ringDirection = ring % 2 === 0 ? 1 : -1
      const radius =
        boardRadius * (0.13 + 0.1 * ring + 0.03 * Math.sin(theta * 3 + seed))
      const angle = ringDirection * theta * (0.8 + ring * 0.3) + posInRing * TAU
      pathX = centerX + Math.cos(angle) * radius
      pathY = centerY + Math.sin(angle) * radius
      rotation = (angle * 180) / Math.PI + ring * 20
      targetScale = 1 + ring * 0.05 + 0.04 * Math.sin(theta * 4 + seed)
      break
    }
    // Drift Orbit (uplift 2026-07-08, "potential for more"): stronger drift, slightly
    // faster orbit, more scale play, trail added in metadata.
    case 9: {
      const angle = theta * 1.15 + seed
      const drift = Math.sin(thetaDouble) * boardRadius * 0.18
      pathX = centerX + Math.cos(angle) * boardRadius * 0.3 + drift
      pathY = centerY - Math.sin(angle) * boardRadius * 0.36 + drift * 0.6
      rotation = (angle * 180) / Math.PI + drift * 10
      targetScale = 1 + 0.12 * Math.sin(theta * 2 + stackFactor)
      break
    }
    case 10: {
      const angle = theta * 1.5 + stackFactor * 2
      const radius = boardRadius * (0.2 + 0.18 * Math.sin(theta * 2 + seed))
      pathX = centerX + Math.cos(angle) * radius
      pathY = centerY + Math.sin(angle) * radius - stackFactor * metrics.height * 0.3
      rotation = (angle * 180) / Math.PI
      targetScale = 1 + stackFactor * 0.08 + 0.04 * Math.sin(theta)
      break
    }
    case 12: {
      const columnOffset = relativeIndex * metrics.width * 0.4
      const angle = theta * 2 + seed
      const radiusY = boardRadius * (0.2 + 0.1 * Math.sin(theta + columnOffset * 0.01))
      pathX = centerX + columnOffset
      pathY = centerY + Math.sin(angle) * radiusY
      rotation = (angle * 180) / Math.PI
      targetScale = 1 + 0.03 * Math.cos(theta * 4 + columnOffset)
      break
    }
    // Aurora Twist — even-ring rebuild (full-review culling story, 2026-07-09,
    // user screenshot: circular phase was lumpy with an overlap seam bottom-left).
    // Root cause: the angle used seed*TAU*2 — RANDOM angular spacing, so cards
    // clumped and left a seam — and the radius/shimmer phases used raw seed too,
    // giving neighbors different radii. Now cards sit at uniform normalizedIndex
    // angles and every per-card phase term is an INTEGER multiple of that phase,
    // so the curve closes on itself cleanly. Aurora character preserved: shared
    // time-breath (can sweep through the center — the "twist"), a small 3-lobed
    // traveling ripple, and the horizontal shimmer.
    case 13: {
      const phase = normalizedIndex * TAU
      const angle = theta + phase
      const radius =
        boardRadius *
        (0.18 + 0.22 * Math.sin(theta * 4) + 0.04 * Math.sin(theta * 3 + phase * 3))
      pathX =
        centerX +
        Math.cos(angle) * radius +
        Math.sin(theta * 3 + phase * 2) * metrics.width * 0.2
      pathY = centerY + Math.sin(angle) * radius
      rotation = (angle * 180) / Math.PI
      targetScale = 1 + 0.05 * Math.sin(theta * 5 + phase)
      targetOpacity = 0.8 + 0.2 * Math.sin(theta * 2 + phase)
      break
    }
    // Clover Spin — REBUILT (uplift 2026-07-08, user: "has potential, but hard to see
    // concept"). Old version modulated every card's own orbit with a shared sin(3θ) —
    // no clover was ever drawn. Now the card train traces an actual 4-petal rose
    // r = |sin 2φ| (cards spread along the full curve via normalizedIndex, so the
    // clover is drawn in card outlines at every instant) while the whole rose slowly
    // spins. Cards grow toward the petal tips. |sin| kinks are velocity-only — fine.
    case 17: {
      const phi = theta * 0.5 + normalizedIndex * TAU
      const petal = Math.abs(Math.sin(2 * phi))
      const radius = boardRadius * 0.44 * petal
      const spin = theta * 0.1
      pathX = centerX + Math.cos(phi + spin) * radius
      pathY = centerY + Math.sin(phi + spin) * radius
      rotation = ((phi + spin) * 180) / Math.PI
      targetScale = 0.85 + 0.4 * petal
      break
    }
    // Fountain: staggered parabolic jets from bottom-center. The arc starts and ends at
    // the same offscreen y (parabola zeros at u=0/1), so the per-card cycle wrap is
    // position-continuous by construction — no visible teleport. Pass-through floor on
    // purpose: jets erupt from BELOW the screen through the dock area (see the
    // visibleFloorY comment at the top — do not switch this to the inset-aware floor).
    case 20: {
      const cardH = metrics.height
      const u0 = rawProgress * (0.8 + 0.4 * seed) + seed * 7 + normalizedIndex
      const u = u0 - Math.floor(u0)
      const floorY = boardHeight + cardH * 3
      const apex = boardHeight * (0.75 + 0.2 * seed) + cardH * 3
      pathX =
        centerX +
        relativeIndex * metrics.width * 0.22 +
        Math.sin(theta * 0.9 + seed * TAU) * metrics.width * 0.5
      pathY = floorY - apex * 4 * u * (1 - u)
      rotation = ((theta * (0.8 + 0.4 * seed) * 180) / Math.PI) * direction
      targetScale = 1 + 0.05 * Math.sin(theta * 2 + seed)
      break
    }
    // Card Rain: continuous fall with offscreen respawn. Fall span = board + 8 card
    // heights so both wrap endpoints sit 4 card heights beyond an edge — a full 2 card
    // heights of slack past the >= 2 card sizes offscreen exemption (samples taken a
    // hair around the wrap must still qualify as fully offscreen), never visible.
    case 21: {
      const cardH = metrics.height
      const span = boardHeight + cardH * 8
      const u0 = rawProgress * (0.7 + 0.6 * seed) + seed * 3 + normalizedIndex
      const u = u0 - Math.floor(u0)
      pathX =
        boardWidth * normalizedIndex -
        metrics.width / 2 +
        Math.sin(theta * 0.7 + seed * TAU) * metrics.width * 0.6
      pathY = u * span - cardH * 4
      rotation = ((theta * (0.15 + 0.2 * seed) * 180) / Math.PI) * direction
      targetScale = 1 + 0.04 * Math.sin(theta * 1.3 + seed * TAU)
      break
    }
    // Vortex: spiral whose radius breathes between ~0.05 and ~0.4 boardRadius; cards
    // shrink toward the center for depth. Uplift 2026-07-08 ("potential for more"):
    // swirl slightly faster, deeper scale contrast (0.57-1.05), short trail smears
    // the arms (kept tight — the funnel clusters cards, see the metadata comment).
    case 22: {
      const angle = theta * 1.35 + normalizedIndex * TAU
      const radius = boardRadius * (0.225 - 0.175 * Math.cos(theta * 0.35 + normalizedIndex * 2))
      pathX = centerX + Math.cos(angle) * radius
      pathY = centerY + Math.sin(angle) * radius
      rotation = (angle * 180) / Math.PI
      targetScale = 0.55 + 0.5 * (radius / (boardRadius * 0.4))
      break
    }
    // Infinity Loop: figure-eight Lissajous train. Heading is approximated with a smooth
    // sine mix — exact atan2 heading would wrap +-180deg and trip the continuity guard.
    case 23: {
      const phi = theta + normalizedIndex * TAU
      pathX = centerX + Math.sin(phi) * boardRadius * 0.36
      pathY = centerY + Math.sin(phi * 2) * boardRadius * 0.22
      rotation = Math.cos(phi) * 45 + Math.cos(phi * 2) * 25
      targetScale = 1 + 0.05 * Math.sin(phi * 2 + seed)
      break
    }
    // Suit Orbits: four concentric rings, one per suit (uses suitIndex), 13 cards spaced
    // per ring, alternating direction and slightly different angular speeds.
    case 24: {
      const suitIndex = assignment.suitIndex
      const ringDirection = suitIndex % 2 === 0 ? 1 : -1
      const radius = boardRadius * (0.14 + 0.075 * suitIndex)
      const angle =
        ringDirection * theta * (1 + suitIndex * 0.15) +
        (assignment.stackIndex / FOUNDATION_STACK_MAX) * TAU
      pathX = centerX + Math.cos(angle) * radius
      pathY = centerY + Math.sin(angle) * radius
      rotation = (angle * 180) / Math.PI
      targetScale = 1 + 0.05 * Math.sin(theta * 2 + suitIndex)
      break
    }
    // Case 25 (Flock) retired 2026-07-12 (tuning round 2) — see the tombstone
    // above CELEBRATION_MODE_METADATA.
    // Shockwave: loose grid + radial gaussian bump. The wave radius ping-pongs via a
    // cosine (sweeps out and back) instead of a sawtooth reset, so it is continuous
    // everywhere by construction.
    case 26: {
      const col = assignment.index % 8
      const row = Math.floor(assignment.index / 8)
      const gridX = centerX + (col - 3.5) * boardRadius * 0.11
      const gridY = centerY + (row - 3) * boardRadius * 0.1
      const dx = gridX - centerX
      const dy = gridY - centerY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const waveRadius = boardRadius * 0.4 * (1 - Math.cos(theta * 0.8))
      const sigma = boardRadius * 0.08
      const bump = Math.exp(-((dist - waveRadius) * (dist - waveRadius)) / (2 * sigma * sigma))
      // dist > 0 always: col offset is never 0 (col - 3.5) so no division-by-zero.
      pathX = gridX + (dx / dist) * bump * metrics.width * 0.9
      pathY = gridY + (dy / dist) * bump * metrics.height * 0.9
      rotation = 8 * Math.sin(theta + seed * TAU) + bump * 25 * direction
      targetScale = 1 + 0.25 * bump
      break
    }
    // Galaxy: two-arm logarithmic spiral rotating slowly, vertical squash for
    // depth. Core/arm contrast boost (full-review culling story, 2026-07-09,
    // user: "interesting concept, but not that cool"): the first ~20% of cards
    // now form a BRIGHT DENSE CORE — big (1.25–1.4×), full-opacity, swirling
    // tightly — while arm cards taper from 1.05× down to 0.62× and dim toward
    // the rim, so the galaxy reads as nucleus + sweeping arms instead of a
    // uniform card spiral. Trails kept (metadata). Per-card piecewise split is
    // continuity-safe (the suite only checks continuity in TIME per card).
    case 27: {
      const isCore = normalizedIndex <= 0.2
      if (isCore) {
        const coreFrac = normalizedIndex / 0.2
        const coreAngle = theta * 0.9 + coreFrac * TAU * 2 + seed * TAU
        const coreRadius = boardRadius * (0.02 + 0.07 * coreFrac)
        pathX = centerX + Math.cos(coreAngle) * coreRadius
        pathY = centerY + Math.sin(coreAngle) * coreRadius * 0.75
        targetScale = 1.25 + 0.15 * Math.sin(theta * 2 + seed * TAU)
        targetOpacity = 1
      } else {
        const armFrac = (normalizedIndex - 0.2) / 0.8
        const armPhase = (assignment.index % 2) * Math.PI
        const radius = boardRadius * 0.1 * Math.exp(1.5 * armFrac)
        const angle = armPhase + armFrac * 4.4 + theta * 0.5
        pathX = centerX + Math.cos(angle) * radius
        pathY = centerY + Math.sin(angle) * radius * 0.75
        // Perf note (Android test, Story 5, 2026-07-07): this opacity twinkle was
        // suspected in Galaxy's 16fps lag but measured innocent — removing it
        // changed nothing; removing the trail ghosts fixed it (id-27 metadata).
        targetScale = 1.05 - 0.43 * armFrac + 0.05 * Math.sin(theta * 3 + seed * TAU)
        targetOpacity = 0.9 - 0.25 * armFrac + 0.1 * Math.sin(theta * 2.3 + seed * TAU)
      }
      rotation = (theta * 0.5 * 180) / Math.PI
      break
    }
    // Big Bounce — REBUILT (uplift 2026-07-08, user: "really similar to another one",
    // i.e. Avalanche 31's scattered bouncing). New identity: a synchronized bouncing
    // WALL — cards packed edge-to-edge across the full width, giant bounces (up to
    // ~0.62 boardHeight) with a stadium wave traveling through the wall (phase by
    // position) and a squash POP at each floor impact. Avalanche = chaotic flood;
    // Big Bounce = one choreographed wave-wall. |cos| bounce keeps the floor kink
    // velocity-only (continuity-safe); the wave phase is constant per card.
    case 28: {
      const wavePhase = normalizedIndex * TAU
      const bounce = Math.abs(Math.cos(theta * 1.5 - wavePhase))
      // Shared slow envelope: the whole wall's bounce height collapses and regrows.
      const envelope = 0.5 + 0.5 * Math.sin(theta * 0.25 + 1)
      const floorRestY = visibleFloorY - metrics.height
      const bounceHeight = boardHeight * (0.28 + 0.34 * envelope)
      pathX = boardWidth * normalizedIndex - metrics.width / 2
      pathY = floorRestY - bounceHeight * bounce
      rotation = 5 * Math.sin(theta * 1.5 - wavePhase)
      // Squash pop: pow(1-bounce, 4) spikes only in the instants around floor contact.
      targetScale = 1 + 0.22 * Math.pow(1 - bounce, 4)
      break
    }
    // Heartbeat: cards ride the classic parametric heart curve; the whole heart pulses in
    // a double-thump rhythm (two narrow sin^8 bumps close together per beat period).
    case 29: {
      // Travel speed 0.15 -> 0.5 (uplift 2026-07-08, user: "maybe make cards go
      // around faster?") — cards race the outline ~3.3x faster.
      const t = normalizedIndex * TAU + theta * 0.5
      const sinT = Math.sin(t)
      const heartX = 16 * sinT * sinT * sinT
      const heartY =
        13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
      const heartScale = (boardRadius * 0.35) / 17
      // Beat-synced POP (full-review culling story, 2026-07-09, user: "sure it
      // could pop a bit more"): beat rate raised to ~52 bpm (sin(2.5θ)^8 → period
      // ≈ 1.15 s vs the old ~2.9 s crawl), dub trails the lub by ~0.3 s (the
      // −0.94 rad phase ≈ 0.3 of the beat period), and BOTH the heart geometry
      // (0.06→0.10) and the card scale (0.12→0.3) kick with it — every card pops
      // in sync with the whole heart. sin^8 keeps the kick narrow (a real thump,
      // not a breath).
      const thump =
        Math.pow(Math.sin(theta * 2.5), 8) +
        0.7 * Math.pow(Math.sin(theta * 2.5 - 0.94), 8)
      pathX = centerX + heartX * heartScale * (1 + 0.1 * thump)
      // y flipped: the parametric heart is y-up, screen coords are y-down.
      pathY = centerY - heartY * heartScale * (1 + 0.1 * thump)
      rotation = Math.sin(theta * 0.8 + seed * TAU) * 20
      targetScale = 1 + 0.3 * thump
      break
    }
    // Diamond Drift: diamond outline via L1 mapping; cards drift along the perimeter.
    // Uplift 2026-07-08 (user: "it's a square, not a diamond, tilt is wrong"): the old
    // slow global spin was the bug — an L1 diamond rotated by ~45° IS an axis-aligned
    // square, so the shape cycled diamond→square every few seconds. The spin is
    // REMOVED (do not reintroduce a global rotation on corner-pinned shapes); corners
    // now stay pinned up/down/left/right. The rhombus is taller than wide (reads
    // better on portrait), breathes gently in size, and the perimeter drift is faster.
    case 30: {
      const phi = normalizedIndex * TAU + theta * 0.7
      const denom = Math.abs(Math.cos(phi)) + Math.abs(Math.sin(phi))
      // Gentle heartbeat-style pulse (full-review culling story, 2026-07-09 —
      // user review read as "same as Heartbeat" → give the diamond its own SOFT
      // beat): sin^4 (wider, calmer than Heartbeat's sin^8) at a slower rate,
      // single bump (no lub-dub), mild amplitudes — the shape stays clearly a
      // drifting diamond that quietly breathes to a pulse.
      const pulse = Math.pow(Math.sin(theta * 1.5), 4)
      const breath = 1 + 0.08 * Math.sin(theta * 0.5) + 0.05 * pulse
      pathX = centerX + ((boardRadius * 0.3 * breath) / denom) * Math.cos(phi)
      pathY = centerY + ((boardRadius * 0.46 * breath) / denom) * Math.sin(phi)
      rotation = Math.sin(theta + seed * TAU) * 10
      targetScale = 1 + 0.04 * Math.sin(theta * 2 + normalizedIndex) + 0.1 * pulse
      break
    }
    // Avalanche (formerly "Classic Cascade" — renamed 2026-07-08, it's its own
    // sliding/bouncing card flood; the true Windows cascade is mode 33). Continuity tricks:
    // - cards hold exactly at baseX/baseY until their staggered launch via
    //   tSince = max(0, ...) (position-continuous; the velocity kink at launch is fine);
    // - per-bounce parabola h = 4·H·u·(1-u) with u = frac(ω·tSince) is continuous because
    //   h = 0 at both ends of every bounce (H may change across the wrap without a jump);
    // - the initial drop is a smooth offset from floor level back up to baseY that decays
    //   quadratically after launch, so the bounce path starts exactly at baseY;
    // - horizontal wrap span = board + 8 card widths, endpoints 4 card widths offscreen
    //   (offscreen-teleport exemption, with slack per the Card Rain learning).
    case 31: {
      const cardW = metrics.width
      const cardH = metrics.height
      // Cascade-fixes story (user 2026-07-08: "make avalanche a bit faster"): cadence
      // 0.06 → 0.04 raw, drift ×~1.44, bounce freq ×1.2, initial-drop time
      // 0.35 → 0.25. Tuning round 2 (2026-07-12, "a little bit faster" again,
      // ~×1.15): cadence 0.04 → 0.035 (last launch ~10.5 s in), drift/bounce
      // freq/envelope ×1.15, drop 0.25 → 0.22. Constants only — continuity-safe.
      const tSince = Math.max(
        0,
        rawProgress - assignment.index * AVALANCHE_LAUNCH_INTERVAL_RAW
      )
      // Resting floor: cards bounce ON the visible floor, not inside the nav dock.
      const floorY = visibleFloorY - cardH
      const drop = Math.max(0, 1 - tSince / 0.22)
      // Bounce height decays and regrows via a slow smooth envelope (Big Bounce pattern).
      const envelope = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(TAU * tSince * 0.18 + seed * TAU))
      const bounceHeight = boardHeight * (0.22 + 0.18 * seed) * envelope
      const u0 = tSince * (4.8 + 2.1 * seed)
      const u = u0 - Math.floor(u0)
      const spanX = boardWidth + cardW * 8
      const x0 = assignment.baseX + cardW * 4 + boardWidth * (0.75 + 0.58 * seed) * direction * tSince
      const ux = x0 / spanX - Math.floor(x0 / spanX)
      pathX = ux * spanX - cardW * 4
      pathY = floorY - 4 * bounceHeight * u * (1 - u) - (floorY - assignment.baseY) * drop * drop
      // No rotation/scale games: the avalanche slides and bounces upright.
      break
    }
    // Meteor Shower: fast diagonal streaks (upper-left → lower-right); the trail ghosts
    // ARE the effect, so the path itself stays simple. x and y share ONE frac cycle, so
    // both wrap simultaneously with endpoints 4 card sizes beyond both edges (offscreen
    // exemption via the y axis even when the per-card x offset keeps x near the board).
    case 32: {
      const cardW = metrics.width
      const cardH = metrics.height
      const spanX = boardWidth + cardW * 8
      const spanY = boardHeight + cardH * 8
      const u0 = rawProgress * (1.4 + 0.9 * seed) + seed * 5 + normalizedIndex
      const u = u0 - Math.floor(u0)
      // Fixed per-card cross offset spreads the streak lanes; the sway keeps them alive.
      const crossOffset = (seed - 0.5) * boardWidth * 0.9 + relativeIndex * cardW * 0.06
      const sway = Math.sin(theta * 1.5 + seed * TAU) * cardW * 0.4
      pathX = u * spanX - cardW * 4 + crossOffset + sway
      pathY = u * spanY - cardH * 4
      // Aligned with the (constant per board) travel diagonal, plus per-frame tilt
      // wobble and scale breath — restored 2026-07-08 (renderer-polish story). The
      // 2026-07-07 view-renderer detune to a FIXED tilt existed because per-frame
      // rotation+scale churn on 208 Fabric views cost ~25fps; the Atlas worklet
      // recomputes every sprite every frame anyway, so the oscillation is free.
      // (Original oscillation was never committed — this is a tasteful reconstruction,
      // sine-based and therefore continuity-safe.)
      rotation =
        (Math.atan2(spanY, spanX) * 180) / Math.PI -
        90 +
        (seed - 0.5) * 8 +
        Math.sin(theta * 1.8 + seed * TAU) * 6
      targetScale = 1 + 0.06 * Math.sin(theta * 2.2 + seed * TAU)
      break
    }
    // Cascade Imprint: the TRUE Windows-3.1/95 cascade (imprint-cascade story,
    // 2026-07-08; retuned in polish round 2 + cascade-fixes). Cards launch ONE AT A
    // TIME in SORTED order (Kings first, cycling suits — getImprintLaunchOrder),
    // every IMPRINT_LAUNCH_INTERVAL_RAW raw units, drop from their foundation pile,
    // bounce on the visible dock-aware floor with geometric restitution while
    // drifting horizontally at constant speed, and fully exit the screen edge within
    // IMPRINT_FLIGHT_SPAN_RAW. Launches then WRAP modulo the deck for a seamless
    // repeat. The permanent imprints along the path are a RENDERER feature
    // (CascadeImprintLayer stamps this same math onto an accumulating offscreen
    // surface), NOT part of this function. Continuity: piecewise smooth in tSince and
    // position-continuous within a flight (fall meets bounce at the floor, bounces
    // meet each other at the floor, x is monotonic); the ONLY discontinuity is the
    // offscreen→pile return snap at tSince = IMPRINT_RETURN_RAW, which is invisible
    // and provably never straddled by the continuity suite's samples (see the
    // IMPRINT_RETURN_RAW lattice comment). Velocity kinks at impacts are fine.
    case 33: {
      const cardH = metrics.height
      const launchOrder = getImprintLaunchOrder(assignment)
      // Seamless repeat (cascade-fixes story, user item 5): launches wrap modulo the
      // deck — after the last Ace exits, the Kings launch again with unbroken cadence
      // (a King appears on the pile right behind the last Ace). `pass` counts wraps;
      // rel < 0 (pre-first-launch) and tSince > RETURN (flown, back on the pile
      // awaiting the next pass) both hold EXACTLY at base — the offscreen→base return
      // snap is invisible (card fully exited x-wise) and lattice-safe for the
      // continuity suite (see IMPRINT_RETURN_RAW).
      const cycle = safeTotalCards * IMPRINT_LAUNCH_INTERVAL_RAW
      const rel = rawProgress - launchOrder * IMPRINT_LAUNCH_INTERVAL_RAW
      const pass = Math.floor(rel / cycle)
      const tSince = rel - pass * cycle
      if (rel < 0 || tSince > IMPRINT_RETURN_RAW) {
        // Waiting on the pile: pathX/pathY already default to exactly base.
        break
      }
      // Per-flight variation (user item 6: same-pile cards flew near-identical arcs).
      // Three DECORRELATED seed channels (fract of incommensurate multiples — plain
      // seed for all three would couple "fast" with "bouncy") that also shift per
      // pass, so a card's second flight differs from its first. All constant within
      // a flight → continuity-safe.
      const sK = seed * 12.9898 + pass * 0.618
      const seedBounce = sK - Math.floor(sK)
      const sD = seed * 7.5313 + pass * 0.382 + 0.25
      const seedDrift = sD - Math.floor(sD)
      const sF = seed * 4.7177 + pass * 0.786 + 0.5
      const seedFall = sF - Math.floor(sF)
      const floorRestY = visibleFloorY - cardH
      const dropHeight = Math.max(1, floorRestY - assignment.baseY)
      // Per-card fall time t0 → per-card gravity g; impact speed v0 = g·t0. Varying
      // t0 (was fixed 0.045) staggers impact timing/arc width between pile-mates.
      // ×~1.15 faster falls (tuning round 2, 2026-07-12): 0.04+0.012 → 0.035+0.01.
      const t0 = 0.035 + 0.01 * seedFall
      const g = (2 * dropHeight) / (t0 * t0)
      const v0 = g * t0
      // Restitution k: bounce n peaks at k^(2n)·dropHeight and lasts 2·v0·k^n/g, so
      // total bounce time converges to C = 2·t0·k/(1−k) (geometric series) and the
      // active bounce index is recoverable in closed form via logs — no per-frame
      // state, which is what keeps the frozen-imprint recompute correct.
      // Range widened 0.6–0.8 → 0.55–0.85 (item 6): flat sliders vs lively bouncers.
      const k = 0.55 + 0.3 * seedBounce
      const bounceTotal = (2 * t0 * k) / (1 - k)
      let y = floorRestY
      if (tSince < t0) {
        y = assignment.baseY + 0.5 * g * tSince * tSince
      } else {
        const tb = tSince - t0
        const remaining = 1 - tb / bounceTotal
        // Below the cutoff the residual bounce height is < 0.001 dp — the card just
        // slides along the floor (visually identical, numerically safe near log(0)).
        if (remaining > 0.001) {
          // Inversion: bounce n covers tb ∈ [C·(1−k^(n−1)), C·(1−k^n)).
          const n = Math.floor(Math.log(remaining) / Math.log(k)) + 1
          const tau = tb - bounceTotal * (1 - Math.pow(k, n - 1))
          const vn = v0 * Math.pow(k, n)
          y = floorRestY - (vn * tau - 0.5 * g * tau * tau)
        }
      }
      // Constant drift, ×1.15 in tuning round 2 (2026-07-12): 7.5–11.5 →
      // 8.6–13.2 boardWidths/raw, still sized so even the slowest card fully
      // exits within IMPRINT_FLIGHT_SPAN_RAW (worst ≈ boardWidth·1.1 at
      // 8.6/raw ≈ 0.128 < 0.135) and x stays monotonic within a flight
      // (continuity). Direction alternates by launch order AND pass, so
      // consecutive launches fly to opposite sides and a card's second pass
      // mirrors its first.
      const launchDirection = (launchOrder + pass) % 2 === 0 ? 1 : -1
      pathX =
        assignment.baseX +
        boardWidth * (8.6 + 4.6 * seedDrift) * launchDirection * tSince
      pathY = y
      // Upright like the Windows original: no rotation/scale games.
      break
    }
    // Meteor Storm (NEW, mode-uplift story 2026-07-08): Meteor Shower's crazy sibling,
    // tuned so clearly MORE cards are visible at once: (a) ASYMMETRIC offscreen span —
    // endpoints only 3.5·cardH above / 2.5·cardH below (vs 32's 4/4), so ~68% of each
    // cycle is on screen (do NOT shrink below 3.5/2.5: the continuity suite's offscreen
    // exemption needs ≥3·cardH above / ≥2·cardH below at both samples around a wrap —
    // ~0.5·cardH slack vs ~5 dp of half-frame movement); (b) cards arrive in FOUR
    // coherent wave sheets (quarter-cycle phase groups, tight speed spread so sheets
    // slowly decohere into a continuous storm); (c) per-card crossing angles (drift
    // 0.35-0.9 boardWidths, alternating direction) so sheets visibly cross. Depth via
    // constant per-card scale + breath. x wraps WITH u while y is offscreen (exempt);
    // rotation/scale never depend on u (must stay continuous through wraps).
    case 34: {
      const cardW = metrics.width
      const cardH = metrics.height
      const spanY = boardHeight + cardH * 6
      const sheet = assignment.index % 4
      const u0 = rawProgress * (2.1 + 0.18 * seed) + sheet * 0.25 + seed * 0.04
      const u = u0 - Math.floor(u0)
      // Decorrelated drift seed (plain seed would couple "fast" with "slanted").
      const sD = seed * 7.5313 + 0.37
      const seedDrift = sD - Math.floor(sD)
      const driftX = boardWidth * (0.35 + 0.55 * seedDrift) * direction
      const laneX = boardWidth * (0.1 + 0.8 * seed) - cardW / 2
      pathX = laneX + driftX * (u - 0.5)
      pathY = u * spanY - cardH * 3.5
      // Aligned with the travel vector (driftX per cycle, spanY per cycle) + wobble.
      rotation =
        (Math.atan2(driftX, spanY) * 180) / Math.PI +
        Math.sin(theta * 1.6 + seed * TAU) * 5
      targetScale = 0.8 + 0.45 * seedDrift + 0.05 * Math.sin(theta * 2 + seed * TAU)
      break
    }
    // Shooting Stars (NEW, mode-uplift story 2026-07-08): the LONG-trail meteor
    // variant — the 10×60 ms ghost tail (metadata) IS the effect, so flights are
    // SLOWER (0.9-1.4 cycles/raw) and STEEPER (drift only 0.15-0.4 boardWidths) than
    // 32, letting the overlapping ghosts read as one solid ~2-3-card-height streak
    // instead of a frantic scatter. Standard 4/4-cardH offscreen margins; the x jump
    // at a wrap equals driftX and is exempt (fully offscreen on the y axis). Lanes
    // spread across the width via seed, so overdraw stays shallow despite 572 sprites.
    case 35: {
      const cardW = metrics.width
      const cardH = metrics.height
      const spanY = boardHeight + cardH * 8
      const u0 = rawProgress * (0.9 + 0.5 * seed) + seed * 5 + normalizedIndex
      const u = u0 - Math.floor(u0)
      const sD = seed * 4.7177 + 0.29
      const seedDrift = sD - Math.floor(sD)
      const driftX = boardWidth * (0.15 + 0.25 * seedDrift) * direction
      const laneX = boardWidth * (0.08 + 0.84 * seed) - cardW / 2
      pathX = laneX + driftX * (u - 0.5)
      pathY = u * spanY - cardH * 4
      rotation =
        (Math.atan2(driftX, spanY) * 180) / Math.PI +
        Math.sin(theta * 1.2 + seed * TAU) * 4
      targetScale = 0.9 + 0.25 * seedDrift + 0.04 * Math.sin(theta * 1.7 + seed * TAU)
      break
    }
    // Spirograph (NEW, alignment/wild-imprint story 2026-07-08): the WILD imprint
    // mode — all 52 cards fly at once on quasi-periodic hypotrochoid orbits
    // (two-circle epicycle sum x = A·cos t + B·cos(q·t), q non-integer so the trace
    // NEVER retraces itself and slowly fills its annulus). Four curve families, one
    // per suit: growing radii, different satellite frequencies, alternating travel
    // direction, and a slow counter-precession per family; 13 cards spread along
    // each curve via stackIndex. The permanent engraving is a RENDERER feature
    // (CascadeImprintLayer stamps this same math — rotated stamps — onto the
    // accumulating surface). Continuity: pure sines, linear-in-theta phases, no
    // frac wraps → continuous by construction (suite covers it automatically).
    // Cards render at a constant sub-1 scale so the engraved ribbons read fine.
    case 36: {
      const family = assignment.suitIndex
      const familyDirection = family % 2 === 0 ? 1 : -1
      // Tuning pass (device round 1, 2026-07-08): the first cut (A 0.16+0.075·fam,
      // B 0.45·A, speed 0.32+0.03·fam, scale 0.62+0.06·fam) saturated the mandala
      // into one solid white disk by ~15 s. Now: ~half the sweep speed so the
      // engraving keeps BUILDING across the whole 60 s run, a tighter satellite
      // (0.34·A) for more distinct family rings, and smaller cards for finer
      // engraved ribbons.
      const A = boardRadius * (0.17 + 0.08 * family)
      const B = A * 0.34
      // Non-integer satellite frequencies (2.4, 3.33, 4.26, 5.19) — deliberately
      // never near an integer, that's what keeps the curves quasi-periodic.
      const q = 2.4 + family * 0.93
      const t =
        (theta * (0.17 + 0.02 * family) +
          (assignment.stackIndex / FOUNDATION_STACK_MAX) * TAU) *
        familyDirection
      const prec = -familyDirection * theta * 0.05
      const ex = A * Math.cos(t) + B * Math.cos(q * t)
      const ey = A * Math.sin(t) - B * Math.sin(q * t)
      pathX = centerX + ex * Math.cos(prec) - ey * Math.sin(prec)
      pathY = centerY + ex * Math.sin(prec) + ey * Math.cos(prec)
      // Cards roll along their orbit; linear in t (continuous, no atan2 wrap).
      rotation = ((t + prec) * 180) / Math.PI
      targetScale = 0.52 + 0.05 * family
      break
    }
    // Pinball (ten-crazy-modes story, 2026-07-08): each card is two independent
    // triangle waves (pingPong01) at incommensurate per-card frequencies — straight
    // diagonal segments reflecting off all four edges (bottom = dock-aware floor).
    // Impacts happen exactly at the integer crossings of raw·f + o, which is what
    // the event stamp schedule (getImprintStampCount/Raw case 37) replays — ink
    // lands precisely on the walls and ONLY there. Position is continuous
    // everywhere (reflection kinks are velocity-only).
    case 37: {
      const params = pinballParams(assignment)
      const spanX = Math.max(1, boardWidth - metrics.width)
      const spanY = Math.max(1, visibleFloorY - metrics.height)
      pathX = pingPong01(rawProgress * params.fx + params.ox) * spanX
      pathY = pingPong01(rawProgress * params.fy + params.oy) * spanY
      // Constant per-card tilt (no spin): wall marks stay crisp and identical for
      // one card, varied across cards.
      rotation = (seed - 0.5) * 10
      break
    }
    // Pollock (ten-crazy-modes): action painting — chaotic incommensurate sine-sum
    // paths covering the whole canvas, fast per-card spin (alternating direction)
    // and a deep scale swing (0.25–0.85), stamped along the path every 0.02 raw
    // (path policy). The rotated/scaled stamps ARE the painting.
    case 38: {
      const spinSeed = fract(seed * 12.9898 + 0.31)
      pathX =
        centerX +
        boardWidth *
          (0.34 * Math.sin(theta * 0.62 + seed * TAU) +
            0.16 * Math.sin(theta * 1.71 + seed * 9))
      pathY =
        centerY +
        boardHeight *
          (0.3 * Math.sin(theta * 0.83 + seed * TAU * 2) +
            0.14 * Math.sin(theta * 1.31 + seed * 5))
      rotation = direction * 360 * rawProgress * (0.8 + 0.6 * spinSeed)
      targetScale = 0.55 + 0.3 * Math.sin(theta * 1.9 + seed * TAU)
      break
    }
    // Fireworks (ten-crazy-modes): one 13-card shell per suit, cycling every
    // FIREWORK_CYCLE_RAW with quarter-cycle suit offsets (a burst somewhere every
    // ~0.8 s). Per cycle: eased ascent from 4 cardH below the screen to a
    // per-cycle hashed burst point, then a radial burst with quadratic droop that
    // carries every card ≥ 2 cardH below the bottom edge before the cycle wraps
    // (offscreen-teleport exemption; wrap times are ≥ 0.01 raw away from the
    // suite's integer-raw sample boundaries — mod-11 argument on 20/11 cycles per
    // raw). Rotation/scale/opacity never depend on the cycle discontinuously:
    // opacity is 0 at BOTH cycle ends (smoothstep fades). Burst-point imprints
    // removed 2026-07-12 (see metadata).
    case 39: {
      const cardH = metrics.height
      const cyc = rawProgress / FIREWORK_CYCLE_RAW + assignment.suitIndex * 0.25
      const m = Math.floor(cyc)
      const u = cyc - m
      // Per-cycle burst point via Weyl-sequence hashes (constant within a cycle).
      const hx = fract(m * 0.618034 + assignment.suitIndex * 0.37 + 0.11)
      const hy = fract(m * 0.754877 + assignment.suitIndex * 0.23 + 0.42)
      const burstX = boardWidth * (0.22 + 0.56 * hx)
      // Burst points confined to the upper third (full-review culling story,
      // 2026-07-09 — user: bursts "on like sixty percent of the screen height"
      // lacked fireworks vibes; was 0.16 + 0.3·hy ≈ down to 46% height).
      // Nudged higher again (tuning round 2, 2026-07-12: "slightly higher"):
      // 0.08–0.28 → 0.05–0.21 of board height.
      const burstY = boardHeight * (0.05 + 0.16 * hy)
      const startX = burstX + (seed - 0.5) * boardWidth * 0.12
      const startY = boardHeight + cardH * 4
      const ascent = smooth01(u / 0.3)
      // Burst radius eases out; droop is quadratic gravity on the embers.
      const e = Math.max(0, (u - 0.3) / 0.7)
      const radial = boardRadius * 0.34 * (1 - (1 - e) * (1 - e))
      const burstAngle = (assignment.stackIndex / 13) * TAU + hx * TAU
      pathX =
        startX * (1 - ascent) +
        burstX * ascent +
        Math.cos(burstAngle) * radial +
        // Slight ascent-cluster spread, gone by the burst (× (1 − ascent)).
        (assignment.stackIndex / 12 - 0.5) * metrics.width * 0.6 * (1 - ascent)
      pathY =
        startY * (1 - ascent) +
        burstY * ascent +
        Math.sin(burstAngle) * radial +
        boardHeight * 1.6 * e * e
      rotation = Math.sin(theta * 1.3 + seed * TAU) * 25
      targetScale = 0.7 + 0.1 * Math.sin(theta * 2 + seed * TAU)
      targetOpacity = smooth01(u / 0.08) * (1 - smooth01((u - 0.86) / 0.12))
      break
    }
    // Black Hole (ten-crazy-modes): cards spiral into a slowly wandering center,
    // angularly accelerating (spin ∝ s³) and shrinking as they approach, fade out
    // just before the core, then transit back out INVISIBLY to the same start
    // radius/angle. The cycle is position-continuous at its wrap by construction —
    // r(1) = r(0) = R_OUT and the total spiral spin is exactly 3·TAU (cos/sin
    // periodic) — so re-emergence "from the edges" needs NO offscreen exemption
    // at all. Rotation is a mild independent tumble (a spin-following rotation
    // would jump 1080° at the wrap and fail the suite).
    case 40: {
      const cycleFreq = 0.34 + 0.22 * fract(seed * 7.5313 + 0.23)
      const u = fract(rawProgress * cycleFreq + seed * 2)
      const angle0 = normalizedIndex * TAU * 2 + seed
      const holeX = centerX + boardRadius * 0.2 * Math.sin(theta * 0.23 + 1.3)
      const holeY = centerY + boardRadius * 0.16 * Math.sin(theta * 0.17 + 4)
      const rOut = boardRadius * 1.7
      let r = rOut
      let angle = angle0
      // Spiral phase lengthened 0.62 → 0.74 of the cycle (full-review culling
      // story, 2026-07-09, user: "more cards at the same time") — the invisible
      // return transit shrinks to 26%, so ~19% more of the deck is on screen at
      // any moment. Wrap stays position-continuous (r = rOut at both cycle ends).
      if (u < 0.74) {
        const s = u / 0.74
        // Radius power 1.6 → 2.2 + fade-out pushed later, 0.8/0.17 → 0.86/0.12
        // (tuning round 2, 2026-07-12, user: cards "could stay a little bit
        // longer when they're getting sucked in"): the steeper power drops r
        // early and keeps it SMALL for longer, so cards visibly dwell circling
        // tight around the core (~1.8× the previous near-core visible time)
        // before the delayed fade takes them.
        r = rOut * Math.pow(1 - s, 2.2)
        angle = angle0 + 3 * TAU * s * s * s
        // Fade in near the (offscreen-ish) edge, fade out just before the core.
        targetOpacity = smooth01(u / 0.05) * (1 - smooth01((s - 0.86) / 0.12))
      } else {
        // Invisible transit back to the start radius; angle holds at 3·TAU ≡ 0.
        r = rOut * smooth01((u - 0.74) / 0.26)
        angle = angle0 + 3 * TAU
        targetOpacity = 0
      }
      pathX = holeX + Math.cos(angle) * r
      pathY = holeY + Math.sin(angle) * r
      rotation = Math.sin(theta * 0.9 + seed * TAU) * 25
      // Scale floor/slope raised ~12% (same review: cards "start quite small" once
      // visible — they enter the screen around r/rOut ≈ 0.5–0.8).
      targetScale = 0.28 + 0.84 * (r / rOut)
      break
    }
    // Dominoes (ten-crazy-modes): 4 rows (suit) × 13 columns (stackIndex) of
    // half-scale standing cards; per 3-raw cycle a wave topples them rightward
    // (bottom-RIGHT corner pivot, +90°), re-stands them, topples leftward
    // (bottom-LEFT pivot, −90°), re-stands — all smoothstepped, with φ exactly 0
    // in a plateau around the cycle wrap (wraps at raw 3/6/9 are test boundaries —
    // the plateau makes them trivially continuous). Bottom-EDGE pivot math: the
    // renderer rotates about the sprite CENTER, so rotation about a bottom corner
    // p is expressed as center' = center + v − R(φ)·v with v = center→p =
    // (±w·s/2, h·s/2) (SCALED half-dims; R = the renderer's own screen-coords
    // rotation matrix, positive = clockwise). At φ = 0 the offset vanishes, so
    // switching pivots between phases is free. NO renderer anchor change.
    case 41: {
      const DOMINO_SCALE = 0.5
      const col = assignment.stackIndex
      const row = assignment.suitIndex
      const tw = fract(rawProgress / 3)
      // Wave timings (fractions of the cycle): rightward topple sweeps cols 0→12,
      // re-stand follows, then both again right→left with negative angle. Last
      // event ends at 0.95 — the [0.95, 1) plateau covers the wrap.
      const rise = (start: number) => smooth01((tw - start) / 0.05)
      const toppleRight =
        rise(0.1 + 0.01 * col) - rise(0.34 + 0.01 * col)
      const toppleLeft =
        rise(0.56 + 0.01 * (12 - col)) - rise(0.78 + 0.01 * (12 - col))
      const phiDeg = 90 * toppleRight - 90 * toppleLeft
      const phi = (phiDeg * Math.PI) / 180
      const halfW = (metrics.width * DOMINO_SCALE) / 2
      const halfH = (metrics.height * DOMINO_SCALE) / 2
      // Pivot: bottom-right corner while toppling right, bottom-left while left
      // (only one φ term is ever nonzero — phases are disjoint).
      const pivotX = toppleRight > 0 ? halfW : -halfW
      const cosPhi = Math.cos(phi)
      const sinPhi = Math.sin(phi)
      const offsetX = pivotX - (pivotX * cosPhi - halfH * sinPhi)
      const offsetY = halfH - (pivotX * sinPhi + halfH * cosPhi)
      // Row inset (full-review culling story, 2026-07-09, user: end cards toppled
      // out of the screen): a card toppled ±90° about a bottom corner reaches
      // halfW + full scaled card height past its standing center — inset both row
      // ends by exactly that reach instead of the old fixed 6% margin.
      const toppleReach = halfW + 2 * halfH
      const standCenterX = toppleReach + ((boardWidth - 2 * toppleReach) * col) / 12
      const standCenterY = visibleFloorY * (0.34 + 0.17 * row) - halfH
      pathX = standCenterX + offsetX - metrics.width / 2
      pathY = standCenterY + offsetY - metrics.height / 2
      rotation = phiDeg
      targetScale = DOMINO_SCALE
      break
    }
    // Warp Drive (ten-crazy-modes): hyperspace — every card streaks radially
    // outward from a jump center along a FIXED per-card direction, accelerating
    // (r ∝ u^2.2) to fully offscreen, then transits back to r = 0 invisibly; the
    // per-card cycle is position-continuous at its wrap (r = 0 both sides). The
    // 10×50 ms trail (metadata) is the streak. Every WARP_EPOCH_RAW (~8 s) the
    // center "jumps": per-epoch hashed targets with a CONTINUOUS smoothstep
    // re-aim over the last 0.18 raw of the epoch (the permitted "continuous
    // re-aim" — no hard cut; epoch boundaries land on integer-raw test
    // boundaries with derivative 0 on both sides).
    case 42: {
      const epoch = Math.floor(rawProgress / WARP_EPOCH_RAW)
      const tIn = rawProgress - epoch * WARP_EPOCH_RAW
      const aim = smooth01((tIn - (WARP_EPOCH_RAW - 0.18)) / 0.18)
      const cx0 = boardWidth * (0.25 + 0.5 * fract(epoch * 0.618034 + 0.19))
      const cy0 = boardHeight * (0.25 + 0.5 * fract(epoch * 0.754877 + 0.53))
      const cx1 = boardWidth * (0.25 + 0.5 * fract((epoch + 1) * 0.618034 + 0.19))
      const cy1 = boardHeight * (0.25 + 0.5 * fract((epoch + 1) * 0.754877 + 0.53))
      const jumpX = cx0 + (cx1 - cx0) * aim
      const jumpY = cy0 + (cy1 - cy0) * aim
      const dirAngle = normalizedIndex * TAU + seed * 0.4
      const streakFreq = 0.9 + 0.5 * fract(seed * 7.5313 + 0.11)
      const u = fract(rawProgress * streakFreq + seed * 3 + normalizedIndex)
      const rMax = boardHeight * 1.15
      const r =
        u < 0.7
          ? rMax * Math.pow(u / 0.7, 2.2)
          : rMax * (1 - smooth01((u - 0.7) / 0.3))
      pathX = jumpX + Math.cos(dirAngle) * r - metrics.width / 2
      pathY = jumpY + Math.sin(dirAngle) * r - metrics.height / 2
      // Card aligned to its radial streak direction (constant per card).
      rotation = (dirAngle * 180) / Math.PI + 90
      // Perf detune 2026-07-09 (with the 10→7 ghost cut in metadata): scale range
      // 0.5–1.4 → 0.42–1.1. The fps cost was translucent radial overdraw where all
      // 52 streaks converge — smaller sprites cut fill area ~35% while cards still
      // grow ~2.6× along the streak (the depth read survives).
      // +10% (full-review culling story, 2026-07-09, user request): 0.42–1.1 →
      // 0.46–1.21. Re-measured on the A065 same day — see the story's perf table
      // (bar: ≥110 fps).
      targetScale = 0.46 + 0.75 * (r / rMax)
      // Stars pop in near the center, streak out opaque, fade before the
      // invisible return leg. 0 at both cycle ends → continuous across the wrap.
      targetOpacity = smooth01(u / 0.06) * (1 - smooth01((u - 0.58) / 0.12))
      break
    }
    // You Win (ten-crazy-modes): a card TRAIN (phases clustered over ~18% of the
    // loop) rides the arc-length-parametrized "YOU / WIN!" stroke path (WIN_PATH —
    // normalized polylines with pen-up MOVE segments between strokes, closed into
    // a loop by a final connector, so the fract() wrap is position-continuous);
    // the path-policy stamps (every 0.008 raw ≈ 4 dp apart) ink the message
    // permanently as the train sweeps one lap (~24 s — the message assembles
    // over the run, then re-inks). Pen-up segments carry a smoothstep opacity
    // dip to 0 — live cards fade across letter gaps and the stamp loop skips
    // samples with targetOpacity < 0.98, so no ink ever lands between glyphs.
    // Speed cap + train phasing: see WIN_SPEED / WIN_PHASE0 above.
    case 43: {
      const d =
        WIN_PATH.total *
        fract(rawProgress * WIN_SPEED + WIN_PHASE0 + normalizedIndex * WIN_TRAIN_SPAN)
      let seg = 0
      while (
        seg < WIN_PATH.count - 1 &&
        WIN_PATH.cum[seg] + WIN_PATH.len[seg] < d
      ) {
        seg += 1
      }
      const local = Math.min(
        1,
        Math.max(0, (d - WIN_PATH.cum[seg]) / WIN_PATH.len[seg])
      )
      const mx = WIN_PATH.x0[seg] + (WIN_PATH.x1[seg] - WIN_PATH.x0[seg]) * local
      const my = WIN_PATH.y0[seg] + (WIN_PATH.y1[seg] - WIN_PATH.y0[seg]) * local
      pathX = boardWidth * mx - metrics.width / 2
      pathY = boardHeight * my - metrics.height / 2
      // Upright small cards = ~20 dp wide ink strokes on a ~90 dp glyph box.
      rotation = 0
      targetScale = 0.34
      if (WIN_PATH.draw[seg] === 0) {
        // Pen-up: dip to 0 mid-segment, back to 1 at both ends (matches the
        // adjacent draw segments' opacity 1 → continuous at junctions). The steep
        // 0.2 ramps keep the stamp loop's opacity-skip tail (< 0.98 → no ink)
        // within ~3 dp of the stroke ends.
        targetOpacity = 1 - smooth01(local / 0.2) + smooth01((local - 0.8) / 0.2)
      }
      break
    }
    // Solar System (ten-crazy-modes; REWORKED 2026-07-09, full-review culling
    // story — user screenshots showed the four suit systems clumping into one
    // mid-screen blob with moons hugging their planets into noise). Now each suit
    // system lives in its OWN QUADRANT: planets circle fixed anchors at
    // center ± 0.28·boardWidth / ± 0.26·boardHeight (symmetric → composition
    // centered on the board; pushed out from ±0.24/±0.22 in tuning round 2,
    // 2026-07-12 — user: "the solar system is vast", systems read too dense),
    // on a small 0.04·R orbit, so systems can NEVER meet — worst-case reach
    // (0.04 orbit + 0.16 outermost moon + half a moon card ≈ 0.225·R) stays
    // well inside the 0.28·boardWidth half-separation. Moons ride clearly
    // distinct rings (0.04–0.16·R, step 0.012 ≈ 5 dp) at spread speeds;
    // Aces stay the pulsing central star cluster between the quadrants. Rank-
    // sorted draw order puts Kings on top of their moons for free. Pure sines →
    // continuous. Do not grow orbit/moon radii without re-checking the reach sum.
    case 44: {
      const suit = assignment.suitIndex
      const suitPhase = (suit / 4) * TAU
      const anchorX = centerX + (suit % 2 === 0 ? -1 : 1) * boardWidth * 0.28
      const anchorY = centerY + (suit < 2 ? -1 : 1) * boardHeight * 0.26
      const planetDirection = suit % 2 === 0 ? 1 : -1
      const planetAngle = planetDirection * theta * (0.5 + 0.08 * suit) + suitPhase
      const planetOrbit = boardRadius * 0.04
      const planetX = anchorX + Math.cos(planetAngle) * planetOrbit
      const planetY = anchorY + Math.sin(planetAngle) * planetOrbit
      if (assignment.stackIndex === 12) {
        // King = planet. 1.05 → 0.9 (tuning round 2, 2026-07-12: "the planet
        // itself should be a little bit smaller" — less crowding vs its moons).
        pathX = planetX
        pathY = planetY
        targetScale = 0.9
      } else if (assignment.stackIndex === 0) {
        // Ace = pulsing core cluster (the "sun" between the four systems).
        const coreAngle = theta * 1.3 + suitPhase
        const pulse = 1 + 0.18 * Math.sin(theta * 2.4)
        pathX = centerX + Math.cos(coreAngle) * boardRadius * 0.05 * pulse
        pathY = centerY + Math.sin(coreAngle) * boardRadius * 0.05 * pulse
        targetScale = 0.85 + 0.3 * (0.5 + 0.5 * Math.sin(theta * 2.4 + suit))
      } else {
        // Ranks 2–Q = moons (11 per suit), per-rank ring/speed/direction.
        const moon = assignment.stackIndex - 1
        const moonDirection = moon % 2 === 0 ? -1 : 1
        const moonAngle =
          moonDirection * theta * (2.4 - 0.13 * moon) + moon * 2.2 + suitPhase
        const moonRadius = boardRadius * (0.04 + 0.012 * moon)
        pathX = planetX + Math.cos(moonAngle) * moonRadius
        pathY = planetY + Math.sin(moonAngle) * moonRadius
        targetScale = 0.32
      }
      // Upright orrery — rotation would just add noise to the hierarchy read.
      rotation = 0
      break
    }
    // Gravity Flip (ten-crazy-modes): 52 side-by-side lanes; every
    // GRAVITY_FLIP_EPOCH_RAW (~8 s) gravity inverts — cards fall (closed-form,
    // per-card delay + fall time) from their previous rest plane to the other
    // plane (floor = dock-aware visible floor, ceiling = board top), bounce with
    // geometric restitution (k ≤ 0.65 ⇒ the chain settles ≤ 0.63 raw, well inside
    // the epoch) and REST — epoch boundaries are position-continuous because each
    // epoch's source plane is the previous epoch's target plane. Rest imprints
    // removed 2026-07-09 (full-review culling story) — pure bounce mode.
    case 45: {
      const params = gravityFlipParams(assignment)
      const epoch = Math.floor(rawProgress / GRAVITY_FLIP_EPOCH_RAW)
      const tEpoch = rawProgress - epoch * GRAVITY_FLIP_EPOCH_RAW
      const floorRestY = visibleFloorY - metrics.height
      const gravityDown = epoch % 2 === 0
      const sourceY = gravityDown ? 0 : floorRestY
      const targetY = gravityDown ? floorRestY : 0
      const towardSource = sourceY > targetY ? 1 : -1
      const tFall = tEpoch - params.delay
      let y = sourceY
      if (tFall >= 0) {
        const dropHeight = Math.abs(targetY - sourceY)
        const g = (2 * dropHeight) / (params.fallTime * params.fallTime)
        if (tFall < params.fallTime) {
          y = sourceY - towardSource * 0.5 * g * tFall * tFall
        } else {
          const tb = tFall - params.fallTime
          const bounceTotal =
            (2 * params.fallTime * params.restitution) / (1 - params.restitution)
          const remaining = 1 - tb / bounceTotal
          y = targetY
          // Same closed-form geometric bounce chain as Cascade Imprint (case 33),
          // mirrored along ±gravity; below the cutoff the card has settled.
          if (remaining > 0.001) {
            const n =
              Math.floor(Math.log(remaining) / Math.log(params.restitution)) + 1
            const tau = tb - bounceTotal * (1 - Math.pow(params.restitution, n - 1))
            const vn = g * params.fallTime * Math.pow(params.restitution, n)
            y = targetY + towardSource * (vn * tau - 0.5 * g * tau * tau)
          }
        }
      }
      pathX =
        boardWidth * (0.05 + (0.9 * assignment.index) / safeTotalCards) -
        metrics.width / 2
      pathY = y
      // Lanes overlap (52 across the width) into a bouncing ribbon — rank-sorted
      // draw order keeps the overlap consistent. Upright, still at rest.
      rotation = 0
      targetScale = 0.75
      break
    }
    // Kaleidoscope (ten-crazy-modes): wedge = suit; the wedge-LOCAL motion (polar
    // Lissajous inside the 90° wedge + local card spin) depends ONLY on
    // stackIndex, so all four wedges run IDENTICAL local math. Odd wedges are
    // MIRRORED: reflecting the local angle across the shared wedge boundary
    // (final = base + 90° − local) gives true D4 kaleidoscope symmetry between
    // neighbors, and the local spin is negated (the card FACE cannot be mirrored
    // — negated spin is the standard approximation). A slow global precession
    // turns the whole mandala. Path-policy stamps (every 0.012 raw) engrave a
    // 4-fold-symmetric mandala: wedge counterparts stamp at identical times with
    // symmetric transforms. Pure sines → continuous.
    case 46: {
      const wedge = assignment.suitIndex
      const k = assignment.stackIndex
      const localAngle =
        TAU / 8 + (TAU / 8 - 0.14) * Math.sin(theta * (0.5 + 0.04 * k) + k * 1.9)
      const localRadius =
        boardRadius * (0.12 + 0.31 * (0.5 + 0.5 * Math.sin(theta * 0.71 + k * 2.3)))
      const localSpin = Math.sin(theta * 1.4 + k * 0.9) * 65
      const mirrored = wedge % 2 === 1
      const precession = theta * 0.05
      const angle =
        wedge * (TAU / 4) +
        precession +
        (mirrored ? TAU / 4 - localAngle : localAngle)
      pathX = centerX + Math.cos(angle) * localRadius
      pathY = centerY + Math.sin(angle) * localRadius
      rotation = (angle * 180) / Math.PI + (mirrored ? -localSpin : localSpin)
      targetScale = 0.5 + 0.12 * Math.sin(theta * 1.05 + k * 1.3)
      break
    }
    default: {
      const radius = boardRadius * 0.25
      pathX = centerX + Math.cos(thetaSeed) * radius
      pathY = centerY + Math.sin(thetaSeed) * radius
      rotation = (thetaSeed * 180) / Math.PI
      break
    }
  }

  return {
    pathX,
    pathY,
    rotation,
    targetScale,
    targetOpacity,
    launchEased,
    rawProgress,
    relativeIndex,
    normalizedIndex,
    stackFactor,
  }
}

export function getCelebrationModeMetadata(modeId: number): CelebrationMetadata {
  // Lookup by stable id, not array index — ids may have gaps once modes get retired.
  return (
    CELEBRATION_MODE_METADATA.find((entry) => entry.id === modeId) ?? {
      id: modeId,
      name: 'Unknown',
    }
  )
}
