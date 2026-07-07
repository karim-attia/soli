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
  // Perf budget: per-frame Fabric updates scale with 52 × (count + 1) mounted views,
  // so `count` dominates trail cost. Counts were lowered 2026-07-07 (Meteor 5→3,
  // Cascade 4→3, Comet Halo 4→3, Galaxy 3→2) after lag reports on a phone.
  trail?: { count: number; gapMs: number }
}

// Stable-id contract: ids are permanent identifiers, NOT array indices. When a mode is
// removed later, delete its metadata entry here and retire its switch case number in
// computeCelebrationFrame — never renumber or reuse ids. Selection always picks a random
// entry from this list (see useCelebrationController), so gaps in the id sequence are fine.
export const CELEBRATION_MODE_METADATA: CelebrationMetadata[] = [
  { id: 0, name: 'Spiral Bloom' },
  { id: 1, name: 'Lissajous Weave' },
  { id: 2, name: 'Pendulum Cascade' },
  { id: 3, name: 'Orbit Carousel' },
  { id: 4, name: 'Ellipse Drift' },
  { id: 5, name: 'Starburst Spur' },
  { id: 6, name: 'Dual Spiral' },
  { id: 7, name: 'Wave Loop' },
  { id: 8, name: 'Ring Cascade' },
  { id: 9, name: 'Drift Orbit' },
  // NO trail on Comet Halo (tried 2026-07-07, reverted same day): like Galaxy, it keeps
  // all 52 cards in a tight cluster, and translucent ghosts multiply overdraw where it is
  // already deepest — measured 6fps on a budget phone. Rule of thumb: trails ONLY on
  // modes that spread cards out (Cascade ran at baseline 51fps with 3 ghosts).
  { id: 10, name: 'Comet Halo' },
  { id: 11, name: 'Resonance Field' },
  { id: 12, name: 'Column Glide' },
  { id: 13, name: 'Aurora Twist' },
  { id: 14, name: 'Wave Sweep' },
  { id: 15, name: 'Constellation Waltz' },
  { id: 16, name: 'Pulse Orbit' },
  { id: 17, name: 'Clover Spin' },
  { id: 18, name: 'Horizon Arc' },
  { id: 19, name: 'Jitter Swarm' },
  { id: 20, name: 'Fountain' },
  { id: 21, name: 'Card Rain' },
  { id: 22, name: 'Vortex' },
  { id: 23, name: 'Infinity Loop' },
  { id: 24, name: 'Suit Orbits' },
  { id: 25, name: 'Flock' },
  { id: 26, name: 'Shockwave' },
  // NO trail on Galaxy: the log spiral piles cards into a small center region, so ghosts
  // multiply translucent overdraw exactly where it's already dozens of layers deep —
  // measured 16fps with GPU stalls on a budget phone even with 2 ghosts and no opacity
  // twinkle (Android perf test, Story 5, 2026-07-07). Trails belong on spread-out modes.
  { id: 27, name: 'Galaxy' },
  { id: 28, name: 'Big Bounce' },
  { id: 29, name: 'Heartbeat' },
  { id: 30, name: 'Diamond Drift' },
  { id: 31, name: 'Classic Cascade', trail: { count: 3, gapMs: 80 } },
  // Meteor sweeps the whole screen fast (full-screen dirty region every frame), so it
  // is the most GPU-bound mode — 2 ghosts with a wider gap keeps the streak look at
  // acceptable fps on budget phones (Android perf test, Story 5, 2026-07-07).
  { id: 32, name: 'Meteor Shower', trail: { count: 2, gapMs: 75 } },
]

export const CELEBRATION_DURATION_MS = 60_000
export const CELEBRATION_WOBBLE_FREQUENCY = 5.5
export const TAU = Math.PI * 2

const CELEBRATION_SPEED_MULTIPLIER = 10.4
// PBI-28 follow-up: celebration cards must break out of stacked foundations immediately.
// This used to be done with a 0.08 launch head start, but that rendered frame 1 already
// ~22% toward the path — a visible one-frame snap off the piles. A steeper quint ease
// from exactly 0 keeps the breakout fast (~29% eased after 100ms) AND position-continuous.
const CELEBRATION_LAUNCH_SPEED_MULTIPLIER = 40
const FOUNDATION_STACK_MAX = 13

export type CelebrationFrameInput = {
  modeId: number
  assignment: CelebrationAssignment
  metrics: { width: number; height: number }
  board: { width: number; height: number }
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

const easeOutQuint = (t: number): number => {
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
    case 1: {
      const ampX = boardRadius * (0.3 + 0.1 * Math.sin(thetaDouble))
      const ampY = boardRadius * (0.22 + 0.06 * Math.cos(thetaDouble + seed))
      pathX = centerX + Math.sin(theta) * ampX
      pathY = centerY + Math.sin(theta * 2 + seed * TAU) * ampY
      rotation = (Math.sin(theta) * 540) / Math.PI
      targetScale = 1 + 0.05 * Math.sin(theta * 2 + normalizedIndex)
      break
    }
    case 2: {
      const ampX = boardRadius * (0.18 + stackFactor * 0.12)
      const ampY = boardRadius * 0.38
      pathX = centerX + Math.sin(theta * 1.5 + seed * TAU) * ampX
      pathY = centerY - Math.cos(theta + seed * 0.5) * ampY
      rotation = (theta * 360) / Math.PI
      targetScale = 1 + 0.05 * Math.cos(theta * 3 + seed)
      break
    }
    case 3: {
      const angle = theta * 1.5 + seed * TAU
      const radius = boardRadius * (0.25 + 0.2 * Math.sin(theta * 2 + normalizedIndex))
      pathX = centerX + Math.cos(angle) * radius
      pathY = centerY + Math.sin(angle) * radius
      rotation = (angle * 180) / Math.PI
      targetScale = 1 + 0.07 * Math.sin(theta + stackFactor)
      break
    }
    case 4: {
      const angle = theta + stackFactor
      const radiusX = boardRadius * (0.3 + 0.1 * Math.sin(thetaDouble + normalizedIndex))
      const radiusY = boardRadius * (0.2 + 0.08 * Math.cos(thetaDouble + seed))
      pathX = centerX + Math.cos(angle) * radiusX
      pathY = centerY + Math.sin(angle) * radiusY
      rotation = (Math.sin(theta * 2 + seed) * 360) / Math.PI
      targetScale = 1 + 0.04 * Math.sin(theta * 4 + seed)
      break
    }
    case 5: {
      const spur = Math.sin(theta * 5 + seed * 3)
      const radius = boardRadius * (0.18 + 0.22 * Math.abs(spur))
      const angle = theta + spur * 0.3
      pathX = centerX + Math.cos(angle) * radius
      pathY = centerY + Math.sin(angle) * radius
      rotation = (angle * 180) / Math.PI + spur * 30
      targetScale = 1 + 0.05 * Math.sin(theta * 5 + normalizedIndex)
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
    case 7: {
      const angle = theta + normalizedIndex
      const radiusX = boardRadius * 0.22
      const radiusY = boardRadius * (0.3 + 0.1 * Math.sin(thetaDouble + stackFactor))
      pathX = centerX + Math.sin(angle) * radiusX
      pathY = centerY - Math.cos(angle) * radiusY
      rotation = (Math.cos(theta) * 360) / Math.PI
      targetScale = 1 + 0.05 * Math.sin(theta * 2 + normalizedIndex)
      break
    }
    case 8: {
      const ring = Math.floor(normalizedIndex * 4)
      const radius =
        boardRadius * (0.15 + 0.12 * ring + 0.05 * Math.sin(theta * 3 + seed))
      const angle = theta + ring * 0.3
      pathX = centerX + Math.cos(angle) * radius
      pathY = centerY + Math.sin(angle) * radius
      rotation = (angle * 180) / Math.PI + ring * 20
      targetScale = 1 + ring * 0.03 + 0.02 * Math.sin(theta * 4 + seed)
      break
    }
    case 9: {
      const angle = theta + seed
      const drift = Math.sin(thetaDouble) * boardRadius * 0.12
      pathX = centerX + Math.cos(angle) * boardRadius * 0.28 + drift
      pathY = centerY - Math.sin(angle) * boardRadius * 0.35 + drift * 0.6
      rotation = (angle * 180) / Math.PI + drift * 10
      targetScale = 1 + 0.05 * Math.sin(theta * 2 + stackFactor)
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
    case 11: {
      const ampX = boardRadius * (0.25 + 0.05 * Math.sin(seed * TAU))
      const ampY = boardRadius * (0.32 + 0.06 * Math.cos(seed * TAU))
      pathX = centerX + Math.sin(theta * 1.7 + seed) * ampX
      pathY = centerY + Math.sin(theta * 2.3 + seed * 0.4) * ampY
      rotation = (Math.sin(theta * 2) * 360) / Math.PI
      targetScale = 1 + 0.05 * Math.sin(theta * 3 + normalizedIndex)
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
    case 14: {
      const wave = Math.sin(theta + seed)
      const ampX = boardRadius * 0.4
      const ampY = boardRadius * (0.2 + 0.1 * Math.sin(theta * 2 + stackFactor))
      pathX = centerX + wave * ampX
      pathY = centerY + Math.sin(theta * 3 + seed) * ampY
      rotation = wave * 270
      targetScale = 1 + 0.04 * Math.sin(theta * 3 + normalizedIndex)
      break
    }
    case 15: {
      const angle = theta * 2 + normalizedIndex * TAU
      const radius = boardRadius * (0.22 + 0.15 * Math.sin(theta + normalizedIndex))
      pathX = centerX + Math.cos(angle) * radius
      pathY = centerY + Math.sin(angle) * radius
      rotation = (angle * 180) / Math.PI
      targetScale = 1 + 0.05 * Math.sin(theta * 2 + stackFactor)
      targetOpacity = 0.9 + 0.1 * Math.cos(theta * 2 + normalizedIndex)
      break
    }
    case 16: {
      const pulse = 0.7 + 0.3 * Math.sin(theta * 3 + seed)
      const angle = theta + stackFactor
      const radius = boardRadius * 0.28 * pulse
      pathX = centerX + Math.cos(angle) * radius
      pathY = centerY + Math.sin(angle) * radius
      rotation = (angle * 180) / Math.PI + pulse * 45
      targetScale = pulse
      break
    }
    case 17: {
      const clover = Math.sin(theta * 3)
      const radius = boardRadius * (0.22 + 0.18 * Math.abs(clover))
      const angle = theta + clover * 0.3 + seed
      pathX = centerX + Math.cos(angle) * radius
      pathY = centerY + Math.sin(angle) * radius
      rotation = (angle * 180) / Math.PI
      targetScale = 1 + 0.04 * clover
      break
    }
    case 18: {
      const angle = theta + seed
      const radius = boardRadius * (0.35 + 0.12 * Math.sin(theta * 2 + normalizedIndex))
      pathX = centerX + Math.cos(angle) * radius
      pathY = centerY - Math.sin(angle) * radius * 0.85
      rotation = (angle * 180) / Math.PI
      targetScale = 1 + 0.05 * Math.sin(theta * 2 + seed)
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
    // position-continuous by construction — no visible teleport.
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
    // shrink toward the center for depth.
    case 22: {
      const angle = theta * 1.2 + normalizedIndex * TAU
      const radius = boardRadius * (0.225 - 0.175 * Math.cos(theta * 0.35 + normalizedIndex * 2))
      pathX = centerX + Math.cos(angle) * radius
      pathY = centerY + Math.sin(angle) * radius
      rotation = (angle * 180) / Math.PI
      targetScale = 0.6 + 0.4 * (radius / (boardRadius * 0.4))
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
    case 25: {
      const phi = theta - 0.05 * assignment.index
      pathX =
        centerX +
        boardRadius * (0.26 * Math.sin(phi) + 0.14 * Math.sin(phi * 1.37 + 1.7)) +
        (seed - 0.5) * metrics.width * 0.8
      pathY =
        centerY +
        boardRadius * (0.2 * Math.cos(phi * 0.73 + 0.4) + 0.12 * Math.sin(phi * 1.19 + 3.1)) +
        (seed - 0.5) * metrics.height * 0.6
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
    // Big Bounce: fan of bouncing columns; |cos| gives the bounce (continuous, kinked
    // velocity at the floor is fine) and a slow sine envelope decays/regrows the height.
    case 28: {
      const phase = seed * TAU + normalizedIndex * 2
      const bounce = Math.abs(Math.cos(theta * 1.5 + phase))
      const envelope = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(theta * 0.3 + seed * TAU))
      const floorY = centerY + boardRadius * 0.3
      pathX = centerX + relativeIndex * metrics.width * 0.25
      pathY = floorY - boardRadius * (0.35 + 0.2 * seed) * bounce * envelope
      rotation = 12 * Math.sin(theta * 3 + phase) * direction
      targetScale = 1 + 0.05 * bounce
      break
    }
    // Heartbeat: cards ride the classic parametric heart curve; the whole heart pulses in
    // a double-thump rhythm (two narrow sin^8 bumps close together per beat period).
    case 29: {
      const t = normalizedIndex * TAU + theta * 0.15
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
    // Diamond Drift: diamond outline via L1 mapping; cards drift along the perimeter
    // while the whole diamond rotates slowly (0.2 turn per cycle-equivalent).
    case 30: {
      const phi = normalizedIndex * TAU + theta * 0.4
      const denom = Math.abs(Math.cos(phi)) + Math.abs(Math.sin(phi))
      const dx = ((boardRadius * 0.32) / denom) * Math.cos(phi)
      const dy = ((boardRadius * 0.32) / denom) * Math.sin(phi)
      const spin = theta * 0.2
      pathX = centerX + dx * Math.cos(spin) - dy * Math.sin(spin)
      pathY = centerY + dx * Math.sin(spin) + dy * Math.cos(spin)
      rotation = (spin * 180) / Math.PI + Math.sin(theta + seed * TAU) * 10
      targetScale = 1 + 0.04 * Math.sin(theta * 2 + normalizedIndex)
      break
    }
    // Classic Cascade: Windows-Solitaire homage. Continuity tricks:
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
      // 0.06 raw units ≈ 0.35 s between launches; the last card launches ~18 s in.
      const tSince = Math.max(0, rawProgress - assignment.index * 0.06)
      const floorY = boardHeight - cardH
      const drop = Math.max(0, 1 - tSince / 0.35)
      // Bounce height decays and regrows via a slow smooth envelope (Big Bounce pattern).
      const envelope = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(TAU * tSince * 0.13 + seed * TAU))
      const bounceHeight = boardHeight * (0.22 + 0.18 * seed) * envelope
      const u0 = tSince * (3.5 + 1.5 * seed)
      const u = u0 - Math.floor(u0)
      const spanX = boardWidth + cardW * 8
      const x0 = assignment.baseX + cardW * 4 + boardWidth * (0.45 + 0.35 * seed) * direction * tSince
      const ux = x0 / spanX - Math.floor(x0 / spanX)
      pathX = ux * spanX - cardW * 4
      pathY = floorY - 4 * bounceHeight * u * (1 - u) - (floorY - assignment.baseY) * drop * drop
      // No rotation/scale games: the classic cascade slides and bounces upright.
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
      // Aligned with the (constant per board) travel diagonal, plus a FIXED per-card
      // tilt instead of a per-frame oscillation: Meteor ran at 25fps on a budget phone
      // with per-frame rotation+scale churn on 208 views; translate-only Cascade ran at
      // baseline 51fps (Android perf test, Story 5, 2026-07-07). The sway in pathX keeps
      // the streaks alive; trails carry the rest.
      rotation = (Math.atan2(spanY, spanX) * 180) / Math.PI - 90 + (seed - 0.5) * 12
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
