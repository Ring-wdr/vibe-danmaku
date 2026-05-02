import { describe, expect, it } from 'vitest'

import { createStageDefinition as createStage1Definition } from './stage1'
import { createStage2Definition } from './stage2'
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

function expectDelayScaled(
  fastTrigger: StageDefinition['events'][number]['trigger'] | undefined,
  regularTrigger: StageDefinition['events'][number]['trigger'] | undefined,
) {
  expect(fastTrigger?.type).toBe(regularTrigger?.type)
  if (
    fastTrigger &&
    regularTrigger &&
    (fastTrigger.type === 'afterResolved' || fastTrigger.type === 'afterDefeated') &&
    (regularTrigger.type === 'afterResolved' || regularTrigger.type === 'afterDefeated')
  ) {
    expect(fastTrigger.target).toBe(regularTrigger.target)
    expect(fastTrigger.delay).toBeCloseTo(regularTrigger.delay * 0.22)
  }
}

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
    expect(getSpawnedWaves(stage)).toHaveLength(12)
    expect(getBossFromStage(stage, 'midboss').id).toBe('midboss-ember-gate')
  })

  it('doubles Stage 1 wave counts while cycling Stage 1 waves for 12 entries', () => {
    const stage1 = createStage1Definition('normal')
    const stage2 = createStage2Definition('normal')
    const stage1Waves = getSpawnedWaves(stage1)
    const stage2Waves = getSpawnedWaves(stage2)

    const expectedCounts = Array.from({ length: 12 }, (_, index) => {
      return stage1Waves[index % stage1Waves.length]!.count * 2
    })
    const expectedArchetypes = Array.from({ length: 12 }, (_, index) => {
      return stage1Waves[index % stage1Waves.length]!.archetype
    })

    expect(stage2Waves.map((wave) => wave.count)).toEqual(expectedCounts)
    expect(stage2Waves.map((wave) => wave.archetype)).toEqual(expectedArchetypes)
  })

  it('starts waves 7-12 after the midboss and starts the final boss after the final wave', () => {
    const stage = createStage2Definition('normal')
    const wave7Event = stage.events.find((event) => event.id === 'wave-7-event')
    const finalBossEvent = stage.events.find(
      (event) => event.id === 'boss-ash-citadel-core-spawn',
    )

    expect(wave7Event?.trigger).toEqual({
      type: 'afterDefeated',
      target: 'midboss-ember-gate',
      delay: 1.5,
    })
    expect(finalBossEvent?.trigger).toEqual({
      type: 'afterResolved',
      target: 'wave-12',
      delay: 2,
    })
  })

  it('scales timing for fast stages while preserving wave count and midboss gate index', () => {
    const regular = createStage2Definition('normal')
    const fast = createStage2Definition('normal', { fastStage: true })
    const regularWaves = getSpawnedWaves(regular)
    const fastWaves = getSpawnedWaves(fast)
    const regularMidbossEvent = regular.events.find((event) => event.id === 'midboss-ember-gate-spawn')
    const fastMidbossEvent = fast.events.find((event) => event.id === 'midboss-ember-gate-spawn')
    const regularFinalBossEvent = regular.events.find(
      (event) => event.id === 'boss-ash-citadel-core-spawn',
    )
    const fastFinalBossEvent = fast.events.find(
      (event) => event.id === 'boss-ash-citadel-core-spawn',
    )

    expect(fastWaves).toHaveLength(regularWaves.length)
    expect(fastWaves.map((wave) => wave.count)).toEqual(
      regularWaves.map((wave) => wave.count),
    )
    expect(fast.duration).toBeCloseTo((regular.duration ?? 0) * 0.22)
    expectDelayScaled(fastMidbossEvent?.trigger, regularMidbossEvent?.trigger)
    expectDelayScaled(fastFinalBossEvent?.trigger, regularFinalBossEvent?.trigger)
  })

  it('increases midboss and final boss pattern counts on hard difficulty', () => {
    const easy = createStage2Definition('easy')
    const hard = createStage2Definition('hard')
    const easyMidboss = getBossFromStage(easy, 'midboss')
    const hardMidboss = getBossFromStage(hard, 'midboss')
    const easyBoss = getBossFromStage(easy, 'final')
    const hardBoss = getBossFromStage(hard, 'final')

    expect(hardMidboss.phases).toHaveLength(easyMidboss.phases.length)
    hardMidboss.phases.forEach((phase, index) => {
      expect(phase.pattern.count).toBeGreaterThan(
        easyMidboss.phases[index]?.pattern.count ?? 0,
      )
    })

    expect(hardBoss.phases).toHaveLength(easyBoss.phases.length)
    hardBoss.phases.forEach((phase, index) => {
      expect(phase.pattern.count).toBeGreaterThan(easyBoss.phases[index]!.pattern.count)
    })
  })

  it('expresses the midboss and second-half waves through explicit triggers', () => {
    const stage = createStage2Definition('normal')
    const midbossEvent = stage.events.find((event) => event.id === 'midboss-ember-gate-spawn')
    const wave7Event = stage.events.find((event) => event.id === 'wave-7-event')
    const finalBossEvent = stage.events.find(
      (event) => event.id === 'boss-ash-citadel-core-spawn',
    )

    expect(midbossEvent?.trigger).toEqual({
      type: 'afterResolved',
      target: 'wave-6',
      delay: 1.5,
    })
    expect(wave7Event?.trigger).toEqual({
      type: 'afterDefeated',
      target: 'midboss-ember-gate',
      delay: 1.5,
    })
    expect(finalBossEvent?.trigger).toEqual({
      type: 'afterResolved',
      target: 'wave-12',
      delay: 2,
    })
  })
})
