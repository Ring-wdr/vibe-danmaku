import { render } from '@testing-library/react'
import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'

import { createStage2Definition } from '../content/stage2'
import { createStage3Definition } from '../content/stage3'
import { MovingBackgroundLayer } from './battleBackground'

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}))

vi.mock('./battleTexture', () => ({
  useLoadedTextureMap: vi.fn(() => ({
    abyssalFloor: new THREE.Texture(),
    abyssalPressure: new THREE.Texture(),
    ruinFloor: new THREE.Texture(),
    stage2Smoke: new THREE.Texture(),
  })),
}))

describe('MovingBackgroundLayer', () => {
  it('renders Stage 2 floor as one repeated tile plane while keeping smoke layers', () => {
    const { container } = render(
      <MovingBackgroundLayer stage={createStage2Definition('normal')} isPaused={false} />,
    )

    const planes = Array.from(container.querySelectorAll('planegeometry'))
    const repeatedFloors = planes.filter((plane) => plane.getAttribute('args') === '8.8,11.8')

    expect(repeatedFloors).toHaveLength(1)
    expect(planes).toHaveLength(5)
  })

  it('renders Stage 3 floor as one repeated tile plane while keeping pressure layers', () => {
    const { container } = render(
      <MovingBackgroundLayer stage={createStage3Definition('normal')} isPaused={false} />,
    )

    const planes = Array.from(container.querySelectorAll('planegeometry'))
    const repeatedFloors = planes.filter((plane) => plane.getAttribute('args') === '8.8,11.8')

    expect(repeatedFloors).toHaveLength(1)
    expect(planes).toHaveLength(5)
  })
})
