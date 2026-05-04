import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'

import { battleSessionMachine } from './battleSessionMachine'
import type { Difficulty, RunResult } from '../game/types'

function createResult(overrides: Partial<RunResult> = {}): RunResult {
  return {
    outcome: 'victory',
    stageId: 'stage-1',
    stageName: 'Brass Cloud Gate',
    stageNumber: 1,
    difficulty: 'normal',
    duration: 12.5,
    remainingHp: 2,
    hitsTaken: 1,
    score: 12400,
    maxCombo: 8,
    ...overrides,
  }
}

function createService(selectedCharacterId = 'lyra-aer') {
  const service = createActor(battleSessionMachine, {
    input: { selectedCharacterId },
  })

  service.start()
  return service
}

function deployToBattle(service: ReturnType<typeof createService>, difficulty: Difficulty = 'normal') {
  service.send({ type: 'START_SORTIE' })
  service.send({ type: 'SELECT_DIFFICULTY', difficulty })
  service.send({ type: 'DEPLOY_CHARACTER' })
  service.send({ type: 'DEPLOY_CHARACTER' })
  service.send({ type: 'BATTLE_ASSETS_READY' })
}

describe('battleSessionMachine', () => {
  it('starts at the title with the provided character selection', () => {
    const service = createService('fallback-pilot')

    expect(service.getSnapshot().matches('title')).toBe(true)
    expect(service.getSnapshot().context).toMatchObject({
      difficulty: 'normal',
      selectedCharacterId: 'fallback-pilot',
      currentStageNumber: 1,
      battleSeed: 0,
      campaignScore: 0,
      result: null,
    })
  })

  it('moves from title to difficulty selection', () => {
    const service = createService()

    service.send({ type: 'START_SORTIE' })

    expect(service.getSnapshot().matches('difficultySelect')).toBe(true)
    expect(service.getSnapshot().context.currentStageNumber).toBe(1)
    expect(service.getSnapshot().context.result).toBeNull()
  })

  it('opens settings from title and returns with the back event', () => {
    const service = createService()

    service.send({ type: 'OPEN_SETTINGS' })

    expect(service.getSnapshot().matches('settings')).toBe(true)

    service.send({ type: 'BACK' })

    expect(service.getSnapshot().matches('title')).toBe(true)
  })

  it('navigates backward through menu screens without resetting selected options', () => {
    const service = createService()

    service.send({ type: 'START_SORTIE' })
    service.send({ type: 'SELECT_DIFFICULTY', difficulty: 'hard' })
    service.send({ type: 'SELECT_CHARACTER', characterId: 'vesper-noire' })
    service.send({ type: 'DEPLOY_CHARACTER' })

    expect(service.getSnapshot().matches('stageIntro')).toBe(true)

    service.send({ type: 'BACK' })

    expect(service.getSnapshot().matches('characterSelect')).toBe(true)
    expect(service.getSnapshot().context.selectedCharacterId).toBe('vesper-noire')

    service.send({ type: 'BACK' })

    expect(service.getSnapshot().matches('difficultySelect')).toBe(true)
    expect(service.getSnapshot().context.difficulty).toBe('hard')

    service.send({ type: 'BACK' })

    expect(service.getSnapshot().matches('title')).toBe(true)
  })

  it('stores difficulty and moves to character selection', () => {
    const service = createService()

    service.send({ type: 'START_SORTIE' })
    service.send({ type: 'SELECT_DIFFICULTY', difficulty: 'hard' })

    expect(service.getSnapshot().matches('characterSelect')).toBe(true)
    expect(service.getSnapshot().context.difficulty).toBe('hard')
  })

  it('updates character selection without leaving character selection', () => {
    const service = createService()

    service.send({ type: 'START_SORTIE' })
    service.send({ type: 'SELECT_DIFFICULTY', difficulty: 'easy' })
    service.send({ type: 'SELECT_CHARACTER', characterId: 'fallback-pilot' })

    expect(service.getSnapshot().matches('characterSelect')).toBe(true)
    expect(service.getSnapshot().context.selectedCharacterId).toBe('fallback-pilot')
  })

  it('deploys from character selection to stage intro and then battle loading', () => {
    const service = createService()

    service.send({ type: 'START_SORTIE' })
    service.send({ type: 'SELECT_DIFFICULTY', difficulty: 'normal' })
    service.send({ type: 'DEPLOY_CHARACTER' })

    expect(service.getSnapshot().matches('stageIntro')).toBe(true)

    service.send({ type: 'DEPLOY_CHARACTER' })

    expect(service.getSnapshot().matches('battleLoading')).toBe(true)
    expect(service.getSnapshot().context.currentStageNumber).toBe(1)
  })

  it('moves from battle loading to battle after assets are ready', () => {
    const service = createService()

    service.send({ type: 'START_SORTIE' })
    service.send({ type: 'SELECT_DIFFICULTY', difficulty: 'normal' })
    service.send({ type: 'DEPLOY_CHARACTER' })
    service.send({ type: 'DEPLOY_CHARACTER' })
    service.send({ type: 'BATTLE_ASSETS_READY' })

    expect(service.getSnapshot().matches('battle')).toBe(true)
  })

  it('stores stage 1 victory and waits for confirmation before stage 2 loading', () => {
    const service = createService()
    deployToBattle(service)

    service.send({ type: 'BATTLE_COMPLETED', result: createResult() })

    expect(service.getSnapshot().matches('result')).toBe(true)
    expect(service.getSnapshot().context.currentStageNumber).toBe(1)
    expect(service.getSnapshot().context.result).toMatchObject({
      outcome: 'victory',
      stageNumber: 1,
      score: 12400,
      maxCombo: 8,
    })

    service.send({ type: 'CONTINUE_CAMPAIGN' })

    expect(service.getSnapshot().matches('battleLoading')).toBe(true)
    expect(service.getSnapshot().context.currentStageNumber).toBe(2)
    expect(service.getSnapshot().context.battleSeed).toBe(1)
    expect(service.getSnapshot().context.campaignScore).toBe(12400)
    expect(service.getSnapshot().context.result).toBeNull()
  })

  it('stores stage 2 victory and waits for confirmation before stage 3 loading', () => {
    const service = createService()
    deployToBattle(service)

    service.send({ type: 'BATTLE_COMPLETED', result: createResult() })
    service.send({ type: 'CONTINUE_CAMPAIGN' })
    service.send({ type: 'BATTLE_ASSETS_READY' })
    service.send({
      type: 'BATTLE_COMPLETED',
      result: createResult({
        stageId: 'stage-2',
        stageName: 'Burning Ruin Corridor',
        stageNumber: 2,
      }),
    })

    expect(service.getSnapshot().matches('result')).toBe(true)
    expect(service.getSnapshot().context.currentStageNumber).toBe(2)

    service.send({ type: 'CONTINUE_CAMPAIGN' })

    expect(service.getSnapshot().matches('battleLoading')).toBe(true)
    expect(service.getSnapshot().context.currentStageNumber).toBe(3)
    expect(service.getSnapshot().context.battleSeed).toBe(2)
    expect(service.getSnapshot().context.campaignScore).toBe(24800)
    expect(service.getSnapshot().context.result).toBeNull()
  })

  it('resets accumulated campaign score when starting a new sortie from the title', () => {
    const service = createService()
    deployToBattle(service)

    service.send({ type: 'BATTLE_COMPLETED', result: createResult() })
    service.send({ type: 'CONTINUE_CAMPAIGN' })
    service.send({ type: 'BATTLE_ASSETS_READY' })
    service.send({
      type: 'BATTLE_COMPLETED',
      result: createResult({
        outcome: 'defeat',
        stageId: 'stage-2',
        stageName: 'Burning Ruin Corridor',
        stageNumber: 2,
        score: 8000,
      }),
    })
    service.send({ type: 'RETURN_TO_TITLE' })
    service.send({ type: 'START_SORTIE' })

    expect(service.getSnapshot().context.campaignScore).toBe(0)
  })

  it('stores stage 3 victory and does not continue past final result', () => {
    const service = createService()
    deployToBattle(service)

    service.send({ type: 'BATTLE_COMPLETED', result: createResult() })
    service.send({ type: 'CONTINUE_CAMPAIGN' })
    service.send({ type: 'BATTLE_ASSETS_READY' })
    service.send({
      type: 'BATTLE_COMPLETED',
      result: createResult({
        stageId: 'stage-2',
        stageName: 'Burning Ruin Corridor',
        stageNumber: 2,
      }),
    })
    service.send({ type: 'CONTINUE_CAMPAIGN' })
    service.send({ type: 'BATTLE_ASSETS_READY' })
    service.send({
      type: 'BATTLE_COMPLETED',
      result: createResult({
        stageId: 'stage-3',
        stageName: 'Abyssal Biomech Trench',
        stageNumber: 3,
      }),
    })

    expect(service.getSnapshot().matches('result')).toBe(true)
    expect(service.getSnapshot().context.currentStageNumber).toBe(3)

    service.send({ type: 'CONTINUE_CAMPAIGN' })

    expect(service.getSnapshot().matches('result')).toBe(true)
    expect(service.getSnapshot().context.currentStageNumber).toBe(3)
    expect(service.getSnapshot().context.battleSeed).toBe(2)
    expect(service.getSnapshot().context.campaignScore).toBe(24800)
    expect(service.getSnapshot().context.result?.stageNumber).toBe(3)
  })

  it('clamps retry requests above the final stage back to stage 3', () => {
    const service = createService()
    deployToBattle(service)

    service.send({
      type: 'BATTLE_COMPLETED',
      result: createResult({
        stageId: 'stage-out-of-range',
        stageName: 'Out of Range',
        stageNumber: 99,
      }),
    })
    service.send({ type: 'RETRY_STAGE' })

    expect(service.getSnapshot().matches('battleLoading')).toBe(true)
    expect(service.getSnapshot().context.currentStageNumber).toBe(3)
    expect(service.getSnapshot().context.result).toBeNull()
  })

  it('stores defeat and moves to result', () => {
    const service = createService()
    deployToBattle(service, 'hard')

    service.send({
      type: 'BATTLE_COMPLETED',
      result: createResult({
        outcome: 'defeat',
        difficulty: 'hard',
        remainingHp: 0,
        hitsTaken: 3,
      }),
    })

    expect(service.getSnapshot().matches('result')).toBe(true)
    expect(service.getSnapshot().context.result).toMatchObject({
      outcome: 'defeat',
      difficulty: 'hard',
    })
  })

  it('retries the result stage and clears the stored result', () => {
    const service = createService()
    deployToBattle(service)

    service.send({ type: 'BATTLE_COMPLETED', result: createResult() })
    service.send({ type: 'CONTINUE_CAMPAIGN' })
    service.send({ type: 'BATTLE_ASSETS_READY' })
    service.send({
      type: 'BATTLE_COMPLETED',
      result: createResult({
        outcome: 'defeat',
        stageId: 'stage-2',
        stageName: 'Burning Ruin Corridor',
        stageNumber: 2,
      }),
    })
    service.send({ type: 'RETRY_STAGE' })

    expect(service.getSnapshot().matches('battleLoading')).toBe(true)
    expect(service.getSnapshot().context.currentStageNumber).toBe(2)
    expect(service.getSnapshot().context.battleSeed).toBe(2)
    expect(service.getSnapshot().context.result).toBeNull()
  })

  it('returns to title and resets result-stage context', () => {
    const service = createService()
    deployToBattle(service)

    service.send({
      type: 'BATTLE_COMPLETED',
      result: createResult({ outcome: 'defeat', remainingHp: 0 }),
    })
    service.send({ type: 'RETURN_TO_TITLE' })

    expect(service.getSnapshot().matches('title')).toBe(true)
    expect(service.getSnapshot().context.currentStageNumber).toBe(1)
    expect(service.getSnapshot().context.result).toBeNull()
  })
})
