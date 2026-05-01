import type { BossDefinition, BulletPatternConfig, Difficulty } from '../types'

const bossTuningByDifficulty: Record<
  Difficulty,
  { bulletCount: number; bulletSpeed: number; interval: number }
> = {
  easy: { bulletCount: 1, bulletSpeed: 1, interval: 1 },
  normal: { bulletCount: 1.08, bulletSpeed: 1.08, interval: 0.92 },
  hard: { bulletCount: 1.2, bulletSpeed: 1.18, interval: 0.82 },
}

export function scaleBossPattern(
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
