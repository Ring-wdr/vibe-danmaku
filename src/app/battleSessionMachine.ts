import { assign, setup } from 'xstate'

import type { Difficulty, RunResult } from '../game/types'

export type BattleStageNumber = 1 | 2

export type BattleSessionInput = {
  selectedCharacterId: string
}

export type BattleSessionContext = {
  difficulty: Difficulty
  selectedCharacterId: string
  currentStageNumber: BattleStageNumber
  battleSeed: number
  result: RunResult | null
}

export type BattleSessionEvent =
  | { type: 'START_SORTIE' }
  | { type: 'SELECT_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'SELECT_CHARACTER'; characterId: string }
  | { type: 'DEPLOY_CHARACTER' }
  | { type: 'BATTLE_ASSETS_READY' }
  | { type: 'BATTLE_COMPLETED'; result: RunResult }
  | { type: 'RETRY_STAGE' }
  | { type: 'RETURN_TO_TITLE' }

export const battleSessionMachine = setup({
  types: {} as {
    context: BattleSessionContext
    events: BattleSessionEvent
    input: BattleSessionInput
  },
  guards: {
    completedStageOneVictory: ({ event }) =>
      event.type === 'BATTLE_COMPLETED' &&
      event.result.outcome === 'victory' &&
      event.result.stageNumber === 1,
  },
  actions: {
    resetForNewSortie: assign({
      currentStageNumber: 1,
      result: null,
    }),
    selectDifficulty: assign(({ event }) => {
      if (event.type !== 'SELECT_DIFFICULTY') {
        return {}
      }

      return {
        difficulty: event.difficulty,
      }
    }),
    selectCharacter: assign(({ event }) => {
      if (event.type !== 'SELECT_CHARACTER') {
        return {}
      }

      return {
        selectedCharacterId: event.characterId,
      }
    }),
    prepareStageOneBattle: assign({
      currentStageNumber: 1,
    }),
    advanceToStageTwo: assign(({ context }) => ({
      currentStageNumber: 2,
      battleSeed: context.battleSeed + 1,
      result: null,
    })),
    storeBattleResult: assign(({ event }) => {
      if (event.type !== 'BATTLE_COMPLETED') {
        return {}
      }

      return {
        result: event.result,
      }
    }),
    retryResultStage: assign(({ context }) => {
      if (!context.result) {
        return {}
      }

      return {
        currentStageNumber: context.result.stageNumber === 2 ? 2 : 1,
        battleSeed: context.battleSeed + 1,
        result: null,
      }
    }),
    returnToTitle: assign({
      currentStageNumber: 1,
      result: null,
    }),
  },
}).createMachine({
  id: 'battleSession',
  initial: 'title',
  context: ({ input }) => ({
    difficulty: 'normal',
    selectedCharacterId: input.selectedCharacterId,
    currentStageNumber: 1,
    battleSeed: 0,
    result: null,
  }),
  states: {
    title: {
      on: {
        START_SORTIE: {
          target: 'difficultySelect',
          actions: 'resetForNewSortie',
        },
      },
    },
    difficultySelect: {
      on: {
        SELECT_DIFFICULTY: {
          target: 'characterSelect',
          actions: 'selectDifficulty',
        },
      },
    },
    characterSelect: {
      on: {
        SELECT_CHARACTER: {
          actions: 'selectCharacter',
        },
        DEPLOY_CHARACTER: {
          target: 'stageIntro',
        },
      },
    },
    stageIntro: {
      on: {
        DEPLOY_CHARACTER: {
          target: 'battleLoading',
          actions: 'prepareStageOneBattle',
        },
      },
    },
    battleLoading: {
      on: {
        BATTLE_ASSETS_READY: {
          target: 'battle',
        },
      },
    },
    battle: {
      on: {
        BATTLE_COMPLETED: [
          {
            guard: 'completedStageOneVictory',
            target: 'battleLoading',
            actions: 'advanceToStageTwo',
          },
          {
            target: 'result',
            actions: 'storeBattleResult',
          },
        ],
      },
    },
    result: {
      on: {
        RETRY_STAGE: {
          target: 'battleLoading',
          actions: 'retryResultStage',
        },
        RETURN_TO_TITLE: {
          target: 'title',
          actions: 'returnToTitle',
        },
      },
    },
  },
})
