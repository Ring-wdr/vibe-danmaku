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

export const battleBackgroundMotionConfig = {
  cloudLayers: [
    {
      textureKey: 'a',
      x: -0.18,
      startY: 1.15,
      z: -1.85,
      width: 9.4,
      height: 4.7,
      opacity: 0.4,
      speed: 0.38,
      spacing: 4.85,
      rotation: -0.08,
      sway: 0.08,
    },
    {
      textureKey: 'b',
      x: 0.18,
      startY: 2.15,
      z: -1.55,
      width: 10.6,
      height: 4.95,
      opacity: 0.28,
      speed: 0.62,
      spacing: 5.1,
      rotation: 0.06,
      sway: 0.13,
    },
  ],
  fixtures: [
    { x: -2.85, y: 3.35, z: -1.12, scale: 0.54, speed: 0.94, spin: 0.35, phase: 0 },
    { x: 2.62, y: 1.5, z: -1.05, scale: 0.48, speed: 0.86, spin: -0.28, phase: 1.4 },
    { x: -1.65, y: -0.82, z: -1.18, scale: 0.4, speed: 0.75, spin: 0.42, phase: 2.3 },
    { x: 1.55, y: 4.2, z: -1.28, scale: 0.34, speed: 1.09, spin: -0.5, phase: 3.1 },
  ],
} as const
