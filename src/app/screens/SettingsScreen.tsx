import { useState } from 'react'

import type { BattleSessionActorRef } from '../battleSessionMachine'
import { BattleSettingsForm } from '../../game/ui/BattleSettingsForm'
import {
  readBattleSettings,
  writeBattleSettings,
  type BattleSettings,
} from '../../game/ui/battleSettingsStorage'
import styles from './SettingsScreen.module.css'

type SettingsScreenProps = {
  sessionActorRef: BattleSessionActorRef
}

export function SettingsScreen({ sessionActorRef }: SettingsScreenProps) {
  const [settings, setSettings] = useState<BattleSettings>(readBattleSettings)

  return (
    <section className={styles.screen}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Hangar</p>
        <h2 className={styles.title}>Settings</h2>
      </div>
      <div className={styles.panel}>
        <BattleSettingsForm
          initialSettings={settings}
          onApply={(nextSettings) => {
            setSettings(nextSettings)
            writeBattleSettings(nextSettings)
          }}
          onCancel={() => sessionActorRef.send({ type: 'BACK' })}
        />
      </div>
    </section>
  )
}
