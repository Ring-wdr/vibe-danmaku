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
  easy: { bulletCount: 1, bulletSpeed: 1, interval: 1, rank: 0.28 },
  normal: { bulletCount: 1.08, bulletSpeed: 1.08, interval: 0.92, rank: 0.5 },
  hard: { bulletCount: 1.2, bulletSpeed: 1.18, interval: 0.82, rank: 0.78 },
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
