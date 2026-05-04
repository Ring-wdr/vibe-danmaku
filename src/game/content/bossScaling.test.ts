import { describe, expect, it } from 'vitest'

import { scaleBossPattern } from './bossScaling'
import type { BossBulletPatternConfig, BulletmlPatternConfig } from '../types'

function expectClassic(pattern: BossBulletPatternConfig) {
  if ('engine' in pattern) {
    throw new Error('expected classic boss pattern')
  }

  return pattern
}

function expectScripted(pattern: BossBulletPatternConfig): BulletmlPatternConfig {
  if (!('engine' in pattern)) {
    throw new Error('expected BulletML boss pattern')
  }

  return pattern
}

describe('boss difficulty scaling', () => {
  it('reduces classic boss pressure across easy normal and hard', () => {
    const pattern = {
      shape: 'fan',
      count: 10,
      interval: 1,
      speed: 1,
      spread: 1,
      life: 8,
    } satisfies BossBulletPatternConfig

    const easy = expectClassic(scaleBossPattern(pattern, 'easy'))
    const normal = expectClassic(scaleBossPattern(pattern, 'normal'))
    const hard = expectClassic(scaleBossPattern(pattern, 'hard'))

    expect([easy.count, normal.count, hard.count]).toEqual([7, 9, 11])
    expect([easy.speed, normal.speed, hard.speed]).toEqual([0.85, 0.98, 1.12])
    expect([easy.interval, normal.interval, hard.interval]).toEqual([1.28, 1.06, 0.92])
  })

  it('reduces BulletML boss rank and repeated pattern interval', () => {
    const pattern = {
      engine: 'bulletml',
      interval: 0.5,
      rank: 0.5,
      action: [{ type: 'wait', seconds: 0.1 }],
    } satisfies BossBulletPatternConfig

    const easy = expectScripted(scaleBossPattern(pattern, 'easy'))
    const normal = expectScripted(scaleBossPattern(pattern, 'normal'))
    const hard = expectScripted(scaleBossPattern(pattern, 'hard'))

    expect([easy.rank, normal.rank, hard.rank]).toEqual([0.18, 0.42, 0.7])
    expect([easy.interval, normal.interval, hard.interval]).toEqual([0.64, 0.53, 0.46])
  })
})
