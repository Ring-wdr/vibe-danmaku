import { fireEvent, render, screen } from '@testing-library/react'
import { createElement, type CSSProperties, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { lyraAerCharacter } from '../content/characters'
import { brassCloudEnemyFrames } from '../content/enemyBrassCloudAtlas'
import { createStageDefinition } from '../content/stage1'
import { createStage2Definition } from '../content/stage2'
import {
  battleDragInputConfig,
  BattleView,
  createArenaPoint,
  getAtlasFrameUv,
  getFlightAirflowDynamics,
  getPlayerBattleSpritePose,
} from './BattleView'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ style }: { children: ReactNode; style?: CSSProperties }) =>
    createElement('canvas', { 'data-testid': 'battle-canvas', style }),
  useFrame: vi.fn(),
}))

const { mockActivateSpecial, mockSnapshot, mockUseBattleRuntime } = vi.hoisted(() => ({
  mockActivateSpecial: vi.fn(),
  mockUseBattleRuntime: vi.fn(),
  mockSnapshot: {
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
    specialSlots: [
      {
        id: 'beam-lance',
        icon: 'beam',
        charge: 50,
        maxCharge: 100,
        ready: false,
        active: false,
        activeRatio: 0,
      },
    ],
    specialBeam: null,
    sparkles: [],
    playerShots: 0,
    hitsTaken: 0,
    bossEnteredCount: 0,
    cuePulse: 0,
    result: null,
  },
}))

vi.mock('./useBattleRuntime', () => ({
  useBattleRuntime: mockUseBattleRuntime,
}))

const controlRect = {
  left: 0,
  top: 0,
  width: 430,
  height: 932,
} as DOMRect
const defaultStage = createStageDefinition('normal')

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

describe('getPlayerBattleSpritePose', () => {
  it('keeps the player on frame 0 while idle', () => {
    expect(getPlayerBattleSpritePose({ currentX: 0, previousX: 0 })).toEqual({
      frameIndex: 0,
      flipX: false,
    })
  })

  it('reserves frame 2 for the future special attack pose', () => {
    expect(
      getPlayerBattleSpritePose({ currentX: 0, previousX: 0, specialActive: true }),
    ).toEqual({
      frameIndex: 2,
      flipX: false,
    })
  })

  it('uses frame 3 for player-driven horizontal movement and flips left movement', () => {
    expect(getPlayerBattleSpritePose({ currentX: 1, previousX: 0 })).toEqual({
      frameIndex: 3,
      flipX: false,
    })
    expect(getPlayerBattleSpritePose({ currentX: -1, previousX: 0 })).toEqual({
      frameIndex: 3,
      flipX: true,
    })
  })

  it('can keep the horizontal movement frame briefly after a drag step', () => {
    expect(
      getPlayerBattleSpritePose({
        currentX: 1,
        previousX: 1,
        heldHorizontalDirection: 1,
      }),
    ).toEqual({
      frameIndex: 3,
      flipX: false,
    })
  })
})

describe('getFlightAirflowDynamics', () => {
  it('raises turn intensity when the player changes lateral direction quickly', () => {
    const dynamics = getFlightAirflowDynamics({
      currentPosition: { x: -0.4, z: -3 },
      previousPosition: { x: 0.2, z: -3 },
      previousHorizontalVelocity: 8,
      delta: 1 / 60,
    })

    expect(dynamics.direction).toBe(-1)
    expect(dynamics.turnRatio).toBeGreaterThan(0.8)
    expect(dynamics.speedRatio).toBe(1)
  })

  it('keeps idle airflow dynamics calm without creating a turn impulse', () => {
    expect(
      getFlightAirflowDynamics({
        currentPosition: { x: 0, z: -3 },
        previousPosition: { x: 0, z: -3 },
        previousHorizontalVelocity: 0,
        delta: 1 / 60,
      }),
    ).toMatchObject({
      direction: 0,
      horizontalVelocity: 0,
      speedRatio: 0,
      turnRatio: 0,
    })
  })
})

describe('BattleView', () => {
  beforeEach(() => {
    mockActivateSpecial.mockClear()
    mockUseBattleRuntime.mockReset()
    mockSnapshot.specialSlots = [
      {
        id: 'beam-lance',
        icon: 'beam',
        charge: 50,
        maxCharge: 100,
        ready: false,
        active: false,
        activeRatio: 0,
      },
    ]
    mockUseBattleRuntime.mockReturnValue({
      runtime: {
        update: vi.fn(),
        beginDrag: vi.fn(),
        moveDrag: vi.fn(),
        endDrag: vi.fn(),
        activateSpecial: mockActivateSpecial,
      },
      snapshot: mockSnapshot,
    })
  })

  it('renders the R3F canvas, HUD, and control overlay with atlas-backed enemies', () => {
    const { container } = render(
      createElement(BattleView, {
        difficulty: 'normal',
        stage: defaultStage,
        character: lyraAerCharacter,
        onComplete: vi.fn(),
      }),
    )

    expect(screen.getByTestId('battle-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('battle-background-motion')).toBeInTheDocument()
    expect(screen.getByTestId('battle-airflow-motion')).toBeInTheDocument()
    expect(screen.getByLabelText('Battle status')).toBeInTheDocument()
    expect(container.querySelector('.battle-shell__controls')).toBeInTheDocument()
    expect(container.querySelector('.battle-entities')).not.toBeInTheDocument()
    expect(container.querySelector('.battle-stage-plane')).not.toBeInTheDocument()
  })

  it('renders a circular beam-lance special slot with radial charge state', () => {
    const { container } = render(
      createElement(BattleView, {
        difficulty: 'normal',
        stage: defaultStage,
        character: lyraAerCharacter,
        onComplete: vi.fn(),
      }),
    )

    const button = screen.getByRole('button', {
      name: /activate beam lance special/i,
    })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-valuenow', '50')
    expect(container.querySelector('.battle-special-slot')).toBeInTheDocument()
    expect(container.querySelector('.battle-special-slot__icon')).toBeInTheDocument()
  })

  it('activates beam-lance from the ready circular slot', () => {
    mockSnapshot.specialSlots = [
      {
        id: 'beam-lance',
        icon: 'beam',
        charge: 100,
        maxCharge: 100,
        ready: true,
        active: false,
        activeRatio: 0,
      },
    ]

    render(
      createElement(BattleView, {
        difficulty: 'normal',
        stage: defaultStage,
        character: lyraAerCharacter,
        onComplete: vi.fn(),
      }),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: /activate beam lance special/i,
      }),
    )

    expect(mockActivateSpecial).toHaveBeenCalledWith('beam-lance')
  })

  it('passes the selected character into the battle runtime hook', () => {
    const stage = createStage2Definition('hard', { fastStage: true })

    render(
      createElement(BattleView, {
        difficulty: 'hard',
        stage,
        character: lyraAerCharacter,
        fastStage: true,
        invincible: true,
        onComplete: vi.fn(),
      }),
    )

    expect(mockUseBattleRuntime).toHaveBeenCalledWith({
      difficulty: 'hard',
      stage,
      character: lyraAerCharacter,
      fastStage: true,
      invincible: true,
    })
  })
})
