import { describe, expect, it } from 'vitest'

import { createStageDefinition } from './stage1'
import type { StageDefinition } from '../types'

function getSpawnedWaves(stage: StageDefinition) {
  return stage.events.flatMap((event) =>
    event.actions.flatMap((action) => (action.type === 'spawnWave' ? [action.wave] : [])),
  )
}

function getBossFromStage(stage: StageDefinition, role: 'midboss' | 'final') {
  const action = stage.events
    .flatMap((event) => event.actions)
    .find((candidate) => candidate.type === 'spawnBoss' && candidate.role === role)

  if (!action || action.type !== 'spawnBoss') {
    throw new Error(`missing ${role} boss`)
  }

  return action.boss
}

function getSpawnWaveEvents(stage: StageDefinition) {
  return stage.events.filter((event) =>
    event.actions.some((action) => action.type === 'spawnWave'),
  )
}

function getSpawnBossEvents(stage: StageDefinition) {
  return stage.events.filter((event) =>
    event.actions.some((action) => action.type === 'spawnBoss'),
  )
}

function getVictoryEvents(stage: StageDefinition) {
  return stage.events.filter((event) =>
    event.actions.some((action) => action.type === 'finishStage'),
  )
}

describe('createStageDefinition', () => {
  it('roughly doubles or triples each regular wave after the density increase', () => {
    const stage = createStageDefinition('normal')
    const waves = getSpawnedWaves(stage)
    const previousWaveCounts = [3, 3, 3, 4, 4, 4, 5, 5]

    expect(waves.map((wave) => wave.count)).toEqual([7, 7, 7, 9, 9, 9, 12, 12])
    expect(waves.reduce((total, wave) => total + wave.count, 0)).toBe(72)

    waves.forEach((wave, index) => {
      const ratio = wave.count / previousWaveCounts[index]!
      expect(ratio).toBeGreaterThanOrEqual(2)
      expect(ratio).toBeLessThanOrEqual(3)
    })
  })

  it('keeps denser enemy formations inside the playable horizontal span', () => {
    const stage = createStageDefinition('normal')

    for (const wave of getSpawnedWaves(stage)) {
      expect((wave.count - 1) * wave.spacing).toBeLessThanOrEqual(6)
    }
  })

  it('keeps wave timing stable across difficulties while scaling bullet counts', () => {
    const easy = createStageDefinition('easy')
    const hard = createStageDefinition('hard')
    const easyWaves = getSpawnedWaves(easy)
    const hardWaves = getSpawnedWaves(hard)
    const easyBoss = getBossFromStage(easy, 'final')
    const hardBoss = getBossFromStage(hard, 'final')

    expect(getSpawnWaveEvents(hard).map((event) => event.trigger)).toEqual(
      getSpawnWaveEvents(easy).map((event) => event.trigger),
    )
    expect(hardWaves[0]?.pattern.count).toBeGreaterThan(
      easyWaves[0]?.pattern.count ?? 0,
    )
    expect(hardBoss.phases[1]?.pattern.count).toBeGreaterThan(
      easyBoss.phases[1]?.pattern.count ?? 0,
    )
    expect(easyBoss.phases.map((phase) => phase.pattern.count)).toEqual([8, 10, 12])
    expect(hardBoss.phases.map((phase) => phase.pattern.count)).toEqual([10, 12, 14])
  })

  it('starts the first combat wave quickly after deploy so the battle does not feel empty', () => {
    const easy = createStageDefinition('easy')
    const firstWaveEvent = getSpawnWaveEvents(easy)[0]

    expect(firstWaveEvent?.trigger).toEqual({ type: 'time', at: 1.8 })
  })

  it('keeps regular enemy waves close enough together to avoid empty combat stretches', () => {
    const stage = createStageDefinition('normal')
    const spawnWaveEvents = getSpawnWaveEvents(stage)
    const finalBossEvent = getSpawnBossEvents(stage).find((event) =>
      event.actions.some((action) => action.type === 'spawnBoss' && action.role === 'final'),
    )

    expect(spawnWaveEvents).toHaveLength(8)
    expect(spawnWaveEvents.slice(1).every((event) => event.trigger.type === 'afterResolved')).toBe(
      true,
    )
    expect(finalBossEvent?.trigger).toEqual({
      type: 'afterResolved',
      target: 'wave-8',
      delay: 2,
    })
  })

  it('uses every regular enemy archetype in Stage 1', () => {
    const stage = createStageDefinition('normal')

    expect(new Set(getSpawnedWaves(stage).map((wave) => wave.archetype))).toEqual(
      new Set(['scout', 'sentinel', 'lancer', 'splitter', 'mine-layer', 'weaver']),
    )
  })

  it('expresses every Stage 1 spawn through explicit events', () => {
    const stage = createStageDefinition('normal')
    const spawnWaveEvents = getSpawnWaveEvents(stage)
    const spawnBossEvents = getSpawnBossEvents(stage)
    const victoryEvents = getVictoryEvents(stage)

    expect(spawnWaveEvents).toHaveLength(8)
    expect(spawnWaveEvents[0]?.trigger).toEqual({ type: 'time', at: 1.8 })
    expect(spawnWaveEvents[1]?.trigger).toEqual({
      type: 'afterResolved',
      target: 'wave-1',
      delay: 1.5,
    })
    expect(spawnBossEvents).toHaveLength(1)
    expect(spawnBossEvents[0]?.id).toBe('boss-brass-core-spawn')
    expect(spawnBossEvents[0]?.trigger).toEqual({
      type: 'afterResolved',
      target: 'wave-8',
      delay: 2,
    })
    expect(spawnBossEvents[0]?.actions[0]).toMatchObject({
      type: 'spawnBoss',
      role: 'final',
      boss: { id: 'boss-brass-core' },
    })
    expect(victoryEvents).toEqual([
      {
        id: 'boss-brass-core-victory',
        trigger: { type: 'afterDefeated', target: 'boss-brass-core', delay: 0 },
        actions: [{ type: 'finishStage', outcome: 'victory' }],
      },
    ])
  })
})
