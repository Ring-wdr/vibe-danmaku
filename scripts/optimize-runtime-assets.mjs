import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const generatedDir = path.join(root, 'src/assets/generated')

const runtimeAssets = [
  {
    source: 'bosses/boss-core.png',
    output: 'bosses/boss-core.webp',
    width: 512,
    quality: 72,
    alphaQuality: 84,
  },
  {
    source: 'backgrounds/brass-cloud/cloud-layer-a.png',
    output: 'backgrounds/brass-cloud/cloud-layer-a.webp',
    width: 768,
    quality: 56,
    alphaQuality: 72,
  },
  {
    source: 'backgrounds/brass-cloud/cloud-layer-b.png',
    output: 'backgrounds/brass-cloud/cloud-layer-b.webp',
    width: 768,
    quality: 56,
    alphaQuality: 72,
  },
  {
    source: 'players/player-battle-sprite-sheet.png',
    output: 'players/player-battle-sprite-sheet.webp',
    width: 1024,
    quality: 74,
    alphaQuality: 86,
  },
  {
    source: 'players/vesper-noire-sprite-sheet.png',
    output: 'players/vesper-noire-sprite-sheet.webp',
    width: 1024,
    quality: 74,
    alphaQuality: 86,
  },
  {
    source: 'players/vesper-noire-panel.png',
    output: 'players/vesper-noire-panel.webp',
    width: 208,
    quality: 80,
    alphaQuality: 92,
  },
  {
    source: 'players/reina-shirogane-sprite-sheet.png',
    output: 'players/reina-shirogane-sprite-sheet.webp',
    width: 1024,
    quality: 74,
    alphaQuality: 86,
  },
  {
    source: 'players/reina-shirogane-sword.png',
    output: 'players/reina-shirogane-sword.webp',
    width: 208,
    quality: 82,
    alphaQuality: 92,
  },
  {
    source: 'backgrounds/burning-ruins/stage2-ruin-floor.png',
    output: 'backgrounds/burning-ruins/stage2-ruin-floor.webp',
    width: 1024,
    quality: 58,
    alphaQuality: 72,
  },
  {
    source: 'backgrounds/burning-ruins/stage2-smoke-layer.png',
    output: 'backgrounds/burning-ruins/stage2-smoke-layer.webp',
    width: 1024,
    quality: 56,
    alphaQuality: 72,
  },
  {
    source: 'bosses/stage2-midboss-core.png',
    output: 'bosses/stage2-midboss-core.webp',
    width: 512,
    quality: 74,
    alphaQuality: 86,
  },
  {
    source: 'bosses/stage2-boss-core.png',
    output: 'bosses/stage2-boss-core.webp',
    width: 512,
    quality: 74,
    alphaQuality: 86,
  },
  {
    source: 'ui/ui-player-portrait.png',
    output: 'ui/ui-player-portrait.webp',
    width: 480,
    quality: 76,
    alphaQuality: 88,
  },
  {
    source: 'ui/ui-vesper-noire-portrait.png',
    output: 'ui/ui-vesper-noire-portrait.webp',
    width: 480,
    quality: 76,
    alphaQuality: 88,
  },
  {
    source: 'ui/ui-reina-shirogane-portrait.png',
    output: 'ui/ui-reina-shirogane-portrait.webp',
    width: 480,
    quality: 76,
    alphaQuality: 88,
  },
  {
    source: 'ui/ui-ornament.png',
    output: 'ui/ui-ornament.webp',
    width: 384,
    quality: 76,
    alphaQuality: 84,
  },
  {
    source: 'items/item-atlas.png',
    output: 'items/item-atlas.webp',
    width: 512,
    quality: 82,
    alphaQuality: 92,
  },
]

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`
}

for (const asset of runtimeAssets) {
  const sourcePath = path.join(generatedDir, asset.source)
  const outputPath = path.join(generatedDir, asset.output)

  await fs.mkdir(path.dirname(outputPath), { recursive: true })

  await sharp(sourcePath)
    .resize({
      width: asset.width,
      withoutEnlargement: true,
    })
    .webp({
      quality: asset.quality,
      alphaQuality: asset.alphaQuality,
      effort: 5,
    })
    .toFile(outputPath)

  const [sourceStat, outputStat] = await Promise.all([fs.stat(sourcePath), fs.stat(outputPath)])
  const saved = sourceStat.size - outputStat.size

  console.log(
    `${asset.output}: ${formatBytes(outputStat.size)} (${formatBytes(saved)} saved from ${asset.source})`,
  )
}
