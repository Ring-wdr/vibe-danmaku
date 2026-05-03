import { describe, expect, it } from 'vitest'

import { createBattleStageDefinition } from './battleStage'
import { createStage3Definition } from './stage3'
import type { BossBulletPatternConfig, BulletmlPatternConfig, StageDefinition } from '../types'

function isScriptedPattern(
  pattern: BossBulletPatternConfig,
): pattern is BulletmlPatternConfig {
  return 'engine' in pattern && pattern.engine === 'bulletml'
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

describe('createStage3Definition', () => {
  it('defines Abyssal Biomech Trench metadata and abyssal waves', () => {
    const stage = createStage3Definition('normal')
    const waves = getSpawnedWaves(stage)

    expect(stage.id).toBe('abyssal-biomech-trench')
    expect(stage.stageNumber).toBe(3)
    expect(stage.backgroundTheme).toBe('abyssal-biomech')
    expect(stage.name).toBe('Abyssal Biomech Trench')
    expect(stage.lore).toContain('심해')
    expect(waves).toHaveLength(14)
    expect(waves.every((wave) => wave.variant.startsWith('abyssal-biomech-'))).toBe(true)
    expect(new Set(waves.map((wave) => wave.archetype))).toEqual(
      new Set(['scout', 'sentinel', 'lancer', 'splitter', 'mine-layer', 'weaver']),
    )
  })

  it('gates second-half waves and the final boss after the midboss', () => {
    const stage = createStage3Definition('normal')
    const wave8Event = stage.events.find((event) => event.id === 'wave-8-event')
    const finalBossEvent = stage.events.find(
      (event) => event.id === 'boss-abyssal-leviathan-core-spawn',
    )

    expect(stage.events.find((event) => event.id === 'midboss-pressure-lure-spawn')?.trigger).toEqual({
      type: 'time',
      at: 38.4,
    })
    expect(wave8Event?.trigger).toEqual({
      type: 'timeAfterDefeated',
      at: 43.2,
      target: 'midboss-pressure-lure',
      delay: 4.8,
    })
    expect(finalBossEvent?.trigger).toEqual({
      type: 'timeAfterDefeated',
      at: 82.4,
      target: 'midboss-pressure-lure',
      delay: 44,
    })
  })

  it('keeps Stage 3 wave pressure denser with shorter authored gaps', () => {
    const stage = createStage3Definition('normal')
    const waveEvents = stage.events.filter((event) =>
      event.actions.some((action) => action.type === 'spawnWave'),
    )
    const waveTimes = waveEvents.map((event) => {
      if (event.trigger.type !== 'time' && event.trigger.type !== 'timeAfterDefeated') {
        throw new Error(`expected timed wave trigger for ${event.id}`)
      }

      return event.trigger.at
    })
    const gaps = waveTimes.slice(1).map((time, index) => time - waveTimes[index]!)

    expect(waveTimes).toEqual([
      2,
      7.2,
      12.4,
      17.6,
      22.8,
      28,
      33.2,
      43.2,
      48.4,
      53.6,
      58.8,
      64,
      69.2,
      74.4,
    ])
    expect(Math.max(...gaps)).toBeLessThanOrEqual(10)
  })

  it('defines two midboss phases and four final boss phases with Stage 3 phase breaks', () => {
    const stage = createStage3Definition('normal')
    const midboss = getBossFromStage(stage, 'midboss')
    const boss = getBossFromStage(stage, 'final')

    expect(boss.hp).toBe(9200)
    expect(midboss.phaseBreakDuration).toBe(3)
    expect(midboss.phases.map((phase) => phase.threshold)).toEqual([0.5, 0])
    expect(boss.phaseBreakDuration).toBe(3)
    expect(boss.phases.map((phase) => phase.threshold)).toEqual([0.75, 0.5, 0.25, 0])
    expect(midboss.phases.slice(1).every((phase) => isScriptedPattern(phase.pattern))).toBe(true)
    expect(boss.phases.every((phase) => isScriptedPattern(phase.pattern))).toBe(true)
  })

  it('scales timing for fast stages', () => {
    const regular = createStage3Definition('normal')
    const fast = createStage3Definition('normal', { fastStage: true })

    expect(fast.duration).toBeCloseTo((regular.duration ?? 0) * 0.22)
    expect(fast.events.find((event) => event.id === 'midboss-pressure-lure-spawn')?.trigger).toEqual({
      type: 'time',
      at: 8.45,
    })
  })

  it('routes battle stage 3 to Abyssal Biomech Trench', () => {
    expect(createBattleStageDefinition(3, 'normal')).toEqual(
      expect.objectContaining({
        id: 'abyssal-biomech-trench',
        stageNumber: 3,
        backgroundTheme: 'abyssal-biomech',
      }),
    )
  })
})
