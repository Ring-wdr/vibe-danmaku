import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BulletMesh, getBulletRotationStep, SparkleMesh } from './battleEffects'

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}))

describe('SparkleMesh', () => {
  it('does not render square ring geometry during energy orb bullet clears', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      const { container } = render(
        <SparkleMesh
          sparkle={{
            id: 'energy-orb-clear',
            position: { x: 0, z: 0 },
            age: 0,
            life: 0.36,
            intensity: 1.5,
          }}
        />,
      )

      const ringGeometries = Array.from(container.querySelectorAll('ringgeometry'))

      expect(
        ringGeometries.some((geometry) => geometry.getAttribute('args')?.endsWith(',4')),
      ).toBe(false)
    } finally {
      consoleError.mockRestore()
    }
  })
})

describe('getBulletRotationStep', () => {
  it('spins player sword shots faster than regular player bullets', () => {
    const swordStep = getBulletRotationStep({
      id: 'sword-shot',
      source: 'player',
      kind: 'sword',
      position: { x: 0, z: 0 },
      radius: 0.08,
      glow: 1.2,
    })
    const primaryStep = getBulletRotationStep({
      id: 'primary-shot',
      source: 'player',
      kind: 'primary',
      position: { x: 0, z: 0 },
      radius: 0.08,
      glow: 1.2,
    })

    expect(swordStep).toBeGreaterThanOrEqual(primaryStep * 3)
  })
})

describe('BulletMesh', () => {
  it('renders player sword shots with a pointed blade tip', () => {
    const { container } = render(
      <BulletMesh
        bullet={{
          id: 'sword-shot',
          source: 'player',
          kind: 'sword',
          position: { x: 0, z: 0 },
          radius: 0.08,
          glow: 1.2,
        }}
        isPaused={false}
      />,
    )

    const tipGeometry = container.querySelector('conegeometry')

    expect(tipGeometry?.getAttribute('args')).toContain(',3')
  })
})
