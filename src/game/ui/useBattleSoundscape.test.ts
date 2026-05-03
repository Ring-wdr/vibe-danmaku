import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useBattleSoundscape } from './useBattleSoundscape'
import type { BattleSnapshot } from '../types'

const snapshot: BattleSnapshot = {
  difficulty: 'normal',
  stageName: 'Test Stage',
  elapsed: 0,
  duration: 90,
  phaseLabel: 'Opening',
  player: {
    position: { x: 0, z: -3 },
    hp: 3,
    maxHp: 3,
    invulnerable: false,
  },
  enemies: [],
  boss: null,
  bosses: [],
  bullets: [],
  itemDrops: [],
  playerPowerups: {
    powerupLevel: 0,
    attackMultiplier: 1,
  },
  specialSlots: [],
  specialBeam: null,
  sparkles: [],
  destructionEffects: [],
  playerShots: 0,
  hitsTaken: 0,
  bossEnteredCount: 0,
  cuePulse: 0,
  result: null,
}

describe('useBattleSoundscape', () => {
  const createdGains: Array<{ gain: { value: number }; connect: ReturnType<typeof vi.fn> }> = []
  let originalAudioContext: typeof window.AudioContext | undefined

  beforeEach(() => {
    originalAudioContext = window.AudioContext
    createdGains.length = 0

    class MockAudioContext {
      currentTime = 0
      destination = {}
      state: AudioContextState = 'suspended'

      createGain() {
        const gain = {
          gain: { value: 0 },
          connect: vi.fn(),
        }
        createdGains.push(gain)
        return gain
      }

      async resume() {
        this.state = 'running'
      }
    }

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: MockAudioContext,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: originalAudioContext,
    })
  })

  it('uses an audible default master gain for the generated demo mix', async () => {
    const { result } = renderHook(() => useBattleSoundscape(snapshot, false))

    await act(async () => {
      await result.current.unlockAudio()
    })

    expect(createdGains[0]?.gain.value).toBeCloseTo(1)
  })
})
