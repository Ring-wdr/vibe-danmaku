import { describe, expect, it } from 'vitest'

import { gameAssets } from './assets'

describe('gameAssets', () => {
  it('serves runtime raster assets from web-optimized files', () => {
    expect(Object.values(gameAssets).every((assetUrl) => assetUrl.endsWith('.webp'))).toBe(
      true,
    )
  })

  it('registers stage 2 burning ruins runtime assets', () => {
    expect(gameAssets.stage2RuinFloorUrl).toMatch(/backgrounds\/burning-ruins\/stage2-ruin-floor/)
    expect(gameAssets.stage2SmokeLayerUrl).toMatch(/backgrounds\/burning-ruins\/stage2-smoke-layer/)
    expect(gameAssets.stage2MidbossCoreUrl).toMatch(/bosses\/stage2-midboss-core/)
    expect(gameAssets.stage2BossCoreUrl).toMatch(/bosses\/stage2-boss-core/)
  })

  it('groups generated runtime assets by role and theme', () => {
    expect(gameAssets.bossCoreUrl).toMatch(/bosses\/boss-core/)
    expect(gameAssets.cloudLayerAUrl).toMatch(/backgrounds\/brass-cloud\/cloud-layer-a/)
    expect(gameAssets.cloudLayerBUrl).toMatch(/backgrounds\/brass-cloud\/cloud-layer-b/)
    expect(gameAssets.enemyBrassCloudAtlasUrl).toMatch(/enemies\/enemy-brass-cloud-atlas/)
    expect(gameAssets.itemAtlasUrl).toMatch(/items\/item-atlas/)
    expect(gameAssets.playerSheetUrl).toMatch(/players\/player-battle-sprite-sheet/)
    expect(gameAssets.playerPortraitUrl).toMatch(/ui\/ui-player-portrait/)
    expect(gameAssets.uiOrnamentUrl).toMatch(/ui\/ui-ornament/)
    expect(gameAssets.vesperNoirePanelUrl).toMatch(/players\/vesper-noire-panel/)
    expect(gameAssets.vesperNoireSheetUrl).toMatch(/players\/vesper-noire-sprite-sheet/)
    expect(gameAssets.vesperNoirePortraitUrl).toMatch(/ui\/ui-vesper-noire-portrait/)
    expect(gameAssets.reinaShiroganeSheetUrl).toMatch(/players\/reina-shirogane-sprite-sheet/)
    expect(gameAssets.reinaShiroganeSwordUrl).toMatch(/players\/reina-shirogane-sword/)
    expect(gameAssets.reinaShiroganePortraitUrl).toMatch(/ui\/ui-reina-shirogane-portrait/)
  })
})
