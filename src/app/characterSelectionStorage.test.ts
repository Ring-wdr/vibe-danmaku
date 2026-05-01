import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  lastCharacterStorageKey,
  readLastCharacterId,
  writeLastCharacterId,
} from './characterSelectionStorage'

describe('character selection storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('uses the stable last-character storage key', () => {
    expect(lastCharacterStorageKey).toBe('vibe-danmaku:last-character-id')
  })

  it('reads and writes the last selected character id', () => {
    writeLastCharacterId('lyra-aer')

    expect(window.localStorage.getItem(lastCharacterStorageKey)).toBe('lyra-aer')
    expect(readLastCharacterId()).toBe('lyra-aer')
  })

  it('returns null when no character has been saved', () => {
    expect(readLastCharacterId()).toBeNull()
  })

  it('tolerates unavailable storage without throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(readLastCharacterId()).toBeNull()
    expect(() => writeLastCharacterId('lyra-aer')).not.toThrow()
  })
})
