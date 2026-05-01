export const lastCharacterStorageKey = 'vibe-danmaku:last-character-id'

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

export function readLastCharacterId(storage = getBrowserStorage()) {
  if (!storage) {
    return null
  }

  try {
    return storage.getItem(lastCharacterStorageKey)
  } catch {
    return null
  }
}

export function writeLastCharacterId(characterId: string, storage = getBrowserStorage()) {
  if (!storage) {
    return
  }

  try {
    storage.setItem(lastCharacterStorageKey, characterId)
  } catch {
    // Storage can be disabled in private browser contexts. Selection still works in memory.
  }
}
