import { describe, expect, it } from 'vitest'

import { createStageDefinition } from '../content/stage1'
import { createBattleRuntime } from './battleRuntime'
import type { StageDefinition } from '../types'

function createEnemyBulletCleanupStage(): StageDefinition {
  const stage = createStageDefinition('normal', { fastStage: true })

  return {
    ...stage,
    duration: 999,
    waves: [],
    boss: {
      ...stage.boss,
      startAt: 0,
      phases: [
        {
          id: 'cleanup-test-ring',
          threshold: 0,
          label: 'Cleanup Test',
          supportLaser: false,
          pattern: {
            shape: 'ring',
            count: 4,
            interval: 999,
            speed: 4,
            spread: 0,
            life: 20,
          },
        },
      ],
    },
  }
}

function createImmediateWaveStage(): StageDefinition {
  const stage = createStageDefinition('normal')

  return {
    ...stage,
    waves: [
      {
        ...stage.waves[0]!,
        startAt: 0,
        count: 1,
      },
    ],
    boss: {
      ...stage.boss,
      startAt: 999,
    },
  }
}

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

    expect(snapshot.player.position.x).toBeLessThanOrEqual(3.3)
    expect(snapshot.player.position.x).toBeGreaterThanOrEqual(-3.3)
    expect(snapshot.player.position.z).toBeLessThanOrEqual(-0.45)
    expect(snapshot.player.position.z).toBeGreaterThanOrEqual(-3.15)
  })

  it('allows drag movement into the former bottom instruction area', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createStageDefinition('normal'),
    })

    runtime.beginDrag({ x: 0, z: -3.15 })
    runtime.update(0.016)

    expect(runtime.getSnapshot().player.position.z).toBe(-3.15)
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

  it('spawns enemies above the visible arena before they drift into view', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createImmediateWaveStage(),
    })

    runtime.update(0.016)

    const enemy = runtime.getSnapshot().enemies[0]
    expect(enemy?.position.z).toBeGreaterThan(3.2)
  })

  it('keeps wave enemies from firing immediately while they are far offscreen', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createImmediateWaveStage(),
    })

    runtime.update(0.6)

    expect(
      runtime.getSnapshot().bullets.some((bullet) => bullet.source === 'enemy'),
    ).toBe(false)
  })

  it('starts wave enemy fire while enemies are entering from the upper edge', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createImmediateWaveStage(),
    })

    runtime.update(2)

    const snapshot = runtime.getSnapshot()
    expect(snapshot.enemies[0]?.position.z).toBeGreaterThan(3.2)
    expect(snapshot.bullets.some((bullet) => bullet.source === 'enemy')).toBe(true)
  })

  it('lets enemy bullets leave the viewport before cleaning them up after a grace period', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createEnemyBulletCleanupStage(),
    })

    runtime.update(0.5)
    runtime.update(0.7)

    expect(
      runtime.getSnapshot().bullets.some(
        (bullet) => bullet.source === 'enemy' && Math.abs(bullet.position.x) > 3.4,
      ),
    ).toBe(true)

    runtime.update(1.3)

    expect(
      runtime.getSnapshot().bullets.some(
        (bullet) => bullet.source === 'enemy' && Math.abs(bullet.position.x) > 3.4,
      ),
    ).toBe(false)
  })
})
