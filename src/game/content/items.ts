import type { BattleItemDefinition, BattleItemId } from '../types'

export const battleItems = {
  powerup: {
    id: 'powerup',
    label: 'Power Up',
    maxLevel: 3,
    attackMultiplierPerLevel: 1.2,
  },
} satisfies Record<BattleItemId, BattleItemDefinition>

export function getAttackMultiplier(powerupLevel: number) {
  return Number(
    Math.pow(battleItems.powerup.attackMultiplierPerLevel, powerupLevel).toFixed(2),
  )
}
