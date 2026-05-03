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
const stage3BossCutoutPaths = [
  path.join(process.cwd(), 'src/assets/generated/bosses/stage3-midboss-core.png'),
  path.join(process.cwd(), 'src/assets/generated/bosses/stage3-midboss-core.webp'),
  path.join(process.cwd(), 'src/assets/generated/bosses/stage3-boss-core.png'),
  path.join(process.cwd(), 'src/assets/generated/bosses/stage3-boss-core.webp'),
  path.join(process.cwd(), 'src/assets/generated/bosses/stage3-boss-body.png'),
  path.join(process.cwd(), 'src/assets/generated/bosses/stage3-boss-body.webp'),
]
const stage3BossAppendagePaths = [
  path.join(process.cwd(), 'src/assets/generated/bosses/stage3-boss-appendages.png'),
  path.join(process.cwd(), 'src/assets/generated/bosses/stage3-boss-appendages.webp'),
]
const stage3BossArmorTexturePaths = [
  path.join(process.cwd(), 'src/assets/generated/bosses/stage3-boss-armor-texture.png'),
  path.join(process.cwd(), 'src/assets/generated/bosses/stage3-boss-armor-texture.webp'),
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

async function getCutoutStats(filePath: string) {
  const image = sharp(filePath).ensureAlpha()
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error(`Missing cutout dimensions for ${filePath}`)
  }

  const raw = await image.raw().toBuffer()
  let transparent = 0
  let darkOpaque = 0
  let greenOpaque = 0

  for (let y = 0; y < metadata.height; y += 1) {
    for (let x = 0; x < metadata.width; x += 1) {
      const offset = (y * metadata.width + x) * 4
      const r = raw[offset]
      const g = raw[offset + 1]
      const b = raw[offset + 2]
      const alpha = raw[offset + 3]

      if (alpha <= 8) {
        transparent += 1
      }

      if (alpha > 220 && Math.max(r, g, b) < 70) {
        darkOpaque += 1
      }

      if (alpha > 220 && g > 160 && r < 80 && b < 80) {
        greenOpaque += 1
      }
    }
  }

  const area = metadata.width * metadata.height

  return {
    transparentRatio: transparent / area,
    darkOpaqueRatio: darkOpaque / area,
    greenOpaque,
  }
}

async function getTextureDetailStats(filePath: string) {
  const image = sharp(filePath).ensureAlpha()
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error(`Missing texture dimensions for ${filePath}`)
  }

  const raw = await image.raw().toBuffer()
  let cyanAccent = 0
  let darkMetal = 0
  let contrastEdges = 0

  for (let y = 0; y < metadata.height; y += 1) {
    for (let x = 0; x < metadata.width; x += 1) {
      const offset = (y * metadata.width + x) * 4
      const r = raw[offset]
      const g = raw[offset + 1]
      const b = raw[offset + 2]

      if (g > 120 && b > 120 && r < 80) {
        cyanAccent += 1
      }

      if (Math.max(r, g, b) < 70) {
        darkMetal += 1
      }

      if (Math.max(r, g, b) - Math.min(r, g, b) > 26) {
        contrastEdges += 1
      }
    }
  }

  const area = metadata.width * metadata.height

  return {
    cyanAccentRatio: cyanAccent / area,
    darkMetalRatio: darkMetal / area,
    contrastEdgeRatio: contrastEdges / area,
  }
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
    expect(gameAssets.stage3BossBodyUrl).toMatch(/bosses\/stage3-boss-body/)
    expect(gameAssets.stage3BossAppendagesUrl).toMatch(/bosses\/stage3-boss-appendages/)
    expect(gameAssets.stage3BossArmorTextureUrl).toMatch(/bosses\/stage3-boss-armor-texture/)
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

  it('keeps stage 3 boss cutouts transparent without deleting dark design details', async () => {
    for (const cutoutPath of stage3BossCutoutPaths) {
      const stats = await getCutoutStats(cutoutPath)

      expect(stats.transparentRatio).toBeGreaterThan(0.25)
      expect(stats.darkOpaqueRatio).toBeGreaterThan(0.08)
      expect(stats.greenOpaque).toBe(0)
    }
  })

  it('keeps stage 3 generated appendage sprites transparent and chroma-key free', async () => {
    for (const appendagePath of stage3BossAppendagePaths) {
      const stats = await getCutoutStats(appendagePath)

      expect(stats.transparentRatio).toBeGreaterThan(0.65)
      expect(stats.darkOpaqueRatio).toBeGreaterThan(0.04)
      expect(stats.greenOpaque).toBe(0)
    }
  })

  it('keeps stage 3 boss armor textures dark, detailed, and cyan accented', async () => {
    for (const texturePath of stage3BossArmorTexturePaths) {
      const stats = await getTextureDetailStats(texturePath)

      expect(stats.darkMetalRatio).toBeGreaterThan(0.7)
      expect(stats.contrastEdgeRatio).toBeGreaterThan(0.12)
      expect(stats.cyanAccentRatio).toBeGreaterThan(0.006)
    }
  })
})
