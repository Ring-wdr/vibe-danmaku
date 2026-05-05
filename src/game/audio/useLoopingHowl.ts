import { useEffect, useRef } from 'react'
import { Howl, Howler } from 'howler'

type LoopingHowlOptions = {
  loop: boolean
  volume: number
  html5?: boolean
  inactiveBehavior?: 'pause' | 'stop'
}

export function useLoopingHowl(src: string, active: boolean, options: LoopingHowlOptions) {
  const howlRef = useRef<Howl | null>(null)
  const activeRef = useRef(false)
  const soundIdRef = useRef<number | null>(null)
  const html5 = options.html5 ?? false
  const inactiveBehavior = options.inactiveBehavior ?? 'pause'

  const stopAudio = () => {
    activeRef.current = false
    const howl = howlRef.current
    if (!howl) {
      return
    }

    if (soundIdRef.current !== null) {
      howl.stop(soundIdRef.current)
      soundIdRef.current = null
      return
    }

    howl.stop()
  }

  const unlockAudio = async () => {
    if (Howler.ctx?.state === 'suspended') {
      await Howler.ctx.resume()
    }
  }

  useEffect(() => {
    const howl = new Howl({
      src: [src],
      loop: options.loop,
      volume: options.volume,
      html5,
    })

    howlRef.current = howl
    activeRef.current = false
    soundIdRef.current = null

    return () => {
      howl.stop()
      howl.unload()
      if (howlRef.current === howl) {
        howlRef.current = null
        activeRef.current = false
        soundIdRef.current = null
      }
    }
  }, [html5, options.loop, options.volume, src])

  useEffect(() => {
    const howl = howlRef.current
    if (!howl) {
      return
    }

    if (active) {
      if (activeRef.current) {
        return
      }

      activeRef.current = true

      if (soundIdRef.current !== null) {
        howl.play(soundIdRef.current)
        return
      }

      soundIdRef.current = howl.play()
      return
    }

    if (activeRef.current) {
      if (inactiveBehavior === 'stop') {
        stopAudio()
        return
      }

      if (soundIdRef.current !== null) {
        howl.pause(soundIdRef.current)
      } else {
        howl.pause()
      }
      activeRef.current = false
    }
  }, [active, inactiveBehavior, src])

  return { stopAudio, unlockAudio }
}
