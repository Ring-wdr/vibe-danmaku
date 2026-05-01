import { describe, expect, it } from 'vitest'

import { createStageDefinition } from './stage1'

describe('createStageDefinition', () => {
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
})
