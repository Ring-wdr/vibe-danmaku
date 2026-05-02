import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useMachine } from '@xstate/react'
import { parseAsBoolean, useQueryStates } from 'nuqs'

import { BattleLoadingScreen } from './BattleLoadingScreen'
import { battleSessionMachine } from './battleSessionMachine'
import { readLastCharacterId, writeLastCharacterId } from './characterSelectionStorage'
import { OrientationLock } from './OrientationLock'
import { CharacterSelectScreen } from './screens/CharacterSelectScreen'
import { DifficultySelectScreen } from './screens/DifficultySelectScreen'
import { ResultScreen } from './screens/ResultScreen'
import { StageIntroScreen } from './screens/StageIntroScreen'
import { TitleScreen } from './screens/TitleScreen'
import { cx } from './classNames'
import styles from './App.module.css'
import {
  getCharacterSelectRoster,
  resolveCharacterId,
  resolvePlayableCharacter,
} from '../game/content/characters'
import { createStageDefinition as createStage1Definition } from '../game/content/stage1'
import { createStage2Definition } from '../game/content/stage2'
import type { StageDefinition } from '../game/types'

const loadBattleViewModule = () => import('../game/ui/BattleView')

const BattleView = lazy(async () => {
  const module = await loadBattleViewModule()
  return { default: module.BattleView }
})

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
  const initialSelectedCharacterId = useMemo(() => resolveCharacterId(readLastCharacterId()), [])
  const [sessionSnapshot, sendSessionEvent] = useMachine(battleSessionMachine, {
    input: {
      selectedCharacterId: initialSelectedCharacterId,
    },
  })
  const { battleSeed, currentStageNumber, difficulty, result, selectedCharacterId } =
    sessionSnapshot.context
  const selectedCharacter = resolvePlayableCharacter(selectedCharacterId)
  const characterRoster = getCharacterSelectRoster(selectedCharacter.id)
  const [viewport, setViewport] = useState(() => readViewport(initialViewport))
  const [debugFlags] = useQueryStates({
    fastStage: parseAsBoolean.withDefault(false),
    invincible: parseAsBoolean.withDefault(false),
  })
  const currentStage = useMemo<StageDefinition>(
    () =>
      currentStageNumber === 1
        ? createStage1Definition(difficulty, { fastStage: debugFlags.fastStage })
        : createStage2Definition(difficulty, { fastStage: debugFlags.fastStage }),
    [currentStageNumber, debugFlags.fastStage, difficulty],
  )
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

  if (sessionSnapshot.matches('battle')) {
    return (
      <main className={styles.battleRoot}>
        <Suspense fallback={<div className={styles.battleLoadingFallback}>Loading Battle</div>}>
          <BattleView
            key={`${difficulty}-${selectedCharacter.id}-${currentStage.id}-${battleSeed}-${debugFlags.fastStage}-${debugFlags.invincible}`}
            difficulty={difficulty}
            stage={currentStage}
            character={selectedCharacter}
            fastStage={debugFlags.fastStage}
            invincible={debugFlags.invincible}
            onComplete={(nextResult) => {
              sendSessionEvent({ type: 'BATTLE_COMPLETED', result: nextResult })
            }}
          />
        </Suspense>
      </main>
    )
  }

  if (sessionSnapshot.matches('battleLoading')) {
    return (
      <main className={styles.battleRoot}>
        <BattleLoadingScreen
          character={selectedCharacter}
          stage={currentStage}
          onReady={() => sendSessionEvent({ type: 'BATTLE_ASSETS_READY' })}
        />
      </main>
    )
  }

  return (
    <main className={styles.shell}>
      <div className={styles.backdrop} />
      <section className={styles.phoneFrame}>
        {portraitOnly ? <OrientationLock /> : null}

        <div className={cx(styles.screenStack, portraitOnly && styles.screenStackBlocked)}>
          {sessionSnapshot.matches('title') ? (
            <TitleScreen
              onStart={() => {
                sendSessionEvent({ type: 'START_SORTIE' })
              }}
            />
          ) : null}

          {sessionSnapshot.matches('difficultySelect') ? (
            <DifficultySelectScreen
              onSelectDifficulty={(nextDifficulty) => {
                sendSessionEvent({ type: 'SELECT_DIFFICULTY', difficulty: nextDifficulty })
              }}
            />
          ) : null}

          {sessionSnapshot.matches('characterSelect') ? (
            <CharacterSelectScreen
              selectedCharacter={selectedCharacter}
              characterRoster={characterRoster}
              onSelectCharacter={(characterId) => {
                sendSessionEvent({ type: 'SELECT_CHARACTER', characterId })
              }}
              onDeploy={() => {
                writeLastCharacterId(selectedCharacter.id)
                sendSessionEvent({ type: 'DEPLOY_CHARACTER' })
              }}
            />
          ) : null}

          {sessionSnapshot.matches('stageIntro') ? (
            <StageIntroScreen
              difficulty={difficulty}
              selectedCharacter={selectedCharacter}
              onDeploy={() => {
                sendSessionEvent({ type: 'DEPLOY_CHARACTER' })
              }}
            />
          ) : null}

          {sessionSnapshot.matches('result') && result ? (
            <ResultScreen
              result={result}
              onRetry={() => {
                sendSessionEvent({ type: 'RETRY_STAGE' })
              }}
              onReturnToTitle={() => {
                sendSessionEvent({ type: 'RETURN_TO_TITLE' })
              }}
            />
          ) : null}
        </div>
      </section>
    </main>
  )
}
