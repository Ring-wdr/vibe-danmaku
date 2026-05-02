import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { gameAssets } from '../assets'
import { lyraAerCharacter } from '../content/characters'
import { createStageDefinition } from '../content/stage1'
import { RuntimeEntityLayer } from './battleEntities'
import { useLoadedTexture } from './battleTexture'
import type { BattleSnapshot } from '../types'

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}))

vi.mock('./battleTexture', () => ({
  useLoadedTexture: vi.fn(() => new THREE.Texture()),
  RestoredTextureMaterial: ({
    tintColor,
    tintStrength,
  }: {
    tintColor?: string
    tintStrength?: number
  }) =>
    createElement('div', {
      'data-testid': 'restored-texture-material',
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
  bossEnteredCount: 0,
  cuePulse: 0,
  result: null,
} satisfies BattleSnapshot

describe('RuntimeEntityLayer', () => {
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
})
