import mainMusicUrl from '../assets/generated/sound/main_theme.mp3'
import { useLoopingHowl } from '../game/audio/useLoopingHowl'

const mainMusicOptions = { loop: true, volume: 0.36 } as const

export function getMainMusicUrl() {
  return mainMusicUrl
}

export function useMainSoundscape(active: boolean) {
  return useLoopingHowl(mainMusicUrl, active, mainMusicOptions)
}
