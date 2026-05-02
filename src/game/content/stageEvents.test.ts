import { describe, expect, it } from 'vitest'

import {
  createSequentialWaveEvents,
  createTimeBossEvent,
  createVictoryEvent,
  scaleEventTime,
} from './stageEvents'
import type { BossDefinition, EnemyWave, StageEvent } from '../types'

const fixtureWave = {
  id: 'wave-1',
  kind: 'brass-cloud-scout',
  archetype: 'scout',
  variant: 'brass-cloud-scout',
  atlasId: 'enemy-brass-cloud',
  frameId: 'scout',
  count: 2,
  spacing: 1,
  hp: 10,
  movement: { type: 'flyThrough', path: 'swoop-left', speed: 1 },
  resolution: { type: 'allInactive' },
  scale: 0.8,
  hitRadius: 0.33,
  pattern: { shape: 'fan', count: 3, interval: 1, speed: 1, spread: 1, life: 4 },
} satisfies EnemyWave

const fixtureBoss = {
  id: 'boss-brass-core',
  hp: 240,
  phases: [
    {
      id: 'phase-1',
      threshold: 0,
      label: 'Phase 1',
      supportLaser: false,
      pattern: { shape: 'fan', count: 3, interval: 1, speed: 1, spread: 1, life: 4 },
    },
  ],
} satisfies BossDefinition

describe('stage event helpers', () => {
  it('scales time triggers without changing non-time triggers', () => {
    const events = [
      {
        id: 'wave-1-event',
        trigger: { type: 'time', at: 10 },
        actions: [],
      },
      {
        id: 'wave-2-event',
        trigger: { type: 'afterResolved', target: 'wave-1', delay: 2 },
        actions: [],
      },
    ] satisfies StageEvent[]

    expect(events.map((event) => scaleEventTime(event, 0.5))).toEqual([
      {
        id: 'wave-1-event',
        trigger: { type: 'time', at: 5 },
        actions: [],
      },
      {
        id: 'wave-2-event',
        trigger: { type: 'afterResolved', target: 'wave-1', delay: 1 },
        actions: [],
      },
    ])
  })

  it('creates explicit sequential wave events', () => {
    const waveEvents = createSequentialWaveEvents(
      [fixtureWave, { ...fixtureWave, id: 'wave-2' }],
      {
        firstAt: 1.8,
        delayAfterResolved: 1.5,
      },
    )

    expect(waveEvents).toMatchObject([
      {
        id: 'wave-1-event',
        trigger: { type: 'time', at: 1.8 },
        actions: [{ type: 'spawnWave', wave: { id: 'wave-1' } }],
      },
      {
        id: 'wave-2-event',
        trigger: { type: 'afterResolved', target: 'wave-1', delay: 1.5 },
        actions: [{ type: 'spawnWave', wave: { id: 'wave-2' } }],
      },
    ])
  })

  it('creates boss and victory events with stage-owned ids', () => {
    const bossEvent = createTimeBossEvent(fixtureBoss, 'final', 78)
    const victoryEvent = createVictoryEvent(fixtureBoss.id)

    expect(bossEvent).toMatchObject({
      id: 'boss-brass-core-spawn',
      trigger: { type: 'time', at: 78 },
      actions: [{ type: 'spawnBoss', boss: { id: 'boss-brass-core' }, role: 'final' }],
    })
    expect(victoryEvent).toEqual({
      id: 'boss-brass-core-victory',
      trigger: { type: 'afterDefeated', target: 'boss-brass-core', delay: 0 },
      actions: [{ type: 'finishStage', outcome: 'victory' }],
    })
  })
})
