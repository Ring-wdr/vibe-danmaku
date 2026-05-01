import { describe, expect, it } from 'vitest'

import { createStageDefinition } from '../content/stage1'
import { createBattleRuntime } from './battleRuntime'
import type { BulletPatternConfig, StageDefinition } from '../types'

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

function createPatternStage(pattern: BulletPatternConfig): StageDefinition {
  const stage = createStageDefinition('normal')

  return {
    ...stage,
    duration: 999,
    waves: [
      {
        ...stage.waves[0]!,
        id: `pattern-${pattern.shape}`,
        startAt: 0,
        count: 1,
        hp: 999,
        speed: 0.78,
        pattern,
      },
    ],
    boss: {
      ...stage.boss,
      startAt: 999,
    },
  }
}

describe('createBattleRuntime', () => {
  it('lets the player reach wider side lanes while dragging', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createStageDefinition('normal'),
    })

    runtime.beginDrag({ x: 0, z: -0.85 })
    runtime.moveDrag({ x: 9, z: 0.8 })
    runtime.update(0.016)

    expect(runtime.getSnapshot().player.position.x).toBe(3.85)

    runtime.moveDrag({ x: -9, z: 0.8 })
    runtime.update(0.016)

    const snapshot = runtime.getSnapshot()

    expect(snapshot.player.position.x).toBe(-3.85)
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
    const stage = createImmediateWaveStage()
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage,
    })

    runtime.update(0.016)

    const enemy = runtime.getSnapshot().enemies[0]
    expect(enemy?.position.z).toBeGreaterThan(3.2)
    expect(enemy?.hitRadius).toBe(stage.waves[0]?.hitRadius)
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

describe('regular enemy bullet patterns', () => {
  it('aims needle bullets toward the player lane', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createPatternStage({
        shape: 'needle',
        count: 1,
        interval: 999,
        speed: 2,
        spread: 0,
        life: 5,
        aim: 'player',
      }),
    })

    runtime.beginDrag({ x: 2.5, z: -1.85 })
    runtime.update(2)

    const enemyBullets = runtime
      .getSnapshot()
      .bullets.filter((bullet) => bullet.source === 'enemy')
    expect(enemyBullets.length).toBe(1)
    expect(enemyBullets[0]?.position.x).toBeGreaterThan(0.4)
    expect(Math.max(...enemyBullets.map((bullet) => bullet.glow))).toBeGreaterThan(1.1)
  })

  it('creates secondary bullets from split patterns', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createPatternStage({
        shape: 'split',
        count: 2,
        interval: 999,
        speed: 1.2,
        spread: 0.55,
        life: 6,
        split: { delay: 0.2, count: 2, speedMultiplier: 0.75 },
      }),
    })

    for (let index = 0; index < 15; index += 1) {
      runtime.update(0.1)
    }
    const beforeSplit = runtime
      .getSnapshot()
      .bullets.filter((bullet) => bullet.source === 'enemy').length
    runtime.update(0.25)
    const afterSplit = runtime
      .getSnapshot()
      .bullets.filter((bullet) => bullet.source === 'enemy').length

    expect(afterSplit).toBeGreaterThan(beforeSplit)
  })

  it('keeps mine bullets slower and larger than needle bullets', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createPatternStage({
        shape: 'mine',
        count: 3,
        interval: 999,
        speed: 0.45,
        spread: 0.8,
        life: 6,
      }),
    })

    runtime.update(2)

    const enemyBullets = runtime
      .getSnapshot()
      .bullets.filter((bullet) => bullet.source === 'enemy')
    expect(enemyBullets.length).toBe(3)
    expect(Math.min(...enemyBullets.map((bullet) => bullet.radius))).toBeGreaterThan(
      0.13,
    )
  })

  it('adds horizontal variation to wave bullets over time', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createPatternStage({
        shape: 'wave',
        count: 1,
        interval: 999,
        speed: 1,
        spread: 0,
        life: 6,
        wave: { amplitude: 0.55, frequency: 2.4 },
      }),
    })

    runtime.update(2)
    const firstX = runtime
      .getSnapshot()
      .bullets.find((bullet) => bullet.source === 'enemy')?.position.x
    runtime.update(0.4)
    const secondX = runtime
      .getSnapshot()
      .bullets.find((bullet) => bullet.source === 'enemy')?.position.x

    expect(firstX).toBeDefined()
    expect(secondX).toBeDefined()
    expect(Math.abs(secondX! - firstX!)).toBeGreaterThan(0.02)
  })
})
