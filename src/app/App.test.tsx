import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'
import { lastCharacterStorageKey } from './characterSelectionStorage'
import type { RunResult, StageDefinition } from '../game/types'

const { mockBattleView } = vi.hoisted(() => ({
  mockBattleView: vi.fn(),
}))

vi.mock('../game/ui/BattleView', () => ({
  BattleView: (props: {
    stage?: StageDefinition
    onComplete: (result: RunResult) => void
  }) => {
    mockBattleView(props)
    const stage = props.stage

    if (!stage) {
      return <section aria-label="Mock battle missing stage" />
    }

    const createResult = (outcome: RunResult['outcome']): RunResult => ({
      outcome,
      stageId: stage.id,
      stageName: stage.name,
      stageNumber: stage.stageNumber,
      difficulty: 'normal',
      duration: 12.5,
      remainingHp: outcome === 'victory' ? 2 : 0,
      hitsTaken: outcome === 'victory' ? 1 : 3,
    })

    return (
      <section aria-label={`Mock Stage ${stage.stageNumber} battle`}>
        <span data-testid="mock-battle-stage">{stage.stageNumber}</span>
        <button type="button" onClick={() => props.onComplete(createResult('victory'))}>
          Complete Victory
        </button>
        <button type="button" onClick={() => props.onComplete(createResult('defeat'))}>
          Complete Defeat
        </button>
      </section>
    )
  },
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
  })

  it('moves from title to difficulty select to character select before stage intro', () => {
    renderApp(<App />)

    fireEvent.click(screen.getByRole('button', { name: /start sortie/i }))
    fireEvent.click(screen.getByRole('button', { name: /hard/i }))

    expect(screen.getByRole('heading', { name: /select pilot/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /lyra aer/i })).toBeInTheDocument()
    expect(document.querySelector('.character-focus')).toBeInTheDocument()
    expect(document.querySelector('.character-roster')).toBeInTheDocument()
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

  async function deployToBattle() {
    renderApp(<App />)

    fireEvent.click(screen.getByRole('button', { name: /start sortie/i }))
    fireEvent.click(screen.getByRole('button', { name: /normal/i }))
    fireEvent.click(screen.getByRole('button', { name: /deploy lyra aer/i }))
    fireEvent.click(screen.getByRole('button', { name: /^deploy$/i }))

    await screen.findByLabelText(/mock stage 1 battle/i)
  }

  it('automatically starts stage 2 when stage 1 is cleared without showing results', async () => {
    await deployToBattle()

    expect(mockBattleView).toHaveBeenLastCalledWith(
      expect.objectContaining({
        stage: expect.objectContaining({ stageNumber: 1 }),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /complete victory/i }))

    await screen.findByLabelText(/mock stage 2 battle/i)
    expect(screen.queryByRole('heading', { name: /cloud gate broken/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /burning ruin corridor/i })).not.toBeInTheDocument()
    expect(mockBattleView).toHaveBeenLastCalledWith(
      expect.objectContaining({
        stage: expect.objectContaining({
          stageNumber: 2,
          name: 'Burning Ruin Corridor',
        }),
      }),
    )
  })

  it('shows the final stage result after stage 2 victory', async () => {
    await deployToBattle()

    fireEvent.click(screen.getByRole('button', { name: /complete victory/i }))
    await screen.findByLabelText(/mock stage 2 battle/i)

    fireEvent.click(screen.getByRole('button', { name: /complete victory/i }))

    expect(
      await screen.findByRole('heading', { name: /burning ruin corridor cleared/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/stage 2/i)).toBeInTheDocument()
    expect(screen.getAllByText(/burning ruin corridor/i)).toHaveLength(2)
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
          stage: expect.objectContaining({ stageNumber: 2 }),
        }),
      )
    })
    expect(screen.getByLabelText(/mock stage 2 battle/i)).toBeInTheDocument()
  })
})
