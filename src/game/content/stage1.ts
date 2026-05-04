import { scaleBossDefinition } from './bossScaling'
import { resolveEnemyWave } from './enemies'
import {
  createTimedWaveEvents,
  createTimeBossEvent,
  createVictoryEvent,
  scaleEventTime,
} from './stageEvents'
import type { BossDefinition, Difficulty, StageDefinition } from '../types'

const finalBossAt = 44.8

const baseWavePlacements = [
  {
    id: 'wave-1',
    at: 1.8,
    archetype: 'scout',
    variant: 'brass-cloud-scout',
    count: 7,
    spacing: 0.86,
    formation: { type: 'line', side: 'top' },
  },
  {
    id: 'wave-2',
    at: 6.8,
    archetype: 'sentinel',
    variant: 'brass-cloud-sentinel',
    count: 7,
    spacing: 0.82,
    formation: { type: 'vee', side: 'top', depth: 0.22 },
  },
  {
    id: 'wave-3',
    at: 11.8,
    archetype: 'lancer',
    variant: 'brass-cloud-lancer',
    count: 7,
    spacing: 0.86,
    formation: { type: 'arc', side: 'top', depth: 0.08, bend: 0.18 },
  },
  {
    id: 'wave-4',
    at: 16.8,
    archetype: 'splitter',
    variant: 'brass-cloud-splitter',
    count: 9,
    spacing: 0.7,
    formation: { type: 'grid', side: 'top', columns: 3, rowGap: 0.24 },
  },
  {
    id: 'wave-5',
    at: 21.8,
    archetype: 'mine-layer',
    variant: 'brass-cloud-mine-layer',
    count: 9,
    spacing: 0.68,
    formation: { type: 'column', side: 'left', depth: 0.26 },
    movement: { type: 'enterAndStrafe', entrySpeed: 1.05, holdZ: 1.45, strafeSpeed: 0.65, strafeRange: 0.45 },
    resolution: { type: 'timeout', seconds: 7, then: 'forceEscape' },
  },
  {
    id: 'wave-6',
    at: 26.8,
    archetype: 'weaver',
    variant: 'brass-cloud-weaver',
    count: 9,
    spacing: 0.66,
    formation: { type: 'vee', side: 'right', depth: 0.2 },
    movement: { type: 'enterAndStrafe', entrySpeed: 1.08, holdZ: 1.35, strafeSpeed: 0.72, strafeRange: 0.5 },
    resolution: { type: 'timeout', seconds: 7, then: 'forceEscape' },
  },
  {
    id: 'wave-7',
    at: 31.8,
    archetype: 'scout',
    variant: 'brass-cloud-scout',
    count: 12,
    spacing: 0.52,
    formation: { type: 'arc', side: 'top', depth: 0.1, bend: 0.16 },
    pattern: { count: 7, spread: 1.45 },
  },
  {
    id: 'wave-8',
    at: 36.8,
    archetype: 'weaver',
    variant: 'brass-cloud-weaver',
    count: 12,
    spacing: 0.5,
    formation: { type: 'grid', side: 'right', columns: 4, rowGap: 0.22 },
    movement: { type: 'enterAndStrafe', entrySpeed: 1.12, holdZ: 1.25, strafeSpeed: 0.84, strafeRange: 0.62 },
    resolution: { type: 'timeout', seconds: 8, then: 'forceEscape' },
    pattern: { count: 8, interval: 1.05 },
  },
] as const

const baseBoss: BossDefinition = {
  id: 'boss-brass-core',
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
  const boss = scaleBossDefinition(baseBoss, difficulty)
  const events = [
    ...createTimedWaveEvents(baseWavePlacements, waves),
    createTimeBossEvent(boss, 'final', finalBossAt),
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
