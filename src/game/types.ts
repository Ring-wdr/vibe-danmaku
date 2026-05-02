export type Difficulty = 'easy' | 'normal' | 'hard'

export type StageId = string
export type StageBackgroundTheme = 'brass-cloud' | 'burning-ruins'

export type AppScreen =
  | 'title'
  | 'difficulty-select'
  | 'character-select'
  | 'stage-intro'
  | 'battle-loading'
  | 'battle'
  | 'result'

export type EnemyArchetypeId =
  | 'scout'
  | 'sentinel'
  | 'lancer'
  | 'splitter'
  | 'mine-layer'
  | 'weaver'

export type EnemyThemeId = 'brass-cloud'
export type EnemyAtlasId = 'enemy-brass-cloud'
export type EnemyFrameId = EnemyArchetypeId
export type EnemyVariantId = `${EnemyThemeId}-${EnemyArchetypeId}`
export type EnemyKind = EnemyVariantId | 'boss-core'

export type PatternShape =
  | 'fan'
  | 'ring'
  | 'spiral'
  | 'laser-bloom'
  | 'needle'
  | 'split'
  | 'mine'
  | 'wave'

export type ArenaPoint = {
  x: number
  z: number
}

export type BulletPatternConfig = {
  shape: PatternShape
  count: number
  interval: number
  speed: number
  spread: number
  life: number
  aim?: 'down' | 'player'
  split?: {
    delay: number
    count: number
    speedMultiplier: number
  }
  wave?: {
    amplitude: number
    frequency: number
  }
}

export type StageCondition =
  | { type: 'bossActive'; bossId: string }
  | { type: 'bossPhase'; bossId: string; phaseId: string }

export type StageTrigger =
  | { type: 'time'; at: number }
  // Keeps authored timeline pacing while requiring a defeated gate target.
  | { type: 'timeAfterDefeated'; at: number; target: string; delay?: number }
  | { type: 'afterResolved'; target: string; delay: number }
  | { type: 'afterDefeated'; target: string; delay: number }
  | { type: 'bossHp'; bossId: string; atOrBelow: number }
  | { type: 'bossPhase'; bossId: string; phaseId: string }
  | { type: 'interval'; every: number; while: StageCondition }

export type StageAction =
  | { type: 'spawnWave'; wave: EnemyWave; groupKind?: 'wave' | 'summon' }
  | { type: 'spawnBoss'; boss: BossDefinition; role: 'midboss' | 'final' }
  | { type: 'finishStage'; outcome: 'victory' }

export type StageEvent = {
  id: string
  trigger: StageTrigger
  actions: StageAction[]
  once?: boolean
}

export type EnemyMovementConfig =
  | { type: 'flyThrough'; path: 'swoop-left' | 'swoop-right' | 'helix'; speed: number }
  | {
      type: 'enterAndStrafe'
      entrySpeed: number
      holdZ: number
      strafeSpeed: number
      strafeRange: number
    }

export type SpawnGroupResolution =
  | { type: 'allInactive' }
  | { type: 'allDefeated' }
  | { type: 'timeout'; seconds: number; then: 'resolve' | 'forceEscape' }

export type EnemyWave = {
  id: string
  kind: EnemyKind
  archetype: EnemyArchetypeId
  variant: EnemyVariantId
  atlasId: EnemyAtlasId
  frameId: EnemyFrameId
  count: number
  spacing: number
  hp: number
  movement: EnemyMovementConfig
  resolution: SpawnGroupResolution
  scale: number
  hitRadius: number
  pattern: BulletPatternConfig
}

export type BossPhaseDefinition = {
  id: string
  threshold: number
  label: string
  supportLaser: boolean
  pattern: BulletPatternConfig
}

export type BossDefinition = {
  id: string
  hp: number
  phases: BossPhaseDefinition[]
}

export type StageDefinition = {
  id: StageId
  stageNumber: number
  backgroundTheme: StageBackgroundTheme
  name: string
  lore: string
  duration?: number
  events: StageEvent[]
}

export type CharacterDefinition = {
  id: string
  name: string
  title: string
  spriteSheetUrl: string
  frameCount: number
  moveRadius: {
    x: number
    minZ: number
    maxZ: number
  }
  shot: {
    interval: number
    speed: number
    power: number
  }
}

export type RunResult = {
  outcome: 'victory' | 'defeat'
  stageId: StageId
  stageName: string
  stageNumber: number
  difficulty: Difficulty
  duration: number
  remainingHp: number
  hitsTaken: number
}

export type RenderEnemy = {
  id: string
  waveId: string
  kind: EnemyKind
  archetype: EnemyArchetypeId
  variant: EnemyVariantId
  atlasId: EnemyAtlasId
  frameId: EnemyFrameId
  position: ArenaPoint
  scale: number
  hitRadius: number
}

export type RenderBoss = {
  id: string
  position: ArenaPoint
  hpRatio: number
  phaseLabel: string
  supportLaser: boolean
}

export type RenderBullet = {
  id: string
  source: 'player' | 'enemy'
  position: ArenaPoint
  radius: number
  glow: number
}

export type SpecialSlotId = 'beam-lance'
export type SpecialIconId = 'beam'

export type RenderSpecialSlot = {
  id: SpecialSlotId
  icon: SpecialIconId
  charge: number
  maxCharge: number
  ready: boolean
  active: boolean
  activeRatio: number
}

export type RenderSpecialBeam = {
  origin: ArenaPoint
  angle: 0
  width: number
  length: number
}

export type RenderSparkle = {
  id: string
  position: ArenaPoint
  age: number
  life: number
  intensity: number
}

export type BattleSnapshot = {
  difficulty: Difficulty
  stageName: string
  elapsed: number
  duration: number
  phaseLabel: string
  player: {
    position: ArenaPoint
    hp: number
    invulnerable: boolean
  }
  enemies: RenderEnemy[]
  boss: RenderBoss | null
  bosses: RenderBoss[]
  bullets: RenderBullet[]
  specialSlots: RenderSpecialSlot[]
  specialBeam: RenderSpecialBeam | null
  sparkles: RenderSparkle[]
  playerShots: number
  hitsTaken: number
  bossEnteredCount: number
  cuePulse: number
  result: RunResult | null
}
