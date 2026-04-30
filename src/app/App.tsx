import { lazy, Suspense, startTransition, useEffect, useState } from 'react'

import { gameAssets } from '../game/assets'
import type { AppScreen, Difficulty, RunResult } from '../game/types'

const BattleView = lazy(async () => {
  const module = await import('../game/ui/BattleView')
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

function readDebugFlags() {
  if (typeof window === 'undefined') {
    return { fastStage: false, invincible: false }
  }

  const query = new URLSearchParams(window.location.search)
  return {
    fastStage: query.get('fastStage') === '1',
    invincible: query.get('invincible') === '1',
  }
}

export function App({ initialViewport }: AppProps) {
  const [screen, setScreen] = useState<AppScreen>('title')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [result, setResult] = useState<RunResult | null>(null)
  const [battleSeed, setBattleSeed] = useState(0)
  const [viewport, setViewport] = useState(() => readViewport(initialViewport))
  const debugFlags = readDebugFlags()
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
                <button type="button" className="primary-button" onClick={() => startScreen('difficulty-select')}>
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
                      startScreen('stage-intro')
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

          {screen === 'stage-intro' ? (
            <section className="screen stage-intro">
              <p className="eyebrow">Stage 1</p>
              <h2>Brass Cloud Gate</h2>
              <p>Difficulty {difficulty.toUpperCase()} engaged</p>
              <p className="stage-intro__lore">
                스팀 날개 정찰기와 마력 깃털 드론을 돌파한 뒤, 황동 비공정 코어의 3페이즈를
                붕괴시키세요.
              </p>
              <button type="button" className="primary-button" onClick={() => startScreen('battle')}>
                Deploy
              </button>
            </section>
          ) : null}

          {screen === 'battle' ? (
            <Suspense
              fallback={
                <section className="screen stage-intro">
                  <p className="eyebrow">Loading Battle</p>
                  <h2>Igniting Aether Rails</h2>
                  <p className="stage-intro__lore">구름 회랑과 탄막 엔진을 정렬하는 중입니다.</p>
                </section>
              }
            >
              <BattleView
                key={`${difficulty}-${battleSeed}-${debugFlags.fastStage}-${debugFlags.invincible}`}
                difficulty={difficulty}
                fastStage={debugFlags.fastStage}
                invincible={debugFlags.invincible}
                onComplete={(nextResult) => {
                  setResult(nextResult)
                  startScreen('result')
                }}
              />
            </Suspense>
          ) : null}

          {screen === 'result' && result ? (
            <section className="screen result-screen">
              <p className="eyebrow">{result.outcome === 'victory' ? 'Mission Cleared' : 'Hull Breached'}</p>
              <h2>{result.outcome === 'victory' ? 'Cloud Gate Broken' : 'Sortie Failed'}</h2>
              <div className="result-grid">
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
                    setBattleSeed((current) => current + 1)
                    startScreen('battle')
                  }}
                >
                  Retry Stage
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setResult(null)
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
