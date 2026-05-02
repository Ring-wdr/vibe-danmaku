import type { ArenaPoint, CharacterDefinition } from '../types'

export type CharacterSidePanel = NonNullable<CharacterDefinition['sidePanels']>[number]

export function getSidePanelPosition({
  battleElapsed,
  panel,
  player,
}: {
  battleElapsed: number
  panel: CharacterSidePanel
  player: ArenaPoint
}): ArenaPoint {
  if (!panel.orbit) {
    return {
      x: player.x + panel.offsetX,
      z: player.z + panel.offsetZ,
    }
  }

  const angle = panel.orbit.phase + battleElapsed * panel.orbit.angularSpeed

  return {
    x: player.x + panel.offsetX + Math.cos(angle) * panel.orbit.radiusX,
    z: player.z + panel.offsetZ + Math.sin(angle) * panel.orbit.radiusZ,
  }
}

export function getSidePanelTilt({
  battleElapsed,
  panel,
  side,
}: {
  battleElapsed: number
  panel: CharacterSidePanel
  side: -1 | 1
}) {
  if (!panel.orbit) {
    return side * 0.24 + Math.sin(battleElapsed * 4.2 + side) * 0.06
  }

  const angle = panel.orbit.phase + battleElapsed * panel.orbit.angularSpeed

  return -angle + Math.PI / 2
}
