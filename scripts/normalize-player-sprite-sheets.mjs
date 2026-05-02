import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const playerDir = path.join(root, 'src/assets/generated/players')

const frameCount = 4
const targetFrameWidth = 512
const targetHeight = 1024
const minHorizontalPadding = 48
const baselineY = 908
const alphaThreshold = 8
const targetMainBodyHeight = 600

const playerSpriteSheets = [
  { source: 'player-battle-sprite-sheet.png', output: 'player-battle-sprite-sheet.png' },
  { source: 'vesper-noire-sprite-sheet.png', output: 'vesper-noire-sprite-sheet.png' },
  { source: 'reina-shirogane-sprite-sheet.png', output: 'reina-shirogane-sprite-sheet.png' },
  {
    source: 'astra-volt-sprite-sheet-source.png',
    output: 'astra-volt-sprite-sheet.png',
    preserveSourceFrames: true,
  },
]

function getNearestFrameIndex(centerX, sourceWidth) {
  const sourceFrameWidth = sourceWidth / frameCount
  const rawIndex = Math.round(centerX / sourceFrameWidth - 0.5)

  return Math.min(frameCount - 1, Math.max(0, rawIndex))
}

function findAlphaComponents({ data, width, height }) {
  const visited = new Uint8Array(width * height)
  const components = []

  for (let startY = 0; startY < height; startY += 1) {
    for (let startX = 0; startX < width; startX += 1) {
      const startIndex = startY * width + startX
      if (visited[startIndex] || data[startIndex * 4 + 3] <= alphaThreshold) {
        continue
      }

      const queue = [startIndex]
      visited[startIndex] = 1
      let cursor = 0
      let minX = startX
      let minY = startY
      let maxX = startX
      let maxY = startY
      let pixelCount = 0
      let sumX = 0

      while (cursor < queue.length) {
        const current = queue[cursor]
        cursor += 1

        const x = current % width
        const y = Math.floor(current / width)
        pixelCount += 1
        sumX += x
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)

        const neighbors = [
          x > 0 ? current - 1 : -1,
          x < width - 1 ? current + 1 : -1,
          y > 0 ? current - width : -1,
          y < height - 1 ? current + width : -1,
        ]

        for (const next of neighbors) {
          if (next < 0 || visited[next] || data[next * 4 + 3] <= alphaThreshold) {
            continue
          }

          visited[next] = 1
          queue.push(next)
        }
      }

      components.push({
        left: minX,
        top: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        centerX: sumX / pixelCount,
        pixelCount,
      })
    }
  }

  return components
}

function unionBounds(bounds) {
  const nonEmptyBounds = bounds.filter(Boolean)
  if (nonEmptyBounds.length === 0) {
    return null
  }

  const left = Math.min(...nonEmptyBounds.map((bound) => bound.left))
  const top = Math.min(...nonEmptyBounds.map((bound) => bound.top))
  const right = Math.max(...nonEmptyBounds.map((bound) => bound.left + bound.width))
  const bottom = Math.max(...nonEmptyBounds.map((bound) => bound.top + bound.height))

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  }
}

function median(values) {
  const sortedValues = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sortedValues.length / 2)

  return sortedValues.length % 2 === 0
    ? (sortedValues[middle - 1] + sortedValues[middle]) / 2
    : sortedValues[middle]
}

function getFixedFrameContentMetrics({ data, width, height }) {
  const frameWidth = width / frameCount

  if (!Number.isInteger(frameWidth)) {
    return []
  }

  return Array.from({ length: frameCount }, (_, frameIndex) => {
    let minX = frameWidth
    let maxX = -1
    let minY = height
    let maxY = -1

    for (let y = 0; y < height; y += 1) {
      for (let x = frameIndex * frameWidth; x < (frameIndex + 1) * frameWidth; x += 1) {
        const alpha = data[(y * width + x) * 4 + 3]

        if (alpha <= alphaThreshold) {
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
      hasContent: maxX >= minX && maxY >= minY,
      left: minX,
      right: frameWidth - 1 - maxX,
      top: minY,
      bottom: height - 1 - maxY,
    }
  })
}

function isAlreadyNormalizedOutput({ config, metadata, sourceData }) {
  if (config.source !== config.output) {
    return false
  }

  if (metadata.width !== targetFrameWidth * frameCount || metadata.height !== targetHeight) {
    return false
  }

  return getFixedFrameContentMetrics({
    data: sourceData,
    width: metadata.width,
    height: metadata.height,
  }).every(
    (frame) =>
      frame.hasContent &&
      frame.left >= minHorizontalPadding &&
      frame.right >= minHorizontalPadding,
  )
}

async function createAssignedFrameImage({ components, sourceData, sourceWidth }) {
  if (components.length === 0) {
    return null
  }

  const bounds = unionBounds(components)
  if (!bounds) {
    return null
  }

  const frameData = Buffer.alloc(bounds.width * bounds.height * 4)

  for (const component of components) {
    for (let y = component.top; y < component.top + component.height; y += 1) {
      for (let x = component.left; x < component.left + component.width; x += 1) {
        const sourceIndex = (y * sourceWidth + x) * 4
        if (sourceData[sourceIndex + 3] <= alphaThreshold) {
          continue
        }

        const targetIndex = ((y - bounds.top) * bounds.width + x - bounds.left) * 4
        frameData[targetIndex] = sourceData[sourceIndex]
        frameData[targetIndex + 1] = sourceData[sourceIndex + 1]
        frameData[targetIndex + 2] = sourceData[sourceIndex + 2]
        frameData[targetIndex + 3] = sourceData[sourceIndex + 3]
      }
    }
  }

  return {
    bounds,
    image: sharp(frameData, {
      raw: {
        width: bounds.width,
        height: bounds.height,
        channels: 4,
      },
    }),
  }
}

async function createSourceFrameImage({ frameIndex, sourceData, sourceWidth, sourceHeight }) {
  const sourceFrameLeft = Math.round((sourceWidth * frameIndex) / frameCount)
  const sourceFrameRight = Math.round((sourceWidth * (frameIndex + 1)) / frameCount)
  const sourceFrameWidth = sourceFrameRight - sourceFrameLeft
  let minX = sourceFrameWidth
  let minY = sourceHeight
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < sourceHeight; y += 1) {
    for (let localX = 0; localX < sourceFrameWidth; localX += 1) {
      const sourceX = sourceFrameLeft + localX
      const sourceIndex = (y * sourceWidth + sourceX) * 4

      if (sourceData[sourceIndex + 3] <= alphaThreshold) {
        continue
      }

      minX = Math.min(minX, localX)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, localX)
      maxY = Math.max(maxY, y)
    }
  }

  if (maxX < minX || maxY < minY) {
    return null
  }

  const width = maxX - minX + 1
  const height = maxY - minY + 1
  const frameData = Buffer.alloc(width * height * 4)

  for (let y = minY; y <= maxY; y += 1) {
    for (let localX = minX; localX <= maxX; localX += 1) {
      const sourceX = sourceFrameLeft + localX
      const sourceIndex = (y * sourceWidth + sourceX) * 4
      const targetIndex = ((y - minY) * width + localX - minX) * 4

      frameData[targetIndex] = sourceData[sourceIndex]
      frameData[targetIndex + 1] = sourceData[sourceIndex + 1]
      frameData[targetIndex + 2] = sourceData[sourceIndex + 2]
      frameData[targetIndex + 3] = sourceData[sourceIndex + 3]
    }
  }

  return {
    bounds: {
      left: sourceFrameLeft + minX,
      top: minY,
      width,
      height,
    },
    image: sharp(frameData, {
      raw: {
        width,
        height,
        channels: 4,
      },
    }),
  }
}

async function normalizePlayerSpriteSheet(config) {
  const sourcePath = path.join(playerDir, config.source)
  const outputPath = path.join(playerDir, config.output)
  const source = sharp(sourcePath).ensureAlpha()
  const metadata = await source.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error(`Cannot read sprite sheet dimensions: ${config.source}`)
  }

  const sourceData = await source.raw().toBuffer()
  if (isAlreadyNormalizedOutput({ config, metadata, sourceData })) {
    console.log(`${config.output}: already normalized`)
    return
  }

  const assignedFrames = config.preserveSourceFrames
    ? await Promise.all(
        Array.from({ length: frameCount }, (_, frameIndex) =>
          createSourceFrameImage({
            frameIndex,
            sourceData,
            sourceWidth: metadata.width,
            sourceHeight: metadata.height,
          }),
        ),
      )
    : await createComponentAssignedFrames({
        sourceData,
        sourceWidth: metadata.width,
        sourceHeight: metadata.height,
      })

  const maxContentWidth = Math.max(
    ...assignedFrames.map((frame) => frame?.bounds.width ?? 0),
  )
  const maxContentHeight = Math.max(
    ...assignedFrames.map((frame) => frame?.bounds.height ?? 0),
  )
  const mainBodyHeight = median(
    assignedFrames.flatMap((frame) => (frame ? [frame.bounds.height] : [])),
  )
  const scale = Math.min(
    (targetFrameWidth - minHorizontalPadding * 2) / maxContentWidth,
    (baselineY - minHorizontalPadding) / maxContentHeight,
    targetMainBodyHeight / mainBodyHeight,
  )

  const composites = await Promise.all(
    assignedFrames.map(async (frame, frameIndex) => {
      if (!frame) {
        return null
      }

      const scaledWidth = Math.round(frame.bounds.width * scale)
      const scaledHeight = Math.round(frame.bounds.height * scale)
      const input = await frame.image
        .resize({ width: scaledWidth, height: scaledHeight, fit: 'fill' })
        .png()
        .toBuffer()

      return {
        input,
        left: frameIndex * targetFrameWidth + Math.round((targetFrameWidth - scaledWidth) / 2),
        top: Math.max(minHorizontalPadding, baselineY - scaledHeight),
      }
    }),
  )

  await sharp({
    create: {
      width: targetFrameWidth * frameCount,
      height: targetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites.filter(Boolean))
    .png()
    .toFile(outputPath)

  console.log(
    `${config.output}: normalized from ${config.source} to ${
      targetFrameWidth * frameCount
    }x${targetHeight} (${targetFrameWidth}px x ${frameCount} frames)`,
  )
}

async function createComponentAssignedFrames({ sourceData, sourceWidth, sourceHeight }) {
  const componentsByFrame = Array.from({ length: frameCount }, () => [])

  for (const component of findAlphaComponents({
    data: sourceData,
    width: sourceWidth,
    height: sourceHeight,
  })) {
    const frameIndex = getNearestFrameIndex(component.centerX, sourceWidth)
    componentsByFrame[frameIndex].push(component)
  }

  return Promise.all(
    componentsByFrame.map((components) =>
      createAssignedFrameImage({
        components,
        sourceData,
        sourceWidth,
      }),
    ),
  )
}

await fs.mkdir(playerDir, { recursive: true })

for (const fileName of playerSpriteSheets) {
  await normalizePlayerSpriteSheet(fileName)
}
