import { assign, setup, type Actor } from 'xstate'

import type { Difficulty, RunResult } from '../game/types'

export type BattleStageNumber = 1 | 2 | 3 | 4

export type BattleSessionInput = {
  selectedCharacterId: string
}

export type BattleSessionContext = {
  difficulty: Difficulty
  selectedCharacterId: string
  currentStageNumber: BattleStageNumber
  battleSeed: number
  campaignScore: number
  result: RunResult | null
}

export type BattleSessionEvent =
  | { type: 'START_SORTIE' }
  | { type: 'OPEN_LEADERBOARD' }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'BACK' }
  | { type: 'SELECT_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'SELECT_CHARACTER'; characterId: string }
  | { type: 'DEPLOY_CHARACTER' }
  | { type: 'BATTLE_ASSETS_READY' }
  | { type: 'BATTLE_COMPLETED'; result: RunResult }
  | { type: 'CONTINUE_CAMPAIGN' }
  | { type: 'RETRY_STAGE' }
  | { type: 'RETURN_TO_TITLE' }

export const battleSessionMachine = setup({
  types: {} as {
    context: BattleSessionContext
    events: BattleSessionEvent
    input: BattleSessionInput
  },
  guards: {
    canContinueCampaign: ({ context }) =>
      context.result?.outcome === 'victory' && context.result.stageNumber < 4,
  },
  actions: {
    resetForNewSortie: assign({
      currentStageNumber: 1,
      campaignScore: 0,
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
    advanceToNextStage: assign(({ context }) => ({
      currentStageNumber: Math.min(4, Math.max(1, (context.result?.stageNumber ?? 1) + 1)) as BattleStageNumber,
      battleSeed: context.battleSeed + 1,
      campaignScore: context.campaignScore + (context.result?.score ?? 0),
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
        currentStageNumber: Math.min(4, Math.max(1, context.result.stageNumber)) as BattleStageNumber,
        battleSeed: context.battleSeed + 1,
        result: null,
      }
    }),
    returnToTitle: assign({
      currentStageNumber: 1,
      campaignScore: 0,
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
    campaignScore: 0,
    result: null,
  }),
  states: {
    title: {
      on: {
        OPEN_LEADERBOARD: {
          target: 'leaderboard',
        },
        OPEN_SETTINGS: {
          target: 'settings',
        },
        START_SORTIE: {
          target: 'difficultySelect',
          actions: 'resetForNewSortie',
        },
      },
    },
    settings: {
      on: {
        BACK: {
          target: 'title',
        },
      },
    },
    leaderboard: {
      on: {
        BACK: {
          target: 'title',
        },
      },
    },
    difficultySelect: {
      on: {
        BACK: {
          target: 'title',
        },
        SELECT_DIFFICULTY: {
          target: 'characterSelect',
          actions: 'selectDifficulty',
        },
      },
    },
    characterSelect: {
      on: {
        BACK: {
          target: 'difficultySelect',
        },
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
        BACK: {
          target: 'characterSelect',
        },
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
        BATTLE_COMPLETED: {
          target: 'result',
          actions: 'storeBattleResult',
        },
        RETURN_TO_TITLE: {
          target: 'title',
          actions: 'returnToTitle',
        },
      },
    },
    result: {
      on: {
        BACK: {
          target: 'title',
          actions: 'returnToTitle',
        },
        CONTINUE_CAMPAIGN: {
          guard: 'canContinueCampaign',
          target: 'battleLoading',
          actions: 'advanceToNextStage',
        },
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

export type BattleSessionActorRef = Actor<typeof battleSessionMachine>
