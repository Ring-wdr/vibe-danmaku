import { describe, expect, it } from 'vitest'

import {
  lyraAerCharacter,
  reinaShiroganeCharacter,
  vesperNoireCharacter,
} from '../content/characters'
import { createStageDefinition } from '../content/stage1'
import { createBattleRuntime } from './battleRuntime'
import type {
  BossDefinition,
  BulletPatternConfig,
  CharacterDefinition,
  Difficulty,
  EnemyWave,
  SpecialSlotId,
  StageDefinition,
  StageEvent,
} from '../types'

const beamLance: SpecialSlotId = 'beam-lance'
const phantomOrb: SpecialSlotId = 'phantom-orb'

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

function getSpawnedWaves(stage: StageDefinition) {
  return stage.events.flatMap((event) =>
    event.actions.flatMap((action) => (action.type === 'spawnWave' ? [action.wave] : [])),
  )
}

function getWaveFromStage(stage: StageDefinition, index: number): EnemyWave {
  const wave = getSpawnedWaves(stage)[index]

  if (!wave) {
    throw new Error(`Expected stage fixture to include wave ${index}`)
  }

  return wave
}

function getFirstWave(stage: StageDefinition): EnemyWave {
  return getWaveFromStage(stage, 0)
}

function getBossFromStage(stage: StageDefinition, role: 'midboss' | 'final') {
  const action = stage.events
    .flatMap((event) => event.actions)
    .find((candidate) => candidate.type === 'spawnBoss' && candidate.role === role)

  if (!action || action.type !== 'spawnBoss') {
    throw new Error(`Expected stage fixture to include a ${role} boss event`)
  }

  return action.boss
}

function getFinalBossChargeReferenceTime(stage: StageDefinition) {
  const finalBossEvent = stage.events.find((event) =>
    event.actions.some((action) => action.type === 'spawnBoss' && action.role === 'final'),
  )

  return finalBossEvent?.trigger.type === 'time'
    ? finalBossEvent.trigger.at
    : finalBossEvent?.trigger.type === 'timeAfterDefeated'
      ? finalBossEvent.trigger.at
    : (stage.duration ?? 0) * 0.5
}

function createEventStage(
  baseStage: StageDefinition,
  events: StageEvent[],
  duration = 999,
): StageDefinition {
  return {
    ...baseStage,
    duration,
    events,
  }
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
  boss: BossDefinition,
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
    ...getBossFromStage(stage, 'final'),
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
  } satisfies BossDefinition

  return createEventStage(stage, [
    createBossEvent('cleanup-boss', { type: 'time', at: 0 }, boss, 'final'),
  ])
}

function createImmediateWaveStage(): StageDefinition {
  const stage = createStageDefinition('normal')
  const wave = {
    ...getFirstWave(stage),
    count: 1,
  }

  return createEventStage(stage, [
    createWaveEvent('immediate-wave', { type: 'time', at: 0 }, wave),
  ])
}

function createPowerupItemStage(waveCount = 4): StageDefinition {
  const stage = createStageDefinition('normal')
  const baseWave = {
    ...getFirstWave(stage),
    count: 0,
    hp: 1,
    movement: { type: 'flyThrough', path: 'helix', speed: 0 },
  } satisfies EnemyWave

  return createEventStage(
    stage,
    Array.from({ length: waveCount }, (_, index) =>
      createWaveEvent(
        `powerup-wave-${index}`,
        { type: 'time', at: index * 0.1 },
        {
          ...baseWave,
          id: `powerup-wave-${index}`,
        },
      ),
    ),
  )
}

function createPatternStage(pattern: BulletPatternConfig): StageDefinition {
  const stage = createStageDefinition('normal')
  const wave = {
    ...getFirstWave(stage),
    id: `pattern-${pattern.shape}`,
    count: 1,
    hp: 999,
    movement: { type: 'flyThrough', path: 'helix', speed: 0.78 },
    pattern,
  } satisfies EnemyWave

  return createEventStage(stage, [
    createWaveEvent(`${wave.id}-event`, { type: 'time', at: 0 }, wave),
  ])
}

function createSpecialTestStage(): StageDefinition {
  const stage = createStageDefinition('normal')
  const wave = {
    ...getFirstWave(stage),
    id: 'special-target',
    count: 1,
    hp: 32,
    movement: { type: 'flyThrough', path: 'helix', speed: 0 },
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
    ...getBossFromStage(stage, 'final'),
    hp: 240,
  }

  return createEventStage(stage, [
    createWaveEvent('special-target-event', { type: 'time', at: 0 }, wave),
    createBossEvent('special-boss-event', { type: 'time', at: 0.2 }, boss, 'final'),
  ])
}

function createSpecialChargeBonusStage(): StageDefinition {
  const stage = createStageDefinition('normal')
  const wave = {
    ...getFirstWave(stage),
    id: 'charge-bonus-target',
    count: 1,
    hp: 1,
    movement: { type: 'flyThrough', path: 'helix', speed: 0 },
    pattern: {
      shape: 'fan',
      count: 3,
      interval: 999,
      speed: 0.5,
      spread: 0.5,
      life: 4,
    },
  } satisfies EnemyWave

  return createEventStage(stage, [
    createWaveEvent('charge-bonus-event', { type: 'time', at: 0 }, wave),
  ])
}

function createEnergyOrbSpecialStage(): StageDefinition {
  const stage = createStageDefinition('normal')
  const boss = {
    ...getBossFromStage(stage, 'final'),
    hp: 1000,
    phases: [
      {
        id: 'energy-orb-test-phase',
        threshold: 0,
        label: 'Orb Target',
        supportLaser: false,
        pattern: {
          shape: 'ring',
          count: 10,
          interval: 999,
          speed: 0.65,
          spread: 0,
          life: 12,
        },
      },
    ],
  } satisfies BossDefinition

  return createEventStage(stage, [
    createBossEvent('energy-orb-boss-event', { type: 'time', at: 0 }, boss, 'final'),
  ])
}

function createEnemyHitFeedbackStage(): StageDefinition {
  const stage = createStageDefinition('normal')
  const wave = {
    ...getFirstWave(stage),
    id: 'hit-feedback-target',
    count: 1,
    hp: 99,
    movement: {
      type: 'enterAndStrafe',
      entrySpeed: 32,
      holdZ: -0.35,
      strafeSpeed: 0,
      strafeRange: 0,
    },
    pattern: {
      shape: 'fan',
      count: 3,
      interval: 999,
      speed: 0.5,
      spread: 0.5,
      life: 4,
    },
  } satisfies EnemyWave

  return createEventStage(stage, [
    createWaveEvent('hit-feedback-event', { type: 'time', at: 0 }, wave),
  ])
}

function createSingleHitComboStage(): StageDefinition {
  const stage = createStageDefinition('normal')
  const wave = {
    ...getFirstWave(stage),
    id: 'single-hit-combo-target',
    count: 1,
    hp: 1,
    movement: {
      type: 'enterAndStrafe',
      entrySpeed: 160,
      holdZ: -0.35,
      strafeSpeed: 0,
      strafeRange: 0,
    },
    pattern: {
      shape: 'fan',
      count: 0,
      interval: 999,
      speed: 0,
      spread: 0,
      life: 0,
    },
  } satisfies EnemyWave

  return createEventStage(stage, [
    createWaveEvent('single-hit-combo-event', { type: 'time', at: 0 }, wave),
  ])
}

function createBossComboStage(): StageDefinition {
  const stage = createStageDefinition('normal')
  const boss = {
    ...getBossFromStage(stage, 'final'),
    hp: 999,
    phases: [
      {
        id: 'combo-boss-phase',
        threshold: 0,
        label: 'Combo Boss',
        supportLaser: false,
        pattern: {
          shape: 'fan',
          count: 0,
          interval: 999,
          speed: 0,
          spread: 0,
          life: 0,
        },
      },
    ],
  } satisfies BossDefinition

  return createEventStage(stage, [
    createBossEvent('combo-boss-event', { type: 'time', at: 0 }, boss, 'final'),
  ])
}

function createEnemyDestructionFeedbackStage(): StageDefinition {
  const stage = createStageDefinition('normal')
  const wave = {
    ...getFirstWave(stage),
    id: 'destruction-feedback-target',
    count: 1,
    hp: 8,
    movement: { type: 'flyThrough', path: 'helix', speed: 0 },
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
    ...getBossFromStage(stage, 'final'),
    hp: 240,
  }

  return createEventStage(stage, [
    createWaveEvent('destruction-feedback-event', { type: 'time', at: 0 }, wave),
    createBossEvent('destruction-charge-boss-event', { type: 'time', at: 0.2 }, boss, 'final'),
  ])
}

function createMidbossGateStage(): StageDefinition {
  const stage = createStageDefinition('normal')
  const beforeGate = {
    ...getWaveFromStage(stage, 0),
    id: 'before-gate',
    count: 1,
    hp: 999,
  }
  const afterGate = {
    ...getWaveFromStage(stage, 1),
    id: 'after-gate',
    count: 1,
    hp: 99999,
  }
  const midboss = {
    ...getBossFromStage(stage, 'final'),
    id: 'test-midboss',
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
  } satisfies BossDefinition

  return createEventStage(stage, [
    createWaveEvent('before-gate-event', { type: 'time', at: 0 }, beforeGate),
    createBossEvent('midboss-event', { type: 'time', at: 0.05 }, midboss, 'midboss'),
    createWaveEvent(
      'after-gate-event',
      { type: 'afterDefeated', target: midboss.id, delay: 0.1 },
      afterGate,
    ),
  ])
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

const bossTriggerPilot: CharacterDefinition = {
  ...testPilot,
  id: 'boss-trigger-pilot',
  shot: {
    interval: 0.18,
    speed: 24,
    power: 80,
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

  it('uses the injected character max HP for player durability', () => {
    const runtime = createRuntime({
      character: {
        ...testPilot,
        maxHp: 4,
      },
    })

    expect(runtime.getSnapshot().player.hp).toBe(4)

    runtime.registerPlayerHit()

    expect(runtime.getSnapshot().player.hp).toBe(3)
  })

  it('fires Vesper side panel shots together with the primary shot', () => {
    const runtime = createRuntime({ character: vesperNoireCharacter })

    runtime.update(0.01)

    const playerBullets = runtime
      .getSnapshot()
      .bullets.filter((bullet) => bullet.source === 'player')
      .sort((a, b) => a.position.x - b.position.x)

    expect(playerBullets).toHaveLength(3)
    expect(playerBullets.map((bullet) => Number(bullet.position.x.toFixed(2)))).toEqual([
      -0.56,
      0,
      0.56,
    ])
    expect(playerBullets.map((bullet) => bullet.kind)).toEqual([
      'panel',
      'primary',
      'panel',
    ])
    expect(runtime.getSnapshot().playerShots).toBe(1)
  })

  it('fires only Reina central sword shots without launching the orbiting swords', () => {
    const contactStage: StageDefinition = {
      ...createStageDefinition('normal'),
      events: [
        {
          id: 'orbit-contact-wave',
          trigger: { type: 'time', at: 0 },
          once: true,
          actions: [
            {
              type: 'spawnWave',
              wave: {
                id: 'orbit-contact-wave',
                kind: 'brass-cloud-scout',
                archetype: 'scout',
                variant: 'brass-cloud-scout',
                atlasId: 'enemy-brass-cloud',
                frameId: 'scout',
                count: 3,
                spacing: 0.68,
                hp: 6,
                movement: {
                  type: 'enterAndStrafe',
                  entrySpeed: 120,
                  holdZ: -1.62,
                  strafeSpeed: 0,
                  strafeRange: 0,
                },
                resolution: { type: 'allInactive' },
                scale: 0.5,
                hitRadius: 0.32,
                pattern: {
                  shape: 'fan',
                  count: 0,
                  interval: 99,
                  speed: 0,
                  spread: 0,
                  life: 0,
                },
              },
            },
          ],
        },
      ],
    }
    const runtime = createRuntime({
      stage: contactStage,
      character: {
        ...reinaShiroganeCharacter,
        shot: {
          ...reinaShiroganeCharacter.shot,
          power: 0,
        },
      },
    })

    runtime.update(0.08)

    const snapshot = runtime.getSnapshot()
    const playerBullets = snapshot.bullets.filter((bullet) => bullet.source === 'player')

    expect(playerBullets).toHaveLength(1)
    expect(playerBullets[0]?.kind).toBe('sword')
  })

  it('lets Reina orbiting swords reach enemies outside the former tight halo', () => {
    const wideContactStage: StageDefinition = {
      ...createStageDefinition('normal'),
      events: [
        {
          id: 'wide-orbit-contact-wave',
          trigger: { type: 'time', at: 0 },
          once: true,
          actions: [
            {
              type: 'spawnWave',
              wave: {
                id: 'wide-orbit-contact-wave',
                kind: 'brass-cloud-scout',
                archetype: 'scout',
                variant: 'brass-cloud-scout',
                atlasId: 'enemy-brass-cloud',
                frameId: 'scout',
                count: 1,
                spacing: 0,
                hp: 4,
                movement: {
                  type: 'enterAndStrafe',
                  entrySpeed: 160,
                  holdZ: -1.63,
                  strafeSpeed: 0,
                  strafeRange: 0,
                },
                resolution: { type: 'allInactive' },
                scale: 0.5,
                hitRadius: 0.28,
                pattern: {
                  shape: 'fan',
                  count: 0,
                  interval: 99,
                  speed: 0,
                  spread: 0,
                  life: 0,
                },
              },
            },
          ],
        },
      ],
    }
    const runtime = createRuntime({
      stage: wideContactStage,
      character: {
        ...reinaShiroganeCharacter,
        shot: {
          ...reinaShiroganeCharacter.shot,
          power: 0,
        },
      },
    })

    runtime.beginDrag({ x: -2.2, z: -1.85 })
    runtime.update(0.05)

    expect(runtime.getSnapshot().enemies).toHaveLength(0)
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

  it('moves fly-through enemies at twice their authored movement speed', () => {
    const stage = createStageDefinition('normal')
    const wave = {
      ...getFirstWave(stage),
      id: 'double-speed-fly-through',
      count: 1,
      hp: 999,
      movement: { type: 'flyThrough', path: 'helix', speed: 1 },
      pattern: {
        shape: 'fan',
        count: 0,
        interval: 999,
        speed: 0,
        spread: 0,
        life: 0,
      },
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: createEventStage(stage, [
        createWaveEvent('double-speed-fly-through-event', { type: 'time', at: 0 }, wave),
      ]),
    })

    runtime.update(0.01)
    const initialZ = runtime.getSnapshot().enemies[0]?.position.z
    runtime.update(0.5)
    const nextZ = runtime.getSnapshot().enemies[0]?.position.z

    expect(initialZ).toBeDefined()
    expect(nextZ).toBeDefined()
    expect(initialZ! - nextZ!).toBeCloseTo(1, 5)
  })

  it('moves enter-and-strafe enemies at twice their authored movement speed', () => {
    const stage = createStageDefinition('normal')
    const wave = {
      ...getFirstWave(stage),
      id: 'double-speed-strafe',
      count: 1,
      hp: 999,
      movement: {
        type: 'enterAndStrafe',
        entrySpeed: 999,
        holdZ: 1,
        strafeSpeed: 1,
        strafeRange: 1,
      },
      pattern: {
        shape: 'fan',
        count: 0,
        interval: 999,
        speed: 0,
        spread: 0,
        life: 0,
      },
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: createEventStage(stage, [
        createWaveEvent('double-speed-strafe-event', { type: 'time', at: 0 }, wave),
      ]),
    })

    runtime.update(0.25)
    const enemy = runtime.getSnapshot().enemies[0]

    expect(enemy?.position.z).toBeCloseTo(1, 5)
    expect(enemy?.position.x).toBeCloseTo(Math.sin(0.5), 5)
  })

  it('keeps wave enemies from firing immediately while they are far offscreen', () => {
    const runtime = createRuntime({ stage: createImmediateWaveStage() })

    runtime.update(0.6)

    expect(
      runtime.getSnapshot().bullets.some((bullet) => bullet.source === 'enemy'),
    ).toBe(false)
  })

  it('marks a regular enemy with a short hit flash when a player shot connects', () => {
    const runtime = createRuntime({
      stage: createEnemyHitFeedbackStage(),
      character: {
        ...testPilot,
        shot: {
          interval: 0.12,
          speed: 24,
          power: 7,
        },
      },
    })

    let hitFlashRatio = 0
    for (let index = 0; index < 40; index += 1) {
      runtime.update(0.05)
      hitFlashRatio = Math.max(
        hitFlashRatio,
        runtime.getSnapshot().enemies[0]?.hitFlashRatio ?? 0,
      )
    }

    expect(hitFlashRatio).toBeGreaterThan(0)
  })

  it('adds score and extends combo when enemy hits land inside the combo window', () => {
    const runtime = createRuntime({
      stage: createEnemyHitFeedbackStage(),
      character: {
        ...testPilot,
        shot: {
          interval: 0.12,
          speed: 24,
          power: 1,
        },
      },
    })

    let snapshot = runtime.getSnapshot()
    for (let index = 0; index < 80; index += 1) {
      runtime.update(0.05)
      snapshot = runtime.getSnapshot()

      if (snapshot.combo >= 2) {
        break
      }
    }

    expect(snapshot.combo).toBeGreaterThanOrEqual(2)
    expect(snapshot.maxCombo).toBeGreaterThanOrEqual(2)
    expect(snapshot.score).toBeGreaterThanOrEqual(300)
  })

  it('expires the visible combo after 10 seconds without another enemy hit', () => {
    const runtime = createRuntime({
      stage: createSingleHitComboStage(),
      character: {
        ...testPilot,
        shot: {
          interval: 0.12,
          speed: 24,
          power: 1,
        },
      },
    })

    let snapshot = runtime.getSnapshot()
    for (let index = 0; index < 40; index += 1) {
      runtime.update(0.05)
      snapshot = runtime.getSnapshot()

      if (snapshot.combo === 1) {
        break
      }
    }

    expect(snapshot.combo).toBe(1)
    expect(snapshot.score).toBe(100)

    runtime.update(10.1)

    expect(runtime.getSnapshot().combo).toBe(0)
    expect(runtime.getSnapshot().maxCombo).toBe(1)
    expect(runtime.getSnapshot().score).toBe(100)
  })

  it('adds score and combo when player shots hit a boss', () => {
    const runtime = createRuntime({
      stage: createBossComboStage(),
      character: {
        ...testPilot,
        shot: {
          interval: 0.12,
          speed: 24,
          power: 1,
        },
      },
    })

    let snapshot = runtime.getSnapshot()
    for (let index = 0; index < 80; index += 1) {
      runtime.update(0.05)
      snapshot = runtime.getSnapshot()

      if (snapshot.combo >= 2) {
        break
      }
    }

    expect(snapshot.boss).not.toBeNull()
    expect(snapshot.combo).toBeGreaterThanOrEqual(2)
    expect(snapshot.maxCombo).toBeGreaterThanOrEqual(2)
    expect(snapshot.score).toBeGreaterThanOrEqual(300)
  })

  it('starts wave enemy fire while enemies are entering from the upper edge', () => {
    const runtime = createRuntime({ stage: createImmediateWaveStage() })

    runtime.update(1)

    const snapshot = runtime.getSnapshot()
    expect(snapshot.enemies[0]?.position.z).toBeGreaterThan(3.2)
    expect(snapshot.bullets.some((bullet) => bullet.source === 'enemy')).toBe(true)
  })

  it('drops a powerup item box after every fourth regular wave spawn', () => {
    const runtime = createRuntime({ stage: createPowerupItemStage() })

    runtime.update(0.31)

    const snapshot = runtime.getSnapshot() as ReturnType<typeof runtime.getSnapshot> & {
      itemDrops?: { itemId: string; position: { x: number; z: number } }[]
      playerPowerups?: { powerupLevel: number; attackMultiplier: number }
    }

    expect(snapshot.itemDrops).toEqual([
      expect.objectContaining({
        itemId: 'powerup',
        position: expect.objectContaining({
          z: expect.any(Number),
        }),
      }),
    ])
    expect(snapshot.itemDrops?.[0]?.position.z).toBeGreaterThan(3.2)
    expect(snapshot.playerPowerups).toEqual({
      powerupLevel: 0,
      attackMultiplier: 1,
    })
  })

  it('collects falling powerup boxes and caps attack power at level 3', () => {
    const runtime = createRuntime({
      stage: createPowerupItemStage(),
      character: {
        ...testPilot,
        shot: {
          ...testPilot.shot,
          interval: 999,
        },
      },
    })

    runtime.update(0.31)
    for (let index = 0; index < 4; index += 1) {
      runtime.update(0.5)
    }

    let snapshot = runtime.getSnapshot() as ReturnType<typeof runtime.getSnapshot> & {
      itemDrops?: { itemId: string }[]
      playerPowerups?: { powerupLevel: number; attackMultiplier: number }
    }

    expect(snapshot.itemDrops).toHaveLength(0)
    expect(snapshot.playerPowerups).toEqual({
      powerupLevel: 1,
      attackMultiplier: 1.2,
    })

    const cappedRuntime = createRuntime({
      stage: createPowerupItemStage(16),
      character: {
        ...testPilot,
        shot: {
          ...testPilot.shot,
          interval: 999,
        },
      },
    })

    for (let index = 0; index < 12; index += 1) {
      cappedRuntime.update(0.02)
      cappedRuntime.update(0.5)
    }

    snapshot = cappedRuntime.getSnapshot() as ReturnType<typeof cappedRuntime.getSnapshot> & {
      playerPowerups?: { powerupLevel: number; attackMultiplier: number }
    }

    expect(snapshot.playerPowerups).toEqual({
      powerupLevel: 3,
      attackMultiplier: 1.73,
    })

    for (let index = 0; index < 3; index += 1) {
      cappedRuntime.update(0.02)
      cappedRuntime.update(0.5)
    }

    snapshot = cappedRuntime.getSnapshot() as ReturnType<typeof cappedRuntime.getSnapshot> & {
      playerPowerups?: { powerupLevel: number; attackMultiplier: number }
    }

    expect(snapshot.playerPowerups).toEqual({
      powerupLevel: 3,
      attackMultiplier: 1.73,
    })
  })

  it('lets enemy bullets leave the viewport before cleaning them up after a grace period', () => {
    const runtime = createRuntime({ stage: createEnemyBulletCleanupStage() })

    runtime.update(0.5)
    runtime.update(0.3)

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
  it('stops evaluating the current tick after a finishStage event', () => {
    const baseStage = createStageDefinition('normal')
    const lateWave = {
      ...getFirstWave(baseStage),
      id: 'after-finish-spawn',
      count: 1,
      hp: 99999,
      movement: { type: 'flyThrough', path: 'helix', speed: 0 },
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: createEventStage(
        baseStage,
        [
          createVictoryEvent('same-tick-victory', { type: 'time', at: 0.01 }),
          createWaveEvent('same-tick-spawn', { type: 'time', at: 0.01 }, lateWave),
        ],
      ),
    })

    runtime.update(0.02)

    const snapshot = runtime.getSnapshot()

    expect(snapshot.result?.outcome).toBe('victory')
    expect(snapshot.enemies.some((enemy) => enemy.waveId === lateWave.id)).toBe(false)
  })

  it('fires afterResolved after a fly-through enemy escapes the viewport and spawns the next wave', () => {
    const baseStage = createStageDefinition('normal')
    const firstWave = {
      ...getWaveFromStage(baseStage, 0),
      id: 'escape-first',
      count: 1,
      hp: 99999,
      movement: { type: 'flyThrough', path: 'helix', speed: 18 },
      resolution: { type: 'allInactive' },
    } satisfies EnemyWave
    const secondWave = {
      ...getWaveFromStage(baseStage, 1),
      id: 'after-escape',
      count: 1,
      hp: 99999,
      movement: { type: 'flyThrough', path: 'helix', speed: 0 },
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: createEventStage(
        baseStage,
        [
          createWaveEvent('escape-first-event', { type: 'time', at: 0 }, firstWave),
          createWaveEvent(
            'after-escape-event',
            { type: 'afterResolved', target: firstWave.id, delay: 0.05 },
            secondWave,
          ),
        ],
      ),
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
      ...getWaveFromStage(baseStage, 0),
      id: 'escaped-not-defeated',
      count: 1,
      hp: 99999,
      movement: { type: 'flyThrough', path: 'helix', speed: 18 },
      resolution: { type: 'allInactive' },
    } satisfies EnemyWave
    const blockedWave = {
      ...getWaveFromStage(baseStage, 1),
      id: 'blocked-after-defeated',
      count: 1,
      hp: 99999,
      movement: { type: 'flyThrough', path: 'helix', speed: 0 },
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: createEventStage(
        baseStage,
        [
          createWaveEvent('escaped-not-defeated-event', { type: 'time', at: 0 }, escapingWave),
          createWaveEvent(
            'blocked-after-defeated-event',
            { type: 'afterDefeated', target: escapingWave.id, delay: 0.05 },
            blockedWave,
          ),
        ],
      ),
      character: testPilot,
    })

    for (let index = 0; index < 20; index += 1) {
      runtime.update(0.1)
    }

    const snapshot = runtime.getSnapshot()
    expect(snapshot.enemies.some((enemy) => enemy.waveId === escapingWave.id)).toBe(false)
    expect(snapshot.enemies.some((enemy) => enemy.waveId === blockedWave.id)).toBe(false)
  })

  it('fires timeAfterDefeated only after both the authored time and defeat delay pass', () => {
    const baseStage = createStageDefinition('normal')
    const anchorWave = {
      ...getWaveFromStage(baseStage, 0),
      id: 'zero-anchor',
      count: 0,
      resolution: { type: 'allDefeated' },
    } satisfies EnemyWave
    const markerWave = {
      ...getWaveFromStage(baseStage, 1),
      id: 'time-after-defeated-marker',
      count: 1,
      hp: 99999,
      movement: { type: 'flyThrough', path: 'helix', speed: 0 },
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: createEventStage(
        baseStage,
        [
          createWaveEvent('zero-anchor-event', { type: 'time', at: 0 }, anchorWave),
          createWaveEvent(
            'time-after-defeated-marker-event',
            {
              type: 'timeAfterDefeated',
              at: 1,
              target: anchorWave.id,
              delay: 0.4,
            },
            markerWave,
          ),
        ],
      ),
      character: testPilot,
    })

    runtime.update(0.01)
    runtime.update(0.8)

    expect(runtime.getSnapshot().enemies.some((enemy) => enemy.waveId === markerWave.id)).toBe(
      false,
    )

    runtime.update(0.2)

    expect(runtime.getSnapshot().enemies.some((enemy) => enemy.waveId === markerWave.id)).toBe(
      true,
    )
  })

  it('keeps repeated interval summons with the same wave id as distinct active groups', () => {
    const baseStage = createStageDefinition('normal')
    const baseBoss = getBossFromStage(baseStage, 'final')
    const boss = {
      ...baseBoss,
      id: 'interval-anchor',
      hp: 99999,
      phases: [
        {
          ...baseBoss.phases[0]!,
          id: 'interval-anchor-phase',
          pattern: {
            ...baseBoss.phases[0]!.pattern,
            interval: 999,
          },
        },
      ],
    } satisfies BossDefinition
    const summonWave = {
      ...getWaveFromStage(baseStage, 0),
      id: 'repeat-summon',
      count: 1,
      hp: 99999,
      movement: { type: 'flyThrough', path: 'helix', speed: 0 },
      resolution: { type: 'timeout', seconds: 0.25, then: 'forceEscape' },
    } satisfies EnemyWave
    const markerWave = {
      ...getWaveFromStage(baseStage, 1),
      id: 'repeat-summon-marker',
      count: 1,
      hp: 99999,
      movement: { type: 'flyThrough', path: 'helix', speed: 0 },
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: createEventStage(
        baseStage,
        [
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
      ),
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
      ...getWaveFromStage(baseStage, 0),
      id: 'defeated-before-timeout',
      count: 1,
      hp: 1,
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
      ...getWaveFromStage(baseStage, 1),
      id: 'defeated-before-timeout-marker',
      count: 1,
      hp: 99999,
      movement: { type: 'flyThrough', path: 'helix', speed: 0 },
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: createEventStage(
        baseStage,
        [
          createWaveEvent('timeout-wave-event', { type: 'time', at: 0 }, timeoutWave),
          createWaveEvent(
            'timeout-wave-defeated-event',
            { type: 'afterDefeated', target: timeoutWave.id, delay: 0.15 },
            markerWave,
          ),
        ],
      ),
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

  it('keeps enter-and-strafe enemies near their hold line', () => {
    const baseStage = createStageDefinition('normal')
    const strafeWave = {
      ...getWaveFromStage(baseStage, 0),
      id: 'hold-line-strafe',
      count: 1,
      hp: 99999,
      movement: {
        type: 'enterAndStrafe',
        entrySpeed: 5,
        holdZ: 1.2,
        strafeSpeed: 2,
        strafeRange: 1.6,
      },
      resolution: { type: 'allDefeated' },
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: createEventStage(baseStage, [
        createWaveEvent('hold-line-strafe-event', { type: 'time', at: 0 }, strafeWave),
      ]),
      character: testPilot,
    })

    runtime.update(1.2)

    const firstSnapshot = runtime.getSnapshot()
    const firstEnemy = firstSnapshot.enemies.find((enemy) => enemy.waveId === strafeWave.id)
    expect(firstEnemy?.position.z).toBeCloseTo(strafeWave.movement.holdZ, 5)

    runtime.update(0.8)

    const secondEnemy = runtime
      .getSnapshot()
      .enemies.find((enemy) => enemy.waveId === strafeWave.id)
    expect(secondEnemy?.position.z).toBeCloseTo(strafeWave.movement.holdZ, 5)
    expect(Math.abs(secondEnemy?.position.x ?? 0)).toBeLessThanOrEqual(
      strafeWave.movement.strafeRange,
    )
  })

  it('does not resolve allDefeated strafe waves while the guard is alive', () => {
    const baseStage = createStageDefinition('normal')
    const guardWave = {
      ...getWaveFromStage(baseStage, 0),
      id: 'alive-strafe-guard',
      count: 1,
      hp: 99999,
      movement: {
        type: 'enterAndStrafe',
        entrySpeed: 5,
        holdZ: 1.2,
        strafeSpeed: 2,
        strafeRange: 1.6,
      },
      resolution: { type: 'allDefeated' },
    } satisfies EnemyWave
    const blockedWave = {
      ...getWaveFromStage(baseStage, 1),
      id: 'blocked-by-alive-guard',
      count: 1,
      hp: 99999,
      movement: { type: 'flyThrough', path: 'helix', speed: 0 },
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: createEventStage(
        baseStage,
        [
          createWaveEvent('alive-strafe-guard-event', { type: 'time', at: 0 }, guardWave),
          createWaveEvent(
            'blocked-by-alive-guard-event',
            { type: 'afterResolved', target: guardWave.id, delay: 0 },
            blockedWave,
          ),
        ],
      ),
      character: testPilot,
    })

    for (let index = 0; index < 20; index += 1) {
      runtime.update(0.1)
    }

    const snapshot = runtime.getSnapshot()
    expect(snapshot.enemies.some((enemy) => enemy.waveId === guardWave.id)).toBe(true)
    expect(snapshot.enemies.some((enemy) => enemy.waveId === blockedWave.id)).toBe(false)
  })

  it('force-escapes timeout strafe waves so progression cannot hang', () => {
    const baseStage = createStageDefinition('normal')
    const strafeWave = {
      ...getWaveFromStage(baseStage, 0),
      id: 'timeout-strafe-escape',
      count: 1,
      hp: 99999,
      movement: {
        type: 'enterAndStrafe',
        entrySpeed: 5,
        holdZ: 1.2,
        strafeSpeed: 2,
        strafeRange: 1.6,
      },
      resolution: { type: 'timeout', seconds: 0.5, then: 'forceEscape' },
    } satisfies EnemyWave
    const followUpWave = {
      ...getWaveFromStage(baseStage, 1),
      id: 'after-timeout-strafe',
      count: 1,
      hp: 99999,
      movement: { type: 'flyThrough', path: 'helix', speed: 0 },
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: createEventStage(
        baseStage,
        [
          createWaveEvent('timeout-strafe-escape-event', { type: 'time', at: 0 }, strafeWave),
          createWaveEvent(
            'after-timeout-strafe-event',
            { type: 'afterResolved', target: strafeWave.id, delay: 0 },
            followUpWave,
          ),
        ],
      ),
      character: testPilot,
    })

    runtime.update(0.1)
    expect(runtime.getSnapshot().enemies.some((enemy) => enemy.waveId === strafeWave.id)).toBe(
      true,
    )

    runtime.update(0.6)

    const snapshot = runtime.getSnapshot()
    expect(snapshot.enemies.some((enemy) => enemy.waveId === strafeWave.id)).toBe(false)
    expect(snapshot.enemies.some((enemy) => enemy.waveId === followUpWave.id)).toBe(true)
  })

  it('spawns summon waves from boss HP triggers', () => {
    const baseStage = createStageDefinition('normal')
    const baseBoss = getBossFromStage(baseStage, 'final')
    const boss = {
      ...baseBoss,
      id: 'hp-trigger-boss',
      hp: 240,
      phases: [
        {
          ...baseBoss.phases[0]!,
          id: 'hp-trigger-phase',
          threshold: 0,
          supportLaser: false,
          pattern: {
            ...baseBoss.phases[0]!.pattern,
            interval: 999,
          },
        },
      ],
    } satisfies BossDefinition
    const summonWave = {
      ...getWaveFromStage(baseStage, 0),
      id: 'hp-trigger-summon',
      count: 1,
      hp: 99999,
      movement: { type: 'flyThrough', path: 'helix', speed: 0 },
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: createEventStage(
        baseStage,
        [
          createBossEvent('hp-trigger-boss-event', { type: 'time', at: 0 }, boss, 'final'),
          createWaveEvent(
            'hp-trigger-summon-event',
            { type: 'bossHp', bossId: boss.id, atOrBelow: 0.5 },
            summonWave,
            'summon',
          ),
        ],
      ),
      character: bossTriggerPilot,
    })

    for (let index = 0; index < 3; index += 1) {
      runtime.update(0.05)
    }

    let snapshot = runtime.getSnapshot()
    expect(snapshot.boss?.hpRatio).toBeGreaterThan(0.5)
    expect(snapshot.enemies.some((enemy) => enemy.waveId === summonWave.id)).toBe(false)

    for (let index = 0; index < 20; index += 1) {
      runtime.update(0.05)
      if (runtime.getSnapshot().enemies.some((enemy) => enemy.waveId === summonWave.id)) {
        break
      }
    }

    snapshot = runtime.getSnapshot()
    expect(snapshot.boss?.hpRatio).toBeLessThanOrEqual(0.5)
    expect(snapshot.enemies.some((enemy) => enemy.waveId === summonWave.id)).toBe(true)
  })

  it('spawns summon waves from boss phase triggers', () => {
    const baseStage = createStageDefinition('normal')
    const baseBoss = getBossFromStage(baseStage, 'final')
    const boss = {
      ...baseBoss,
      id: 'phase-trigger-boss',
      hp: 240,
      phases: [
        {
          ...baseBoss.phases[0]!,
          id: 'phase-trigger-opening',
          threshold: 0.5,
          supportLaser: false,
          pattern: {
            ...baseBoss.phases[0]!.pattern,
            interval: 999,
          },
        },
        {
          ...baseBoss.phases[0]!,
          id: 'phase-trigger-critical',
          threshold: 0,
          label: 'Critical',
          supportLaser: false,
          pattern: {
            ...baseBoss.phases[0]!.pattern,
            interval: 999,
          },
        },
      ],
    } satisfies BossDefinition
    const summonWave = {
      ...getWaveFromStage(baseStage, 0),
      id: 'phase-trigger-summon',
      count: 1,
      hp: 99999,
      movement: { type: 'flyThrough', path: 'helix', speed: 0 },
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: createEventStage(
        baseStage,
        [
          createBossEvent('phase-trigger-boss-event', { type: 'time', at: 0 }, boss, 'final'),
          createWaveEvent(
            'phase-trigger-summon-event',
            { type: 'bossPhase', bossId: boss.id, phaseId: 'phase-trigger-critical' },
            summonWave,
            'summon',
          ),
        ],
      ),
      character: bossTriggerPilot,
    })

    for (let index = 0; index < 3; index += 1) {
      runtime.update(0.05)
    }

    let snapshot = runtime.getSnapshot()
    expect(snapshot.phaseLabel).not.toBe('Critical')
    expect(snapshot.enemies.some((enemy) => enemy.waveId === summonWave.id)).toBe(false)

    for (let index = 0; index < 20; index += 1) {
      runtime.update(0.05)
      if (runtime.getSnapshot().phaseLabel === 'Critical') {
        break
      }
    }

    snapshot = runtime.getSnapshot()
    expect(snapshot.phaseLabel).toBe('Critical')
    expect(snapshot.enemies.some((enemy) => enemy.waveId === summonWave.id)).toBe(true)
  })

  it('supports multiple active midbosses in the snapshot', () => {
    const baseStage = createStageDefinition('normal')
    const baseBoss = getBossFromStage(baseStage, 'final')
    const firstMidboss = {
      ...baseBoss,
      id: 'first-active-midboss',
      hp: 99999,
      phases: [
        {
          ...baseBoss.phases[0]!,
          id: 'first-active-midboss-phase',
          supportLaser: false,
          pattern: {
            ...baseBoss.phases[0]!.pattern,
            interval: 999,
          },
        },
      ],
    } satisfies BossDefinition
    const secondMidboss = {
      ...baseBoss,
      id: 'second-active-midboss',
      hp: 99999,
      phases: [
        {
          ...baseBoss.phases[0]!,
          id: 'second-active-midboss-phase',
          supportLaser: false,
          pattern: {
            ...baseBoss.phases[0]!.pattern,
            interval: 999,
          },
        },
      ],
    } satisfies BossDefinition
    const runtime = createRuntime({
      stage: createEventStage(
        baseStage,
        [
          createBossEvent(
            'first-active-midboss-event',
            { type: 'time', at: 0 },
            firstMidboss,
            'midboss',
          ),
          createBossEvent(
            'second-active-midboss-event',
            { type: 'time', at: 0.1 },
            secondMidboss,
            'midboss',
          ),
        ],
      ),
      character: testPilot,
    })

    runtime.update(0.11)

    const snapshot = runtime.getSnapshot()
    expect(snapshot.bosses.map((boss) => boss.id)).toEqual([
      firstMidboss.id,
      secondMidboss.id,
    ])
    expect(snapshot.boss?.id).toBe(firstMidboss.id)
  })

  it('exposes the composed boss FSM and holds boss fire during intro', () => {
    const baseStage = createStageDefinition('normal')
    const baseBoss = getBossFromStage(baseStage, 'final')
    const boss = {
      ...baseBoss,
      id: 'fsm-boss',
      hp: 99999,
      phases: [
        {
          ...baseBoss.phases[0]!,
          id: 'fsm-opening',
          threshold: 0,
          supportLaser: false,
          pattern: {
            ...baseBoss.phases[0]!.pattern,
            interval: 0.05,
          },
        },
      ],
    } satisfies BossDefinition
    const runtime = createRuntime({
      stage: createEventStage(baseStage, [
        createBossEvent('fsm-boss-event', { type: 'time', at: 0 }, boss, 'final'),
      ]),
      invincible: true,
    })

    runtime.update(0.05)

    let snapshot = runtime.getSnapshot()
    expect(snapshot.boss?.fsm).toEqual({
      phase: 'Intro',
      phaseId: 'fsm-opening',
      phaseIndex: 0,
      movement: 'EnterScreen',
      firePattern: 'Idle',
      vulnerability: 'Invulnerable',
    })
    expect(snapshot.bullets.filter((bullet) => bullet.source === 'enemy')).toHaveLength(0)

    runtime.update(0.75)
    runtime.update(0.05)

    snapshot = runtime.getSnapshot()
    expect(snapshot.boss?.fsm).toMatchObject({
      phase: 'CombatPhase',
      phaseId: 'fsm-opening',
      phaseIndex: 0,
      firePattern: 'AimedFan',
      vulnerability: 'Vulnerable',
    })
    expect(snapshot.bullets.some((bullet) => bullet.source === 'enemy')).toBe(true)
  })

  it('starts the boss FSM intro from the actual late timeAfterDefeated spawn time', () => {
    const baseStage = createStageDefinition('normal')
    const baseBoss = getBossFromStage(baseStage, 'final')
    const lateAnchorWave = {
      ...getWaveFromStage(baseStage, 0),
      id: 'late-boss-anchor',
      count: 0,
      resolution: { type: 'allDefeated' },
    } satisfies EnemyWave
    const boss = {
      ...baseBoss,
      id: 'late-gated-fsm-boss',
      hp: 99999,
      phases: [
        {
          ...baseBoss.phases[0]!,
          id: 'late-gated-opening',
          threshold: 0,
          supportLaser: false,
          pattern: {
            ...baseBoss.phases[0]!.pattern,
            interval: 0.05,
          },
        },
      ],
    } satisfies BossDefinition
    const runtime = createRuntime({
      stage: createEventStage(baseStage, [
        createWaveEvent('late-boss-anchor-event', { type: 'time', at: 2 }, lateAnchorWave),
        createBossEvent(
          'late-gated-fsm-boss-event',
          { type: 'timeAfterDefeated', at: 0.5, target: lateAnchorWave.id },
          boss,
          'final',
        ),
      ]),
      invincible: true,
    })

    runtime.update(2)

    const snapshot = runtime.getSnapshot()
    expect(snapshot.boss?.fsm).toEqual({
      phase: 'Intro',
      phaseId: 'late-gated-opening',
      phaseIndex: 0,
      movement: 'EnterScreen',
      firePattern: 'Idle',
      vulnerability: 'Invulnerable',
    })
    expect(snapshot.bullets.filter((bullet) => bullet.source === 'enemy')).toHaveLength(0)
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
      ...getBossFromStage(baseStage, 'midboss'),
      hp: 2200,
    }
    const runtime = createRuntime({
      stage: createEventStage(
        baseStage,
        [
          createBossEvent('midboss-event', { type: 'time', at: 0.05 }, midboss, 'midboss'),
        ],
        0.12,
      ),
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
    const beforeGate = { ...getWaveFromStage(baseStage, 0), id: 'before-gate', count: 1 }
    const afterGate = {
      ...getWaveFromStage(baseStage, 1),
      id: 'after-gate',
      count: 1,
      hp: 99999,
    }
    const midboss = {
      ...getBossFromStage(baseStage, 'midboss'),
      hp: 2200,
    }
    const stage = createEventStage(
      baseStage,
      [
        createWaveEvent('before-gate-event', { type: 'time', at: 0 }, beforeGate),
        createBossEvent('midboss-event', { type: 'time', at: 0.05 }, midboss, 'midboss'),
        createWaveEvent(
          'after-gate-event',
          { type: 'afterDefeated', target: midboss.id, delay: 0.2 },
          afterGate,
        ),
      ],
    )
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
    const midboss = getBossFromStage(baseStage, 'midboss')
    const boss = {
      ...getBossFromStage(createStageDefinition('normal'), 'final'),
      hp: 240,
    }
    const stage = createEventStage(
      baseStage,
      [
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
    )
    const runtime = createRuntime({ stage, character: midbossSlayerPilot })

    runtime.update(0.11)

    expect(runtime.getSnapshot().boss?.id).toBe('test-midboss')

    advanceWhileBossActive(runtime, 'test-midboss')

    runtime.update(0.5)

    expect(runtime.getSnapshot().boss?.id).toBe(boss.id)

    advanceWhileBossActive(runtime, boss.id)

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
    runtime.update(1)

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

    for (let index = 0; index < 8; index += 1) {
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

  it('moves enemy bullets at twice their authored pattern speed', () => {
    const runtime = createRuntime({
      stage: createPatternStage({
        shape: 'fan',
        count: 1,
        interval: 999,
        speed: 1,
        spread: 0,
        life: 6,
      }),
      invincible: true,
    })

    runtime.update(1)
    const bulletId = runtime.getSnapshot().bullets.find((bullet) => bullet.source === 'enemy')?.id
    const initialZ = runtime
      .getSnapshot()
      .bullets.find((bullet) => bullet.id === bulletId)?.position.z
    runtime.update(0.25)
    const nextZ = runtime
      .getSnapshot()
      .bullets.find((bullet) => bullet.id === bulletId)?.position.z

    expect(bulletId).toBeDefined()
    expect(initialZ).toBeDefined()
    expect(nextZ).toBeDefined()
    expect(initialZ! - nextZ!).toBeCloseTo(0.5, 5)
  })
})

describe('scripted boss bullet patterns', () => {
  it('runs BulletML-style waits and sequence shots from a boss phase', () => {
    const stage = createStageDefinition('normal', { fastStage: true })
    const boss = {
      ...getBossFromStage(stage, 'final'),
      hp: 99999,
      phases: [
        {
          id: 'scripted-opening',
          threshold: 0,
          label: 'Scripted Opening',
          supportLaser: false,
          pattern: {
            engine: 'bulletml',
            interval: 999,
            rank: 0.5,
            bullet: { radius: 0.1, glow: 1.35, life: 5 },
            action: [
              {
                type: 'repeat',
                times: 4,
                actions: [
                  {
                    type: 'fire',
                    direction: { type: 'sequence', degrees: 18 },
                    speed: { type: 'absolute', value: 1.1 },
                  },
                  { type: 'wait', seconds: 0.1 },
                ],
              },
            ],
          },
        },
      ],
    } satisfies BossDefinition
    const runtime = createRuntime({
      stage: createEventStage(stage, [
        createBossEvent('scripted-boss', { type: 'time', at: 0 }, boss, 'final'),
      ]),
      invincible: true,
    })

    runtime.update(0.1)
    runtime.update(0.1)
    runtime.update(0.1)
    runtime.update(0.1)

    const enemyBullets = runtime
      .getSnapshot()
      .bullets.filter((bullet) => bullet.source === 'enemy')

    expect(enemyBullets.length).toBeGreaterThanOrEqual(4)
    expect(enemyBullets[0]?.position.x).toBeGreaterThan(0)
    expect(enemyBullets[1]?.position.x).toBeGreaterThan(enemyBullets[0]!.position.x)
  })

  it('loops a scripted boss phase after the root action finishes', () => {
    const stage = createStageDefinition('normal', { fastStage: true })
    const boss = {
      ...getBossFromStage(stage, 'final'),
      hp: 99999,
      phases: [
        {
          id: 'scripted-loop',
          threshold: 0,
          label: 'Scripted Loop',
          supportLaser: false,
          pattern: {
            engine: 'bulletml',
            interval: 0.1,
            loop: true,
            bullet: { radius: 0.1, glow: 1.35, life: 5 },
            action: [
              {
                type: 'fire',
                direction: { type: 'aim' },
                speed: { type: 'absolute', value: 1 },
              },
              { type: 'wait', seconds: 0.1 },
            ],
          },
        },
      ],
    } satisfies BossDefinition
    const runtime = createRuntime({
      stage: createEventStage(stage, [
        createBossEvent('scripted-loop-boss', { type: 'time', at: 0 }, boss, 'final'),
      ]),
      invincible: true,
    })

    for (let index = 0; index < 8; index += 1) {
      runtime.update(0.1)
    }

    const enemyBullets = runtime
      .getSnapshot()
      .bullets.filter((bullet) => bullet.source === 'enemy')

    expect(enemyBullets.length).toBeGreaterThan(2)
  })

  it('starts the next BulletML phase program after a phase break', () => {
    const stage = createStageDefinition('normal', { fastStage: true })
    const boss = {
      ...getBossFromStage(stage, 'final'),
      id: 'scripted-phase-break-boss',
      hp: 100,
      phaseBreakDuration: 0.4,
      phases: [
        {
          id: 'scripted-waiting-phase',
          threshold: 0.5,
          label: 'Waiting Script',
          supportLaser: false,
          pattern: {
            engine: 'bulletml',
            interval: 999,
            loop: true,
            bullet: { radius: 0.1, glow: 1.35, life: 5 },
            action: [{ type: 'wait', seconds: 99 }],
          },
        },
        {
          id: 'scripted-break-burst-phase',
          threshold: 0,
          label: 'Break Burst',
          supportLaser: false,
          pattern: {
            engine: 'bulletml',
            interval: 999,
            bullet: { radius: 0.123, glow: 1.91, life: 5 },
            action: [
              {
                type: 'fire',
                direction: { type: 'absolute', degrees: 180 },
                speed: { type: 'absolute', value: 0.6 },
              },
              { type: 'wait', seconds: 99 },
            ],
          },
        },
      ],
    } satisfies BossDefinition
    const runtime = createRuntime({
      stage: createEventStage(stage, [
        createBossEvent('scripted-phase-break-boss-event', { type: 'time', at: 0 }, boss, 'final'),
      ]),
      character: {
        ...testPilot,
        shot: {
          interval: 999,
          speed: 24,
          power: 60,
        },
      },
    })

    for (let index = 0; index < 20; index += 1) {
      runtime.update(0.05)
      if (runtime.getSnapshot().boss?.fsm.phaseId === 'scripted-break-burst-phase') {
        break
      }
    }

    let snapshot = runtime.getSnapshot()
    expect(snapshot.boss?.fsm).toMatchObject({
      phase: 'Break',
      phaseId: 'scripted-break-burst-phase',
      firePattern: 'Idle',
      vulnerability: 'Invulnerable',
    })
    expect(snapshot.bullets.some((bullet) => bullet.source === 'enemy')).toBe(false)

    runtime.update(0.39)
    snapshot = runtime.getSnapshot()
    expect(snapshot.boss?.fsm.firePattern).toBe('Idle')
    expect(snapshot.bullets.some((bullet) => bullet.source === 'enemy')).toBe(false)

    runtime.update(0.02)
    snapshot = runtime.getSnapshot()

    expect(snapshot.boss?.fsm).toMatchObject({
      phase: 'CombatPhase',
      phaseId: 'scripted-break-burst-phase',
      firePattern: 'SpiralRing',
      vulnerability: 'Vulnerable',
    })
    expect(
      snapshot.bullets.some(
        (bullet) =>
          bullet.source === 'enemy' &&
          bullet.radius === 0.123 &&
          bullet.glow === 1.91,
      ),
    ).toBe(true)
  })
})

describe('special attack runtime', () => {
  it('charges most of the beam-lance gauge by boss arrival', () => {
    const stage = createStageDefinition('normal')
    const runtime = createRuntime({ stage })
    const chargeReference = getFinalBossChargeReferenceTime(stage)

    runtime.update(chargeReference)

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
    const naturalChargeOnly = (92 / getFinalBossChargeReferenceTime(stage)) * 2.5

    expect(slot?.charge).toBeGreaterThan(naturalChargeOnly + 0.5)
  })

  it('activates beam-lance at full charge and resets that slot', () => {
    const stage = createStageDefinition('normal')
    const runtime = createRuntime({ stage })
    const chargeReference = getFinalBossChargeReferenceTime(stage)

    runtime.update(chargeReference + 9)

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

  it('launches Vesper phantom orb and clears nearby enemy bullets on explosion', () => {
    const stage = createEnergyOrbSpecialStage()
    const runtime = createRuntime({
      stage,
      character: {
        ...vesperNoireCharacter,
        shot: {
          ...vesperNoireCharacter.shot,
          interval: 999,
          power: 1,
        },
      },
    })

    runtime.update(1)

    const chargedSlot = runtime
      .getSnapshot()
      .specialSlots.find((candidate) => candidate.id === phantomOrb)
    const beforeBossHp = runtime.getSnapshot().boss?.hpRatio

    expect(chargedSlot?.ready).toBe(true)
    expect(runtime.getSnapshot().bullets.some((bullet) => bullet.source === 'enemy')).toBe(true)
    expect(runtime.activateSpecial(phantomOrb)).toBe(true)
    expect(
      runtime.getSnapshot().bullets.some((bullet) => bullet.kind === 'special-orb'),
    ).toBe(true)

    runtime.update(0.8)

    const snapshot = runtime.getSnapshot()

    expect(snapshot.boss?.hpRatio).toBeLessThan(beforeBossHp!)
    expect(snapshot.bullets.some((bullet) => bullet.source === 'enemy')).toBe(false)
    expect(snapshot.bullets.some((bullet) => bullet.kind === 'special-orb')).toBe(false)
    expect(snapshot.sparkles.length).toBeGreaterThan(0)
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

  it('keeps a 3D destruction effect alive briefly after an enemy is defeated', () => {
    const runtime = createRuntime({ stage: createEnemyDestructionFeedbackStage() })

    runtime.update(0.22)
    runtime.activateSpecial(beamLance)
    runtime.update(0.05)

    let snapshot = runtime.getSnapshot()
    expect(snapshot.enemies).toHaveLength(0)
    expect(snapshot.destructionEffects).toHaveLength(1)
    expect(snapshot.destructionEffects[0]?.position.x).toBeCloseTo(0, 1)
    expect(snapshot.destructionEffects[0]?.scale).toEqual(expect.any(Number))

    runtime.update(1)
    snapshot = runtime.getSnapshot()

    expect(snapshot.destructionEffects).toHaveLength(0)
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
    const wave = {
      ...getFirstWave(stage),
      spacing: 0,
      count: 1,
    }
    const runtime = createRuntime({
      stage: createEventStage(stage, [
        createWaveEvent('special-target-event', { type: 'time', at: 0 }, wave),
        ...stage.events.filter((event) => event.id !== 'special-target-event'),
      ]),
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
