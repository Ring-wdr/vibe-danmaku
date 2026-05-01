import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import * as THREE from 'three'

import { gameAssets } from '../assets'
import {
  brassCloudEnemyFrames,
  enemyBrassCloudAtlasSize,
  type AtlasFrame,
} from '../content/enemyBrassCloudAtlas'
import {
  stageBackgroundMotionConfigs,
  type BackgroundFixtureConfig,
  type BackgroundMotionLayerConfig,
  type BackgroundTextureKey,
} from './sceneConfig'
import { useBattleRuntime } from './useBattleRuntime'
import type {
  ArenaPoint,
  BattleSnapshot,
  CharacterDefinition,
  Difficulty,
  RenderBullet,
  RenderEnemy,
  RenderSparkle,
  RenderSpecialBeam,
  RenderSpecialSlot,
  RunResult,
  StageDefinition,
} from '../types'

type BattleViewProps = {
  difficulty: Difficulty
  stage: StageDefinition
  character: CharacterDefinition
  fastStage?: boolean
  invincible?: boolean
  onComplete: (result: RunResult) => void
}

export const battleDragInputConfig = {
  horizontalWorldSpan: 9.2,
  verticalWorldSpan: 5.2,
  verticalWorldTop: 1.8,
} as const

const backgroundLoop = {
  minY: -4.35,
  height: 8.15,
} as const

const flightBodyAirflowCowlConfigs = [
  {
    z: 0.8,
    thickness: 0.018,
    opacity: 0.34,
    phase: 0.2,
    points: [
      [-0.68, -0.74],
      [-0.58, -0.22],
      [-0.35, 0.28],
      [-0.12, 0.43],
      [0.12, 0.43],
      [0.35, 0.28],
      [0.58, -0.22],
      [0.68, -0.74],
    ] as [number, number][],
  },
  {
    z: 0.81,
    thickness: 0.011,
    opacity: 0.22,
    phase: 1.7,
    points: [
      [-0.5, -0.52],
      [-0.41, -0.04],
      [-0.22, 0.25],
      [0, 0.34],
      [0.22, 0.25],
      [0.41, -0.04],
      [0.5, -0.52],
    ] as [number, number][],
  },
] as const
const flightTurnWakeConfigs = [
  { side: -1, y: -0.22, z: 0.61, phase: 0 },
  { side: 1, y: -0.22, z: 0.61, phase: 1.3 },
] as const

function getLoopingBackgroundY(startY: number, elapsed: number, speed: number) {
  const rawY = startY - elapsed * speed
  const shifted = rawY - backgroundLoop.minY
  const wrapped = ((shifted % backgroundLoop.height) + backgroundLoop.height) % backgroundLoop.height

  return backgroundLoop.minY + wrapped
}

export function getFlightAirflowDynamics({
  currentPosition,
  previousPosition,
  previousHorizontalVelocity,
  delta,
}: {
  currentPosition: ArenaPoint
  previousPosition: ArenaPoint
  previousHorizontalVelocity: number
  delta: number
}) {
  const safeDelta = Math.max(delta, 1 / 90)
  const horizontalVelocity = (currentPosition.x - previousPosition.x) / safeDelta
  const verticalVelocity = (currentPosition.z - previousPosition.z) / safeDelta
  const horizontalAcceleration = horizontalVelocity - previousHorizontalVelocity
  const direction: -1 | 0 | 1 =
    Math.abs(horizontalVelocity) > 0.04 ? (horizontalVelocity < 0 ? -1 : 1) : 0

  return {
    direction,
    horizontalVelocity,
    verticalVelocity,
    speedRatio: Math.min(1, Math.hypot(horizontalVelocity, verticalVelocity) / 8),
    turnRatio: Math.min(1, Math.abs(horizontalAcceleration) / 22),
  }
}

function useLoadedTexture(url: string, configure?: (texture: THREE.Texture) => void) {
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

export function getAtlasFrameUv(frame: AtlasFrame) {
  const uvScale = new THREE.Vector2(
    frame.w / enemyBrassCloudAtlasSize.width,
    frame.h / enemyBrassCloudAtlasSize.height,
  )
  const uvOffset = new THREE.Vector2(
    frame.x / enemyBrassCloudAtlasSize.width,
    1 - (frame.y + frame.h) / enemyBrassCloudAtlasSize.height,
  )

  return { uvScale, uvOffset }
}

export function getPlayerBattleSpritePose({
  currentX,
  previousX,
  specialActive = false,
  heldHorizontalDirection = 0,
}: {
  currentX: number
  previousX: number
  specialActive?: boolean
  heldHorizontalDirection?: -1 | 0 | 1
}) {
  if (specialActive) {
    return { frameIndex: 2, flipX: false }
  }

  const horizontalDelta = currentX - previousX
  if (Math.abs(horizontalDelta) > 0.001) {
    return { frameIndex: 3, flipX: horizontalDelta < 0 }
  }

  if (heldHorizontalDirection !== 0) {
    return { frameIndex: 3, flipX: heldHorizontalDirection < 0 }
  }

  return { frameIndex: 0, flipX: false }
}

function RestoredTextureMaterial({
  texture,
  opacity = 1,
  exposure = 1.85,
  saturation = 1.42,
  contrast = 1.08,
  frameColumns = 1,
  frameRate = 8,
  frameIndex,
  flipX = false,
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

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
  }, [frameColumns, texture, uvOffset, uvScale])

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
    uvOffset,
    uvScale,
  ])

  return <primitive object={material} attach="material" />
}

function PlayerSprite({
  battleElapsed,
  frameCount,
  position,
  spriteSheetUrl,
  specialActive = false,
}: {
  battleElapsed: number
  frameCount: number
  position: [number, number, number]
  spriteSheetUrl: string
  specialActive?: boolean
}) {
  const texture = useLoadedTexture(spriteSheetUrl)
  const previousXRef = useRef(position[0])
  const heldHorizontalMoveRef = useRef<{ direction: -1 | 0 | 1; until: number }>({
    direction: 0,
    until: 0,
  })
  const horizontalDelta = position[0] - previousXRef.current

  if (Math.abs(horizontalDelta) > 0.001) {
    heldHorizontalMoveRef.current = {
      direction: horizontalDelta < 0 ? -1 : 1,
      until: battleElapsed + 0.12,
    }
  }

  const pose = getPlayerBattleSpritePose({
    currentX: position[0],
    previousX: previousXRef.current,
    heldHorizontalDirection:
      battleElapsed <= heldHorizontalMoveRef.current.until
        ? heldHorizontalMoveRef.current.direction
        : 0,
    specialActive,
  })

  useEffect(() => {
    previousXRef.current = position[0]
  }, [position])

  if (!texture) {
    return (
      <mesh position={position}>
        <circleGeometry args={[0.34, 32]} />
        <meshBasicMaterial color="#ffe082" toneMapped={false} />
      </mesh>
    )
  }

  return (
    <mesh position={position}>
      <planeGeometry args={[1.1, 1.78]} />
      <RestoredTextureMaterial
        texture={texture}
        exposure={1.95}
        saturation={1.48}
        frameColumns={frameCount}
        frameIndex={pose.frameIndex}
        flipX={pose.flipX}
      />
    </mesh>
  )
}

function EnemySprite({
  enemyTexture,
  frameId,
  position,
  scale,
}: {
  enemyTexture: THREE.Texture | null
  frameId: RenderEnemy['frameId']
  position: [number, number, number]
  scale: number
}) {
  const atlasUv = useMemo(() => getAtlasFrameUv(brassCloudEnemyFrames[frameId]), [frameId])

  if (!enemyTexture) {
    return (
      <mesh position={position}>
        <circleGeometry args={[0.36, 32]} />
        <meshBasicMaterial color="#ffbe62" toneMapped={false} />
      </mesh>
    )
  }

  return (
    <mesh position={position}>
      <planeGeometry args={[scale, scale]} />
      <RestoredTextureMaterial
        texture={enemyTexture}
        uvScale={atlasUv.uvScale}
        uvOffset={atlasUv.uvOffset}
      />
    </mesh>
  )
}

export function getBossCoreTextureUrl(stage: StageDefinition, boss: { id: string } | null) {
  return boss?.id === stage.midboss?.id ? gameAssets.stage2MidbossCoreUrl : gameAssets.bossCoreUrl
}

function BossSprite({ stage, snapshot }: { stage: StageDefinition; snapshot: BattleSnapshot }) {
  const bossTexture = useLoadedTexture(getBossCoreTextureUrl(stage, snapshot.boss))

  if (!snapshot.boss) {
    return null
  }

  const position = arenaPointToView(snapshot.boss.position, 0.78)

  if (!bossTexture) {
    return (
      <mesh position={position}>
        <circleGeometry args={[0.72, 48]} />
        <meshBasicMaterial color="#7af0ff" toneMapped={false} />
      </mesh>
    )
  }

  return (
    <mesh position={position}>
      <planeGeometry args={[1.65, 1.65]} />
      <RestoredTextureMaterial texture={bossTexture} exposure={1.72} saturation={1.32} />
    </mesh>
  )
}

function arenaPointToView(point: ArenaPoint, z = 0.5): [number, number, number] {
  return [point.x * 0.55, point.z * 0.9 - 0.45, z]
}

type BulletPalette = {
  aura: string
  body: string
  core: string
  accent: string
}

function getBulletPalette(bullet: RenderBullet): BulletPalette {
  if (bullet.source === 'player') {
    return { aura: '#ffb45d', body: '#ffd28a', core: '#fff7d7', accent: '#f8e27a' }
  }

  if (bullet.glow >= 1.45) {
    return { aura: '#9b7cff', body: '#55f0ff', core: '#e8fdff', accent: '#d29bff' }
  }

  return { aura: '#2ceaff', body: '#55f0ff', core: '#d9fdff', accent: '#8ff7ff' }
}

function getBulletPhase(id: string) {
  let hash = 0

  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997
  }

  return hash / 997
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

function MovingBackgroundLayer({ stage }: { stage: StageDefinition }) {
  const config = stageBackgroundMotionConfigs[stage.backgroundTheme]
  const cloudTextureA = useLoadedTexture(gameAssets.cloudLayerAUrl)
  const cloudTextureB = useLoadedTexture(gameAssets.cloudLayerBUrl)
  const smokeTexture = useLoadedTexture(gameAssets.stage2SmokeLayerUrl)
  const ruinFloorTexture = useLoadedTexture(gameAssets.stage2RuinFloorUrl)
  const textures: Record<BackgroundTextureKey, THREE.Texture | undefined> = {
    a: cloudTextureA ?? undefined,
    b: cloudTextureB ?? undefined,
    stage2Smoke: smokeTexture ?? undefined,
    ruinFloor: ruinFloorTexture ?? undefined,
  }
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

function BackgroundFixtureLayer({ stage }: { stage: StageDefinition }) {
  const config = stageBackgroundMotionConfigs[stage.backgroundTheme]

  return (
    <group name="battle-background-fixtures">
      {config.fixtures.map((seed) => (
        <BackgroundFixture key={`${seed.x}-${seed.phase}`} seed={seed} />
      ))}
    </group>
  )
}

function BulletMesh({ bullet }: { bullet: RenderBullet }) {
  const groupRef = useRef<THREE.Group>(null)
  const palette = getBulletPalette(bullet)
  const phase = getBulletPhase(bullet.id)
  const baseRadius = Math.max(0.052, bullet.radius * 0.72)
  const glow = Math.min(1.8, Math.max(0.75, bullet.glow))
  const isHeavyEnemyBullet = bullet.source === 'enemy' && bullet.glow >= 1.35

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * 8 + phase * Math.PI * 2) * 0.08 * glow
    groupRef.current.scale.setScalar(pulse)
    groupRef.current.rotation.z += 0.018 * glow
  })

  return (
    <group
      ref={groupRef}
      position={arenaPointToView(bullet.position, bullet.source === 'player' ? 0.76 : 0.74)}
    >
      <mesh>
        <circleGeometry args={[baseRadius * (2.45 + glow * 0.26), 32]} />
        <meshBasicMaterial
          color={palette.aura}
          transparent
          opacity={0.16 + glow * 0.08}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <circleGeometry args={[baseRadius * (1.38 + glow * 0.14), 28]} />
        <meshBasicMaterial
          color={palette.body}
          transparent
          opacity={0.5 + glow * 0.1}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[baseRadius * 0.16, baseRadius * 0.16, 0.018]}>
        <circleGeometry args={[baseRadius * 0.66, 24]} />
        <meshBasicMaterial
          color={palette.core}
          transparent
          opacity={0.94}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-baseRadius * 0.36, baseRadius * 0.42, 0.028]}>
        <circleGeometry args={[baseRadius * 0.26, 16]} />
        <meshBasicMaterial
          color={palette.accent}
          transparent
          opacity={0.84}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {isHeavyEnemyBullet ? (
        <mesh rotation={[0, 0, phase * Math.PI]}>
          <ringGeometry args={[baseRadius * 1.72, baseRadius * 1.98, 36]} />
          <meshBasicMaterial
            color={palette.accent}
            transparent
            opacity={0.38}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}
    </group>
  )
}

function SpecialBeamMesh({ beam }: { beam: RenderSpecialBeam }) {
  const groupRef = useRef<THREE.Group>(null)
  const origin = arenaPointToView(beam.origin, 0.82)
  const viewWidth = Math.max(0.16, beam.width * 0.55)
  const viewLength = beam.length * 0.9

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * 18) * 0.06
    groupRef.current.scale.x = pulse
  })

  return (
    <group
      ref={groupRef}
      position={[origin[0], origin[1] + viewLength / 2, origin[2] + 0.08]}
    >
      <mesh>
        <planeGeometry args={[viewWidth * 2.8, viewLength]} />
        <meshBasicMaterial
          color="#52f5ff"
          transparent
          opacity={0.18}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[viewWidth * 1.35, viewLength]} />
        <meshBasicMaterial
          color="#ffd27b"
          transparent
          opacity={0.36}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[viewWidth * 0.48, viewLength]} />
        <meshBasicMaterial
          color="#fff7df"
          transparent
          opacity={0.82}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {[-0.36, -0.12, 0.12, 0.36].map((offset) => (
        <mesh key={offset} position={[0, viewLength * offset, 0.04]}>
          <ringGeometry args={[viewWidth * 0.85, viewWidth * 1.12, 36]} />
          <meshBasicMaterial
            color={offset < 0 ? '#69f0e3' : '#f7c46b'}
            transparent
            opacity={0.34}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function SparkleMesh({ sparkle }: { sparkle: RenderSparkle }) {
  const ratio = Math.min(1, sparkle.age / sparkle.life)
  const opacity = Math.max(0, 1 - ratio)
  const radius = 0.06 + ratio * 0.16 * sparkle.intensity

  return (
    <group position={arenaPointToView(sparkle.position, 0.9)}>
      <mesh>
        <circleGeometry args={[radius, 18]} />
        <meshBasicMaterial
          color="#fff4d7"
          transparent
          opacity={opacity * 0.86}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <ringGeometry args={[radius * 1.15, radius * 1.38, 4]} />
        <meshBasicMaterial
          color="#69f0e3"
          transparent
          opacity={opacity * 0.72}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 8]}>
        <ringGeometry args={[radius * 1.55, radius * 1.72, 6]} />
        <meshBasicMaterial
          color="#f8b56b"
          transparent
          opacity={opacity * 0.48}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

function TurnWakeRing({
  config,
  wakeRef,
}: {
  config: (typeof flightTurnWakeConfigs)[number]
  wakeRef: RefObject<{ speed: number; turn: number; direction: -1 | 0 | 1 }>
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    const wake = wakeRef.current
    const sideMatchesTurn = wake.direction === 0 ? 0.42 : wake.direction === config.side ? 1 : 0.34
    const pulse = Math.max(0.08, wake.turn * sideMatchesTurn + wake.speed * 0.16)
    const phase = (clock.elapsedTime * (1.85 + wake.speed) + config.phase) % 1
    const radius = 0.72 + phase * 0.64

    if (meshRef.current) {
      meshRef.current.position.x = config.side * (0.46 + wake.turn * 0.3)
      meshRef.current.rotation.z = config.side * (clock.elapsedTime * 0.55 + config.phase)
      meshRef.current.scale.set(radius, radius * (0.55 + wake.turn * 0.2), 1)
    }

    if (materialRef.current) {
      materialRef.current.opacity = pulse * (1 - phase) * 0.48
    }
  })

  return (
    <mesh ref={meshRef} position={[config.side * 0.46, config.y, config.z]}>
      <ringGeometry args={[0.21, 0.27, 40]} />
      <meshBasicMaterial
        ref={materialRef}
        color={config.side < 0 ? '#dffcff' : '#ffd9a1'}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}

function BodyAirflowCowl({
  config,
  wakeRef,
}: {
  config: (typeof flightBodyAirflowCowlConfigs)[number]
  wakeRef: RefObject<{ speed: number; turn: number; direction: -1 | 0 | 1 }>
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      config.points.map(([x, y]) => new THREE.Vector3(x, y, config.z)),
      false,
      'catmullrom',
      0.18,
    )

    return new THREE.TubeGeometry(curve, 72, config.thickness, 6, false)
  }, [config])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          opacity: { value: config.opacity },
          color: { value: new THREE.Color('#d8fffb') },
        },
        vertexShader: `
          varying vec2 vUv;

          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float opacity;
          uniform vec3 color;
          varying vec2 vUv;

          void main() {
            float startFade = smoothstep(0.0, 0.18, vUv.x);
            float endFade = 1.0 - smoothstep(0.82, 1.0, vUv.x);
            float alpha = opacity * startFade * endFade;

            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        toneMapped: false,
      }),
    [config.opacity],
  )

  useFrame(({ clock }) => {
    const wake = wakeRef.current
    const directionPull = wake.direction * wake.turn

    if (meshRef.current) {
      meshRef.current.position.x =
        -directionPull * 0.06 + Math.sin(clock.elapsedTime * 6.5 + config.phase) * 0.008
      meshRef.current.position.y = Math.sin(clock.elapsedTime * 5.2 + config.phase) * 0.008
      meshRef.current.scale.set(1 + wake.speed * 0.04, 1 + wake.turn * 0.08, 1)
      meshRef.current.rotation.z = -directionPull * 0.16
    }

    if (materialRef.current) {
      materialRef.current.uniforms.opacity.value =
        config.opacity + wake.speed * 0.08 + wake.turn * 0.08
    }
  })

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  return (
    <mesh ref={meshRef}>
      <primitive object={geometry} attach="geometry" />
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  )
}

function PlayerFlightAirflow({ playerPosition }: { playerPosition: ArenaPoint }) {
  const groupRef = useRef<THREE.Group>(null)
  const previousPositionRef = useRef(playerPosition)
  const previousHorizontalVelocityRef = useRef(0)
  const wakeRef = useRef<{ speed: number; turn: number; direction: -1 | 0 | 1 }>({
    speed: 0,
    turn: 0,
    direction: 0,
  })

  useFrame((_, delta) => {
    const dynamics = getFlightAirflowDynamics({
      currentPosition: playerPosition,
      previousPosition: previousPositionRef.current,
      previousHorizontalVelocity: previousHorizontalVelocityRef.current,
      delta,
    })
    const wake = wakeRef.current

    wake.speed = THREE.MathUtils.lerp(wake.speed, 0.56 + dynamics.speedRatio * 0.44, 0.16)
    wake.turn = Math.max(dynamics.turnRatio, wake.turn * 0.86)
    wake.direction = dynamics.direction
    previousPositionRef.current = playerPosition
    previousHorizontalVelocityRef.current = dynamics.horizontalVelocity

    if (groupRef.current) {
      const [x, y, z] = arenaPointToView(playerPosition, 0.54)
      groupRef.current.position.set(x, y, z)
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        -dynamics.horizontalVelocity * 0.018,
        0.18,
      )
    }
  })

  return (
    <group
      ref={groupRef}
      position={arenaPointToView(playerPosition, 0.54)}
      name="player-flight-airflow"
    >
      {flightBodyAirflowCowlConfigs.map((config) => (
        <BodyAirflowCowl
          key={`${config.z}-${config.phase}`}
          config={config}
          wakeRef={wakeRef}
        />
      ))}
      {flightTurnWakeConfigs.map((config) => (
        <TurnWakeRing
          key={config.side}
          config={config}
          wakeRef={wakeRef}
        />
      ))}
    </group>
  )
}

function RuntimeEntityLayer({
  character,
  stage,
  snapshot,
}: {
  character: CharacterDefinition
  stage: StageDefinition
  snapshot: BattleSnapshot
}) {
  const enemyTexture = useLoadedTexture(gameAssets.enemyBrassCloudAtlasUrl)

  return (
    <>
      <PlayerFlightAirflow playerPosition={snapshot.player.position} />
      <PlayerSprite
        battleElapsed={snapshot.elapsed}
        frameCount={character.frameCount}
        position={arenaPointToView(snapshot.player.position, 0.65)}
        spriteSheetUrl={character.spriteSheetUrl}
        specialActive={snapshot.specialSlots.some((slot) => slot.active)}
      />
      {snapshot.enemies.map((enemy) => (
        <EnemySprite
          key={enemy.id}
          enemyTexture={enemyTexture}
          frameId={enemy.frameId}
          position={arenaPointToView(enemy.position, 0.7)}
          scale={enemy.scale}
        />
      ))}
      <BossSprite stage={stage} snapshot={snapshot} />
      {snapshot.bullets.map((bullet) => (
        <BulletMesh key={bullet.id} bullet={bullet} />
      ))}
      {snapshot.specialBeam ? <SpecialBeamMesh beam={snapshot.specialBeam} /> : null}
      {snapshot.sparkles.map((sparkle) => (
        <SparkleMesh key={sparkle.id} sparkle={sparkle} />
      ))}
    </>
  )
}

function BattleScene({
  character,
  stage,
  snapshot,
}: {
  character: CharacterDefinition
  stage: StageDefinition
  snapshot: BattleSnapshot
}) {
  const laneGuideRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (!laneGuideRef.current) {
      return
    }

    laneGuideRef.current.rotation.z += delta * 0.9
  })

  return (
    <>
      <color attach="background" args={['#123640']} />
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[7.5, 12]} />
        <meshBasicMaterial color="#163d47" toneMapped={false} />
      </mesh>
      <MovingBackgroundLayer stage={stage} />
      <BackgroundFixtureLayer stage={stage} />
      <mesh ref={laneGuideRef} position={[0, -2.9, 0.2]}>
        <ringGeometry args={[0.48, 0.56, 48]} />
        <meshBasicMaterial color="#5ceee4" toneMapped={false} />
      </mesh>
      <RuntimeEntityLayer character={character} stage={stage} snapshot={snapshot} />
    </>
  )
}

export function createArenaPoint(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): ArenaPoint {
  const xRatio = (clientX - rect.left) / rect.width
  const yRatio = (clientY - rect.top) / rect.height

  return {
    x: (xRatio - 0.5) * battleDragInputConfig.horizontalWorldSpan,
    z: battleDragInputConfig.verticalWorldTop - yRatio * battleDragInputConfig.verticalWorldSpan,
  }
}

function SpecialSlotHud({
  slots,
  onActivate,
}: {
  slots: RenderSpecialSlot[]
  onActivate: (slotId: RenderSpecialSlot['id']) => void
}) {
  return (
    <div className="battle-specials" aria-label="Special attacks">
      {slots.map((slot) => {
        const chargeRatio = Math.min(1, slot.charge / slot.maxCharge)

        return (
          <button
            key={slot.id}
            type="button"
            className={`battle-special-slot ${
              slot.ready ? 'battle-special-slot--ready' : ''
            } ${slot.active ? 'battle-special-slot--active' : ''}`}
            style={{ '--special-charge': `${chargeRatio * 360}deg` } as CSSProperties}
            disabled={!slot.ready}
            aria-label="Activate Beam Lance special"
            aria-valuemin={0}
            aria-valuemax={slot.maxCharge}
            aria-valuenow={Math.round(slot.charge)}
            onClick={() => onActivate(slot.id)}
          >
            <span className="battle-special-slot__icon" aria-hidden="true">
              <svg viewBox="0 0 48 48" focusable="false">
                <path d="M24 5l7 18-7 20-7-20 7-18z" />
                <path d="M13 27h22" />
                <path d="M18 35h12" />
              </svg>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function BattleView({
  character,
  difficulty,
  stage,
  fastStage,
  invincible,
  onComplete,
}: BattleViewProps) {
  const { runtime, snapshot } = useBattleRuntime({
    difficulty,
    stage,
    character,
    fastStage,
    invincible,
  })
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const deliveredResultRef = useRef<RunResult | null>(null)

  useEffect(() => {
    let frame = 0
    let lastTime = performance.now()

    const tick = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.033)
      lastTime = time
      runtime.update(delta)
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [runtime])

  useEffect(() => {
    if (snapshot.result && deliveredResultRef.current !== snapshot.result) {
      deliveredResultRef.current = snapshot.result
      onComplete(snapshot.result)
    }
  }, [onComplete, snapshot.result])

  return (
    <section className="battle-shell" aria-label={`Stage ${stage.stageNumber} battle`}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 48 }}
        gl={{ alpha: false, antialias: true }}
        onCreated={({ gl }) => {
          gl.setClearColor('#123640', 1)
        }}
        style={{ width: '100%', height: '100%', background: '#123640' }}
      >
        <BattleScene character={character} stage={stage} snapshot={snapshot} />
      </Canvas>
      <span hidden data-testid="battle-background-motion" />
      <span hidden data-testid="battle-airflow-motion" />
      <span hidden data-testid="battle-background-theme">
        {stage.backgroundTheme}
      </span>
      <div
        ref={overlayRef}
        className="battle-shell__controls"
        onPointerDown={(event) => {
          const rect = overlayRef.current?.getBoundingClientRect()
          if (!rect) {
            return
          }

          event.currentTarget.setPointerCapture(event.pointerId)
          runtime.beginDrag(createArenaPoint(event.clientX, event.clientY, rect))
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            return
          }

          const rect = overlayRef.current?.getBoundingClientRect()
          if (!rect) {
            return
          }

          runtime.moveDrag(createArenaPoint(event.clientX, event.clientY, rect))
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
          runtime.endDrag()
        }}
        onPointerCancel={() => runtime.endDrag()}
        role="presentation"
      />
      <div className="battle-hud" aria-label="Battle status">
        <div className="battle-status">
          <div className="battle-status__phase">
            <span>Stage {stage.stageNumber}</span>
            <strong>{snapshot.phaseLabel}</strong>
          </div>
          <div className="battle-status__meta">
            <strong className="battle-status__difficulty">{difficulty.toUpperCase()}</strong>
            <strong className="battle-status__hp" aria-label={`Hull ${snapshot.player.hp} of 3`}>
              {'◆'.repeat(snapshot.player.hp).padEnd(3, '◇')}
            </strong>
          </div>
        </div>
        {snapshot.boss ? (
          <div className="battle-boss">
            <span>Boss</span>
            <div className="battle-boss__bar">
              <i style={{ width: `${snapshot.boss.hpRatio * 100}%` }} />
            </div>
          </div>
        ) : null}
      </div>
      <SpecialSlotHud
        slots={snapshot.specialSlots}
        onActivate={(slotId) => runtime.activateSpecial(slotId)}
      />
    </section>
  )
}
