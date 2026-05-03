import type {
  BossFirePatternFsmState,
  BossFsmSnapshot,
  BossMovementFsmState,
  BossPhaseDefinition,
  BossPhaseFsmState,
  BossVulnerabilityFsmState,
} from '../../types'

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
  phaseBreakDuration?: number
  bossX: number
  playerX: number
  defeated: boolean
}

export type BossFsmEvent = {
  type: 'TICK'
  next: BossFsmContext
}

export type PhaseFsmEvent = {
  type: 'SET_PHASE'
  value: BossPhaseFsmState
}

export type MovementFsmEvent = {
  type: 'SET_MOVEMENT'
  value: BossMovementFsmState
}

export type FirePatternFsmEvent = {
  type: 'SET_FIRE_PATTERN'
  value: BossFirePatternFsmState
}

export type VulnerabilityFsmEvent = {
  type: 'SET_VULNERABILITY'
  value: BossVulnerabilityFsmState
}

export type BossFsmRegionValues = {
  phase: BossPhaseFsmState
  movement: BossMovementFsmState
  firePattern: BossFirePatternFsmState
  vulnerability: BossVulnerabilityFsmState
}

export const bossFsmTiming = {
  introDuration: 0.08,
  armorBreakDuration: 0.42,
  centerHoldDuration: 1.2,
} as const
