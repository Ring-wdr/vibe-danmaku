import { describe, expect, it } from 'vitest'

import {
  createBulletmlActor,
  stepBulletmlActor,
} from './bulletmlPattern'
import type { BulletmlAction } from '../types'

const target = { x: 0, z: -2 }

function step(
  action: BulletmlAction,
  options?: { direction?: number; speed?: number; rank?: number },
) {
  const actor = createBulletmlActor({
    action,
    direction: options?.direction ?? -Math.PI / 2,
    speed: options?.speed ?? 0,
  })

  return stepBulletmlActor(actor, {
    delta: 0.1,
    origin: { x: 0, z: 0 },
    target,
    rank: options?.rank ?? 0.5,
  })
}

describe('bulletmlPattern', () => {
  it('expands repeat commands into sequence-direction volleys with waits', () => {
    const actor = createBulletmlActor({
      action: [
        {
          type: 'repeat',
          times: 3,
          actions: [
            {
              type: 'fire',
              direction: { type: 'sequence', degrees: 12 },
              speed: { type: 'absolute', value: 1.2 },
            },
            { type: 'wait', seconds: 0.1 },
          ],
        },
      ],
      direction: -Math.PI / 2,
      speed: 0,
    })

    const first = stepBulletmlActor(actor, {
      delta: 0.1,
      origin: { x: 0, z: 0 },
      target,
      rank: 0.5,
    })
    const second = stepBulletmlActor(actor, {
      delta: 0.1,
      origin: { x: 0, z: 0 },
      target,
      rank: 0.5,
    })
    const third = stepBulletmlActor(actor, {
      delta: 0.1,
      origin: { x: 0, z: 0 },
      target,
      rank: 0.5,
    })

    expect(first.shots).toHaveLength(1)
    expect(second.shots).toHaveLength(1)
    expect(third.shots).toHaveLength(1)
    expect(first.shots[0]?.direction).toBeCloseTo(-Math.PI / 2 + (12 * Math.PI) / 180)
    expect(second.shots[0]?.direction).toBeCloseTo(-Math.PI / 2 + (24 * Math.PI) / 180)
    expect(third.shots[0]?.direction).toBeCloseTo(-Math.PI / 2 + (36 * Math.PI) / 180)
  })

  it('evaluates rank expressions before firing', () => {
    const result = step([
      {
        type: 'fire',
        speed: {
          type: 'absolute',
          value: { type: 'add', left: 1, right: { type: 'mul', left: { type: 'rank' }, right: 2 } },
        },
      },
    ], { rank: 0.75 })

    expect(result.shots[0]?.speed).toBeCloseTo(2.5)
  })

  it('applies delayed speed and direction changes to a moving actor', () => {
    const actor = createBulletmlActor({
      action: [
        { type: 'wait', seconds: 0.1 },
        {
          type: 'changeSpeed',
          speed: { type: 'absolute', value: 2 },
          term: 0.2,
        },
        {
          type: 'changeDirection',
          direction: { type: 'relative', degrees: 90 },
          term: 0.2,
        },
      ],
      direction: -Math.PI / 2,
      speed: 1,
    })

    stepBulletmlActor(actor, { delta: 0.1, origin: { x: 0, z: 0 }, target, rank: 0.5 })
    stepBulletmlActor(actor, { delta: 0.1, origin: { x: 0, z: 0 }, target, rank: 0.5 })
    const midTransition = stepBulletmlActor(actor, {
      delta: 0.1,
      origin: { x: 0, z: 0 },
      target,
      rank: 0.5,
    })

    expect(midTransition.speed).toBeGreaterThan(1)
    expect(midTransition.speed).toBeLessThanOrEqual(2)
    expect(midTransition.direction).toBeGreaterThan(-Math.PI / 2)
  })
})
