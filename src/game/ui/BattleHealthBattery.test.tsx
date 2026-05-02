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

    expect(battery).toHaveAttribute('position', '-3.18,-2.05,1.24')
    const segments = container.querySelectorAll('mesh[name^="battle-health-battery-segment"]')

    expect(segments).toHaveLength(3)
    expect(
      container.querySelectorAll('mesh[name="battle-health-battery-segment-active"]'),
    ).toHaveLength(2)
  })
})
