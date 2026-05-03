import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'
import { lastCharacterStorageKey } from './characterSelectionStorage'
import { battleSettingsStorageKey } from '../game/ui/battleSettingsStorage'
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

    const resultByStage = {
      1: {
        stageId: 'brass-cloud-gate',
        stageName: 'Brass Cloud Gate',
        score: 12400,
        maxCombo: 8,
      },
      2: {
        stageId: 'burning-ruin-corridor',
        stageName: 'Burning Ruin Corridor',
        score: 31800,
        maxCombo: 14,
      },
      3: {
        stageId: 'abyssal-biomech-trench',
        stageName: 'Abyssal Biomech Trench',
        score: 52800,
        maxCombo: 21,
      },
    } as const
    const stageResult = resultByStage[stageNumber as keyof typeof resultByStage]

    const createResult = (outcome: RunResult['outcome']): RunResult => ({
      outcome,
      stageId: stageResult.stageId,
      stageName: stageResult.stageName,
      stageNumber,
      difficulty,
      duration: 12.5,
      remainingHp: outcome === 'victory' ? 2 : 0,
      hitsTaken: outcome === 'victory' ? 1 : 3,
      score: stageResult.score,
      maxCombo: stageResult.maxCombo,
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
    expect(screen.getAllByText(/select pilot/i)).toHaveLength(1)
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

  it('opens settings from the title screen and persists control settings', () => {
    renderApp(<App />)

    fireEvent.click(screen.getByRole('button', { name: /settings/i }))

    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 'Drag' }))
    fireEvent.click(screen.getByRole('radio', { name: '2x' }))
    fireEvent.click(screen.getByRole('button', { name: /apply settings/i }))

    expect(JSON.parse(window.localStorage.getItem(battleSettingsStorageKey) ?? '{}')).toMatchObject({
      controlMode: 'drag',
      dragSensitivity: 2,
    })

    fireEvent.click(screen.getByRole('button', { name: /back/i }))

    expect(screen.getByRole('button', { name: /start sortie/i })).toBeInTheDocument()
  })

  it('renders back buttons through the menu flow', () => {
    renderApp(<App />)

    fireEvent.click(screen.getByRole('button', { name: /start sortie/i }))
    expect(screen.getByRole('heading', { name: /choose difficulty/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByRole('button', { name: /start sortie/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /start sortie/i }))
    fireEvent.click(screen.getByRole('button', { name: /hard/i }))
    expect(screen.getByRole('heading', { name: /select pilot/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByRole('heading', { name: /choose difficulty/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /normal/i }))
    fireEvent.click(screen.getByRole('button', { name: /deploy lyra aer/i }))
    expect(screen.getByRole('heading', { name: /brass cloud gate/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByRole('heading', { name: /select pilot/i })).toBeInTheDocument()
  })

  it('lets players select and deploy Vesper Noire without unlock restrictions', () => {
    renderApp(<App />)

    fireEvent.click(screen.getByRole('button', { name: /start sortie/i }))
    fireEvent.click(screen.getByRole('button', { name: /normal/i }))

    expect(screen.getByRole('button', { name: /select vesper noire/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /select vesper noire/i }))

    expect(screen.getByRole('heading', { name: /vesper noire/i })).toBeInTheDocument()
    expect(screen.getByText(/arcane phantom/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /selected vesper noire/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: /deploy vesper noire/i }))

    expect(window.localStorage.getItem(lastCharacterStorageKey)).toBe('vesper-noire')
    expect(screen.getByText(/pilot vesper noire/i)).toBeInTheDocument()
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

  it('shows stage 1 score results and waits for confirmation before stage 2', async () => {
    await deployToBattle()

    expect(mockBattleView).toHaveBeenLastCalledWith(
      expect.objectContaining({
        difficulty: 'normal',
        stage: expect.objectContaining({ stageNumber: 1 }),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /complete victory/i }))

    expect(
      await screen.findByRole('heading', { name: /brass cloud gate cleared/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('12,400')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.queryByLabelText(/mock stage 2 battle/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await screen.findByLabelText(/mock stage 2 battle/i, undefined, { timeout: 2500 })
    expect(mockGetBattleAssetPreloadItems).toHaveBeenLastCalledWith(
      expect.objectContaining({
        stage: expect.objectContaining({ stageNumber: 2 }),
      }),
    )
    expect(screen.queryByRole('heading', { name: /brass cloud gate cleared/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /burning ruin corridor/i })).not.toBeInTheDocument()
    expect(mockBattleView).toHaveBeenLastCalledWith(
      expect.objectContaining({
        difficulty: 'normal',
        stage: expect.objectContaining({ stageNumber: 2 }),
      }),
    )
  })

  it('keeps the stage 2 loading title visible before starting the next battle', async () => {
    await deployToBattle()
    let resolveStageTwoPreload!: () => void
    const stageTwoPreloadDone = new Promise<void>((resolve) => {
      resolveStageTwoPreload = resolve
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
          ratio: 0.25,
          currentLabel: 'Burning ruin gate',
        })
        await stageTwoPreloadDone
      },
    )

    fireEvent.click(screen.getByRole('button', { name: /complete victory/i }))
    fireEvent.click(await screen.findByRole('button', { name: /confirm/i }))

    expect(
      await screen.findByRole('heading', { name: /burning ruin corridor/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/stage 2/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/mock stage 2 battle/i)).not.toBeInTheDocument()

    const preloadResolvedAt = performance.now()
    resolveStageTwoPreload()

    await waitFor(() => {
      expect(screen.getByText(/battle renderer/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: /burning ruin corridor/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/mock stage 2 battle/i)).not.toBeInTheDocument()

    expect(
      await screen.findByLabelText(/mock stage 2 battle/i, undefined, { timeout: 2500 }),
    ).toBeInTheDocument()
    expect(performance.now() - preloadResolvedAt).toBeGreaterThanOrEqual(1700)
  })

  it('continues from stage 2 victory into stage 3 and shows the final stage result after stage 3 victory', async () => {
    await deployToBattle('hard')

    fireEvent.click(screen.getByRole('button', { name: /complete victory/i }))
    fireEvent.click(await screen.findByRole('button', { name: /confirm/i }))
    await screen.findByLabelText(/mock stage 2 battle/i, undefined, { timeout: 2500 })

    fireEvent.click(screen.getByRole('button', { name: /complete victory/i }))

    expect(
      await screen.findByRole('heading', { name: /burning ruin corridor cleared/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/stage 2/i)).toBeInTheDocument()
    expect(screen.getAllByText(/burning ruin corridor/i)).toHaveLength(2)
    expect(screen.getByText('31,800')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(screen.queryByLabelText(/mock stage 3 battle/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await screen.findByLabelText(/mock stage 3 battle/i, undefined, { timeout: 2500 })
    expect(mockGetBattleAssetPreloadItems).toHaveBeenLastCalledWith(
      expect.objectContaining({
        stage: expect.objectContaining({ stageNumber: 3 }),
      }),
    )
    expect(mockBattleView).toHaveBeenLastCalledWith(
      expect.objectContaining({
        difficulty: 'hard',
        stage: expect.objectContaining({ stageNumber: 3 }),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /complete victory/i }))

    expect(
      await screen.findByRole('heading', { name: /abyssal biomech trench cleared/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/stage 3/i)).toBeInTheDocument()
    expect(screen.getAllByText(/abyssal biomech trench/i)).toHaveLength(2)
    expect(screen.getByText('HARD')).toBeInTheDocument()
    expect(screen.getByText('52,800')).toBeInTheDocument()
    expect(screen.getByText('21')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument()
  })

  it('retries the current failed stage', async () => {
    await deployToBattle()

    fireEvent.click(screen.getByRole('button', { name: /complete victory/i }))
    fireEvent.click(await screen.findByRole('button', { name: /confirm/i }))
    await screen.findByLabelText(/mock stage 2 battle/i, undefined, { timeout: 2500 })

    fireEvent.click(screen.getByRole('button', { name: /complete victory/i }))
    fireEvent.click(await screen.findByRole('button', { name: /confirm/i }))
    await screen.findByLabelText(/mock stage 3 battle/i, undefined, { timeout: 2500 })

    fireEvent.click(screen.getByRole('button', { name: /complete defeat/i }))

    expect(
      await screen.findByRole('heading', { name: /abyssal biomech trench failed/i }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /retry stage/i }))

    await waitFor(() => {
      expect(mockBattleView).toHaveBeenLastCalledWith(
        expect.objectContaining({
          difficulty: 'normal',
          stage: expect.objectContaining({ stageNumber: 3 }),
        }),
      )
    })
    expect(
      await screen.findByLabelText(/mock stage 3 battle/i, undefined, { timeout: 2500 }),
    ).toBeInTheDocument()
  }, 10000)
})
