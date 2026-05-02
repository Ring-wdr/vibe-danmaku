import { describe, expect, it } from 'vitest'

import {
  defaultCharacterId,
  fallbackCharacter,
  getCharacterSelectRoster,
  astraVoltCharacter,
  isPlayableCharacterId,
  playableCharacters,
  reinaShiroganeCharacter,
  resolveCharacterId,
  resolvePlayableCharacter,
  vesperNoireCharacter,
} from './characters'

describe('character catalog', () => {
  it('registers Lyra, Vesper, Reina, and Astra as normal playable characters', () => {
    expect(defaultCharacterId).toBe('lyra-aer')
    expect(playableCharacters).toHaveLength(4)
    expect(playableCharacters[0]).toMatchObject({
      id: 'lyra-aer',
      name: 'Lyra Aer',
      title: 'Aether Weaver',
      frameCount: 4,
      isFallback: false,
    })
    expect(playableCharacters[1]).toBe(vesperNoireCharacter)
    expect(playableCharacters[1]).toMatchObject({
      id: 'vesper-noire',
      name: 'Vesper Noire',
      title: 'Arcane Phantom',
      frameCount: 4,
      isFallback: false,
      special: {
        id: 'phantom-orb',
        icon: 'orb',
        kind: 'energyOrb',
      },
    })
    expect(vesperNoireCharacter.shot.sidePanelShots).toEqual([
      expect.objectContaining({ offsetX: -0.56 }),
      expect.objectContaining({ offsetX: 0.56 }),
    ])
    expect(vesperNoireCharacter.sidePanels).toEqual([
      expect.objectContaining({ offsetX: -0.62, textureUrl: expect.stringContaining('vesper-noire-panel') }),
      expect.objectContaining({ offsetX: 0.62, textureUrl: expect.stringContaining('vesper-noire-panel') }),
    ])
    expect(playableCharacters[2]).toBe(reinaShiroganeCharacter)
    expect(playableCharacters[2]).toMatchObject({
      id: 'reina-shirogane',
      name: 'Reina Shirogane',
      title: 'Crimson Blades',
      frameCount: 4,
      isFallback: false,
    })
    expect(reinaShiroganeCharacter.shot.sidePanelShots).toBeUndefined()
    expect(reinaShiroganeCharacter.sidePanels).toEqual([
      expect.objectContaining({
        textureUrl: expect.stringContaining('reina-shirogane-sword'),
        orbit: expect.objectContaining({ phase: 0 }),
      }),
      expect.objectContaining({
        textureUrl: expect.stringContaining('reina-shirogane-sword'),
        orbit: expect.objectContaining({ phase: (Math.PI * 2) / 3 }),
      }),
      expect.objectContaining({
        textureUrl: expect.stringContaining('reina-shirogane-sword'),
        orbit: expect.objectContaining({ phase: (Math.PI * 4) / 3 }),
      }),
    ])
    for (const panel of reinaShiroganeCharacter.sidePanels ?? []) {
      expect(panel.orbit?.radiusX).toBeGreaterThanOrEqual(2.04)
      expect(panel.orbit?.radiusZ).toBeGreaterThanOrEqual(0.72)
      expect(panel.orbit?.hitRadius).toBeGreaterThanOrEqual(0.32)
      expect(panel.orbit?.damagePerSecond).toBe(96)
    }
    expect(playableCharacters[3]).toBe(astraVoltCharacter)
    expect(playableCharacters[3]).toMatchObject({
      id: 'astra-volt',
      name: 'Astra Volt',
      title: 'Thunder Regent',
      frameCount: 4,
      isFallback: false,
      special: {
        id: 'beam-lance',
        icon: 'beam',
        kind: 'beam',
      },
    })
    expect(astraVoltCharacter.shot.sidePanelShots).toEqual([
      expect.objectContaining({ offsetX: -0.68, glow: 1.55 }),
      expect.objectContaining({ offsetX: 0.68, glow: 1.55 }),
    ])
    expect(astraVoltCharacter.sidePanels).toEqual([
      expect.objectContaining({
        offsetX: -0.72,
        textureUrl: expect.stringContaining('astra-volt-panel'),
      }),
      expect.objectContaining({
        offsetX: 0.72,
        textureUrl: expect.stringContaining('astra-volt-panel'),
      }),
    ])
  })

  it('resolves empty selection to the default character and invalid saved ids to fallback', () => {
    expect(resolveCharacterId(null)).toBe(defaultCharacterId)
    expect(resolveCharacterId(undefined)).toBe(defaultCharacterId)
    expect(resolveCharacterId('')).toBe(defaultCharacterId)
    expect(resolveCharacterId('deleted-character')).toBe(fallbackCharacter.id)
  })

  it('resolves character definitions with safe fallback stats', () => {
    expect(resolvePlayableCharacter('lyra-aer').name).toBe('Lyra Aer')
    expect(resolvePlayableCharacter('vesper-noire')).toBe(vesperNoireCharacter)

    const resolvedFallback = resolvePlayableCharacter('deleted-character')

    expect(resolvedFallback).toBe(fallbackCharacter)
    expect(resolvedFallback.isFallback).toBe(true)
    expect(resolvedFallback.spriteSheetUrl).toBe(resolvePlayableCharacter('lyra-aer').spriteSheetUrl)
    expect(resolvedFallback.shot).toEqual(resolvePlayableCharacter('lyra-aer').shot)
  })

  it('keeps the fallback out of the normal roster until it is the active selection', () => {
    expect(isPlayableCharacterId('lyra-aer')).toBe(true)
    expect(isPlayableCharacterId('vesper-noire')).toBe(true)
    expect(isPlayableCharacterId('reina-shirogane')).toBe(true)
    expect(isPlayableCharacterId('astra-volt')).toBe(true)
    expect(isPlayableCharacterId(fallbackCharacter.id)).toBe(false)
    expect(getCharacterSelectRoster('lyra-aer').map((character) => character.id)).toEqual([
      'lyra-aer',
      'vesper-noire',
      'reina-shirogane',
      'astra-volt',
    ])
    expect(getCharacterSelectRoster(fallbackCharacter.id).map((character) => character.id)).toEqual([
      fallbackCharacter.id,
      'lyra-aer',
      'vesper-noire',
      'reina-shirogane',
      'astra-volt',
    ])
    expect(getCharacterSelectRoster('deleted-character').map((character) => character.id)).toEqual([
      fallbackCharacter.id,
      'lyra-aer',
      'vesper-noire',
      'reina-shirogane',
      'astra-volt',
    ])
  })
})
