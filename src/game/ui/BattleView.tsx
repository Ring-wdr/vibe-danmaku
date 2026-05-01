import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'

import { BattleHud } from './BattleHud'
import { BattleScene } from './BattleScene'
import { createArenaPoint } from './battleViewMath'
import { useBattleRuntime } from './useBattleRuntime'
import styles from './BattleView.module.css'
import type { CharacterDefinition, Difficulty, RunResult, StageDefinition } from '../types'

export { battleDragInputConfig, createArenaPoint, getFlightAirflowDynamics } from './battleViewMath'
export { getBackgroundTextureUrls } from './battleBackground'
export { getAtlasFrameUv, getBossCoreTextureUrl, getPlayerBattleSpritePose } from './battleEntities'

type BattleViewProps = {
  difficulty: Difficulty
  stage: StageDefinition
  character: CharacterDefinition
  fastStage?: boolean
  invincible?: boolean
  onComplete: (result: RunResult) => void
}

export function BattleView({
  character,
  difficulty,
  stage,
  fastStage,
  invincible,
  onComplete,
}: BattleViewProps) {
  const { runtime, snapshot } = useBattleRuntime({
    difficulty,
    stage,
    character,
    fastStage,
    invincible,
  })
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const deliveredResultRef = useRef<RunResult | null>(null)
  const isPausedRef = useRef(false)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    isPausedRef.current = isPaused
    if (isPaused) {
      runtime.endDrag()
    }
  }, [isPaused, runtime])

  useEffect(() => {
    let frame = 0
    let lastTime = performance.now()

    const tick = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.033)
      lastTime = time
      if (!isPausedRef.current) {
        runtime.update(delta)
      }
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [runtime])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      event.preventDefault()
      setIsPaused((current) => !current)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (snapshot.result && deliveredResultRef.current !== snapshot.result) {
      deliveredResultRef.current = snapshot.result
      onComplete(snapshot.result)
    }
  }, [onComplete, snapshot.result])

  return (
    <section className={styles.shell} aria-label={`Stage ${stage.stageNumber} battle`}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 48 }}
        gl={{ alpha: false, antialias: true }}
        onCreated={({ gl }) => {
          gl.setClearColor('#123640', 1)
        }}
        style={{ width: '100%', height: '100%', background: '#123640' }}
      >
        <BattleScene character={character} stage={stage} snapshot={snapshot} isPaused={isPaused} />
      </Canvas>
      <span hidden data-testid="battle-background-motion" />
      <span hidden data-testid="battle-airflow-motion" />
      <span hidden data-testid="battle-background-theme">
        {stage.backgroundTheme}
      </span>
      <div
        ref={overlayRef}
        className={styles.controls}
        data-testid="battle-controls"
        onPointerDown={(event) => {
          if (isPausedRef.current) {
            return
          }

          const rect = overlayRef.current?.getBoundingClientRect()
          if (!rect) {
            return
          }

          event.currentTarget.setPointerCapture(event.pointerId)
          runtime.beginDrag(createArenaPoint(event.clientX, event.clientY, rect))
        }}
        onPointerMove={(event) => {
          if (isPausedRef.current) {
            return
          }

          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            return
          }

          const rect = overlayRef.current?.getBoundingClientRect()
          if (!rect) {
            return
          }

          runtime.moveDrag(createArenaPoint(event.clientX, event.clientY, rect))
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
          runtime.endDrag()
        }}
        onPointerCancel={() => runtime.endDrag()}
        role="presentation"
      />
      <BattleHud
        difficulty={difficulty}
        stage={stage}
        snapshot={snapshot}
        isPaused={isPaused}
        onPause={() => setIsPaused(true)}
        onActivateSpecial={(slotId) => runtime.activateSpecial(slotId)}
      />
      {isPaused ? (
        <div className={styles.pauseOverlay} role="dialog" aria-modal="true" aria-label="Battle paused">
          <div className={styles.pausePanel}>
            <p className={styles.pauseEyebrow}>Paused</p>
            <h1 className={styles.pauseTitle}>Battle paused</h1>
            <button
              type="button"
              className={styles.resumeButton}
              onClick={() => setIsPaused(false)}
            >
              Resume
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
