import { brassCloudEnemyFrames } from './enemyBrassCloudAtlas'
import type {
  BulletPatternConfig,
  Difficulty,
  EnemyArchetypeId,
  EnemyMovementConfig,
  EnemyVariantId,
  EnemyWave,
  SpawnGroupResolution,
} from '../types'

type EnemyArchetypeDefinition = {
  id: EnemyArchetypeId
  hp: number
  speed: number
  scale: number
  hitRadius: number
  path: EnemyWave['path']
  pattern: BulletPatternConfig
}

type EnemyThemeVariant = {
  id: EnemyVariantId
  archetype: EnemyArchetypeId
  theme: 'brass-cloud'
  atlasId: 'enemy-brass-cloud'
  frameId: EnemyArchetypeId
  displayName: string
  patternOverride?: Partial<BulletPatternConfig>
}

type StageEnemyPlacement = {
  id: string
  startAt: number
  archetype: EnemyArchetypeId
  variant: EnemyVariantId
  count: number
  spacing: number
  hp?: number
  speed?: number
  path?: EnemyWave['path']
  movement?: EnemyMovementConfig
  resolution?: SpawnGroupResolution
  pattern?: Partial<BulletPatternConfig>
}

const tuningByDifficulty: Record<
  Difficulty,
  {
    hp: number
    bulletCount: number
    bulletSpeed: number
    interval: number
    spread: number
    splitCount: number
    waveAmplitude: number
  }
> = {
  easy: {
    hp: 1,
    bulletCount: 0.72,
    bulletSpeed: 0.86,
    interval: 1.28,
    spread: 0.72,
    splitCount: 0.5,
    waveAmplitude: 0.7,
  },
  normal: {
    hp: 1.12,
    bulletCount: 1.08,
    bulletSpeed: 1.08,
    interval: 0.92,
    spread: 1,
    splitCount: 1,
    waveAmplitude: 1,
  },
  hard: {
    hp: 1.28,
    bulletCount: 1.22,
    bulletSpeed: 1.18,
    interval: 0.82,
    spread: 1.12,
    splitCount: 1.35,
    waveAmplitude: 1.12,
  },
}

export const enemyArchetypes: Record<EnemyArchetypeId, EnemyArchetypeDefinition> = {
  scout: {
    id: 'scout',
    hp: 14,
    speed: 0.86,
    scale: 0.82,
    hitRadius: 0.33,
    path: 'swoop-left',
    pattern: {
      shape: 'fan',
      count: 5,
      interval: 1.25,
      speed: 1.15,
      spread: 1.18,
      life: 7.5,
    },
  },
  sentinel: {
    id: 'sentinel',
    hp: 26,
    speed: 0.62,
    scale: 0.92,
    hitRadius: 0.38,
    path: 'helix',
    pattern: {
      shape: 'ring',
      count: 7,
      interval: 1.7,
      speed: 0.96,
      spread: 0.35,
      life: 8.2,
    },
  },
  lancer: {
    id: 'lancer',
    hp: 18,
    speed: 0.73,
    scale: 0.86,
    hitRadius: 0.34,
    path: 'swoop-right',
    pattern: {
      shape: 'needle',
      count: 3,
      interval: 1.35,
      speed: 1.55,
      spread: 0.22,
      life: 6.8,
      aim: 'player',
    },
  },
  splitter: {
    id: 'splitter',
    hp: 20,
    speed: 0.68,
    scale: 0.88,
    hitRadius: 0.36,
    path: 'swoop-left',
    pattern: {
      shape: 'split',
      count: 4,
      interval: 1.5,
      speed: 1.08,
      spread: 0.74,
      life: 8,
      split: { delay: 0.55, count: 2, speedMultiplier: 0.78 },
    },
  },
  'mine-layer': {
    id: 'mine-layer',
    hp: 24,
    speed: 0.57,
    scale: 0.9,
    hitRadius: 0.38,
    path: 'helix',
    pattern: {
      shape: 'mine',
      count: 3,
      interval: 1.85,
      speed: 0.58,
      spread: 0.9,
      life: 7.2,
    },
  },
  weaver: {
    id: 'weaver',
    hp: 19,
    speed: 0.77,
    scale: 0.84,
    hitRadius: 0.34,
    path: 'helix',
    pattern: {
      shape: 'wave',
      count: 6,
      interval: 1.18,
      speed: 1.05,
      spread: 1.2,
      life: 8.2,
      wave: { amplitude: 0.55, frequency: 2.4 },
    },
  },
}

export const brassCloudEnemyVariants: Record<EnemyVariantId, EnemyThemeVariant> = {
  'brass-cloud-scout': {
    id: 'brass-cloud-scout',
    archetype: 'scout',
    theme: 'brass-cloud',
    atlasId: 'enemy-brass-cloud',
    frameId: 'scout',
    displayName: 'Brass Scout',
  },
  'brass-cloud-sentinel': {
    id: 'brass-cloud-sentinel',
    archetype: 'sentinel',
    theme: 'brass-cloud',
    atlasId: 'enemy-brass-cloud',
    frameId: 'sentinel',
    displayName: 'Brass Sentinel',
  },
  'brass-cloud-lancer': {
    id: 'brass-cloud-lancer',
    archetype: 'lancer',
    theme: 'brass-cloud',
    atlasId: 'enemy-brass-cloud',
    frameId: 'lancer',
    displayName: 'Brass Lancer',
  },
  'brass-cloud-splitter': {
    id: 'brass-cloud-splitter',
    archetype: 'splitter',
    theme: 'brass-cloud',
    atlasId: 'enemy-brass-cloud',
    frameId: 'splitter',
    displayName: 'Brass Splitter',
  },
  'brass-cloud-mine-layer': {
    id: 'brass-cloud-mine-layer',
    archetype: 'mine-layer',
    theme: 'brass-cloud',
    atlasId: 'enemy-brass-cloud',
    frameId: 'mine-layer',
    displayName: 'Brass Mine Layer',
  },
  'brass-cloud-weaver': {
    id: 'brass-cloud-weaver',
    archetype: 'weaver',
    theme: 'brass-cloud',
    atlasId: 'enemy-brass-cloud',
    frameId: 'weaver',
    displayName: 'Brass Weaver',
  },
}

export { brassCloudEnemyFrames }

export function resolvePatternForDifficulty(
  pattern: BulletPatternConfig,
  difficulty: Difficulty,
): BulletPatternConfig {
  const tuning = tuningByDifficulty[difficulty]
  const minimumCount = pattern.shape === 'ring' ? 4 : 2

  return {
    ...pattern,
    count: Math.max(minimumCount, Math.round(pattern.count * tuning.bulletCount)),
    interval: Number((pattern.interval * tuning.interval).toFixed(2)),
    speed: Number((pattern.speed * tuning.bulletSpeed).toFixed(2)),
    spread: Number((pattern.spread * tuning.spread).toFixed(2)),
    split:
      pattern.split === undefined
        ? undefined
        : {
            ...pattern.split,
            count: Math.max(1, Math.round(pattern.split.count * tuning.splitCount)),
          },
    wave:
      pattern.wave === undefined
        ? undefined
        : {
            ...pattern.wave,
            amplitude: Number((pattern.wave.amplitude * tuning.waveAmplitude).toFixed(2)),
          },
  }
}

export function resolveEnemyWave(
  difficulty: Difficulty,
  placement: StageEnemyPlacement,
): EnemyWave {
  const archetype = enemyArchetypes[placement.archetype]
  const variant = brassCloudEnemyVariants[placement.variant]

  if (variant.archetype !== archetype.id) {
    throw new Error(
      `Enemy placement ${placement.id} uses archetype ${archetype.id} with variant ${variant.id} for archetype ${variant.archetype}`,
    )
  }

  const mergedPattern = {
    ...archetype.pattern,
    ...variant.patternOverride,
    ...placement.pattern,
  }
  const tuning = tuningByDifficulty[difficulty]

  return {
    id: placement.id,
    startAt: placement.startAt,
    kind: variant.id,
    archetype: archetype.id,
    variant: variant.id,
    atlasId: variant.atlasId,
    frameId: variant.frameId,
    count: placement.count,
    spacing: placement.spacing,
    hp: placement.hp ?? Math.round(archetype.hp * tuning.hp),
    speed: placement.speed ?? archetype.speed,
    movement:
      placement.movement ??
      ({
        type: 'flyThrough',
        path: placement.path ?? archetype.path,
        speed: placement.speed ?? archetype.speed,
      } satisfies EnemyMovementConfig),
    resolution: placement.resolution ?? { type: 'allInactive' },
    scale: archetype.scale,
    hitRadius: archetype.hitRadius,
    path: placement.path ?? archetype.path,
    pattern: resolvePatternForDifficulty(mergedPattern, difficulty),
  }
}
