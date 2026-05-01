import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const generatedDir = path.join(root, 'src/assets/generated')

const runtimeAssets = [
  {
    source: 'boss-core.png',
    output: 'boss-core.webp',
    width: 512,
    quality: 72,
    alphaQuality: 84,
  },
  {
    source: 'cloud-layer-a.png',
    output: 'cloud-layer-a.webp',
    width: 768,
    quality: 56,
    alphaQuality: 72,
  },
  {
    source: 'cloud-layer-b.png',
    output: 'cloud-layer-b.webp',
    width: 768,
    quality: 56,
    alphaQuality: 72,
  },
  {
    source: 'player-battle-sprite-sheet.png',
    output: 'player-battle-sprite-sheet.webp',
    width: 1024,
    quality: 74,
    alphaQuality: 86,
  },
  {
    source: 'stage2-ruin-floor.png',
    output: 'stage2-ruin-floor.webp',
    width: 1024,
    quality: 58,
    alphaQuality: 72,
  },
  {
    source: 'stage2-smoke-layer.png',
    output: 'stage2-smoke-layer.webp',
    width: 1024,
    quality: 56,
    alphaQuality: 72,
  },
  {
    source: 'stage2-midboss-core.png',
    output: 'stage2-midboss-core.webp',
    width: 512,
    quality: 74,
    alphaQuality: 86,
  },
  {
    source: 'stage2-boss-core.png',
    output: 'stage2-boss-core.webp',
    width: 512,
    quality: 74,
    alphaQuality: 86,
  },
  {
    source: 'ui-player-portrait.png',
    output: 'ui-player-portrait.webp',
    width: 480,
    quality: 76,
    alphaQuality: 88,
  },
  {
    source: 'ui-ornament.png',
    output: 'ui-ornament.webp',
    width: 384,
    quality: 76,
    alphaQuality: 84,
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
