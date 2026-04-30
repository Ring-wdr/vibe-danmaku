import type { CSSProperties } from 'react'

import type { ArenaPoint, BattleSnapshot } from '../types'

type LayerKind = 'player' | 'enemy' | 'boss' | 'bullet'

type LayerPoint = {
  left: number
  top: number
  scale: number
}

type EntityStyle = CSSProperties & {
  '--entity-scale'?: number
  '--entity-size'?: string
  '--entity-color'?: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function projectArenaPointToLayer(point: ArenaPoint, kind: LayerKind): LayerPoint {
  const normalizedX = clamp((point.x + 3.4) / 6.8, 0, 1)
  const normalizedZ = clamp((point.z + 3.2) / 6.4, 0, 1)
  const depth = 1 - normalizedZ
  const horizonOffset = kind === 'enemy' || kind === 'boss' ? 14 : 12

  return {
    left: 12 + normalizedX * 76,
    top: horizonOffset + depth * (kind === 'enemy' || kind === 'boss' ? 74 : 72),
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
      <div className="battle-entities__arena" />

      <div
        className={`battle-entity battle-entity--player ${
          snapshot.player.invulnerable ? 'battle-entity--player-invulnerable' : ''
        }`}
        style={createEntityStyle(player)}
      >
        <span className="battle-entity__shadow" />
        <span className="battle-entity__player-core" />
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
            <span className="battle-entity__enemy-core" />
          </div>
        )
      })}

      {snapshot.boss ? (() => {
        const layer = projectArenaPointToLayer(snapshot.boss.position, 'boss')
        return (
          <div
            className="battle-entity battle-entity--boss"
            style={createEntityStyle(layer)}
          >
            <span className="battle-entity__boss-ring" />
            <span className="battle-entity__boss-core" />
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
