import { cx } from '../classNames'
import type { BattleSessionActorRef } from '../battleSessionMachine'
import type { Difficulty } from '../../game/types'
import styles from './DifficultySelectScreen.module.css'

const difficultyCardClasses = {
  easy: styles.easy,
  normal: styles.normal,
  hard: styles.hard,
} satisfies Record<Difficulty, string>

type DifficultySelectScreenProps = {
  sessionActorRef: BattleSessionActorRef
}

export function DifficultySelectScreen({ sessionActorRef }: DifficultySelectScreenProps) {
  return (
    <section className={styles.screen}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => sessionActorRef.send({ type: 'BACK' })}
      >
        Back
      </button>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Select Hazard</p>
        <h2 className={styles.title}>Choose difficulty</h2>
      </div>
      <div className={styles.grid}>
        {(['easy', 'normal', 'hard'] as Difficulty[]).map((level) => (
          <button
            key={level}
            type="button"
            className={cx(styles.card, difficultyCardClasses[level])}
            onClick={() => sessionActorRef.send({ type: 'SELECT_DIFFICULTY', difficulty: level })}
          >
            <span className={styles.label}>{level.toUpperCase()}</span>
            <strong className={styles.name}>
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
  )
}
