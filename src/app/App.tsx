import { useEffect, useState } from 'react'
import { useMachine } from '@xstate/react'
import { parseAsBoolean, useQueryStates } from 'nuqs'

import { BattlePhase } from './BattlePhase'
import { battleSessionMachine } from './battleSessionMachine'
import { readLastCharacterId } from './characterSelectionStorage'
import { OrientationLock } from './OrientationLock'
import { CharacterSelectScreen } from './screens/CharacterSelectScreen'
import { DifficultySelectScreen } from './screens/DifficultySelectScreen'
import { ResultScreen } from './screens/ResultScreen'
import { StageIntroScreen } from './screens/StageIntroScreen'
import { TitleScreen } from './screens/TitleScreen'
import { cx } from './classNames'
import styles from './App.module.css'
import { resolveCharacterId } from '../game/content/characters'

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
  const [viewport, setViewport] = useState(() => readViewport(initialViewport))
  const [debugFlags] = useQueryStates({
    fastStage: parseAsBoolean.withDefault(false),
    invincible: parseAsBoolean.withDefault(false),
  })
  const portraitOnly = viewport.width > viewport.height

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

  if (sessionSnapshot.matches('battleLoading') || sessionSnapshot.matches('battle')) {
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
