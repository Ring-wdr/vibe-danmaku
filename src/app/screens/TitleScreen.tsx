import { gameAssets } from '../../game/assets'
import styles from './TitleScreen.module.css'

type TitleScreenProps = {
  onStart: () => void
}

export function TitleScreen({ onStart }: TitleScreenProps) {
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
      <button type="button" className={styles.startButton} onClick={onStart}>
        Start Sortie
      </button>
    </section>
  )
}
