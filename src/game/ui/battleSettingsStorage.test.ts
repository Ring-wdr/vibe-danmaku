import { describe, expect, it, vi } from 'vitest'

import {
  battleSettingsStorageKey,
  defaultBattleSettings,
  readBattleSettings,
  writeBattleSettings,
} from './battleSettingsStorage'

function createStorage(initialValue?: unknown): Storage {
  const store = new Map<string, string>()
  if (initialValue !== undefined) {
    store.set(battleSettingsStorageKey, JSON.stringify(initialValue))
  }

  return {
    get length() {
      return store.size
    },
    clear: vi.fn(() => store.clear()),
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value)
    }),
  }
}

describe('battle settings storage', () => {
  it('keeps BGM enabled when reading older saved settings without a BGM field', () => {
    const storage = createStorage({
      frameRate: 30,
      controlMode: 'drag',
      dragSensitivity: 2,
    })

    expect(readBattleSettings(storage)).toEqual({
      frameRate: 30,
      controlMode: 'drag',
      dragSensitivity: 2,
      bgmEnabled: true,
    })
  })

  it('persists the BGM toggle with the rest of the battle settings', () => {
    const storage = createStorage()

    writeBattleSettings({ ...defaultBattleSettings, bgmEnabled: false }, storage)

    expect(readBattleSettings(storage)).toMatchObject({ bgmEnabled: false })
  })
})
