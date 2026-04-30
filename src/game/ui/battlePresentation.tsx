import type { ArenaPoint, BattleSnapshot } from '../types'

type LayerKind = 'player' | 'enemy' | 'boss' | 'bullet'

type LayerPoint = {
  left: number
  top: number
  scale: number
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

export function BattlePresentationLayer({
  snapshot,
}: {
  snapshot: BattleSnapshot
}) {
  const player = projectArenaPointToLayer(snapshot.player.position, 'player')

  return (
    <div className="battle-entities" aria-hidden="true">
      <svg className="battle-entities__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <radialGradient id="arenaGlow" cx="50%" cy="58%" r="55%">
            <stop offset="0%" stopColor="#5ceee4" stopOpacity="0.22" />
            <stop offset="58%" stopColor="#5ceee4" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#5ceee4" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="50" cy="64" rx="26" ry="14" fill="url(#arenaGlow)" />
        <ellipse cx="50" cy="64" rx="24" ry="12.5" fill="none" stroke="#5ceee4" strokeOpacity="0.35" strokeWidth="0.45" />

        <ellipse
          cx={player.left}
          cy={player.top + 4}
          rx={4.2 * player.scale}
          ry={2.2 * player.scale}
          fill="#5ceee4"
          fillOpacity="0.34"
        />
        <polygon
          points={`${player.left},${player.top - 4.2} ${player.left + 2.2},${player.top} ${player.left},${player.top + 4.2} ${player.left - 2.2},${player.top}`}
          fill={snapshot.player.invulnerable ? '#fff1c6' : '#5ceee4'}
          fillOpacity={snapshot.player.invulnerable ? 0.82 : 1}
          stroke="#fff4df"
          strokeWidth="0.35"
        />

        {snapshot.enemies.map((enemy) => {
          const layer = projectArenaPointToLayer(enemy.position, 'enemy')
          const size = 1.6 * layer.scale
          return (
            <polygon
              key={enemy.id}
              points={`${layer.left},${layer.top - size * 1.4} ${layer.left + size},${layer.top + size} ${layer.left - size},${layer.top + size}`}
              fill={enemy.kind === 'feather-drone' ? '#7af0ff' : '#ffbe62'}
              stroke="#fff4df"
              strokeWidth="0.25"
            />
          )
        })}

        {snapshot.boss ? (() => {
          const layer = projectArenaPointToLayer(snapshot.boss.position, 'boss')
          return (
            <g>
              <circle cx={layer.left} cy={layer.top} r={4.2 * layer.scale} fill="#5ceee4" fillOpacity="0.16" />
              <circle cx={layer.left} cy={layer.top} r={3.2 * layer.scale} fill="none" stroke="#7af0ff" strokeWidth="0.45" />
              <circle cx={layer.left} cy={layer.top} r={1.5 * layer.scale} fill="#ffbe62" />
            </g>
          )
        })() : null}

        {snapshot.bullets.map((bullet) => {
          const layer = projectArenaPointToLayer(
            bullet.position,
            bullet.source === 'player' ? 'bullet' : 'enemy',
          )
          const radius = 0.55 + bullet.radius * 1.6
          return (
            <circle
              key={bullet.id}
              cx={layer.left}
              cy={layer.top}
              r={radius}
              fill={bullet.source === 'player' ? '#ffd28a' : '#55f0ff'}
            />
          )
        })}
      </svg>
    </div>
  )
}
