import type { ArenaPoint, CharacterDefinition } from '../types'

type MoveRadius = CharacterDefinition['moveRadius']

export const battleInputProjectionConfig = {
  cameraPositionZ: 8,
  cameraFov: 48,
  playerRenderZ: 0.65,
  arenaXScale: 0.55,
  arenaZScale: 0.9,
  arenaYOffset: -0.45,
} as const

export const battleDragInputConfig = {
  horizontalWorldSpan: 9.2,
  verticalWorldSpan: 5.2,
  verticalWorldTop: 1.8,
} as const

const backgroundLoop = {
  minY: -4.35,
  height: 8.15,
} as const

export const flightBodyAirflowCowlConfigs = [
  {
    z: 0.8,
    thickness: 0.018,
    opacity: 0.34,
    phase: 0.2,
    points: [
      [-0.68, -0.74],
      [-0.58, -0.22],
      [-0.35, 0.28],
      [-0.12, 0.43],
      [0.12, 0.43],
      [0.35, 0.28],
      [0.58, -0.22],
      [0.68, -0.74],
    ] as [number, number][],
  },
  {
    z: 0.81,
    thickness: 0.011,
    opacity: 0.22,
    phase: 1.7,
    points: [
      [-0.5, -0.52],
      [-0.41, -0.04],
      [-0.22, 0.25],
      [0, 0.34],
      [0.22, 0.25],
      [0.41, -0.04],
      [0.5, -0.52],
    ] as [number, number][],
  },
] as const
export const flightTurnWakeConfigs = [
  { side: -1, y: -0.22, z: 0.61, phase: 0 },
  { side: 1, y: -0.22, z: 0.61, phase: 1.3 },
] as const

export function getLoopingBackgroundY(startY: number, elapsed: number, speed: number) {
  const rawY = startY - elapsed * speed
  const shifted = rawY - backgroundLoop.minY
  const wrapped = ((shifted % backgroundLoop.height) + backgroundLoop.height) % backgroundLoop.height

  return backgroundLoop.minY + wrapped
}

export function getFlightAirflowDynamics({
  currentPosition,
  previousPosition,
  previousHorizontalVelocity,
  delta,
}: {
  currentPosition: ArenaPoint
  previousPosition: ArenaPoint
  previousHorizontalVelocity: number
  delta: number
}) {
  const safeDelta = Math.max(delta, 1 / 90)
  const horizontalVelocity = (currentPosition.x - previousPosition.x) / safeDelta
  const verticalVelocity = (currentPosition.z - previousPosition.z) / safeDelta
  const horizontalAcceleration = horizontalVelocity - previousHorizontalVelocity
  const direction: -1 | 0 | 1 =
    Math.abs(horizontalVelocity) > 0.04 ? (horizontalVelocity < 0 ? -1 : 1) : 0

  return {
    direction,
    horizontalVelocity,
    verticalVelocity,
    speedRatio: Math.min(1, Math.hypot(horizontalVelocity, verticalVelocity) / 8),
    turnRatio: Math.min(1, Math.abs(horizontalAcceleration) / 22),
  }
}

export function arenaPointToView(point: ArenaPoint, z = 0.5): [number, number, number] {
  return [
    point.x * battleInputProjectionConfig.arenaXScale,
    point.z * battleInputProjectionConfig.arenaZScale + battleInputProjectionConfig.arenaYOffset,
    z,
  ]
}

export function createArenaPoint(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): ArenaPoint {
  const xRatio = (clientX - rect.left) / rect.width
  const yRatio = (clientY - rect.top) / rect.height

  return {
    x: (xRatio - 0.5) * battleDragInputConfig.horizontalWorldSpan,
    z: battleDragInputConfig.verticalWorldTop - yRatio * battleDragInputConfig.verticalWorldSpan,
  }
}

function clampRatio(value: number) {
  return Math.min(1, Math.max(0, value))
}

function getVisibleHalfHeightAtRenderZ(renderZ: number) {
  const cameraDistance = battleInputProjectionConfig.cameraPositionZ - renderZ

  return Math.tan((battleInputProjectionConfig.cameraFov * Math.PI) / 360) * cameraDistance
}

export function createMoveRadiusArenaPoint(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  moveRadius: MoveRadius,
): ArenaPoint {
  const xRatio = clampRatio((clientX - rect.left) / rect.width)
  const yRatio = clampRatio((clientY - rect.top) / rect.height)
  const visibleHalfHeight = getVisibleHalfHeightAtRenderZ(
    battleInputProjectionConfig.playerRenderZ,
  )
  const visibleHalfWidth = visibleHalfHeight * (rect.width / rect.height)
  const viewX = (xRatio - 0.5) * visibleHalfWidth * 2
  const viewY = (1 - yRatio * 2) * visibleHalfHeight

  return {
    x: Math.min(
      moveRadius.x,
      Math.max(-moveRadius.x, viewX / battleInputProjectionConfig.arenaXScale),
    ),
    z: Math.min(
      moveRadius.maxZ,
      Math.max(
        moveRadius.minZ,
        (viewY - battleInputProjectionConfig.arenaYOffset) /
          battleInputProjectionConfig.arenaZScale,
      ),
    ),
  }
}
