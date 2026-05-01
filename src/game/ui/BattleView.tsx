import { Canvas, useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { gameAssets } from '../assets'
import { useBattleRuntime } from './useBattleRuntime'
import type { ArenaPoint, BattleSnapshot, Difficulty, EnemyKind, RunResult } from '../types'

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

      loadedTexture.colorSpace = THREE.SRGBColorSpace
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

function PlayerSprite({ position }: { position: [number, number, number] }) {
  const configurePlayerTexture = useCallback((loadedTexture: THREE.Texture) => {
    loadedTexture.wrapS = THREE.RepeatWrapping
    loadedTexture.repeat.set(0.25, 1)
  }, [])
  const texture = useLoadedTexture(gameAssets.playerSheetUrl, configurePlayerTexture)

  useFrame(({ clock }) => {
    if (!texture) {
      return
    }

    texture.offset.x = (Math.floor(clock.elapsedTime * 8) % 4) * 0.25
  })

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
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.02}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

function CloudLayer() {
  const cloudTexture = useLoadedTexture(gameAssets.cloudLayerAUrl)

  if (!cloudTexture) {
    return null
  }

  return (
    <mesh position={[0, 1.1, -1.7]} rotation={[0, 0, -0.08]}>
      <planeGeometry args={[5.8, 5.8]} />
      <meshBasicMaterial
        map={cloudTexture}
        transparent
        opacity={0.42}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

function resolveEnemyAssetUrl(kind: EnemyKind) {
  if (kind === 'feather-drone') {
    return gameAssets.enemyFeatherUrl
  }
  if (kind === 'boss-core') {
    return gameAssets.bossCoreUrl
  }
  return gameAssets.enemyScoutUrl
}

function EnemySprite({
  kind,
  position,
  scale,
}: {
  kind: EnemyKind
  position: [number, number, number]
  scale: number
}) {
  const enemyTexture = useLoadedTexture(resolveEnemyAssetUrl(kind))

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
      <meshBasicMaterial
        map={enemyTexture}
        transparent
        alphaTest={0.02}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

function BossSprite({ snapshot }: { snapshot: BattleSnapshot }) {
  const bossTexture = useLoadedTexture(gameAssets.bossCoreUrl)

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
      <meshBasicMaterial
        map={bossTexture}
        transparent
        alphaTest={0.02}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

function arenaPointToView(point: ArenaPoint, z = 0.5): [number, number, number] {
  return [point.x * 0.55, point.z * 0.9 - 0.45, z]
}

function RuntimeEntityLayer({ snapshot }: { snapshot: BattleSnapshot }) {
  return (
    <>
      <PlayerSprite
        position={arenaPointToView(snapshot.player.position, 0.65)}
      />
      {snapshot.enemies.map((enemy) => (
        <EnemySprite
          key={enemy.id}
          kind={enemy.kind}
          position={arenaPointToView(enemy.position, 0.7)}
          scale={enemy.scale}
        />
      ))}
      <BossSprite snapshot={snapshot} />
      {snapshot.bullets.map((bullet) => (
        <mesh
          key={bullet.id}
          position={arenaPointToView(bullet.position, bullet.source === 'player' ? 0.76 : 0.74)}
        >
          <circleGeometry args={[Math.max(0.045, bullet.radius * 0.7), 24]} />
          <meshBasicMaterial
            color={bullet.source === 'player' ? '#ffd28a' : '#55f0ff'}
            transparent
            opacity={Math.min(1, 0.72 + bullet.glow * 0.18)}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  )
}

function BattleScene({ snapshot }: { snapshot: BattleSnapshot }) {
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
      <CloudLayer />
      <mesh ref={laneGuideRef} position={[0, -2.9, 0.2]}>
        <ringGeometry args={[0.48, 0.56, 48]} />
        <meshBasicMaterial color="#5ceee4" toneMapped={false} />
      </mesh>
      <RuntimeEntityLayer snapshot={snapshot} />
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
  const { runtime, snapshot } = useBattleRuntime({ difficulty, fastStage, invincible })
  const overlayRef = useRef<HTMLDivElement | null>(null)

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
    if (snapshot.result) {
      onComplete(snapshot.result)
    }
  }, [onComplete, snapshot.result])

  return (
    <section className="battle-shell" aria-label="Stage 1 battle">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 48 }}
        gl={{ alpha: false, antialias: true }}
        onCreated={({ gl }) => {
          gl.setClearColor('#123640', 1)
        }}
        style={{ width: '100%', height: '100%', background: '#123640' }}
      >
        <BattleScene snapshot={snapshot} />
      </Canvas>
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
