import { setup } from 'xstate'

import type { BossPhaseFsmState } from '../../types'
import type { BossFsmUpdate, PhaseFsmEvent } from './bossFsmTypes'
import { bossFsmTiming } from './bossFsmTypes'

export function getPhaseState(
  update: BossFsmUpdate,
  armorBreakFor: number,
): BossPhaseFsmState {
  if (update.defeated) {
    return 'Death'
  }

  if (update.elapsedInBoss < bossFsmTiming.introDuration || !update.phase) {
    return 'Intro'
  }

  if (update.hpRatio <= 0.34) {
    return 'Desperation'
  }

  if (armorBreakFor > 0) {
    return 'Break'
  }

  return 'CombatPhase'
}

export const phaseFsmMachine = setup({
  types: {} as {
    events: PhaseFsmEvent
  },
}).createMachine({
  id: 'bossPhaseFsm',
  initial: 'Intro',
  states: {
    Intro: {},
    CombatPhase: {},
    Break: {},
    Desperation: {},
    Death: {},
  },
  on: {
    SET_PHASE: [
      { target: '.Intro', guard: ({ event }) => event.value === 'Intro' },
      { target: '.CombatPhase', guard: ({ event }) => event.value === 'CombatPhase' },
      { target: '.Break', guard: ({ event }) => event.value === 'Break' },
      { target: '.Desperation', guard: ({ event }) => event.value === 'Desperation' },
      { target: '.Death', guard: ({ event }) => event.value === 'Death' },
    ],
  },
})
