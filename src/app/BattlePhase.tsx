import { lazy, Suspense } from 'react'
import { useSelector } from '@xstate/react'

import { BattleLoadingScreen } from './BattleLoadingScreen'
import type { BattleSessionActorRef } from './battleSessionMachine'
import styles from './App.module.css'
import { resolvePlayableCharacter } from '../game/content/characters'
import { createBattleStageDefinition } from '../game/content/battleStage'

const loadBattleViewModule = () => import('../game/ui/BattleView')

const BattleView = lazy(async () => {
  const module = await loadBattleViewModule()
  return { default: module.BattleView }
})

type BattlePhaseProps = {
  sessionActorRef: BattleSessionActorRef
  fastStage?: boolean
  invincible?: boolean
}

export function BattlePhase({ sessionActorRef, fastStage, invincible }: BattlePhaseProps) {
  const isLoading = useSelector(sessionActorRef, (snapshot) => snapshot.matches('battleLoading'))
  const isBattle = useSelector(sessionActorRef, (snapshot) => snapshot.matches('battle'))
  const difficulty = useSelector(sessionActorRef, (snapshot) => snapshot.context.difficulty)
  const selectedCharacterId = useSelector(
    sessionActorRef,
    (snapshot) => snapshot.context.selectedCharacterId,
  )
  const stageNumber = useSelector(
    sessionActorRef,
    (snapshot) => snapshot.context.currentStageNumber,
  )
  const battleSeed = useSelector(sessionActorRef, (snapshot) => snapshot.context.battleSeed)
  const stage = createBattleStageDefinition(stageNumber, difficulty, { fastStage })
  const character = resolvePlayableCharacter(selectedCharacterId)

  return (
    <main className={styles.battleRoot}>
      {isLoading ? (
        <BattleLoadingScreen
          sessionActorRef={sessionActorRef}
          stage={stage}
          character={character}
        />
      ) : null}

      {isBattle ? (
        <Suspense fallback={<div className={styles.battleLoadingFallback}>Loading Battle</div>}>
          <BattleView
            key={`${difficulty}-${character.id}-${stage.id}-${battleSeed}-${fastStage}-${invincible}`}
            difficulty={difficulty}
            stage={stage}
            character={character}
            fastStage={fastStage}
            invincible={invincible}
            onComplete={(result) => sessionActorRef.send({ type: 'BATTLE_COMPLETED', result })}
            onExitBattle={() => sessionActorRef.send({ type: 'RETURN_TO_TITLE' })}
          />
        </Suspense>
      ) : null}
    </main>
  )
}
