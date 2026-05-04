import { describe, expect, it } from 'vitest'

import {
  brassCloudEnemyFrames,
  brassCloudEnemyVariants,
  enemyArchetypeIds,
  enemyArchetypes,
  enemyVariants,
  resolveEnemyWave,
  resolvePatternForDifficulty,
} from './enemies'
import type { EnemyArchetypeId } from '../types'

const archetypeIds: EnemyArchetypeId[] = [
  'scout',
  'sentinel',
  'lancer',
  'splitter',
  'mine-layer',
  'weaver',
]

describe('enemy content resolver', () => {
  it('defines a brass-cloud variant and atlas frame for every regular archetype', () => {
    expect(Object.keys(enemyArchetypes).sort()).toEqual([...archetypeIds].sort())

    for (const archetype of archetypeIds) {
      const variant = brassCloudEnemyVariants[`brass-cloud-${archetype}`]
      const frame = brassCloudEnemyFrames[archetype]

      expect(variant).toMatchObject({
        archetype,
        theme: 'brass-cloud',
        atlasId: 'enemy-brass-cloud',
        frameId: archetype,
      })
      expect(frame.w).toBeGreaterThan(0)
      expect(frame.h).toBeGreaterThan(0)
    }
  })

  it('defines an abyssal variant and atlas frame for every regular archetype', () => {
    for (const archetype of enemyArchetypeIds) {
      const variant = enemyVariants[`abyssal-biomech-${archetype}`]

      expect(variant).toEqual({
        id: `abyssal-biomech-${archetype}`,
        archetype,
        theme: 'abyssal-biomech',
        atlasId: 'enemy-abyssal-biomech',
        frameId: archetype,
        displayName: expect.stringMatching(/^Abyssal /),
        patternOverride: expect.any(Object),
      })
    }
  })

  it('resolves abyssal placements without changing the authored archetype role', () => {
    const wave = resolveEnemyWave('normal', {
      id: 'abyssal-test-wave',
      archetype: 'weaver',
      variant: 'abyssal-biomech-weaver',
      count: 3,
      spacing: 0.4,
    })

    expect(wave.kind).toBe('abyssal-biomech-weaver')
    expect(wave.archetype).toBe('weaver')
    expect(wave.atlasId).toBe('enemy-abyssal-biomech')
    expect(wave.frameId).toBe('weaver')
    expect(wave.pattern.shape).toBe('wave')
  })

  it('resolves a wave with archetype defaults, theme metadata, and difficulty tuning', () => {
    const wave = resolveEnemyWave('hard', {
      id: 'test-lancer',
      archetype: 'lancer',
      variant: 'brass-cloud-lancer',
      count: 2,
      spacing: 1.25,
    })

    expect(wave).toMatchObject({
      id: 'test-lancer',
      kind: 'brass-cloud-lancer',
      archetype: 'lancer',
      variant: 'brass-cloud-lancer',
      atlasId: 'enemy-brass-cloud',
      frameId: 'lancer',
      count: 2,
      spacing: 1.25,
      movement: {
        type: 'flyThrough',
        path: 'swoop-right',
        speed: enemyArchetypes.lancer.speed,
      },
      resolution: { type: 'allInactive' },
    })
    expect(wave).not.toHaveProperty('startAt')
    expect(wave).not.toHaveProperty('speed')
    expect(wave).not.toHaveProperty('path')
    expect(wave.hp).toBeGreaterThan(enemyArchetypes.lancer.hp)
    expect(wave.pattern.shape).toBe('needle')
    expect(wave.pattern.speed).toBeGreaterThan(enemyArchetypes.lancer.pattern.speed)
    expect(wave.pattern.interval).toBeLessThan(enemyArchetypes.lancer.pattern.interval)
  })

  it('resolves regular enemy waves as fly-through spawn groups', () => {
    const wave = resolveEnemyWave('normal', {
      id: 'test-scout',
      archetype: 'scout',
      variant: 'brass-cloud-scout',
      count: 2,
      spacing: 1,
    })

    expect(wave.movement).toEqual({
      type: 'flyThrough',
      path: enemyArchetypes.scout.path,
      speed: enemyArchetypes.scout.speed,
    })
    expect(wave.resolution).toEqual({ type: 'allInactive' })
    expect(wave.formation).toEqual({ type: 'line', side: 'top' })
  })

  it('allows placement overrides for guard-style strafe waves', () => {
    const wave = resolveEnemyWave('normal', {
      id: 'test-guard',
      archetype: 'sentinel',
      variant: 'brass-cloud-sentinel',
      count: 2,
      spacing: 1,
      movement: {
        type: 'enterAndStrafe',
        entrySpeed: 1.1,
        holdZ: 1.35,
        strafeSpeed: 0.9,
        strafeRange: 1.8,
      },
      resolution: { type: 'allDefeated' },
    })

    expect(wave.movement).toEqual({
      type: 'enterAndStrafe',
      entrySpeed: 1.1,
      holdZ: 1.35,
      strafeSpeed: 0.9,
      strafeRange: 1.8,
    })
    expect(wave.resolution).toEqual({ type: 'allDefeated' })
  })

  it('allows placement overrides for enemy wave formations', () => {
    const wave = resolveEnemyWave('normal', {
      id: 'test-side-formation',
      archetype: 'scout',
      variant: 'brass-cloud-scout',
      count: 5,
      spacing: 0.6,
      formation: { type: 'vee', side: 'left', depth: 0.28 },
    })

    expect(wave.formation).toEqual({ type: 'vee', side: 'left', depth: 0.28 })
  })

  it('uses forgiving hit radii for every regular enemy archetype', () => {
    expect(
      Object.fromEntries(
        archetypeIds.map((archetype) => [archetype, enemyArchetypes[archetype].hitRadius]),
      ),
    ).toEqual({
      scout: 0.33,
      sentinel: 0.38,
      lancer: 0.34,
      splitter: 0.36,
      'mine-layer': 0.38,
      weaver: 0.34,
    })
  })

  it('keeps regular enemy travel speeds brisk without changing player tuning', () => {
    expect(
      Object.fromEntries(
        archetypeIds.map((archetype) => [archetype, enemyArchetypes[archetype].speed]),
      ),
    ).toEqual({
      scout: 0.86,
      sentinel: 0.62,
      lancer: 0.73,
      splitter: 0.68,
      'mine-layer': 0.57,
      weaver: 0.77,
    })
  })

  it('scales regular enemy bullet pressure in easy normal hard order', () => {
    const easy = resolvePatternForDifficulty(enemyArchetypes.weaver.pattern, 'easy')
    const normal = resolvePatternForDifficulty(enemyArchetypes.weaver.pattern, 'normal')
    const hard = resolvePatternForDifficulty(enemyArchetypes.weaver.pattern, 'hard')
    const easyRing = resolvePatternForDifficulty(enemyArchetypes.sentinel.pattern, 'easy')
    const normalRing = resolvePatternForDifficulty(enemyArchetypes.sentinel.pattern, 'normal')
    const hardRing = resolvePatternForDifficulty(enemyArchetypes.sentinel.pattern, 'hard')

    expect(easy.shape).toBe(enemyArchetypes.weaver.pattern.shape)
    expect(normal.shape).toBe(enemyArchetypes.weaver.pattern.shape)
    expect(hard.shape).toBe(enemyArchetypes.weaver.pattern.shape)

    expect([easy.count, normal.count, hard.count]).toEqual([3, 5, 7])
    expect([easy.speed, normal.speed, hard.speed]).toEqual([0.82, 1.03, 1.18])
    expect([easy.interval, normal.interval, hard.interval]).toEqual([1.83, 1.27, 1.09])
    expect([easy.spread, normal.spread, hard.spread]).toEqual([1.08, 1.18, 1.27])
    expect([easy.wave?.amplitude, normal.wave?.amplitude, hard.wave?.amplitude]).toEqual([
      0.33,
      0.5,
      0.58,
    ])

    expect([easyRing.count, normalRing.count, hardRing.count]).toEqual([4, 6, 8])
    expect([easyRing.interval, normalRing.interval, hardRing.interval]).toEqual([
      2.63,
      1.84,
      1.56,
    ])
  })

  it('keeps easy spread wide enough to avoid narrow concentrated streams', () => {
    const easyFan = resolvePatternForDifficulty(enemyArchetypes.scout.pattern, 'easy')
    const normalFan = resolvePatternForDifficulty(enemyArchetypes.scout.pattern, 'normal')

    expect(easyFan.spread).toBeGreaterThanOrEqual(1)
    expect(easyFan.spread).toBeLessThan(normalFan.spread)
  })

  it('scales split-pattern secondary bullets in easy normal hard order', () => {
    const placement = {
      id: 'abyssal-splitter-pressure',
      archetype: 'splitter',
      variant: 'abyssal-biomech-splitter',
      count: 1,
      spacing: 1,
    } as const
    const easy = resolveEnemyWave('easy', placement)
    const normal = resolveEnemyWave('normal', placement)
    const hard = resolveEnemyWave('hard', placement)

    expect([easy.pattern.split?.count, normal.pattern.split?.count, hard.pattern.split?.count]).toEqual([
      1,
      3,
      4,
    ])
    expect(easy.pattern.interval).toBeGreaterThan(normal.pattern.interval)
    expect(normal.pattern.interval).toBeGreaterThan(hard.pattern.interval)
  })

  it('rejects placements whose variant belongs to a different archetype', () => {
    expect(() =>
      resolveEnemyWave('normal', {
        id: 'mismatched-wave',
        archetype: 'scout',
        variant: 'brass-cloud-lancer',
        count: 1,
        spacing: 1,
      }),
    ).toThrow(
      'Enemy placement mismatched-wave uses archetype scout with variant brass-cloud-lancer for archetype lancer',
    )
  })
})
