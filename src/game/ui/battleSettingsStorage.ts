export type FrameRate = 30 | 60
export type ControlMode = 'position' | 'drag'
export type DragSensitivity = 1 | 2 | 3

export type BattleSettings = {
  frameRate: FrameRate
  controlMode: ControlMode
  dragSensitivity: DragSensitivity
}

export const battleSettingsStorageKey = 'vibe-danmaku:battle-settings'

export const defaultBattleSettings: BattleSettings = {
  frameRate: 60,
  controlMode: 'position',
  dragSensitivity: 1,
}

function getBrowserStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isBattleSettings(value: unknown): value is BattleSettings {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<BattleSettings>

  return (
    (candidate.frameRate === 30 || candidate.frameRate === 60) &&
    (candidate.controlMode === 'position' || candidate.controlMode === 'drag') &&
    (candidate.dragSensitivity === 1 ||
      candidate.dragSensitivity === 2 ||
      candidate.dragSensitivity === 3)
  )
}

export function readBattleSettings(storage = getBrowserStorage()): BattleSettings {
  if (!storage) {
    return defaultBattleSettings
  }

  try {
    const raw = storage.getItem(battleSettingsStorageKey)
    if (!raw) {
      return defaultBattleSettings
    }

    const parsed = JSON.parse(raw) as unknown
    return isBattleSettings(parsed) ? parsed : defaultBattleSettings
  } catch {
    return defaultBattleSettings
  }
}

export function writeBattleSettings(
  settings: BattleSettings,
  storage = getBrowserStorage(),
) {
  if (!storage) {
    return
  }

  try {
    storage.setItem(battleSettingsStorageKey, JSON.stringify(settings))
  } catch {
    // Storage can be unavailable. The current battle still keeps settings in memory.
  }
}
