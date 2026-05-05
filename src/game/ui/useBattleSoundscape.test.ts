import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getStageMusicUrl, useBattleSoundscape } from './useBattleSoundscape'
import type { BattleSnapshot, StageDefinition } from '../types'

const { howlInstances, MockHowl } = vi.hoisted(() => {
  class MockHowl {
    options: {
      src: string[]
      loop: boolean
      volume: number
      html5: boolean
    }
    play = vi.fn((id?: number) => {
      void id
      return 42
    })
    pause = vi.fn(() => this)
    stop = vi.fn(() => this)
    unload = vi.fn(() => null)
    playing = vi.fn(() => false)

    constructor(options: {
      src: string[]
      loop: boolean
      volume: number
      html5: boolean
    }) {
      this.options = options
      howlInstances.push(this)
    }
  }

  const howlInstances: MockHowl[] = []

  return { howlInstances, MockHowl }
})

vi.mock('howler', () => ({
  Howl: MockHowl,
  Howler: {
    ctx: {
      state: 'running',
      resume: vi.fn(() => Promise.resolve()),
    },
  },
}))

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
  score: 0,
  combo: 0,
  maxCombo: 0,
  bossEnteredCount: 0,
  cuePulse: 0,
  result: null,
}

const stage: StageDefinition = {
  id: 'test-stage',
  stageNumber: 2,
  backgroundTheme: 'burning-ruins',
  name: 'Test Stage',
  lore: 'A test stage.',
  duration: 90,
  events: [],
}

describe('getStageMusicUrl', () => {
  it('maps authored battle stages to generated mp3 tracks', () => {
    expect(getStageMusicUrl(1)).toContain('/src/assets/generated/sound/stage_1.mp3')
    expect(getStageMusicUrl(2)).toContain('/src/assets/generated/sound/stage_2.mp3')
    expect(getStageMusicUrl(3)).toContain('/src/assets/generated/sound/stage_3.mp3')
  })
})

describe('useBattleSoundscape', () => {
  const createdGains: Array<{ gain: { value: number }; connect: ReturnType<typeof vi.fn> }> = []
  let originalAudioContext: typeof window.AudioContext | undefined

  beforeEach(() => {
    originalAudioContext = window.AudioContext
    createdGains.length = 0
    howlInstances.length = 0

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
    const { result } = renderHook(() => useBattleSoundscape(snapshot, false, stage))

    await act(async () => {
      await result.current.unlockAudio()
    })

    expect(createdGains[0]?.gain.value).toBeCloseTo(1)
  })

  it('plays the current stage track while battle is active and pauses it with the battle', async () => {
    const { rerender, unmount } = renderHook(
      ({ active }) => useBattleSoundscape(snapshot, active, stage),
      {
        initialProps: { active: true },
      },
    )

    const [stageHowl] = howlInstances

    expect(stageHowl?.options).toEqual({
      src: [expect.stringContaining('/src/assets/generated/sound/stage_2.mp3')],
      loop: true,
      volume: 0.42,
      html5: false,
    })
    expect(stageHowl?.play).toHaveBeenCalledTimes(1)

    rerender({ active: false })

    expect(stageHowl?.pause).toHaveBeenCalledTimes(1)
    expect(stageHowl?.pause).toHaveBeenCalledWith(42)

    unmount()

    expect(stageHowl?.stop).toHaveBeenCalledTimes(1)
    expect(stageHowl?.unload).toHaveBeenCalledTimes(1)
  })

  it('does not start a second loop when the active battle rerenders after resume', () => {
    const { rerender } = renderHook(
      ({ active, currentSnapshot }) => useBattleSoundscape(currentSnapshot, active, stage),
      {
        initialProps: { active: true, currentSnapshot: snapshot },
      },
    )

    rerender({ active: false, currentSnapshot: snapshot })
    rerender({ active: true, currentSnapshot: snapshot })
    rerender({
      active: true,
      currentSnapshot: {
        ...snapshot,
        playerShots: snapshot.playerShots + 1,
      },
    })

    const [stageHowl] = howlInstances
    const newLoopStarts = stageHowl?.play.mock.calls.filter(([id]) => id === undefined)

    expect(newLoopStarts).toHaveLength(1)
    expect(stageHowl?.play).toHaveBeenLastCalledWith(42)
    expect(stageHowl?.pause).toHaveBeenCalledTimes(1)
    expect(stageHowl?.stop).not.toHaveBeenCalled()
  })

  it('can explicitly stop stage music before the battle view unmounts', () => {
    const { result } = renderHook(() => useBattleSoundscape(snapshot, true, stage))
    const [stageHowl] = howlInstances

    act(() => {
      result.current.stopAudio()
    })

    expect(stageHowl?.stop).toHaveBeenCalledTimes(1)
  })
})
