import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { createElement } from 'react'

import { gameAssets } from '../assets'
import { BattlePresentationLayer, projectArenaPointToLayer } from './battlePresentation'
import type { BattleSnapshot } from '../types'

const snapshot: BattleSnapshot = {
  difficulty: 'normal',
  stageName: 'Brass Cloud Gate',
  elapsed: 4,
  duration: 165,
  phaseLabel: 'Wave Assault',
  player: {
    position: { x: 0, z: -1.85 },
    hp: 3,
    invulnerable: false,
  },
  enemies: [
    {
      id: 'enemy-1',
      kind: 'steam-scout',
      position: { x: 0.4, z: 1.4 },
      scale: 0.9,
    },
  ],
  boss: null,
  bullets: [
    {
      id: 'bullet-1',
      source: 'enemy',
      position: { x: -0.2, z: 0.1 },
      radius: 0.11,
      glow: 1.1,
    },
  ],
  playerShots: 4,
  hitsTaken: 0,
  bossEnteredCount: 0,
  cuePulse: 0,
  result: null,
}

describe('projectArenaPointToLayer', () => {
  it('projects arena points into visible overlay percentages', () => {
    const player = projectArenaPointToLayer({ x: 0, z: -1.85 }, 'player')
    const enemy = projectArenaPointToLayer({ x: 0, z: 2.2 }, 'enemy')
    const lowerPlayer = projectArenaPointToLayer({ x: 0, z: -3.15 }, 'player')
    const exitingBullet = projectArenaPointToLayer({ x: 4.8, z: 0 }, 'bullet')

    expect(player.left).toBeGreaterThan(35)
    expect(player.left).toBeLessThan(65)
    expect(player.top).toBeGreaterThan(45)
    expect(player.top).toBeLessThan(92)
    expect(lowerPlayer.top).toBeGreaterThan(90)
    expect(lowerPlayer.top).toBeLessThan(95)

    expect(enemy.top).toBeGreaterThan(24)
    expect(enemy.top).toBeLessThan(42)

    expect(exitingBullet.left).toBeGreaterThan(100)
  })

  it('renders battle entities as aspect-stable DOM shapes instead of a stretched full-plane SVG', () => {
    const { container } = render(createElement(BattlePresentationLayer, { snapshot }))

    expect(container.querySelector('.battle-entities__svg')).not.toBeInTheDocument()
    expect(container.querySelector('.battle-entity--enemy')).toHaveStyle({
      aspectRatio: '1 / 1',
    })
    expect(container.querySelector('.battle-entity--bullet')).toHaveStyle({
      aspectRatio: '1 / 1',
    })
  })

  it('connects the visible presentation layer to the generated game assets', () => {
    const { container } = render(createElement(BattlePresentationLayer, { snapshot }))

    const player = container.querySelector<HTMLElement>('.battle-entity__sprite--player')
    const enemy = container.querySelector<HTMLImageElement>('.battle-entity__sprite--enemy')
    const clouds = container.querySelectorAll<HTMLImageElement>('.battle-entities__cloud')

    expect(player?.style.backgroundImage).toContain(gameAssets.playerSheetUrl)
    expect(enemy?.src).toContain(gameAssets.enemyScoutUrl)
    expect(clouds).toHaveLength(4)
    expect(
      [...clouds].filter((cloud) => cloud.src.includes(gameAssets.cloudLayerAUrl)),
    ).toHaveLength(2)
    expect(
      [...clouds].filter((cloud) => cloud.src.includes(gameAssets.cloudLayerBUrl)),
    ).toHaveLength(2)
    expect([...clouds].map((cloud) => cloud.className)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('battle-entities__cloud--far-a'),
        expect.stringContaining('battle-entities__cloud--far-b'),
        expect.stringContaining('battle-entities__cloud--near-a'),
        expect.stringContaining('battle-entities__cloud--near-b'),
      ]),
    )
    expect(container.querySelector('.battle-entity__player-core')).not.toBeInTheDocument()
    expect(container.querySelector('.battle-entity__enemy-core')).not.toBeInTheDocument()
    expect(container.querySelector('.battle-entities__arena')).not.toBeInTheDocument()
  })
})
