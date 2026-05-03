import { describe, expect, it } from 'vitest'

import { createBossFsmActor, getBossFsmSnapshot, sendBossFsmTick } from './bossFsm'
import type { BossPhaseDefinition } from '../types'

const fanPhase = {
  id: 'opening',
  threshold: 0.68,
  label: 'Opening',
  supportLaser: false,
  pattern: { shape: 'fan', count: 4, interval: 1, speed: 1, spread: 1, life: 4 },
} satisfies BossPhaseDefinition

const spiralPhase = {
  ...fanPhase,
  id: 'spiral',
  threshold: 0.34,
  pattern: { shape: 'spiral', count: 6, interval: 1, speed: 1, spread: 0.4, life: 4 },
} satisfies BossPhaseDefinition

const wallPhase = {
  ...fanPhase,
  id: 'wall',
  threshold: 0,
  supportLaser: true,
  pattern: { shape: 'laser-bloom', count: 8, interval: 1, speed: 1, spread: 0.4, life: 4 },
} satisfies BossPhaseDefinition

describe('boss fsm', () => {
  it('runs as an XState actor without React bindings', () => {
    const actor = createBossFsmActor()

    expect(getBossFsmSnapshot(actor)).toEqual({
      phase: 'Intro',
      phaseId: null,
      phaseIndex: null,
      movement: 'EnterScreen',
      firePattern: 'Idle',
      vulnerability: 'Invulnerable',
    })
    expect(actor.getSnapshot().value).toEqual({
      phase: 'Intro',
      movement: 'EnterScreen',
      firePattern: 'Idle',
      vulnerability: 'Invulnerable',
    })
  })

  it('maps boss phase, movement, fire pattern, and vulnerability independently', () => {
    const actor = createBossFsmActor()

    sendBossFsmTick(actor, {
      elapsedInBoss: 0.85,
      delta: 0.85,
      hpRatio: 1,
      phase: fanPhase,
      phaseIndex: 0,
      phaseCount: 3,
      bossX: 0,
      playerX: 0,
      defeated: false,
    })

    expect(getBossFsmSnapshot(actor)).toEqual({
      phase: 'CombatPhase',
      phaseId: 'opening',
      phaseIndex: 0,
      movement: 'HoldCenter',
      firePattern: 'AimedFan',
      vulnerability: 'Vulnerable',
    })

    sendBossFsmTick(actor, {
      elapsedInBoss: 1.3,
      delta: 0.45,
      hpRatio: 1,
      phase: fanPhase,
      phaseIndex: 0,
      phaseCount: 3,
      bossX: 0,
      playerX: 0,
      defeated: false,
    })

    expect(getBossFsmSnapshot(actor)).toEqual({
      phase: 'CombatPhase',
      phaseId: 'opening',
      phaseIndex: 0,
      movement: 'SweepLeftRight',
      firePattern: 'AimedFan',
      vulnerability: 'Vulnerable',
    })

    sendBossFsmTick(actor, {
      elapsedInBoss: 1.65,
      delta: 0.35,
      hpRatio: 0.5,
      phase: spiralPhase,
      phaseIndex: 1,
      phaseCount: 3,
      bossX: 0,
      playerX: 1.5,
      defeated: false,
    })

    expect(getBossFsmSnapshot(actor)).toEqual({
      phase: 'Break',
      phaseId: 'spiral',
      phaseIndex: 1,
      movement: 'ChasePlayerX',
      firePattern: 'SpiralRing',
      vulnerability: 'ArmorBreak',
    })

    sendBossFsmTick(actor, {
      elapsedInBoss: 1.8,
      delta: 0.6,
      hpRatio: 0.5,
      phase: spiralPhase,
      phaseIndex: 1,
      phaseCount: 3,
      bossX: 0.5,
      playerX: -1,
      defeated: false,
    })

    expect(getBossFsmSnapshot(actor)).toEqual({
      phase: 'CombatPhase',
      phaseId: 'spiral',
      phaseIndex: 1,
      movement: 'ChasePlayerX',
      firePattern: 'SpiralRing',
      vulnerability: 'Vulnerable',
    })

    sendBossFsmTick(actor, {
      elapsedInBoss: 2.1,
      delta: 0.3,
      hpRatio: 0.2,
      phase: wallPhase,
      phaseIndex: 2,
      phaseCount: 3,
      bossX: 0.5,
      playerX: -1,
      defeated: false,
    })

    expect(getBossFsmSnapshot(actor)).toEqual({
      phase: 'Desperation',
      phaseId: 'wall',
      phaseIndex: 2,
      movement: 'ChasePlayerX',
      firePattern: 'WallSweep',
      vulnerability: 'ArmorBreak',
    })

    sendBossFsmTick(actor, {
      elapsedInBoss: 2,
      delta: 0.2,
      hpRatio: 0,
      phase: wallPhase,
      phaseIndex: 2,
      phaseCount: 3,
      bossX: 0,
      playerX: 0,
      defeated: true,
    })

    expect(getBossFsmSnapshot(actor)).toEqual({
      phase: 'Death',
      phaseId: 'wall',
      phaseIndex: 2,
      movement: 'Retreat',
      firePattern: 'Idle',
      vulnerability: 'Invulnerable',
    })
  })
})
