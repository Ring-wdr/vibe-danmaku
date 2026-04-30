import { describe, expect, it } from 'vitest'

import { projectArenaPointToLayer } from './battlePresentation'

describe('projectArenaPointToLayer', () => {
  it('projects arena points into visible overlay percentages', () => {
    const player = projectArenaPointToLayer({ x: 0, z: -1.85 }, 'player')
    const enemy = projectArenaPointToLayer({ x: 0, z: 2.2 }, 'enemy')

    expect(player.left).toBeGreaterThan(35)
    expect(player.left).toBeLessThan(65)
    expect(player.top).toBeGreaterThan(45)
    expect(player.top).toBeLessThan(92)

    expect(enemy.top).toBeGreaterThan(24)
    expect(enemy.top).toBeLessThan(42)
  })
})
