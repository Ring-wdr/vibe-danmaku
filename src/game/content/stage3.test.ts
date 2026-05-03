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
      at: 44,
    })
    expect(wave8Event?.trigger).toEqual({
      type: 'timeAfterDefeated',
      at: 52,
      target: 'midboss-pressure-lure',
      delay: 8,
    })
    expect(finalBossEvent?.trigger).toEqual({
      type: 'timeAfterDefeated',
      at: 96,
      target: 'midboss-pressure-lure',
      delay: 52,
    })
  })

  it('defines two midboss phases and four final boss phases with Stage 3 phase breaks', () => {
    const stage = createStage3Definition('normal')
    const midboss = getBossFromStage(stage, 'midboss')
    const boss = getBossFromStage(stage, 'final')

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
      at: 9.68,
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
