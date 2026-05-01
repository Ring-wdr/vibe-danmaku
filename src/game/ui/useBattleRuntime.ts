import { useState, useSyncExternalStore } from 'react'

import { createBattleRuntime } from '../runtime/battleRuntime'
import type { CharacterDefinition, Difficulty, StageDefinition } from '../types'

type BattleRuntimeOptions = {
  difficulty: Difficulty
  stage: StageDefinition
  character: CharacterDefinition
  fastStage?: boolean
  invincible?: boolean
}

export function useBattleRuntime(options: BattleRuntimeOptions) {
  const [runtime] = useState(() =>
    createBattleRuntime({
      difficulty: options.difficulty,
      stage: options.stage,
      character: options.character,
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
