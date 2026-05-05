import { useEffect, useRef } from 'react'
import { useSound } from 'react-sounds'

import stage1MusicUrl from '../../assets/generated/sound/stage_1.mp3'
import stage2MusicUrl from '../../assets/generated/sound/stage_2.mp3'
import stage3MusicUrl from '../../assets/generated/sound/stage_3.mp3'
import type { BattleSnapshot, StageDefinition } from '../types'

const stageMusicUrls = {
  1: stage1MusicUrl,
  2: stage2MusicUrl,
  3: stage3MusicUrl,
} as const

const stageMusicOptions = { loop: true, volume: 0.42 } as const

export function getStageMusicUrl(stageNumber: number) {
  return stageMusicUrls[stageNumber as keyof typeof stageMusicUrls]
}

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

export function useBattleSoundscape(
  snapshot: BattleSnapshot,
  active: boolean,
  stage: StageDefinition,
) {
  const stageMusicUrl = getStageMusicUrl(stage.stageNumber) ?? stage1MusicUrl
  const {
    play: playStageMusic,
    pause: pauseStageMusic,
    resume: resumeStageMusic,
    stop: stopStageMusic,
  } = useSound(stageMusicUrl, stageMusicOptions)
  const contextRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const stageMusicControlsRef = useRef({
    play: playStageMusic,
    pause: pauseStageMusic,
    resume: resumeStageMusic,
    stop: stopStageMusic,
  })
  const stageMusicActiveRef = useRef(false)
  const stageMusicStartedRef = useRef(false)
  const lastCueRef = useRef(0)
  const lastShotBucketRef = useRef(0)

  stageMusicControlsRef.current = {
    play: playStageMusic,
    pause: pauseStageMusic,
    resume: resumeStageMusic,
    stop: stopStageMusic,
  }

  const ensureAudio = () => {
    if (typeof window === 'undefined') {
      return null
    }

    if (!contextRef.current) {
      const context = new window.AudioContext()
      const master = context.createGain()
      master.gain.value = 1
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

  const stopAudio = () => {
    stageMusicActiveRef.current = false
    stageMusicStartedRef.current = false
    stageMusicControlsRef.current.stop()
  }

  useEffect(() => {
    const stageMusic = stageMusicControlsRef.current

    if (active) {
      if (stageMusicActiveRef.current) {
        return
      }

      stageMusicActiveRef.current = true

      if (stageMusicStartedRef.current) {
        stageMusic.resume()
        return
      }

      stageMusicStartedRef.current = true
      void stageMusic.play().catch(() => {
        stageMusicActiveRef.current = false
        stageMusicStartedRef.current = false
      })
      return
    }

    if (stageMusicActiveRef.current) {
      stageMusic.pause()
      stageMusicActiveRef.current = false
    }
  }, [active, stageMusicUrl])

  useEffect(() => {
    return () => {
      stopAudio()
    }
  }, [stageMusicUrl])

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

  return { stopAudio, unlockAudio }
}
