import { scaleBossDefinition } from './bossScaling'
import { resolveEnemyWave } from './enemies'
import {
  createBossEventAfterResolved,
  createSequentialWaveEvents,
  createVictoryEvent,
  scaleEventTime,
} from './stageEvents'
import type { BossDefinition, Difficulty, StageDefinition } from '../types'

type TimedBossDefinition = BossDefinition & { spawnAt: number }

const baseWavePlacements = [
  {
    id: 'wave-1',
    eventAt: 1.8,
    archetype: 'scout',
    variant: 'brass-cloud-scout',
    count: 7,
    spacing: 0.86,
  },
  {
    id: 'wave-2',
    eventAt: 10.5,
    archetype: 'sentinel',
    variant: 'brass-cloud-sentinel',
    count: 7,
    spacing: 0.82,
  },
  {
    id: 'wave-3',
    eventAt: 19,
    archetype: 'lancer',
    variant: 'brass-cloud-lancer',
    count: 7,
    spacing: 0.86,
  },
  {
    id: 'wave-4',
    eventAt: 28,
    archetype: 'splitter',
    variant: 'brass-cloud-splitter',
    count: 9,
    spacing: 0.7,
  },
  {
    id: 'wave-5',
    eventAt: 38,
    archetype: 'mine-layer',
    variant: 'brass-cloud-mine-layer',
    count: 9,
    spacing: 0.68,
  },
  {
    id: 'wave-6',
    eventAt: 48,
    archetype: 'weaver',
    variant: 'brass-cloud-weaver',
    count: 9,
    spacing: 0.66,
  },
  {
    id: 'wave-7',
    eventAt: 58,
    archetype: 'scout',
    variant: 'brass-cloud-scout',
    count: 12,
    spacing: 0.52,
    pattern: { count: 7, spread: 1.45 },
  },
  {
    id: 'wave-8',
    eventAt: 68,
    archetype: 'weaver',
    variant: 'brass-cloud-weaver',
    count: 12,
    spacing: 0.5,
    pattern: { count: 8, interval: 1.05 },
  },
] as const

const baseBoss: TimedBossDefinition = {
  id: 'boss-brass-core',
  spawnAt: 78,
  hp: 960,
  phases: [
    {
      id: 'phase-1',
      threshold: 0.68,
      label: 'Phase 1 · Brass Fan',
      supportLaser: false,
      pattern: { shape: 'fan', count: 8, interval: 0.95, speed: 1.12, spread: 1.8, life: 8 },
    },
    {
      id: 'phase-2',
      threshold: 0.34,
      label: 'Phase 2 · Halo Wheel',
      supportLaser: false,
      pattern: { shape: 'spiral', count: 10, interval: 0.82, speed: 1.18, spread: 0.42, life: 8.2 },
    },
    {
      id: 'phase-3',
      threshold: 0,
      label: 'Phase 3 · Arc Furnace',
      supportLaser: true,
      pattern: { shape: 'laser-bloom', count: 12, interval: 0.68, speed: 1.34, spread: 0.5, life: 8.8 },
    },
  ],
}

export function createStageDefinition(
  difficulty: Difficulty,
  options?: { fastStage?: boolean },
): StageDefinition {
  const fastMultiplier = options?.fastStage ? 0.22 : 1
  const scaleTime = (value: number) => Number((value * fastMultiplier).toFixed(2))
  const waves = baseWavePlacements.map((placement) => resolveEnemyWave(difficulty, placement))
  const { spawnAt: _spawnAt, ...boss } = scaleBossDefinition(baseBoss, difficulty)
  const events = [
    ...createSequentialWaveEvents(waves, {
      firstAt: baseWavePlacements[0]!.eventAt,
      delayAfterResolved: 1.5,
    }),
    createBossEventAfterResolved(boss, 'final', waves[waves.length - 1]!.id, 2),
    createVictoryEvent(boss.id),
  ].map((event) => scaleEventTime(event, fastMultiplier))

  return {
    id: 'brass-cloud-gate',
    stageNumber: 1,
    backgroundTheme: 'brass-cloud',
    name: 'Brass Cloud Gate',
    lore: '황동 비공정 항로 위를 뒤덮은 마도 구름 회랑을 돌파해 비공정 코어를 파괴한다.',
    duration: scaleTime(165),
    events,
  }
}
