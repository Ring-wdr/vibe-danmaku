import { describe, expect, it } from 'vitest'

import { createStageDefinition as createStage1Definition } from './stage1'
import { createStage2Definition } from './stage2'
import type {
  BossBulletPatternConfig,
  BulletPatternConfig,
  BulletmlPatternConfig,
  StageDefinition,
} from '../types'

function isScriptedPattern(
  pattern: BossBulletPatternConfig,
): pattern is BulletmlPatternConfig {
  return 'engine' in pattern && pattern.engine === 'bulletml'
}

function isClassicPattern(
  pattern: BossBulletPatternConfig,
): pattern is BulletPatternConfig {
  return !isScriptedPattern(pattern)
}

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
    fastTrigger.type === 'time' &&
    regularTrigger.type === 'time'
  ) {
    expect(fastTrigger.at).toBeCloseTo(regularTrigger.at * 0.22)
  }
  if (
    fastTrigger &&
    regularTrigger &&
    fastTrigger.type === 'timeAfterDefeated' &&
    regularTrigger.type === 'timeAfterDefeated'
  ) {
    expect(fastTrigger.at).toBeCloseTo(regularTrigger.at * 0.22)
    expect(fastTrigger.target).toBe(regularTrigger.target)
    expect(fastTrigger.delay ?? 0).toBeCloseTo((regularTrigger.delay ?? 0) * 0.22)
  }
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

function getSpawnWaveEvents(stage: StageDefinition) {
  return stage.events.filter((event) =>
    event.actions.some((action) => action.type === 'spawnWave'),
  )
}

function getAuthoredStartTime(event: StageDefinition['events'][number]) {
  if (event.trigger.type === 'time' || event.trigger.type === 'timeAfterDefeated') {
    return event.trigger.at
  }

  throw new Error(`expected authored time trigger for ${event.id}`)
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

  it('tightens authored wave times while gating waves 7-12 after the midboss', () => {
    const stage = createStage2Definition('normal')
    const waveEvents = getSpawnWaveEvents(stage)
    const midbossEvent = stage.events.find((event) => event.id === 'midboss-ember-gate-spawn')
    const wave7Event = stage.events.find((event) => event.id === 'wave-7-event')
    const finalBossEvent = stage.events.find(
      (event) => event.id === 'boss-ash-citadel-core-spawn',
    )
    const startTimes = [
      ...waveEvents.slice(0, 6).map(getAuthoredStartTime),
      getAuthoredStartTime(midbossEvent!),
      ...waveEvents.slice(6).map(getAuthoredStartTime),
      getAuthoredStartTime(finalBossEvent!),
    ]
    const gaps = startTimes.slice(1).map((time, index) => time - startTimes[index]!)

    expect(waveEvents.map((event) => event.trigger)).toEqual([
      { type: 'time', at: 1.8 },
      { type: 'time', at: 8 },
      { type: 'time', at: 14.2 },
      { type: 'time', at: 20.4 },
      { type: 'time', at: 26.6 },
      { type: 'time', at: 32.8 },
      { type: 'timeAfterDefeated', at: 46, target: 'midboss-ember-gate', delay: 7 },
      { type: 'timeAfterDefeated', at: 52.2, target: 'midboss-ember-gate', delay: 13.2 },
      { type: 'timeAfterDefeated', at: 58.4, target: 'midboss-ember-gate', delay: 19.4 },
      { type: 'timeAfterDefeated', at: 64.6, target: 'midboss-ember-gate', delay: 25.6 },
      { type: 'timeAfterDefeated', at: 70.8, target: 'midboss-ember-gate', delay: 31.8 },
      { type: 'timeAfterDefeated', at: 77, target: 'midboss-ember-gate', delay: 38 },
    ])
    expect(Math.max(...gaps)).toBeLessThanOrEqual(8)
    expect(midbossEvent?.trigger).toEqual({ type: 'time', at: 39 })
    expect(wave7Event?.trigger).toEqual({
      type: 'timeAfterDefeated',
      at: 46,
      target: 'midboss-ember-gate',
      delay: 7,
    })
    expect(finalBossEvent?.trigger).toEqual({
      type: 'timeAfterDefeated',
      at: 84,
      target: 'midboss-ember-gate',
      delay: 45,
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
    expect(fast.events.find((event) => event.id === 'wave-7-event')?.trigger).toEqual({
      type: 'timeAfterDefeated',
      at: 10.12,
      target: 'midboss-ember-gate',
      delay: 1.54,
    })
  })

  it('raises classic counts and scripted ranks on hard difficulty', () => {
    const easy = createStage2Definition('easy')
    const hard = createStage2Definition('hard')
    const easyMidboss = getBossFromStage(easy, 'midboss')
    const hardMidboss = getBossFromStage(hard, 'midboss')
    const easyBoss = getBossFromStage(easy, 'final')
    const hardBoss = getBossFromStage(hard, 'final')

    expect(hardMidboss.phases).toHaveLength(easyMidboss.phases.length)
    hardMidboss.phases.forEach((phase, index) => {
      const easyPattern = easyMidboss.phases[index]!.pattern
      if (isClassicPattern(phase.pattern) && isClassicPattern(easyPattern)) {
        expect(phase.pattern.count).toBeGreaterThan(easyPattern.count)
        return
      }

      expect(isScriptedPattern(phase.pattern)).toBe(true)
      expect(isScriptedPattern(easyPattern)).toBe(true)
      expect((phase.pattern as BulletmlPatternConfig).rank).toBeGreaterThan(
        (easyPattern as BulletmlPatternConfig).rank ?? 0,
      )
    })

    expect(hardBoss.phases).toHaveLength(easyBoss.phases.length)
    hardBoss.phases.forEach((phase, index) => {
      const easyPattern = easyBoss.phases[index]!.pattern
      expect(isScriptedPattern(phase.pattern)).toBe(true)
      expect(isScriptedPattern(easyPattern)).toBe(true)
      expect((phase.pattern as BulletmlPatternConfig).rank).toBeGreaterThan(
        (easyPattern as BulletmlPatternConfig).rank ?? 0,
      )
    })
  })

  it('uses BulletML-style scripted patterns for the Stage 2 final boss phases', () => {
    const boss = getBossFromStage(createStage2Definition('normal'), 'final')

    expect(boss.phases.map((phase) => phase.pattern)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ engine: 'bulletml', rank: 0.5 }),
      ]),
    )
    expect(boss.phases.every((phase) => isScriptedPattern(phase.pattern))).toBe(true)
  })

  it('expresses the midboss and second-half waves through explicit triggers', () => {
    const stage = createStage2Definition('normal')
    const midbossEvent = stage.events.find((event) => event.id === 'midboss-ember-gate-spawn')
    const wave7Event = stage.events.find((event) => event.id === 'wave-7-event')
    const finalBossEvent = stage.events.find(
      (event) => event.id === 'boss-ash-citadel-core-spawn',
    )

    expect(midbossEvent?.trigger).toEqual({ type: 'time', at: 39 })
    expect(wave7Event?.trigger).toEqual({
      type: 'timeAfterDefeated',
      at: 46,
      target: 'midboss-ember-gate',
      delay: 7,
    })
    expect(finalBossEvent?.trigger).toEqual({
      type: 'timeAfterDefeated',
      at: 84,
      target: 'midboss-ember-gate',
      delay: 45,
    })
  })
})
