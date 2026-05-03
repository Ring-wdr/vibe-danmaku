import type {
  ArenaPoint,
  BattleSnapshot,
  BossDefinition,
  BossBulletPatternConfig,
  CharacterDefinition,
  Difficulty,
  EnemyWave,
  RenderBoss,
  RenderBullet,
  RenderDestructionEffect,
  RenderEnemy,
  RenderItemDrop,
  RenderSpecialBeam,
  RenderSpecialSlot,
  RunResult,
  SpecialSlotId,
  StageDefinition,
  StageEvent,
} from '../types'
import { battleItems, getAttackMultiplier } from '../content/items'
import { getSidePanelPosition } from '../content/sidePanelOrbit'
import {
  createBulletmlActor,
  createBulletmlPatternActor,
  getBulletmlRank,
  isBulletmlPattern,
  isBulletmlActorIdle,
  stepBulletmlActor,
} from './bulletmlPattern'
import type { BulletmlActor, BulletmlShot } from './bulletmlPattern'

type RuntimeBullet = {
  id: string
  source: 'player' | 'enemy'
  kind?: 'primary' | 'sword' | 'panel' | 'special-orb'
  x: number
  z: number
  vx: number
  vz: number
  radius: number
  glow: number
  life: number
  damage: number
  offViewportFor: number
  age: number
  splitAfter?: number
  splitCount?: number
  splitSpeed?: number
  hasSplit?: boolean
  waveAmplitude?: number
  waveFrequency?: number
  wavePhase?: number
  bulletml?: BulletmlActor
  direction?: number
  speed?: number
}

type RuntimeEnemy = {
  id: string
  waveId: string
  groupId: string
  kind: EnemyWave['kind']
  archetype: EnemyWave['archetype']
  variant: EnemyWave['variant']
  atlasId: EnemyWave['atlasId']
  frameId: EnemyWave['frameId']
  x: number
  z: number
  hp: number
  pattern: EnemyWave['pattern']
  shootTimer: number
  drift: number
  travel: number
  movement: EnemyWave['movement']
  strafeOriginX: number
  scale: number
  hitRadius: number
  hitFlashFor: number
}

type RuntimeBoss = {
  id: string
  role: 'midboss' | 'final'
  definition: BossDefinition
  x: number
  z: number
  hp: number
  maxHp: number
  shootTimer: number
  supportLaserTimer: number
  currentPhaseId: string | null
  enteredPhaseIds: Set<string>
  bulletmlActor: BulletmlActor | null
}

type EventState = {
  fired: boolean
  lastFiredAt: number | null
}

type SpawnGroupState = {
  id: string
  authoredWaveId: string
  kind: 'wave' | 'summon'
  resolution: EnemyWave['resolution']
  spawned: number
  defeated: number
  escaped: number
  forcedResolved: boolean
  spawnedAt: number
  defeatedAt?: number
  resolvedAt: number | null
}

type RuntimeSparkle = {
  id: string
  x: number
  z: number
  age: number
  life: number
  intensity: number
}

type RuntimeDestructionEffect = {
  id: string
  x: number
  z: number
  age: number
  life: number
  scale: number
  seed: number
}

type RuntimeItemDrop = {
  id: string
  itemId: 'powerup'
  x: number
  z: number
  speed: number
  radius: number
  collected: boolean
}

type RuntimeOptions = {
  difficulty: Difficulty
  stage: StageDefinition
  character: CharacterDefinition
  invincible?: boolean
}

type Listener = () => void

const bulletViewportBounds = {
  minX: -3.4,
  maxX: 3.4,
  minZ: -3.2,
  maxZ: 3.2,
  cleanupGrace: 1.2,
} as const

const enemySpawnEntry = {
  startZ: bulletViewportBounds.maxZ + 1.85,
  rowOffset: 0.16,
  attackLead: 0.85,
  firstShotBuffer: 0.15,
} as const

const beamLanceConfig = {
  id: 'beam-lance',
  icon: 'beam',
  maxCharge: 100,
  chargeAtBossRatio: 92,
  enemyDefeatCharge: 0.85,
  activeDuration: 2.4,
  beamWidth: 0.42,
  beamLength: 7,
  damagePerSecond: 180,
  sparkleInterval: 0.08,
  sparkleLife: 0.36,
} as const

const defaultSpecial = {
  id: 'beam-lance',
  icon: 'beam',
  kind: 'beam',
} as const

const enemyFeedbackConfig = {
  hitFlashDuration: 0.06,
  destructionLife: 0.62,
} as const

const scoreConfig = {
  enemyHit: 100,
  comboWindow: 10,
} as const

const itemDropConfig = {
  waveInterval: 4,
  spawnZ: bulletViewportBounds.maxZ + 1.35,
  cleanupZ: bulletViewportBounds.minZ - 0.85,
  speed: 2.6,
  radius: 0.25,
  pickupRadius: 0.28,
} as const

const defaultPlayerMaxHp = 3

const bulletmlRankByDifficulty: Record<Difficulty, number> = {
  easy: 0.28,
  normal: 0.5,
  hard: 0.78,
}

function defaultBulletmlRankForStage(difficulty: Difficulty) {
  return bulletmlRankByDifficulty[difficulty]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getCharacterMaxHp(character: CharacterDefinition) {
  return Math.max(1, Math.round(character.maxHp ?? defaultPlayerMaxHp))
}

function isBulletOutsideViewport(bullet: RuntimeBullet) {
  return (
    bullet.x < bulletViewportBounds.minX ||
    bullet.x > bulletViewportBounds.maxX ||
    bullet.z < bulletViewportBounds.minZ ||
    bullet.z > bulletViewportBounds.maxZ
  )
}

function distanceSquared(a: ArenaPoint, b: ArenaPoint) {
  const dx = a.x - b.x
  const dz = a.z - b.z

  return dx * dx + dz * dz
}

function normalizeVelocity(dx: number, dz: number, speed: number) {
  const length = Math.hypot(dx, dz) || 1

  return {
    vx: (dx / length) * speed,
    vz: (dz / length) * speed,
  }
}

function getEnemyEntryShootDelay(spawnZ: number, speed: number) {
  if (speed <= 0) {
    return Number.POSITIVE_INFINITY
  }

  const attackReadyZ = bulletViewportBounds.maxZ + enemySpawnEntry.attackLead
  const timeToVisibleArena = Math.max(0, (spawnZ - attackReadyZ) / speed)

  return timeToVisibleArena + enemySpawnEntry.firstShotBuffer
}

function getFirstFinalBossTriggerTime(events: StageEvent[]) {
  const finalBossEvent = events.find((event) =>
    event.actions.some((action) => action.type === 'spawnBoss' && action.role === 'final'),
  )

  if (
    finalBossEvent?.trigger.type === 'time' ||
    finalBossEvent?.trigger.type === 'timeAfterDefeated'
  ) {
    return finalBossEvent.trigger.at
  }

  return null
}

function getSupportLaserSpeed(pattern: BossBulletPatternConfig) {
  return isBulletmlPattern(pattern) ? 1.35 : pattern.speed
}

export function createBattleRuntime({
  difficulty,
  stage,
  character,
  invincible = false,
}: RuntimeOptions) {
  const listeners = new Set<Listener>()
  const playerMaxHp = getCharacterMaxHp(character)
  const player = {
    x: 0,
    z: -1.85,
    hp: playerMaxHp,
    invulnerableFor: 0,
    shotTimer: 0,
  }
  const pilot = character
  const bullets: RuntimeBullet[] = []
  const enemies: RuntimeEnemy[] = []
  const bosses: RuntimeBoss[] = []
  const sparkles: RuntimeSparkle[] = []
  const destructionEffects: RuntimeDestructionEffect[] = []
  const itemDrops: RuntimeItemDrop[] = []
  const eventStates = new Map<string, EventState>()
  const spawnGroups = new Map<string, SpawnGroupState>()
  const spawnGroupCounts = new Map<string, number>()
  const defeatedBosses = new Map<string, number>()
  const stageEvents = stage.events
  const stageDuration = stage.duration ?? 0
  const special = pilot.special ?? defaultSpecial
  const finalBossChargeReference =
    getFirstFinalBossTriggerTime(stageEvents) ?? Math.max(1, stageDuration * 0.5)
  const specialChargeRate =
    finalBossChargeReference > 0
      ? beamLanceConfig.chargeAtBossRatio / finalBossChargeReference
      : beamLanceConfig.maxCharge
  let dragActive = false
  let elapsed = 0
  let specialCharge = 0
  let specialActiveFor = 0
  let specialSparkleTimer = 0
  let playerShots = 0
  let hitsTaken = 0
  let score = 0
  let combo = 0
  let maxCombo = 0
  let lastEnemyHitAt: number | null = null
  let bossEnteredCount = 0
  let cuePulse = 0
  let regularWaveSpawnCount = 0
  let powerupLevel = 0
  let result: RunResult | null = null
  let lastBulletId = 0
  let lastEnemyId = 0
  let lastSparkleId = 0
  let lastDestructionEffectId = 0
  let lastItemDropId = 0
  let cachedSnapshot: BattleSnapshot | null = null

  const getBossPhase = (boss: RuntimeBoss | null) => {
    if (!boss) {
      return null
    }

    const ratio = boss.hp / boss.maxHp
    return (
      boss.definition.phases.find((phase) => ratio >= phase.threshold) ??
      boss.definition.phases[boss.definition.phases.length - 1] ??
      null
    )
  }

  const getSpecialSlot = (): RenderSpecialSlot => ({
    id: special.id,
    icon: special.icon,
    charge: Number(specialCharge.toFixed(2)),
    maxCharge: beamLanceConfig.maxCharge,
    ready:
      specialCharge >= beamLanceConfig.maxCharge &&
      specialActiveFor <= 0 &&
      !bullets.some((bullet) => bullet.kind === 'special-orb'),
    active:
      specialActiveFor > 0 || bullets.some((bullet) => bullet.kind === 'special-orb'),
    activeRatio:
      specialActiveFor > 0
        ? clamp(specialActiveFor / beamLanceConfig.activeDuration, 0, 1)
        : 0,
  })

  const getSpecialBeam = (): RenderSpecialBeam | null => {
    if (special.kind !== 'beam' || specialActiveFor <= 0) {
      return null
    }

    return {
      origin: { x: player.x, z: player.z + 0.18 },
      angle: 0,
      width: beamLanceConfig.beamWidth,
      length: beamLanceConfig.beamLength,
    }
  }

  const buildSnapshot = (): BattleSnapshot => {
    const primaryBoss = bosses.find((candidate) => candidate.role === 'final') ?? bosses[0] ?? null
    const phase = getBossPhase(primaryBoss)
    const visibleCombo =
      lastEnemyHitAt !== null && elapsed - lastEnemyHitAt <= scoreConfig.comboWindow ? combo : 0
    const renderEnemies: RenderEnemy[] = enemies.map((enemy) => ({
      id: enemy.id,
      waveId: enemy.waveId,
      kind: enemy.kind,
      archetype: enemy.archetype,
      variant: enemy.variant,
      atlasId: enemy.atlasId,
      frameId: enemy.frameId,
      position: { x: enemy.x, z: enemy.z },
      scale: enemy.scale,
      hitRadius: enemy.hitRadius,
      hitFlashRatio: clamp(enemy.hitFlashFor / enemyFeedbackConfig.hitFlashDuration, 0, 1),
    }))
    const renderBullets: RenderBullet[] = bullets.map((bullet) => ({
      id: bullet.id,
      source: bullet.source,
      kind: bullet.kind,
      position: { x: bullet.x, z: bullet.z },
      radius: bullet.radius,
      glow: bullet.glow,
    }))
    const renderItemDrops: RenderItemDrop[] = itemDrops.map((drop) => ({
      id: drop.id,
      itemId: drop.itemId,
      position: { x: drop.x, z: drop.z },
      collected: drop.collected,
    }))
    const renderBosses: RenderBoss[] = bosses.map((candidate) => {
      const bossPhase = getBossPhase(candidate)

      return {
        id: candidate.id,
        position: { x: candidate.x, z: candidate.z },
        hpRatio: clamp(candidate.hp / candidate.maxHp, 0, 1),
        phaseLabel: bossPhase?.label ?? 'Phase',
        supportLaser: bossPhase?.supportLaser ?? false,
      }
    })
    const renderBoss: RenderBoss | null = primaryBoss
      ? (renderBosses.find((candidate) => candidate.id === primaryBoss.id) ?? null)
      : null

    return {
      difficulty,
      stageName: stage.name,
      elapsed,
      duration: stageDuration,
      phaseLabel: phase?.label ?? (primaryBoss ? 'Boss Arrival' : 'Wave Assault'),
      player: {
        position: { x: player.x, z: player.z },
        hp: player.hp,
        maxHp: playerMaxHp,
        invulnerable: player.invulnerableFor > 0,
      },
      enemies: renderEnemies,
      boss: renderBoss,
      bosses: renderBosses,
      bullets: renderBullets,
      itemDrops: renderItemDrops,
      playerPowerups: {
        powerupLevel,
        attackMultiplier: getAttackMultiplier(powerupLevel),
      },
      specialSlots: [getSpecialSlot()],
      specialBeam: getSpecialBeam(),
      sparkles: sparkles.map((sparkle) => ({
        id: sparkle.id,
        position: { x: sparkle.x, z: sparkle.z },
        age: sparkle.age,
        life: sparkle.life,
        intensity: sparkle.intensity,
      })),
      destructionEffects: destructionEffects.map(
        (effect): RenderDestructionEffect => ({
          id: effect.id,
          position: { x: effect.x, z: effect.z },
          age: effect.age,
          life: effect.life,
          scale: effect.scale,
          seed: effect.seed,
        }),
      ),
      playerShots,
      hitsTaken,
      score,
      combo: visibleCombo,
      maxCombo,
      bossEnteredCount,
      cuePulse,
      result,
    }
  }

  const emit = () => {
    cachedSnapshot = buildSnapshot()
    for (const listener of listeners) {
      listener()
    }
  }

  const getSnapshot = () => {
    if (!cachedSnapshot) {
      cachedSnapshot = buildSnapshot()
    }

    return cachedSnapshot
  }

  const addBullet = (bullet: Omit<RuntimeBullet, 'id' | 'offViewportFor' | 'age'>) => {
    bullets.push({ id: `bullet-${lastBulletId++}`, offViewportFor: 0, age: 0, ...bullet })
  }

  const addBulletmlShot = (
    origin: ArenaPoint,
    shot: BulletmlShot,
    defaults: {
      radius?: number
      glow?: number
      life?: number
      damage?: number
    } = {},
  ) => {
    addBullet({
      source: 'enemy',
      x: origin.x,
      z: origin.z,
      vx: Math.cos(shot.direction) * shot.speed,
      vz: Math.sin(shot.direction) * shot.speed,
      direction: shot.direction,
      speed: shot.speed,
      radius: shot.radius ?? defaults.radius ?? 0.1,
      glow: shot.glow ?? defaults.glow ?? 1.28,
      life: shot.life ?? defaults.life ?? 8,
      damage: shot.damage ?? defaults.damage ?? 1,
      bulletml: createBulletmlActor({
        action: shot.action,
        direction: shot.direction,
        speed: shot.speed,
      }),
    })
  }

  const addPlayerBullet = ({
    x,
    z,
    kind,
    speed,
    power,
    radius,
    glow,
  }: {
    x: number
    z: number
    kind: RuntimeBullet['kind']
    speed: number
    power: number
    radius: number
    glow: number
  }) => {
    addBullet({
      source: 'player',
      kind,
      x,
      z,
      vx: 0,
      vz: speed,
      radius,
      glow,
      life: 2.2,
      damage: power * getAttackMultiplier(powerupLevel),
    })
  }

  const spawnItemDrop = (itemId: RuntimeItemDrop['itemId']) => {
    itemDrops.push({
      id: `item-drop-${lastItemDropId++}`,
      itemId,
      x: 0,
      z: itemDropConfig.spawnZ,
      speed: itemDropConfig.speed,
      radius: itemDropConfig.radius,
      collected: false,
    })
  }

  const firePattern = (originX: number, originZ: number, pattern: EnemyWave['pattern']) => {
    const centerAngle = -Math.PI / 2

    if (pattern.shape === 'ring') {
      for (let index = 0; index < pattern.count; index += 1) {
        const angle = (Math.PI * 2 * index) / pattern.count
        addBullet({
          source: 'enemy',
          x: originX,
          z: originZ,
          vx: Math.cos(angle) * pattern.speed,
          vz: Math.sin(angle) * pattern.speed,
          radius: 0.11,
          glow: 1.1,
          life: pattern.life,
          damage: 1,
        })
      }
      return
    }

    if (pattern.shape === 'needle') {
      const base =
        pattern.aim === 'player'
          ? Math.atan2(player.z - originZ, player.x - originX)
          : centerAngle

      for (let index = 0; index < pattern.count; index += 1) {
        const spreadFactor =
          pattern.count === 1 ? 0 : index / (pattern.count - 1) - 0.5
        const angle = base + spreadFactor * pattern.spread
        const velocity = normalizeVelocity(Math.cos(angle), Math.sin(angle), pattern.speed)
        addBullet({
          source: 'enemy',
          x: originX,
          z: originZ,
          vx: velocity.vx,
          vz: velocity.vz,
          radius: 0.085,
          glow: 1.28,
          life: pattern.life,
          damage: 1,
        })
      }
      return
    }

    if (pattern.shape === 'mine') {
      for (let index = 0; index < pattern.count; index += 1) {
        const spreadFactor =
          pattern.count === 1 ? 0 : index / (pattern.count - 1) - 0.5
        const angle = centerAngle + spreadFactor * pattern.spread
        addBullet({
          source: 'enemy',
          x: originX,
          z: originZ,
          vx: Math.cos(angle) * pattern.speed,
          vz: Math.sin(angle) * pattern.speed,
          radius: 0.16,
          glow: 1.36,
          life: pattern.life,
          damage: 1,
        })
      }
      return
    }

    for (let index = 0; index < pattern.count; index += 1) {
      const spreadFactor =
        pattern.count === 1 ? 0 : index / (pattern.count - 1) - 0.5
      const angle =
        centerAngle +
        spreadFactor * pattern.spread +
        (pattern.shape === 'spiral' ? elapsed * 0.9 : 0)
      const speedBoost = pattern.shape === 'laser-bloom' ? 1.2 : 1
      addBullet({
        source: 'enemy',
        x: originX,
        z: originZ,
        vx: Math.cos(angle) * pattern.speed * speedBoost,
        vz: Math.sin(angle) * pattern.speed * speedBoost,
        radius: pattern.shape === 'laser-bloom' ? 0.13 : 0.1,
        glow: pattern.shape === 'laser-bloom' ? 1.5 : 1,
        life: pattern.life,
        damage: 1,
        splitAfter: pattern.shape === 'split' ? pattern.split?.delay ?? 0.5 : undefined,
        splitCount: pattern.shape === 'split' ? pattern.split?.count ?? 2 : undefined,
        splitSpeed:
          pattern.shape === 'split'
            ? pattern.speed * (pattern.split?.speedMultiplier ?? 0.75)
            : undefined,
        waveAmplitude:
          pattern.shape === 'wave' ? pattern.wave?.amplitude ?? 0.45 : undefined,
        waveFrequency:
          pattern.shape === 'wave' ? pattern.wave?.frequency ?? 2.2 : undefined,
        wavePhase: pattern.shape === 'wave' ? index * 0.7 : undefined,
      })
    }
  }

  const spawnWave = (wave: EnemyWave, groupKind: 'wave' | 'summon' = 'wave') => {
    if (groupKind === 'wave') {
      regularWaveSpawnCount += 1
      if (regularWaveSpawnCount % itemDropConfig.waveInterval === 0) {
        spawnItemDrop('powerup')
      }
    }

    const movement = wave.movement
    const resolution = wave.resolution
    const groupCount = spawnGroupCounts.get(wave.id) ?? 0
    const groupId = groupCount === 0 ? wave.id : `${wave.id}#${groupCount}`
    const group: SpawnGroupState = {
      id: groupId,
      authoredWaveId: wave.id,
      kind: groupKind,
      resolution,
      spawned: wave.count,
      defeated: 0,
      escaped: 0,
      forcedResolved: false,
      spawnedAt: elapsed,
      defeatedAt: wave.count === 0 ? elapsed : undefined,
      resolvedAt: wave.count === 0 ? elapsed : null,
    }
    spawnGroupCounts.set(wave.id, groupCount + 1)
    spawnGroups.set(groupId, group)

    const halfSpread = ((wave.count - 1) * wave.spacing) / 2
    for (let index = 0; index < wave.count; index += 1) {
      const spawnZ = enemySpawnEntry.startZ + index * enemySpawnEntry.rowOffset
      const entrySpeed = movement.type === 'flyThrough' ? movement.speed : movement.entrySpeed
      enemies.push({
        id: `enemy-${lastEnemyId++}`,
        waveId: wave.id,
        groupId,
        kind: wave.kind,
        archetype: wave.archetype,
        variant: wave.variant,
        atlasId: wave.atlasId,
        frameId: wave.frameId,
        x: -halfSpread + index * wave.spacing,
        z: spawnZ,
        hp: wave.hp,
        pattern: wave.pattern,
        shootTimer: getEnemyEntryShootDelay(spawnZ, entrySpeed) + index * 0.18,
        drift: index * 0.7,
        travel: entrySpeed,
        movement,
        strafeOriginX: -halfSpread + index * wave.spacing,
        scale: wave.scale,
        hitRadius: wave.hitRadius,
        hitFlashFor: 0,
      })
    }
  }

  const spawnBoss = (definition: BossDefinition, role: 'midboss' | 'final') => {
    const bossHp = invincible ? Math.round(definition.hp * 0.28) : definition.hp
    const boss: RuntimeBoss = {
      id: definition.id,
      role,
      definition,
      x: 0,
      z: 2.15,
      hp: bossHp,
      maxHp: bossHp,
      shootTimer: 0.45,
      supportLaserTimer: 1.1,
      currentPhaseId: null,
      enteredPhaseIds: new Set<string>(),
      bulletmlActor: null,
    }
    const phase = getBossPhase(boss)
    if (phase) {
      boss.currentPhaseId = phase.id
      boss.enteredPhaseIds.add(phase.id)
    }
    bosses.push(boss)
    bossEnteredCount += 1
    cuePulse += 1
  }

  const finish = (outcome: RunResult['outcome']) => {
    if (result) {
      return
    }

    result = {
      outcome,
      stageId: stage.id,
      stageName: stage.name,
      stageNumber: stage.stageNumber,
      difficulty,
      duration: elapsed,
      remainingHp: player.hp,
      hitsTaken,
      score,
      maxCombo,
    }
    cuePulse += 1
    emit()
  }

  const registerPlayerHit = () => {
    if (result || player.invulnerableFor > 0 || invincible) {
      return
    }

    player.hp = Math.max(0, player.hp - 1)
    player.invulnerableFor = 0.85
    hitsTaken += 1
    cuePulse += 1

    if (player.hp === 0) {
      finish('defeat')
      return
    }

    emit()
  }

  const addSpecialCharge = (amount: number) => {
    if (specialActiveFor > 0 || result) {
      return
    }

    specialCharge = clamp(specialCharge + amount, 0, beamLanceConfig.maxCharge)
  }

  const spawnSparkle = (x: number, z: number, intensity = 1) => {
    sparkles.push({
      id: `sparkle-${lastSparkleId++}`,
      x,
      z,
      age: 0,
      life: beamLanceConfig.sparkleLife,
      intensity,
    })
  }

  const spawnDestructionEffect = (enemy: RuntimeEnemy) => {
    destructionEffects.push({
      id: `destruction-${lastDestructionEffectId++}`,
      x: enemy.x,
      z: enemy.z,
      age: 0,
      life: enemyFeedbackConfig.destructionLife,
      scale: enemy.scale,
      seed: lastDestructionEffectId % 17,
    })
  }

  const recordTargetHit = () => {
    if (lastEnemyHitAt !== null && elapsed - lastEnemyHitAt <= scoreConfig.comboWindow) {
      combo += 1
    } else {
      combo = 1
    }

    lastEnemyHitAt = elapsed
    maxCombo = Math.max(maxCombo, combo)
    score += scoreConfig.enemyHit * combo
  }

  const damageEnemy = (
    enemy: RuntimeEnemy,
    damage: number,
    options: { scoreHit?: boolean } = {},
  ) => {
    enemy.hp -= damage
    enemy.hitFlashFor = enemyFeedbackConfig.hitFlashDuration
    if (options.scoreHit) {
      recordTargetHit()
    }
  }

  const damageOrbitingSidePanels = (delta: number) => {
    const attackMultiplier = getAttackMultiplier(powerupLevel)

    for (const panel of pilot.sidePanels ?? []) {
      if (!panel.orbit) {
        continue
      }

      const panelPosition = getSidePanelPosition({
        battleElapsed: elapsed,
        panel,
        player: { x: player.x, z: player.z },
      })
      const damage = panel.orbit.damagePerSecond * delta * attackMultiplier

      for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
        const enemy = enemies[enemyIndex]
        const hitDistance = panel.orbit.hitRadius + enemy.hitRadius

        if (distanceSquared(panelPosition, { x: enemy.x, z: enemy.z }) >= hitDistance * hitDistance) {
          continue
        }

        damageEnemy(enemy, damage)
        if (enemy.hp <= 0) {
          recordEnemyDefeated(enemy)
          addSpecialCharge(beamLanceConfig.enemyDefeatCharge)
          spawnDestructionEffect(enemy)
          enemies.splice(enemyIndex, 1)
        }
      }

      for (const boss of bosses) {
        const hitDistance = panel.orbit.hitRadius + 0.44
        if (distanceSquared(panelPosition, { x: boss.x, z: boss.z }) < hitDistance * hitDistance) {
          boss.hp -= damage
        }
      }
    }
  }

  const explodeEnergyOrb = (orb: RuntimeBullet) => {
    if (special.kind !== 'energyOrb') {
      return
    }

    const center = { x: orb.x, z: orb.z }
    const enemyDamageRadiusSquared = special.explosionRadius * special.explosionRadius
    const bulletClearRadiusSquared = special.bulletClearRadius * special.bulletClearRadius

    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const candidate = bullets[bulletIndex]
      if (
        candidate.source === 'enemy' &&
        distanceSquared({ x: candidate.x, z: candidate.z }, center) <= bulletClearRadiusSquared
      ) {
        bullets.splice(bulletIndex, 1)
      }
    }

    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = enemies[enemyIndex]
      if (distanceSquared({ x: enemy.x, z: enemy.z }, center) > enemyDamageRadiusSquared) {
        continue
      }

      damageEnemy(enemy, special.damage, { scoreHit: true })
      spawnSparkle(enemy.x, enemy.z, 1.45)
      if (enemy.hp <= 0) {
        recordEnemyDefeated(enemy)
        addSpecialCharge(beamLanceConfig.enemyDefeatCharge)
        spawnDestructionEffect(enemy)
        enemies.splice(enemyIndex, 1)
      }
    }

    for (const boss of bosses) {
      if (distanceSquared({ x: boss.x, z: boss.z }, center) <= enemyDamageRadiusSquared) {
        boss.hp -= special.damage
        recordTargetHit()
        spawnSparkle(boss.x, boss.z, 1.7)
      }
    }

    for (const offset of [-0.42, 0, 0.42]) {
      spawnSparkle(center.x + offset, center.z, 1.5)
    }

    cuePulse += 1
  }

  const isInsideBeam = (target: ArenaPoint, radius: number) => {
    const beam = getSpecialBeam()
    if (!beam) {
      return false
    }

    const dz = target.z - beam.origin.z
    return (
      Math.abs(target.x - beam.origin.x) <= beam.width / 2 + radius &&
      dz >= 0 &&
      dz <= beam.length
    )
  }

  const resolveSpawnGroup = (group: SpawnGroupState) => {
    if (group.resolvedAt !== null) {
      return
    }

    group.resolvedAt = elapsed
  }

  const markSpawnGroupDefeated = (group: SpawnGroupState) => {
    if (group.defeatedAt === undefined && group.defeated >= group.spawned) {
      group.defeatedAt = elapsed
    }
  }

  const recordEnemyDefeated = (enemy: RuntimeEnemy) => {
    const group = spawnGroups.get(enemy.groupId)
    if (group) {
      group.defeated += 1
      markSpawnGroupDefeated(group)
    }
  }

  const recordEnemyEscaped = (enemy: RuntimeEnemy) => {
    const group = spawnGroups.get(enemy.groupId)
    if (group) {
      group.escaped += 1
    }
  }

  const updateSpawnGroupResolutions = () => {
    for (const group of spawnGroups.values()) {
      markSpawnGroupDefeated(group)

      if (group.resolvedAt !== null) {
        continue
      }

      if (group.resolution.type === 'allInactive') {
        if (group.spawned > 0 && group.defeated + group.escaped >= group.spawned) {
          resolveSpawnGroup(group)
        }
        continue
      }

      if (group.resolution.type === 'allDefeated') {
        if (group.spawned > 0 && group.defeated >= group.spawned) {
          resolveSpawnGroup(group)
        }
        continue
      }

      if (elapsed - group.spawnedAt < group.resolution.seconds) {
        continue
      }

      if (group.resolution.then === 'resolve') {
        resolveSpawnGroup(group)
        continue
      }

      if (group.resolution.then === 'forceEscape') {
        let escaped = 0
        for (let index = enemies.length - 1; index >= 0; index -= 1) {
          if (enemies[index]?.groupId !== group.id) {
            continue
          }

          enemies.splice(index, 1)
          escaped += 1
        }
        group.escaped += escaped
        group.forcedResolved = true
        resolveSpawnGroup(group)
      }
    }
  }

  const updateSpecial = (delta: number) => {
    for (let index = sparkles.length - 1; index >= 0; index -= 1) {
      const sparkle = sparkles[index]
      sparkle.age += delta
      if (sparkle.age >= sparkle.life) {
        sparkles.splice(index, 1)
      }
    }

    if (special.kind !== 'beam') {
      if (!bullets.some((bullet) => bullet.kind === 'special-orb')) {
        addSpecialCharge(specialChargeRate * delta)
      }
      return
    }

    if (specialActiveFor <= 0) {
      addSpecialCharge(specialChargeRate * delta)
      return
    }

    specialActiveFor = Math.max(0, specialActiveFor - delta)
    specialSparkleTimer -= delta
    const canSpawnSparkle = specialSparkleTimer <= 0
    let spawnedSparkle = false
    const damage = beamLanceConfig.damagePerSecond * delta

    for (const enemy of enemies) {
      if (!isInsideBeam({ x: enemy.x, z: enemy.z }, enemy.hitRadius)) {
        continue
      }

      damageEnemy(enemy, damage)
      if (canSpawnSparkle) {
        spawnSparkle(enemy.x, enemy.z, 1)
        spawnedSparkle = true
      }
    }

    for (const boss of bosses) {
      if (isInsideBeam({ x: boss.x, z: boss.z }, 0.44)) {
        boss.hp -= damage
        if (canSpawnSparkle) {
          spawnSparkle(boss.x, boss.z, 1.25)
          spawnedSparkle = true
        }
      }
    }

    if (spawnedSparkle) {
      specialSparkleTimer = beamLanceConfig.sparkleInterval
    }
  }

  const collectItemDrop = (drop: RuntimeItemDrop) => {
    if (drop.itemId === 'powerup') {
      powerupLevel = Math.min(battleItems.powerup.maxLevel, powerupLevel + 1)
      cuePulse += 1
    }

    drop.collected = true
  }

  const updateItemDrops = (delta: number) => {
    for (let index = itemDrops.length - 1; index >= 0; index -= 1) {
      const drop = itemDrops[index]
      drop.z -= drop.speed * delta

      const hitDistance = drop.radius + itemDropConfig.pickupRadius
      if (
        distanceSquared({ x: drop.x, z: drop.z }, { x: player.x, z: player.z }) <
        hitDistance * hitDistance
      ) {
        collectItemDrop(drop)
        itemDrops.splice(index, 1)
        continue
      }

      if (drop.z < itemDropConfig.cleanupZ) {
        itemDrops.splice(index, 1)
      }
    }
  }

  const updateEnemies = (delta: number) => {
    for (let index = enemies.length - 1; index >= 0; index -= 1) {
      const enemy = enemies[index]
      enemy.hitFlashFor = Math.max(0, enemy.hitFlashFor - delta)

      if (enemy.movement.type === 'enterAndStrafe') {
        if (enemy.z > enemy.movement.holdZ) {
          enemy.z = Math.max(enemy.movement.holdZ, enemy.z - enemy.movement.entrySpeed * delta)
        }
        enemy.x =
          enemy.strafeOriginX +
          Math.sin(elapsed * enemy.movement.strafeSpeed + enemy.drift) *
            enemy.movement.strafeRange
      } else {
        enemy.z -= enemy.movement.speed * delta
        const waveShift = elapsed * 1.8 + enemy.drift
        if (enemy.movement.path === 'swoop-left') {
          enemy.x += Math.sin(waveShift) * 0.012
        } else if (enemy.movement.path === 'swoop-right') {
          enemy.x -= Math.sin(waveShift) * 0.012
        } else {
          enemy.x += Math.sin(waveShift * 1.2) * 0.02
        }
      }

      enemy.shootTimer -= delta
      if (enemy.shootTimer <= 0) {
        firePattern(enemy.x, enemy.z, enemy.pattern)
        enemy.shootTimer = enemy.pattern.interval
      }

      if (enemy.hp <= 0) {
        recordEnemyDefeated(enemy)
        addSpecialCharge(beamLanceConfig.enemyDefeatCharge)
        spawnDestructionEffect(enemy)
        enemies.splice(index, 1)
        continue
      }

      if (enemy.movement.type === 'flyThrough' && enemy.z < -3.3) {
        recordEnemyEscaped(enemy)
        enemies.splice(index, 1)
      }
    }
  }

  const updateBosses = (delta: number) => {
    for (let index = bosses.length - 1; index >= 0; index -= 1) {
      const boss = bosses[index]
      boss.x = Math.sin(elapsed * 0.7) * 1.8
      boss.z = 1.9 + Math.sin(elapsed * 0.9) * 0.18
      const phase = getBossPhase(boss)
      if (!phase) {
        continue
      }

      const enteredNewPhase = boss.currentPhaseId !== phase.id
      boss.currentPhaseId = phase.id
      boss.enteredPhaseIds.add(phase.id)

      if (isBulletmlPattern(phase.pattern)) {
        if (enteredNewPhase || !boss.bulletmlActor) {
          boss.bulletmlActor = createBulletmlPatternActor(phase.pattern)
        }

        const result = stepBulletmlActor(boss.bulletmlActor, {
          delta,
          origin: { x: boss.x, z: boss.z },
          target: { x: player.x, z: player.z },
          rank: getBulletmlRank(phase.pattern),
        })
        for (const shot of result.shots) {
          addBulletmlShot({ x: boss.x, z: boss.z }, shot, phase.pattern.bullet)
        }
        if (phase.pattern.loop && isBulletmlActorIdle(boss.bulletmlActor)) {
          boss.bulletmlActor = createBulletmlPatternActor(phase.pattern)
        }
      } else {
        boss.bulletmlActor = null
        boss.shootTimer -= delta
        if (boss.shootTimer <= 0) {
          firePattern(boss.x, boss.z, phase.pattern)
          boss.shootTimer = phase.pattern.interval
        }
      }

      if (phase.supportLaser) {
        boss.supportLaserTimer -= delta
        if (boss.supportLaserTimer <= 0) {
          const supportSpeed = getSupportLaserSpeed(phase.pattern)
          addBullet({
            source: 'enemy',
            x: boss.x,
            z: boss.z - 0.2,
            vx: 0,
            vz: -supportSpeed * 1.5,
            radius: 0.18,
            glow: 1.7,
            life: 3.6,
            damage: 1,
          })
          boss.supportLaserTimer = 0.9
        }
      }

      if (boss.hp <= 0) {
        defeatedBosses.set(boss.id, elapsed)
        bosses.splice(index, 1)
        cuePulse += 1
      }
    }
  }

  const updateBullets = (delta: number) => {
    for (let index = bullets.length - 1; index >= 0; index -= 1) {
      const bullet = bullets[index]
      if (!bullet) {
        continue
      }
      bullet.age += delta
      if (bullet.bulletml) {
        const result = stepBulletmlActor(bullet.bulletml, {
          delta,
          origin: { x: bullet.x, z: bullet.z },
          target: { x: player.x, z: player.z },
          rank: defaultBulletmlRankForStage(difficulty),
        })
        bullet.direction = result.direction
        bullet.speed = result.speed
        bullet.vx = Math.cos(result.direction) * result.speed
        bullet.vz = Math.sin(result.direction) * result.speed
        for (const shot of result.shots) {
          addBulletmlShot({ x: bullet.x, z: bullet.z }, shot, {
            radius: bullet.radius,
            glow: bullet.glow,
            life: Math.max(1.2, bullet.life),
            damage: bullet.damage,
          })
        }
        if (result.vanished) {
          bullets.splice(index, 1)
          continue
        }
      }

      if (
        bullet.source === 'enemy' &&
        bullet.splitAfter !== undefined &&
        bullet.splitCount !== undefined &&
        bullet.splitSpeed !== undefined &&
        !bullet.hasSplit &&
        bullet.age >= bullet.splitAfter
      ) {
        bullet.hasSplit = true
        for (let splitIndex = 0; splitIndex < bullet.splitCount; splitIndex += 1) {
          const angle =
            -Math.PI / 2 + (splitIndex - (bullet.splitCount - 1) / 2) * 0.48
          addBullet({
            source: 'enemy',
            x: bullet.x,
            z: bullet.z,
            vx: Math.cos(angle) * bullet.splitSpeed,
            vz: Math.sin(angle) * bullet.splitSpeed,
            radius: Math.max(0.075, bullet.radius * 0.78),
            glow: Math.max(1.1, bullet.glow * 0.92),
            life: Math.max(1.8, bullet.life * 0.55),
            damage: bullet.damage,
          })
        }
      }

      const waveOffset =
        bullet.waveAmplitude !== undefined && bullet.waveFrequency !== undefined
          ? Math.sin(bullet.age * bullet.waveFrequency + (bullet.wavePhase ?? 0)) *
            bullet.waveAmplitude *
            delta
          : 0

      bullet.x += bullet.vx * delta + waveOffset
      bullet.z += bullet.vz * delta
      bullet.life -= delta

      if (bullet.kind === 'special-orb') {
        const intersectsBoss = bosses.some((boss) => {
          const hitDistance = bullet.radius + 0.44
          return distanceSquared({ x: bullet.x, z: bullet.z }, { x: boss.x, z: boss.z }) <
            hitDistance * hitDistance
        })
        const intersectsEnemy = enemies.some((enemy) => {
          const hitDistance = bullet.radius + enemy.hitRadius
          return distanceSquared({ x: bullet.x, z: bullet.z }, { x: enemy.x, z: enemy.z }) <
            hitDistance * hitDistance
        })

        if (bullet.z >= 1.85 || bullet.life <= 0 || intersectsBoss || intersectsEnemy) {
          explodeEnergyOrb(bullet)
          const orbIndex = bullets.findIndex((candidate) => candidate.id === bullet.id)
          if (orbIndex >= 0) {
            bullets.splice(orbIndex, 1)
          }
          continue
        }
      }

      if (bullet.source === 'enemy') {
        const hitDistance = bullet.radius + 0.13
        if (
          distanceSquared(
            { x: bullet.x, z: bullet.z },
            { x: player.x, z: player.z },
          ) < hitDistance * hitDistance
        ) {
          registerPlayerHit()
          bullets.splice(index, 1)
          continue
        }
      } else {
        let consumed = false
        for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
          const enemy = enemies[enemyIndex]
          const hitDistance = bullet.radius + enemy.hitRadius
          if (
            distanceSquared(
              { x: bullet.x, z: bullet.z },
              { x: enemy.x, z: enemy.z },
            ) < hitDistance * hitDistance
          ) {
            damageEnemy(enemy, bullet.damage, { scoreHit: true })
            bullets.splice(index, 1)
            consumed = true
            break
          }
        }

        if (consumed) {
          continue
        }

        let hitBoss = false
        for (const boss of bosses) {
          const hitDistance = bullet.radius + 0.44
          if (
            distanceSquared(
              { x: bullet.x, z: bullet.z },
              { x: boss.x, z: boss.z },
            ) < hitDistance * hitDistance
          ) {
            boss.hp -= bullet.damage
            hitBoss = true
          }
        }

        if (hitBoss) {
          recordTargetHit()
          bullets.splice(index, 1)
          continue
        }
      }

      if (isBulletOutsideViewport(bullet)) {
        bullet.offViewportFor += delta
      } else {
        bullet.offViewportFor = 0
      }

      if (bullet.life <= 0 || bullet.offViewportFor >= bulletViewportBounds.cleanupGrace) {
        bullets.splice(index, 1)
      }
    }
  }

  const getEventState = (event: StageEvent) => {
    let state = eventStates.get(event.id)
    if (!state) {
      state = { fired: false, lastFiredAt: null }
      eventStates.set(event.id, state)
    }

    return state
  }

  const getSpawnGroupForTarget = (target: string) => {
    const exactGroup = spawnGroups.get(target)
    if (exactGroup) {
      return exactGroup
    }

    for (const group of spawnGroups.values()) {
      if (group.authoredWaveId === target) {
        return group
      }
    }

    return undefined
  }

  const isConditionMet = (condition: Extract<StageEvent['trigger'], { type: 'interval' }>['while']) => {
    if (condition.type === 'bossActive') {
      return bosses.some((boss) => boss.id === condition.bossId)
    }

    return bosses.some(
      (boss) =>
        boss.id === condition.bossId && boss.enteredPhaseIds.has(condition.phaseId),
    )
  }

  const isTriggerReady = (event: StageEvent, state: EventState) => {
    const trigger = event.trigger

    if (trigger.type !== 'interval' && state.fired && event.once !== false) {
      return false
    }

    if (trigger.type === 'time') {
      return elapsed >= trigger.at
    }

    if (trigger.type === 'timeAfterDefeated') {
      if (elapsed < trigger.at) {
        return false
      }

      const delay = trigger.delay ?? 0
      const defeatedAt = defeatedBosses.get(trigger.target)
      if (defeatedAt !== undefined) {
        return elapsed >= defeatedAt + delay
      }

      const group = getSpawnGroupForTarget(trigger.target)
      return group?.defeatedAt !== undefined && elapsed >= group.defeatedAt + delay
    }

    if (trigger.type === 'afterResolved') {
      const group = getSpawnGroupForTarget(trigger.target)
      return group?.resolvedAt != null && elapsed >= group.resolvedAt + trigger.delay
    }

    if (trigger.type === 'afterDefeated') {
      const group = getSpawnGroupForTarget(trigger.target)
      if (group?.defeatedAt !== undefined) {
        return elapsed >= group.defeatedAt + trigger.delay
      }

      const defeatedAt = defeatedBosses.get(trigger.target)
      return defeatedAt !== undefined && elapsed >= defeatedAt + trigger.delay
    }

    if (trigger.type === 'bossHp') {
      return bosses.some(
        (boss) =>
          boss.id === trigger.bossId && boss.hp / boss.maxHp <= trigger.atOrBelow,
      )
    }

    if (trigger.type === 'bossPhase') {
      return bosses.some(
        (boss) =>
          boss.id === trigger.bossId && boss.enteredPhaseIds.has(trigger.phaseId),
      )
    }

    if (!isConditionMet(trigger.while)) {
      return false
    }

    return state.lastFiredAt === null || elapsed >= state.lastFiredAt + trigger.every
  }

  const fireEvent = (event: StageEvent, state: EventState) => {
    state.fired = true
    state.lastFiredAt = elapsed

    for (const action of event.actions) {
      if (result) {
        return
      }

      if (action.type === 'spawnWave') {
        spawnWave(action.wave, action.groupKind ?? 'wave')
        continue
      }

      if (action.type === 'spawnBoss') {
        spawnBoss(action.boss, action.role)
        continue
      }

      finish(action.outcome)
      return
    }
  }

  const evaluateEvents = () => {
    if (result) {
      return
    }

    for (const event of stageEvents) {
      const state = getEventState(event)
      if (isTriggerReady(event, state)) {
        fireEvent(event, state)
        if (result) {
          return
        }
      }
    }
  }

  const update = (delta: number) => {
    if (result) {
      return
    }

    elapsed = Number((elapsed + delta).toFixed(4))
    for (let index = destructionEffects.length - 1; index >= 0; index -= 1) {
      const effect = destructionEffects[index]
      effect.age += delta
      if (effect.age >= effect.life) {
        destructionEffects.splice(index, 1)
      }
    }

    if (player.invulnerableFor > 0) {
      player.invulnerableFor = Math.max(0, player.invulnerableFor - delta)
    }

    evaluateEvents()
    if (result) {
      return
    }

    updateItemDrops(delta)

    player.shotTimer -= delta
    if (player.shotTimer <= 0) {
      addPlayerBullet({
        kind: pilot.shot.projectileKind ?? 'primary',
        x: player.x,
        z: player.z + 0.22,
        speed: pilot.shot.speed,
        radius: 0.08,
        glow: 1.2,
        power: pilot.shot.power,
      })
      for (const panelShot of pilot.shot.sidePanelShots ?? []) {
        addPlayerBullet({
          kind: 'panel',
          x: player.x + panelShot.offsetX,
          z: player.z + 0.16,
          speed: panelShot.speed ?? pilot.shot.speed,
          radius: panelShot.radius ?? 0.07,
          glow: panelShot.glow ?? 1.35,
          power: panelShot.power ?? pilot.shot.power,
        })
      }
      player.shotTimer = pilot.shot.interval
      playerShots += 1
    }

    updateSpecial(delta)
    updateEnemies(delta)
    damageOrbitingSidePanels(delta)
    updateSpawnGroupResolutions()
    updateBosses(delta)
    updateBullets(delta)
    updateSpawnGroupResolutions()
    updateBosses(0)
    evaluateEvents()

    emit()
  }

  return {
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    update,
    beginDrag(point: ArenaPoint) {
      dragActive = true
      this.moveDrag(point)
    },
    moveDrag(point: ArenaPoint) {
      if (!dragActive) {
        return
      }

      player.x = clamp(point.x, -pilot.moveRadius.x, pilot.moveRadius.x)
      player.z = clamp(point.z, pilot.moveRadius.minZ, pilot.moveRadius.maxZ)
      emit()
    },
    endDrag() {
      dragActive = false
    },
    activateSpecial(id: SpecialSlotId) {
      if (
        id !== special.id ||
        result ||
        specialActiveFor > 0 ||
        bullets.some((bullet) => bullet.kind === 'special-orb') ||
        specialCharge < beamLanceConfig.maxCharge
      ) {
        return false
      }

      specialCharge = 0
      if (special.kind === 'beam') {
        specialActiveFor = beamLanceConfig.activeDuration
      } else {
        addBullet({
          source: 'player',
          kind: 'special-orb',
          x: player.x,
          z: player.z + 0.34,
          vx: 0,
          vz: special.projectileSpeed,
          radius: 0.32,
          glow: 1.78,
          life: 1.35,
          damage: special.damage,
        })
      }
      specialSparkleTimer = 0
      cuePulse += 1
      emit()
      return true
    },
    registerPlayerHit,
    getSnapshot,
  }
}
