import { resolveEnemyWave } from './enemies'
import type {
  BossDefinition,
  BulletPatternConfig,
  Difficulty,
  MidbossDefinition,
  StageDefinition,
} from '../types'

const baseWavePlacements = [
  {
    id: 'wave-1',
    startAt: 1.8,
    archetype: 'scout',
    variant: 'brass-cloud-scout',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-2',
    startAt: 8.5,
    archetype: 'sentinel',
    variant: 'brass-cloud-sentinel',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-3',
    startAt: 15.6,
    archetype: 'lancer',
    variant: 'brass-cloud-lancer',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-4',
    startAt: 23,
    archetype: 'splitter',
    variant: 'brass-cloud-splitter',
    count: 18,
    spacing: 0.33,
  },
  {
    id: 'wave-5',
    startAt: 31,
    archetype: 'mine-layer',
    variant: 'brass-cloud-mine-layer',
    count: 18,
    spacing: 0.33,
  },
  {
    id: 'wave-6',
    startAt: 39,
    archetype: 'weaver',
    variant: 'brass-cloud-weaver',
    count: 18,
    spacing: 0.33,
  },
  {
    id: 'wave-7',
    startAt: 54,
    archetype: 'scout',
    variant: 'brass-cloud-scout',
    count: 24,
    spacing: 0.25,
    pattern: { count: 7, spread: 1.45 },
  },
  {
    id: 'wave-8',
    startAt: 62,
    archetype: 'weaver',
    variant: 'brass-cloud-weaver',
    count: 24,
    spacing: 0.25,
    pattern: { count: 8, interval: 1.05 },
  },
  {
    id: 'wave-9',
    startAt: 70,
    archetype: 'scout',
    variant: 'brass-cloud-scout',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-10',
    startAt: 78,
    archetype: 'sentinel',
    variant: 'brass-cloud-sentinel',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-11',
    startAt: 86,
    archetype: 'lancer',
    variant: 'brass-cloud-lancer',
    count: 14,
    spacing: 0.42,
  },
  {
    id: 'wave-12',
    startAt: 94,
    archetype: 'splitter',
    variant: 'brass-cloud-splitter',
    count: 18,
    spacing: 0.33,
  },
] as const

const baseMidboss: MidbossDefinition = {
  id: 'midboss-ember-gate',
  startAt: 47,
  gateAfterWaveIndex: 5,
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
  startAt: 106,
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

const bossTuningByDifficulty: Record<
  Difficulty,
  { bulletCount: number; bulletSpeed: number; interval: number }
> = {
  easy: { bulletCount: 1, bulletSpeed: 1, interval: 1 },
  normal: { bulletCount: 1.08, bulletSpeed: 1.08, interval: 0.92 },
  hard: { bulletCount: 1.2, bulletSpeed: 1.18, interval: 0.82 },
}

function scaleBossPattern(
  pattern: BulletPatternConfig,
  difficulty: Difficulty,
): BulletPatternConfig {
  const tuning = bossTuningByDifficulty[difficulty]

  return {
    ...pattern,
    count: Math.max(3, Math.round(pattern.count * tuning.bulletCount)),
    interval: Number((pattern.interval * tuning.interval).toFixed(2)),
    speed: Number((pattern.speed * tuning.bulletSpeed).toFixed(2)),
  }
}

function scaleBoss<TBoss extends BossDefinition>(boss: TBoss, difficulty: Difficulty): TBoss {
  return {
    ...boss,
    phases: boss.phases.map((phase) => ({
      ...phase,
      pattern: scaleBossPattern(phase.pattern, difficulty),
    })),
  }
}

export function createStage2Definition(
  difficulty: Difficulty,
  options?: { fastStage?: boolean },
): StageDefinition {
  const fastMultiplier = options?.fastStage ? 0.22 : 1
  const scaleTime = (value: number) => Number((value * fastMultiplier).toFixed(2))
  const midboss = scaleBoss(baseMidboss, difficulty)
  const boss = scaleBoss(baseBoss, difficulty)

  return {
    id: 'burning-ruin-corridor',
    stageNumber: 2,
    backgroundTheme: 'burning-ruins',
    name: 'Burning Ruin Corridor',
    lore: '전쟁 뒤 불타는 폐허 회랑을 돌파하고 잿빛 성채 코어를 붕괴시킨다.',
    duration: scaleTime(210),
    waves: baseWavePlacements.map((placement) => ({
      ...resolveEnemyWave(difficulty, placement),
      startAt: scaleTime(placement.startAt),
    })),
    midboss: {
      ...midboss,
      startAt: scaleTime(midboss.startAt),
    },
    boss: {
      ...boss,
      startAt: scaleTime(boss.startAt),
    },
  }
}
