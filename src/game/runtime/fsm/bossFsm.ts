import { assign, createActor, setup, type Actor } from 'xstate'

import type {
  BossFirePatternFsmState,
  BossFsmSnapshot,
  BossMovementFsmState,
  BossPhaseFsmState,
  BossVulnerabilityFsmState,
} from '../../types'
import { getFirePatternState, firePatternFsmMachine } from './firePatternFsm'
import { getMovementState, movementFsmMachine } from './movementFsm'
import { getPhaseState, phaseFsmMachine } from './phaseFsm'
import { getVulnerabilityState, vulnerabilityFsmMachine } from './vulnerabilityFsm'
import type {
  BossFsmContext,
  BossFsmEvent,
  BossFsmRegionValues,
  BossFsmUpdate,
} from './bossFsmTypes'
import { bossFsmTiming } from './bossFsmTypes'

export type { BossFsmContext, BossFsmUpdate } from './bossFsmTypes'
export { bossFsmTiming } from './bossFsmTypes'
export { firePatternFsmMachine } from './firePatternFsm'
export { movementFsmMachine } from './movementFsm'
export { phaseFsmMachine } from './phaseFsm'
export { vulnerabilityFsmMachine } from './vulnerabilityFsm'

function createInitialBossFsmContext(): BossFsmContext {
  return {
    snapshot: {
      phase: 'Intro',
      phaseId: null,
      phaseIndex: null,
      movement: 'EnterScreen',
      firePattern: 'Idle',
      vulnerability: 'Invulnerable',
    },
    phaseId: null,
    armorBreakFor: 0,
  }
}

function getNextBossFsmContext(
  current: BossFsmContext,
  update: BossFsmUpdate,
): BossFsmContext {
  const phaseId = update.phase?.id ?? null
  const phaseIndex = phaseId === null ? null : update.phaseIndex
  const phaseChanged = current.phaseId !== null && phaseId !== null && current.phaseId !== phaseId
  const armorBreakDuration = update.phaseBreakDuration ?? bossFsmTiming.armorBreakDuration
  const armorBreakFor = phaseChanged
    ? armorBreakDuration
    : Math.max(0, current.armorBreakFor - update.delta)
  const phaseState = getPhaseState(update, armorBreakFor)
  const vulnerability = getVulnerabilityState(phaseState, armorBreakFor)
  const firePattern =
    vulnerability === 'Invulnerable'
      ? 'Idle'
      : getFirePatternState(update.phase, update.phaseIndex)

  return {
    snapshot: {
      phase: phaseState,
      phaseId,
      phaseIndex,
      movement: getMovementState(update, phaseState),
      firePattern,
      vulnerability,
    },
    phaseId,
    armorBreakFor,
  }
}

export const bossFsmMachine = setup({
  types: {} as {
    context: BossFsmContext
    events: BossFsmEvent
  },
  actions: {
    applyTick: assign(({ event }) => event.next),
  },
}).createMachine({
  id: 'bossFsm',
  initial: 'active',
  context: createInitialBossFsmContext,
  states: {
    active: {
      on: {
        TICK: {
          actions: 'applyTick',
        },
      },
    },
  },
})

export type BossFsmActorRef = {
  boss: Actor<typeof bossFsmMachine>
  phase: Actor<typeof phaseFsmMachine>
  movement: Actor<typeof movementFsmMachine>
  firePattern: Actor<typeof firePatternFsmMachine>
  vulnerability: Actor<typeof vulnerabilityFsmMachine>
}

export function createBossFsmActor(): BossFsmActorRef {
  return {
    boss: createActor(bossFsmMachine).start(),
    phase: createActor(phaseFsmMachine).start(),
    movement: createActor(movementFsmMachine).start(),
    firePattern: createActor(firePatternFsmMachine).start(),
    vulnerability: createActor(vulnerabilityFsmMachine).start(),
  }
}

export function sendBossFsmTick(actor: BossFsmActorRef, update: BossFsmUpdate) {
  const next = getNextBossFsmContext(actor.boss.getSnapshot().context, update)

  actor.boss.send({ type: 'TICK', next })
  actor.phase.send({ type: 'SET_PHASE', value: next.snapshot.phase })
  actor.movement.send({ type: 'SET_MOVEMENT', value: next.snapshot.movement })
  actor.firePattern.send({ type: 'SET_FIRE_PATTERN', value: next.snapshot.firePattern })
  actor.vulnerability.send({
    type: 'SET_VULNERABILITY',
    value: next.snapshot.vulnerability,
  })
}

export function getBossFsmSnapshot(actor: BossFsmActorRef): BossFsmSnapshot {
  return actor.boss.getSnapshot().context.snapshot
}

export function getBossFsmRegionValues(actor: BossFsmActorRef): BossFsmRegionValues {
  return {
    phase: actor.phase.getSnapshot().value as BossPhaseFsmState,
    movement: actor.movement.getSnapshot().value as BossMovementFsmState,
    firePattern: actor.firePattern.getSnapshot().value as BossFirePatternFsmState,
    vulnerability: actor.vulnerability.getSnapshot().value as BossVulnerabilityFsmState,
  }
}

export function isBossDamageable(actor: BossFsmActorRef) {
  const vulnerability = getBossFsmSnapshot(actor).vulnerability

  return vulnerability === 'Vulnerable' || vulnerability === 'ArmorBreak'
}
