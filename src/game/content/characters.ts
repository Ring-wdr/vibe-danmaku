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

export const screenMinusTenPercentMoveRadius = {
  x: 4.14,
  minZ: -2.41,
  maxZ: 3.41,
} as const

export const lyraAerCharacter: PlayableCharacter = {
  id: 'lyra-aer',
  name: 'Lyra Aer',
  title: 'Aether Weaver',
  spriteSheetUrl: gameAssets.playerSheetUrl,
  portraitUrl: gameAssets.playerPortraitUrl,
  description: 'Balanced sortie pilot with steady movement, rapid aether fire, and reliable beam charge.',
  frameCount: 4,
  moveRadius: { ...screenMinusTenPercentMoveRadius },
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
  moveRadius: { ...screenMinusTenPercentMoveRadius },
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

export const reinaShiroganeCharacter: PlayableCharacter = {
  id: 'reina-shirogane',
  name: 'Reina Shirogane',
  title: 'Crimson Blades',
  spriteSheetUrl: gameAssets.reinaShiroganeSheetUrl,
  portraitUrl: gameAssets.reinaShiroganePortraitUrl,
  description:
    'Calm sword saint with a central flying blade shot and three orbiting swords that punish close enemies.',
  frameCount: 4,
  moveRadius: { ...screenMinusTenPercentMoveRadius },
  shot: {
    interval: 0.14,
    speed: 5.9,
    power: 11,
    projectileKind: 'sword',
  },
  sidePanels: [
    {
      offsetX: 0,
      offsetZ: 0.22,
      scale: 0.5,
      textureUrl: gameAssets.reinaShiroganeSwordUrl,
      orbit: {
        radiusX: 2.4,
        radiusZ: 0.85,
        angularSpeed: 3.2,
        phase: 0,
        hitRadius: 0.36,
        damagePerSecond: 96,
      },
    },
    {
      offsetX: 0,
      offsetZ: 0.22,
      scale: 0.5,
      textureUrl: gameAssets.reinaShiroganeSwordUrl,
      orbit: {
        radiusX: 2.4,
        radiusZ: 0.85,
        angularSpeed: 3.2,
        phase: (Math.PI * 2) / 3,
        hitRadius: 0.36,
        damagePerSecond: 96,
      },
    },
    {
      offsetX: 0,
      offsetZ: 0.22,
      scale: 0.5,
      textureUrl: gameAssets.reinaShiroganeSwordUrl,
      orbit: {
        radiusX: 2.4,
        radiusZ: 0.85,
        angularSpeed: 3.2,
        phase: (Math.PI * 4) / 3,
        hitRadius: 0.36,
        damagePerSecond: 96,
      },
    },
  ],
  stats: [
    { label: 'Mobility', value: 'Poised', ratio: 0.82 },
    { label: 'Blade Orbit', value: 'Triple', ratio: 0.92 },
    { label: 'Reach', value: 'Piercing', ratio: 0.86 },
  ],
  isFallback: false,
}

export const astraVoltCharacter: PlayableCharacter = {
  id: 'astra-volt',
  name: 'Astra Volt',
  title: 'Thunder Regent',
  spriteSheetUrl: gameAssets.astraVoltSheetUrl,
  portraitUrl: gameAssets.astraVoltPortraitUrl,
  description:
    'Fierce thunder caster with twin voltaic sigils, fast amber bolts, and a focused lightning lance.',
  frameCount: 4,
  moveRadius: { ...screenMinusTenPercentMoveRadius },
  shot: {
    interval: 0.105,
    speed: 6.25,
    power: 10,
    sidePanelShots: [
      {
        offsetX: -0.68,
        speed: 6.55,
        power: 7,
        radius: 0.056,
        glow: 1.55,
      },
      {
        offsetX: 0.68,
        speed: 6.55,
        power: 7,
        radius: 0.056,
        glow: 1.55,
      },
    ],
  },
  sidePanels: [
    { offsetX: -0.72, offsetZ: 0.08, scale: 0.58, textureUrl: gameAssets.astraVoltPanelUrl },
    { offsetX: 0.72, offsetZ: 0.08, scale: 0.58, textureUrl: gameAssets.astraVoltPanelUrl },
  ],
  special: {
    id: 'beam-lance',
    icon: 'beam',
    kind: 'beam',
  },
  stats: [
    { label: 'Mobility', value: 'Surging', ratio: 0.94 },
    { label: 'Bolt Rate', value: 'Relentless', ratio: 0.98 },
    { label: 'Lance', value: 'Focused', ratio: 0.88 },
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

export const playableCharacters = [
  lyraAerCharacter,
  vesperNoireCharacter,
  reinaShiroganeCharacter,
  astraVoltCharacter,
] as const
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
