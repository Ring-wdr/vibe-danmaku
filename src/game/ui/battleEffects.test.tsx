import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SparkleMesh } from './battleEffects'

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
