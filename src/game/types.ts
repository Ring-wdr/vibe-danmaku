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

export type BulletmlExpression =
  | number
  | { type: 'rank' }
  | { type: 'rand' }
  | {
      type: 'add' | 'sub' | 'mul' | 'div' | 'mod'
      left: BulletmlExpression
      right: BulletmlExpression
    }

export type BulletmlDirection =
  | { type: 'absolute'; degrees: BulletmlExpression }
  | { type: 'relative'; degrees: BulletmlExpression }
  | { type: 'sequence'; degrees: BulletmlExpression }
  | { type: 'aim'; degrees?: BulletmlExpression }

export type BulletmlSpeed =
  | { type: 'absolute'; value: BulletmlExpression }
  | { type: 'relative'; value: BulletmlExpression }
  | { type: 'sequence'; value: BulletmlExpression }

export type BulletmlAction = BulletmlCommand[]

export type BulletmlCommand =
  | { type: 'wait'; seconds: BulletmlExpression }
  | { type: 'repeat'; times: BulletmlExpression; actions: BulletmlAction }
  | {
      type: 'fire'
      direction?: BulletmlDirection
      speed?: BulletmlSpeed
      actions?: BulletmlAction
      radius?: number
      glow?: number
      life?: number
      damage?: number
    }
  | { type: 'changeSpeed'; speed: BulletmlSpeed; term: BulletmlExpression }
  | {
      type: 'changeDirection'
      direction: BulletmlDirection
      term: BulletmlExpression
    }
  | { type: 'vanish' }
  | { type: 'action'; actions: BulletmlAction }

export type BulletmlPatternConfig = {
  engine: 'bulletml'
  interval: number
  rank?: number
  loop?: boolean
  bullet?: {
    radius?: number
    glow?: number
    life?: number
    damage?: number
  }
  action: BulletmlAction
}

export type BossBulletPatternConfig = BulletPatternConfig | BulletmlPatternConfig

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
  pattern: BossBulletPatternConfig
}

export type BossDefinition = {
  id: string
  hp: number
  phases: BossPhaseDefinition[]
}

export type BossPhaseFsmState =
  | 'Intro'
  | 'CombatPhase'
  | 'Break'
  | 'Desperation'
  | 'Death'

export type BossMovementFsmState =
  | 'EnterScreen'
  | 'HoldCenter'
  | 'SweepLeftRight'
  | 'ChasePlayerX'
  | 'Retreat'

export type BossFirePatternFsmState =
  | 'Idle'
  | 'AimedFan'
  | 'SpiralRing'
  | 'WallSweep'
  | 'MixedPattern'

export type BossVulnerabilityFsmState =
  | 'Invulnerable'
  | 'Vulnerable'
  | 'ArmorBreak'

export type BossFsmSnapshot = {
  phase: BossPhaseFsmState
  phaseId: string | null
  phaseIndex: number | null
  movement: BossMovementFsmState
  firePattern: BossFirePatternFsmState
  vulnerability: BossVulnerabilityFsmState
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
  maxHp?: number
  moveRadius: {
    x: number
    minZ: number
    maxZ: number
  }
  shot: {
    interval: number
    speed: number
    power: number
    projectileKind?: 'primary' | 'sword'
    sidePanelShots?: {
      offsetX: number
      speed?: number
      power?: number
      radius?: number
      glow?: number
    }[]
  }
  sidePanels?: {
    offsetX: number
    offsetZ: number
    scale: number
    textureUrl: string
    orbit?: {
      radiusX: number
      radiusZ: number
      angularSpeed: number
      phase: number
      hitRadius: number
      damagePerSecond: number
    }
  }[]
  special?: CharacterSpecialDefinition
}

export type CharacterSpecialDefinition =
  | {
      id: 'beam-lance'
      icon: 'beam'
      kind: 'beam'
    }
  | {
      id: 'phantom-orb'
      icon: 'orb'
      kind: 'energyOrb'
      projectileSpeed: number
      explosionRadius: number
      damage: number
      bulletClearRadius: number
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
  score: number
  maxCombo: number
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
  hitFlashRatio: number
}

export type RenderBoss = {
  id: string
  position: ArenaPoint
  hpRatio: number
  phaseLabel: string
  supportLaser: boolean
  fsm: BossFsmSnapshot
}

export type RenderBullet = {
  id: string
  source: 'player' | 'enemy'
  kind?: 'primary' | 'sword' | 'panel' | 'special-orb'
  position: ArenaPoint
  radius: number
  glow: number
}

export type BattleItemId = 'powerup'

export type BattleItemDefinition = {
  id: BattleItemId
  label: string
  maxLevel: number
  attackMultiplierPerLevel: number
}

export type RenderItemDrop = {
  id: string
  itemId: BattleItemId
  position: ArenaPoint
  collected: boolean
}

export type RenderPlayerPowerups = {
  powerupLevel: number
  attackMultiplier: number
}

export type SpecialSlotId = 'beam-lance' | 'phantom-orb'
export type SpecialIconId = 'beam' | 'orb'

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

export type RenderDestructionEffect = {
  id: string
  position: ArenaPoint
  age: number
  life: number
  scale: number
  seed: number
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
    maxHp: number
    invulnerable: boolean
  }
  enemies: RenderEnemy[]
  boss: RenderBoss | null
  bosses: RenderBoss[]
  bullets: RenderBullet[]
  itemDrops: RenderItemDrop[]
  playerPowerups: RenderPlayerPowerups
  specialSlots: RenderSpecialSlot[]
  specialBeam: RenderSpecialBeam | null
  sparkles: RenderSparkle[]
  destructionEffects: RenderDestructionEffect[]
  playerShots: number
  hitsTaken: number
  score: number
  combo: number
  maxCombo: number
  bossEnteredCount: number
  cuePulse: number
  result: RunResult | null
}
