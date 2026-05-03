import { setup } from 'xstate'

import type { BossMovementFsmState, BossPhaseFsmState } from '../../types'
import type { BossFsmUpdate, MovementFsmEvent } from './bossFsmTypes'
import { bossFsmTiming } from './bossFsmTypes'

export function getMovementState(
  update: BossFsmUpdate,
  phaseState: BossPhaseFsmState,
): BossMovementFsmState {
  if (phaseState === 'Death') {
    return 'Retreat'
  }

  if (phaseState === 'Intro') {
    return 'EnterScreen'
  }

  if (update.elapsedInBoss < bossFsmTiming.centerHoldDuration) {
    return 'HoldCenter'
  }

  if (phaseState === 'CombatPhase' && update.phaseIndex <= 0) {
    return 'SweepLeftRight'
  }

  return 'ChasePlayerX'
}

export const movementFsmMachine = setup({
  types: {} as {
    events: MovementFsmEvent
  },
}).createMachine({
  id: 'bossMovementFsm',
  initial: 'EnterScreen',
  states: {
    EnterScreen: {},
    HoldCenter: {},
    SweepLeftRight: {},
    ChasePlayerX: {},
    Retreat: {},
  },
  on: {
    SET_MOVEMENT: [
      { target: '.EnterScreen', guard: ({ event }) => event.value === 'EnterScreen' },
      { target: '.HoldCenter', guard: ({ event }) => event.value === 'HoldCenter' },
      { target: '.SweepLeftRight', guard: ({ event }) => event.value === 'SweepLeftRight' },
      { target: '.ChasePlayerX', guard: ({ event }) => event.value === 'ChasePlayerX' },
      { target: '.Retreat', guard: ({ event }) => event.value === 'Retreat' },
    ],
  },
})
