import { useEffect, useMemo, useRef } from 'react'
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
  if (stage.backgroundTheme === 'city-states') {
    return {
      cityBlockA: gameAssets.stage4CityBlockAUrl,
      cityBlockB: gameAssets.stage4CityBlockBUrl,
      cityBlockC: gameAssets.stage4CityBlockCUrl,
    }
  }

  if (stage.backgroundTheme === 'abyssal-biomech') {
    return {
      abyssalFloor: gameAssets.stage3TrenchFloorUrl,
      abyssalPressure: gameAssets.stage3PressureLayerUrl,
    }
  }

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
  isPaused,
}: {
  texture: THREE.Texture
  config: BackgroundMotionLayerConfig
  offset: number
  isPaused: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (isPaused || !meshRef.current) {
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

function RepeatingFloorPlane({
  layers,
  texture,
  isPaused,
}: {
  layers: readonly BackgroundMotionLayerConfig[]
  texture: THREE.Texture
  isPaused: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const primaryLayer = layers[0]
  const averageSpeed =
    layers.reduce((totalSpeed, layer) => totalSpeed + layer.speed, 0) / layers.length
  const opacity = Math.min(
    0.72,
    layers.reduce((maxOpacity, layer) => Math.max(maxOpacity, layer.opacity), 0),
  )

  useEffect(() => {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(2.8, 4.4)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
  }, [texture])

  useFrame(({ clock }) => {
    if (isPaused || !meshRef.current) {
      return
    }

    const elapsed = clock.elapsedTime
    texture.offset.y = -(elapsed * averageSpeed * 0.045) % 1
    texture.offset.x = Math.sin(elapsed * 0.08) * 0.015
  })

  if (!primaryLayer) {
    return null
  }

  return (
    <mesh
      ref={meshRef}
      position={[primaryLayer.x, 1.25, primaryLayer.z]}
      rotation={[0, 0, primaryLayer.rotation]}
    >
      <planeGeometry args={[8.8, 11.8]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

export function MovingBackgroundLayer({
  stage,
  isPaused,
}: {
  stage: StageDefinition
  isPaused: boolean
}) {
  const config = stageBackgroundMotionConfigs[stage.backgroundTheme]
  const textureUrls = useMemo(() => getBackgroundTextureUrls(stage), [stage])
  const textures = useLoadedTextureMap(textureUrls)
  const firstFloorLayer = config.floorLayers[0]
  const floorTexture = firstFloorLayer ? textures[firstFloorLayer.textureKey] : undefined
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
        isPaused={isPaused}
      />
    ))
  }

  return (
    <group name="battle-background-motion" userData={{ testId: 'battle-background-motion' }}>
      {firstFloorLayer && floorTexture ? (
        <RepeatingFloorPlane
          layers={config.floorLayers}
          texture={floorTexture}
          isPaused={isPaused}
        />
      ) : null}
      {config.cloudLayers.map(renderLayer)}
    </group>
  )
}

function BackgroundFixture({
  seed,
  isPaused,
}: {
  seed: BackgroundFixtureConfig
  isPaused: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (isPaused || !groupRef.current) {
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

export function BackgroundFixtureLayer({
  stage,
  isPaused,
}: {
  stage: StageDefinition
  isPaused: boolean
}) {
  const config = stageBackgroundMotionConfigs[stage.backgroundTheme]

  return (
    <group name="battle-background-fixtures">
      {config.fixtures.map((seed) => (
        <BackgroundFixture key={`${seed.x}-${seed.phase}`} seed={seed} isPaused={isPaused} />
      ))}
    </group>
  )
}
