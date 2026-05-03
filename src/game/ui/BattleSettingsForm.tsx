import { useState } from 'react'

import styles from './BattleView.module.css'
import type { BattleSettings, DragSensitivity } from './battleSettingsStorage'

type BattleSettingsFormProps = {
  initialSettings: BattleSettings
  onApply: (settings: BattleSettings) => void
}

export function BattleSettingsForm({ initialSettings, onApply }: BattleSettingsFormProps) {
  const [draftSettings, setDraftSettings] = useState<BattleSettings>(initialSettings)

  return (
    <form
      className={styles.settingsForm}
      onSubmit={(event) => {
        event.preventDefault()
        onApply(draftSettings)
      }}
    >
      <fieldset className={styles.settingGroup}>
        <legend>Frame</legend>
        <div className={styles.optionRow}>
          <label className={styles.option}>
            <input
              type="radio"
              name="frame-rate"
              checked={draftSettings.frameRate === 30}
              onChange={() => setDraftSettings((current) => ({ ...current, frameRate: 30 }))}
            />
            <span>30 FPS</span>
          </label>
          <label className={styles.option}>
            <input
              type="radio"
              name="frame-rate"
              checked={draftSettings.frameRate === 60}
              onChange={() => setDraftSettings((current) => ({ ...current, frameRate: 60 }))}
            />
            <span>60 FPS</span>
          </label>
        </div>
      </fieldset>
      <fieldset className={styles.settingGroup}>
        <legend>Control</legend>
        <div className={styles.optionStack}>
          <label className={styles.option}>
            <input
              type="radio"
              name="control-mode"
              checked={draftSettings.controlMode === 'position'}
              onChange={() =>
                setDraftSettings((current) => ({ ...current, controlMode: 'position' }))
              }
            />
            <span>Position</span>
          </label>
          <label className={styles.option}>
            <input
              type="radio"
              name="control-mode"
              checked={draftSettings.controlMode === 'drag'}
              onChange={() =>
                setDraftSettings((current) => ({ ...current, controlMode: 'drag' }))
              }
            />
            <span>Drag</span>
          </label>
        </div>
      </fieldset>
      <fieldset className={styles.settingGroup}>
        <legend>Drag sensitive</legend>
        <div className={styles.optionRow}>
          {[1, 2, 3].map((sensitivity) => (
            <label className={styles.option} key={sensitivity}>
              <input
                type="radio"
                name="drag-sensitivity"
                checked={draftSettings.dragSensitivity === sensitivity}
                onChange={() =>
                  setDraftSettings((current) => ({
                    ...current,
                    dragSensitivity: sensitivity as DragSensitivity,
                  }))
                }
              />
              <span>{sensitivity}x</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" className={styles.applyButton} aria-label="Apply settings">
        Apply
      </button>
    </form>
  )
}
