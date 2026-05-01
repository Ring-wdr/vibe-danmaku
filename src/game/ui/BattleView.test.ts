import { render, screen } from '@testing-library/react'
import { createElement, type CSSProperties, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { battleDragInputConfig, BattleView, createArenaPoint } from './BattleView'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ style }: { children: ReactNode; style?: CSSProperties }) =>
    createElement('canvas', { 'data-testid': 'battle-canvas', style }),
  useFrame: vi.fn(),
}))

const controlRect = {
  left: 0,
  top: 0,
  width: 430,
  height: 932,
} as DOMRect

describe('createArenaPoint', () => {
  it('maps horizontal drag input beyond the wider player movement clamp', () => {
    expect(battleDragInputConfig.horizontalWorldSpan).toBeGreaterThan(6.6)

    const nearLeftEdge = createArenaPoint(36, 466, controlRect)
    const nearRightEdge = createArenaPoint(394, 466, controlRect)

    expect(nearLeftEdge.x).toBeLessThan(-3.3)
    expect(nearRightEdge.x).toBeGreaterThan(3.3)
  })

  it('maps the former bottom instruction area into the lower movement band', () => {
    expect(battleDragInputConfig.verticalWorldSpan).toBeGreaterThan(5)

    const formerInstructionArea = createArenaPoint(215, 900, controlRect)

    expect(formerInstructionArea.z).toBeLessThan(-3.1)
  })
})

describe('BattleView', () => {
  it('renders the R3F canvas and drag input overlay without old DOM entity layers', () => {
    const { container } = render(
      createElement(BattleView, { difficulty: 'normal', onComplete: vi.fn() }),
    )

    expect(screen.getByTestId('battle-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('battle-background-motion')).toBeInTheDocument()
    expect(screen.getByLabelText('Battle status')).toBeInTheDocument()
    expect(container.querySelector('.battle-shell__controls')).toBeInTheDocument()
    expect(container.querySelector('.battle-entities')).not.toBeInTheDocument()
    expect(container.querySelector('.battle-stage-plane')).not.toBeInTheDocument()
  })
})
