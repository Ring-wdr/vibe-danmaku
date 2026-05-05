import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getMainMusicUrl, useMainSoundscape } from './useMainSoundscape'

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
      return 77
    })
    pause = vi.fn(() => this)
    stop = vi.fn(() => this)
    unload = vi.fn(() => null)

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

describe('getMainMusicUrl', () => {
  it('maps the main screen soundtrack to the generated mp3', () => {
    expect(getMainMusicUrl()).toContain('/src/assets/generated/sound/main_theme.mp3')
  })
})

describe('useMainSoundscape', () => {
  beforeEach(() => {
    howlInstances.length = 0
  })

  it('plays the main theme on non-battle screens and pauses it during battle', () => {
    const { rerender, unmount } = renderHook(({ active }) => useMainSoundscape(active), {
      initialProps: { active: true },
    })

    const [mainHowl] = howlInstances

    expect(mainHowl?.options).toEqual({
      src: [expect.stringContaining('/src/assets/generated/sound/main_theme.mp3')],
      loop: true,
      volume: 0.36,
      html5: true,
    })
    expect(mainHowl?.play).toHaveBeenCalledTimes(1)

    rerender({ active: false })

    expect(mainHowl?.pause).toHaveBeenCalledTimes(1)
    expect(mainHowl?.pause).toHaveBeenCalledWith(77)

    unmount()

    expect(mainHowl?.stop).toHaveBeenCalledTimes(1)
    expect(mainHowl?.unload).toHaveBeenCalledTimes(1)
  })
})
