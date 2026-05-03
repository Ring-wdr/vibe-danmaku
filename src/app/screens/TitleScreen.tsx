import { gameAssets } from '../../game/assets'
import type { BattleSessionActorRef } from '../battleSessionMachine'
import styles from './TitleScreen.module.css'

type TitleScreenProps = {
  sessionActorRef: BattleSessionActorRef
}

export function TitleScreen({ sessionActorRef }: TitleScreenProps) {
  return (
    <section className={styles.screen}>
      <div className={styles.heroCopy}>
        <h1 className={styles.title}>Brass Cloud Gate</h1>
        <p className={styles.copy}>
          황동 비공정 항로 위의 마도 구름 회랑을 돌파하고, 거대 비공정 코어가 뿜어내는
          환광 탄막을 갈라 버리세요.
        </p>
      </div>
      <div className={styles.art}>
        <img className={styles.portrait} src={gameAssets.playerPortraitUrl} alt="Lyra Aer portrait" />
        <img className={styles.crest} src={gameAssets.uiOrnamentUrl} alt="" />
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => sessionActorRef.send({ type: 'OPEN_SETTINGS' })}
        >
          Settings
        </button>
        <button
          type="button"
          className={styles.startButton}
          onClick={() => sessionActorRef.send({ type: 'START_SORTIE' })}
        >
          Start Sortie
        </button>
      </div>
    </section>
  )
}
