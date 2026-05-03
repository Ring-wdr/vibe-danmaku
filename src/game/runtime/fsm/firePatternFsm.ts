import { setup } from 'xstate'

import type { BossFirePatternFsmState, BossPhaseDefinition } from '../../types'
import { isBulletmlPattern } from '../bulletmlPattern'
import type { FirePatternFsmEvent } from './bossFsmTypes'

export function getFirePatternState(
  phase: BossPhaseDefinition | null,
  phaseIndex: number,
): BossFirePatternFsmState {
  if (!phase) {
    return 'Idle'
  }

  if (isBulletmlPattern(phase.pattern)) {
    if (phase.supportLaser) {
      return 'WallSweep'
    }

    if (phaseIndex === 0) {
      return 'AimedFan'
    }

    if (phaseIndex === 1) {
      return 'SpiralRing'
    }

    return 'MixedPattern'
  }

  if (phase.pattern.shape === 'fan' || phase.pattern.shape === 'needle') {
    return 'AimedFan'
  }

  if (phase.pattern.shape === 'ring' || phase.pattern.shape === 'spiral') {
    return 'SpiralRing'
  }

  if (phase.pattern.shape === 'laser-bloom' || phase.pattern.shape === 'wave') {
    return 'WallSweep'
  }

  return 'MixedPattern'
}

export const firePatternFsmMachine = setup({
  types: {} as {
    events: FirePatternFsmEvent
  },
}).createMachine({
  id: 'bossFirePatternFsm',
  initial: 'Idle',
  states: {
    Idle: {},
    AimedFan: {},
    SpiralRing: {},
    WallSweep: {},
    MixedPattern: {},
  },
  on: {
    SET_FIRE_PATTERN: [
      { target: '.Idle', guard: ({ event }) => event.value === 'Idle' },
      { target: '.AimedFan', guard: ({ event }) => event.value === 'AimedFan' },
      { target: '.SpiralRing', guard: ({ event }) => event.value === 'SpiralRing' },
      { target: '.WallSweep', guard: ({ event }) => event.value === 'WallSweep' },
      { target: '.MixedPattern', guard: ({ event }) => event.value === 'MixedPattern' },
    ],
  },
})
