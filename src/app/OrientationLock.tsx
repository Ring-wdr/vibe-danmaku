import { gameAssets } from '../game/assets'
import styles from './OrientationLock.module.css'

export function OrientationLock() {
  return (
    <div className={styles.lock}>
      <img className={styles.icon} src={gameAssets.uiOrnamentUrl} alt="" />
      <h1 className={styles.title}>Portrait mode required</h1>
      <p className={styles.copy}>
        모바일 세로 플레이 전용입니다. 화면을 세로로 돌린 뒤 다시 진입해 주세요.
      </p>
    </div>
  )
}
