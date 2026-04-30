export const battleCanvasFallbackColor = '#0a0d16'

export const battleCameraConfig = {
  position: [0, 3.35, 4.9] as [number, number, number],
  lookAt: [0, -0.95, -0.85] as [number, number, number],
  fov: 34,
} as const

export const battleInteractionConfig = {
  controlsZIndex: 6,
  stagePlaneZIndex: 4,
  stagePlanePointerEvents: 'none',
} as const

export const arenaVisualConfig = {
  ringColor: '#8b5e2a',
  ringEmissive: '#2de6de',
  ringEmissiveIntensity: 1.15,
  floorColor: '#131b29',
  floorEmissive: '#0f8c92',
  floorEmissiveIntensity: 0.58,
  playerHaloColor: '#5ceee4',
  playerHaloOpacity: 0.72,
  playerHaloScale: [0.72, 0.72] as [number, number],
  playerSpriteScale: [1.2, 1.62] as [number, number],
} as const

export const cloudBackdropLayers = [
  {
    texture: 'cloudA',
    size: [9, 9] as [number, number],
    rotation: [-Math.PI / 2.85, 0, 0] as [number, number, number],
    position: [0, -4.1, -7.2] as [number, number, number],
    opacity: 0.035,
  },
  {
    texture: 'cloudB',
    size: [10, 9] as [number, number],
    rotation: [-Math.PI / 2.9, 0, 0] as [number, number, number],
    position: [0, -4.35, -8.4] as [number, number, number],
    opacity: 0.028,
  },
] as const
