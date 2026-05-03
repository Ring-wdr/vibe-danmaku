import { scaleBossDefinition } from './bossScaling'
import { resolveEnemyWave } from './enemies'
import {
  createTimedWaveEvents,
  createTimeBossEvent,
  createVictoryEvent,
  scaleEventTime,
} from './stageEvents'
import type {
  BossDefinition,
  BulletmlExpression,
  BulletmlPatternConfig,
  Difficulty,
  StageEvent,
  StageDefinition,
} from '../types'

type MidbossAuthoringDefinition = BossDefinition & { gateWaveCount: number }

const midbossAt = 39
const finalBossAt = 84
const rankExpression = { type: 'rank' } satisfies BulletmlExpression

function add(left: BulletmlExpression, right: BulletmlExpression): BulletmlExpression {
  return { type: 'add', left, right }
}

function sub(left: BulletmlExpression, right: BulletmlExpression): BulletmlExpression {
  return { type: 'sub', left, right }
}

function mul(left: BulletmlExpression, right: BulletmlExpression): BulletmlExpression {
  return { type: 'mul', left, right }
}

function rankScale(base: number, factor: number) {
  return add(base, mul(rankExpression, factor))
}

function rankWait(base: number, reduction: number) {
  return sub(base, mul(rankExpression, reduction))
}

const scriptedBulletDefaults = {
  radius: 0.095,
  glow: 1.42,
  life: 8.6,
} as const

const emberCagePattern = {
  engine: 'bulletml',
  interval: 0.75,
  loop: true,
  bullet: scriptedBulletDefaults,
  action: [
    {
      type: 'repeat',
      times: rankScale(64, 42),
      actions: [
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: rankScale(18, 4) },
          speed: { type: 'absolute', value: rankScale(0.82, 0.46) },
          actions: [
            { type: 'wait', seconds: 0.42 },
            {
              type: 'changeSpeed',
              speed: { type: 'absolute', value: rankScale(1.24, 0.52) },
              term: 0.52,
            },
          ],
        },
        { type: 'wait', seconds: rankWait(0.09, 0.025) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const ashFanPattern = {
  engine: 'bulletml',
  interval: 0.68,
  loop: true,
  bullet: { ...scriptedBulletDefaults, radius: 0.09, glow: 1.34 },
  action: [
    {
      type: 'repeat',
      times: rankScale(54, 32),
      actions: [
        {
          type: 'fire',
          direction: { type: 'aim', degrees: -34 },
          speed: { type: 'absolute', value: rankScale(1.05, 0.5) },
        },
        {
          type: 'fire',
          direction: { type: 'aim', degrees: 34 },
          speed: { type: 'absolute', value: rankScale(1.05, 0.5) },
        },
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: 28 },
          speed: { type: 'absolute', value: rankScale(0.78, 0.36) },
          actions: [
            { type: 'wait', seconds: 0.34 },
            {
              type: 'changeDirection',
              direction: { type: 'relative', degrees: 18 },
              term: 0.44,
            },
          ],
        },
        { type: 'wait', seconds: rankWait(0.13, 0.04) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const ruinSpiralPattern = {
  engine: 'bulletml',
  interval: 0.6,
  loop: true,
  bullet: { ...scriptedBulletDefaults, glow: 1.48, life: 9 },
  action: [
    {
      type: 'repeat',
      times: rankScale(96, 54),
      actions: [
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: rankScale(23, 5) },
          speed: { type: 'absolute', value: rankScale(0.76, 0.42) },
          actions: [
            { type: 'wait', seconds: 0.5 },
            {
              type: 'changeDirection',
              direction: { type: 'relative', degrees: -42 },
              term: 0.62,
            },
            {
              type: 'changeSpeed',
              speed: { type: 'relative', value: rankScale(0.38, 0.24) },
              term: 0.5,
            },
          ],
        },
        { type: 'wait', seconds: rankWait(0.075, 0.02) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const citadelCollapsePattern = {
  engine: 'bulletml',
  interval: 0.54,
  loop: true,
  bullet: { ...scriptedBulletDefaults, radius: 0.105, glow: 1.62, life: 9.4 },
  action: [
    {
      type: 'repeat',
      times: rankScale(72, 48),
      actions: [
        {
          type: 'fire',
          direction: { type: 'aim', degrees: -18 },
          speed: { type: 'absolute', value: rankScale(0.88, 0.46) },
          actions: [
            { type: 'wait', seconds: 0.38 },
            {
              type: 'changeDirection',
              direction: { type: 'relative', degrees: 32 },
              term: 0.5,
            },
          ],
        },
        {
          type: 'fire',
          direction: { type: 'aim', degrees: 18 },
          speed: { type: 'absolute', value: rankScale(0.88, 0.46) },
          actions: [
            { type: 'wait', seconds: 0.38 },
            {
              type: 'changeDirection',
              direction: { type: 'relative', degrees: -32 },
              term: 0.5,
            },
          ],
        },
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: rankScale(36, 5) },
          speed: { type: 'absolute', value: rankScale(1.0, 0.52) },
        },
        { type: 'wait', seconds: rankWait(0.105, 0.035) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const baseWavePlacements = [
  {
    id: 'wave-1',
    at: 1.8,
    archetype: 'scout',
    variant: 'brass-cloud-scout',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-2',
    at: 8,
    archetype: 'sentinel',
    variant: 'brass-cloud-sentinel',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-3',
    at: 14.2,
    archetype: 'lancer',
    variant: 'brass-cloud-lancer',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-4',
    at: 20.4,
    archetype: 'splitter',
    variant: 'brass-cloud-splitter',
    count: 18,
    spacing: 0.33,
  },
  {
    id: 'wave-5',
    at: 26.6,
    archetype: 'mine-layer',
    variant: 'brass-cloud-mine-layer',
    count: 18,
    spacing: 0.33,
  },
  {
    id: 'wave-6',
    at: 32.8,
    archetype: 'weaver',
    variant: 'brass-cloud-weaver',
    count: 18,
    spacing: 0.33,
  },
  {
    id: 'wave-7',
    at: 46,
    archetype: 'scout',
    variant: 'brass-cloud-scout',
    count: 24,
    spacing: 0.25,
    pattern: { count: 7, spread: 1.45 },
  },
  {
    id: 'wave-8',
    at: 52.2,
    archetype: 'weaver',
    variant: 'brass-cloud-weaver',
    count: 24,
    spacing: 0.25,
    pattern: { count: 8, interval: 1.05 },
  },
  {
    id: 'wave-9',
    at: 58.4,
    archetype: 'scout',
    variant: 'brass-cloud-scout',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-10',
    at: 64.6,
    archetype: 'sentinel',
    variant: 'brass-cloud-sentinel',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-11',
    at: 70.8,
    archetype: 'lancer',
    variant: 'brass-cloud-lancer',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-12',
    at: 77,
    archetype: 'splitter',
    variant: 'brass-cloud-splitter',
    count: 18,
    spacing: 0.33,
  },
] as const

const baseMidboss: MidbossAuthoringDefinition = {
  id: 'midboss-ember-gate',
  gateWaveCount: 6,
  hp: 720,
  phases: [
    {
      id: 'phase-1',
      threshold: 0.45,
      label: 'Midboss · Ember Gate',
      supportLaser: false,
      pattern: { shape: 'ring', count: 9, interval: 0.9, speed: 1.12, spread: 0.4, life: 8 },
    },
    {
      id: 'phase-2',
      threshold: 0,
      label: 'Midboss · Cinder Sweep',
      supportLaser: true,
      pattern: emberCagePattern,
    },
  ],
}

const baseBoss: BossDefinition = {
  id: 'boss-ash-citadel-core',
  hp: 1680,
  phases: [
    {
      id: 'phase-1',
      threshold: 0.68,
      label: 'Phase 1 · Ash Fan',
      supportLaser: false,
      pattern: ashFanPattern,
    },
    {
      id: 'phase-2',
      threshold: 0.34,
      label: 'Phase 2 · Ruin Spiral',
      supportLaser: false,
      pattern: ruinSpiralPattern,
    },
    {
      id: 'phase-3',
      threshold: 0,
      label: 'Phase 3 · Citadel Collapse',
      supportLaser: true,
      pattern: citadelCollapsePattern,
    },
  ],
}

export function createStage2Definition(
  difficulty: Difficulty,
  options?: { fastStage?: boolean },
): StageDefinition {
  const fastMultiplier = options?.fastStage ? 0.22 : 1
  const scaleTime = (value: number) => Number((value * fastMultiplier).toFixed(2))
  const waves = baseWavePlacements.map((placement) => resolveEnemyWave(difficulty, placement))
  const scaledMidboss = scaleBossDefinition(baseMidboss, difficulty)
  const boss = scaleBossDefinition(baseBoss, difficulty)
  const midbossGateWaveCount = scaledMidboss.gateWaveCount
  const midboss: BossDefinition = {
    id: scaledMidboss.id,
    hp: scaledMidboss.hp,
    phases: scaledMidboss.phases,
  }
  const firstHalf = waves.slice(0, midbossGateWaveCount)
  const secondHalf = waves.slice(midbossGateWaveCount)
  const firstHalfPlacements = baseWavePlacements.slice(0, midbossGateWaveCount)
  const secondHalfPlacements = baseWavePlacements.slice(midbossGateWaveCount)
  const firstHalfEvents = createTimedWaveEvents(firstHalfPlacements, firstHalf)
  const secondHalfEvents: StageEvent[] = secondHalf.map((wave, index) => ({
    id: `${wave.id}-event`,
    trigger: {
      type: 'timeAfterDefeated',
      at: secondHalfPlacements[index]!.at,
      target: scaledMidboss.id,
      delay: secondHalfPlacements[index]!.at - midbossAt,
    },
    actions: [{ type: 'spawnWave', wave }],
  }))
  const events = [
    ...firstHalfEvents,
    createTimeBossEvent(midboss, 'midboss', midbossAt),
    ...secondHalfEvents,
    {
      id: `${boss.id}-spawn`,
      trigger: {
        type: 'timeAfterDefeated',
        at: finalBossAt,
        target: scaledMidboss.id,
        delay: finalBossAt - midbossAt,
      },
      actions: [{ type: 'spawnBoss', boss, role: 'final' }],
    } satisfies StageEvent,
    createVictoryEvent(boss.id),
  ].map((event) => scaleEventTime(event, fastMultiplier))

  return {
    id: 'burning-ruin-corridor',
    stageNumber: 2,
    backgroundTheme: 'burning-ruins',
    name: 'Burning Ruin Corridor',
    lore: '전쟁 뒤 불타는 폐허 회랑을 돌파하고 잿빛 성채 코어를 붕괴시킨다.',
    duration: scaleTime(210),
    events,
  }
}
