# Battle Session XState Design

## Goal

Move the app-level battle session flow to XState so screen progression, stage transitions, retry behavior, and battle completion handling are explicit and testable.

The real-time battle runtime should remain a lightweight imperative engine. XState owns the session state around the battle, not every frame of combat simulation.

## Current Problem

`src/app/App.tsx` currently coordinates the app flow with several separate React state values:

- `screen`
- `difficulty`
- `selectedCharacterId`
- `result`
- `battleSeed`
- `currentStageNumber`

That flow is still manageable, but it is getting harder to reason about because stage progression and screen progression are coupled through ad hoc callbacks. Stage 1 victory skips the result screen and starts Stage 2, while Stage 2 victory and defeats go to the result screen. Retry and title-return paths also mutate several values together.

These transitions should be modeled as one state machine so impossible screen states are harder to represent.

## Approved Direction

Create an app-level battle session machine.

The machine will live outside React rendering code and will own:

- Which session screen is active.
- The selected difficulty.
- The selected character id.
- The current stage number.
- The current battle seed.
- The last battle result, when a result screen is active.

React remains responsible for:

- Reading viewport dimensions.
- Reading query-string debug flags.
- Resolving the selected character definition.
- Creating the current stage definition from difficulty, stage number, and debug flags.
- Lazy-loading and rendering `BattleView`.
- Writing the selected character id to storage at the existing deploy point.

The battle runtime remains responsible for:

- Per-frame updates.
- Player movement.
- Bullet, enemy, boss, collision, special attack, and event-timeline simulation.
- Producing `RunResult` when a battle completes.

## Machine States

The machine should represent the existing `AppScreen` states directly:

```ts
type BattleSessionState =
  | 'title'
  | 'difficultySelect'
  | 'characterSelect'
  | 'stageIntro'
  | 'battleLoading'
  | 'battle'
  | 'result'
```

The UI can keep using the existing route-free screen rendering model. Only the state source changes.

## Machine Context

Initial context:

```ts
type BattleSessionContext = {
  difficulty: Difficulty
  selectedCharacterId: string
  currentStageNumber: 1 | 2
  battleSeed: number
  result: RunResult | null
}
```

`selectedCharacterId` should be initialized by the React boundary from `resolveCharacterId(readLastCharacterId())`. This keeps storage access out of the machine and makes the machine easier to test.

## Events

Initial event set:

```ts
type BattleSessionEvent =
  | { type: 'START_SORTIE' }
  | { type: 'SELECT_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'SELECT_CHARACTER'; characterId: string }
  | { type: 'DEPLOY_CHARACTER' }
  | { type: 'BATTLE_ASSETS_READY' }
  | { type: 'BATTLE_COMPLETED'; result: RunResult }
  | { type: 'RETRY_STAGE' }
  | { type: 'RETURN_TO_TITLE' }
```

The names should describe user or runtime intent rather than implementation details.

## Transitions

Primary flow:

```text
title --START_SORTIE--> difficultySelect
difficultySelect --SELECT_DIFFICULTY--> characterSelect
characterSelect --SELECT_CHARACTER--> characterSelect
characterSelect --DEPLOY_CHARACTER--> stageIntro
stageIntro --DEPLOY_CHARACTER--> battleLoading
battleLoading --BATTLE_ASSETS_READY--> battle
battle --BATTLE_COMPLETED--> battleLoading | result
result --RETRY_STAGE--> battleLoading
result --RETURN_TO_TITLE--> title
```

`BATTLE_COMPLETED` has one branch:

- If the result is Stage 1 victory, clear `result`, set `currentStageNumber` to `2`, increment `battleSeed`, and transition to `battleLoading`.
- Otherwise, store the result and transition to `result`.

`RETRY_STAGE` should use the stored result:

- Set `currentStageNumber` to the completed or failed result stage number.
- Increment `battleSeed`.
- Clear `result`.
- Transition to `battleLoading`.

`RETURN_TO_TITLE` should reset the session shell:

- Set `currentStageNumber` to `1`.
- Clear `result`.
- Transition to `title`.

## Files

Add:

- `src/app/battleSessionMachine.ts`
- `src/app/battleSessionMachine.test.ts`

Modify:

- `src/app/App.tsx`
- `src/app/App.test.tsx` only if existing expectations need small updates after the state source changes.

Do not migrate `src/game/runtime/battleRuntime.ts` to XState in this task. It is intentionally out of scope.

## React Integration

`App.tsx` should replace the session-related `useState` calls with `useMachine` from `@xstate/react`.

The rendering branches should read:

- `snapshot.matches('battle')`
- `snapshot.matches('battleLoading')`
- menu states for title, difficulty, character, intro, and result
- context values for difficulty, selected character id, battle seed, current stage number, and result

Event handlers should send machine events:

- Title start button sends `START_SORTIE`.
- Difficulty button sends `SELECT_DIFFICULTY`.
- Character card sends `SELECT_CHARACTER`.
- Character deploy writes storage, then sends `DEPLOY_CHARACTER`.
- Stage intro deploy sends `DEPLOY_CHARACTER`.
- Battle loading completion sends `BATTLE_ASSETS_READY`.
- Battle completion sends `BATTLE_COMPLETED`.
- Result retry sends `RETRY_STAGE`.
- Result title return sends `RETURN_TO_TITLE`.

## Testing

Add pure machine tests for:

- Title to difficulty selection flow.
- Difficulty selection updates context and moves to character selection.
- Character selection updates context without leaving character selection.
- Character deploy moves to stage intro.
- Stage intro deploy moves to battle loading.
- Battle asset readiness moves to battle.
- Stage 1 victory advances directly to Stage 2 battle loading without storing a visible result.
- Stage 2 victory stores the result and moves to result.
- Defeat stores the result and moves to result.
- Retry uses `result.stageNumber`, increments `battleSeed`, clears result, and moves to battle loading.
- Return to title clears result and resets to Stage 1.

Keep the existing app integration tests that prove:

- Stage 1 victory starts Stage 2 without showing results.
- Stage 2 victory shows the final result.
- Failed Stage 2 retry loads Stage 2 again.
- Character selection and saved-character fallback behavior still works.

Verification commands:

```bash
npm test -- src/app/battleSessionMachine.test.ts src/app/App.test.tsx
npm run typecheck
npm run build
```

## Out Of Scope

- Migrating the combat simulation loop to XState.
- Refactoring `BattleView` pause/settings overlay state.
- Adding more stages.
- Changing stage content or event timeline behavior.
- Changing route structure or introducing URL-driven navigation.

## Risks

The main risk is accidentally changing the current stage progression behavior while moving state ownership. This is covered by pure machine tests plus the existing `App.test.tsx` integration checks.

Another risk is putting storage side effects inside the machine too early. The first migration should keep storage writes at the React boundary so the machine remains deterministic and easy to test.
