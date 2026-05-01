import { describe, expect, it } from 'vitest'

import {
  arenaVisualConfig,
  battleCameraConfig,
  battleCanvasFallbackColor,
  battleBackgroundMotionConfig,
  battleInteractionConfig,
  cloudBackdropLayers,
  stageBackgroundMotionConfigs,
} from './sceneConfig'

describe('cloudBackdropLayers', () => {
  it('keeps cloud layers subtle and behind the arena so they do not wash out the playfield', () => {
    expect(cloudBackdropLayers).toHaveLength(2)
    expect(cloudBackdropLayers.every((layer) => layer.opacity <= 0.04)).toBe(true)
    expect(cloudBackdropLayers.every((layer) => layer.position[1] <= -3)).toBe(true)
    expect(cloudBackdropLayers.every((layer) => layer.position[2] <= -6)).toBe(true)
  })

  it('defines a non-white fallback backdrop for the battle canvas', () => {
    expect(battleCanvasFallbackColor).toBe('#0a0d16')
  })

  it('uses faster scrolling cloud layers and fixture drift for a brisker battle feel', () => {
    expect(battleBackgroundMotionConfig.cloudLayers.map((layer) => layer.speed)).toEqual([
      0.38,
      0.62,
    ])
    expect(battleBackgroundMotionConfig.fixtures.map((fixture) => fixture.speed)).toEqual([
      0.94,
      0.86,
      0.75,
      1.09,
    ])
  })

  it('defines distinct motion layers for brass clouds and burning ruins', () => {
    const burningRuinsConfig = stageBackgroundMotionConfigs['burning-ruins']
    const brassCloudConfig = stageBackgroundMotionConfigs['brass-cloud']

    expect(burningRuinsConfig.floorLayers).toHaveLength(2)
    expect(
      burningRuinsConfig.floorLayers.every((layer) => layer.textureKey === 'ruinFloor'),
    ).toBe(true)
    expect(burningRuinsConfig.floorLayers.every((layer) => layer.speed > 0)).toBe(true)
    expect(burningRuinsConfig.floorLayers.every((layer) => layer.z > -2)).toBe(true)
    expect(burningRuinsConfig.floorLayers.every((layer) => layer.opacity >= 0.4)).toBe(
      true,
    )
    expect(
      burningRuinsConfig.cloudLayers.some((layer) => layer.textureKey === 'stage2Smoke'),
    ).toBe(true)

    expect(brassCloudConfig.cloudLayers).toBe(battleBackgroundMotionConfig.cloudLayers)
    expect(brassCloudConfig.floorLayers).toHaveLength(0)
  })

  it('aims the battle camera down toward the arena instead of looking over it', () => {
    expect(battleCameraConfig.position[1]).toBeGreaterThan(2)
    expect(battleCameraConfig.lookAt[1]).toBeLessThan(0)
    expect(battleCameraConfig.lookAt[2]).toBeLessThan(0)
  })

  it('keeps arena accents bright enough that the player and battlefield are visible on mobile', () => {
    expect(arenaVisualConfig.ringEmissiveIntensity).toBeGreaterThanOrEqual(0.9)
    expect(arenaVisualConfig.floorEmissiveIntensity).toBeGreaterThanOrEqual(0.45)
    expect(arenaVisualConfig.playerHaloOpacity).toBeGreaterThanOrEqual(0.5)
    expect(arenaVisualConfig.playerSpriteScale[1]).toBeGreaterThan(1.4)
  })

  it('keeps the drag input layer above decorative stage layers on desktop', () => {
    expect(battleInteractionConfig.controlsZIndex).toBeGreaterThan(
      battleInteractionConfig.stagePlaneZIndex,
    )
    expect(battleInteractionConfig.stagePlanePointerEvents).toBe('none')
  })
})
