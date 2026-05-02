import type { BossDefinition, EnemyWave, StageEvent, StageTrigger } from '../types'

function roundTime(value: number) {
  return Number(value.toFixed(2))
}

function scaleTriggerTime(trigger: StageTrigger, multiplier: number): StageTrigger {
  if (trigger.type === 'time') {
    return { ...trigger, at: roundTime(trigger.at * multiplier) }
  }

  if (trigger.type === 'afterResolved' || trigger.type === 'afterDefeated') {
    return { ...trigger, delay: roundTime(trigger.delay * multiplier) }
  }

  if (trigger.type === 'interval') {
    return { ...trigger, every: roundTime(trigger.every * multiplier) }
  }

  return trigger
}

export function scaleEventTime<TEvent extends StageEvent>(
  event: TEvent,
  multiplier: number,
): TEvent {
  return {
    ...event,
    trigger: scaleTriggerTime(event.trigger, multiplier),
  }
}

export function createSequentialWaveEvents(
  waves: EnemyWave[],
  options: { firstAt: number; delayAfterResolved: number },
): StageEvent[] {
  return waves.map((wave, index) => ({
    id: `${wave.id}-event`,
    trigger:
      index === 0
        ? { type: 'time', at: options.firstAt }
        : {
            type: 'afterResolved',
            target: waves[index - 1]!.id,
            delay: options.delayAfterResolved,
          },
    actions: [{ type: 'spawnWave', wave }],
  }))
}

export function createTimeBossEvent(
  boss: BossDefinition,
  role: 'midboss' | 'final',
  at: number,
): StageEvent {
  return {
    id: `${boss.id}-spawn`,
    trigger: { type: 'time', at },
    actions: [{ type: 'spawnBoss', boss, role }],
  }
}

export function createBossEventAfterResolved(
  boss: BossDefinition,
  role: 'midboss' | 'final',
  target: string,
  delay: number,
): StageEvent {
  return {
    id: `${boss.id}-spawn`,
    trigger: { type: 'afterResolved', target, delay },
    actions: [{ type: 'spawnBoss', boss, role }],
  }
}

export function createVictoryEvent(target: string): StageEvent {
  return {
    id: `${target}-victory`,
    trigger: { type: 'afterDefeated', target, delay: 0 },
    actions: [{ type: 'finishStage', outcome: 'victory' }],
  }
}
