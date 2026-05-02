import { useSelector } from '@xstate/react'

import { writeLastCharacterId } from '../characterSelectionStorage'
import { cx } from '../classNames'
import type { BattleSessionActorRef } from '../battleSessionMachine'
import {
  getCharacterSelectRoster,
  resolvePlayableCharacter,
} from '../../game/content/characters'
import styles from './CharacterSelectScreen.module.css'

type CharacterSelectScreenProps = {
  sessionActorRef: BattleSessionActorRef
}

export function CharacterSelectScreen({ sessionActorRef }: CharacterSelectScreenProps) {
  const selectedCharacterId = useSelector(
    sessionActorRef,
    (snapshot) => snapshot.context.selectedCharacterId,
  )
  const selectedCharacter = resolvePlayableCharacter(selectedCharacterId)
  const characterRoster = getCharacterSelectRoster(selectedCharacter.id)

  return (
    <section className={styles.screen}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Select Pilot</p>
        <h2 className={styles.title}>Select Pilot</h2>
      </div>

      <div
        className={styles.focus}
        role="group"
        aria-label={`${selectedCharacter.name} pilot summary`}
      >
        <div className={styles.summary}>
          <div>
            <p className={styles.eyebrow}>
              {selectedCharacter.isFallback ? 'Reserve' : 'Playable'}
            </p>
            <h3 className={styles.name}>{selectedCharacter.name}</h3>
            <strong className={styles.pilotTitle}>{selectedCharacter.title}</strong>
          </div>
          <img
            className={styles.portrait}
            src={selectedCharacter.portraitUrl}
            alt={`${selectedCharacter.name} portrait`}
          />
        </div>

        <p className={styles.description}>{selectedCharacter.description}</p>

        <div className={styles.statList} aria-label={`${selectedCharacter.name} stats`}>
          {selectedCharacter.stats.map((stat) => (
            <div key={stat.label} className={styles.stat}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>{stat.label}</span>
                <strong className={styles.statValue}>{stat.value}</strong>
              </div>
              <i className={styles.statBar} style={{ width: `${Math.round(stat.ratio * 100)}%` }} />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.roster} role="group" aria-label="Playable characters">
        {characterRoster.map((character) => {
          const selected = character.id === selectedCharacter.id

          return (
            <button
              key={character.id}
              type="button"
              className={cx(styles.slot, selected && styles.slotSelected)}
              aria-label={`${selected ? 'Selected' : 'Select'} ${character.name}`}
              aria-pressed={selected}
              onClick={() =>
                sessionActorRef.send({ type: 'SELECT_CHARACTER', characterId: character.id })
              }
            >
              <img className={styles.slotPortrait} src={character.portraitUrl} alt="" />
              <span className={styles.slotName}>{character.name}</span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className={styles.deployButton}
        onClick={() => {
          writeLastCharacterId(selectedCharacter.id)
          sessionActorRef.send({ type: 'DEPLOY_CHARACTER' })
        }}
      >
        Deploy {selectedCharacter.name}
      </button>
    </section>
  )
}
