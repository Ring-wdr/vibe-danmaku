import { describe, expect, it } from 'vitest'

import { gameAssets } from './assets'

describe('gameAssets', () => {
  it('serves runtime raster assets from web-optimized files', () => {
    expect(Object.values(gameAssets).every((assetUrl) => assetUrl.endsWith('.webp'))).toBe(
      true,
    )
  })
})
