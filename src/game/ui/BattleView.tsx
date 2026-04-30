import { Billboard, Plane, useTexture } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import * as THREE from 'three'

import { gameAssets } from '../assets'
import {
  arenaVisualConfig,
  battleCameraConfig,
  battleCanvasFallbackColor,
  battleInteractionConfig,
  cloudBackdropLayers,
} from './sceneConfig'
import { BattlePresentationLayer, projectArenaPointToLayer } from './battlePresentation'
import { useBattleSoundscape } from './useBattleSoundscape'
import { useBattleRuntime } from './useBattleRuntime'
import type { ArenaPoint, Difficulty, RunResult } from '../types'

type BattleViewProps = {
  difficulty: Difficulty
  fastStage?: boolean
  invincible?: boolean
  onComplete: (result: RunResult) => void
}

export const battleDragInputConfig = {
  horizontalWorldSpan: 8,
  verticalWorldSpan: 5.2,
  verticalWorldTop: 1.8,
} as const

function StageScene({
  snapshot,
}: Pick<ReturnType<typeof useBattleRuntime>, 'snapshot'>) {
  const cloudA = useTexture(gameAssets.cloudLayerAUrl)
  const cloudB = useTexture(gameAssets.cloudLayerBUrl)
  const playerSheet = useTexture(gameAssets.playerSheetUrl)
  const scout = useTexture(gameAssets.enemyScoutUrl)
  const feather = useTexture(gameAssets.enemyFeatherUrl)
  const bossCore = useTexture(gameAssets.bossCoreUrl)
  const animatedPlayerRef = useRef<THREE.Texture | null>(null)

  if (!animatedPlayerRef.current) {
    const clone = playerSheet.clone()
    clone.needsUpdate = true
    clone.repeat.set(0.25, 1)
    animatedPlayerRef.current = clone
  }

  useFrame(() => {
    const animated = animatedPlayerRef.current
    if (animated) {
      const frame = Math.floor(snapshot.elapsed * 8) % 4
      animated.offset.x = frame * 0.25
    }
  })

  const resolveEnemyTexture = (kind: 'steam-scout' | 'feather-drone' | 'boss-core') => {
    if (kind === 'feather-drone') {
      return feather
    }
    if (kind === 'boss-core') {
      return bossCore
    }
    return scout
  }

  return (
    <>
      <color attach="background" args={[battleCanvasFallbackColor]} />
      <fog attach="fog" args={[battleCanvasFallbackColor, 5.2, 11.5]} />
      <ambientLight intensity={1.5} color="#8fd7c4" />
      <directionalLight position={[2, 6, 2]} intensity={2.8} color="#ffd08a" />
      <pointLight position={[0, 1.8, 2]} intensity={18} distance={7} color="#38d4cf" />

      {cloudBackdropLayers.map((layer) => (
        <Plane
          key={layer.texture}
          args={layer.size}
          rotation={layer.rotation}
          position={layer.position}
        >
          <meshBasicMaterial
            transparent
            opacity={layer.opacity}
            map={layer.texture === 'cloudA' ? cloudA : cloudB}
            depthWrite={false}
          />
        </Plane>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, -0.2]}>
        <ringGeometry args={[1.3, 3.45, 128]} />
        <meshStandardMaterial
          color={arenaVisualConfig.ringColor}
          emissive={arenaVisualConfig.ringEmissive}
          emissiveIntensity={arenaVisualConfig.ringEmissiveIntensity}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.03, -0.2]}>
        <circleGeometry args={[3.2, 64]} />
        <meshStandardMaterial
          color={arenaVisualConfig.floorColor}
          emissive={arenaVisualConfig.floorEmissive}
          emissiveIntensity={arenaVisualConfig.floorEmissiveIntensity}
          metalness={0.45}
          roughness={0.56}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, -0.2]}>
        <ringGeometry args={[2.15, 2.24, 96]} />
        <meshBasicMaterial color="#7cf2ec" transparent opacity={0.3} toneMapped={false} />
      </mesh>

      <Billboard position={[snapshot.player.position.x, -0.06, snapshot.player.position.z]}>
        <Plane args={arenaVisualConfig.playerSpriteScale}>
          <meshBasicMaterial
            transparent
            map={animatedPlayerRef.current ?? playerSheet}
            toneMapped={false}
            opacity={snapshot.player.invulnerable ? 0.62 : 1}
          />
        </Plane>
      </Billboard>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[snapshot.player.position.x, -0.98, snapshot.player.position.z + 0.05]}
      >
        <circleGeometry args={[arenaVisualConfig.playerHaloScale[0], 48]} />
        <meshBasicMaterial
          color={arenaVisualConfig.playerHaloColor}
          transparent
          opacity={arenaVisualConfig.playerHaloOpacity}
          toneMapped={false}
        />
      </mesh>

      {snapshot.enemies.map((enemy) => (
        <Billboard key={enemy.id} position={[enemy.position.x, -0.03, enemy.position.z]}>
          <Plane args={[enemy.scale, enemy.scale]}>
            <meshBasicMaterial
              transparent
              map={resolveEnemyTexture(enemy.kind)}
              toneMapped={false}
            />
          </Plane>
        </Billboard>
      ))}

      {snapshot.boss ? (
        <Billboard position={[snapshot.boss.position.x, 0.18, snapshot.boss.position.z]}>
          <Plane args={[1.95, 1.95]}>
            <meshBasicMaterial transparent map={bossCore} toneMapped={false} />
          </Plane>
        </Billboard>
      ) : null}

      {snapshot.bullets.map((bullet) => (
        <mesh
          key={bullet.id}
          position={[bullet.position.x, bullet.source === 'player' ? 0.05 : -0.02, bullet.position.z]}
        >
          <sphereGeometry args={[bullet.radius, 12, 12]} />
          <meshStandardMaterial
            color={bullet.source === 'player' ? '#ffe082' : '#43f1ff'}
            emissive={bullet.source === 'player' ? '#ff8a3d' : '#00d9ff'}
            emissiveIntensity={bullet.glow * 2}
            toneMapped={false}
          />
        </mesh>
      ))}

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

export function BattleView({
  difficulty,
  fastStage,
  invincible,
  onComplete,
}: BattleViewProps) {
  const runtimeState = useBattleRuntime({ difficulty, fastStage, invincible })
  const { runtime, snapshot } = runtimeState
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const [completed, setCompleted] = useState(false)
  const { unlockAudio } = useBattleSoundscape(snapshot, true)

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
    if (!snapshot.result || completed) {
      return
    }

    setCompleted(true)
    onComplete(snapshot.result)
  }, [completed, onComplete, snapshot.result])

  return (
    <section className="battle-shell" aria-label="Stage 1 battle">
      <div className="battle-shell__canvas">
        <Canvas
          camera={{ position: battleCameraConfig.position, fov: battleCameraConfig.fov }}
          gl={{ alpha: false }}
          onCreated={({ gl, camera }) => {
            gl.setClearColor(battleCanvasFallbackColor, 1)
            camera.position.set(...battleCameraConfig.position)
            camera.lookAt(...battleCameraConfig.lookAt)
            camera.updateProjectionMatrix()
          }}
          style={{
            width: '100%',
            height: '100%',
            background: battleCanvasFallbackColor,
          }}
        >
          <StageScene snapshot={snapshot} />
        </Canvas>
        <div
          ref={overlayRef}
          className="battle-shell__controls"
          onPointerDown={(event) => {
            const rect = overlayRef.current?.getBoundingClientRect()
            if (!rect) {
              return
            }

            void unlockAudio()
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
      </div>

      <div
        className="battle-stage-plane"
        style={
          {
            '--player-x': `${projectArenaPointToLayer(snapshot.player.position, 'player').left}%`,
            pointerEvents: battleInteractionConfig.stagePlanePointerEvents,
            zIndex: battleInteractionConfig.stagePlaneZIndex,
          } as CSSProperties
        }
      >
        <BattlePresentationLayer snapshot={snapshot} />
      </div>

      <div className="battle-hud" aria-label="Battle status">
        <div className="battle-status">
          <div className="battle-status__phase">
            <span>Stage 1</span>
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
    </section>
  )
}
