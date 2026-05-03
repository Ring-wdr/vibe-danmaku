import { describe, expect, it } from 'vitest'

import { createBattleStageDefinition } from './battleStage'
import { createStage4Definition, stage4FinalBossAssetPrompt } from './stage4'
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

describe('createStage4Definition', () => {
  it('defines city-state metadata and follows the Stage 3 wave composition', () => {
    const stage = createStage4Definition('normal')
    const waves = getSpawnedWaves(stage)

    expect(stage.id).toBe('crowned-city-states')
    expect(stage.stageNumber).toBe(4)
    expect(stage.backgroundTheme).toBe('city-states')
    expect(stage.name).toBe('Crowned City-States')
    expect(stage.lore).toContain('중세')
    expect(waves).toHaveLength(14)
    expect(waves.map((wave) => wave.archetype)).toEqual([
      'scout',
      'sentinel',
      'lancer',
      'splitter',
      'mine-layer',
      'weaver',
      'scout',
      'weaver',
      'lancer',
      'splitter',
      'mine-layer',
      'sentinel',
      'weaver',
      'scout',
    ])
    expect(waves.every((wave) => wave.variant.startsWith('city-state-'))).toBe(true)
  })

  it('gates second-half waves and final boss after the full plate knight midboss', () => {
    const stage = createStage4Definition('normal')
    const wave8Event = stage.events.find((event) => event.id === 'wave-8-event')
    const finalBossEvent = stage.events.find(
      (event) => event.id === 'boss-winged-gunslinger-spawn',
    )

    expect(stage.events.find((event) => event.id === 'midboss-full-plate-knight-spawn')?.trigger).toEqual({
      type: 'time',
      at: 38.4,
    })
    expect(wave8Event?.trigger).toEqual({
      type: 'timeAfterDefeated',
      at: 43.2,
      target: 'midboss-full-plate-knight',
      delay: 4.8,
    })
    expect(finalBossEvent?.trigger).toEqual({
      type: 'timeAfterDefeated',
      at: 82.4,
      target: 'midboss-full-plate-knight',
      delay: 44,
    })
  })

  it('defines three midboss phases and five final boss phases with scripted patterns', () => {
    const stage = createStage4Definition('normal')
    const midboss = getBossFromStage(stage, 'midboss')
    const boss = getBossFromStage(stage, 'final')

    expect(midboss.phases.map((phase) => phase.threshold)).toEqual([0.66, 0.33, 0])
    expect(boss.phases.map((phase) => phase.threshold)).toEqual([0.8, 0.6, 0.4, 0.2, 0])
    expect(midboss.phases.every((phase) => isScriptedPattern(phase.pattern))).toBe(true)
    expect(boss.phases.every((phase) => isScriptedPattern(phase.pattern))).toBe(true)
    expect(boss.phases.map((phase) => phase.label)).toEqual([
      'Phase 1 · Left Draw',
      'Phase 2 · Right Draw',
      'Phase 3 · Crossfire Waltz',
      'Phase 4 · Wing Barrage',
      'Phase 5 · Last Duel',
    ])
  })

  it('keeps the final boss image request text-only and aligned to existing asset style', () => {
    expect(stage4FinalBossAssetPrompt).toContain('2D sprite sheet')
    expect(stage4FinalBossAssetPrompt).toContain('dual pistols')
    expect(stage4FinalBossAssetPrompt).toContain('winged gunslinger')
    expect(stage4FinalBossAssetPrompt).toContain('match the existing Vibe Danmaku generated asset style')
    expect(stage4FinalBossAssetPrompt).not.toContain('attached image')
  })

  it('routes battle stage 4 to Crowned City-States', () => {
    expect(createBattleStageDefinition(4, 'normal')).toEqual(
      expect.objectContaining({
        id: 'crowned-city-states',
        stageNumber: 4,
        backgroundTheme: 'city-states',
      }),
    )
  })
})
