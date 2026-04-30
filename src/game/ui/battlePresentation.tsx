import type { CSSProperties } from 'react'

import { gameAssets } from '../assets'
import type { ArenaPoint, BattleSnapshot, EnemyKind } from '../types'

type LayerKind = 'player' | 'enemy' | 'boss' | 'bullet'

type LayerPoint = {
  left: number
  top: number
  scale: number
}

type EntityStyle = CSSProperties & {
  '--entity-scale'?: number
  '--entity-size'?: string
  '--entity-width'?: string
  '--entity-height'?: string
  '--entity-color'?: string
}

function resolveEnemyAsset(kind: EnemyKind) {
  if (kind === 'feather-drone') {
    return gameAssets.enemyFeatherUrl
  }
  if (kind === 'boss-core') {
    return gameAssets.bossCoreUrl
  }
  return gameAssets.enemyScoutUrl
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function projectArenaPointToLayer(point: ArenaPoint, kind: LayerKind): LayerPoint {
  const rawNormalizedX = (point.x + 3.4) / 6.8
  const rawNormalizedZ = (point.z + 3.2) / 6.4
  const normalizedX = kind === 'bullet' ? rawNormalizedX : clamp(rawNormalizedX, 0, 1)
  const normalizedZ = kind === 'bullet' ? rawNormalizedZ : clamp(rawNormalizedZ, 0, 1)
  const depth = 1 - normalizedZ
  const horizonOffset = kind === 'enemy' || kind === 'boss' ? 14 : 12
  const verticalTravel = kind === 'enemy' || kind === 'boss' ? 74 : 82

  return {
    left: 12 + normalizedX * 76,
    top: horizonOffset + depth * verticalTravel,
    scale: 0.68 + normalizedZ * 0.72,
  }
}

function createEntityStyle(layer: LayerPoint, customStyle?: EntityStyle): EntityStyle {
  return {
    left: `${layer.left}%`,
    top: `${layer.top}%`,
    aspectRatio: '1 / 1',
    '--entity-scale': layer.scale,
    ...customStyle,
  }
}

export function BattlePresentationLayer({
  snapshot,
}: {
  snapshot: BattleSnapshot
}) {
  const player = projectArenaPointToLayer(snapshot.player.position, 'player')

  return (
    <div className="battle-entities" aria-hidden="true">
      <img
        className="battle-entities__cloud battle-entities__cloud--far-a"
        src={gameAssets.cloudLayerAUrl}
        alt=""
      />
      <img
        className="battle-entities__cloud battle-entities__cloud--far-b"
        src={gameAssets.cloudLayerBUrl}
        alt=""
      />
      <img
        className="battle-entities__cloud battle-entities__cloud--near-a"
        src={gameAssets.cloudLayerAUrl}
        alt=""
      />
      <img
        className="battle-entities__cloud battle-entities__cloud--near-b"
        src={gameAssets.cloudLayerBUrl}
        alt=""
      />
      <div
        className={`battle-entity battle-entity--player ${
          snapshot.player.invulnerable ? 'battle-entity--player-invulnerable' : ''
        }`}
        style={createEntityStyle(player, {
          '--entity-width': '82px',
          '--entity-height': '132px',
          aspectRatio: '41 / 66',
        })}
      >
        <span className="battle-entity__shadow" />
        <span
          className="battle-entity__sprite battle-entity__sprite--player"
          style={{ backgroundImage: `url(${gameAssets.playerSheetUrl})` }}
        />
      </div>

      {snapshot.enemies.map((enemy) => {
        const layer = projectArenaPointToLayer(enemy.position, 'enemy')
        return (
          <div
            key={enemy.id}
            className={`battle-entity battle-entity--enemy battle-entity--${enemy.kind}`}
            style={createEntityStyle(layer, {
              '--entity-color': enemy.kind === 'feather-drone' ? '#7af0ff' : '#ffbe62',
            })}
          >
            <span className="battle-entity__shadow battle-entity__shadow--enemy" />
            <img
              className="battle-entity__sprite battle-entity__sprite--enemy"
              src={resolveEnemyAsset(enemy.kind)}
              alt=""
            />
          </div>
        )
      })}

      {snapshot.boss ? (() => {
        const layer = projectArenaPointToLayer(snapshot.boss.position, 'boss')
        return (
          <div
            className="battle-entity battle-entity--boss"
            style={createEntityStyle(layer, {
              '--entity-width': '128px',
              '--entity-height': '160px',
              aspectRatio: '4 / 5',
            })}
          >
            <span className="battle-entity__boss-aura" />
            <img
              className="battle-entity__sprite battle-entity__sprite--boss"
              src={gameAssets.bossCoreUrl}
              alt=""
            />
          </div>
        )
      })() : null}

      {snapshot.bullets.map((bullet) => {
        const layer = projectArenaPointToLayer(
          bullet.position,
          bullet.source === 'player' ? 'bullet' : 'enemy',
        )
        const diameter = Math.max(8, 7 + bullet.radius * 34)
        return (
          <span
            key={bullet.id}
            className={`battle-entity battle-entity--bullet battle-entity--bullet-${bullet.source}`}
            style={createEntityStyle(layer, {
              '--entity-scale': 1,
              '--entity-size': `${diameter.toFixed(1)}px`,
            })}
          />
        )
      })}
    </div>
  )
}
