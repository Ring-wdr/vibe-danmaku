import { describe, expect, it } from 'vitest'

import { gameAssets } from './assets'

describe('gameAssets', () => {
  it('serves runtime raster assets from web-optimized files', () => {
    expect(Object.values(gameAssets).every((assetUrl) => assetUrl.endsWith('.webp'))).toBe(
      true,
    )
  })

  it('registers stage 2 burning ruins runtime assets', () => {
    expect(gameAssets.stage2RuinFloorUrl).toMatch(/stage2-ruin-floor/)
    expect(gameAssets.stage2SmokeLayerUrl).toMatch(/stage2-smoke-layer/)
    expect(gameAssets.stage2MidbossCoreUrl).toMatch(/stage2-midboss-core/)
  })
})
