import { fireEvent, render as testingRender, screen, waitFor } from '@testing-library/react'
import { createElement, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { OverlayProvider } from 'overlay-kit'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { lyraAerCharacter } from '../content/characters'
import { gameAssets } from '../assets'
import { brassCloudEnemyFrames } from '../content/enemyBrassCloudAtlas'
import { createStageDefinition } from '../content/stage1'
import { createStage2Definition } from '../content/stage2'
import { createStage3Definition } from '../content/stage3'
import {
  battleDragInputConfig,
  BattleView,
  createArenaPoint,
  getBackgroundTextureUrls,
  getBossCoreTextureUrl,
  getAtlasFrameUv,
  getFlightAirflowDynamics,
  getPlayerBattleSpritePose,
  getRenderableBosses,
} from './BattleView'
import { getEnemyAtlasTextureUrl } from './battleEntities'
import type { BattleSnapshot, StageDefinition } from '../types'

const battleCameraForInput = {
  positionZ: 8,
  fov: 48,
  playerRenderZ: 0.65,
} as const

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ style }: { children: ReactNode; style?: CSSProperties }) =>
    createElement('canvas', { 'data-testid': 'battle-canvas', style }),
  useFrame: vi.fn(),
}))

const {
  mockActivateSpecial,
  mockSnapshot,
  mockUnlockAudio,
  mockUseBattleRuntime,
  mockUseBattleSoundscape,
} = vi.hoisted(() => ({
  mockActivateSpecial: vi.fn(),
  mockUnlockAudio: vi.fn(() => Promise.resolve()),
  mockUseBattleRuntime: vi.fn(),
  mockUseBattleSoundscape: vi.fn(),
  mockSnapshot: {
    difficulty: 'normal',
    stageName: 'Test Stage',
    elapsed: 0,
    duration: 90,
    phaseLabel: 'Opening',
    player: {
      position: { x: 0, z: -3 },
      hp: 3,
      maxHp: 3,
      invulnerable: false,
    },
    enemies: [
      {
        id: 'sentinel-1',
        waveId: 'wave-1',
        kind: 'brass-cloud-sentinel',
        archetype: 'sentinel',
        variant: 'brass-cloud-sentinel',
        atlasId: 'enemy-brass-cloud',
        frameId: 'sentinel',
        position: { x: -1, z: 1 },
        scale: 0.72,
        hitRadius: 0.28,
        hitFlashRatio: 0,
      },
      {
        id: 'weaver-1',
        waveId: 'wave-2',
        kind: 'brass-cloud-weaver',
        archetype: 'weaver',
        variant: 'brass-cloud-weaver',
        atlasId: 'enemy-brass-cloud',
        frameId: 'weaver',
        position: { x: 1, z: 1 },
        scale: 0.82,
        hitRadius: 0.34,
        hitFlashRatio: 0,
      },
    ],
    boss: null,
    bosses: [],
    bullets: [],
    itemDrops: [],
    playerPowerups: {
      powerupLevel: 0,
      attackMultiplier: 1,
    },
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
    destructionEffects: [],
    playerShots: 0,
    hitsTaken: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    bossEnteredCount: 0,
    cuePulse: 0,
    result: null,
  } as BattleSnapshot,
}))

const defaultBossFsm = {
  phase: 'CombatPhase',
  phaseId: 'test-phase',
  phaseIndex: 0,
  movement: 'SweepLeftRight',
  firePattern: 'AimedFan',
  vulnerability: 'Vulnerable',
} as const

vi.mock('./useBattleRuntime', () => ({
  useBattleRuntime: mockUseBattleRuntime,
}))

vi.mock('./useBattleSoundscape', () => ({
  useBattleSoundscape: mockUseBattleSoundscape,
}))

const controlRect = {
  left: 0,
  top: 0,
  width: 430,
  height: 932,
} as DOMRect
const defaultStage = createStageDefinition('normal')

function createExpectedPositionControlPoint(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  moveRadius = lyraAerCharacter.moveRadius,
) {
  const xRatio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  const yRatio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
  const cameraDistance = battleCameraForInput.positionZ - battleCameraForInput.playerRenderZ
  const visibleHalfHeight =
    Math.tan((battleCameraForInput.fov * Math.PI) / 360) * cameraDistance
  const visibleHalfWidth = visibleHalfHeight * (rect.width / rect.height)
  const viewX = (xRatio - 0.5) * visibleHalfWidth * 2
  const viewY = (1 - yRatio * 2) * visibleHalfHeight

  return {
    x: Math.min(moveRadius.x, Math.max(-moveRadius.x, viewX / 0.55)),
    z: Math.min(moveRadius.maxZ, Math.max(moveRadius.minZ, (viewY + 0.45) / 0.9)),
  }
}

function projectArenaPointToClientY(pointZ: number, rect: DOMRect) {
  const viewY = pointZ * 0.9 - 0.45
  const cameraDistance = battleCameraForInput.positionZ - battleCameraForInput.playerRenderZ
  const visibleHalfHeight =
    Math.tan((battleCameraForInput.fov * Math.PI) / 360) * cameraDistance
  const normalizedDeviceY = viewY / visibleHalfHeight

  return rect.top + ((1 - normalizedDeviceY) / 2) * rect.height
}

function getBossFromStage(stage: StageDefinition, role: 'midboss' | 'final') {
  const action = stage.events
    .flatMap((event) => event.actions)
    .find((candidate) => candidate.type === 'spawnBoss' && candidate.role === role)

  if (!action || action.type !== 'spawnBoss') {
    throw new Error(`stage must include a ${role} boss`)
  }

  return action.boss
}

function withEventBossId(stage: StageDefinition, role: 'midboss' | 'final', id: string) {
  const boss = getBossFromStage(stage, role)

  return {
    ...stage,
    events: stage.events?.map((event) => ({
      ...event,
      actions: event.actions.map((action) =>
        action.type === 'spawnBoss' && action.role === role
          ? { ...action, boss: { ...boss, id } }
          : action,
      ),
    })),
  }
}

function createMockRuntime() {
  return {
    update: vi.fn(),
    beginDrag: vi.fn(),
    moveDrag: vi.fn(),
    endDrag: vi.fn(),
    activateSpecial: mockActivateSpecial,
  }
}

function render(ui: ReactElement) {
  return testingRender(ui, { wrapper: OverlayProvider })
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
  it('uses the Stage 2 midboss core asset by matching the event-owned midboss id', () => {
    const stage = createStage2Definition('normal')
    const stageWithUnprefixedMidboss = withEventBossId(stage, 'midboss', 'ember-gate')

    expect(getBossCoreTextureUrl(stageWithUnprefixedMidboss, { id: 'ember-gate' })).toBe(
      gameAssets.stage2MidbossCoreUrl,
    )
    expect(getBossCoreTextureUrl(stageWithUnprefixedMidboss, { id: 'midboss-other' })).toBe(
      gameAssets.bossCoreUrl,
    )
    expect(getBossCoreTextureUrl(stageWithUnprefixedMidboss, null)).toBe(gameAssets.bossCoreUrl)
  })

  it('keeps an event-owned midboss on the generic core outside burning ruins', () => {
    const stage = createStageDefinition('normal')
    const finalBoss = getBossFromStage(stage, 'final')
    const stageWithEventMidboss: StageDefinition = {
      ...stage,
      events: [
        ...stage.events,
        {
          id: 'test-midboss-spawn',
          trigger: { type: 'time', at: 1 },
          actions: [
            {
              type: 'spawnBoss',
              role: 'midboss',
              boss: {
                ...finalBoss,
                id: 'brass-cloud-midboss',
              },
            },
          ],
        },
      ],
    }

    expect(getBossCoreTextureUrl(stageWithEventMidboss, { id: 'brass-cloud-midboss' })).toBe(
      gameAssets.bossCoreUrl,
    )
  })

  it('uses the Stage 2 final boss core asset by matching the stage boss id', () => {
    const stage = createStage2Definition('normal')
    const finalBoss = getBossFromStage(stage, 'final')

    expect(getBossCoreTextureUrl(stage, { id: finalBoss.id })).toBe(
      gameAssets.stage2BossCoreUrl,
    )
  })

  it('uses the Stage 2 final boss core asset by matching the event-owned final boss id', () => {
    const stage = createStage2Definition('normal')
    const stageWithEventFinalBoss = withEventBossId(stage, 'final', 'ash-citadel-core')

    expect(getBossCoreTextureUrl(stageWithEventFinalBoss, { id: 'ash-citadel-core' })).toBe(
      gameAssets.stage2BossCoreUrl,
    )
  })

  it('uses Stage 3 boss textures by event-owned boss role', () => {
    const stage = createStage3Definition('normal')
    const midboss = getBossFromStage(stage, 'midboss')
    const finalBoss = getBossFromStage(stage, 'final')

    expect(getBossCoreTextureUrl(stage, { id: midboss.id })).toBe(
      gameAssets.stage3MidbossCoreUrl,
    )
    expect(getBossCoreTextureUrl(stage, { id: finalBoss.id })).toBe(
      gameAssets.stage3BossCoreUrl,
    )
  })

})

describe('getEnemyAtlasTextureUrl', () => {
  it('uses the Stage 3 enemy atlas for abyssal enemies', () => {
    expect(getEnemyAtlasTextureUrl('enemy-abyssal-biomech')).toBe(
      gameAssets.enemyAbyssalBiomechAtlasUrl,
    )
    expect(getEnemyAtlasTextureUrl('enemy-brass-cloud')).toBe(
      gameAssets.enemyBrassCloudAtlasUrl,
    )
  })

})

describe('getRenderableBosses', () => {
  it('uses every active boss from the runtime snapshot instead of only the primary boss', () => {
    const bosses = [
      {
        id: 'midboss-ember-gate',
        position: { x: -0.8, z: 1.2 },
        hpRatio: 0.7,
        phaseLabel: 'Midboss',
        supportLaser: false,
        fsm: defaultBossFsm,
      },
      {
        id: 'boss-ash-citadel-core',
        position: { x: 0.9, z: 1.1 },
        hpRatio: 0.4,
        phaseLabel: 'Final',
        supportLaser: true,
        fsm: defaultBossFsm,
      },
    ]

    expect(
      getRenderableBosses({
        ...mockSnapshot,
        boss: bosses[0],
        bosses,
      }),
    ).toEqual(bosses)
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

  it('returns only abyssal biomech textures for Stage 3', () => {
    const textures = getBackgroundTextureUrls(createStage3Definition('normal'))

    expect(textures).toEqual({
      abyssalFloor: gameAssets.stage3TrenchFloorUrl,
      abyssalPressure: gameAssets.stage3PressureLayerUrl,
    })
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
    mockUnlockAudio.mockClear()
    mockUseBattleRuntime.mockReset()
    mockUseBattleSoundscape.mockReset()
    mockUseBattleSoundscape.mockReturnValue({ unlockAudio: mockUnlockAudio })
    mockSnapshot.boss = null
    mockSnapshot.bosses = []
    mockSnapshot.result = null
    mockSnapshot.score = 12500
    mockSnapshot.combo = 7
    mockSnapshot.maxCombo = 9
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

  it('connects the battle soundscape to the selected stage', () => {
    const stage = createStage2Definition('normal')

    render(
      createElement(BattleView, {
        difficulty: 'normal',
        stage,
        character: lyraAerCharacter,
        onComplete: vi.fn(),
      }),
    )

    expect(mockUseBattleSoundscape).toHaveBeenCalledWith(mockSnapshot, true, stage)
  })

  it('renders score and combo above the stage status HUD', () => {
    render(
      createElement(BattleView, {
        difficulty: 'normal',
        stage: defaultStage,
        character: lyraAerCharacter,
        onComplete: vi.fn(),
      }),
    )

    expect(screen.getByLabelText(/battle score/i)).toHaveTextContent('12,500')
    expect(screen.getByLabelText(/battle combo/i)).toHaveTextContent('7 COMBO')
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

  it('removes player HP text from the top status overlay', () => {
    render(
      createElement(BattleView, {
        difficulty: 'normal',
        stage: defaultStage,
        character: lyraAerCharacter,
        onComplete: vi.fn(),
      }),
    )

    expect(screen.getByLabelText('Battle status')).not.toHaveTextContent(/[◆◇]/)
    expect(screen.queryByTestId('battle-hull-battery')).not.toBeInTheDocument()
  })

  it('pauses battle updates from the HUD button until Resume is pressed', async () => {
    const runtime = createMockRuntime()
    const rafCallbacks = new Map<number, FrameRequestCallback>()
    let rafId = 0
    let rafTime = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => rafTime)
    const runFrameBatch = (advanceMs: number) => {
      rafTime += advanceMs
      const batch = Array.from(rafCallbacks.entries())
      rafCallbacks.clear()
      for (const [, callback] of batch) {
        callback(rafTime)
      }
    }
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafId += 1
      rafCallbacks.set(rafId, callback)
      return rafId
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      rafCallbacks.delete(id)
    })
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

    expect(await screen.findByRole('dialog', { name: 'Battle paused' })).toBeInTheDocument()
    runFrameBatch(16)
    expect(runtime.update).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Battle paused' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pause battle' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    })
    runFrameBatch(16)
    expect(runtime.update).toHaveBeenCalledTimes(1)
  })

  it('keeps pause setting changes as a draft until Apply is pressed', async () => {
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
    await screen.findByRole('dialog', { name: 'Battle paused' })
    fireEvent.click(screen.getByRole('radio', { name: 'Drag' }))
    fireEvent.click(screen.getByRole('radio', { name: '2x' }))
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Battle paused' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pause battle' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    })

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

    expect(runtime.beginDrag).toHaveBeenCalledWith(
      createExpectedPositionControlPoint(215, 466, controlRect),
    )
    expect(runtime.moveDrag).toHaveBeenLastCalledWith(
      createExpectedPositionControlPoint(258, 466, controlRect),
    )
  })

  it('maps default position control touches through the player camera projection', () => {
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

    const controls = screen.getByTestId('battle-controls')
    Object.defineProperty(controls, 'getBoundingClientRect', {
      configurable: true,
      value: () => controlRect,
    })
    controls.setPointerCapture = vi.fn()
    controls.hasPointerCapture = vi.fn(() => true)
    controls.releasePointerCapture = vi.fn()

    const upperTouchY = controlRect.height * 0.2
    const lowerTouchY = controlRect.height * 0.8

    fireEvent.pointerDown(controls, { pointerId: 1, clientX: 215, clientY: upperTouchY })
    fireEvent.pointerMove(controls, { pointerId: 1, clientX: 215, clientY: lowerTouchY })

    const [beginPoint] = runtime.beginDrag.mock.lastCall ?? []
    expect(beginPoint).toEqual(
      createExpectedPositionControlPoint(215, upperTouchY, controlRect),
    )
    expect(projectArenaPointToClientY(beginPoint?.z ?? 0, controlRect)).toBeCloseTo(upperTouchY)
    const [lastMovePoint] = runtime.moveDrag.mock.lastCall ?? []
    expect(lastMovePoint).toEqual(
      createExpectedPositionControlPoint(215, lowerTouchY, controlRect),
    )
    expect(projectArenaPointToClientY(lastMovePoint?.z ?? 0, controlRect)).toBeCloseTo(lowerTouchY)
  })

  it('applies relative drag control from the current player position', async () => {
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
    await screen.findByRole('dialog', { name: 'Battle paused' })
    fireEvent.click(screen.getByRole('radio', { name: 'Drag' }))
    fireEvent.click(screen.getByRole('radio', { name: '2x' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply settings' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Battle paused' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pause battle' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    })

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

  it('persists applied pause settings across battle remounts', async () => {
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
    await screen.findByRole('dialog', { name: 'Battle paused' })
    fireEvent.click(screen.getByRole('radio', { name: '30 FPS' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Drag' }))
    fireEvent.click(screen.getByRole('radio', { name: '3x' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply settings' }))

    await waitFor(() => {
      expect(window.localStorage.length).toBeGreaterThan(0)
    })
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
    await screen.findByRole('dialog', { name: 'Battle paused' })
    expect(screen.getByRole('radio', { name: '30 FPS' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Drag' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '3x' })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Battle paused' })).not.toBeInTheDocument()
    })

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

  it('applies the selected 30 frame update cadence only after Apply is pressed', async () => {
    const runtime = createMockRuntime()
    const rafCallbacks = new Map<number, FrameRequestCallback>()
    let rafId = 0
    let rafTime = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => rafTime)
    const runFrameBatch = (advanceMs: number) => {
      rafTime += advanceMs
      const batch = Array.from(rafCallbacks.entries())
      rafCallbacks.clear()
      for (const [, callback] of batch) {
        callback(rafTime)
      }
    }
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafId += 1
      rafCallbacks.set(rafId, callback)
      return rafId
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      rafCallbacks.delete(id)
    })
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
    await screen.findByRole('dialog', { name: 'Battle paused' })
    fireEvent.click(screen.getByRole('radio', { name: '30 FPS' }))
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Battle paused' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pause battle' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    })

    runFrameBatch(16)
    expect(runtime.update).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Pause battle' }))
    await screen.findByRole('dialog', { name: 'Battle paused' })
    fireEvent.click(screen.getByRole('radio', { name: '30 FPS' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply settings' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Battle paused' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pause battle' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    })

    runtime.update.mockClear()
    await waitFor(() => {
      expect(rafCallbacks.size).toBeGreaterThan(0)
    })
    runFrameBatch(16)
    expect(runtime.update).not.toHaveBeenCalled()

    for (let index = 0; index < 3 && runtime.update.mock.calls.length === 0; index += 1) {
      await waitFor(() => {
        expect(rafCallbacks.size).toBeGreaterThan(0)
      })
      runFrameBatch(18)
    }
    expect(runtime.update).toHaveBeenCalledTimes(1)
  })

  it('opens pause settings with Escape for desktop players', async () => {
    render(
      createElement(BattleView, {
        difficulty: 'normal',
        stage: defaultStage,
        character: lyraAerCharacter,
        onComplete: vi.fn(),
      }),
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(await screen.findByRole('dialog', { name: 'Battle paused' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Battle paused' })).not.toBeInTheDocument()
    })
  })

  it('requests battle exit from the pause Back button without applying draft changes', async () => {
    const runtime = createMockRuntime()
    const onExitBattle = vi.fn()
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
        onExitBattle,
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Pause battle' }))
    await screen.findByRole('dialog', { name: 'Battle paused' })
    fireEvent.click(screen.getByRole('radio', { name: 'Drag' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Battle paused' })).not.toBeInTheDocument()
    })
    expect(onExitBattle).toHaveBeenCalledTimes(1)
    expect(window.localStorage.length).toBe(0)
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
      onComplete: expect.any(Function),
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
      onComplete: expect.any(Function),
    })
    expect(screen.getByTestId('battle-background-theme')).toHaveTextContent('burning-ruins')
    expect(screen.getByText('Stage 2')).toBeInTheDocument()
  })
})
