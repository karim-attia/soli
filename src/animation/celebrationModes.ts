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
}

// Stable-id contract: ids are permanent identifiers, NOT array indices. When a mode is
// removed later, delete its metadata entry here and retire its switch case number in
// computeCelebrationFrame — never renumber or reuse ids. Selection always picks a random
// entry from this list (see useCelebrationController), so gaps in the id sequence are fine.
export const CELEBRATION_MODE_METADATA: CelebrationMetadata[] = [
  { id: 0, name: 'Spiral Bloom' },
  // Mode-uplift story (2026-07-08): trails added to the user's "boring set"
  // (1, 2, 7, 9, 11, 14, 18) + Vortex 22 — all patterns that SPREAD cards out, so
  // clustered-overdraw risk is low (the Galaxy/Comet caveat above). Counts kept at
  // 2-3 ghosts; the Meteor family (32/34/35) owns the long/dense trails.
  { id: 1, name: 'Lissajous Weave', trail: { count: 3, gapMs: 70 } },
  { id: 2, name: 'Pendulum Cascade', trail: { count: 2, gapMs: 80 } },
  { id: 3, name: 'Orbit Carousel' },
  { id: 4, name: 'Ellipse Drift' },
  { id: 5, name: 'Starburst Spur' },
  { id: 6, name: 'Dual Spiral' },
  { id: 7, name: 'Wave Loop', trail: { count: 3, gapMs: 70 } },
  { id: 8, name: 'Ring Cascade' },
  { id: 9, name: 'Drift Orbit', trail: { count: 2, gapMs: 80 } },
  // Trail re-enabled 2026-07-08 (renderer-polish story): the 2026-07-07 removal was a
  // VIEW-renderer measurement (6fps — per-ghost Fabric views on a tight cluster); the
  // Atlas draws ghosts in the same draw call at ~122fps with 5ms GPU headroom.
  // Polish round 2 (2026-07-08): restored the ORIGINAL 4-ghost count the user liked.
  // The original gap was never committed (git history only ever had 31:3/80 and
  // 32:2/75), so the 70ms reconstruction stays.
  { id: 10, name: 'Comet Halo', trail: { count: 4, gapMs: 70 } },
  { id: 11, name: 'Resonance Field', trail: { count: 3, gapMs: 70 } },
  { id: 12, name: 'Column Glide' },
  { id: 13, name: 'Aurora Twist' },
  { id: 14, name: 'Wave Sweep', trail: { count: 2, gapMs: 70 } },
  { id: 15, name: 'Constellation Waltz' },
  { id: 16, name: 'Pulse Orbit' },
  { id: 17, name: 'Clover Spin' },
  { id: 18, name: 'Horizon Arc', trail: { count: 3, gapMs: 80 } },
  { id: 19, name: 'Jitter Swarm' },
  { id: 20, name: 'Fountain' },
  { id: 21, name: 'Card Rain' },
  // Short trail only: the vortex funnels cards into its center — deeper overdraw than
  // the spread-out modes above, so 3 tight ghosts, not more (see the Galaxy caveat).
  { id: 22, name: 'Vortex', trail: { count: 3, gapMs: 60 } },
  { id: 23, name: 'Infinity Loop' },
  { id: 24, name: 'Suit Orbits' },
  { id: 25, name: 'Flock' },
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
  { id: 33, name: 'Cascade Imprint', wobble: false },
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
  // card exactly — jitter would smear the engraving).
  { id: 36, name: 'Spirograph', wobble: false },
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
// avalanche a bit faster") ≈ 0.23 s between launches; the last card launches ~12 s in.
export const AVALANCHE_LAUNCH_INTERVAL_RAW = 0.04

// Cascade Imprint (mode 33) timing, shared between case 33 and the overlay's imprint
// sampler (both must agree on when each card flies). Polish round 2 (user 2026-07-08:
// "feels a bit slow"): launch interval 0.2 → 0.11 raw units (≈0.63 s/card). Flights
// typically last 0.10–0.15 raw units, so the next card often launches while the
// previous one is still exiting — slight overlap, brisk feel. FLIGHT_SPAN is the
// sampling window per card: it must cover the WORST-CASE exit (slowest drift ≈
// boardWidth·1.1 at 7.5·boardWidth/raw ≈ 0.147 raw) or late imprints would be missing.
export const IMPRINT_LAUNCH_INTERVAL_RAW = 0.11
export const IMPRINT_FLIGHT_SPAN_RAW = 0.16
// Cascade-fixes story (user item 5, 2026-07-08): after its flight the card returns to
// its foundation base and waits for its NEXT pass (launches wrap modulo the deck), so
// a King reappears on the pile right behind the last Ace — seamless repeat. The
// offscreen→base snap at launch + RETURN is invisible (alpha-gated in the overlay AND
// fully offscreen: worst exit 0.147 < 0.165) but IS a position discontinuity, so the
// value is lattice-tuned for the continuity suite: snap times are (11k + 16.5)/100 raw
// (k = launchOrder + 52·pass), always ≥ 0.005 raw away from the integer-raw boundaries
// the suite samples (window ±0.00144 raw). If IMPRINT_LAUNCH_INTERVAL_RAW changes,
// re-derive this margin.
export const IMPRINT_RETURN_RAW = 0.165

// Spirograph (mode 36) imprint sampling cadence: every card stamps once per this many
// raw units (absolute lattice — all 52 cards fly for the whole run, so unlike mode 33
// there are no launch windows). 0.01 raw ≈ 58 ms ≈ 9-12 dp of path per stamp at the
// mode's speeds — stamps overlap into solid engraved ribbons. Budget: 52 cards /
// 0.01 raw ≈ 9 stamps per 120 Hz frame, comfortably cheap for the offscreen surface.
export const SPIRO_STAMP_INTERVAL_RAW = 0.01

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
    case 1: {
      const warped = theta + 0.6 * Math.sin(theta * 0.5)
      const ampX = boardRadius * (0.36 + 0.1 * Math.sin(thetaDouble))
      const ampY = boardRadius * (0.3 + 0.06 * Math.cos(thetaDouble + seed))
      pathX = centerX + Math.sin(warped) * ampX
      pathY = centerY + Math.sin(warped * 2 + seed * TAU) * ampY
      rotation = (Math.sin(warped) * 540) / Math.PI
      targetScale = 1 + 0.18 * Math.sin(theta * 2 + normalizedIndex)
      break
    }
    // Pendulum Cascade (uplift 2026-07-08, "boring" set): taller swings, a wider
    // per-card fan, a slow whole-field horizontal sway, and more scale play + trail.
    case 2: {
      const ampX = boardRadius * (0.22 + stackFactor * 0.16)
      const ampY = boardRadius * 0.44
      const fieldSway = Math.sin(theta * 0.35) * boardRadius * 0.1
      pathX = centerX + fieldSway + Math.sin(theta * 1.5 + seed * TAU) * ampX
      pathY = centerY - Math.cos(theta + seed * 0.5) * ampY
      rotation = (theta * 360) / Math.PI
      targetScale = 1 + 0.14 * Math.cos(theta * 3 + seed)
      break
    }
    // Orbit Carousel (uplift 2026-07-08, user: "faster when outside of ring?"): the
    // angular speed is phase-locked to the radius breath — the -0.45*cos term's
    // derivative is +0.9*sin(radius phase), i.e. cards whip around when swung far out
    // and glide when pulled in. Phase-based, so continuous by construction.
    case 3: {
      const radiusPhase = theta * 2 + normalizedIndex
      const angle = theta * 1.5 - 0.45 * Math.cos(radiusPhase) + seed * TAU
      const radius = boardRadius * (0.25 + 0.2 * Math.sin(radiusPhase))
      pathX = centerX + Math.cos(angle) * radius
      pathY = centerY + Math.sin(angle) * radius
      rotation = (angle * 180) / Math.PI
      targetScale = 1 + 0.07 * Math.sin(theta + stackFactor)
      break
    }
    // Ellipse Drift (uplift 2026-07-08, "boring" set): the ellipse now slowly
    // PRECESSES (tilt = theta*0.15 rotates the whole figure), the orbit is speed-warped
    // (rush through the fat side), radii are bigger, and scale play is stronger.
    case 4: {
      const angle = theta + 0.35 * Math.sin(theta * 1.3) + stackFactor
      const radiusX = boardRadius * (0.36 + 0.1 * Math.sin(thetaDouble + normalizedIndex))
      const radiusY = boardRadius * (0.24 + 0.08 * Math.cos(thetaDouble + seed))
      const ex = Math.cos(angle) * radiusX
      const ey = Math.sin(angle) * radiusY
      const tilt = theta * 0.15
      pathX = centerX + ex * Math.cos(tilt) - ey * Math.sin(tilt)
      pathY = centerY + ex * Math.sin(tilt) + ey * Math.cos(tilt)
      rotation = (Math.sin(theta * 2 + seed) * 360) / Math.PI
      targetScale = 1 + 0.15 * Math.sin(theta * 4 + seed)
      break
    }
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
    // Wave Loop (uplift 2026-07-08, "boring" set): speed-warped loop (rush/linger),
    // bigger breathing radii, more scale play, trail added in metadata.
    case 7: {
      const angle = theta + 0.5 * Math.sin(theta * 0.7) + normalizedIndex
      const radiusX = boardRadius * (0.28 + 0.06 * Math.sin(theta * 0.9 + seed))
      const radiusY = boardRadius * (0.36 + 0.12 * Math.sin(thetaDouble + stackFactor))
      pathX = centerX + Math.sin(angle) * radiusX
      pathY = centerY - Math.cos(angle) * radiusY
      rotation = (Math.cos(theta) * 360) / Math.PI
      targetScale = 1 + 0.12 * Math.sin(theta * 2 + normalizedIndex)
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
    // Resonance Field (uplift 2026-07-08, "boring" set): a SHARED resonance envelope
    // (0.3x-1.1x, ~7s period) now swells and collapses the whole field together — the
    // "resonance" the name promised is finally visible. Plus scale play + trail.
    case 11: {
      const resonance = 0.3 + 0.8 * (0.5 + 0.5 * Math.sin(theta * 0.8))
      const ampX = boardRadius * (0.25 + 0.05 * Math.sin(seed * TAU)) * resonance
      const ampY = boardRadius * (0.34 + 0.06 * Math.cos(seed * TAU)) * resonance
      pathX = centerX + Math.sin(theta * 1.7 + seed) * ampX
      pathY = centerY + Math.sin(theta * 2.3 + seed * 0.4) * ampY
      rotation = (Math.sin(theta * 2) * 360) / Math.PI
      targetScale = 1 + 0.15 * Math.sin(theta * 3 + normalizedIndex)
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
    case 13: {
      const angle = theta + seed * TAU * 2
      const radius = boardRadius * (0.18 + 0.25 * Math.sin(theta * 4 + seed))
      pathX =
        centerX +
        Math.cos(angle) * radius +
        Math.sin(theta * 3 + seed) * metrics.width * 0.2
      pathY = centerY + Math.sin(angle) * radius
      rotation = (angle * 180) / Math.PI
      targetScale = 1 + 0.05 * Math.sin(theta * 5 + seed)
      targetOpacity = 0.8 + 0.2 * Math.sin(theta * 2 + seed)
      break
    }
    // Wave Sweep (uplift 2026-07-08, "boring" set): speed-warped sweep (accelerates
    // through the center), taller ripples, more scale play, trail added in metadata.
    case 14: {
      const sweepPhase = theta + 0.45 * Math.sin(theta * 0.8) + seed
      const wave = Math.sin(sweepPhase)
      const ampX = boardRadius * 0.44
      const ampY = boardRadius * (0.26 + 0.12 * Math.sin(theta * 2 + stackFactor))
      pathX = centerX + wave * ampX
      pathY = centerY + Math.sin(theta * 3 + seed) * ampY
      rotation = wave * 270
      targetScale = 1 + 0.12 * Math.sin(theta * 3 + normalizedIndex)
      break
    }
    // Constellation Waltz (uplift 2026-07-08, user: "goes too small, could also go
    // large... underlying pattern not suuuper exciting"): scale play widened to a real
    // 0.75-1.75 range (min CLAMPED well above unreadable, max clearly above 1), and
    // the whole formation now waltzes — its center drifts on a slow Lissajous.
    case 15: {
      const angle = theta * 2 + normalizedIndex * TAU
      const radius = boardRadius * (0.22 + 0.15 * Math.sin(theta + normalizedIndex))
      const swayX = Math.sin(theta * 0.3) * boardRadius * 0.13
      const swayY = Math.sin(theta * 0.45 + 1) * boardRadius * 0.1
      pathX = centerX + swayX + Math.cos(angle) * radius
      pathY = centerY + swayY + Math.sin(angle) * radius
      rotation = (angle * 180) / Math.PI
      targetScale = 1.25 + 0.5 * Math.sin(theta * 2 + stackFactor + normalizedIndex * TAU)
      targetOpacity = 0.9 + 0.1 * Math.cos(theta * 2 + normalizedIndex)
      break
    }
    // Pulse Orbit (uplift 2026-07-08): scale floor raised 0.4 -> 0.75 and ceiling to
    // 1.3 — the old targetScale = pulse shrank cards to unreadable minis (very likely
    // the "goes too small" the user filed against neighboring mode 15). Radius pulse
    // concept unchanged.
    case 16: {
      const pulse = 0.7 + 0.3 * Math.sin(theta * 3 + seed)
      const angle = theta + stackFactor
      const radius = boardRadius * 0.28 * pulse
      pathX = centerX + Math.cos(angle) * radius
      pathY = centerY + Math.sin(angle) * radius
      rotation = (angle * 180) / Math.PI + pulse * 45
      targetScale = 0.75 + 0.55 * (0.5 + 0.5 * Math.sin(theta * 3 + seed))
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
    // Horizon Arc (uplift 2026-07-08, "boring" set): depth illusion — cards scale
    // 0.77-1.33 with arc height (big at the bottom = near, small at the top = far),
    // speed-warped sweep, bigger radius, trail added in metadata.
    case 18: {
      const angle = theta + 0.4 * Math.sin(theta * 0.9) + seed
      const radius = boardRadius * (0.4 + 0.12 * Math.sin(theta * 2 + normalizedIndex))
      pathX = centerX + Math.cos(angle) * radius
      pathY = centerY - Math.sin(angle) * radius * 0.85
      rotation = (angle * 180) / Math.PI
      // sin(angle) is the height along the arc: -1 bottom (near) … 1 top (far).
      targetScale = 1.05 - 0.28 * Math.sin(angle)
      break
    }
    case 19: {
      const jitterAngle = theta * 4 + seed * TAU
      const radius = boardRadius * (0.2 + 0.1 * Math.sin(theta * 6 + normalizedIndex))
      pathX =
        centerX +
        Math.cos(jitterAngle) * radius +
        Math.sin(theta * 2 + seed) * metrics.width * 0.15
      pathY =
        centerY +
        Math.sin(jitterAngle) * radius +
        Math.cos(theta * 2 + seed) * metrics.height * 0.1
      rotation = (jitterAngle * 90) / Math.PI
      targetScale = 1 + 0.03 * Math.sin(theta * 6 + seed)
      targetOpacity = 0.85 + 0.15 * Math.sin(theta * 4 + seed)
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
    // Flock: follow-the-leader swarm — every card samples the same leader path
    // (incommensurate sine sum) at a lagged phase plus a small seeded offset.
    // GENTLE uplift 2026-07-08 (user filed it both "boring" and "really cool" —
    // orchestrator: keep + de-bunch only): scatter cross-section doubled, leader path
    // ~15% bigger, snake lag 0.05 -> 0.06 (longer snake). Concept untouched.
    case 25: {
      const phi = theta - 0.06 * assignment.index
      pathX =
        centerX +
        boardRadius * (0.3 * Math.sin(phi) + 0.16 * Math.sin(phi * 1.37 + 1.7)) +
        (seed - 0.5) * metrics.width * 1.6
      pathY =
        centerY +
        boardRadius * (0.23 * Math.cos(phi * 0.73 + 0.4) + 0.14 * Math.sin(phi * 1.19 + 3.1)) +
        (seed - 0.5) * metrics.height * 1.2
      rotation = Math.sin(phi * 1.37) * 40 + Math.cos(phi * 0.73) * 20
      targetScale = 1 + 0.05 * Math.sin(phi * 2 + seed * TAU)
      break
    }
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
    // Galaxy: two-arm logarithmic spiral (arm by index parity) rotating slowly, with
    // twinkle via small scale/opacity oscillation and a vertical squash for depth.
    case 27: {
      const armPhase = (assignment.index % 2) * Math.PI
      const radius = boardRadius * 0.08 * Math.exp(1.6 * normalizedIndex)
      const angle = armPhase + normalizedIndex * 4 + theta * 0.5
      pathX = centerX + Math.cos(angle) * radius
      pathY = centerY + Math.sin(angle) * radius * 0.75
      rotation = (theta * 0.5 * 180) / Math.PI
      // Perf note (Android test, Story 5, 2026-07-07): this opacity twinkle was
      // suspected in Galaxy's 16fps lag but measured innocent — removing it changed
      // nothing; removing the trail ghosts fixed it (see the id-27 metadata comment).
      // Twinkle on 52 opaque views is fine (old modes 13/15/19 do the same).
      targetScale = 1 + 0.06 * Math.sin(theta * 3 + seed * TAU)
      targetOpacity = 0.85 + 0.15 * Math.sin(theta * 2.3 + seed * TAU)
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
      // around faster?") — cards race the outline ~3.3x faster; pulse untouched.
      const t = normalizedIndex * TAU + theta * 0.5
      const sinT = Math.sin(t)
      const heartX = 16 * sinT * sinT * sinT
      const heartY =
        13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
      const heartScale = (boardRadius * 0.35) / 17
      const thump =
        Math.pow(Math.sin(theta), 8) + 0.7 * Math.pow(Math.sin(theta - 0.6), 8)
      pathX = centerX + heartX * heartScale * (1 + 0.06 * thump)
      // y flipped: the parametric heart is y-up, screen coords are y-down.
      pathY = centerY - heartY * heartScale * (1 + 0.06 * thump)
      rotation = Math.sin(theta * 0.8 + seed * TAU) * 20
      targetScale = 1 + 0.12 * thump
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
      const breath = 1 + 0.08 * Math.sin(theta * 0.5)
      pathX = centerX + ((boardRadius * 0.3 * breath) / denom) * Math.cos(phi)
      pathY = centerY + ((boardRadius * 0.46 * breath) / denom) * Math.sin(phi)
      rotation = Math.sin(theta + seed * TAU) * 10
      targetScale = 1 + 0.04 * Math.sin(theta * 2 + normalizedIndex)
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
      // 0.06 → 0.04 raw (last launch ~12 s in), drift ×~1.44, bounce freq ×1.2,
      // initial-drop time 0.35 → 0.25, envelope slightly livelier. Constants only —
      // continuity-safe.
      const tSince = Math.max(
        0,
        rawProgress - assignment.index * AVALANCHE_LAUNCH_INTERVAL_RAW
      )
      // Resting floor: cards bounce ON the visible floor, not inside the nav dock.
      const floorY = visibleFloorY - cardH
      const drop = Math.max(0, 1 - tSince / 0.25)
      // Bounce height decays and regrows via a slow smooth envelope (Big Bounce pattern).
      const envelope = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(TAU * tSince * 0.16 + seed * TAU))
      const bounceHeight = boardHeight * (0.22 + 0.18 * seed) * envelope
      const u0 = tSince * (4.2 + 1.8 * seed)
      const u = u0 - Math.floor(u0)
      const spanX = boardWidth + cardW * 8
      const x0 = assignment.baseX + cardW * 4 + boardWidth * (0.65 + 0.5 * seed) * direction * tSince
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
      const t0 = 0.04 + 0.012 * seedFall
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
      // Constant drift, range widened 8–10.5 → 7.5–11.5 boardWidths/raw (item 6),
      // still sized so even the slowest card fully exits within
      // IMPRINT_FLIGHT_SPAN_RAW (worst ≈ boardWidth·1.1 at 7.5/raw ≈ 0.147 < 0.16)
      // and x stays monotonic within a flight (continuity). Direction alternates by
      // launch order AND pass, so consecutive launches fly to opposite sides and a
      // card's second pass mirrors its first.
      const launchDirection = (launchOrder + pass) % 2 === 0 ? 1 : -1
      pathX =
        assignment.baseX +
        boardWidth * (7.5 + 4 * seedDrift) * launchDirection * tSince
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
