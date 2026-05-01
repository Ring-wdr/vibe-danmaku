import { render, screen } from '@testing-library/react'
import { createElement, type CSSProperties, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { brassCloudEnemyFrames } from '../content/enemyBrassCloudAtlas'
import {
  battleDragInputConfig,
  BattleView,
  createArenaPoint,
  getAtlasFrameUv,
} from './BattleView'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ style }: { children: ReactNode; style?: CSSProperties }) =>
    createElement('canvas', { 'data-testid': 'battle-canvas', style }),
  useFrame: vi.fn(),
}))

vi.mock('./useBattleRuntime', () => ({
  useBattleRuntime: () => ({
    runtime: {
      update: vi.fn(),
      beginDrag: vi.fn(),
      moveDrag: vi.fn(),
      endDrag: vi.fn(),
    },
    snapshot: {
      difficulty: 'normal',
      stageName: 'Test Stage',
      elapsed: 0,
      duration: 90,
      phaseLabel: 'Opening',
      player: {
        position: { x: 0, z: -3 },
        hp: 3,
        invulnerable: false,
      },
      enemies: [
        {
          id: 'sentinel-1',
          kind: 'brass-cloud-sentinel',
          archetype: 'sentinel',
          variant: 'brass-cloud-sentinel',
          atlasId: 'enemy-brass-cloud',
          frameId: 'sentinel',
          position: { x: -1, z: 1 },
          scale: 0.72,
          hitRadius: 0.28,
        },
        {
          id: 'weaver-1',
          kind: 'brass-cloud-weaver',
          archetype: 'weaver',
          variant: 'brass-cloud-weaver',
          atlasId: 'enemy-brass-cloud',
          frameId: 'weaver',
          position: { x: 1, z: 1 },
          scale: 0.82,
          hitRadius: 0.34,
        },
      ],
      boss: null,
      bullets: [],
      playerShots: 0,
      hitsTaken: 0,
      bossEnteredCount: 0,
      cuePulse: 0,
      result: null,
    },
  }),
}))

const controlRect = {
  left: 0,
  top: 0,
  width: 430,
  height: 932,
} as DOMRect

describe('createArenaPoint', () => {
  it('maps horizontal drag input beyond the wider player movement clamp', () => {
    expect(battleDragInputConfig.horizontalWorldSpan).toBeGreaterThan(9)

    const nearLeftEdge = createArenaPoint(36, 466, controlRect)
    const nearRightEdge = createArenaPoint(394, 466, controlRect)

    expect(nearLeftEdge.x).toBeLessThan(-3.8)
    expect(nearRightEdge.x).toBeGreaterThan(3.8)
  })

  it('maps the former bottom instruction area into the lower movement band', () => {
    expect(battleDragInputConfig.verticalWorldSpan).toBeGreaterThan(5)

    const formerInstructionArea = createArenaPoint(215, 900, controlRect)

    expect(formerInstructionArea.z).toBeLessThan(-3.1)
  })
})

describe('getAtlasFrameUv', () => {
  it('maps image-space atlas frames to Three.js bottom-origin texture UVs', () => {
    const { uvScale, uvOffset } = getAtlasFrameUv(brassCloudEnemyFrames.weaver)

    expect(uvScale.x).toBeCloseTo(1 / 3)
    expect(uvScale.y).toBeCloseTo(1 / 2)
    expect(uvOffset.x).toBeCloseTo(2 / 3)
    expect(uvOffset.y).toBeCloseTo(0)
  })
})

describe('BattleView', () => {
  it('renders the R3F canvas, HUD, and control overlay with atlas-backed enemies', () => {
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
