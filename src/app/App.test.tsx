import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'
import { lastCharacterStorageKey } from './characterSelectionStorage'
import type { Difficulty, RunResult, StageDefinition } from '../game/types'

const { mockBattleView, mockGetBattleAssetPreloadItems, mockPreloadBattleAssets } = vi.hoisted(() => ({
  mockBattleView: vi.fn(),
  mockGetBattleAssetPreloadItems: vi.fn(),
  mockPreloadBattleAssets: vi.fn(),
}))

vi.mock('../game/ui/BattleView', () => ({
  BattleView: (props: {
    difficulty?: Difficulty
    stage?: StageDefinition
    sessionActorRef?: {
      getSnapshot: () => {
        context: {
          currentStageNumber: number
          difficulty: Difficulty
        }
      }
      send: (event: { type: 'BATTLE_COMPLETED'; result: RunResult }) => void
    }
    onComplete?: (result: RunResult) => void
  }) => {
    mockBattleView(props)
    const stageNumber = props.stage?.stageNumber
    const difficulty = props.difficulty

    if (!stageNumber || !difficulty) {
      return <section aria-label="Mock battle missing stage" />
    }

    const createResult = (outcome: RunResult['outcome']): RunResult => ({
      outcome,
      stageId: stageNumber === 1 ? 'brass-cloud-gate' : 'burning-ruin-corridor',
      stageName: stageNumber === 1 ? 'Brass Cloud Gate' : 'Burning Ruin Corridor',
      stageNumber,
      difficulty,
      duration: 12.5,
      remainingHp: outcome === 'victory' ? 2 : 0,
      hitsTaken: outcome === 'victory' ? 1 : 3,
    })

    return (
      <section aria-label={`Mock Stage ${stageNumber} battle`}>
        <span data-testid="mock-battle-stage">{stageNumber}</span>
        <button
          type="button"
          onClick={() => {
            const result = createResult('victory')
            props.onComplete?.(result)
            props.sessionActorRef?.send({ type: 'BATTLE_COMPLETED', result })
          }}
        >
          Complete Victory
        </button>
        <button
          type="button"
          onClick={() => {
            const result = createResult('defeat')
            props.onComplete?.(result)
            props.sessionActorRef?.send({ type: 'BATTLE_COMPLETED', result })
          }}
        >
          Complete Defeat
        </button>
      </section>
    )
  },
}))

vi.mock('./battleAssetPreload', () => ({
  getBattleAssetPreloadItems: mockGetBattleAssetPreloadItems,
  preloadBattleAssets: mockPreloadBattleAssets,
}))

function renderApp(ui: ReactElement) {
  return render(ui, {
    wrapper: withNuqsTestingAdapter({ searchParams: '' }),
  })
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockBattleView.mockClear()
    mockGetBattleAssetPreloadItems.mockReset()
    mockPreloadBattleAssets.mockReset()
    mockGetBattleAssetPreloadItems.mockImplementation(
      ({ stage }: { stage: StageDefinition }) => [
        {
          id: `stage-${stage.stageNumber}`,
          label: `Stage ${stage.stageNumber} assets`,
          url: `/stage-${stage.stageNumber}.webp`,
        },
      ],
    )
    mockPreloadBattleAssets.mockImplementation(
      async (
        items: { label: string }[],
        onProgress: (progress: {
          loadedItems: number
          totalItems: number
          ratio: number
          currentLabel: string
        }) => void,
      ) => {
        onProgress({
          loadedItems: items.length,
          totalItems: items.length,
          ratio: 1,
          currentLabel: items[items.length - 1]?.label ?? 'Battle assets',
        })
      },
    )
  })

  it('moves from title to difficulty select to character select before stage intro', () => {
    renderApp(<App />)

    fireEvent.click(screen.getByRole('button', { name: /start sortie/i }))
    fireEvent.click(screen.getByRole('button', { name: /hard/i }))

    expect(screen.getByRole('heading', { name: /select pilot/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /lyra aer/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /lyra aer pilot summary/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /playable characters/i })).toBeInTheDocument()
    expect(screen.queryByText(/difficulty hard engaged/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /deploy lyra aer/i }))

    expect(screen.getByRole('heading', { name: /brass cloud gate/i })).toBeInTheDocument()
    expect(screen.getByText(/difficulty hard engaged/i)).toBeInTheDocument()
    expect(screen.getByText(/pilot lyra aer/i)).toBeInTheDocument()
    expect(screen.getByText(/전투 중 화면 어디든 드래그해 회피하세요/)).toBeInTheDocument()
  })

  it('uses the last saved character id as the default selection', () => {
    window.localStorage.setItem(lastCharacterStorageKey, 'lyra-aer')

    renderApp(<App />)

    fireEvent.click(screen.getByRole('button', { name: /start sortie/i }))
    fireEvent.click(screen.getByRole('button', { name: /normal/i }))

    expect(screen.getByRole('button', { name: /selected lyra aer/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('shows the fallback item when the saved character id is invalid', () => {
    window.localStorage.setItem(lastCharacterStorageKey, 'deleted-character')

    renderApp(<App />)

    fireEvent.click(screen.getByRole('button', { name: /start sortie/i }))
    fireEvent.click(screen.getByRole('button', { name: /easy/i }))

    expect(screen.getByRole('heading', { name: /reserve pilot/i })).toBeInTheDocument()
    expect(screen.getByText(/last selected pilot is no longer available/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /deploy reserve pilot/i }))

    expect(window.localStorage.getItem(lastCharacterStorageKey)).toBe('fallback-pilot')
    expect(screen.getByText(/pilot reserve pilot/i)).toBeInTheDocument()
  })

  it('shows portrait-only notice when the viewport is landscape', () => {
    renderApp(<App initialViewport={{ width: 900, height: 500 }} />)

    expect(screen.getByText(/portrait mode required/i)).toBeInTheDocument()
  })

  async function deployToBattle(difficulty: Difficulty = 'normal') {
    renderApp(<App />)

    fireEvent.click(screen.getByRole('button', { name: /start sortie/i }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(difficulty, 'i') }))
    fireEvent.click(screen.getByRole('button', { name: /deploy lyra aer/i }))
    fireEvent.click(screen.getByRole('button', { name: /^deploy$/i }))

    await screen.findByLabelText(/mock stage 1 battle/i)
  }

  it('shows battle asset loading progress before rendering the battle screen', async () => {
    let resolvePreload!: () => void
    const preloadDone = new Promise<void>((resolve) => {
      resolvePreload = resolve
    })
    mockPreloadBattleAssets.mockImplementationOnce(
      async (
        items: { label: string }[],
        onProgress: (progress: {
          loadedItems: number
          totalItems: number
          ratio: number
          currentLabel: string
        }) => void,
      ) => {
        onProgress({
          loadedItems: 0,
          totalItems: items.length,
          ratio: 0.42,
          currentLabel: 'Brass boss core',
        })
        await preloadDone
      },
    )

    renderApp(<App />)

    fireEvent.click(screen.getByRole('button', { name: /start sortie/i }))
    fireEvent.click(screen.getByRole('button', { name: /normal/i }))
    fireEvent.click(screen.getByRole('button', { name: /deploy lyra aer/i }))
    fireEvent.click(screen.getByRole('button', { name: /^deploy$/i }))

    expect(screen.getByRole('progressbar', { name: /battle assets/i })).toHaveAttribute(
      'aria-valuenow',
      '42',
    )
    expect(screen.getByText(/brass boss core/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/mock stage 1 battle/i)).not.toBeInTheDocument()

    resolvePreload()

    expect(await screen.findByLabelText(/mock stage 1 battle/i)).toBeInTheDocument()
  })

  it('automatically starts stage 2 when stage 1 is cleared without showing results', async () => {
    await deployToBattle()

    expect(mockBattleView).toHaveBeenLastCalledWith(
      expect.objectContaining({
        difficulty: 'normal',
        stage: expect.objectContaining({ stageNumber: 1 }),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /complete victory/i }))

    await screen.findByLabelText(/mock stage 2 battle/i)
    expect(mockGetBattleAssetPreloadItems).toHaveBeenLastCalledWith(
      expect.objectContaining({
        stage: expect.objectContaining({ stageNumber: 2 }),
      }),
    )
    expect(screen.queryByRole('heading', { name: /cloud gate broken/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /burning ruin corridor/i })).not.toBeInTheDocument()
    expect(mockBattleView).toHaveBeenLastCalledWith(
      expect.objectContaining({
        difficulty: 'normal',
        stage: expect.objectContaining({ stageNumber: 2 }),
      }),
    )
  })

  it('shows the final stage result after stage 2 victory', async () => {
    await deployToBattle('hard')

    fireEvent.click(screen.getByRole('button', { name: /complete victory/i }))
    await screen.findByLabelText(/mock stage 2 battle/i)

    fireEvent.click(screen.getByRole('button', { name: /complete victory/i }))

    expect(
      await screen.findByRole('heading', { name: /burning ruin corridor cleared/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/stage 2/i)).toBeInTheDocument()
    expect(screen.getAllByText(/burning ruin corridor/i)).toHaveLength(2)
    expect(screen.getByText('HARD')).toBeInTheDocument()
  })

  it('retries the current failed stage', async () => {
    await deployToBattle()

    fireEvent.click(screen.getByRole('button', { name: /complete victory/i }))
    await screen.findByLabelText(/mock stage 2 battle/i)

    fireEvent.click(screen.getByRole('button', { name: /complete defeat/i }))

    expect(
      await screen.findByRole('heading', { name: /burning ruin corridor failed/i }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /retry stage/i }))

    await waitFor(() => {
      expect(mockBattleView).toHaveBeenLastCalledWith(
        expect.objectContaining({
          difficulty: 'normal',
          stage: expect.objectContaining({ stageNumber: 2 }),
        }),
      )
    })
    expect(await screen.findByLabelText(/mock stage 2 battle/i)).toBeInTheDocument()
  })
})
