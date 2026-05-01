import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import {
  arenaPointToView,
  flightBodyAirflowCowlConfigs,
  flightTurnWakeConfigs,
  getFlightAirflowDynamics,
} from './battleViewMath'
import type { ArenaPoint, RenderBullet, RenderSparkle, RenderSpecialBeam } from '../types'

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

export function BulletMesh({ bullet }: { bullet: RenderBullet }) {
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

export function SpecialBeamMesh({ beam }: { beam: RenderSpecialBeam }) {
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

export function SparkleMesh({ sparkle }: { sparkle: RenderSparkle }) {
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

export function PlayerFlightAirflow({ playerPosition }: { playerPosition: ArenaPoint }) {
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
