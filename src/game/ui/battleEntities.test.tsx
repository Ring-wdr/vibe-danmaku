import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { gameAssets } from '../assets'
import { lyraAerCharacter } from '../content/characters'
import { createStageDefinition } from '../content/stage1'
import { createStage3Definition } from '../content/stage3'
import { getStage3BossClawMotion, RuntimeEntityLayer } from './battleEntities'
import { useLoadedTexture, useLoadedTextureMap } from './battleTexture'
import type { BattleSnapshot, StageDefinition } from '../types'

const defaultBossFsm = {
  phase: 'CombatPhase',
  phaseId: 'test-phase',
  phaseIndex: 0,
  movement: 'SweepLeftRight',
  firePattern: 'AimedFan',
  vulnerability: 'Vulnerable',
} as const

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}))

vi.mock('./battleTexture', () => ({
  useLoadedTexture: vi.fn(() => new THREE.Texture()),
  useLoadedTextureMap: vi.fn(() => ({
    'enemy-brass-cloud': new THREE.Texture(),
    'enemy-abyssal-biomech': new THREE.Texture(),
  })),
  RestoredTextureMaterial: ({
    exposure,
    saturation,
    contrast,
    tintColor,
    tintStrength,
  }: {
    exposure?: number
    saturation?: number
    contrast?: number
    tintColor?: string
    tintStrength?: number
  }) =>
    createElement('div', {
      'data-testid': 'restored-texture-material',
      'data-exposure': exposure ?? 1,
      'data-saturation': saturation ?? 1,
      'data-contrast': contrast ?? 1,
      'data-tint-color': tintColor ?? '',
      'data-tint-strength': tintStrength ?? 0,
    }),
}))

const snapshot = {
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
      hitFlashRatio: 1,
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
      charge: 0,
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
} satisfies BattleSnapshot

function getFinalBossFromStage(stage: StageDefinition) {
  const action = stage.events
    .flatMap((event) => event.actions)
    .find((candidate) => candidate.type === 'spawnBoss' && candidate.role === 'final')

  if (!action || action.type !== 'spawnBoss') {
    throw new Error('Stage test fixture must include a final boss')
  }

  return action.boss
}

describe('RuntimeEntityLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads only enemy atlas textures used by the active enemies', () => {
    render(
      <RuntimeEntityLayer
        character={lyraAerCharacter}
        stage={createStageDefinition('normal')}
        snapshot={snapshot}
        isPaused={false}
      />,
    )

    expect(vi.mocked(useLoadedTextureMap)).toHaveBeenCalledWith({
      'enemy-brass-cloud': gameAssets.enemyBrassCloudAtlasUrl,
    })
    expect(vi.mocked(useLoadedTexture)).not.toHaveBeenCalledWith(
      gameAssets.enemyAbyssalBiomechAtlasUrl,
    )
  })

  it('keeps the active enemy atlas texture URL map stable across enemy-order rerenders', () => {
    const abyssalEnemy = {
      ...snapshot.enemies[0],
      id: 'abyssal-sentinel-1',
      kind: 'abyssal-biomech-sentinel',
      variant: 'abyssal-biomech-sentinel',
      atlasId: 'enemy-abyssal-biomech',
    } satisfies BattleSnapshot['enemies'][number]
    const firstSnapshot = {
      ...snapshot,
      enemies: [snapshot.enemies[0], abyssalEnemy],
    } satisfies BattleSnapshot
    const secondSnapshot = {
      ...snapshot,
      elapsed: 0.16,
      enemies: [{ ...abyssalEnemy }, { ...snapshot.enemies[0] }],
    } satisfies BattleSnapshot

    const { rerender } = render(
      <RuntimeEntityLayer
        character={lyraAerCharacter}
        stage={createStageDefinition('normal')}
        snapshot={firstSnapshot}
        isPaused={false}
      />,
    )
    const firstTextureUrls = vi.mocked(useLoadedTextureMap).mock.calls.at(-1)?.[0]

    rerender(
      <RuntimeEntityLayer
        character={lyraAerCharacter}
        stage={createStageDefinition('normal')}
        snapshot={secondSnapshot}
        isPaused={false}
      />,
    )
    const secondTextureUrls = vi.mocked(useLoadedTextureMap).mock.calls.at(-1)?.[0]

    expect(secondTextureUrls).toBe(firstTextureUrls)
    expect(secondTextureUrls).toEqual({
      'enemy-abyssal-biomech': gameAssets.enemyAbyssalBiomechAtlasUrl,
      'enemy-brass-cloud': gameAssets.enemyBrassCloudAtlasUrl,
    })
  })

  it('renders enemy hit flash through the sprite texture alpha instead of a solid plane', () => {
    render(
      <RuntimeEntityLayer
        character={lyraAerCharacter}
        stage={createStageDefinition('normal')}
        snapshot={snapshot}
        isPaused={false}
      />,
    )

    const materials = screen.getAllByTestId('restored-texture-material')

    expect(
      materials.some(
        (material) =>
          material.dataset.tintColor === '#ff2a2a' &&
          Number(material.dataset.tintStrength) > 0,
      ),
    ).toBe(true)
  })

  it('renders battle asset textures without boosting source brightness or saturation', () => {
    render(
      <RuntimeEntityLayer
        character={lyraAerCharacter}
        stage={createStageDefinition('normal')}
        snapshot={{
          ...snapshot,
          bosses: [
            {
              id: 'test-boss',
              position: { x: 0, z: 1.9 },
              hpRatio: 1,
              phaseLabel: 'Boss',
              supportLaser: false,
              fsm: defaultBossFsm,
            },
          ],
          itemDrops: [
            {
              id: 'item-drop-1',
              itemId: 'powerup',
              position: { x: 0, z: 2.2 },
              collected: false,
            },
          ],
        }}
        isPaused={false}
      />,
    )

    const materials = screen
      .getAllByTestId('restored-texture-material')
      .filter((material) => material.dataset.tintStrength === '0')

    expect(materials.every((material) => material.dataset.exposure === '1')).toBe(true)
    expect(materials.every((material) => material.dataset.saturation === '1')).toBe(true)
    expect(materials.every((material) => material.dataset.contrast === '1')).toBe(true)
  })

  it('renders falling item boxes with the shared item atlas texture', () => {
    render(
      <RuntimeEntityLayer
        character={lyraAerCharacter}
        stage={createStageDefinition('normal')}
        snapshot={{
          ...snapshot,
          itemDrops: [
            {
              id: 'item-drop-1',
              itemId: 'powerup',
              position: { x: 0, z: 2.2 },
              collected: false,
            },
          ],
        }}
        isPaused={false}
      />,
    )

    expect(screen.getByTestId('item-drop-powerup')).toBeInTheDocument()
    expect(vi.mocked(useLoadedTexture)).toHaveBeenCalledWith(gameAssets.itemAtlasUrl)
  })

  it('renders battle bosses at the larger combat scale', () => {
    const { container } = render(
      <RuntimeEntityLayer
        character={lyraAerCharacter}
        stage={createStageDefinition('normal')}
        snapshot={{
          ...snapshot,
          bosses: [
            {
              id: 'test-boss',
              position: { x: 0, z: 1.9 },
              hpRatio: 1,
              phaseLabel: 'Boss',
              supportLaser: false,
              fsm: defaultBossFsm,
            },
          ],
        }}
        isPaused={false}
      />,
    )

    const bossPlane = Array.from(container.querySelectorAll('planegeometry')).find(
      (element) => element.getAttribute('args') === '2.05,2.05',
    )

    expect(bossPlane).toBeInTheDocument()
  })

  it('renders the Stage 3 final boss as a high-detail biomech model with generated appendage sprites', () => {
    const stage = createStage3Definition('normal')
    const finalBoss = getFinalBossFromStage(stage)

    const { container } = render(
      <RuntimeEntityLayer
        character={lyraAerCharacter}
        stage={stage}
        snapshot={{
          ...snapshot,
          elapsed: 1.2,
          bosses: [
            {
              id: finalBoss.id,
              position: { x: 0, z: 1.9 },
              hpRatio: 1,
              phaseLabel: 'Boss',
              supportLaser: false,
              fsm: defaultBossFsm,
            },
          ],
        }}
        isPaused={false}
      />,
    )

    expect(screen.getByTestId(`stage3-boss-high-detail-${finalBoss.id}`)).toBeInTheDocument()
    expect(screen.getByTestId(`stage3-boss-core-glow-${finalBoss.id}`)).toHaveAttribute(
      'position',
      '0,0.25,0.38',
    )
    expect(
      screen
        .getByTestId(`stage3-boss-core-glow-${finalBoss.id}`)
        .querySelector('meshbasicmaterial'),
    ).toHaveAttribute('opacity', '0.68')
    expect(screen.getByTestId(`stage3-boss-white-core-${finalBoss.id}`)).toHaveAttribute(
      'position',
      '0,0.25,0.48',
    )
    expect(
      screen
        .getByTestId(`stage3-boss-white-core-${finalBoss.id}`)
        .querySelector('meshbasicmaterial'),
    ).toHaveAttribute('opacity', '0.72')
    expect(screen.getByTestId(`stage3-boss-core-ring-${finalBoss.id}`)).toHaveAttribute(
      'position',
      '0,0.25,0.36',
    )
    expect(
      screen
        .getByTestId(`stage3-boss-core-ring-${finalBoss.id}`)
        .querySelector('meshbasicmaterial'),
    ).toHaveAttribute('opacity', '0.34')
    expect(screen.getByTestId('stage3-boss-claw-left')).toBeInTheDocument()
    expect(screen.getByTestId('stage3-boss-claw-right')).toBeInTheDocument()
    expect(container.querySelector('icosahedrongeometry')).not.toBeInTheDocument()
    expect(container.querySelector('meshphysicalmaterial')).not.toBeInTheDocument()
    expect(container.querySelector('circlegeometry')).not.toBeInTheDocument()
    expect(
      Array.from(container.querySelectorAll('planegeometry')).some(
        (geometry) => geometry.getAttribute('args') === '1.46,2.08',
      ),
    ).toBe(true)
    expect(container.querySelector('ringgeometry')).toBeInTheDocument()
    expect(vi.mocked(useLoadedTexture)).toHaveBeenCalledWith(gameAssets.stage3BossAppendagesUrl)
    expect(vi.mocked(useLoadedTexture)).toHaveBeenCalledWith(gameAssets.stage3BossBodyUrl)
    expect(vi.mocked(useLoadedTexture)).not.toHaveBeenCalledWith(
      gameAssets.stage3BossArmorTextureUrl,
      expect.any(Function),
    )
  })

  it('moves Stage 3 boss claws subtly in opposite horizontal directions', () => {
    const left = getStage3BossClawMotion({ battleElapsed: 0.6, side: -1 })
    const right = getStage3BossClawMotion({ battleElapsed: 0.6, side: 1 })

    expect(Math.abs(left.xOffset)).toBeLessThanOrEqual(0.055)
    expect(Math.abs(right.xOffset)).toBeLessThanOrEqual(0.055)
    expect(left.xOffset).toBeCloseTo(-right.xOffset, 5)
    expect(Math.abs(left.rotationOffset)).toBeLessThanOrEqual(0.045)
    expect(Math.abs(right.rotationOffset)).toBeLessThanOrEqual(0.045)
  })

  it('renders a phase-break shield effect while a boss is invulnerable during phase changes', () => {
    const { rerender } = render(
      <RuntimeEntityLayer
        character={lyraAerCharacter}
        stage={createStageDefinition('normal')}
        snapshot={{
          ...snapshot,
          bosses: [
            {
              id: 'phase-break-boss',
              position: { x: 0, z: 1.9 },
              hpRatio: 0.64,
              phaseLabel: 'Phase Break',
              supportLaser: false,
              fsm: {
                ...defaultBossFsm,
                phase: 'Break',
                vulnerability: 'Invulnerable',
              },
            },
          ],
        }}
        isPaused={false}
      />,
    )

    expect(screen.getByTestId('boss-phase-break-effect-phase-break-boss')).toBeInTheDocument()

    rerender(
      <RuntimeEntityLayer
        character={lyraAerCharacter}
        stage={createStageDefinition('normal')}
        snapshot={{
          ...snapshot,
          bosses: [
            {
              id: 'phase-break-boss',
              position: { x: 0, z: 1.9 },
              hpRatio: 0.64,
              phaseLabel: 'Phase Break',
              supportLaser: false,
              fsm: defaultBossFsm,
            },
          ],
        }}
        isPaused={false}
      />,
    )

    expect(screen.queryByTestId('boss-phase-break-effect-phase-break-boss')).not.toBeInTheDocument()
  })
})
