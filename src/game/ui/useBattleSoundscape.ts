import { useEffect, useRef } from 'react'

import type { BattleSnapshot } from '../types'

function playTone(
  context: AudioContext,
  type: OscillatorType,
  frequency: number,
  duration: number,
  volume: number,
  destination: AudioNode,
) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const now = context.currentTime

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  oscillator.connect(gain)
  gain.connect(destination)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.04)
}

export function useBattleSoundscape(snapshot: BattleSnapshot, active: boolean) {
  const contextRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const loopRef = useRef<number | null>(null)
  const lastCueRef = useRef(0)
  const lastShotBucketRef = useRef(0)

  const ensureAudio = () => {
    if (typeof window === 'undefined') {
      return null
    }

    if (!contextRef.current) {
      const context = new window.AudioContext()
      const master = context.createGain()
      master.gain.value = 0.08
      master.connect(context.destination)
      contextRef.current = context
      masterRef.current = master
    }

    if (!contextRef.current || !masterRef.current) {
      return null
    }

    return { context: contextRef.current, master: masterRef.current }
  }

  const unlockAudio = async () => {
    const audio = ensureAudio()
    if (!audio) {
      return
    }

    if (audio.context.state === 'suspended') {
      await audio.context.resume()
    }
  }

  useEffect(() => {
    if (!active) {
      if (loopRef.current !== null) {
        window.clearInterval(loopRef.current)
        loopRef.current = null
      }
      return
    }

    const audio = ensureAudio()
    if (!audio || loopRef.current !== null) {
      return
    }

    const notes = [196, 247, 294, 370]
    let noteIndex = 0
    loopRef.current = window.setInterval(() => {
      if (audio.context.state !== 'running') {
        return
      }

      const root = notes[noteIndex % notes.length] ?? 196
      playTone(audio.context, 'triangle', root, 0.44, 0.015, audio.master)
      playTone(audio.context, 'sine', root * 2, 0.26, 0.01, audio.master)
      noteIndex += 1
    }, 620)

    return () => {
      if (loopRef.current !== null) {
        window.clearInterval(loopRef.current)
        loopRef.current = null
      }
    }
  }, [active])

  useEffect(() => {
    const audio = ensureAudio()
    if (!audio || audio.context.state !== 'running' || snapshot.cuePulse === lastCueRef.current) {
      return
    }

    if (snapshot.result?.outcome === 'victory') {
      playTone(audio.context, 'triangle', 392, 0.42, 0.035, audio.master)
      playTone(audio.context, 'sine', 523.25, 0.56, 0.02, audio.master)
    } else if (snapshot.result?.outcome === 'defeat') {
      playTone(audio.context, 'sawtooth', 130.81, 0.5, 0.03, audio.master)
    } else if (snapshot.bossEnteredCount > 0) {
      playTone(audio.context, 'square', 293.66, 0.18, 0.028, audio.master)
      playTone(audio.context, 'triangle', 220, 0.3, 0.018, audio.master)
    } else {
      playTone(audio.context, 'square', 329.63, 0.12, 0.015, audio.master)
    }

    lastCueRef.current = snapshot.cuePulse
  }, [snapshot.bossEnteredCount, snapshot.cuePulse, snapshot.result])

  useEffect(() => {
    const audio = ensureAudio()
    if (!audio || audio.context.state !== 'running') {
      return
    }

    const shotBucket = Math.floor(snapshot.playerShots / 10)
    if (shotBucket > lastShotBucketRef.current) {
      playTone(audio.context, 'triangle', 659.25, 0.08, 0.008, audio.master)
      lastShotBucketRef.current = shotBucket
    }
  }, [snapshot.playerShots])

  return { unlockAudio }
}
