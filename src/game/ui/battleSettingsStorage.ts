export type FrameRate = 30 | 60
export type ControlMode = 'position' | 'drag'
export type DragSensitivity = 1 | 2 | 3

export type BattleSettings = {
  frameRate: FrameRate
  controlMode: ControlMode
  dragSensitivity: DragSensitivity
  bgmEnabled: boolean
}

export const battleSettingsStorageKey = 'vibe-danmaku:battle-settings'

export const defaultBattleSettings: BattleSettings = {
  frameRate: 60,
  controlMode: 'position',
  dragSensitivity: 1,
  bgmEnabled: true,
}

const battleSettingsListeners = new Set<() => void>()

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

function normalizeBattleSettings(value: unknown): BattleSettings | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<BattleSettings>

  if (
    (candidate.frameRate !== 30 && candidate.frameRate !== 60) ||
    (candidate.controlMode !== 'position' && candidate.controlMode !== 'drag') ||
    (candidate.dragSensitivity !== 1 &&
      candidate.dragSensitivity !== 2 &&
      candidate.dragSensitivity !== 3) ||
    (candidate.bgmEnabled !== undefined && typeof candidate.bgmEnabled !== 'boolean')
  ) {
    return null
  }

  return {
    frameRate: candidate.frameRate,
    controlMode: candidate.controlMode,
    dragSensitivity: candidate.dragSensitivity,
    bgmEnabled: candidate.bgmEnabled ?? true,
  }
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
    return normalizeBattleSettings(parsed) ?? defaultBattleSettings
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
    for (const listener of battleSettingsListeners) {
      listener()
    }
  } catch {
    // Storage can be unavailable. The current battle still keeps settings in memory.
  }
}

export function subscribeBattleSettings(listener: () => void) {
  battleSettingsListeners.add(listener)
  return () => {
    battleSettingsListeners.delete(listener)
  }
}
