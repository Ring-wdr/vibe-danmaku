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
})
