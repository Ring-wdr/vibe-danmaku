import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const cellSize = 192
const spriteSize = 168
const padding = 12
const columns = 3
const rows = 2
const frames = ['scout', 'sentinel', 'lancer', 'splitter', 'mine-layer', 'weaver']

const atlases = [
  {
    sourceDir: 'src/assets/generated/enemies/brass-cloud',
    outPath: 'src/assets/generated/enemies/enemy-brass-cloud-atlas.webp',
  },
  {
    sourceDir: 'src/assets/generated/enemies/abyssal',
    outPath: 'src/assets/generated/enemies/enemy-abyssal-biomech-atlas.webp',
  },
]

async function packAtlas({ sourceDir, outPath }) {
  const sourcePath = path.join(root, sourceDir)
  const outputPath = path.join(root, outPath)

  await fs.mkdir(path.dirname(outputPath), { recursive: true })

  const composites = await Promise.all(
    frames.map(async (frame, index) => {
      const input = await sharp(path.join(sourcePath, `${frame}.png`))
        .resize({
          width: spriteSize,
          height: spriteSize,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ quality: 76, alphaQuality: 84, effort: 5 })
        .toBuffer()

      const left = (index % columns) * cellSize + padding
      const top = Math.floor(index / columns) * cellSize + padding

      return { input, left, top }
    }),
  )

  await sharp({
    create: {
      width: columns * cellSize,
      height: rows * cellSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .webp({ quality: 76, alphaQuality: 84, effort: 5 })
    .toFile(outputPath)

  console.log(`Packed ${frames.length} frames into ${path.relative(root, outputPath)}`)
}

for (const atlas of atlases) {
  await packAtlas(atlas)
}
