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

const midbossAt = 38.4
const finalBossAt = 82.4
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
  radius: 0.086,
  glow: 1.48,
  life: 8.4,
} as const

const knightLancePattern = {
  engine: 'bulletml',
  interval: 0.58,
  loop: true,
  bullet: { ...scriptedBulletDefaults, radius: 0.078, life: 7.6 },
  action: [
    {
      type: 'repeat',
      times: rankScale(50, 32),
      actions: [
        {
          type: 'fire',
          direction: { type: 'aim', degrees: -18 },
          speed: { type: 'absolute', value: rankScale(1.08, 0.36) },
        },
        {
          type: 'fire',
          direction: { type: 'aim', degrees: 18 },
          speed: { type: 'absolute', value: rankScale(1.08, 0.36) },
        },
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: 42 },
          speed: { type: 'absolute', value: rankScale(0.72, 0.22) },
          actions: [
            { type: 'wait', seconds: 0.5 },
            {
              type: 'changeSpeed',
              speed: { type: 'relative', value: rankScale(0.28, 0.16) },
              term: 0.42,
            },
          ],
        },
        { type: 'wait', seconds: rankWait(0.16, 0.04) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const shieldWheelPattern = {
  engine: 'bulletml',
  interval: 0.64,
  loop: true,
  bullet: { ...scriptedBulletDefaults, radius: 0.094, glow: 1.56, life: 9.2 },
  action: [
    {
      type: 'repeat',
      times: rankScale(64, 36),
      actions: [
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: rankScale(28, 4) },
          speed: { type: 'absolute', value: rankScale(0.68, 0.26) },
          actions: [
            { type: 'wait', seconds: 0.58 },
            {
              type: 'changeDirection',
              direction: { type: 'relative', degrees: -32 },
              term: 0.52,
            },
          ],
        },
        { type: 'wait', seconds: rankWait(0.12, 0.03) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const tribunalRushPattern = {
  engine: 'bulletml',
  interval: 0.52,
  loop: true,
  bullet: { ...scriptedBulletDefaults, radius: 0.082, glow: 1.66, life: 8.8 },
  action: [
    {
      type: 'repeat',
      times: rankScale(70, 44),
      actions: [
        {
          type: 'fire',
          direction: { type: 'aim', degrees: -30 },
          speed: { type: 'absolute', value: rankScale(1.12, 0.42) },
          actions: [
            { type: 'wait', seconds: 0.34 },
            {
              type: 'changeDirection',
              direction: { type: 'relative', degrees: 18 },
              term: 0.42,
            },
          ],
        },
        {
          type: 'fire',
          direction: { type: 'aim', degrees: 30 },
          speed: { type: 'absolute', value: rankScale(1.12, 0.42) },
          actions: [
            { type: 'wait', seconds: 0.34 },
            {
              type: 'changeDirection',
              direction: { type: 'relative', degrees: -18 },
              term: 0.42,
            },
          ],
        },
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: 60 },
          speed: { type: 'absolute', value: rankScale(0.62, 0.24) },
          radius: 0.072,
          life: 6.8,
        },
        { type: 'wait', seconds: rankWait(0.11, 0.03) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const leftDrawPattern = {
  engine: 'bulletml',
  interval: 0.58,
  loop: true,
  bullet: { ...scriptedBulletDefaults, radius: 0.078, life: 8 },
  action: [
    {
      type: 'repeat',
      times: rankScale(58, 34),
      actions: [
        {
          type: 'fire',
          direction: { type: 'aim', degrees: -26 },
          speed: { type: 'absolute', value: rankScale(1.02, 0.36) },
        },
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: rankScale(34, 4) },
          speed: { type: 'absolute', value: rankScale(0.7, 0.24) },
        },
        { type: 'wait', seconds: rankWait(0.13, 0.032) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const rightDrawPattern = {
  engine: 'bulletml',
  interval: 0.56,
  loop: true,
  bullet: { ...scriptedBulletDefaults, radius: 0.078, life: 8 },
  action: [
    {
      type: 'repeat',
      times: rankScale(62, 36),
      actions: [
        {
          type: 'fire',
          direction: { type: 'aim', degrees: 26 },
          speed: { type: 'absolute', value: rankScale(1.04, 0.38) },
        },
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: rankScale(-34, -4) },
          speed: { type: 'absolute', value: rankScale(0.72, 0.24) },
        },
        { type: 'wait', seconds: rankWait(0.12, 0.03) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const crossfireWaltzPattern = {
  engine: 'bulletml',
  interval: 0.5,
  loop: true,
  bullet: { ...scriptedBulletDefaults, radius: 0.082, glow: 1.62, life: 8.8 },
  action: [
    {
      type: 'repeat',
      times: rankScale(76, 44),
      actions: [
        {
          type: 'fire',
          direction: { type: 'aim', degrees: -34 },
          speed: { type: 'absolute', value: rankScale(1.0, 0.4) },
          actions: [
            { type: 'wait', seconds: 0.38 },
            {
              type: 'changeDirection',
              direction: { type: 'relative', degrees: 26 },
              term: 0.48,
            },
          ],
        },
        {
          type: 'fire',
          direction: { type: 'aim', degrees: 34 },
          speed: { type: 'absolute', value: rankScale(1.0, 0.4) },
          actions: [
            { type: 'wait', seconds: 0.38 },
            {
              type: 'changeDirection',
              direction: { type: 'relative', degrees: -26 },
              term: 0.48,
            },
          ],
        },
        { type: 'wait', seconds: rankWait(0.1, 0.028) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const wingBarragePattern = {
  engine: 'bulletml',
  interval: 0.54,
  loop: true,
  bullet: { ...scriptedBulletDefaults, radius: 0.09, glow: 1.72, life: 9.2 },
  action: [
    {
      type: 'repeat',
      times: rankScale(82, 50),
      actions: [
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: rankScale(24, 3.5) },
          speed: { type: 'absolute', value: rankScale(0.68, 0.28) },
          actions: [
            { type: 'wait', seconds: 0.62 },
            {
              type: 'changeSpeed',
              speed: { type: 'absolute', value: rankScale(1.2, 0.44) },
              term: 0.46,
            },
          ],
        },
        {
          type: 'fire',
          direction: { type: 'aim', degrees: 0 },
          speed: { type: 'absolute', value: rankScale(0.92, 0.32) },
          radius: 0.072,
          life: 6.8,
        },
        { type: 'wait', seconds: rankWait(0.105, 0.03) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const lastDuelPattern = {
  engine: 'bulletml',
  interval: 0.46,
  loop: true,
  bullet: { ...scriptedBulletDefaults, radius: 0.088, glow: 1.82, life: 9.6 },
  action: [
    {
      type: 'repeat',
      times: rankScale(96, 58),
      actions: [
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: rankScale(19, 3) },
          speed: { type: 'absolute', value: rankScale(0.76, 0.34) },
          actions: [
            { type: 'wait', seconds: 0.42 },
            {
              type: 'changeDirection',
              direction: { type: 'relative', degrees: 38 },
              term: 0.52,
            },
          ],
        },
        {
          type: 'fire',
          direction: { type: 'aim', degrees: -22 },
          speed: { type: 'absolute', value: rankScale(1.18, 0.46) },
          radius: 0.072,
          life: 7.2,
        },
        {
          type: 'fire',
          direction: { type: 'aim', degrees: 22 },
          speed: { type: 'absolute', value: rankScale(1.18, 0.46) },
          radius: 0.072,
          life: 7.2,
        },
        { type: 'wait', seconds: rankWait(0.085, 0.024) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const baseWavePlacements = [
  { id: 'wave-1', at: 2, archetype: 'scout', variant: 'city-state-scout', count: 18, spacing: 0.34 },
  { id: 'wave-2', at: 7.2, archetype: 'sentinel', variant: 'city-state-sentinel', count: 16, spacing: 0.38 },
  { id: 'wave-3', at: 12.4, archetype: 'lancer', variant: 'city-state-lancer', count: 18, spacing: 0.34 },
  { id: 'wave-4', at: 17.6, archetype: 'splitter', variant: 'city-state-splitter', count: 20, spacing: 0.3 },
  { id: 'wave-5', at: 22.8, archetype: 'mine-layer', variant: 'city-state-mine-layer', count: 20, spacing: 0.3 },
  { id: 'wave-6', at: 28, archetype: 'weaver', variant: 'city-state-weaver', count: 20, spacing: 0.3 },
  { id: 'wave-7', at: 33.2, archetype: 'scout', variant: 'city-state-scout', count: 24, spacing: 0.26 },
  { id: 'wave-8', at: 43.2, archetype: 'weaver', variant: 'city-state-weaver', count: 24, spacing: 0.25 },
  { id: 'wave-9', at: 48.4, archetype: 'lancer', variant: 'city-state-lancer', count: 20, spacing: 0.3 },
  { id: 'wave-10', at: 53.6, archetype: 'splitter', variant: 'city-state-splitter', count: 22, spacing: 0.28 },
  { id: 'wave-11', at: 58.8, archetype: 'mine-layer', variant: 'city-state-mine-layer', count: 22, spacing: 0.28 },
  { id: 'wave-12', at: 64, archetype: 'sentinel', variant: 'city-state-sentinel', count: 18, spacing: 0.34 },
  { id: 'wave-13', at: 69.2, archetype: 'weaver', variant: 'city-state-weaver', count: 24, spacing: 0.25 },
  { id: 'wave-14', at: 74.4, archetype: 'scout', variant: 'city-state-scout', count: 28, spacing: 0.22 },
] as const

const baseMidboss: BossDefinition = {
  id: 'midboss-full-plate-knight',
  hp: 1320,
  phaseBreakDuration: 3,
  phases: [
    {
      id: 'phase-1',
      threshold: 0.66,
      label: 'Midboss · Lance Guard',
      supportLaser: false,
      pattern: knightLancePattern,
    },
    {
      id: 'phase-2',
      threshold: 0.33,
      label: 'Midboss · Shield Wheel',
      supportLaser: false,
      pattern: shieldWheelPattern,
    },
    {
      id: 'phase-3',
      threshold: 0,
      label: 'Midboss · Tribunal Rush',
      supportLaser: true,
      pattern: tribunalRushPattern,
    },
  ],
}

const baseBoss: BossDefinition = {
  id: 'boss-winged-gunslinger',
  hp: 11800,
  phaseBreakDuration: 3,
  phases: [
    {
      id: 'phase-1',
      threshold: 0.8,
      label: 'Phase 1 · Left Draw',
      supportLaser: false,
      pattern: leftDrawPattern,
    },
    {
      id: 'phase-2',
      threshold: 0.6,
      label: 'Phase 2 · Right Draw',
      supportLaser: false,
      pattern: rightDrawPattern,
    },
    {
      id: 'phase-3',
      threshold: 0.4,
      label: 'Phase 3 · Crossfire Waltz',
      supportLaser: false,
      pattern: crossfireWaltzPattern,
    },
    {
      id: 'phase-4',
      threshold: 0.2,
      label: 'Phase 4 · Wing Barrage',
      supportLaser: true,
      pattern: wingBarragePattern,
    },
    {
      id: 'phase-5',
      threshold: 0,
      label: 'Phase 5 · Last Duel',
      supportLaser: true,
      pattern: lastDuelPattern,
    },
  ],
}

export const stage4FinalBossAssetPrompt = [
  'Asset type: 2D sprite sheet for Vibe Danmaku final boss.',
  'Primary request: a winged gunslinger with dual pistols, silver-white hair, dark tactical fantasy outfit, blue accents, and confident duelist posture.',
  'Style: match the existing Vibe Danmaku generated asset style, anime-inspired, crisp readable silhouette, transparent-friendly cutout, high contrast dark outfit with luminous blue highlights.',
  'Sheet structure: five horizontal frames, one firing motion per boss phase: left-hand draw, right-hand draw, crossed dual-pistol fire, wing-open barrage, final overcharged duel pose.',
  'Constraints: text-only concept request, no watermark, no in-image text, avoid copying any specific character identity, preserve only the broad concept of white hair, dual pistols, dark blue-black outfit, and wings.',
].join('\n')

export function createStage4Definition(
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
    id: 'crowned-city-states',
    stageNumber: 4,
    backgroundTheme: 'city-states',
    name: 'Crowned City-States',
    lore: '중세 유럽풍 도시국가들의 성벽과 첨탑 사이를 돌파해 결투 의회를 장악한 날개 달린 건슬링어를 추적한다.',
    duration: scaleTime(270),
    events,
  }
}
