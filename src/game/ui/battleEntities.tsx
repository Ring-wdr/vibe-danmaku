import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { gameAssets } from '../assets'
import {
  brassCloudEnemyFrames,
  enemyBrassCloudAtlasSize,
  type AtlasFrame,
} from '../content/enemyBrassCloudAtlas'
import { arenaPointToView } from './battleViewMath'
import { RestoredTextureMaterial, useLoadedTexture } from './battleTexture'
import {
  BulletMesh,
  EnemyDestructionEffectMesh,
  PlayerFlightAirflow,
  SparkleMesh,
  SpecialBeamMesh,
} from './battleEffects'
import type {
  BattleSnapshot,
  CharacterDefinition,
  RenderBoss,
  RenderEnemy,
  RenderItemDrop,
  StageDefinition,
} from '../types'

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
  hitFlashRatio,
  position,
  scale,
}: {
  enemyTexture: THREE.Texture | null
  frameId: RenderEnemy['frameId']
  hitFlashRatio: number
  position: [number, number, number]
  scale: number
}) {
  const atlasUv = useMemo(() => getAtlasFrameUv(brassCloudEnemyFrames[frameId]), [frameId])
  const flashOpacity = Math.min(0.72, Math.max(0, hitFlashRatio) * 0.72)

  if (!enemyTexture) {
    return (
      <group position={position}>
        <mesh>
          <circleGeometry args={[0.36, 32]} />
          <meshBasicMaterial color="#ffbe62" toneMapped={false} />
        </mesh>
        {flashOpacity > 0 ? (
          <mesh position={[0, 0, 0.018]}>
            <circleGeometry args={[0.38, 32]} />
            <meshBasicMaterial
              color="#ff2828"
              transparent
              opacity={flashOpacity}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ) : null}
      </group>
    )
  }

  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[scale, scale]} />
        <RestoredTextureMaterial
          texture={enemyTexture}
          uvScale={atlasUv.uvScale}
          uvOffset={atlasUv.uvOffset}
        />
      </mesh>
      {flashOpacity > 0 ? (
        <mesh position={[0, 0, 0.018]}>
          <planeGeometry args={[scale, scale]} />
          <RestoredTextureMaterial
            texture={enemyTexture}
            opacity={flashOpacity}
            exposure={1}
            saturation={1}
            contrast={1}
            tintColor="#ff2a2a"
            tintStrength={1}
            uvScale={atlasUv.uvScale}
            uvOffset={atlasUv.uvOffset}
          />
        </mesh>
      ) : null}
    </group>
  )
}

function ItemDropSprite({ drop }: { drop: RenderItemDrop }) {
  const texture = useLoadedTexture(gameAssets.itemAtlasUrl)
  const position = arenaPointToView(drop.position, 0.74)

  if (!texture) {
    return (
      <group data-testid={`item-drop-${drop.itemId}`} position={position}>
        <mesh>
          <boxGeometry args={[0.42, 0.42, 0.12]} />
          <meshBasicMaterial color="#67e8f9" toneMapped={false} />
        </mesh>
      </group>
    )
  }

  return (
    <group data-testid={`item-drop-${drop.itemId}`} position={position}>
      <mesh>
        <planeGeometry args={[0.56, 0.56]} />
        <RestoredTextureMaterial
          texture={texture}
          frameColumns={2}
          frameIndex={0}
          exposure={1.72}
          saturation={1.32}
          contrast={1.08}
        />
      </mesh>
      <mesh position={[0, -0.03, -0.02]}>
        <ringGeometry args={[0.28, 0.34, 36]} />
        <meshBasicMaterial
          color="#f8e08e"
          transparent
          opacity={0.2}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

function PlayerSidePanel({
  position,
  scale,
  side,
  battleElapsed,
  textureUrl,
}: {
  position: [number, number, number]
  scale: number
  side: -1 | 1
  battleElapsed: number
  textureUrl: string
}) {
  const texture = useLoadedTexture(textureUrl)
  const tilt = side * 0.24 + Math.sin(battleElapsed * 4.2 + side) * 0.06

  if (!texture) {
    return (
      <group position={position} rotation={[0, 0, tilt]}>
        <mesh>
          <planeGeometry args={[scale * 0.38, scale]} />
          <meshBasicMaterial
            color="#7d39c8"
            transparent
            opacity={0.78}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    )
  }

  return (
    <group position={position} rotation={[0, 0, tilt]}>
      <mesh>
        <planeGeometry args={[scale * 0.38, scale]} />
        <RestoredTextureMaterial
          texture={texture}
          exposure={1.6}
          saturation={1.34}
          contrast={1.06}
        />
      </mesh>
    </group>
  )
}

function getBossDefinitionsByRole(stage: StageDefinition, role: 'midboss' | 'final') {
  return stage.events.flatMap((event) =>
    event.actions.flatMap((action) =>
      action.type === 'spawnBoss' && action.role === role ? [action.boss] : [],
    ),
  )
}

export function getBossCoreTextureUrl(stage: StageDefinition, boss: { id: string } | null) {
  const eventMidbosses = getBossDefinitionsByRole(stage, 'midboss')
  if (
    boss &&
    eventMidbosses.some((definition) => definition.id === boss.id) &&
    stage.backgroundTheme === 'burning-ruins'
  ) {
    return gameAssets.stage2MidbossCoreUrl
  }

  const eventFinalBosses = getBossDefinitionsByRole(stage, 'final')
  if (
    boss &&
    eventFinalBosses.some((definition) => definition.id === boss.id) &&
    stage.backgroundTheme === 'burning-ruins'
  ) {
    return gameAssets.stage2BossCoreUrl
  }

  return gameAssets.bossCoreUrl
}

export function getRenderableBosses(snapshot: BattleSnapshot) {
  return snapshot.bosses
}

function BossSprite({ boss, stage }: { boss: RenderBoss; stage: StageDefinition }) {
  const bossTexture = useLoadedTexture(getBossCoreTextureUrl(stage, boss))

  const position = arenaPointToView(boss.position, 0.78)

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

export function RuntimeEntityLayer({
  character,
  stage,
  snapshot,
  isPaused,
}: {
  character: CharacterDefinition
  stage: StageDefinition
  snapshot: BattleSnapshot
  isPaused: boolean
}) {
  const enemyTexture = useLoadedTexture(gameAssets.enemyBrassCloudAtlasUrl)

  return (
    <>
      <PlayerFlightAirflow playerPosition={snapshot.player.position} isPaused={isPaused} />
      <PlayerSprite
        battleElapsed={snapshot.elapsed}
        frameCount={character.frameCount}
        position={arenaPointToView(snapshot.player.position, 0.65)}
        spriteSheetUrl={character.spriteSheetUrl}
        specialActive={snapshot.specialSlots.some((slot) => slot.active)}
      />
      {(character.sidePanels ?? []).map((panel) => (
        <PlayerSidePanel
          key={panel.offsetX}
          battleElapsed={snapshot.elapsed}
          position={arenaPointToView(
            {
              x: snapshot.player.position.x + panel.offsetX,
              z: snapshot.player.position.z + panel.offsetZ,
            },
            0.68,
          )}
          scale={panel.scale}
          side={panel.offsetX < 0 ? -1 : 1}
          textureUrl={panel.textureUrl}
        />
      ))}
      {snapshot.enemies.map((enemy) => (
        <EnemySprite
          key={enemy.id}
          enemyTexture={enemyTexture}
          frameId={enemy.frameId}
          hitFlashRatio={enemy.hitFlashRatio}
          position={arenaPointToView(enemy.position, 0.7)}
          scale={enemy.scale}
        />
      ))}
      {snapshot.itemDrops.map((drop) => (
        <ItemDropSprite key={drop.id} drop={drop} />
      ))}
      {getRenderableBosses(snapshot).map((boss) => (
        <BossSprite key={boss.id} boss={boss} stage={stage} />
      ))}
      {snapshot.bullets.map((bullet) => (
        <BulletMesh key={bullet.id} bullet={bullet} isPaused={isPaused} />
      ))}
      {snapshot.specialBeam ? (
        <SpecialBeamMesh beam={snapshot.specialBeam} isPaused={isPaused} />
      ) : null}
      {snapshot.sparkles.map((sparkle) => (
        <SparkleMesh key={sparkle.id} sparkle={sparkle} />
      ))}
      {snapshot.destructionEffects.map((effect) => (
        <EnemyDestructionEffectMesh key={effect.id} effect={effect} />
      ))}
    </>
  )
}
