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
  StageDefinition,
  StageEvent,
} from '../types'

const midbossAt = 44
const finalBossAt = 96
const fastStageMultiplier = 0.22
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
  radius: 0.088,
  glow: 1.5,
  life: 8.8,
} as const

const pressureBloomPattern = {
  engine: 'bulletml',
  interval: 0.62,
  loop: true,
  bullet: { ...scriptedBulletDefaults, glow: 1.56 },
  action: [
    {
      type: 'repeat',
      times: rankScale(48, 34),
      actions: [
        {
          type: 'fire',
          direction: { type: 'aim', degrees: -22 },
          speed: { type: 'absolute', value: rankScale(0.86, 0.38) },
          actions: [
            { type: 'wait', seconds: 0.44 },
            {
              type: 'changeSpeed',
              speed: { type: 'absolute', value: rankScale(1.28, 0.44) },
              term: 0.48,
            },
            {
              type: 'fire',
              direction: { type: 'relative', degrees: -34 },
              speed: { type: 'absolute', value: rankScale(0.78, 0.28) },
              radius: 0.075,
              life: 6.2,
            },
            {
              type: 'fire',
              direction: { type: 'relative', degrees: 34 },
              speed: { type: 'absolute', value: rankScale(0.78, 0.28) },
              radius: 0.075,
              life: 6.2,
            },
          ],
        },
        {
          type: 'fire',
          direction: { type: 'aim', degrees: 22 },
          speed: { type: 'absolute', value: rankScale(0.86, 0.38) },
          actions: [
            { type: 'wait', seconds: 0.44 },
            {
              type: 'changeSpeed',
              speed: { type: 'absolute', value: rankScale(1.28, 0.44) },
              term: 0.48,
            },
            {
              type: 'fire',
              direction: { type: 'relative', degrees: -34 },
              speed: { type: 'absolute', value: rankScale(0.78, 0.28) },
              radius: 0.075,
              life: 6.2,
            },
            {
              type: 'fire',
              direction: { type: 'relative', degrees: 34 },
              speed: { type: 'absolute', value: rankScale(0.78, 0.28) },
              radius: 0.075,
              life: 6.2,
            },
          ],
        },
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: rankScale(32, 4) },
          speed: { type: 'absolute', value: rankScale(0.7, 0.24) },
          actions: [
            { type: 'wait', seconds: 0.58 },
            {
              type: 'changeDirection',
              direction: { type: 'relative', degrees: -28 },
              term: 0.56,
            },
          ],
        },
        { type: 'wait', seconds: rankWait(0.14, 0.035) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const currentLanePattern = {
  engine: 'bulletml',
  interval: 0.56,
  loop: true,
  bullet: { ...scriptedBulletDefaults, radius: 0.082, life: 9.2 },
  action: [
    {
      type: 'repeat',
      times: rankScale(72, 42),
      actions: [
        {
          type: 'fire',
          direction: { type: 'absolute', degrees: 168 },
          speed: { type: 'absolute', value: rankScale(1.0, 0.34) },
          actions: [
            { type: 'wait', seconds: 0.36 },
            {
              type: 'changeDirection',
              direction: { type: 'relative', degrees: 18 },
              term: 0.62,
            },
          ],
        },
        {
          type: 'fire',
          direction: { type: 'absolute', degrees: 192 },
          speed: { type: 'absolute', value: rankScale(1.0, 0.34) },
          actions: [
            { type: 'wait', seconds: 0.36 },
            {
              type: 'changeDirection',
              direction: { type: 'relative', degrees: -18 },
              term: 0.62,
            },
          ],
        },
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: 54 },
          speed: { type: 'absolute', value: rankScale(0.68, 0.28) },
          actions: [
            { type: 'wait', seconds: 0.72 },
            {
              type: 'changeSpeed',
              speed: { type: 'relative', value: rankScale(0.32, 0.18) },
              term: 0.48,
            },
          ],
        },
        { type: 'wait', seconds: rankWait(0.11, 0.03) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const mineBloomPattern = {
  engine: 'bulletml',
  interval: 0.7,
  loop: true,
  bullet: { ...scriptedBulletDefaults, radius: 0.12, glow: 1.72, life: 9.6 },
  action: [
    {
      type: 'repeat',
      times: rankScale(42, 30),
      actions: [
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: rankScale(41, 5) },
          speed: { type: 'absolute', value: rankScale(0.42, 0.18) },
          actions: [
            { type: 'wait', seconds: 0.82 },
            {
              type: 'changeSpeed',
              speed: { type: 'absolute', value: 0.08 },
              term: 0.2,
            },
            {
              type: 'fire',
              direction: { type: 'sequence', degrees: 72 },
              speed: { type: 'absolute', value: rankScale(0.86, 0.3) },
              radius: 0.076,
              life: 6.6,
            },
            {
              type: 'fire',
              direction: { type: 'sequence', degrees: 72 },
              speed: { type: 'absolute', value: rankScale(0.86, 0.3) },
              radius: 0.076,
              life: 6.6,
            },
            {
              type: 'fire',
              direction: { type: 'sequence', degrees: 72 },
              speed: { type: 'absolute', value: rankScale(0.86, 0.3) },
              radius: 0.076,
              life: 6.6,
            },
            {
              type: 'fire',
              direction: { type: 'sequence', degrees: 72 },
              speed: { type: 'absolute', value: rankScale(0.86, 0.3) },
              radius: 0.076,
              life: 6.6,
            },
            {
              type: 'fire',
              direction: { type: 'sequence', degrees: 72 },
              speed: { type: 'absolute', value: rankScale(0.86, 0.3) },
              radius: 0.076,
              life: 6.6,
            },
            { type: 'vanish' },
          ],
        },
        {
          type: 'fire',
          direction: { type: 'aim', degrees: 0 },
          speed: { type: 'absolute', value: rankScale(0.72, 0.22) },
          radius: 0.08,
          life: 7,
        },
        { type: 'wait', seconds: rankWait(0.22, 0.055) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const leviathanCollapsePattern = {
  engine: 'bulletml',
  interval: 0.48,
  loop: true,
  bullet: { ...scriptedBulletDefaults, radius: 0.094, glow: 1.84, life: 9.8 },
  action: [
    {
      type: 'repeat',
      times: rankScale(88, 56),
      actions: [
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: rankScale(21, 3.5) },
          speed: { type: 'absolute', value: rankScale(0.74, 0.34) },
          actions: [
            { type: 'wait', seconds: 0.46 },
            {
              type: 'changeDirection',
              direction: { type: 'relative', degrees: 46 },
              term: 0.58,
            },
            {
              type: 'changeSpeed',
              speed: { type: 'relative', value: rankScale(0.38, 0.2) },
              term: 0.44,
            },
          ],
        },
        {
          type: 'fire',
          direction: { type: 'aim', degrees: -30 },
          speed: { type: 'absolute', value: rankScale(1.02, 0.4) },
          radius: 0.078,
          life: 7.4,
        },
        {
          type: 'fire',
          direction: { type: 'aim', degrees: 30 },
          speed: { type: 'absolute', value: rankScale(1.02, 0.4) },
          radius: 0.078,
          life: 7.4,
        },
        { type: 'wait', seconds: rankWait(0.095, 0.028) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const baseWavePlacements = [
  { id: 'wave-1', at: 2, archetype: 'scout', variant: 'abyssal-biomech-scout', count: 18, spacing: 0.34 },
  { id: 'wave-2', at: 8.4, archetype: 'sentinel', variant: 'abyssal-biomech-sentinel', count: 16, spacing: 0.38 },
  { id: 'wave-3', at: 14.8, archetype: 'lancer', variant: 'abyssal-biomech-lancer', count: 18, spacing: 0.34 },
  { id: 'wave-4', at: 21.2, archetype: 'splitter', variant: 'abyssal-biomech-splitter', count: 20, spacing: 0.3 },
  { id: 'wave-5', at: 27.6, archetype: 'mine-layer', variant: 'abyssal-biomech-mine-layer', count: 20, spacing: 0.3 },
  { id: 'wave-6', at: 34, archetype: 'weaver', variant: 'abyssal-biomech-weaver', count: 20, spacing: 0.3 },
  { id: 'wave-7', at: 40.4, archetype: 'scout', variant: 'abyssal-biomech-scout', count: 24, spacing: 0.26 },
  { id: 'wave-8', at: 52, archetype: 'weaver', variant: 'abyssal-biomech-weaver', count: 24, spacing: 0.25 },
  { id: 'wave-9', at: 58.4, archetype: 'lancer', variant: 'abyssal-biomech-lancer', count: 20, spacing: 0.3 },
  { id: 'wave-10', at: 64.8, archetype: 'splitter', variant: 'abyssal-biomech-splitter', count: 22, spacing: 0.28 },
  { id: 'wave-11', at: 71.2, archetype: 'mine-layer', variant: 'abyssal-biomech-mine-layer', count: 22, spacing: 0.28 },
  { id: 'wave-12', at: 77.6, archetype: 'sentinel', variant: 'abyssal-biomech-sentinel', count: 18, spacing: 0.34 },
  { id: 'wave-13', at: 84, archetype: 'weaver', variant: 'abyssal-biomech-weaver', count: 24, spacing: 0.25 },
  { id: 'wave-14', at: 90.4, archetype: 'scout', variant: 'abyssal-biomech-scout', count: 28, spacing: 0.22 },
] as const

const baseMidboss: BossDefinition = {
  id: 'midboss-pressure-lure',
  hp: 980,
  phaseBreakDuration: 3,
  phases: [
    {
      id: 'phase-1',
      threshold: 0.5,
      label: 'Midboss · Pressure Lure',
      supportLaser: false,
      pattern: {
        shape: 'wave',
        count: 7,
        interval: 1.0,
        speed: 1.08,
        spread: 1.25,
        life: 8.4,
        wave: { amplitude: 0.58, frequency: 2.6 },
      },
    },
    {
      id: 'phase-2',
      threshold: 0,
      label: 'Midboss · Bloom Current',
      supportLaser: false,
      pattern: pressureBloomPattern,
    },
  ],
}

const baseBoss: BossDefinition = {
  id: 'boss-abyssal-leviathan-core',
  hp: 2300,
  phaseBreakDuration: 3,
  phases: [
    {
      id: 'phase-1',
      threshold: 0.75,
      label: 'Phase 1 · Pressure Ring',
      supportLaser: false,
      pattern: pressureBloomPattern,
    },
    {
      id: 'phase-2',
      threshold: 0.5,
      label: 'Phase 2 · Current Lanes',
      supportLaser: false,
      pattern: currentLanePattern,
    },
    {
      id: 'phase-3',
      threshold: 0.25,
      label: 'Phase 3 · Mine Bloom',
      supportLaser: false,
      pattern: mineBloomPattern,
    },
    {
      id: 'phase-4',
      threshold: 0,
      label: 'Phase 4 · Leviathan Collapse',
      supportLaser: true,
      pattern: leviathanCollapsePattern,
    },
  ],
}

export function createStage3Definition(
  difficulty: Difficulty,
  options?: { fastStage?: boolean },
): StageDefinition {
  const fastMultiplier = options?.fastStage ? fastStageMultiplier : 1
  const scaleTime = (value: number) => Number((value * fastMultiplier).toFixed(2))
  const waves = baseWavePlacements.map((placement) => resolveEnemyWave(difficulty, placement))
  const midboss = scaleBossDefinition(baseMidboss, difficulty)
  const boss = scaleBossDefinition(baseBoss, difficulty)
  const firstHalf = waves.slice(0, 7)
  const secondHalf = waves.slice(7)
  const firstHalfPlacements = baseWavePlacements.slice(0, 7)
  const secondHalfPlacements = baseWavePlacements.slice(7)
  const secondHalfEvents: StageEvent[] = secondHalf.map((wave, index) => ({
    id: `${wave.id}-event`,
    trigger: {
      type: 'timeAfterDefeated',
      at: secondHalfPlacements[index]!.at,
      target: midboss.id,
      delay: secondHalfPlacements[index]!.at - midbossAt,
    },
    actions: [{ type: 'spawnWave', wave }],
  }))
  const events = [
    ...createTimedWaveEvents(firstHalfPlacements, firstHalf),
    createTimeBossEvent(midboss, 'midboss', midbossAt),
    ...secondHalfEvents,
    {
      id: `${boss.id}-spawn`,
      trigger: {
        type: 'timeAfterDefeated',
        at: finalBossAt,
        target: midboss.id,
        delay: finalBossAt - midbossAt,
      },
      actions: [{ type: 'spawnBoss', boss, role: 'final' }],
    } satisfies StageEvent,
    createVictoryEvent(boss.id),
  ].map((event) => scaleEventTime(event, fastMultiplier))

  return {
    id: 'abyssal-biomech-trench',
    stageNumber: 3,
    backgroundTheme: 'abyssal-biomech',
    name: 'Abyssal Biomech Trench',
    lore: '심해 생체기계 해구에서 압력 미끼를 끊어내고 레비아탄 코어의 붕괴 신호를 침묵시킨다.',
    duration: scaleTime(250),
    events,
  }
}
