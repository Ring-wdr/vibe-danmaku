import { stagePilot } from '../content/stage1'
import type {
  ArenaPoint,
  BattleSnapshot,
  Difficulty,
  EnemyWave,
  RenderBoss,
  RenderBullet,
  RenderEnemy,
  RunResult,
  StageDefinition,
} from '../types'

type RuntimeBullet = {
  id: string
  source: 'player' | 'enemy'
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
}

type RuntimeEnemy = {
  id: string
  waveId: string
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
  path: EnemyWave['path']
  scale: number
  hitRadius: number
}

type RuntimeBoss = {
  id: string
  x: number
  z: number
  hp: number
  maxHp: number
  shootTimer: number
  supportLaserTimer: number
}

type RuntimeOptions = {
  difficulty: Difficulty
  stage: StageDefinition
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
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

export function createBattleRuntime({ difficulty, stage, invincible = false }: RuntimeOptions) {
  const listeners = new Set<Listener>()
  const player = {
    x: 0,
    z: -1.85,
    hp: 3,
    invulnerableFor: 0,
    shotTimer: 0,
  }
  const pilot = stagePilot
  const bullets: RuntimeBullet[] = []
  const enemies: RuntimeEnemy[] = []
  let boss: RuntimeBoss | null = null
  const waveQueue = [...stage.waves]
  let dragActive = false
  let elapsed = 0
  let playerShots = 0
  let hitsTaken = 0
  let bossEnteredCount = 0
  let cuePulse = 0
  let result: RunResult | null = null
  let lastBulletId = 0
  let lastEnemyId = 0
  let cachedSnapshot: BattleSnapshot | null = null

  const getBossPhase = () => {
    if (!boss) {
      return null
    }

    const ratio = boss.hp / boss.maxHp
    return (
      stage.boss.phases.find((phase) => ratio >= phase.threshold) ??
      stage.boss.phases[stage.boss.phases.length - 1] ??
      null
    )
  }

  const buildSnapshot = (): BattleSnapshot => {
    const phase = getBossPhase()
    const renderEnemies: RenderEnemy[] = enemies.map((enemy) => ({
      id: enemy.id,
      kind: enemy.kind,
      archetype: enemy.archetype,
      variant: enemy.variant,
      atlasId: enemy.atlasId,
      frameId: enemy.frameId,
      position: { x: enemy.x, z: enemy.z },
      scale: enemy.scale,
    }))
    const renderBullets: RenderBullet[] = bullets.map((bullet) => ({
      id: bullet.id,
      source: bullet.source,
      position: { x: bullet.x, z: bullet.z },
      radius: bullet.radius,
      glow: bullet.glow,
    }))
    const renderBoss: RenderBoss | null = boss
      ? {
          id: boss.id,
          position: { x: boss.x, z: boss.z },
          hpRatio: clamp(boss.hp / boss.maxHp, 0, 1),
          phaseLabel: phase?.label ?? 'Phase',
          supportLaser: phase?.supportLaser ?? false,
        }
      : null

    return {
      difficulty,
      stageName: stage.name,
      elapsed,
      duration: stage.duration,
      phaseLabel: phase?.label ?? (boss ? 'Boss Arrival' : 'Wave Assault'),
      player: {
        position: { x: player.x, z: player.z },
        hp: player.hp,
        invulnerable: player.invulnerableFor > 0,
      },
      enemies: renderEnemies,
      boss: renderBoss,
      bullets: renderBullets,
      playerShots,
      hitsTaken,
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

  const spawnWave = (wave: EnemyWave) => {
    const halfSpread = ((wave.count - 1) * wave.spacing) / 2
    for (let index = 0; index < wave.count; index += 1) {
      const spawnZ = enemySpawnEntry.startZ + index * enemySpawnEntry.rowOffset
      enemies.push({
        id: `enemy-${lastEnemyId++}`,
        waveId: wave.id,
        kind: wave.kind,
        archetype: wave.archetype,
        variant: wave.variant,
        atlasId: wave.atlasId,
        frameId: wave.frameId,
        x: -halfSpread + index * wave.spacing,
        z: spawnZ,
        hp: wave.hp,
        pattern: wave.pattern,
        shootTimer: getEnemyEntryShootDelay(spawnZ, wave.speed) + index * 0.18,
        drift: index * 0.7,
        travel: wave.speed,
        path: wave.path,
        scale: wave.scale,
        hitRadius: wave.hitRadius,
      })
    }
  }

  const spawnBoss = () => {
    const bossHp = invincible ? Math.round(stage.boss.hp * 0.28) : stage.boss.hp
    boss = {
      id: stage.boss.id,
      x: 0,
      z: 2.15,
      hp: bossHp,
      maxHp: bossHp,
      shootTimer: 0.45,
      supportLaserTimer: 1.1,
    }
    bossEnteredCount += 1
    cuePulse += 1
  }

  const finish = (outcome: RunResult['outcome']) => {
    if (result) {
      return
    }

    result = {
      outcome,
      difficulty,
      duration: elapsed,
      remainingHp: player.hp,
      hitsTaken,
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

  const updateEnemies = (delta: number) => {
    for (let index = enemies.length - 1; index >= 0; index -= 1) {
      const enemy = enemies[index]
      enemy.z -= enemy.travel * delta
      const waveShift = elapsed * 1.8 + enemy.drift
      if (enemy.path === 'swoop-left') {
        enemy.x += Math.sin(waveShift) * 0.012
      } else if (enemy.path === 'swoop-right') {
        enemy.x -= Math.sin(waveShift) * 0.012
      } else {
        enemy.x += Math.sin(waveShift * 1.2) * 0.02
      }

      enemy.shootTimer -= delta
      if (enemy.shootTimer <= 0) {
        firePattern(enemy.x, enemy.z, enemy.pattern)
        enemy.shootTimer = enemy.pattern.interval
      }

      if (enemy.z < -3.3 || enemy.hp <= 0) {
        enemies.splice(index, 1)
      }
    }
  }

  const updateBoss = (delta: number) => {
    if (!boss) {
      return
    }

    boss.x = Math.sin(elapsed * 0.7) * 1.8
    boss.z = 1.9 + Math.sin(elapsed * 0.9) * 0.18
    const phase = getBossPhase()
    if (!phase) {
      return
    }

    boss.shootTimer -= delta
    if (boss.shootTimer <= 0) {
      firePattern(boss.x, boss.z, phase.pattern)
      boss.shootTimer = phase.pattern.interval
    }

    if (phase.supportLaser) {
      boss.supportLaserTimer -= delta
      if (boss.supportLaserTimer <= 0) {
        addBullet({
          source: 'enemy',
          x: boss.x,
          z: boss.z - 0.2,
          vx: 0,
          vz: -phase.pattern.speed * 1.5,
          radius: 0.18,
          glow: 1.7,
          life: 3.6,
          damage: 1,
        })
        boss.supportLaserTimer = 0.9
      }
    }

    if (boss.hp <= 0) {
      boss = null
      finish('victory')
    }
  }

  const updateBullets = (delta: number) => {
    for (let index = bullets.length - 1; index >= 0; index -= 1) {
      const bullet = bullets[index]
      bullet.age += delta

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
            enemy.hp -= bullet.damage
            bullets.splice(index, 1)
            consumed = true
            break
          }
        }

        if (consumed) {
          continue
        }

        if (boss) {
          const hitDistance = bullet.radius + 0.44
          if (
            distanceSquared(
              { x: bullet.x, z: bullet.z },
              { x: boss.x, z: boss.z },
            ) < hitDistance * hitDistance
          ) {
            boss.hp -= bullet.damage
            bullets.splice(index, 1)
            continue
          }
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

  const update = (delta: number) => {
    if (result) {
      return
    }

    elapsed = Number((elapsed + delta).toFixed(4))
    if (player.invulnerableFor > 0) {
      player.invulnerableFor = Math.max(0, player.invulnerableFor - delta)
    }

    while (waveQueue[0] && elapsed >= waveQueue[0].startAt) {
      const nextWave = waveQueue.shift()
      if (nextWave) {
        spawnWave(nextWave)
      }
    }

    if (!boss && elapsed >= stage.boss.startAt) {
      spawnBoss()
    }

    player.shotTimer -= delta
    if (player.shotTimer <= 0) {
      addBullet({
        source: 'player',
        x: player.x,
        z: player.z + 0.22,
        vx: 0,
        vz: pilot.shot.speed,
        radius: 0.08,
        glow: 1.2,
        life: 2.2,
        damage: pilot.shot.power,
      })
      player.shotTimer = pilot.shot.interval
      playerShots += 1
    }

    updateEnemies(delta)
    updateBoss(delta)
    updateBullets(delta)

    if (!result && elapsed >= stage.duration && !boss) {
      finish('victory')
    }

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
    registerPlayerHit,
    getSnapshot,
  }
}
