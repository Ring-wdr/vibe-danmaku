import { useSelector } from '@xstate/react'

import type { BattleSessionActorRef } from '../battleSessionMachine'
import { resolvePlayableCharacter } from '../../game/content/characters'
import styles from './StageIntroScreen.module.css'

type StageIntroScreenProps = {
  sessionActorRef: BattleSessionActorRef
}

export function StageIntroScreen({ sessionActorRef }: StageIntroScreenProps) {
  const difficulty = useSelector(sessionActorRef, (snapshot) => snapshot.context.difficulty)
  const selectedCharacterId = useSelector(
    sessionActorRef,
    (snapshot) => snapshot.context.selectedCharacterId,
  )
  const selectedCharacter = resolvePlayableCharacter(selectedCharacterId)

  return (
    <section className={styles.screen}>
      <p className={styles.eyebrow}>Stage 1</p>
      <h2 className={styles.title}>Brass Cloud Gate</h2>
      <p className={styles.difficulty}>Difficulty {difficulty.toUpperCase()} engaged</p>
      <p className={styles.pilot}>Pilot {selectedCharacter.name}</p>
      <p className={styles.lore}>
        스팀 날개 정찰기와 마력 깃털 드론을 돌파한 뒤, 황동 비공정 코어의 3페이즈를
        붕괴시키세요.
      </p>
      <div className={styles.actionZone}>
        <p className={styles.controls}>
          전투 중 화면 어디든 드래그해 회피하세요. 자동 연사는 항상 유지됩니다.
        </p>
        <button
          type="button"
          className={styles.deployButton}
          onClick={() => sessionActorRef.send({ type: 'DEPLOY_CHARACTER' })}
        >
          Deploy
        </button>
      </div>
    </section>
  )
}
