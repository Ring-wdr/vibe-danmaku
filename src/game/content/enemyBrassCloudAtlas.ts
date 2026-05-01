import type { EnemyFrameId } from '../types'

export type AtlasFrame = {
  x: number
  y: number
  w: number
  h: number
}

export const enemyBrassCloudAtlasSize = {
  width: 768,
  height: 512,
} as const

export const brassCloudEnemyFrames: Record<EnemyFrameId, AtlasFrame> = {
  scout: { x: 0, y: 0, w: 256, h: 256 },
  sentinel: { x: 256, y: 0, w: 256, h: 256 },
  lancer: { x: 512, y: 0, w: 256, h: 256 },
  splitter: { x: 0, y: 256, w: 256, h: 256 },
  'mine-layer': { x: 256, y: 256, w: 256, h: 256 },
  weaver: { x: 512, y: 256, w: 256, h: 256 },
} as const
