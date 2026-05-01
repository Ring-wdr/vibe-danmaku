import { gameAssets } from '../assets'
import type { CharacterDefinition } from '../types'

export type CharacterStat = {
  label: string
  value: string
  ratio: number
}

export type PlayableCharacter = CharacterDefinition & {
  portraitUrl: string
  description: string
  stats: CharacterStat[]
  isFallback: boolean
}

export const lyraAerCharacter: PlayableCharacter = {
  id: 'lyra-aer',
  name: 'Lyra Aer',
  title: 'Aether Weaver',
  spriteSheetUrl: gameAssets.playerSheetUrl,
  portraitUrl: gameAssets.playerPortraitUrl,
  description: 'Balanced sortie pilot with steady movement, rapid aether fire, and reliable beam charge.',
  frameCount: 4,
  moveRadius: {
    x: 3.85,
    minZ: -3.15,
    maxZ: -0.45,
  },
  shot: {
    interval: 0.12,
    speed: 5.4,
    power: 12,
  },
  stats: [
    { label: 'Mobility', value: 'Balanced', ratio: 0.78 },
    { label: 'Fire Rate', value: 'Rapid', ratio: 0.82 },
    { label: 'Power', value: 'Steady', ratio: 0.64 },
  ],
  isFallback: false,
}

export const fallbackCharacter: PlayableCharacter = {
  ...lyraAerCharacter,
  id: 'fallback-pilot',
  name: 'Reserve Pilot',
  title: 'Fallback Loadout',
  description: 'Safe reserve loadout restored because the last selected pilot is no longer available.',
  isFallback: true,
}

export const playableCharacters = [lyraAerCharacter] as const
export const defaultCharacterId = lyraAerCharacter.id

const playableCharacterMap = new Map<string, PlayableCharacter>(
  playableCharacters.map((character) => [character.id, character]),
)

export function isPlayableCharacterId(id: string | null | undefined) {
  return typeof id === 'string' && playableCharacterMap.has(id)
}

export function resolveCharacterId(id: string | null | undefined) {
  if (id === null || id === undefined || id === '') {
    return defaultCharacterId
  }

  if (isPlayableCharacterId(id)) {
    return id
  }

  return fallbackCharacter.id
}

export function resolvePlayableCharacter(id?: string | null): PlayableCharacter {
  const resolvedId = resolveCharacterId(id)

  return playableCharacterMap.get(resolvedId) ?? fallbackCharacter
}

export function getCharacterSelectRoster(selectedId: string): PlayableCharacter[] {
  if (resolveCharacterId(selectedId) === fallbackCharacter.id) {
    return [fallbackCharacter, ...playableCharacters]
  }

  return [...playableCharacters]
}
