import sharp from 'sharp'

function isDarkBackgroundPixel(data, offset, options) {
  const r = data[offset]
  const g = data[offset + 1]
  const b = data[offset + 2]
  const a = data[offset + 3]
  const maxChannel = Math.max(r, g, b)
  const brightness = (r + g + b) / 3

  return a > 0 && maxChannel <= options.maxChannel && brightness <= options.maxBrightness
}

export async function removeDarkEdgeBackground(input, options = {}) {
  const backgroundOptions = {
    maxBrightness: options.maxBrightness ?? 58,
    maxChannel: options.maxChannel ?? 92,
  }
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const visited = new Uint8Array(width * height)
  const stack = []

  const pushIfBackground = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return
    }

    const pixel = y * width + x
    if (visited[pixel]) {
      return
    }

    const offset = pixel * channels
    if (!isDarkBackgroundPixel(data, offset, backgroundOptions)) {
      return
    }

    visited[pixel] = 1
    stack.push(pixel)
  }

  for (let x = 0; x < width; x += 1) {
    pushIfBackground(x, 0)
    pushIfBackground(x, height - 1)
  }

  for (let y = 1; y < height - 1; y += 1) {
    pushIfBackground(0, y)
    pushIfBackground(width - 1, y)
  }

  while (stack.length > 0) {
    const pixel = stack.pop()
    const x = pixel % width
    const y = Math.floor(pixel / width)
    const offset = pixel * channels

    data[offset + 3] = 0
    pushIfBackground(x + 1, y)
    pushIfBackground(x - 1, y)
    pushIfBackground(x, y + 1)
    pushIfBackground(x, y - 1)
  }

  return sharp(data, {
    raw: {
      width,
      height,
      channels,
    },
  })
}
