import { useSelector } from '@xstate/react'

import type { BattleSessionActorRef } from '../battleSessionMachine'
import styles from './ResultScreen.module.css'

type ResultScreenProps = {
  sessionActorRef: BattleSessionActorRef
}

export function ResultScreen({ sessionActorRef }: ResultScreenProps) {
  const result = useSelector(sessionActorRef, (snapshot) => snapshot.context.result)

  if (!result) {
    return null
  }

  const canContinueCampaign = result.outcome === 'victory' && result.stageNumber < 4

  return (
    <section className={styles.screen}>
      <p className={styles.eyebrow}>
        {result.outcome === 'victory' ? 'Mission Cleared' : 'Hull Breached'}
      </p>
      <h2 className={styles.title}>
        {result.stageName} {result.outcome === 'victory' ? 'Cleared' : 'Failed'}
      </h2>
      <div className={styles.grid}>
        <div className={styles.item}>
          <span className={styles.label}>Stage</span>
          <strong className={styles.value}>Stage {result.stageNumber}</strong>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Area</span>
          <strong className={styles.value}>{result.stageName}</strong>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Difficulty</span>
          <strong className={styles.value}>{result.difficulty.toUpperCase()}</strong>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Score</span>
          <strong className={styles.value}>{result.score.toLocaleString('en-US')}</strong>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Max Combo</span>
          <strong className={styles.value}>{result.maxCombo}</strong>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Remaining Hull</span>
          <strong className={styles.value}>{result.remainingHp}</strong>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Hits Taken</span>
          <strong className={styles.value}>{result.hitsTaken}</strong>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Duration</span>
          <strong className={styles.value}>{result.duration.toFixed(1)}s</strong>
        </div>
      </div>
      <div className={styles.actions}>
        {canContinueCampaign ? (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => sessionActorRef.send({ type: 'CONTINUE_CAMPAIGN' })}
          >
            Confirm
          </button>
        ) : (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => sessionActorRef.send({ type: 'RETRY_STAGE' })}
          >
            Retry Stage
          </button>
        )}
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => sessionActorRef.send({ type: 'RETURN_TO_TITLE' })}
        >
          Return to Hangar
        </button>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => sessionActorRef.send({ type: 'BACK' })}
        >
          Back
        </button>
      </div>
    </section>
  )
}
