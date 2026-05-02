import { describe, expect, it } from 'vitest'

import { lyraAerCharacter } from '../content/characters'
import { createStageDefinition } from '../content/stage1'
import { createBattleRuntime } from './battleRuntime'
import type {
  BulletPatternConfig,
  CharacterDefinition,
  Difficulty,
  EnemyWave,
  SpecialSlotId,
  StageDefinition,
  StageEvent,
} from '../types'

const beamLance: SpecialSlotId = 'beam-lance'

const testPilot: CharacterDefinition = {
  ...lyraAerCharacter,
  id: 'test-pilot',
  name: 'Test Pilot',
  title: 'Runtime Fixture',
  moveRadius: {
    x: 1.25,
    minZ: -2.4,
    maxZ: -1.2,
  },
  shot: {
    interval: 0.5,
    speed: 6.2,
    power: 99,
  },
}

function createRuntime(options?: {
  difficulty?: Difficulty
  stage?: StageDefinition
  character?: CharacterDefinition
  invincible?: boolean
}) {
  const difficulty = options?.difficulty ?? 'normal'

  return createBattleRuntime({
    difficulty,
    stage: options?.stage ?? createStageDefinition(difficulty),
    character: options?.character ?? lyraAerCharacter,
    invincible: options?.invincible,
  })
}

function getFirstWave(stage: StageDefinition): EnemyWave {
  const action = stage.events
    ?.flatMap((event) => event.actions)
    .find((candidate) => candidate.type === 'spawnWave')

  if (!action || action.type !== 'spawnWave') {
    throw new Error('Expected stage fixture to include a spawnWave event')
  }

  return action.wave
}

function createWaveEvent(
  id: string,
  trigger: StageEvent['trigger'],
  wave: EnemyWave,
  groupKind?: 'wave' | 'summon',
): StageEvent {
  return {
    id,
    trigger,
    actions: [{ type: 'spawnWave', wave, groupKind }],
  }
}

function createBossEvent(
  id: string,
  trigger: StageEvent['trigger'],
  boss: StageDefinition['boss'],
  role: 'midboss' | 'final',
): StageEvent {
  return {
    id,
    trigger,
    actions: [{ type: 'spawnBoss', boss, role }],
  }
}

function createVictoryEvent(
  id: string,
  trigger: StageEvent['trigger'],
): StageEvent {
  return {
    id,
    trigger,
    actions: [{ type: 'finishStage', outcome: 'victory' }],
  }
}

function createEnemyBulletCleanupStage(): StageDefinition {
  const stage = createStageDefinition('normal', { fastStage: true })
  const boss = {
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
  } satisfies StageDefinition['boss']

  return {
    ...stage,
    duration: 999,
    waves: [],
    boss,
    events: [createBossEvent('cleanup-boss', { type: 'time', at: 0 }, boss, 'final')],
  }
}

function createImmediateWaveStage(): StageDefinition {
  const stage = createStageDefinition('normal')
  const wave = {
    ...stage.waves[0]!,
    startAt: 0,
    count: 1,
  }

  return {
    ...stage,
    waves: [wave],
    boss: {
      ...stage.boss,
      startAt: 999,
    },
    events: [createWaveEvent('immediate-wave', { type: 'time', at: 0 }, wave)],
  }
}

function createPatternStage(pattern: BulletPatternConfig): StageDefinition {
  const stage = createStageDefinition('normal')
  const wave = {
    ...stage.waves[0]!,
    id: `pattern-${pattern.shape}`,
    startAt: 0,
    count: 1,
    hp: 999,
    speed: 0.78,
    pattern,
  }

  return {
    ...stage,
    duration: 999,
    waves: [wave],
    boss: {
      ...stage.boss,
      startAt: 999,
    },
    events: [createWaveEvent(`${wave.id}-event`, { type: 'time', at: 0 }, wave)],
  }
}

function createSpecialTestStage(): StageDefinition {
  const stage = createStageDefinition('normal')
  const wave = {
    ...stage.waves[0]!,
    id: 'special-target',
    startAt: 0,
    count: 1,
    hp: 32,
    speed: 0,
    pattern: {
      shape: 'fan',
      count: 3,
      interval: 999,
      speed: 0.5,
      spread: 0.5,
      life: 4,
    },
  } satisfies EnemyWave
  const boss = {
    ...stage.boss,
    startAt: 0.2,
    hp: 240,
  }

  return {
    ...stage,
    duration: 999,
    waves: [wave],
    boss,
    events: [
      createWaveEvent('special-target-event', { type: 'time', at: 0 }, wave),
      createBossEvent('special-boss-event', { type: 'time', at: 0.2 }, boss, 'final'),
    ],
  }
}

function createSpecialChargeBonusStage(): StageDefinition {
  const stage = createStageDefinition('normal')
  const wave = {
    ...stage.waves[0]!,
    id: 'charge-bonus-target',
    startAt: 0,
    count: 1,
    hp: 1,
    speed: 0,
    pattern: {
      shape: 'fan',
      count: 3,
      interval: 999,
      speed: 0.5,
      spread: 0.5,
      life: 4,
    },
  } satisfies EnemyWave

  return {
    ...stage,
    duration: 999,
    waves: [wave],
    boss: {
      ...stage.boss,
      startAt: 999,
    },
    events: [createWaveEvent('charge-bonus-event', { type: 'time', at: 0 }, wave)],
  }
}

function createMidbossGateStage(): StageDefinition {
  const stage = createStageDefinition('normal')
  const beforeGate = {
    ...stage.waves[0]!,
    id: 'before-gate',
    startAt: 0,
    count: 1,
    hp: 999,
  }
  const afterGate = {
    ...stage.waves[1]!,
    id: 'after-gate',
    startAt: 0.1,
    count: 1,
    hp: 99999,
  }
  const midboss = {
    ...stage.boss,
    id: 'test-midboss',
    gateAfterWaveIndex: 0,
    startAt: 0.05,
    hp: 240,
    phases: [
      {
        id: 'midboss-test-phase',
        threshold: 0,
        label: 'Midboss Test',
        supportLaser: false,
        pattern: {
          shape: 'fan',
          count: 3,
          interval: 999,
          speed: 0.6,
          spread: 0.5,
          life: 4,
        },
      },
    ],
  } satisfies NonNullable<StageDefinition['midboss']>
  const boss = { ...stage.boss, startAt: 999 }

  return {
    ...stage,
    duration: 999,
    waves: [beforeGate, afterGate],
    midboss,
    boss,
    events: [
      createWaveEvent('before-gate-event', { type: 'time', at: 0 }, beforeGate),
      createBossEvent('midboss-event', { type: 'time', at: 0.05 }, midboss, 'midboss'),
      createWaveEvent(
        'after-gate-event',
        { type: 'afterDefeated', target: midboss.id, delay: 0.1 },
        afterGate,
      ),
    ],
  }
}

const midbossSlayerPilot: CharacterDefinition = {
  ...testPilot,
  id: 'midboss-slayer',
  shot: {
    interval: 0.18,
    speed: 24,
    power: 500,
  },
}

function advanceWhileBossActive(
  runtime: ReturnType<typeof createRuntime>,
  bossId: string,
) {
  for (let index = 0; index < 240; index += 1) {
    if (runtime.getSnapshot().boss?.id !== bossId) {
      return
    }

    runtime.update(0.05)
  }
}

function advanceUntilResult(
  runtime: ReturnType<typeof createRuntime>,
  options: { step?: number; maxSteps?: number } = {},
) {
  const step = options.step ?? 0.1
  const maxSteps = options.maxSteps ?? 200

  for (let index = 0; index < maxSteps; index += 1) {
    const result = runtime.getSnapshot().result
    if (result) {
      return result
    }

    runtime.update(step)
  }

  return runtime.getSnapshot().result
}

describe('createBattleRuntime', () => {
  it('uses the injected character movement radius while dragging', () => {
    const runtime = createRuntime({ character: testPilot })

    runtime.beginDrag({ x: 9, z: 0.8 })
    runtime.update(0.016)

    expect(runtime.getSnapshot().player.position).toEqual({
      x: 1.25,
      z: -1.2,
    })

    runtime.moveDrag({ x: -9, z: -9 })
    runtime.update(0.016)

    expect(runtime.getSnapshot().player.position).toEqual({
      x: -1.25,
      z: -2.4,
    })
  })

  it('uses the injected character shot cadence for auto fire', () => {
    const runtime = createRuntime({ character: testPilot })

    runtime.update(0.49)
    expect(runtime.getSnapshot().playerShots).toBe(1)

    runtime.update(0.49)
    expect(runtime.getSnapshot().playerShots).toBe(1)

    runtime.update(0.02)
    expect(runtime.getSnapshot().playerShots).toBe(2)
  })

  it('lets the player reach wider side lanes while dragging', () => {
    const runtime = createRuntime()

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
    const runtime = createRuntime()

    runtime.beginDrag({ x: 0, z: -3.15 })
    runtime.update(0.016)

    expect(runtime.getSnapshot().player.position.z).toBe(-3.15)
  })

  it('applies invulnerability frames after taking a hit', () => {
    const runtime = createRuntime()

    runtime.registerPlayerHit()
    runtime.registerPlayerHit()

    expect(runtime.getSnapshot().player.hp).toBe(2)

    runtime.update(1)
    runtime.registerPlayerHit()

    expect(runtime.getSnapshot().player.hp).toBe(1)
  })

  it('keeps auto fire running during drag movement', () => {
    const runtime = createRuntime()

    runtime.beginDrag({ x: 0, z: -1.8 })
    runtime.moveDrag({ x: 0.8, z: -1.6 })
    runtime.update(0.45)

    expect(runtime.getSnapshot().playerShots).toBeGreaterThan(0)
  })

  it('spawns enemies above the visible arena before they drift into view', () => {
    const stage = createImmediateWaveStage()
    const runtime = createRuntime({ stage })

    runtime.update(0.016)

    const enemy = runtime.getSnapshot().enemies[0]
    expect(enemy?.position.z).toBeGreaterThan(3.2)
    expect(enemy?.hitRadius).toBe(getFirstWave(stage).hitRadius)
  })

  it('keeps wave enemies from firing immediately while they are far offscreen', () => {
    const runtime = createRuntime({ stage: createImmediateWaveStage() })

    runtime.update(0.6)

    expect(
      runtime.getSnapshot().bullets.some((bullet) => bullet.source === 'enemy'),
    ).toBe(false)
  })

  it('starts wave enemy fire while enemies are entering from the upper edge', () => {
    const runtime = createRuntime({ stage: createImmediateWaveStage() })

    runtime.update(2)

    const snapshot = runtime.getSnapshot()
    expect(snapshot.enemies[0]?.position.z).toBeGreaterThan(3.2)
    expect(snapshot.bullets.some((bullet) => bullet.source === 'enemy')).toBe(true)
  })

  it('lets enemy bullets leave the viewport before cleaning them up after a grace period', () => {
    const runtime = createRuntime({ stage: createEnemyBulletCleanupStage() })

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

describe('stage event timeline runtime', () => {
  it('fires afterResolved after a fly-through enemy escapes the viewport and spawns the next wave', () => {
    const baseStage = createStageDefinition('normal')
    const firstWave = {
      ...baseStage.waves[0]!,
      id: 'escape-first',
      startAt: 0,
      count: 1,
      hp: 99999,
      speed: 18,
      movement: { type: 'flyThrough', path: 'helix', speed: 18 },
      resolution: { type: 'allInactive' },
    } satisfies EnemyWave
    const secondWave = {
      ...baseStage.waves[1]!,
      id: 'after-escape',
      startAt: 999,
      count: 1,
      hp: 99999,
      speed: 0,
      movement: { type: 'flyThrough', path: 'helix', speed: 0 },
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: {
        ...baseStage,
        duration: 999,
        waves: [],
        boss: { ...baseStage.boss, startAt: 999 },
        events: [
          createWaveEvent('escape-first-event', { type: 'time', at: 0 }, firstWave),
          createWaveEvent(
            'after-escape-event',
            { type: 'afterResolved', target: firstWave.id, delay: 0.05 },
            secondWave,
          ),
        ],
      },
      character: testPilot,
    })

    runtime.update(0.01)
    expect(runtime.getSnapshot().enemies.some((enemy) => enemy.waveId === firstWave.id)).toBe(
      true,
    )

    for (let index = 0; index < 12; index += 1) {
      runtime.update(0.1)
    }

    const snapshot = runtime.getSnapshot()
    expect(snapshot.enemies.some((enemy) => enemy.waveId === firstWave.id)).toBe(false)
    expect(snapshot.enemies.some((enemy) => enemy.waveId === secondWave.id)).toBe(true)
  })

  it('does not fire afterDefeated when the target wave only escapes', () => {
    const baseStage = createStageDefinition('normal')
    const escapingWave = {
      ...baseStage.waves[0]!,
      id: 'escaped-not-defeated',
      startAt: 0,
      count: 1,
      hp: 99999,
      speed: 18,
      movement: { type: 'flyThrough', path: 'helix', speed: 18 },
      resolution: { type: 'allInactive' },
    } satisfies EnemyWave
    const blockedWave = {
      ...baseStage.waves[1]!,
      id: 'blocked-after-defeated',
      startAt: 999,
      count: 1,
      hp: 99999,
      speed: 0,
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: {
        ...baseStage,
        duration: 999,
        waves: [],
        boss: { ...baseStage.boss, startAt: 999 },
        events: [
          createWaveEvent('escaped-not-defeated-event', { type: 'time', at: 0 }, escapingWave),
          createWaveEvent(
            'blocked-after-defeated-event',
            { type: 'afterDefeated', target: escapingWave.id, delay: 0.05 },
            blockedWave,
          ),
        ],
      },
      character: testPilot,
    })

    for (let index = 0; index < 20; index += 1) {
      runtime.update(0.1)
    }

    const snapshot = runtime.getSnapshot()
    expect(snapshot.enemies.some((enemy) => enemy.waveId === escapingWave.id)).toBe(false)
    expect(snapshot.enemies.some((enemy) => enemy.waveId === blockedWave.id)).toBe(false)
  })

  it('keeps repeated interval summons with the same wave id as distinct active groups', () => {
    const baseStage = createStageDefinition('normal')
    const boss = {
      ...baseStage.boss,
      id: 'interval-anchor',
      hp: 99999,
      phases: [
        {
          ...baseStage.boss.phases[0]!,
          id: 'interval-anchor-phase',
          pattern: {
            ...baseStage.boss.phases[0]!.pattern,
            interval: 999,
          },
        },
      ],
    } satisfies StageDefinition['boss']
    const summonWave = {
      ...baseStage.waves[0]!,
      id: 'repeat-summon',
      count: 1,
      hp: 99999,
      speed: 0,
      movement: { type: 'flyThrough', path: 'helix', speed: 0 },
      resolution: { type: 'timeout', seconds: 0.25, then: 'forceEscape' },
    } satisfies EnemyWave
    const markerWave = {
      ...baseStage.waves[1]!,
      id: 'repeat-summon-marker',
      count: 1,
      hp: 99999,
      speed: 0,
      movement: { type: 'flyThrough', path: 'helix', speed: 0 },
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: {
        ...baseStage,
        duration: 999,
        waves: [],
        boss,
        events: [
          createBossEvent('interval-anchor-event', { type: 'time', at: 0 }, boss, 'final'),
          createWaveEvent(
            'repeat-summon-interval',
            {
              type: 'interval',
              every: 0.1,
              while: { type: 'bossActive', bossId: boss.id },
            },
            summonWave,
            'summon',
          ),
          createWaveEvent(
            'repeat-summon-marker-event',
            { type: 'afterResolved', target: summonWave.id, delay: 0 },
            markerWave,
          ),
        ],
      },
      character: testPilot,
    })

    for (let index = 0; index < 6; index += 1) {
      runtime.update(0.1)
    }

    const snapshot = runtime.getSnapshot()

    expect(snapshot.enemies.filter((enemy) => enemy.waveId === summonWave.id).length).toBeGreaterThan(
      1,
    )
    expect(snapshot.enemies.some((enemy) => enemy.waveId === markerWave.id)).toBe(true)
  })

  it('fires afterDefeated from the defeated timestamp before timeout resolution', () => {
    const baseStage = createStageDefinition('normal')
    const timeoutWave = {
      ...baseStage.waves[0]!,
      id: 'defeated-before-timeout',
      count: 1,
      hp: 1,
      speed: 0,
      movement: {
        type: 'enterAndStrafe',
        entrySpeed: 48,
        holdZ: 0,
        strafeSpeed: 0,
        strafeRange: 0,
      },
      resolution: { type: 'timeout', seconds: 5, then: 'resolve' },
    } satisfies EnemyWave
    const markerWave = {
      ...baseStage.waves[1]!,
      id: 'defeated-before-timeout-marker',
      count: 1,
      hp: 99999,
      speed: 0,
      movement: { type: 'flyThrough', path: 'helix', speed: 0 },
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: {
        ...baseStage,
        duration: 999,
        waves: [],
        boss: { ...baseStage.boss, startAt: 999 },
        events: [
          createWaveEvent('timeout-wave-event', { type: 'time', at: 0 }, timeoutWave),
          createWaveEvent(
            'timeout-wave-defeated-event',
            { type: 'afterDefeated', target: timeoutWave.id, delay: 0.15 },
            markerWave,
          ),
        ],
      },
      character: midbossSlayerPilot,
    })

    for (let index = 0; index < 60; index += 1) {
      runtime.update(0.02)
    }

    const snapshot = runtime.getSnapshot()

    expect(snapshot.elapsed).toBeLessThan(5)
    expect(snapshot.enemies.some((enemy) => enemy.waveId === timeoutWave.id)).toBe(false)
    expect(snapshot.enemies.some((enemy) => enemy.waveId === markerWave.id)).toBe(true)
  })
})

describe('midboss gate runtime', () => {
  it('blocks post-gate waves while the midboss is alive', () => {
    const runtime = createRuntime({ stage: createMidbossGateStage() })

    runtime.update(0.06)
    runtime.update(0.05)

    const snapshot = runtime.getSnapshot()

    expect(snapshot.boss?.id).toBe('test-midboss')
    expect(snapshot.enemies).toHaveLength(1)
  })

  it('resumes post-gate waves after the midboss is defeated', () => {
    const runtime = createRuntime({
      stage: createMidbossGateStage(),
      character: midbossSlayerPilot,
    })

    runtime.update(0.11)

    expect(runtime.getSnapshot().boss?.id).toBe('test-midboss')

    advanceWhileBossActive(runtime, 'test-midboss')
    runtime.update(0.1)

    const snapshot = runtime.getSnapshot()

    expect(snapshot.result).toBeNull()
    expect(snapshot.enemies.some((enemy) => enemy.waveId === 'after-gate')).toBe(true)
  })

  it('does not set a victory result when the midboss is defeated', () => {
    const runtime = createRuntime({
      stage: createMidbossGateStage(),
      character: midbossSlayerPilot,
    })

    runtime.update(0.11)

    expect(runtime.getSnapshot().boss?.id).toBe('test-midboss')

    advanceWhileBossActive(runtime, 'test-midboss')

    const snapshot = runtime.getSnapshot()

    expect(snapshot.boss).toBeNull()
    expect(snapshot.result).toBeNull()
  })

  it('does not turn midboss defeat into timeout victory after stage duration', () => {
    const baseStage = createMidbossGateStage()
    const midboss = {
      ...baseStage.midboss!,
      hp: 2200,
    }
    const runtime = createRuntime({
      stage: {
        ...baseStage,
        duration: 0.12,
        waves: [],
        boss: {
          ...baseStage.boss,
          startAt: 10,
        },
        events: [
          createBossEvent('midboss-event', { type: 'time', at: 0.05 }, midboss, 'midboss'),
        ],
      },
      character: midbossSlayerPilot,
    })

    runtime.update(0.13)

    expect(runtime.getSnapshot().boss?.id).toBe('test-midboss')

    advanceWhileBossActive(runtime, 'test-midboss')

    const snapshot = runtime.getSnapshot()

    expect(snapshot.boss).toBeNull()
    expect(snapshot.elapsed).toBeGreaterThanOrEqual(snapshot.duration)
    expect(snapshot.result).toBeNull()
  })

  it('waits for the afterDefeated delay before resuming post-gate waves', () => {
    const baseStage = createMidbossGateStage()
    const beforeGate = { ...baseStage.waves[0]!, id: 'before-gate', startAt: 0, count: 1 }
    const afterGate = {
      ...baseStage.waves[1]!,
      id: 'after-gate',
      startAt: 999,
      count: 1,
      hp: 99999,
    }
    const midboss = {
      ...baseStage.midboss!,
      hp: 2200,
      startAt: 0.05,
    }
    const stage = {
      ...baseStage,
      waves: [beforeGate, afterGate],
      midboss,
      boss: {
        ...baseStage.boss,
        startAt: 0.3,
      },
      events: [
        createWaveEvent('before-gate-event', { type: 'time', at: 0 }, beforeGate),
        createBossEvent('midboss-event', { type: 'time', at: 0.05 }, midboss, 'midboss'),
        createWaveEvent(
          'after-gate-event',
          { type: 'afterDefeated', target: midboss.id, delay: 0.2 },
          afterGate,
        ),
      ],
    }
    const runtime = createRuntime({ stage, character: midbossSlayerPilot })

    runtime.update(0.4)

    expect(runtime.getSnapshot().boss?.id).toBe('test-midboss')
    expect(runtime.getSnapshot().enemies.some((enemy) => enemy.waveId === 'after-gate')).toBe(
      false,
    )

    advanceWhileBossActive(runtime, 'test-midboss')

    let snapshot = runtime.getSnapshot()
    expect(snapshot.boss).toBeNull()
    expect(snapshot.enemies.some((enemy) => enemy.waveId === 'after-gate')).toBe(false)

    runtime.update(0.1)

    snapshot = runtime.getSnapshot()
    expect(snapshot.boss).toBeNull()
    expect(snapshot.enemies.some((enemy) => enemy.waveId === 'after-gate')).toBe(false)

    runtime.update(0.11)

    snapshot = runtime.getSnapshot()
    expect(snapshot.enemies.some((enemy) => enemy.waveId === 'after-gate')).toBe(true)
    expect(snapshot.boss).toBeNull()
  })

  it('sets a victory result only when the explicit final boss victory event fires', () => {
    const baseStage = createMidbossGateStage()
    const midboss = baseStage.midboss!
    const boss = {
      ...baseStage.boss,
      startAt: 0.5,
      hp: 240,
    }
    const stage = {
      ...baseStage,
      waves: [],
      boss,
      events: [
        createBossEvent('midboss-event', { type: 'time', at: 0.05 }, midboss, 'midboss'),
        createBossEvent(
          'final-boss-event',
          { type: 'afterDefeated', target: midboss.id, delay: 0.5 },
          boss,
          'final',
        ),
        createVictoryEvent('final-victory-event', {
          type: 'afterDefeated',
          target: boss.id,
          delay: 0.15,
        }),
      ],
    }
    const runtime = createRuntime({ stage, character: midbossSlayerPilot })

    runtime.update(0.11)

    expect(runtime.getSnapshot().boss?.id).toBe('test-midboss')

    advanceWhileBossActive(runtime, 'test-midboss')

    runtime.update(0.5)

    expect(runtime.getSnapshot().boss?.id).toBe(stage.boss.id)

    advanceWhileBossActive(runtime, stage.boss.id)

    let snapshot = runtime.getSnapshot()
    expect(snapshot.boss).toBeNull()
    expect(snapshot.result).toBeNull()

    runtime.update(0.1)
    snapshot = runtime.getSnapshot()
    expect(snapshot.result).toBeNull()

    const result = advanceUntilResult(runtime, { step: 0.05 })

    expect(result).not.toBeNull()
    expect(result?.outcome).toBe('victory')
  })
})

describe('regular enemy bullet patterns', () => {
  it('aims needle bullets toward the player lane', () => {
    const runtime = createRuntime({
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
    const runtime = createRuntime({
      stage: createPatternStage({
        shape: 'split',
        count: 2,
        interval: 999,
        speed: 1.2,
        spread: 0.55,
        life: 6,
        split: { delay: 0.6, count: 2, speedMultiplier: 0.75 },
      }),
    })

    for (let index = 0; index < 15; index += 1) {
      runtime.update(0.1)
    }
    const beforeSplit = runtime
      .getSnapshot()
      .bullets.filter((bullet) => bullet.source === 'enemy').length
    runtime.update(0.65)
    const afterSplit = runtime
      .getSnapshot()
      .bullets.filter((bullet) => bullet.source === 'enemy').length

    expect(afterSplit).toBeGreaterThan(beforeSplit)
  })

  it('keeps mine bullets slower and larger than needle bullets', () => {
    const runtime = createRuntime({
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
    const runtime = createRuntime({
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

describe('special attack runtime', () => {
  it('charges most of the beam-lance gauge by boss arrival', () => {
    const stage = createStageDefinition('normal')
    const runtime = createRuntime({ stage })

    runtime.update(stage.boss.startAt)

    const slot = runtime
      .getSnapshot()
      .specialSlots.find((candidate) => candidate.id === beamLance)

    expect(slot?.charge).toBeGreaterThanOrEqual(91)
    expect(slot?.charge).toBeLessThanOrEqual(94)
    expect(slot?.ready).toBe(false)
  })

  it('does not activate beam-lance before full charge', () => {
    const runtime = createRuntime()

    expect(runtime.activateSpecial(beamLance)).toBe(false)
    expect(runtime.getSnapshot().specialBeam).toBeNull()
  })

  it('adds beam-lance charge when a regular enemy is defeated', () => {
    const stage = createSpecialChargeBonusStage()
    const runtime = createRuntime({ stage })

    for (let index = 0; index < 25; index += 1) {
      runtime.update(0.1)
    }

    const slot = runtime
      .getSnapshot()
      .specialSlots.find((candidate) => candidate.id === beamLance)
    const naturalChargeOnly = (92 / stage.boss.startAt) * 2.5

    expect(slot?.charge).toBeGreaterThan(naturalChargeOnly + 0.5)
  })

  it('activates beam-lance at full charge and resets that slot', () => {
    const stage = createStageDefinition('normal')
    const runtime = createRuntime({ stage })

    runtime.update(stage.boss.startAt + 9)

    expect(runtime.activateSpecial(beamLance)).toBe(true)

    const snapshot = runtime.getSnapshot()
    const slot = snapshot.specialSlots.find((candidate) => candidate.id === beamLance)

    expect(slot?.charge).toBe(0)
    expect(slot?.active).toBe(true)
    expect(slot?.activeRatio).toBe(1)
    expect(snapshot.specialBeam).toMatchObject({
      angle: 0,
      width: 0.42,
      length: 7,
    })
  })

  it('damages enemies inside the active beam strip and creates sparkles', () => {
    const runtime = createRuntime({ stage: createSpecialTestStage() })

    runtime.update(0.22)
    runtime.activateSpecial(beamLance)
    runtime.update(0.3)

    const snapshot = runtime.getSnapshot()

    expect(snapshot.enemies.length).toBe(0)
    expect(snapshot.sparkles.length).toBeGreaterThan(0)
    expect(snapshot.sparkles[0]?.position.x).toBeCloseTo(0, 1)
  })

  it('damages the boss while the boss intersects the active beam', () => {
    const runtime = createRuntime({ stage: createSpecialTestStage() })

    runtime.update(0.22)

    const before = runtime.getSnapshot().boss?.hpRatio
    runtime.activateSpecial(beamLance)
    runtime.update(0.5)
    const after = runtime.getSnapshot().boss?.hpRatio

    expect(before).toBeDefined()
    expect(after).toBeDefined()
    expect(after!).toBeLessThan(before!)
  })

  it('misses enemies outside the active beam width or behind the player', () => {
    const stage = createSpecialTestStage()
    const runtime = createRuntime({
      stage: {
        ...stage,
        waves: [
          {
            ...stage.waves[0]!,
            spacing: 0,
            count: 1,
          },
        ],
      },
    })

    runtime.beginDrag({ x: 3, z: -1.85 })
    runtime.update(0.22)
    runtime.activateSpecial(beamLance)
    runtime.update(0.3)

    expect(runtime.getSnapshot().enemies.length).toBe(1)
  })

  it('expires beam-lance sparkles after their lifetime', () => {
    const runtime = createRuntime({ stage: createSpecialTestStage() })

    runtime.update(0.22)
    runtime.activateSpecial(beamLance)
    runtime.update(0.3)

    expect(runtime.getSnapshot().sparkles.length).toBeGreaterThan(0)

    runtime.beginDrag({ x: 3, z: -1.85 })
    runtime.update(3)

    expect(runtime.getSnapshot().sparkles.length).toBe(0)
  })
})
