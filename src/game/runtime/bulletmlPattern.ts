import type {
  ArenaPoint,
  BossBulletPatternConfig,
  BulletmlAction,
  BulletmlCommand,
  BulletmlDirection,
  BulletmlExpression,
  BulletmlPatternConfig,
  BulletmlSpeed,
} from '../types'

type Tween = {
  from: number
  to: number
  elapsed: number
  duration: number
}

export type BulletmlActor = {
  program: BulletmlCommand[]
  direction: number
  speed: number
  previousDirection: number
  previousSpeed: number
  waitRemaining: number
  vanished: boolean
  speedTween: Tween | null
  directionTween: Tween | null
}

export type BulletmlShot = {
  direction: number
  speed: number
  action: BulletmlAction
  radius?: number
  glow?: number
  life?: number
  damage?: number
}

export type BulletmlStepContext = {
  delta: number
  origin: ArenaPoint
  target: ArenaPoint
  rank: number
  random?: () => number
}

export type BulletmlStepResult = {
  shots: BulletmlShot[]
  direction: number
  speed: number
  vanished: boolean
}

const defaultBulletSpeed = 1
const defaultRank = 0.5

export function isBulletmlPattern(
  pattern: BossBulletPatternConfig,
): pattern is BulletmlPatternConfig {
  return 'engine' in pattern && pattern.engine === 'bulletml'
}

export function getBulletmlRank(pattern: BulletmlPatternConfig) {
  return pattern.rank ?? defaultRank
}

export function createBulletmlActor(options: {
  action: BulletmlAction
  direction: number
  speed: number
}): BulletmlActor {
  return {
    program: [...options.action],
    direction: options.direction,
    speed: options.speed,
    previousDirection: options.direction,
    previousSpeed: options.speed,
    waitRemaining: 0,
    vanished: false,
    speedTween: null,
    directionTween: null,
  }
}

export function createBulletmlPatternActor(pattern: BulletmlPatternConfig) {
  return createBulletmlActor({
    action: pattern.action,
    direction: -Math.PI / 2,
    speed: 0,
  })
}

export function isBulletmlActorIdle(actor: BulletmlActor) {
  return (
    !actor.vanished &&
    actor.program.length === 0 &&
    actor.waitRemaining <= 0 &&
    actor.speedTween === null &&
    actor.directionTween === null
  )
}

function degreesToArenaRadians(degrees: number) {
  return (degrees * Math.PI) / 180 - Math.PI / 2
}

function evaluateExpression(
  expression: BulletmlExpression | undefined,
  context: BulletmlStepContext,
  fallback = 0,
): number {
  if (expression === undefined) {
    return fallback
  }

  if (typeof expression === 'number') {
    return expression
  }

  if (expression.type === 'rank') {
    return context.rank
  }

  if (expression.type === 'rand') {
    return context.random?.() ?? Math.random()
  }

  const left = evaluateExpression(expression.left, context)
  const right = evaluateExpression(expression.right, context)

  if (expression.type === 'add') {
    return left + right
  }

  if (expression.type === 'sub') {
    return left - right
  }

  if (expression.type === 'mul') {
    return left * right
  }

  if (expression.type === 'div') {
    return right === 0 ? 0 : left / right
  }

  return right === 0 ? 0 : left % right
}

function getAimDirection(origin: ArenaPoint, target: ArenaPoint) {
  return Math.atan2(target.z - origin.z, target.x - origin.x)
}

function evaluateDirection(
  direction: BulletmlDirection | undefined,
  actor: BulletmlActor,
  context: BulletmlStepContext,
) {
  const value = evaluateExpression(direction?.degrees, context)

  if (!direction || direction.type === 'aim') {
    return getAimDirection(context.origin, context.target) + (value * Math.PI) / 180
  }

  if (direction.type === 'absolute') {
    return degreesToArenaRadians(value)
  }

  if (direction.type === 'relative') {
    return actor.direction + (value * Math.PI) / 180
  }

  return actor.previousDirection + (value * Math.PI) / 180
}

function evaluateSpeed(
  speed: BulletmlSpeed | undefined,
  actor: BulletmlActor,
  context: BulletmlStepContext,
) {
  const value = evaluateExpression(speed?.value, context, defaultBulletSpeed)

  if (!speed || speed.type === 'absolute') {
    return value
  }

  if (speed.type === 'relative') {
    return actor.speed + value
  }

  return actor.previousSpeed + value
}

function applyTween(tween: Tween, delta: number) {
  const elapsed = Math.min(tween.duration, tween.elapsed + delta)
  const ratio = tween.duration <= 0 ? 1 : elapsed / tween.duration

  return {
    value: tween.from + (tween.to - tween.from) * ratio,
    tween: elapsed >= tween.duration ? null : { ...tween, elapsed },
  }
}

function applyTweens(actor: BulletmlActor, delta: number) {
  if (actor.speedTween) {
    const next = applyTween(actor.speedTween, delta)
    actor.speed = next.value
    actor.speedTween = next.tween
  }

  if (actor.directionTween) {
    const next = applyTween(actor.directionTween, delta)
    actor.direction = next.value
    actor.directionTween = next.tween
  }
}

function buildTween(from: number, to: number, duration: number): Tween | null {
  if (duration <= 0) {
    return null
  }

  return { from, to, elapsed: 0, duration }
}

function expandRepeat(command: Extract<BulletmlCommand, { type: 'repeat' }>, context: BulletmlStepContext) {
  const count = Math.max(0, Math.floor(evaluateExpression(command.times, context)))
  const expanded: BulletmlCommand[] = []

  for (let index = 0; index < count; index += 1) {
    expanded.push(...command.actions)
  }

  return expanded
}

export function stepBulletmlActor(
  actor: BulletmlActor,
  context: BulletmlStepContext,
): BulletmlStepResult {
  const shots: BulletmlShot[] = []

  if (actor.vanished) {
    return { shots, direction: actor.direction, speed: actor.speed, vanished: true }
  }

  applyTweens(actor, context.delta)

  if (actor.waitRemaining > 0) {
    actor.waitRemaining = Math.max(0, actor.waitRemaining - context.delta)
    if (actor.waitRemaining > 0) {
      return { shots, direction: actor.direction, speed: actor.speed, vanished: false }
    }
  }

  while (actor.program.length > 0 && !actor.vanished) {
    const command = actor.program.shift()
    if (!command) {
      break
    }

    if (command.type === 'repeat') {
      actor.program.unshift(...expandRepeat(command, context))
      continue
    }

    if (command.type === 'action') {
      actor.program.unshift(...command.actions)
      continue
    }

    if (command.type === 'wait') {
      actor.waitRemaining = Math.max(0, evaluateExpression(command.seconds, context))
      break
    }

    if (command.type === 'fire') {
      const direction = evaluateDirection(command.direction, actor, context)
      const speed = evaluateSpeed(command.speed, actor, context)

      shots.push({
        direction,
        speed,
        action: command.actions ?? [],
        radius: command.radius,
        glow: command.glow,
        life: command.life,
        damage: command.damage,
      })
      actor.previousDirection = direction
      actor.previousSpeed = speed
      continue
    }

    if (command.type === 'changeSpeed') {
      const target = evaluateSpeed(command.speed, actor, context)
      const duration = Math.max(0, evaluateExpression(command.term, context))
      actor.speedTween = buildTween(actor.speed, target, duration)
      if (!actor.speedTween) {
        actor.speed = target
      }
      continue
    }

    if (command.type === 'changeDirection') {
      const target = evaluateDirection(command.direction, actor, context)
      const duration = Math.max(0, evaluateExpression(command.term, context))
      actor.directionTween = buildTween(actor.direction, target, duration)
      if (!actor.directionTween) {
        actor.direction = target
      }
      continue
    }

    actor.vanished = true
    actor.program = []
  }

  return { shots, direction: actor.direction, speed: actor.speed, vanished: actor.vanished }
}
