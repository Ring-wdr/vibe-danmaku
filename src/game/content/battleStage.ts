import { createStageDefinition as createStage1Definition } from './stage1'
import { createStage2Definition } from './stage2'
import { createStage3Definition } from './stage3'
import { createStage4Definition } from './stage4'
import type { Difficulty, StageDefinition } from '../types'

export function createBattleStageDefinition(
  stageNumber: number,
  difficulty: Difficulty,
  options?: { fastStage?: boolean },
): StageDefinition {
  if (stageNumber === 1) {
    return createStage1Definition(difficulty, options)
  }

  if (stageNumber === 2) {
    return createStage2Definition(difficulty, options)
  }

  if (stageNumber === 3) {
    return createStage3Definition(difficulty, options)
  }

  if (stageNumber === 4) {
    return createStage4Definition(difficulty, options)
  }

  return createStage1Definition(difficulty, options)
}
