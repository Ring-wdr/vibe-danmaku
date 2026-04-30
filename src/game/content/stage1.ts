import { gameAssets } from '../assets'
import type {
  BossDefinition,
  BulletPatternConfig,
  CharacterDefinition,
  Difficulty,
  EnemyWave,
  StageDefinition,
} from '../types'

const baseWaves: EnemyWave[] = [
  {
    id: 'wave-1',
    startAt: 1.8,
    kind: 'steam-scout',
    count: 3,
    spacing: 1.8,
    hp: 14,
    speed: 0.72,
    path: 'swoop-left',
    pattern: { shape: 'fan', count: 5, interval: 1.35, speed: 1.15, spread: 1.2, life: 7.5 },
  },
  {
    id: 'wave-2',
    startAt: 23,
    kind: 'feather-drone',
    count: 4,
    spacing: 1.5,
    hp: 18,
    speed: 0.66,
    path: 'helix',
    pattern: { shape: 'ring', count: 8, interval: 1.6, speed: 1.05, spread: 0.35, life: 8.5 },
  },
  {
    id: 'wave-3',
    startAt: 46,
    kind: 'steam-scout',
    count: 5,
    spacing: 1.3,
    hp: 20,
    speed: 0.8,
    path: 'swoop-right',
    pattern: { shape: 'fan', count: 7, interval: 1.1, speed: 1.25, spread: 1.5, life: 8.5 },
  },
]

const baseBoss: BossDefinition = {
  id: 'boss-brass-core',
  startAt: 78,
  hp: 960,
  phases: [
    {
      id: 'phase-1',
      threshold: 0.68,
      label: 'Phase 1 · Brass Fan',
      supportLaser: false,
      pattern: { shape: 'fan', count: 9, interval: 0.95, speed: 1.12, spread: 1.8, life: 8 },
    },
    {
      id: 'phase-2',
      threshold: 0.34,
      label: 'Phase 2 · Halo Wheel',
      supportLaser: false,
      pattern: { shape: 'spiral', count: 12, interval: 0.82, speed: 1.18, spread: 0.42, life: 8.2 },
    },
    {
      id: 'phase-3',
      threshold: 0,
      label: 'Phase 3 · Arc Furnace',
      supportLaser: true,
      pattern: { shape: 'laser-bloom', count: 14, interval: 0.68, speed: 1.34, spread: 0.5, life: 8.8 },
    },
  ],
}

const tuningByDifficulty: Record<
  Difficulty,
  { bulletCount: number; bulletSpeed: number; interval: number }
> = {
  easy: { bulletCount: 1, bulletSpeed: 1, interval: 1 },
  normal: { bulletCount: 1.25, bulletSpeed: 1.08, interval: 0.92 },
  hard: { bulletCount: 1.5, bulletSpeed: 1.18, interval: 0.82 },
}

function scalePattern(pattern: BulletPatternConfig, difficulty: Difficulty): BulletPatternConfig {
  const tuning = tuningByDifficulty[difficulty]

  return {
    ...pattern,
    count: Math.max(3, Math.round(pattern.count * tuning.bulletCount)),
    interval: Number((pattern.interval * tuning.interval).toFixed(2)),
    speed: Number((pattern.speed * tuning.bulletSpeed).toFixed(2)),
  }
}

export function createStageDefinition(
  difficulty: Difficulty,
  options?: { fastStage?: boolean },
): StageDefinition {
  const fastMultiplier = options?.fastStage ? 0.22 : 1
  const scaleTime = (value: number) => Number((value * fastMultiplier).toFixed(2))

  return {
    id: 'brass-cloud-gate',
    name: 'Brass Cloud Gate',
    lore: '황동 비공정 항로 위를 뒤덮은 마도 구름 회랑을 돌파해 비공정 코어를 파괴한다.',
    duration: scaleTime(165),
    waves: baseWaves.map((wave) => ({
      ...wave,
      startAt: scaleTime(wave.startAt),
      pattern: scalePattern(wave.pattern, difficulty),
    })),
    boss: {
      ...baseBoss,
      startAt: scaleTime(baseBoss.startAt),
      phases: baseBoss.phases.map((phase) => ({
        ...phase,
        pattern: scalePattern(phase.pattern, difficulty),
      })),
    },
  }
}

export const stagePilot: CharacterDefinition = {
  id: 'lyra-aer',
  name: 'Lyra Aer',
  title: 'Aether Weaver',
  spriteSheetUrl: gameAssets.playerSheetUrl,
  frameCount: 4,
  moveRadius: {
    x: 2.8,
    minZ: -2.6,
    maxZ: -0.45,
  },
  shot: {
    interval: 0.12,
    speed: 5.4,
    power: 12,
  },
}
