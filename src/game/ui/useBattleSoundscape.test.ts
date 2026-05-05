import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getStageMusicUrl, useBattleSoundscape } from './useBattleSoundscape'
import type { BattleSnapshot, StageDefinition } from '../types'

const { mockPause, mockPlay, mockStop, mockUseSound } = vi.hoisted(() => ({
  mockPause: vi.fn(),
  mockPlay: vi.fn(() => Promise.resolve()),
  mockStop: vi.fn(),
  mockUseSound: vi.fn(),
}))

vi.mock('react-sounds', () => ({
  useSound: mockUseSound,
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
    mockPause.mockClear()
    mockPlay.mockClear()
    mockStop.mockClear()
    mockUseSound.mockReset()
    mockUseSound.mockReturnValue({
      play: mockPlay,
      pause: mockPause,
      stop: mockStop,
      resume: vi.fn(),
      isPlaying: false,
      isLoaded: true,
      checkPermission: vi.fn(),
    })

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

    expect(mockUseSound).toHaveBeenCalledWith(
      expect.stringContaining('/src/assets/generated/sound/stage_2.mp3'),
      { loop: true, volume: 0.42 },
    )
    expect(mockPlay).toHaveBeenCalledTimes(1)

    rerender({ active: false })

    expect(mockPause).toHaveBeenCalledTimes(1)

    unmount()

    expect(mockStop).toHaveBeenCalledTimes(1)
  })

  it('does not start a second loop when the active battle rerenders after resume', () => {
    mockUseSound.mockImplementation(() => ({
      play: vi.fn(() => {
        mockPlay()
        return Promise.resolve()
      }),
      pause: vi.fn(() => mockPause()),
      resume: vi.fn(),
      stop: vi.fn(() => mockStop()),
      isPlaying: false,
      isLoaded: true,
      checkPermission: vi.fn(),
    }))

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

    expect(mockPlay).toHaveBeenCalledTimes(1)
    expect(mockPause).toHaveBeenCalledTimes(1)
    expect(mockStop).not.toHaveBeenCalled()
  })

  it('can explicitly stop stage music before the battle view unmounts', () => {
    const { result } = renderHook(() => useBattleSoundscape(snapshot, true, stage))

    act(() => {
      result.current.stopAudio()
    })

    expect(mockStop).toHaveBeenCalledTimes(1)
  })
})
