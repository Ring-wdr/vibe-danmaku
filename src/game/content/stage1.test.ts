import { describe, expect, it } from 'vitest'

import { createStageDefinition } from './stage1'

function getSpawnWaveEvents(stage: ReturnType<typeof createStageDefinition>) {
  return (stage.events ?? []).filter((event) =>
    event.actions.some((action) => action.type === 'spawnWave'),
  )
}

function getSpawnBossEvents(stage: ReturnType<typeof createStageDefinition>) {
  return (stage.events ?? []).filter((event) =>
    event.actions.some((action) => action.type === 'spawnBoss'),
  )
}

function getVictoryEvents(stage: ReturnType<typeof createStageDefinition>) {
  return (stage.events ?? []).filter((event) =>
    event.actions.some((action) => action.type === 'finishStage'),
  )
}

describe('createStageDefinition', () => {
  it('roughly doubles or triples each regular wave after the density increase', () => {
    const stage = createStageDefinition('normal')
    const previousWaveCounts = [3, 3, 3, 4, 4, 4, 5, 5]

    expect(stage.waves.map((wave) => wave.count)).toEqual([7, 7, 7, 9, 9, 9, 12, 12])
    expect(stage.waves.reduce((total, wave) => total + wave.count, 0)).toBe(72)

    stage.waves.forEach((wave, index) => {
      const ratio = wave.count / previousWaveCounts[index]!
      expect(ratio).toBeGreaterThanOrEqual(2)
      expect(ratio).toBeLessThanOrEqual(3)
    })
  })

  it('keeps denser enemy formations inside the playable horizontal span', () => {
    const stage = createStageDefinition('normal')

    for (const wave of stage.waves) {
      expect((wave.count - 1) * wave.spacing).toBeLessThanOrEqual(6)
    }
  })

  it('keeps wave timing stable across difficulties while scaling bullet counts', () => {
    const easy = createStageDefinition('easy')
    const hard = createStageDefinition('hard')

    expect(hard.waves.map((wave) => wave.startAt)).toEqual(
      easy.waves.map((wave) => wave.startAt),
    )
    expect(hard.waves[0]?.pattern.count).toBeGreaterThan(
      easy.waves[0]?.pattern.count ?? 0,
    )
    expect(hard.boss.phases[1]?.pattern.count).toBeGreaterThan(
      easy.boss.phases[1]?.pattern.count ?? 0,
    )
    expect(easy.boss.phases.map((phase) => phase.pattern.count)).toEqual([8, 10, 12])
    expect(hard.boss.phases.map((phase) => phase.pattern.count)).toEqual([10, 12, 14])
  })

  it('starts the first combat wave quickly after deploy so the battle does not feel empty', () => {
    const easy = createStageDefinition('easy')

    expect(easy.waves[0]?.startAt).toBeLessThanOrEqual(2)
  })

  it('keeps regular enemy waves close enough together to avoid empty combat stretches', () => {
    const stage = createStageDefinition('normal')
    const waveStartTimes = stage.waves.map((wave) => wave.startAt)
    const waveGaps = waveStartTimes.slice(1).map((startAt, index) => {
      return startAt - waveStartTimes[index]!
    })
    const finalApproachGap = stage.boss.startAt - waveStartTimes[waveStartTimes.length - 1]!

    expect(stage.waves.length).toBeGreaterThanOrEqual(7)
    expect(Math.max(...waveGaps)).toBeLessThanOrEqual(12)
    expect(finalApproachGap).toBeLessThanOrEqual(12)
  })

  it('uses every regular enemy archetype in Stage 1', () => {
    const stage = createStageDefinition('normal')

    expect(new Set(stage.waves.map((wave) => wave.archetype))).toEqual(
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
