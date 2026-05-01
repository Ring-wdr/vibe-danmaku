import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { gameAssets } from '../assets'
import {
  stageBackgroundMotionConfigs,
  type BackgroundFixtureConfig,
  type BackgroundMotionLayerConfig,
  type BackgroundTextureKey,
} from './sceneConfig'
import { getLoopingBackgroundY } from './battleViewMath'
import { useLoadedTextureMap } from './battleTexture'
import type { StageDefinition } from '../types'

export function getBackgroundTextureUrls(
  stage: StageDefinition,
): Partial<Record<BackgroundTextureKey, string>> {
  if (stage.backgroundTheme === 'burning-ruins') {
    return {
      ruinFloor: gameAssets.stage2RuinFloorUrl,
      stage2Smoke: gameAssets.stage2SmokeLayerUrl,
    }
  }

  return {
    a: gameAssets.cloudLayerAUrl,
    b: gameAssets.cloudLayerBUrl,
  }
}

function MovingCloudPlane({
  texture,
  config,
  offset,
}: {
  texture: THREE.Texture
  config: BackgroundMotionLayerConfig
  offset: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!meshRef.current) {
      return
    }

    const elapsed = clock.elapsedTime
    meshRef.current.position.x = config.x + Math.sin(elapsed * 0.26 + offset) * config.sway
    meshRef.current.position.y = getLoopingBackgroundY(
      config.startY + offset,
      elapsed,
      config.speed,
    )
  })

  return (
    <mesh
      ref={meshRef}
      position={[config.x, config.startY + offset, config.z]}
      rotation={[0, 0, config.rotation]}
    >
      <planeGeometry args={[config.width, config.height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={config.opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

export function MovingBackgroundLayer({ stage }: { stage: StageDefinition }) {
  const config = stageBackgroundMotionConfigs[stage.backgroundTheme]
  const textureUrls = useMemo(() => getBackgroundTextureUrls(stage), [stage])
  const textures = useLoadedTextureMap(textureUrls)
  const renderLayer = (layerConfig: BackgroundMotionLayerConfig, layerIndex: number) => {
    const texture = textures[layerConfig.textureKey]

    if (!texture) {
      return null
    }

    return [0, layerConfig.spacing].map((offset) => (
      <MovingCloudPlane
        key={`${layerConfig.textureKey}-${layerIndex}-${offset}`}
        texture={texture}
        config={layerConfig}
        offset={offset}
      />
    ))
  }

  return (
    <group name="battle-background-motion" userData={{ testId: 'battle-background-motion' }}>
      {config.floorLayers.map(renderLayer)}
      {config.cloudLayers.map(renderLayer)}
    </group>
  )
}

function BackgroundFixture({
  seed,
}: {
  seed: BackgroundFixtureConfig
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return
    }

    const elapsed = clock.elapsedTime
    groupRef.current.position.x = seed.x + Math.sin(elapsed * 0.42 + seed.phase) * 0.18
    groupRef.current.position.y = getLoopingBackgroundY(seed.y, elapsed + seed.phase, seed.speed)
    groupRef.current.rotation.z = seed.phase + elapsed * seed.spin
    groupRef.current.rotation.x = Math.sin(elapsed * 0.24 + seed.phase) * 0.18
  })

  return (
    <group ref={groupRef} position={[seed.x, seed.y, seed.z]} scale={seed.scale}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.46, 0.026, 8, 36]} />
        <meshBasicMaterial
          color={seed.ringColor ?? '#c99a45'}
          transparent
          opacity={seed.ringOpacity ?? 0.36}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.82, 0.035, 0.035]} />
        <meshBasicMaterial
          color={seed.crossColor ?? '#d7ad5b'}
          transparent
          opacity={seed.crossOpacity ?? 0.28}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.038, 0.06, 0.78, 10]} />
        <meshBasicMaterial
          color={seed.coreColor ?? '#5ceee4'}
          transparent
          opacity={seed.coreOpacity ?? 0.18}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

export function BackgroundFixtureLayer({ stage }: { stage: StageDefinition }) {
  const config = stageBackgroundMotionConfigs[stage.backgroundTheme]

  return (
    <group name="battle-background-fixtures">
      {config.fixtures.map((seed) => (
        <BackgroundFixture key={`${seed.x}-${seed.phase}`} seed={seed} />
      ))}
    </group>
  )
}
