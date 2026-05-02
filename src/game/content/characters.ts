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

export const vesperNoireCharacter: PlayableCharacter = {
  id: 'vesper-noire',
  name: 'Vesper Noire',
  title: 'Arcane Phantom',
  spriteSheetUrl: gameAssets.vesperNoireSheetUrl,
  portraitUrl: gameAssets.vesperNoirePortraitUrl,
  description:
    'Masked phantom thief with twin arcane panels, heavy burst volleys, and a bullet-clearing nova.',
  frameCount: 4,
  moveRadius: {
    x: 4.05,
    minZ: -3.2,
    maxZ: -0.35,
  },
  shot: {
    interval: 0.14,
    speed: 5.8,
    power: 11,
    sidePanelShots: [
      {
        offsetX: -0.56,
        speed: 6.15,
        power: 9,
        radius: 0.07,
        glow: 1.42,
      },
      {
        offsetX: 0.56,
        speed: 6.15,
        power: 9,
        radius: 0.07,
        glow: 1.42,
      },
    ],
  },
  sidePanels: [
    { offsetX: -0.62, offsetZ: 0.1, scale: 0.56, textureUrl: gameAssets.vesperNoirePanelUrl },
    { offsetX: 0.62, offsetZ: 0.1, scale: 0.56, textureUrl: gameAssets.vesperNoirePanelUrl },
  ],
  special: {
    id: 'phantom-orb',
    icon: 'orb',
    kind: 'energyOrb',
    projectileSpeed: 5.4,
    explosionRadius: 2.25,
    damage: 420,
    bulletClearRadius: 2.75,
  },
  stats: [
    { label: 'Mobility', value: 'Unbound', ratio: 0.9 },
    { label: 'Panel Fire', value: 'Triple', ratio: 0.95 },
    { label: 'Nova', value: 'Overkill', ratio: 1 },
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

export const playableCharacters = [lyraAerCharacter, vesperNoireCharacter] as const
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
