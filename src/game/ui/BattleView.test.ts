import { fireEvent, render, screen } from '@testing-library/react'
import { createElement, type CSSProperties, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { lyraAerCharacter } from '../content/characters'
import { gameAssets } from '../assets'
import { brassCloudEnemyFrames } from '../content/enemyBrassCloudAtlas'
import { createStageDefinition } from '../content/stage1'
import { createStage2Definition } from '../content/stage2'
import {
  battleDragInputConfig,
  BattleView,
  createArenaPoint,
  getBackgroundTextureUrls,
  getBossCoreTextureUrl,
  getAtlasFrameUv,
  getFlightAirflowDynamics,
  getPlayerBattleSpritePose,
} from './BattleView'
import type { RunResult, StageDefinition } from '../types'

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

function createMockRuntime() {
  return {
    update: vi.fn(),
    beginDrag: vi.fn(),
    moveDrag: vi.fn(),
    endDrag: vi.fn(),
    activateSpecial: mockActivateSpecial,
  }
}

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

describe('getBossCoreTextureUrl', () => {
  it('uses the Stage 2 midboss core asset by matching the stage midboss id', () => {
    const stage = createStage2Definition('normal')
    if (!stage.midboss) {
      throw new Error('Stage 2 test fixture must include a midboss')
    }
    const stageWithUnprefixedMidboss: StageDefinition = {
      ...stage,
      midboss: {
        ...stage.midboss,
        id: 'ember-gate',
      },
    }

    expect(getBossCoreTextureUrl(stageWithUnprefixedMidboss, { id: 'ember-gate' })).toBe(
      gameAssets.stage2MidbossCoreUrl,
    )
    expect(getBossCoreTextureUrl(stageWithUnprefixedMidboss, { id: 'midboss-other' })).toBe(
      gameAssets.bossCoreUrl,
    )
    expect(getBossCoreTextureUrl(stageWithUnprefixedMidboss, null)).toBe(gameAssets.bossCoreUrl)
  })

  it('uses the Stage 2 final boss core asset by matching the stage boss id', () => {
    const stage = createStage2Definition('normal')

    expect(getBossCoreTextureUrl(stage, { id: stage.boss.id })).toBe(
      gameAssets.stage2BossCoreUrl,
    )
  })
})

describe('getBackgroundTextureUrls', () => {
  it('returns only brass-cloud textures for Stage 1', () => {
    const textures = getBackgroundTextureUrls(createStageDefinition('normal'))

    expect(textures).toEqual(
      expect.objectContaining({
        a: gameAssets.cloudLayerAUrl,
        b: gameAssets.cloudLayerBUrl,
      }),
    )
    expect(textures).not.toHaveProperty('stage2Smoke')
    expect(textures).not.toHaveProperty('ruinFloor')
  })

  it('returns only burning-ruins textures for Stage 2', () => {
    const textures = getBackgroundTextureUrls(createStage2Definition('normal'))

    expect(textures).toEqual(
      expect.objectContaining({
        stage2Smoke: gameAssets.stage2SmokeLayerUrl,
        ruinFloor: gameAssets.stage2RuinFloorUrl,
      }),
    )
    expect(textures).not.toHaveProperty('a')
    expect(textures).not.toHaveProperty('b')
  })
}
)

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
  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    window.localStorage.clear()
    mockActivateSpecial.mockClear()
    mockUseBattleRuntime.mockReset()
    mockSnapshot.result = null
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
      runtime: createMockRuntime(),
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
    expect(screen.getByTestId('battle-controls')).toBeInTheDocument()
    expect(container.querySelector('.battle-entities')).not.toBeInTheDocument()
    expect(container.querySelector('.battle-stage-plane')).not.toBeInTheDocument()
  })

  it('renders a circular beam-lance special slot with radial charge state', () => {
    render(
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
    expect(button).toBeInTheDocument()
    expect(screen.getByTestId('battle-special-slot-icon')).toBeInTheDocument()
  })

  it('pauses battle updates from the HUD button until Resume is pressed', () => {
    const runtime = createMockRuntime()
    const rafCallbacks: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallbacks.push(callback)
      return rafCallbacks.length
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    mockUseBattleRuntime.mockReturnValue({
      runtime,
      snapshot: mockSnapshot,
    })

    render(
      createElement(BattleView, {
        difficulty: 'normal',
        stage: defaultStage,
        character: lyraAerCharacter,
        onComplete: vi.fn(),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Pause battle' }))

    expect(screen.getByRole('dialog', { name: 'Battle paused' })).toBeInTheDocument()
    rafCallbacks.at(-1)?.(performance.now() + 16)
    expect(runtime.update).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    rafCallbacks.at(-1)?.(performance.now() + 32)

    expect(screen.queryByRole('dialog', { name: 'Battle paused' })).not.toBeInTheDocument()
    expect(runtime.update).toHaveBeenCalledTimes(1)
  })

  it('keeps pause setting changes as a draft until Apply is pressed', () => {
    const runtime = createMockRuntime()
    mockUseBattleRuntime.mockReturnValue({
      runtime,
      snapshot: mockSnapshot,
    })

    render(
      createElement(BattleView, {
        difficulty: 'normal',
        stage: defaultStage,
        character: lyraAerCharacter,
        onComplete: vi.fn(),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Pause battle' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Drag' }))
    fireEvent.click(screen.getByRole('radio', { name: '2x' }))
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))

    const controls = screen.getByTestId('battle-controls')
    Object.defineProperty(controls, 'getBoundingClientRect', {
      configurable: true,
      value: () => controlRect,
    })
    controls.setPointerCapture = vi.fn()
    controls.hasPointerCapture = vi.fn(() => true)
    controls.releasePointerCapture = vi.fn()

    fireEvent.pointerDown(controls, { pointerId: 1, clientX: 215, clientY: 466 })
    fireEvent.pointerMove(controls, { pointerId: 1, clientX: 258, clientY: 466 })

    expect(runtime.beginDrag).toHaveBeenCalledWith(createArenaPoint(215, 466, controlRect))
    expect(runtime.moveDrag).toHaveBeenLastCalledWith(createArenaPoint(258, 466, controlRect))
  })

  it('applies relative drag control from the current player position', () => {
    const runtime = createMockRuntime()
    mockUseBattleRuntime.mockReturnValue({
      runtime,
      snapshot: mockSnapshot,
    })

    render(
      createElement(BattleView, {
        difficulty: 'normal',
        stage: defaultStage,
        character: lyraAerCharacter,
        onComplete: vi.fn(),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Pause battle' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Drag' }))
    fireEvent.click(screen.getByRole('radio', { name: '2x' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply settings' }))

    expect(screen.queryByRole('dialog', { name: 'Battle paused' })).not.toBeInTheDocument()

    const controls = screen.getByTestId('battle-controls')
    Object.defineProperty(controls, 'getBoundingClientRect', {
      configurable: true,
      value: () => controlRect,
    })
    controls.setPointerCapture = vi.fn()
    controls.hasPointerCapture = vi.fn(() => true)
    controls.releasePointerCapture = vi.fn()

    fireEvent.pointerDown(controls, { pointerId: 1, clientX: 215, clientY: 466 })
    fireEvent.pointerMove(controls, { pointerId: 1, clientX: 258, clientY: 559.2 })

    expect(runtime.beginDrag).toHaveBeenCalledWith(mockSnapshot.player.position)
    const [relativePoint] = runtime.moveDrag.mock.lastCall ?? []
    expect(relativePoint?.x).toBeCloseTo(1.84)
    expect(relativePoint?.z).toBeCloseTo(-4.04)
  })

  it('persists applied pause settings across battle remounts', () => {
    const firstRuntime = createMockRuntime()
    mockUseBattleRuntime.mockReturnValue({
      runtime: firstRuntime,
      snapshot: mockSnapshot,
    })

    const { unmount } = render(
      createElement(BattleView, {
        difficulty: 'normal',
        stage: defaultStage,
        character: lyraAerCharacter,
        onComplete: vi.fn(),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Pause battle' }))
    fireEvent.click(screen.getByRole('radio', { name: '30 FPS' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Drag' }))
    fireEvent.click(screen.getByRole('radio', { name: '3x' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply settings' }))

    expect(window.localStorage.length).toBeGreaterThan(0)
    unmount()

    const secondRuntime = createMockRuntime()
    mockUseBattleRuntime.mockReturnValue({
      runtime: secondRuntime,
      snapshot: mockSnapshot,
    })

    render(
      createElement(BattleView, {
        difficulty: 'normal',
        stage: defaultStage,
        character: lyraAerCharacter,
        onComplete: vi.fn(),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Pause battle' }))
    expect(screen.getByRole('radio', { name: '30 FPS' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Drag' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '3x' })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))

    const controls = screen.getByTestId('battle-controls')
    Object.defineProperty(controls, 'getBoundingClientRect', {
      configurable: true,
      value: () => controlRect,
    })
    controls.setPointerCapture = vi.fn()
    controls.hasPointerCapture = vi.fn(() => true)
    controls.releasePointerCapture = vi.fn()

    fireEvent.pointerDown(controls, { pointerId: 1, clientX: 215, clientY: 466 })
    fireEvent.pointerMove(controls, { pointerId: 1, clientX: 258, clientY: 466 })

    expect(secondRuntime.beginDrag).toHaveBeenCalledWith(mockSnapshot.player.position)
    const [relativePoint] = secondRuntime.moveDrag.mock.lastCall ?? []
    expect(relativePoint?.x).toBeCloseTo(2.76)
    expect(relativePoint?.z).toBeCloseTo(-3)
  })

  it('applies the selected 30 frame update cadence only after Apply is pressed', () => {
    const runtime = createMockRuntime()
    const rafCallbacks: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallbacks.push(callback)
      return rafCallbacks.length
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    mockUseBattleRuntime.mockReturnValue({
      runtime,
      snapshot: mockSnapshot,
    })

    render(
      createElement(BattleView, {
        difficulty: 'normal',
        stage: defaultStage,
        character: lyraAerCharacter,
        onComplete: vi.fn(),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Pause battle' }))
    fireEvent.click(screen.getByRole('radio', { name: '30 FPS' }))
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))

    rafCallbacks.at(-1)?.(performance.now() + 16)
    expect(runtime.update).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Pause battle' }))
    fireEvent.click(screen.getByRole('radio', { name: '30 FPS' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply settings' }))

    runtime.update.mockClear()
    const baseline = performance.now()
    rafCallbacks.at(-1)?.(baseline + 16)
    expect(runtime.update).not.toHaveBeenCalled()

    rafCallbacks.at(-1)?.(baseline + 34)
    expect(runtime.update).toHaveBeenCalledTimes(1)
  })

  it('toggles pause and resume with Escape for desktop players', () => {
    render(
      createElement(BattleView, {
        difficulty: 'normal',
        stage: defaultStage,
        character: lyraAerCharacter,
        onComplete: vi.fn(),
      }),
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.getByRole('dialog', { name: 'Battle paused' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'Battle paused' })).not.toBeInTheDocument()
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

  it('reports each runtime result only once even when the completion callback changes', () => {
    const result = {
      outcome: 'defeat',
      stageId: defaultStage.id,
      stageName: defaultStage.name,
      stageNumber: defaultStage.stageNumber,
      difficulty: 'normal',
      duration: 12.5,
      remainingHp: 0,
      hitsTaken: 3,
    } as const
    const typedSnapshot = mockSnapshot as { result: RunResult | null }
    typedSnapshot.result = result
    const firstOnComplete = vi.fn()
    const secondOnComplete = vi.fn()

    const { rerender } = render(
      createElement(BattleView, {
        difficulty: 'normal',
        stage: defaultStage,
        character: lyraAerCharacter,
        onComplete: firstOnComplete,
      }),
    )

    rerender(
      createElement(BattleView, {
        difficulty: 'normal',
        stage: defaultStage,
        character: lyraAerCharacter,
        onComplete: secondOnComplete,
      }),
    )

    expect(firstOnComplete).toHaveBeenCalledTimes(1)
    expect(firstOnComplete).toHaveBeenCalledWith(result)
    expect(secondOnComplete).not.toHaveBeenCalled()
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

  it('renders the selected stage background theme marker for Stage 2 battles', () => {
    const stage = createStage2Definition('normal')

    render(
      createElement(BattleView, {
        difficulty: 'normal',
        stage,
        character: lyraAerCharacter,
        onComplete: vi.fn(),
      }),
    )

    expect(mockUseBattleRuntime).toHaveBeenCalledWith({
      difficulty: 'normal',
      stage,
      character: lyraAerCharacter,
      fastStage: undefined,
      invincible: undefined,
    })
    expect(screen.getByTestId('battle-background-theme')).toHaveTextContent('burning-ruins')
    expect(screen.getByText('Stage 2')).toBeInTheDocument()
  })
})
