export type Difficulty = 'easy' | 'normal' | 'hard'

export type AppScreen =
  | 'title'
  | 'difficulty-select'
  | 'stage-intro'
  | 'battle'
  | 'result'

export type EnemyKind = 'steam-scout' | 'feather-drone' | 'boss-core'

export type PatternShape = 'fan' | 'ring' | 'spiral' | 'laser-bloom'

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
}

export type EnemyWave = {
  id: string
  startAt: number
  kind: EnemyKind
  count: number
  spacing: number
  hp: number
  speed: number
  path: 'swoop-left' | 'swoop-right' | 'helix'
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
  startAt: number
  hp: number
  phases: BossPhaseDefinition[]
}

export type StageDefinition = {
  id: string
  name: string
  lore: string
  duration: number
  waves: EnemyWave[]
  boss: BossDefinition
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
  difficulty: Difficulty
  duration: number
  remainingHp: number
  hitsTaken: number
}

export type RenderEnemy = {
  id: string
  kind: EnemyKind
  position: ArenaPoint
  scale: number
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
  bullets: RenderBullet[]
  playerShots: number
  hitsTaken: number
  bossEnteredCount: number
  cuePulse: number
  result: RunResult | null
}
