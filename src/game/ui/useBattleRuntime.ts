import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from 'react'

import { createBattleRuntime } from '../runtime/battleRuntime'
import type { CharacterDefinition, Difficulty, RunResult, StageDefinition } from '../types'

type BattleRuntimeOptions = {
  difficulty: Difficulty
  stage: StageDefinition
  character: CharacterDefinition
  fastStage?: boolean
  invincible?: boolean
  onComplete: (result: RunResult) => void
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
  const deliveredResultRef = useRef<RunResult | null>(null)
  const deliverResult = useEffectEvent((result: RunResult) => {
    options.onComplete(result)
  })

  useEffect(() => {
    if (snapshot.result && deliveredResultRef.current !== snapshot.result) {
      deliveredResultRef.current = snapshot.result
      deliverResult(snapshot.result)
    }
  }, [snapshot.result])

  return { runtime, snapshot }
}
