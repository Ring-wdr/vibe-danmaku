import { useState, useSyncExternalStore } from 'react'

import { createStageDefinition } from '../content/stage1'
import { createBattleRuntime } from '../runtime/battleRuntime'
import type { Difficulty } from '../types'

type BattleRuntimeOptions = {
  difficulty: Difficulty
  fastStage?: boolean
  invincible?: boolean
}

export function useBattleRuntime(options: BattleRuntimeOptions) {
  const [runtime] = useState(() =>
    createBattleRuntime({
      difficulty: options.difficulty,
      stage: createStageDefinition(options.difficulty, { fastStage: options.fastStage }),
      invincible: options.invincible,
    }),
  )

  const snapshot = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot,
  )

  return { runtime, snapshot }
}
