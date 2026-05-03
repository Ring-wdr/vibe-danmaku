import { readLeaderboardEntries } from '../leaderboardStorage'
import type { BattleSessionActorRef } from '../battleSessionMachine'
import styles from './LeaderboardScreen.module.css'

type LeaderboardScreenProps = {
  sessionActorRef: BattleSessionActorRef
}

export function LeaderboardScreen({ sessionActorRef }: LeaderboardScreenProps) {
  const entries = readLeaderboardEntries()

  return (
    <section className={styles.screen}>
      <p className={styles.eyebrow}>Local Records</p>
      <h2 className={styles.title}>Leaderboard</h2>

      {entries.length > 0 ? (
        <ol className={styles.list} aria-label="Leaderboard records">
          {entries.map((entry, index) => (
            <li className={styles.entry} key={entry.id}>
              <span className={styles.rank}>#{index + 1}</span>
              <span className={styles.detail}>
                <strong className={styles.score}>{entry.score.toLocaleString('en-US')}</strong>
                <span className={styles.meta}>
                  {entry.outcome === 'victory' ? 'Cleared' : 'Game Over'} · Stage{' '}
                  {entry.stageNumber} · {entry.difficulty.toUpperCase()}
                </span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <div className={styles.empty}>
          <strong>No recorded sorties</strong>
          <span>Clear the final stage or reach game over to save a score.</span>
        </div>
      )}

      <button
        type="button"
        className={styles.backButton}
        onClick={() => sessionActorRef.send({ type: 'BACK' })}
      >
        Back
      </button>
    </section>
  )
}
