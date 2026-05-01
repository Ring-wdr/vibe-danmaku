import type { RunResult } from '../../game/types'
import styles from './ResultScreen.module.css'

type ResultScreenProps = {
  result: RunResult
  onRetry: () => void
  onReturnToTitle: () => void
}

export function ResultScreen({ result, onRetry, onReturnToTitle }: ResultScreenProps) {
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
        <button type="button" className={styles.primaryButton} onClick={onRetry}>
          Retry Stage
        </button>
        <button type="button" className={styles.secondaryButton} onClick={onReturnToTitle}>
          Return to Hangar
        </button>
      </div>
    </section>
  )
}
