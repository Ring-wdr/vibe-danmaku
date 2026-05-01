import { describe, expect, it } from 'vitest'

import config from '../../vite.config'

type CodeSplittingGroup = {
  name: string
  priority?: number
  test?: (id: string) => boolean | undefined | void
}

type TestableViteConfig = {
  build?: {
    chunkSizeWarningLimit?: number
    rolldownOptions?: {
      output?: {
        codeSplitting?:
          | boolean
          | {
              includeDependenciesRecursively?: boolean
              maxSize?: number
              groups?: CodeSplittingGroup[]
            }
      }
    }
  }
}

describe('vite production bundling', () => {
  const viteConfig = config as TestableViteConfig
  const output = viteConfig.build?.rolldownOptions?.output
  const codeSplitting =
    typeof output?.codeSplitting === 'object' ? output.codeSplitting : undefined
  const groups = codeSplitting?.groups ?? []

  it('keeps the battle-only 3D stack in dedicated async vendor chunks', () => {
    const threeGroup = groups.find((group) => group.name === 'vendor-three')
    const r3fGroup = groups.find((group) => group.name === 'vendor-r3f')

    expect(codeSplitting?.includeDependenciesRecursively).toBe(false)
    expect(threeGroup?.test?.('project/node_modules/three/build/three.module.js')).toBe(
      true,
    )
    expect(r3fGroup?.test?.('project/node_modules/@react-three/fiber/dist/index.js')).toBe(
      true,
    )
    expect(r3fGroup?.test?.('project/node_modules/@react-three/drei/index.js')).toBe(true)
    expect((threeGroup?.priority ?? 0) > (r3fGroup?.priority ?? 0)).toBe(true)
  })

  it('uses a stricter warning limit after splitting the large battle bundle', () => {
    expect(viteConfig.build?.chunkSizeWarningLimit).toBeLessThan(500)
  })
})
