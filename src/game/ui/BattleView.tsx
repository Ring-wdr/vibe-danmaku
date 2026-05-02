import { Canvas } from '@react-three/fiber'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { overlay } from 'overlay-kit'

import { BattleHud } from './BattleHud'
import { BattleScene } from './BattleScene'
import {
  readBattleSettings,
  writeBattleSettings,
  type BattleSettings,
  type DragSensitivity,
} from './battleSettingsStorage'
import { battleDragInputConfig, createArenaPoint } from './battleViewMath'
import { useBattleRuntime } from './useBattleRuntime'
import styles from './BattleView.module.css'
import type { ArenaPoint, CharacterDefinition, Difficulty, RunResult, StageDefinition } from '../types'

export { battleDragInputConfig, createArenaPoint, getFlightAirflowDynamics } from './battleViewMath'
export { getBackgroundTextureUrls } from './battleBackground'
export {
  getAtlasFrameUv,
  getBossCoreTextureUrl,
  getPlayerBattleSpritePose,
  getRenderableBosses,
} from './battleEntities'

type BattleViewProps = {
  difficulty: Difficulty
  stage: StageDefinition
  character: CharacterDefinition
  fastStage?: boolean
  invincible?: boolean
  onComplete: (result: RunResult) => void
}

function createRelativeArenaPoint({
  currentX,
  currentY,
  originX,
  originY,
  originPlayer,
  rect,
  sensitivity,
}: {
  currentX: number
  currentY: number
  originX: number
  originY: number
  originPlayer: ArenaPoint
  rect: DOMRect
  sensitivity: DragSensitivity
}): ArenaPoint {
  const xDelta =
    ((currentX - originX) / rect.width) *
    battleDragInputConfig.horizontalWorldSpan *
    sensitivity
  const zDelta =
    ((currentY - originY) / rect.height) *
    battleDragInputConfig.verticalWorldSpan *
    sensitivity

  return {
    x: originPlayer.x + xDelta,
    z: originPlayer.z - zDelta,
  }
}

function PauseSettingsOverlay({
  initialSettings,
  close,
  unmount,
}: {
  initialSettings: BattleSettings
  close: (settings: BattleSettings | null) => void
  unmount: () => void
}) {
  const [draftSettings, setDraftSettings] = useState<BattleSettings>(initialSettings)

  return (
    <div className={styles.pauseOverlay} role="dialog" aria-modal="true" aria-label="Battle paused">
      <div className={styles.pausePanel}>
        <p className={styles.pauseEyebrow}>Paused</p>
        <h1 className={styles.pauseTitle}>Battle paused</h1>
        <form
          className={styles.settingsForm}
          onSubmit={(event) => {
            event.preventDefault()
            close(draftSettings)
            unmount()
          }}
        >
          <fieldset className={styles.settingGroup}>
            <legend>Frame</legend>
            <div className={styles.optionRow}>
              <label className={styles.option}>
                <input
                  type="radio"
                  name="frame-rate"
                  checked={draftSettings.frameRate === 30}
                  onChange={() =>
                    setDraftSettings((current) => ({ ...current, frameRate: 30 }))
                  }
                />
                <span>30 FPS</span>
              </label>
              <label className={styles.option}>
                <input
                  type="radio"
                  name="frame-rate"
                  checked={draftSettings.frameRate === 60}
                  onChange={() =>
                    setDraftSettings((current) => ({ ...current, frameRate: 60 }))
                  }
                />
                <span>60 FPS</span>
              </label>
            </div>
          </fieldset>
          <fieldset className={styles.settingGroup}>
            <legend>Control</legend>
            <div className={styles.optionStack}>
              <label className={styles.option}>
                <input
                  type="radio"
                  name="control-mode"
                  checked={draftSettings.controlMode === 'position'}
                  onChange={() =>
                    setDraftSettings((current) => ({ ...current, controlMode: 'position' }))
                  }
                />
                <span>Position</span>
              </label>
              <label className={styles.option}>
                <input
                  type="radio"
                  name="control-mode"
                  checked={draftSettings.controlMode === 'drag'}
                  onChange={() =>
                    setDraftSettings((current) => ({ ...current, controlMode: 'drag' }))
                  }
                />
                <span>Drag</span>
              </label>
            </div>
          </fieldset>
          <fieldset className={styles.settingGroup}>
            <legend>Drag sensitive</legend>
            <div className={styles.optionRow}>
              {[1, 2, 3].map((sensitivity) => (
                <label className={styles.option} key={sensitivity}>
                  <input
                    type="radio"
                    name="drag-sensitivity"
                    checked={draftSettings.dragSensitivity === sensitivity}
                    onChange={() =>
                      setDraftSettings((current) => ({
                        ...current,
                        dragSensitivity: sensitivity as DragSensitivity,
                      }))
                    }
                  />
                  <span>{sensitivity}x</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className={styles.applyButton} aria-label="Apply settings">
            Apply
          </button>
        </form>
        <button
          type="button"
          className={styles.resumeButton}
          onClick={() => {
            close(null)
            unmount()
          }}
        >
          Resume
        </button>
      </div>
    </div>
  )
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
    onComplete,
  })
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const isPausedRef = useRef(false)
  const [settings, setSettings] = useState<BattleSettings>(readBattleSettings)
  const pauseOverlayOpenRef = useRef(false)
  const relativeDragRef = useRef<{
    originX: number
    originY: number
    originPlayer: ArenaPoint
  } | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  const openPauseSettings = useEffectEvent(async () => {
    if (pauseOverlayOpenRef.current) {
      return
    }

    pauseOverlayOpenRef.current = true
    isPausedRef.current = true
    setIsPaused(true)
    runtime.endDrag()

    try {
      const selectedSettings = await overlay.openAsync<BattleSettings | null>(
        ({ close, unmount }) => (
          <PauseSettingsOverlay
            initialSettings={settings}
            close={close}
            unmount={unmount}
          />
        ),
      )

      if (selectedSettings) {
        setSettings(selectedSettings)
        writeBattleSettings(selectedSettings)
      }
    } finally {
      pauseOverlayOpenRef.current = false
      isPausedRef.current = false
      setIsPaused(false)
    }
  })

  useEffect(() => {
    let frame = 0
    let lastTime = performance.now()
    let accumulatedDelta = 0
    const frameInterval = 1 / settings.frameRate
    const frameTolerance = 0.001

    const tick = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.033)
      lastTime = time
      if (!isPausedRef.current) {
        if (settings.frameRate === 60) {
          runtime.update(delta)
        } else {
          accumulatedDelta += delta
          if (accumulatedDelta + frameTolerance >= frameInterval) {
            runtime.update(Math.min(accumulatedDelta, 0.033))
            accumulatedDelta = 0
          }
        }
      } else {
        accumulatedDelta = 0
      }
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [runtime, settings.frameRate])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      event.preventDefault()
      void openPauseSettings()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

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
          if (settings.controlMode === 'drag') {
            relativeDragRef.current = {
              originX: event.clientX,
              originY: event.clientY,
              originPlayer: { ...snapshot.player.position },
            }
            runtime.beginDrag(snapshot.player.position)
            return
          }

          relativeDragRef.current = null
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

          if (settings.controlMode === 'drag') {
            const relativeDrag = relativeDragRef.current
            if (!relativeDrag) {
              return
            }

            runtime.moveDrag(
              createRelativeArenaPoint({
                currentX: event.clientX,
                currentY: event.clientY,
                originX: relativeDrag.originX,
                originY: relativeDrag.originY,
                originPlayer: relativeDrag.originPlayer,
                rect,
                sensitivity: settings.dragSensitivity,
              }),
            )
            return
          }

          runtime.moveDrag(createArenaPoint(event.clientX, event.clientY, rect))
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
          relativeDragRef.current = null
          runtime.endDrag()
        }}
        onPointerCancel={() => {
          relativeDragRef.current = null
          runtime.endDrag()
        }}
        role="presentation"
      />
      <BattleHud
        difficulty={difficulty}
        stage={stage}
        snapshot={snapshot}
        isPaused={isPaused}
        onPause={() => {
          void openPauseSettings()
        }}
        onActivateSpecial={(slotId) => runtime.activateSpecial(slotId)}
      />
    </section>
  )
}
