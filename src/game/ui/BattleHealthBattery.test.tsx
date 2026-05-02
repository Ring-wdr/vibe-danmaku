import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BattleHealthBattery } from './BattleHealthBattery'

vi.mock('@react-three/fiber', () => ({
  useThree: () => ({
    viewport: {
      width: 8,
      height: 6,
    },
  }),
}))

describe('BattleHealthBattery', () => {
  it('renders a lower-left R3F hull battery with one segment per max HP', () => {
    const { container } = render(<BattleHealthBattery hp={2} maxHp={3} />)

    const battery = container.querySelector('group[name="battle-health-battery"]')

    expect(battery).toHaveAttribute('position', '-3.18,-1.92,1.24')
    expect(battery).toHaveAttribute('rotation', '0,0,-0.16')
    const segments = container.querySelectorAll('mesh[name^="battle-health-battery-segment"]')

    expect(segments).toHaveLength(3)
    expect(
      container.querySelectorAll('mesh[name="battle-health-battery-segment-active"]'),
    ).toHaveLength(2)
    expect(container.querySelectorAll('shapegeometry')).toHaveLength(5)
    expect(container.querySelector('mesh[name="battle-health-battery-center-lead"]')).toBeNull()
  })

  it('uses cyan-only gradient neon blur layers instead of a flat box frame', () => {
    const { container } = render(<BattleHealthBattery hp={3} maxHp={3} />)

    expect(
      container.querySelectorAll('mesh[name="battle-health-battery-gradient-blur"]'),
    ).toHaveLength(4)
    expect(container.querySelector('mesh[name="battle-health-battery-dark-box"]')).toBeNull()
    expect(container.querySelector('mesh[name="battle-health-battery-center-lead"]')).toBeNull()
    expect(container.querySelectorAll('meshbasicmaterial[color="#69f0e3"]')).not.toHaveLength(0)
  })
})
