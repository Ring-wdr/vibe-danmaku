import type { EnemyAtlasId, EnemyFrameId } from '../types'

export type AtlasFrame = {
  x: number
  y: number
  w: number
  h: number
}

export const enemyAtlasSizeById: Record<EnemyAtlasId, { width: number; height: number }> = {
  'enemy-brass-cloud': { width: 576, height: 384 },
  'enemy-abyssal-biomech': { width: 576, height: 384 },
  'enemy-city-state': { width: 576, height: 384 },
}

const sharedFrames: Record<EnemyFrameId, AtlasFrame> = {
  scout: { x: 0, y: 0, w: 192, h: 192 },
  sentinel: { x: 192, y: 0, w: 192, h: 192 },
  lancer: { x: 384, y: 0, w: 192, h: 192 },
  splitter: { x: 0, y: 192, w: 192, h: 192 },
  'mine-layer': { x: 192, y: 192, w: 192, h: 192 },
  weaver: { x: 384, y: 192, w: 192, h: 192 },
}

export const enemyAtlasFramesById: Record<EnemyAtlasId, Record<EnemyFrameId, AtlasFrame>> = {
  'enemy-brass-cloud': sharedFrames,
  'enemy-abyssal-biomech': sharedFrames,
  'enemy-city-state': sharedFrames,
}

export const brassCloudEnemyFrames = enemyAtlasFramesById['enemy-brass-cloud']
export const enemyBrassCloudAtlasSize = enemyAtlasSizeById['enemy-brass-cloud']
