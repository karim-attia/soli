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
}

const CELEBRATION_MODE_METADATA: CelebrationMetadata[] = [
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
]

export const CELEBRATION_DURATION_MS = 60_000
export const CELEBRATION_MODE_COUNT = CELEBRATION_MODE_METADATA.length
export const CELEBRATION_WOBBLE_FREQUENCY = 5.5
export const TAU = Math.PI * 2

const CELEBRATION_SPEED_MULTIPLIER = 10.4
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

const easeOutCubic = (t: number): number => {
  'worklet'
  return 1 - Math.pow(1 - t, 3)
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
  const rawProgress = totalProgress % 1
  const launchProgress = Math.min(1, Math.max(0, totalProgress))
  const launchEased = easeOutCubic(launchProgress)
  const seed = assignment.randomSeed
  const relativeIndex = assignment.index - safeTotalCards / 2
  const normalizedIndex = (assignment.index + 1) / safeTotalCards
  const stackFactor = Math.min(1, Math.max(0, assignment.stackIndex / FOUNDATION_STACK_MAX))
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

  const mode = ((modeId % CELEBRATION_MODE_COUNT) + CELEBRATION_MODE_COUNT) % CELEBRATION_MODE_COUNT

  switch (mode) {
    case 0: {
      const radius = boardRadius * (0.24 + 0.18 * Math.sin(thetaDouble))
      pathX = centerX + Math.cos(thetaSeed) * radius + relativeIndex * metrics.width * 0.25
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
      const radius = boardRadius * (0.15 + 0.12 * ring + 0.05 * Math.sin(theta * 3 + seed))
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
  const index = ((modeId % CELEBRATION_MODE_COUNT) + CELEBRATION_MODE_COUNT) % CELEBRATION_MODE_COUNT
  return CELEBRATION_MODE_METADATA[index]
}


