import type {
  BossBulletPatternConfig,
  BossDefinition,
  BulletmlPatternConfig,
  Difficulty,
} from '../types'

const bossTuningByDifficulty: Record<
  Difficulty,
  { bulletCount: number; bulletSpeed: number; interval: number; rank: number }
> = {
  easy: { bulletCount: 0.74, bulletSpeed: 0.85, interval: 1.28, rank: 0.18 },
  normal: { bulletCount: 0.94, bulletSpeed: 0.98, interval: 1.06, rank: 0.42 },
  hard: { bulletCount: 1.12, bulletSpeed: 1.12, interval: 0.92, rank: 0.7 },
}

function isScriptedPattern(
  pattern: BossBulletPatternConfig,
): pattern is BulletmlPatternConfig {
  return 'engine' in pattern && pattern.engine === 'bulletml'
}

export function scaleBossPattern(
  pattern: BossBulletPatternConfig,
  difficulty: Difficulty,
): BossBulletPatternConfig {
  const tuning = bossTuningByDifficulty[difficulty]

  if (isScriptedPattern(pattern)) {
    return {
      ...pattern,
      interval: Number((pattern.interval * tuning.interval).toFixed(2)),
      rank: tuning.rank,
    }
  }

  return {
    ...pattern,
    count: Math.max(3, Math.round(pattern.count * tuning.bulletCount)),
    interval: Number((pattern.interval * tuning.interval).toFixed(2)),
    speed: Number((pattern.speed * tuning.bulletSpeed).toFixed(2)),
  }
}

export function scaleBossDefinition<TBoss extends BossDefinition>(
  boss: TBoss,
  difficulty: Difficulty,
): TBoss {
  return {
    ...boss,
    phases: boss.phases.map((phase) => ({
      ...phase,
      pattern: scaleBossPattern(phase.pattern, difficulty),
    })),
  }
}
