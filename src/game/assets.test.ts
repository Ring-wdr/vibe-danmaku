import { describe, expect, it } from 'vitest'
import path from 'node:path'
import sharp from 'sharp'

import { gameAssets } from './assets'

const playerSpriteSheetPaths = [
  'player-battle-sprite-sheet.png',
  'vesper-noire-sprite-sheet.png',
  'reina-shirogane-sprite-sheet.png',
  'astra-volt-sprite-sheet.png',
].map((fileName) =>
  path.join(process.cwd(), 'src/assets/generated/players', fileName),
)
const astraVoltSpriteSheetPath = path.join(
  process.cwd(),
  'src/assets/generated/players/astra-volt-sprite-sheet.png',
)
const astraVoltPortraitPaths = [
  path.join(process.cwd(), 'src/assets/generated/ui/ui-astra-volt-portrait.png'),
  path.join(process.cwd(), 'src/assets/generated/ui/ui-astra-volt-portrait.webp'),
]

async function getFrameAlphaBounds(filePath: string) {
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
    let minY = metadata.height
    let maxY = -1

    for (let y = 0; y < metadata.height; y += 1) {
      for (let x = frameIndex * frameWidth; x < (frameIndex + 1) * frameWidth; x += 1) {
        const alpha = raw[(y * metadata.width + x) * 4 + 3]
        if (alpha <= 8) {
          continue
        }

        const localX = x - frameIndex * frameWidth
        minX = Math.min(minX, localX)
        maxX = Math.max(maxX, localX)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }

    return {
      frameWidth,
      left: minX,
      right: frameWidth - 1 - maxX,
      top: minY,
      height: maxY - minY + 1,
    }
  })
}

async function getBottomAlphaPadding(filePath: string) {
  const image = sharp(filePath).ensureAlpha()
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error(`Missing portrait dimensions for ${filePath}`)
  }

  const raw = await image.raw().toBuffer()
  let maxY = -1

  for (let y = 0; y < metadata.height; y += 1) {
    for (let x = 0; x < metadata.width; x += 1) {
      const alpha = raw[(y * metadata.width + x) * 4 + 3]

      if (alpha > 8) {
        maxY = Math.max(maxY, y)
      }
    }
  }

  return metadata.height - 1 - maxY
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

  it('registers stage 3 abyssal biomech runtime assets', () => {
    expect(gameAssets.stage3TrenchFloorUrl).toMatch(/backgrounds\/abyssal-biomech\/stage3-trench-floor/)
    expect(gameAssets.stage3PressureLayerUrl).toMatch(/backgrounds\/abyssal-biomech\/stage3-pressure-layer/)
    expect(gameAssets.enemyAbyssalBiomechAtlasUrl).toMatch(/enemies\/enemy-abyssal-biomech-atlas/)
    expect(gameAssets.stage3MidbossCoreUrl).toMatch(/bosses\/stage3-midboss-core/)
    expect(gameAssets.stage3BossCoreUrl).toMatch(/bosses\/stage3-boss-core/)
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
    expect(gameAssets.astraVoltSheetUrl).toMatch(/players\/astra-volt-sprite-sheet/)
    expect(gameAssets.astraVoltPanelUrl).toMatch(/players\/astra-volt-panel/)
    expect(gameAssets.astraVoltPortraitUrl).toMatch(/ui\/ui-astra-volt-portrait/)
  })

  it('keeps playable sprite sheets on fixed-width frames with safe horizontal padding', async () => {
    for (const sheetPath of playerSpriteSheetPaths) {
      const framePaddings = await getFrameAlphaBounds(sheetPath)

      expect(framePaddings.every((frame) => frame.frameWidth === 512)).toBe(true)
      expect(framePaddings.every((frame) => frame.left >= 48 && frame.right >= 48)).toBe(
        true,
      )
    }
  })

  it('keeps Astra Volt source poses distinct after normalization', async () => {
    const frameBounds = await getFrameAlphaBounds(astraVoltSpriteSheetPath)
    const verticalSignatures = new Set(
      frameBounds.map((frame) => `${frame.top}:${frame.height}`),
    )

    expect(verticalSignatures.size).toBeGreaterThanOrEqual(3)
  })

  it('keeps Astra Volt portrait bottom alpha padding trimmed', async () => {
    for (const portraitPath of astraVoltPortraitPaths) {
      await expect(getBottomAlphaPadding(portraitPath)).resolves.toBeLessThanOrEqual(2)
    }
  })
})
