import { describe, expect, it } from 'vitest'
import path from 'node:path'
import sharp from 'sharp'

import { gameAssets } from './assets'

const playerSpriteSheetPaths = [
  'player-battle-sprite-sheet.png',
  'vesper-noire-sprite-sheet.png',
  'reina-shirogane-sprite-sheet.png',
].map((fileName) =>
  path.join(process.cwd(), 'src/assets/generated/players', fileName),
)

async function getFrameHorizontalPadding(filePath: string) {
  const image = sharp(filePath)
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error(`Missing sprite sheet dimensions for ${filePath}`)
  }

  const frameCount = 4
  const frameWidth = metadata.width / frameCount
  const raw = await image.ensureAlpha().raw().toBuffer()

  return Array.from({ length: frameCount }, (_, frameIndex) => {
    let minX = frameWidth
    let maxX = -1

    for (let y = 0; y < metadata.height; y += 1) {
      for (let x = frameIndex * frameWidth; x < (frameIndex + 1) * frameWidth; x += 1) {
        const alpha = raw[(y * metadata.width + x) * 4 + 3]
        if (alpha <= 8) {
          continue
        }

        const localX = x - frameIndex * frameWidth
        minX = Math.min(minX, localX)
        maxX = Math.max(maxX, localX)
      }
    }

    return {
      frameWidth,
      left: minX,
      right: frameWidth - 1 - maxX,
    }
  })
}

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

  it('keeps playable sprite sheets on fixed-width frames with safe horizontal padding', async () => {
    for (const sheetPath of playerSpriteSheetPaths) {
      const framePaddings = await getFrameHorizontalPadding(sheetPath)

      expect(framePaddings.every((frame) => frame.frameWidth === 512)).toBe(true)
      expect(framePaddings.every((frame) => frame.left >= 48 && frame.right >= 48)).toBe(
        true,
      )
    }
  })
})
