import { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import type { BackgroundTextureKey } from './sceneConfig'

export function useLoadedTexture(url: string, configure?: (texture: THREE.Texture) => void) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    let disposed = false
    const loader = new THREE.TextureLoader()

    loader.load(url, (loadedTexture) => {
      if (disposed) {
        loadedTexture.dispose()
        return
      }

      configure?.(loadedTexture)
      setTexture(loadedTexture)
    })

    return () => {
      disposed = true
      setTexture((currentTexture) => {
        currentTexture?.dispose()
        return null
      })
    }
  }, [configure, url])

  return texture
}

export function useLoadedTextureMap<TextureKey extends string = BackgroundTextureKey>(
  textureUrls: Partial<Record<TextureKey, string>>,
) {
  const [textures, setTextures] = useState<Partial<Record<TextureKey, THREE.Texture>>>({})

  useEffect(() => {
    let disposed = false
    const loader = new THREE.TextureLoader()
    const loadedTextures: THREE.Texture[] = []
    const entries = Object.entries(textureUrls) as [TextureKey, string][]

    setTextures({})

    entries.forEach(([key, url]) => {
      loader.load(url, (loadedTexture) => {
        if (disposed) {
          loadedTexture.dispose()
          return
        }

        loadedTextures.push(loadedTexture)
        setTextures((currentTextures) => ({
          ...currentTextures,
          [key]: loadedTexture,
        }))
      })
    })

    return () => {
      disposed = true
      loadedTextures.forEach((texture) => texture.dispose())
      setTextures({})
    }
  }, [textureUrls])

  return textures
}

export function RestoredTextureMaterial({
  texture,
  opacity = 1,
  exposure = 1.85,
  saturation = 1.42,
  contrast = 1.08,
  frameColumns = 1,
  frameRate = 8,
  frameIndex,
  flipX = false,
  tintColor = '#ffffff',
  tintStrength = 0,
  uvScale,
  uvOffset,
}: {
  texture: THREE.Texture
  opacity?: number
  exposure?: number
  saturation?: number
  contrast?: number
  frameColumns?: number
  frameRate?: number
  frameIndex?: number
  flipX?: boolean
  tintColor?: string
  tintStrength?: number
  uvScale?: THREE.Vector2
  uvOffset?: THREE.Vector2
}) {
  const hasExplicitUv = Boolean(uvScale || uvOffset)
  const hasFixedFrame = frameIndex !== undefined
  const material = useMemo(() => {
    const initialUvScale = uvScale ?? new THREE.Vector2(1 / frameColumns, 1)
    const initialUvOffset =
      uvOffset ??
      new THREE.Vector2((frameIndex ?? 0) / Math.max(1, frameColumns), 0)

    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        opacity: { value: opacity },
        exposure: { value: exposure },
        saturation: { value: saturation },
        contrast: { value: contrast },
        tintColor: { value: new THREE.Color(tintColor) },
        tintStrength: { value: tintStrength },
        alphaCutoff: { value: 0.02 },
        uvScale: { value: initialUvScale.clone() },
        uvOffset: { value: initialUvOffset.clone() },
        flipX: { value: flipX ? 1 : 0 },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float opacity;
        uniform float exposure;
        uniform float saturation;
        uniform float contrast;
        uniform vec3 tintColor;
        uniform float tintStrength;
        uniform float alphaCutoff;
        uniform vec2 uvScale;
        uniform vec2 uvOffset;
        uniform float flipX;
        varying vec2 vUv;

        void main() {
          vec2 localUv = vec2(mix(vUv.x, 1.0 - vUv.x, flipX), vUv.y);
          vec2 sampleUv = localUv * uvScale + uvOffset;
          vec4 texel = texture2D(map, sampleUv);
          float alpha = texel.a * opacity;

          if (alpha < alphaCutoff) {
            discard;
          }

          vec3 color = texel.rgb / max(texel.a, 0.18);
          color = clamp((color - 0.5) * contrast + 0.5, 0.0, 1.0);

          float luma = dot(color, vec3(0.299, 0.587, 0.114));
          color = mix(vec3(luma), color, saturation);
          color = clamp(color * exposure, 0.0, 1.0);
          color = mix(color, tintColor, clamp(tintStrength, 0.0, 1.0));

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
  }, [frameColumns, texture, tintColor, tintStrength, uvOffset, uvScale])

  useFrame(({ clock }) => {
    if (frameColumns <= 1 || hasExplicitUv || hasFixedFrame) {
      return
    }

    const frame = Math.floor(clock.elapsedTime * frameRate) % frameColumns
    material.uniforms.uvOffset.value.set(
      (uvOffset?.x ?? 0) + frame / frameColumns,
      uvOffset?.y ?? 0,
    )
  })

  useEffect(() => {
    const nextUvScale = uvScale ?? new THREE.Vector2(1 / frameColumns, 1)
    const nextFrameOffset =
      frameIndex === undefined ? 0 : frameIndex / Math.max(1, frameColumns)
    const nextUvOffset = uvOffset ?? new THREE.Vector2(nextFrameOffset, 0)

    material.uniforms.map.value = texture
    material.uniforms.opacity.value = opacity
    material.uniforms.exposure.value = exposure
    material.uniforms.saturation.value = saturation
    material.uniforms.contrast.value = contrast
    material.uniforms.tintColor.value.set(tintColor)
    material.uniforms.tintStrength.value = tintStrength
    material.uniforms.uvScale.value.copy(nextUvScale)
    material.uniforms.uvOffset.value.copy(nextUvOffset)
    material.uniforms.flipX.value = flipX ? 1 : 0
    material.needsUpdate = true
  }, [
    contrast,
    exposure,
    flipX,
    frameColumns,
    frameIndex,
    material,
    opacity,
    saturation,
    texture,
    tintColor,
    tintStrength,
    uvOffset,
    uvScale,
  ])

  return <primitive object={material} attach="material" />
}
