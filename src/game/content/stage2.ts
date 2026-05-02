import { scaleBossDefinition } from './bossScaling'
import { resolveEnemyWave } from './enemies'
import {
  createBossEventAfterResolved,
  createSequentialWaveEvents,
  createVictoryEvent,
  scaleEventTime,
} from './stageEvents'
import type {
  BossDefinition,
  Difficulty,
  StageEvent,
  StageDefinition,
} from '../types'

type MidbossAuthoringDefinition = BossDefinition & { gateWaveCount: number }

const firstWaveAt = 1.8
const waveDelayAfterResolved = 1.25
const midbossDelayAfterResolved = 1.5
const postMidbossWaveDelayAfterDefeated = 1.5
const finalBossDelayAfterResolved = 2

const baseWavePlacements = [
  {
    id: 'wave-1',
    archetype: 'scout',
    variant: 'brass-cloud-scout',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-2',
    archetype: 'sentinel',
    variant: 'brass-cloud-sentinel',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-3',
    archetype: 'lancer',
    variant: 'brass-cloud-lancer',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-4',
    archetype: 'splitter',
    variant: 'brass-cloud-splitter',
    count: 18,
    spacing: 0.33,
  },
  {
    id: 'wave-5',
    archetype: 'mine-layer',
    variant: 'brass-cloud-mine-layer',
    count: 18,
    spacing: 0.33,
  },
  {
    id: 'wave-6',
    archetype: 'weaver',
    variant: 'brass-cloud-weaver',
    count: 18,
    spacing: 0.33,
  },
  {
    id: 'wave-7',
    archetype: 'scout',
    variant: 'brass-cloud-scout',
    count: 24,
    spacing: 0.25,
    pattern: { count: 7, spread: 1.45 },
  },
  {
    id: 'wave-8',
    archetype: 'weaver',
    variant: 'brass-cloud-weaver',
    count: 24,
    spacing: 0.25,
    pattern: { count: 8, interval: 1.05 },
  },
  {
    id: 'wave-9',
    archetype: 'scout',
    variant: 'brass-cloud-scout',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-10',
    archetype: 'sentinel',
    variant: 'brass-cloud-sentinel',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-11',
    archetype: 'lancer',
    variant: 'brass-cloud-lancer',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-12',
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
      pattern: { shape: 'wave', count: 11, interval: 0.78, speed: 1.2, spread: 1.1, life: 8.4 },
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
      pattern: { shape: 'fan', count: 10, interval: 0.88, speed: 1.18, spread: 1.7, life: 8 },
    },
    {
      id: 'phase-2',
      threshold: 0.34,
      label: 'Phase 2 · Ruin Spiral',
      supportLaser: false,
      pattern: { shape: 'spiral', count: 12, interval: 0.76, speed: 1.24, spread: 0.44, life: 8.4 },
    },
    {
      id: 'phase-3',
      threshold: 0,
      label: 'Phase 3 · Citadel Collapse',
      supportLaser: true,
      pattern: { shape: 'laser-bloom', count: 14, interval: 0.62, speed: 1.38, spread: 0.52, life: 9 },
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
  const { gateWaveCount: _gateWaveCount, ...midboss } = scaledMidboss
  const firstHalf = waves.slice(0, midbossGateWaveCount)
  const secondHalf = waves.slice(midbossGateWaveCount)
  const firstHalfEvents = createSequentialWaveEvents(firstHalf, {
    firstAt: firstWaveAt,
    delayAfterResolved: waveDelayAfterResolved,
  })
  const secondHalfEvents: StageEvent[] = secondHalf.map((wave, index) => ({
    id: `${wave.id}-event`,
    trigger:
      index === 0
        ? {
            type: 'afterDefeated',
            target: scaledMidboss.id,
            delay: postMidbossWaveDelayAfterDefeated,
          }
        : {
            type: 'afterResolved',
            target: secondHalf[index - 1]!.id,
            delay: waveDelayAfterResolved,
          },
    actions: [{ type: 'spawnWave', wave }],
  }))
  const events = [
    ...firstHalfEvents,
    createBossEventAfterResolved(
      midboss,
      'midboss',
      firstHalf[firstHalf.length - 1]!.id,
      midbossDelayAfterResolved,
    ),
    ...secondHalfEvents,
    createBossEventAfterResolved(
      boss,
      'final',
      waves[waves.length - 1]!.id,
      finalBossDelayAfterResolved,
    ),
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
