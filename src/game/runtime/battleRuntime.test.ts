import { describe, expect, it } from 'vitest'

import { createStageDefinition } from '../content/stage1'
import { createBattleRuntime } from './battleRuntime'

describe('createBattleRuntime', () => {
  it('keeps the player inside the lower arena band while dragging', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createStageDefinition('normal'),
    })

    runtime.beginDrag({ x: 0, z: -0.85 })
    runtime.moveDrag({ x: 9, z: 0.8 })
    runtime.update(0.016)

    const snapshot = runtime.getSnapshot()

    expect(snapshot.player.position.x).toBeLessThanOrEqual(2.8)
    expect(snapshot.player.position.x).toBeGreaterThanOrEqual(-2.8)
    expect(snapshot.player.position.z).toBeLessThanOrEqual(-0.45)
    expect(snapshot.player.position.z).toBeGreaterThanOrEqual(-2.6)
  })

  it('applies invulnerability frames after taking a hit', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createStageDefinition('normal'),
    })

    runtime.registerPlayerHit()
    runtime.registerPlayerHit()

    expect(runtime.getSnapshot().player.hp).toBe(2)

    runtime.update(1)
    runtime.registerPlayerHit()

    expect(runtime.getSnapshot().player.hp).toBe(1)
  })

  it('keeps auto fire running during drag movement', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createStageDefinition('normal'),
    })

    runtime.beginDrag({ x: 0, z: -1.8 })
    runtime.moveDrag({ x: 0.8, z: -1.6 })
    runtime.update(0.45)

    expect(runtime.getSnapshot().playerShots).toBeGreaterThan(0)
  })
})
