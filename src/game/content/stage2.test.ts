import { describe, expect, it } from 'vitest'

import { createStageDefinition as createStage1Definition } from './stage1'
import { createStage2Definition } from './stage2'

describe('createStage2Definition', () => {
  it('defines Burning Ruin Corridor metadata, waves, and midboss gate', () => {
    const stage = createStage2Definition('normal')

    expect(stage.id).toBe('burning-ruin-corridor')
    expect(stage.name).toBe('Burning Ruin Corridor')
    expect(stage.lore).toBe(
      '전쟁 뒤 불타는 폐허 회랑을 돌파하고 잿빛 성채 코어를 붕괴시킨다.',
    )
    expect(stage.stageNumber).toBe(2)
    expect(stage.backgroundTheme).toBe('burning-ruins')
    expect(stage.waves).toHaveLength(12)
    expect(stage.midboss?.id).toBe('midboss-ember-gate')
    expect(stage.midboss?.gateAfterWaveIndex).toBe(5)
  })

  it('doubles Stage 1 wave counts while cycling Stage 1 waves for 12 entries', () => {
    const stage1 = createStage1Definition('normal')
    const stage2 = createStage2Definition('normal')

    const expectedCounts = Array.from({ length: 12 }, (_, index) => {
      return stage1.waves[index % stage1.waves.length]!.count * 2
    })
    const expectedArchetypes = Array.from({ length: 12 }, (_, index) => {
      return stage1.waves[index % stage1.waves.length]!.archetype
    })

    expect(stage2.waves.map((wave) => wave.count)).toEqual(expectedCounts)
    expect(stage2.waves.map((wave) => wave.archetype)).toEqual(expectedArchetypes)
  })

  it('starts waves 7-12 after the midboss and starts the final boss after the final wave', () => {
    const stage = createStage2Definition('normal')
    const midbossStart = stage.midboss?.startAt ?? 0
    const finalWave = stage.waves[stage.waves.length - 1]!
    const finalWaveSpanEnd = finalWave.startAt + (finalWave.count - 1) * finalWave.spacing

    expect(stage.waves.slice(6).every((wave) => wave.startAt > midbossStart)).toBe(true)
    expect(stage.boss.startAt).toBeGreaterThan(finalWaveSpanEnd)
  })

  it('scales timing for fast stages while preserving wave count and midboss gate index', () => {
    const regular = createStage2Definition('normal')
    const fast = createStage2Definition('normal', { fastStage: true })

    expect(fast.waves).toHaveLength(regular.waves.length)
    expect(fast.midboss?.gateAfterWaveIndex).toBe(regular.midboss?.gateAfterWaveIndex)
    expect(fast.waves.map((wave) => wave.count)).toEqual(
      regular.waves.map((wave) => wave.count),
    )
    fast.waves.forEach((wave, index) => {
      expect(wave.startAt).toBeCloseTo(regular.waves[index]!.startAt * 0.22)
    })
    expect(fast.duration).toBeCloseTo(regular.duration * 0.22)
    expect(fast.midboss?.startAt).toBeCloseTo((regular.midboss?.startAt ?? 0) * 0.22)
    expect(fast.boss.startAt).toBeCloseTo(regular.boss.startAt * 0.22)
  })

  it('increases midboss and final boss pattern counts on hard difficulty', () => {
    const easy = createStage2Definition('easy')
    const hard = createStage2Definition('hard')

    expect(hard.midboss?.phases).toHaveLength(easy.midboss?.phases.length ?? 0)
    hard.midboss?.phases.forEach((phase, index) => {
      expect(phase.pattern.count).toBeGreaterThan(
        easy.midboss?.phases[index]?.pattern.count ?? 0,
      )
    })

    expect(hard.boss.phases).toHaveLength(easy.boss.phases.length)
    hard.boss.phases.forEach((phase, index) => {
      expect(phase.pattern.count).toBeGreaterThan(easy.boss.phases[index]!.pattern.count)
    })
  })
})
