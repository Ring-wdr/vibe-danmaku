import { createStageDefinition as createStage1Definition } from './stage1'
import { createStage2Definition } from './stage2'
import type { Difficulty, StageDefinition } from '../types'

export function createBattleStageDefinition(
  stageNumber: number,
  difficulty: Difficulty,
  options?: { fastStage?: boolean },
): StageDefinition {
  return stageNumber === 1
    ? createStage1Definition(difficulty, options)
    : createStage2Definition(difficulty, options)
}
