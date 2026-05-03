import type { StageBackgroundTheme } from '../types'

export type BackgroundTextureKey =
  | 'a'
  | 'b'
  | 'stage2Smoke'
  | 'ruinFloor'
  | 'abyssalFloor'
  | 'abyssalPressure'
  | 'cityBlockA'
  | 'cityBlockB'
  | 'cityBlockC'

export type BackgroundMotionLayerConfig = {
  textureKey: BackgroundTextureKey
  x: number
  startY: number
  z: number
  width: number
  height: number
  opacity: number
  speed: number
  spacing: number
  rotation: number
  sway: number
}

export type BackgroundFixtureConfig = {
  x: number
  y: number
  z: number
  scale: number
  speed: number
  spin: number
  phase: number
  ringColor?: string
  crossColor?: string
  coreColor?: string
  ringOpacity?: number
  crossOpacity?: number
  coreOpacity?: number
}

export type StageBackgroundMotionConfig = {
  cloudLayers: readonly BackgroundMotionLayerConfig[]
  floorLayers: readonly BackgroundMotionLayerConfig[]
  fixtures: readonly BackgroundFixtureConfig[]
}

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
} as const satisfies Omit<StageBackgroundMotionConfig, 'floorLayers'>

export const stageBackgroundMotionConfigs = {
  'brass-cloud': {
    cloudLayers: battleBackgroundMotionConfig.cloudLayers,
    floorLayers: [],
    fixtures: battleBackgroundMotionConfig.fixtures,
  },
  'burning-ruins': {
    floorLayers: [
      {
        textureKey: 'ruinFloor',
        x: -0.28,
        startY: 0.9,
        z: -1.92,
        width: 8.2,
        height: 5.4,
        opacity: 0.58,
        speed: 0.44,
        spacing: 5.35,
        rotation: -0.03,
        sway: 0.035,
      },
      {
        textureKey: 'ruinFloor',
        x: 0.34,
        startY: 3.9,
        z: -1.98,
        width: 8.7,
        height: 5.6,
        opacity: 0.44,
        speed: 0.58,
        spacing: 5.55,
        rotation: 0.04,
        sway: 0.045,
      },
    ],
    cloudLayers: [
      {
        textureKey: 'stage2Smoke',
        x: -0.22,
        startY: 1.35,
        z: -1.68,
        width: 9.4,
        height: 4.8,
        opacity: 0.24,
        speed: 0.34,
        spacing: 4.95,
        rotation: -0.06,
        sway: 0.1,
      },
      {
        textureKey: 'stage2Smoke',
        x: 0.26,
        startY: 2.8,
        z: -1.5,
        width: 10.1,
        height: 5.05,
        opacity: 0.18,
        speed: 0.52,
        spacing: 5.25,
        rotation: 0.05,
        sway: 0.14,
      },
    ],
    fixtures: [
      {
        x: -2.75,
        y: 3.25,
        z: -1.1,
        scale: 0.52,
        speed: 0.84,
        spin: 0.28,
        phase: 0.3,
        ringColor: '#d06b38',
        crossColor: '#f2a24e',
        coreColor: '#ffcf73',
        ringOpacity: 0.26,
        crossOpacity: 0.22,
        coreOpacity: 0.14,
      },
      {
        x: 2.5,
        y: 1.3,
        z: -1.02,
        scale: 0.46,
        speed: 0.78,
        spin: -0.24,
        phase: 1.7,
        ringColor: '#b94f35',
        crossColor: '#de7b3b',
        coreColor: '#ffb15c',
        ringOpacity: 0.24,
        crossOpacity: 0.2,
        coreOpacity: 0.12,
      },
      {
        x: -1.4,
        y: -0.65,
        z: -1.16,
        scale: 0.38,
        speed: 0.72,
        spin: 0.36,
        phase: 2.6,
        ringColor: '#8f4033',
        crossColor: '#c8633b',
        coreColor: '#f2994a',
        ringOpacity: 0.22,
        crossOpacity: 0.18,
        coreOpacity: 0.1,
      },
      {
        x: 1.42,
        y: 4.1,
        z: -1.26,
        scale: 0.32,
        speed: 0.96,
        spin: -0.42,
        phase: 3.2,
        ringColor: '#d9783e',
        crossColor: '#f0a14b',
        coreColor: '#ffc464',
        ringOpacity: 0.24,
        crossOpacity: 0.18,
        coreOpacity: 0.11,
      },
    ],
  },
  'abyssal-biomech': {
    floorLayers: [
      {
        textureKey: 'abyssalFloor',
        x: -0.18,
        startY: 0.65,
        z: -1.94,
        width: 8.4,
        height: 5.6,
        opacity: 0.56,
        speed: 0.36,
        spacing: 5.45,
        rotation: -0.035,
        sway: 0.03,
      },
      {
        textureKey: 'abyssalFloor',
        x: 0.24,
        startY: 3.72,
        z: -2,
        width: 8.9,
        height: 5.8,
        opacity: 0.42,
        speed: 0.5,
        spacing: 5.7,
        rotation: 0.045,
        sway: 0.04,
      },
    ],
    cloudLayers: [
      {
        textureKey: 'abyssalPressure',
        x: -0.2,
        startY: 1.18,
        z: -1.66,
        width: 9.5,
        height: 4.9,
        opacity: 0.26,
        speed: 0.3,
        spacing: 5,
        rotation: -0.05,
        sway: 0.11,
      },
      {
        textureKey: 'abyssalPressure',
        x: 0.28,
        startY: 2.72,
        z: -1.48,
        width: 10.2,
        height: 5.1,
        opacity: 0.2,
        speed: 0.46,
        spacing: 5.3,
        rotation: 0.045,
        sway: 0.16,
      },
    ],
    fixtures: [
      {
        x: -2.68,
        y: 3.12,
        z: -1.08,
        scale: 0.5,
        speed: 0.78,
        spin: 0.24,
        phase: 0.5,
        ringColor: '#2dd4bf',
        crossColor: '#38bdf8',
        coreColor: '#a78bfa',
        ringOpacity: 0.24,
        crossOpacity: 0.2,
        coreOpacity: 0.13,
      },
      {
        x: 2.46,
        y: 1.18,
        z: -1.02,
        scale: 0.44,
        speed: 0.72,
        spin: -0.22,
        phase: 1.8,
        ringColor: '#22d3ee',
        crossColor: '#60a5fa',
        coreColor: '#c084fc',
        ringOpacity: 0.23,
        crossOpacity: 0.19,
        coreOpacity: 0.12,
      },
      {
        x: -1.34,
        y: -0.72,
        z: -1.14,
        scale: 0.36,
        speed: 0.68,
        spin: 0.34,
        phase: 2.7,
        ringColor: '#14b8a6',
        crossColor: '#0ea5e9',
        coreColor: '#8b5cf6',
        ringOpacity: 0.21,
        crossOpacity: 0.17,
        coreOpacity: 0.1,
      },
      {
        x: 1.38,
        y: 4.02,
        z: -1.24,
        scale: 0.31,
        speed: 0.9,
        spin: -0.38,
        phase: 3.4,
        ringColor: '#67e8f9',
        crossColor: '#818cf8',
        coreColor: '#d8b4fe',
        ringOpacity: 0.22,
        crossOpacity: 0.17,
        coreOpacity: 0.1,
      },
    ],
  },
  'city-states': {
    floorLayers: [],
    cloudLayers: [
      {
        textureKey: 'cityBlockA',
        x: -0.08,
        startY: 0.72,
        z: -1.84,
        width: 8.4,
        height: 4.9,
        opacity: 0.62,
        speed: 0.42,
        spacing: 4.9,
        rotation: -0.02,
        sway: 0.018,
      },
      {
        textureKey: 'cityBlockB',
        x: 0.2,
        startY: 3.74,
        z: -1.92,
        width: 8.8,
        height: 5.05,
        opacity: 0.5,
        speed: 0.52,
        spacing: 5,
        rotation: 0.018,
        sway: 0.022,
      },
      {
        textureKey: 'cityBlockC',
        x: -0.24,
        startY: 6.84,
        z: -2,
        width: 9.1,
        height: 5.15,
        opacity: 0.44,
        speed: 0.62,
        spacing: 5.05,
        rotation: -0.012,
        sway: 0.025,
      },
    ],
    fixtures: [
      {
        x: -2.7,
        y: 3.18,
        z: -1.08,
        scale: 0.5,
        speed: 0.78,
        spin: 0.2,
        phase: 0.6,
        ringColor: '#d7b56d',
        crossColor: '#9db4c7',
        coreColor: '#6ee7f9',
        ringOpacity: 0.22,
        crossOpacity: 0.18,
        coreOpacity: 0.11,
      },
      {
        x: 2.48,
        y: 1.2,
        z: -1.02,
        scale: 0.42,
        speed: 0.72,
        spin: -0.22,
        phase: 1.9,
        ringColor: '#b7954e',
        crossColor: '#c8d3dd',
        coreColor: '#93c5fd',
        ringOpacity: 0.2,
        crossOpacity: 0.16,
        coreOpacity: 0.1,
      },
    ],
  },
} as const satisfies Record<StageBackgroundTheme, StageBackgroundMotionConfig>
