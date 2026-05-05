import { useEffect, useRef, useState } from 'react'
import { useMachine } from '@xstate/react'
import { parseAsBoolean, useQueryStates } from 'nuqs'

import { BattlePhase } from './BattlePhase'
import { battleSessionMachine } from './battleSessionMachine'
import { readLastCharacterId } from './characterSelectionStorage'
import { OrientationLock } from './OrientationLock'
import { CharacterSelectScreen } from './screens/CharacterSelectScreen'
import { DifficultySelectScreen } from './screens/DifficultySelectScreen'
import { LeaderboardScreen } from './screens/LeaderboardScreen'
import { ResultScreen } from './screens/ResultScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { StageIntroScreen } from './screens/StageIntroScreen'
import { TitleScreen } from './screens/TitleScreen'
import { cx } from './classNames'
import { saveLeaderboardEntry } from './leaderboardStorage'
import { useMainSoundscape } from './useMainSoundscape'
import styles from './App.module.css'
import { resolveCharacterId } from '../game/content/characters'
import { readBattleSettings, subscribeBattleSettings } from '../game/ui/battleSettingsStorage'

type Viewport = {
  width: number
  height: number
}

type AppProps = {
  initialViewport?: Viewport
}

function readViewport(initialViewport?: Viewport): Viewport {
  if (initialViewport) {
    return initialViewport
  }

  if (typeof window === 'undefined') {
    return { width: 430, height: 932 }
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

export function App({ initialViewport }: AppProps) {
  const [initialSelectedCharacterId] = useState(() => resolveCharacterId(readLastCharacterId()))
  const [sessionSnapshot, , sessionActorRef] = useMachine(battleSessionMachine, {
    input: {
      selectedCharacterId: initialSelectedCharacterId,
    },
  })
  const lastRecordedLeaderboardKeyRef = useRef<string | null>(null)
  const [viewport, setViewport] = useState(() => readViewport(initialViewport))
  const [settings, setSettings] = useState(readBattleSettings)
  const [debugFlags] = useQueryStates({
    fastStage: parseAsBoolean.withDefault(false),
    invincible: parseAsBoolean.withDefault(false),
  })
  const isBattle = sessionSnapshot.matches('battle')
  const portraitOnly = viewport.width > viewport.height

  useMainSoundscape(!isBattle && settings.bgmEnabled)

  useEffect(() => {
    return subscribeBattleSettings(() => {
      setSettings(readBattleSettings())
    })
  }, [])

  useEffect(() => {
    if (initialViewport || typeof window === 'undefined') {
      return
    }

    const onResize = () => {
      setViewport(readViewport())
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [initialViewport])

  useEffect(() => {
    const { campaignScore, result, selectedCharacterId } = sessionSnapshot.context

    if (!result) {
      return
    }

    const shouldRecord = result.outcome === 'defeat' || result.stageNumber >= 3

    if (!shouldRecord) {
      return
    }

    const totalScore = campaignScore + result.score
    const leaderboardKey = [
      result.outcome,
      result.stageId,
      result.stageNumber,
      result.score,
      totalScore,
      selectedCharacterId,
    ].join(':')

    if (lastRecordedLeaderboardKeyRef.current === leaderboardKey) {
      return
    }

    saveLeaderboardEntry({
      result,
      selectedCharacterId,
      score: totalScore,
    })
    lastRecordedLeaderboardKeyRef.current = leaderboardKey
  }, [sessionSnapshot.context])

  if (sessionSnapshot.matches('battleLoading') || isBattle) {
    return (
      <BattlePhase
        sessionActorRef={sessionActorRef}
        fastStage={debugFlags.fastStage}
        invincible={debugFlags.invincible}
      />
    )
  }

  return (
    <main className={styles.shell}>
      <div className={styles.backdrop} />
      <section className={styles.phoneFrame}>
        {portraitOnly ? <OrientationLock /> : null}

        <div className={cx(styles.screenStack, portraitOnly && styles.screenStackBlocked)}>
          {sessionSnapshot.matches('title') ? (
            <TitleScreen sessionActorRef={sessionActorRef} />
          ) : null}

          {sessionSnapshot.matches('settings') ? (
            <SettingsScreen sessionActorRef={sessionActorRef} />
          ) : null}

          {sessionSnapshot.matches('leaderboard') ? (
            <LeaderboardScreen sessionActorRef={sessionActorRef} />
          ) : null}

          {sessionSnapshot.matches('difficultySelect') ? (
            <DifficultySelectScreen sessionActorRef={sessionActorRef} />
          ) : null}

          {sessionSnapshot.matches('characterSelect') ? (
            <CharacterSelectScreen sessionActorRef={sessionActorRef} />
          ) : null}

          {sessionSnapshot.matches('stageIntro') ? (
            <StageIntroScreen sessionActorRef={sessionActorRef} />
          ) : null}

          {sessionSnapshot.matches('result') ? (
            <ResultScreen sessionActorRef={sessionActorRef} />
          ) : null}
        </div>
      </section>
    </main>
  )
}
