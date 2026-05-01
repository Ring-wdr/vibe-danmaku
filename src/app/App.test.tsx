import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import { App } from './App'
import { lastCharacterStorageKey } from './characterSelectionStorage'

function renderApp(ui: ReactElement) {
  return render(ui, {
    wrapper: withNuqsTestingAdapter({ searchParams: '' }),
  })
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('moves from title to difficulty select to character select before stage intro', () => {
    renderApp(<App />)

    fireEvent.click(screen.getByRole('button', { name: /start sortie/i }))
    fireEvent.click(screen.getByRole('button', { name: /hard/i }))

    expect(screen.getByRole('heading', { name: /select pilot/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /lyra aer/i })).toBeInTheDocument()
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

    expect(screen.getByRole('button', { name: /selected lyra aer/i })).toBeInTheDocument()
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
})
