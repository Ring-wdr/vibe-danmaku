import { lazy, Suspense, startTransition, useEffect, useMemo, useState } from 'react'
import { parseAsBoolean, useQueryStates } from 'nuqs'

import {
  getBattleAssetPreloadItems,
  preloadBattleAssets,
  type BattleAssetProgress,
} from './battleAssetPreload'
import { gameAssets } from '../game/assets'
import {
  getCharacterSelectRoster,
  resolveCharacterId,
  resolvePlayableCharacter,
} from '../game/content/characters'
import { createStageDefinition as createStage1Definition } from '../game/content/stage1'
import { createStage2Definition } from '../game/content/stage2'
import type {
  AppScreen,
  CharacterDefinition,
  Difficulty,
  RunResult,
  StageDefinition,
} from '../game/types'
import { readLastCharacterId, writeLastCharacterId } from './characterSelectionStorage'

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

function BattleLoadingScreen({
  character,
  stage,
  onReady,
}: {
  character: CharacterDefinition
  stage: StageDefinition
  onReady: () => void
}) {
  const [retrySeed, setRetrySeed] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [progress, setProgress] = useState<BattleAssetProgress>({
    loadedItems: 0,
    totalItems: 1,
    ratio: 0,
    currentLabel: 'Battle assets',
  })
  const percent = Math.round(Math.min(1, Math.max(0, progress.ratio)) * 100)

  useEffect(() => {
    let cancelled = false
    const items = getBattleAssetPreloadItems({ stage, character })
    const battleModule = loadBattleViewModule()

    const prepareBattle = async () => {
      setLoadError(null)
      setProgress({
        loadedItems: 0,
        totalItems: items.length,
        ratio: 0,
        currentLabel: 'Battle assets',
      })

      try {
        await preloadBattleAssets(items, (nextProgress) => {
          if (!cancelled) {
            setProgress(nextProgress)
          }
        })

        if (cancelled) {
          return
        }

        setProgress({
          loadedItems: items.length,
          totalItems: items.length,
          ratio: 0.98,
          currentLabel: 'Battle renderer',
        })

        await battleModule

        if (!cancelled) {
          setProgress({
            loadedItems: items.length,
            totalItems: items.length,
            ratio: 1,
            currentLabel: 'Ready',
          })
          onReady()
        }
      } catch {
        if (!cancelled) {
          setLoadError('Battle assets failed to load')
        }
      }
    }

    void prepareBattle()

    return () => {
      cancelled = true
    }
  }, [character, onReady, retrySeed, stage])

  return (
    <div className="battle-root__loading">
      <div className="battle-loading-panel">
        <p className="eyebrow">Stage {stage.stageNumber}</p>
        <h1>{stage.name}</h1>
        <div
          className="battle-loading-panel__bar"
          role="progressbar"
          aria-label="Battle assets"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <i style={{ width: `${percent}%` }} />
        </div>
        <div className="battle-loading-panel__meta">
          <strong>{percent}%</strong>
          <span>{progress.currentLabel}</span>
        </div>
        <p>
          {progress.loadedItems}/{progress.totalItems} assets ready
        </p>
        {loadError ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => setRetrySeed((current) => current + 1)}
          >
            Retry Loading
          </button>
        ) : null}
      </div>
    </div>
  )
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
      <main className="battle-root">
        <Suspense fallback={<div className="battle-root__loading">Loading Battle</div>}>
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
      <main className="battle-root">
        <BattleLoadingScreen
          character={selectedCharacter}
          stage={currentStage}
          onReady={() => startScreen('battle')}
        />
      </main>
    )
  }

  return (
    <main className="app-shell">
      <div className="app-shell__backdrop" />
      <section className="app-shell__phone-frame">
        <header className="top-bar">
          <span>Steamfantasy Bullet Opera</span>
          <strong>Brass Cloud Gate</strong>
        </header>

        {portraitOnly ? (
          <div className="orientation-lock">
            <img src={gameAssets.uiOrnamentUrl} alt="" />
            <h1>Portrait mode required</h1>
            <p>모바일 세로 플레이 전용 프로토타입입니다. 화면을 세로로 돌린 뒤 다시 진입해 주세요.</p>
          </div>
        ) : null}

        <div className={`screen-stack ${portraitOnly ? 'screen-stack--blocked' : ''}`}>
          {screen === 'title' ? (
            <section className="screen screen--hero">
              <div className="hero-copy">
                <p className="eyebrow">Stage 1 Prototype</p>
                <h1>Brass Cloud Gate</h1>
                <p>
                  황동 비공정 항로 위의 마도 구름 회랑을 돌파하고, 거대 비공정 코어가
                  뿜어내는 환광 탄막을 갈라 버리세요.
                </p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setCurrentStageNumber(1)
                    setResult(null)
                    startScreen('difficulty-select')
                  }}
                >
                  Start Sortie
                </button>
              </div>
              <div className="hero-art">
                <img src={gameAssets.playerPortraitUrl} alt="Lyra Aer portrait" />
                <img className="hero-art__crest" src={gameAssets.uiOrnamentUrl} alt="" />
              </div>
            </section>
          ) : null}

          {screen === 'difficulty-select' ? (
            <section className="screen">
              <div className="section-heading">
                <p className="eyebrow">Select Hazard</p>
                <h2>Choose difficulty</h2>
              </div>
              <div className="difficulty-grid">
                {(['easy', 'normal', 'hard'] as Difficulty[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`difficulty-card difficulty-card--${level}`}
                    onClick={() => {
                      setDifficulty(level)
                      startScreen('character-select')
                    }}
                  >
                    <span>{level.toUpperCase()}</span>
                    <strong>
                      {level === 'easy'
                        ? 'Loose brass spread'
                        : level === 'normal'
                          ? 'Balanced mana storm'
                          : 'Dense furnace bloom'}
                    </strong>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {screen === 'character-select' ? (
            <section className="screen character-select">
              <div className="section-heading">
                <p className="eyebrow">Select Pilot</p>
                <h2>Select Pilot</h2>
              </div>

              <div className="character-focus">
                <div className="character-focus__summary">
                  <div>
                    <p className="eyebrow">{selectedCharacter.isFallback ? 'Reserve' : 'Playable'}</p>
                    <h3>{selectedCharacter.name}</h3>
                    <strong>{selectedCharacter.title}</strong>
                  </div>
                  <img src={selectedCharacter.portraitUrl} alt={`${selectedCharacter.name} portrait`} />
                </div>

                <p className="character-focus__description">{selectedCharacter.description}</p>

                <div className="character-stat-list" aria-label={`${selectedCharacter.name} stats`}>
                  {selectedCharacter.stats.map((stat) => (
                    <div key={stat.label} className="character-stat">
                      <div>
                        <span>{stat.label}</span>
                        <strong>{stat.value}</strong>
                      </div>
                      <i style={{ width: `${Math.round(stat.ratio * 100)}%` }} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="character-roster" aria-label="Playable characters">
                {characterRoster.map((character) => {
                  const selected = character.id === selectedCharacter.id

                  return (
                    <button
                      key={character.id}
                      type="button"
                      className={`character-slot ${selected ? 'character-slot--selected' : ''}`}
                      aria-label={`${selected ? 'Selected' : 'Select'} ${character.name}`}
                      aria-pressed={selected}
                      onClick={() => setSelectedCharacterId(character.id)}
                    >
                      <img src={character.portraitUrl} alt="" />
                      <span>{character.name}</span>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  writeLastCharacterId(selectedCharacter.id)
                  startScreen('stage-intro')
                }}
              >
                Deploy {selectedCharacter.name}
              </button>
            </section>
          ) : null}

          {screen === 'stage-intro' ? (
            <section className="screen stage-intro">
              <p className="eyebrow">Stage 1</p>
              <h2>Brass Cloud Gate</h2>
              <p>Difficulty {difficulty.toUpperCase()} engaged</p>
              <p className="stage-intro__pilot">Pilot {selectedCharacter.name}</p>
              <p className="stage-intro__lore">
                스팀 날개 정찰기와 마력 깃털 드론을 돌파한 뒤, 황동 비공정 코어의 3페이즈를
                붕괴시키세요.
              </p>
              <p className="stage-intro__controls">
                전투 중 화면 어디든 드래그해 회피하세요. 자동 연사는 항상 유지됩니다.
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setCurrentStageNumber(1)
                  startScreen('battle-loading')
                }}
              >
                Deploy
              </button>
            </section>
          ) : null}

          {screen === 'result' && result ? (
            <section className="screen result-screen">
              <p className="eyebrow">{result.outcome === 'victory' ? 'Mission Cleared' : 'Hull Breached'}</p>
              <h2>
                {result.stageName} {result.outcome === 'victory' ? 'Cleared' : 'Failed'}
              </h2>
              <div className="result-grid">
                <div>
                  <span>Stage</span>
                  <strong>Stage {result.stageNumber}</strong>
                </div>
                <div>
                  <span>Area</span>
                  <strong>{result.stageName}</strong>
                </div>
                <div>
                  <span>Difficulty</span>
                  <strong>{result.difficulty.toUpperCase()}</strong>
                </div>
                <div>
                  <span>Remaining Hull</span>
                  <strong>{result.remainingHp}</strong>
                </div>
                <div>
                  <span>Hits Taken</span>
                  <strong>{result.hitsTaken}</strong>
                </div>
                <div>
                  <span>Duration</span>
                  <strong>{result.duration.toFixed(1)}s</strong>
                </div>
              </div>
              <div className="result-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setCurrentStageNumber(result.stageNumber)
                    setBattleSeed((current) => current + 1)
                    startScreen('battle-loading')
                  }}
                >
                  Retry Stage
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setResult(null)
                    setCurrentStageNumber(1)
                    startScreen('title')
                  }}
                >
                  Return to Hangar
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  )
}
