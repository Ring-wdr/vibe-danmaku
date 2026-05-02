import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { lyraAerCharacter } from '../content/characters'
import { createStageDefinition } from '../content/stage1'
import { useBattleRuntime } from './useBattleRuntime'
import type { RunResult, StageDefinition } from '../types'

function createImmediateVictoryStage(): StageDefinition {
  const stage = createStageDefinition('normal')

  return {
    ...stage,
    duration: 0.01,
    waves: [],
    boss: {
      ...stage.boss,
      startAt: 999,
    },
  }
}

describe('useBattleRuntime', () => {
  it('delivers a runtime result once even when the completion callback changes', () => {
    const stage = createImmediateVictoryStage()
    const firstOnComplete = vi.fn()
    const secondOnComplete = vi.fn()

    const { result, rerender } = renderHook(
      ({ onComplete }: { onComplete: (result: RunResult) => void }) =>
        useBattleRuntime({
          difficulty: 'normal',
          stage,
          character: lyraAerCharacter,
          onComplete,
        }),
      {
        initialProps: {
          onComplete: firstOnComplete,
        },
      },
    )

    act(() => {
      result.current.runtime.update(0.02)
    })

    const battleResult = result.current.snapshot.result

    expect(battleResult).not.toBeNull()
    expect(firstOnComplete).toHaveBeenCalledTimes(1)
    expect(firstOnComplete).toHaveBeenCalledWith(battleResult)

    rerender({
      onComplete: secondOnComplete,
    })

    expect(firstOnComplete).toHaveBeenCalledTimes(1)
    expect(secondOnComplete).not.toHaveBeenCalled()
  })
})
