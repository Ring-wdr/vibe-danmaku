import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearPreloadedBattleTextures,
  createRestoredTextureMaterial,
  preloadBattleTextures,
  useLoadedTexture,
  useLoadedTextureMap,
} from './battleTexture'

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}))

function createTestTexture() {
  return new THREE.Texture(document.createElement('img'))
}

function mockTextureLoader(loadTexture: (url: string) => THREE.Texture<HTMLImageElement>) {
  return vi
    .spyOn(THREE.TextureLoader.prototype, 'load')
    .mockImplementation((url, onLoad) => {
      const texture = loadTexture(String(url))
      onLoad?.(texture)
      return texture
    })
}

describe('RestoredTextureMaterial color grading', () => {
  it('preserves source brightness, saturation, and contrast by default', () => {
    const material = createRestoredTextureMaterial({
      texture: createTestTexture(),
    })

    expect(material.uniforms.exposure.value).toBe(1)
    expect(material.uniforms.saturation.value).toBe(1)
    expect(material.uniforms.contrast.value).toBe(1)
    expect(material.fragmentShader).toContain('vec3 color = texel.rgb;')
    expect(material.fragmentShader).not.toContain('texel.rgb / max(texel.a')
  })
})

describe('preloaded battle textures', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    clearPreloadedBattleTextures()
  })

  it('serves a preloaded texture synchronously on the first render', async () => {
    const shipTexture = createTestTexture()
    const loadSpy = mockTextureLoader(() => shipTexture)

    await preloadBattleTextures([{ id: 'ship', label: 'Ship', url: '/ship.webp' }])

    function TextureConsumer() {
      const texture = useLoadedTexture('/ship.webp')

      return createElement('span', {
        'data-testid': 'texture-state',
        'data-ready': texture === shipTexture ? 'ready' : 'missing',
      })
    }

    render(createElement(TextureConsumer))

    expect(screen.getByTestId('texture-state')).toHaveAttribute('data-ready', 'ready')
    expect(loadSpy).toHaveBeenCalledTimes(1)
  })

  it('serves preloaded texture maps synchronously on the first render', async () => {
    const floorTexture = createTestTexture()
    const smokeTexture = createTestTexture()
    mockTextureLoader((url) => (url.includes('smoke') ? smokeTexture : floorTexture))

    await preloadBattleTextures([
      { id: 'floor', label: 'Floor', url: '/floor.webp' },
      { id: 'smoke', label: 'Smoke', url: '/smoke.webp' },
    ])

    function TextureMapConsumer() {
      const textures = useLoadedTextureMap({
        floor: '/floor.webp',
        smoke: '/smoke.webp',
      })

      return createElement('span', {
        'data-testid': 'texture-map-state',
        'data-ready':
          textures.floor === floorTexture && textures.smoke === smokeTexture
            ? 'ready'
            : 'missing',
      })
    }

    render(createElement(TextureMapConsumer))

    expect(screen.getByTestId('texture-map-state')).toHaveAttribute('data-ready', 'ready')
  })
})
