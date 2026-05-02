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
import { BulletMesh, PlayerFlightAirflow, SparkleMesh, SpecialBeamMesh } from './battleEffects'
import type { BattleSnapshot, CharacterDefinition, RenderEnemy, StageDefinition } from '../types'

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

function getBossDefinitionsByRole(stage: StageDefinition, role: 'midboss' | 'final') {
  return (stage.events ?? []).flatMap((event) =>
    event.actions.flatMap((action) =>
      action.type === 'spawnBoss' && action.role === role ? [action.boss] : [],
    ),
  )
}

export function getBossCoreTextureUrl(stage: StageDefinition, boss: { id: string } | null) {
  const eventMidbosses = getBossDefinitionsByRole(stage, 'midboss')
  const legacyMidbosses = stage.midboss ? [stage.midboss] : []
  if (
    boss &&
    [...eventMidbosses, ...legacyMidbosses].some((definition) => definition.id === boss.id) &&
    stage.backgroundTheme === 'burning-ruins'
  ) {
    return gameAssets.stage2MidbossCoreUrl
  }

  const eventFinalBosses = getBossDefinitionsByRole(stage, 'final')
  const legacyFinalBosses = stage.boss ? [stage.boss] : []
  if (
    boss &&
    [...eventFinalBosses, ...legacyFinalBosses].some((definition) => definition.id === boss.id) &&
    stage.backgroundTheme === 'burning-ruins'
  ) {
    return gameAssets.stage2BossCoreUrl
  }

  return gameAssets.bossCoreUrl
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
        <BulletMesh key={bullet.id} bullet={bullet} isPaused={isPaused} />
      ))}
      {snapshot.specialBeam ? (
        <SpecialBeamMesh beam={snapshot.specialBeam} isPaused={isPaused} />
      ) : null}
      {snapshot.sparkles.map((sparkle) => (
        <SparkleMesh key={sparkle.id} sparkle={sparkle} />
      ))}
    </>
  )
}
