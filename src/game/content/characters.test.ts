import { describe, expect, it } from 'vitest'

import {
  defaultCharacterId,
  fallbackCharacter,
  getCharacterSelectRoster,
  isPlayableCharacterId,
  playableCharacters,
  resolveCharacterId,
  resolvePlayableCharacter,
} from './characters'

describe('character catalog', () => {
  it('registers Lyra as the only normal playable character for this pass', () => {
    expect(defaultCharacterId).toBe('lyra-aer')
    expect(playableCharacters).toHaveLength(1)
    expect(playableCharacters[0]).toMatchObject({
      id: 'lyra-aer',
      name: 'Lyra Aer',
      title: 'Aether Weaver',
      frameCount: 4,
      isFallback: false,
    })
  })

  it('resolves empty selection to the default character and invalid saved ids to fallback', () => {
    expect(resolveCharacterId(null)).toBe(defaultCharacterId)
    expect(resolveCharacterId(undefined)).toBe(defaultCharacterId)
    expect(resolveCharacterId('')).toBe(defaultCharacterId)
    expect(resolveCharacterId('deleted-character')).toBe(fallbackCharacter.id)
  })

  it('resolves character definitions with safe fallback stats', () => {
    expect(resolvePlayableCharacter('lyra-aer').name).toBe('Lyra Aer')

    const resolvedFallback = resolvePlayableCharacter('deleted-character')

    expect(resolvedFallback).toBe(fallbackCharacter)
    expect(resolvedFallback.isFallback).toBe(true)
    expect(resolvedFallback.spriteSheetUrl).toBe(resolvePlayableCharacter('lyra-aer').spriteSheetUrl)
    expect(resolvedFallback.shot).toEqual(resolvePlayableCharacter('lyra-aer').shot)
  })

  it('keeps the fallback out of the normal roster until it is the active selection', () => {
    expect(isPlayableCharacterId('lyra-aer')).toBe(true)
    expect(isPlayableCharacterId(fallbackCharacter.id)).toBe(false)
    expect(getCharacterSelectRoster('lyra-aer').map((character) => character.id)).toEqual([
      'lyra-aer',
    ])
    expect(getCharacterSelectRoster(fallbackCharacter.id).map((character) => character.id)).toEqual([
      fallbackCharacter.id,
      'lyra-aer',
    ])
  })
})
