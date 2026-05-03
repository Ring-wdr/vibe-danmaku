import { assign, createActor, setup, type Actor } from 'xstate'

import type {
  BossFirePatternFsmState,
  BossFsmSnapshot,
  BossMovementFsmState,
  BossPhaseDefinition,
  BossPhaseFsmState,
  BossVulnerabilityFsmState,
} from '../types'
import { isBulletmlPattern } from './bulletmlPattern'

export type BossFsmContext = {
  snapshot: BossFsmSnapshot
  phaseId: string | null
  armorBreakFor: number
}

export type BossFsmUpdate = {
  elapsedInBoss: number
  delta: number
  hpRatio: number
  phase: BossPhaseDefinition | null
  phaseIndex: number
  phaseCount: number
  bossX: number
  playerX: number
  defeated: boolean
}

export type BossFsmEvent = {
  type: 'TICK'
  next: BossFsmContext
}

export const bossFsmTiming = {
  introDuration: 0.08,
  armorBreakDuration: 0.42,
  centerHoldDuration: 1.2,
} as const

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
  const armorBreakFor = phaseChanged
    ? bossFsmTiming.armorBreakDuration
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

function getPhaseState(update: BossFsmUpdate, armorBreakFor: number): BossPhaseFsmState {
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

function getMovementState(update: BossFsmUpdate, phaseState: BossPhaseFsmState): BossMovementFsmState {
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

function getFirePatternState(
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

function getVulnerabilityState(
  phaseState: BossPhaseFsmState,
  armorBreakFor: number,
): BossVulnerabilityFsmState {
  if (phaseState === 'Intro' || phaseState === 'Death') {
    return 'Invulnerable'
  }

  if (armorBreakFor > 0) {
    return 'ArmorBreak'
  }

  return 'Vulnerable'
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
  type: 'parallel',
  context: createInitialBossFsmContext,
  states: {
    phase: {
      initial: 'Intro',
      states: {
        Intro: {},
        CombatPhase: {},
        Break: {},
        Desperation: {},
        Death: {},
      },
      on: {
        TICK: [
          {
            target: '.Intro',
            guard: ({ event }) => event.next.snapshot.phase === 'Intro',
            actions: 'applyTick',
          },
          {
            target: '.CombatPhase',
            guard: ({ event }) => event.next.snapshot.phase === 'CombatPhase',
            actions: 'applyTick',
          },
          {
            target: '.Break',
            guard: ({ event }) => event.next.snapshot.phase === 'Break',
            actions: 'applyTick',
          },
          {
            target: '.Desperation',
            guard: ({ event }) => event.next.snapshot.phase === 'Desperation',
            actions: 'applyTick',
          },
          {
            target: '.Death',
            guard: ({ event }) => event.next.snapshot.phase === 'Death',
            actions: 'applyTick',
          },
        ],
      },
    },
    movement: {
      initial: 'EnterScreen',
      states: {
        EnterScreen: {},
        HoldCenter: {},
        SweepLeftRight: {},
        ChasePlayerX: {},
        Retreat: {},
      },
      on: {
        TICK: [
          {
            target: '.EnterScreen',
            guard: ({ event }) => event.next.snapshot.movement === 'EnterScreen',
          },
          {
            target: '.HoldCenter',
            guard: ({ event }) => event.next.snapshot.movement === 'HoldCenter',
          },
          {
            target: '.SweepLeftRight',
            guard: ({ event }) => event.next.snapshot.movement === 'SweepLeftRight',
          },
          {
            target: '.ChasePlayerX',
            guard: ({ event }) => event.next.snapshot.movement === 'ChasePlayerX',
          },
          {
            target: '.Retreat',
            guard: ({ event }) => event.next.snapshot.movement === 'Retreat',
          },
        ],
      },
    },
    firePattern: {
      initial: 'Idle',
      states: {
        Idle: {},
        AimedFan: {},
        SpiralRing: {},
        WallSweep: {},
        MixedPattern: {},
      },
      on: {
        TICK: [
          {
            target: '.Idle',
            guard: ({ event }) => event.next.snapshot.firePattern === 'Idle',
          },
          {
            target: '.AimedFan',
            guard: ({ event }) => event.next.snapshot.firePattern === 'AimedFan',
          },
          {
            target: '.SpiralRing',
            guard: ({ event }) => event.next.snapshot.firePattern === 'SpiralRing',
          },
          {
            target: '.WallSweep',
            guard: ({ event }) => event.next.snapshot.firePattern === 'WallSweep',
          },
          {
            target: '.MixedPattern',
            guard: ({ event }) => event.next.snapshot.firePattern === 'MixedPattern',
          },
        ],
      },
    },
    vulnerability: {
      initial: 'Invulnerable',
      states: {
        Invulnerable: {},
        Vulnerable: {},
        ArmorBreak: {},
      },
      on: {
        TICK: [
          {
            target: '.Invulnerable',
            guard: ({ event }) => event.next.snapshot.vulnerability === 'Invulnerable',
          },
          {
            target: '.Vulnerable',
            guard: ({ event }) => event.next.snapshot.vulnerability === 'Vulnerable',
          },
          {
            target: '.ArmorBreak',
            guard: ({ event }) => event.next.snapshot.vulnerability === 'ArmorBreak',
          },
        ],
      },
    },
  },
})

export type BossFsmActorRef = Actor<typeof bossFsmMachine>

export function createBossFsmActor(): BossFsmActorRef {
  return createActor(bossFsmMachine).start()
}

export function sendBossFsmTick(actor: BossFsmActorRef, update: BossFsmUpdate) {
  const next = getNextBossFsmContext(actor.getSnapshot().context, update)

  actor.send({ type: 'TICK', next })
}

export function getBossFsmSnapshot(actor: BossFsmActorRef): BossFsmSnapshot {
  return actor.getSnapshot().context.snapshot
}

export function isBossDamageable(actor: BossFsmActorRef) {
  const vulnerability = getBossFsmSnapshot(actor).vulnerability

  return vulnerability === 'Vulnerable' || vulnerability === 'ArmorBreak'
}
