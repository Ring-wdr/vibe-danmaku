import { useEffect, useMemo, useState } from 'react'
import { useSelector } from '@xstate/react'

import type { BattleSessionActorRef } from './battleSessionMachine'
import {
  getBattleAssetPreloadItems,
  preloadBattleAssets,
  type BattleAssetProgress,
} from './battleAssetPreload'
import styles from './BattleLoadingScreen.module.css'
import { resolvePlayableCharacter } from '../game/content/characters'
import { createBattleStageDefinition } from '../game/content/battleStage'

const loadBattleViewModule = () => import('../game/ui/BattleView')

type BattleLoadingScreenProps = {
  sessionActorRef: BattleSessionActorRef
  fastStage?: boolean
}

export function BattleLoadingScreen({ sessionActorRef, fastStage }: BattleLoadingScreenProps) {
  const difficulty = useSelector(sessionActorRef, (snapshot) => snapshot.context.difficulty)
  const selectedCharacterId = useSelector(
    sessionActorRef,
    (snapshot) => snapshot.context.selectedCharacterId,
  )
  const stageNumber = useSelector(
    sessionActorRef,
    (snapshot) => snapshot.context.currentStageNumber,
  )
  const character = resolvePlayableCharacter(selectedCharacterId)
  const stage = useMemo(
    () => createBattleStageDefinition(stageNumber, difficulty, { fastStage }),
    [difficulty, fastStage, stageNumber],
  )
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
          sessionActorRef.send({ type: 'BATTLE_ASSETS_READY' })
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
  }, [character, retrySeed, sessionActorRef, stage])

  return (
    <div className={styles.screen}>
      <div className={styles.panel}>
        <p className={styles.eyebrow}>Stage {stage.stageNumber}</p>
        <h1 className={styles.title}>{stage.name}</h1>
        <div
          className={styles.bar}
          role="progressbar"
          aria-label="Battle assets"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <i className={styles.barFill} style={{ width: `${percent}%` }} />
        </div>
        <div className={styles.meta}>
          <strong className={styles.percent}>{percent}%</strong>
          <span className={styles.label}>{progress.currentLabel}</span>
        </div>
        <p className={styles.progress}>
          {progress.loadedItems}/{progress.totalItems} assets ready
        </p>
        {loadError ? (
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => setRetrySeed((current) => current + 1)}
          >
            Retry Loading
          </button>
        ) : null}
      </div>
    </div>
  )
}
