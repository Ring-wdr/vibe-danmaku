import type { CSSProperties } from 'react'

import styles from './BattleHud.module.css'
import type { BattleSnapshot, Difficulty, RenderSpecialSlot, StageDefinition } from '../types'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function SpecialSlotHud({
  slots,
  onActivate,
}: {
  slots: RenderSpecialSlot[]
  onActivate: (slotId: RenderSpecialSlot['id']) => void
}) {
  return (
    <div className={styles.specials} aria-label="Special attacks">
      {slots.map((slot) => {
        const chargeRatio = Math.min(1, slot.charge / slot.maxCharge)
        const specialLabel = slot.id === 'phantom-orb' ? 'Phantom Orb' : 'Beam Lance'

        return (
          <button
            key={slot.id}
            type="button"
            className={cx(
              styles.specialSlot,
              slot.ready && styles.specialSlotReady,
              slot.active && styles.specialSlotActive,
            )}
            style={{ '--special-charge': `${chargeRatio * 360}deg` } as CSSProperties}
            disabled={!slot.ready}
            aria-label={`Activate ${specialLabel} special`}
            aria-valuemin={0}
            aria-valuemax={slot.maxCharge}
            aria-valuenow={Math.round(slot.charge)}
            onClick={() => onActivate(slot.id)}
          >
            <span
              className={styles.specialSlotIcon}
              data-testid="battle-special-slot-icon"
              aria-hidden="true"
            >
              <svg className={styles.specialSlotIconSvg} viewBox="0 0 48 48" focusable="false">
                {slot.icon === 'orb' ? (
                  <>
                    <circle cx="24" cy="24" r="13" />
                    <path d="M24 6v7" />
                    <path d="M24 35v7" />
                    <path d="M6 24h7" />
                    <path d="M35 24h7" />
                    <path d="M15 15l-5-5" />
                    <path d="M33 33l5 5" />
                  </>
                ) : (
                  <>
                    <path d="M24 5l7 18-7 20-7-20 7-18z" />
                    <path d="M13 27h22" />
                    <path d="M18 35h12" />
                  </>
                )}
              </svg>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function BattleHud({
  difficulty,
  stage,
  snapshot,
  isPaused,
  onPause,
  onActivateSpecial,
}: {
  difficulty: Difficulty
  stage: StageDefinition
  snapshot: BattleSnapshot
  isPaused: boolean
  onPause: () => void
  onActivateSpecial: (slotId: RenderSpecialSlot['id']) => void
}) {
  return (
    <>
      <button
        type="button"
        className={styles.pauseButton}
        aria-label="Pause battle"
        aria-pressed={isPaused}
        onClick={onPause}
      >
        ||
      </button>
      <div className={styles.hud} aria-label="Battle status">
        <div className={styles.status}>
          <div className={styles.statusPhase}>
            <span className={styles.statusLabel}>Stage {stage.stageNumber}</span>
            <strong className={cx(styles.statusValue, styles.phaseValue)}>
              {snapshot.phaseLabel}
            </strong>
          </div>
          <div className={styles.statusMeta}>
            <strong className={cx(styles.statusValue, styles.difficulty)}>
              {difficulty.toUpperCase()}
            </strong>
            <strong
              className={cx(styles.statusValue, styles.hp)}
              aria-label={`Hull ${snapshot.player.hp} of 3`}
            >
              {'◆'.repeat(snapshot.player.hp).padEnd(3, '◇')}
            </strong>
          </div>
        </div>
        {snapshot.boss ? (
          <div className={styles.boss}>
            <span className={styles.bossLabel}>Boss</span>
            <div className={styles.bossBar}>
              <i
                className={styles.bossBarFill}
                style={{ width: `${snapshot.boss.hpRatio * 100}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
      <SpecialSlotHud slots={snapshot.specialSlots} onActivate={onActivateSpecial} />
    </>
  )
}
