import { describe, expect, it } from 'vitest'

import {
  brassCloudEnemyFrames,
  brassCloudEnemyVariants,
  enemyArchetypes,
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

  it('resolves a wave with archetype defaults, theme metadata, and difficulty tuning', () => {
    const wave = resolveEnemyWave('hard', {
      id: 'test-lancer',
      startAt: 12,
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
      path: 'swoop-right',
    })
    expect(wave.hp).toBeGreaterThan(enemyArchetypes.lancer.hp)
    expect(wave.pattern.shape).toBe('needle')
    expect(wave.pattern.count).toBeGreaterThan(enemyArchetypes.lancer.pattern.count)
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

  it('scales pattern count, speed, and interval by difficulty without changing shape', () => {
    const easy = resolvePatternForDifficulty(enemyArchetypes.weaver.pattern, 'easy')
    const hard = resolvePatternForDifficulty(enemyArchetypes.weaver.pattern, 'hard')

    expect(hard.shape).toBe(easy.shape)
    expect(hard.count).toBeGreaterThan(easy.count)
    expect(hard.speed).toBeGreaterThan(easy.speed)
    expect(hard.interval).toBeLessThan(easy.interval)
  })

  it('reduces easy regular enemy bullet pressure below normal', () => {
    const easy = resolvePatternForDifficulty(enemyArchetypes.weaver.pattern, 'easy')
    const normal = resolvePatternForDifficulty(enemyArchetypes.weaver.pattern, 'normal')

    expect(easy.count).toBeLessThan(normal.count)
    expect(easy.speed).toBeLessThan(normal.speed)
    expect(easy.spread).toBeLessThan(normal.spread)
    expect(easy.wave?.amplitude).toBeLessThan(normal.wave?.amplitude ?? 0)
    expect(easy.interval).toBeGreaterThan(normal.interval)
  })

  it('reduces easy split-pattern secondary bullets', () => {
    const easy = resolvePatternForDifficulty(enemyArchetypes.splitter.pattern, 'easy')
    const normal = resolvePatternForDifficulty(enemyArchetypes.splitter.pattern, 'normal')

    expect(easy.split?.count).toBeLessThan(normal.split?.count ?? 0)
  })

  it('keeps difficulty bullet-count tuning restrained after enemy density increases', () => {
    const pattern = enemyArchetypes.weaver.pattern

    expect(resolvePatternForDifficulty(pattern, 'normal').count).toBe(6)
    expect(resolvePatternForDifficulty(pattern, 'hard').count).toBe(7)
  })

  it('rejects placements whose variant belongs to a different archetype', () => {
    expect(() =>
      resolveEnemyWave('normal', {
        id: 'mismatched-wave',
        startAt: 4,
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
