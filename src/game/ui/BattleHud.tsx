import type { CSSProperties } from 'react'

import type { BattleSnapshot, Difficulty, RenderSpecialSlot, StageDefinition } from '../types'

function SpecialSlotHud({
  slots,
  onActivate,
}: {
  slots: RenderSpecialSlot[]
  onActivate: (slotId: RenderSpecialSlot['id']) => void
}) {
  return (
    <div className="battle-specials" aria-label="Special attacks">
      {slots.map((slot) => {
        const chargeRatio = Math.min(1, slot.charge / slot.maxCharge)

        return (
          <button
            key={slot.id}
            type="button"
            className={`battle-special-slot ${
              slot.ready ? 'battle-special-slot--ready' : ''
            } ${slot.active ? 'battle-special-slot--active' : ''}`}
            style={{ '--special-charge': `${chargeRatio * 360}deg` } as CSSProperties}
            disabled={!slot.ready}
            aria-label="Activate Beam Lance special"
            aria-valuemin={0}
            aria-valuemax={slot.maxCharge}
            aria-valuenow={Math.round(slot.charge)}
            onClick={() => onActivate(slot.id)}
          >
            <span className="battle-special-slot__icon" aria-hidden="true">
              <svg viewBox="0 0 48 48" focusable="false">
                <path d="M24 5l7 18-7 20-7-20 7-18z" />
                <path d="M13 27h22" />
                <path d="M18 35h12" />
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
        className="battle-pause-button"
        aria-label="Pause battle"
        aria-pressed={isPaused}
        onClick={onPause}
      >
        ||
      </button>
      <div className="battle-hud" aria-label="Battle status">
        <div className="battle-status">
          <div className="battle-status__phase">
            <span>Stage {stage.stageNumber}</span>
            <strong>{snapshot.phaseLabel}</strong>
          </div>
          <div className="battle-status__meta">
            <strong className="battle-status__difficulty">{difficulty.toUpperCase()}</strong>
            <strong className="battle-status__hp" aria-label={`Hull ${snapshot.player.hp} of 3`}>
              {'◆'.repeat(snapshot.player.hp).padEnd(3, '◇')}
            </strong>
          </div>
        </div>
        {snapshot.boss ? (
          <div className="battle-boss">
            <span>Boss</span>
            <div className="battle-boss__bar">
              <i style={{ width: `${snapshot.boss.hpRatio * 100}%` }} />
            </div>
          </div>
        ) : null}
      </div>
      <SpecialSlotHud slots={snapshot.specialSlots} onActivate={onActivateSpecial} />
    </>
  )
}
