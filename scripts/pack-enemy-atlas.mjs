import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sourceDir = path.join(root, 'src/assets/generated/enemies/brass-cloud')
const outPath = path.join(root, 'src/assets/generated/enemy-brass-cloud-atlas.webp')
const cellSize = 192
const spriteSize = 168
const columns = 3
const rows = 2
const frames = ['scout', 'sentinel', 'lancer', 'splitter', 'mine-layer', 'weaver']

await fs.mkdir(path.dirname(outPath), { recursive: true })

const composites = await Promise.all(
  frames.map(async (frame, index) => {
    const input = await sharp(path.join(sourceDir, `${frame}.png`))
      .resize({
        width: spriteSize,
        height: spriteSize,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 76, alphaQuality: 84, effort: 5 })
      .toBuffer()

    const left = (index % columns) * cellSize + 12
    const top = Math.floor(index / columns) * cellSize + 12

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
  .toFile(outPath)

console.log(`Packed ${frames.length} frames into ${path.relative(root, outPath)}`)
