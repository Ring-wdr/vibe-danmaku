import { lazy, Suspense, startTransition, useEffect, useMemo, useState } from 'react'
import { parseAsBoolean, useQueryStates } from 'nuqs'

import { BattleLoadingScreen } from './BattleLoadingScreen'
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
import type { AppScreen, Difficulty, RunResult, StageDefinition } from '../game/types'

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
  const [screen, setScreen] = useState<AppScreen>('title')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [selectedCharacterId, setSelectedCharacterId] = useState(() =>
    resolveCharacterId(readLastCharacterId()),
  )
  const selectedCharacter = resolvePlayableCharacter(selectedCharacterId)
  const characterRoster = getCharacterSelectRoster(selectedCharacter.id)
  const [result, setResult] = useState<RunResult | null>(null)
  const [battleSeed, setBattleSeed] = useState(0)
  const [currentStageNumber, setCurrentStageNumber] = useState<1 | 2>(1)
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

  const startScreen = (nextScreen: AppScreen) => {
    startTransition(() => setScreen(nextScreen))
  }

  if (screen === 'battle') {
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
              if (nextResult.outcome === 'victory' && nextResult.stageNumber === 1) {
                setResult(null)
                setCurrentStageNumber(2)
                setBattleSeed((current) => current + 1)
                startScreen('battle-loading')
                return
              }

              setResult(nextResult)
              startScreen('result')
            }}
          />
        </Suspense>
      </main>
    )
  }

  if (screen === 'battle-loading') {
    return (
      <main className={styles.battleRoot}>
        <BattleLoadingScreen
          character={selectedCharacter}
          stage={currentStage}
          onReady={() => startScreen('battle')}
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
          {screen === 'title' ? (
            <TitleScreen
              onStart={() => {
                setCurrentStageNumber(1)
                setResult(null)
                startScreen('difficulty-select')
              }}
            />
          ) : null}

          {screen === 'difficulty-select' ? (
            <DifficultySelectScreen
              onSelectDifficulty={(nextDifficulty) => {
                setDifficulty(nextDifficulty)
                startScreen('character-select')
              }}
            />
          ) : null}

          {screen === 'character-select' ? (
            <CharacterSelectScreen
              selectedCharacter={selectedCharacter}
              characterRoster={characterRoster}
              onSelectCharacter={setSelectedCharacterId}
              onDeploy={() => {
                writeLastCharacterId(selectedCharacter.id)
                startScreen('stage-intro')
              }}
            />
          ) : null}

          {screen === 'stage-intro' ? (
            <StageIntroScreen
              difficulty={difficulty}
              selectedCharacter={selectedCharacter}
              onDeploy={() => {
                setCurrentStageNumber(1)
                startScreen('battle-loading')
              }}
            />
          ) : null}

          {screen === 'result' && result ? (
            <ResultScreen
              result={result}
              onRetry={() => {
                setCurrentStageNumber(result.stageNumber === 2 ? 2 : 1)
                setBattleSeed((current) => current + 1)
                startScreen('battle-loading')
              }}
              onReturnToTitle={() => {
                setResult(null)
                setCurrentStageNumber(1)
                startScreen('title')
              }}
            />
          ) : null}
        </div>
      </section>
    </main>
  )
}
