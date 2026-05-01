import type { EnemyFrameId } from '../types'

export type AtlasFrame = {
  x: number
  y: number
  w: number
  h: number
}

export const enemyBrassCloudAtlasSize = {
  width: 576,
  height: 384,
} as const

export const brassCloudEnemyFrames: Record<EnemyFrameId, AtlasFrame> = {
  scout: { x: 0, y: 0, w: 192, h: 192 },
  sentinel: { x: 192, y: 0, w: 192, h: 192 },
  lancer: { x: 384, y: 0, w: 192, h: 192 },
  splitter: { x: 0, y: 192, w: 192, h: 192 },
  'mine-layer': { x: 192, y: 192, w: 192, h: 192 },
  weaver: { x: 384, y: 192, w: 192, h: 192 },
} as const
