# Battle Session XState Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the app-level battle session flow from scattered React `useState` calls to a focused XState machine.

**Architecture:** Add a pure `battleSessionMachine` that owns app session state and transitions. Keep the real-time battle runtime, asset preload flow, viewport tracking, query debug flags, and storage side effects in React. Wire `App.tsx` to the machine with `useMachine` while preserving existing screen components and integration behavior.

**Tech Stack:** TypeScript, React 19, XState 5, `@xstate/react`, Vitest, React Testing Library, Vite.

---

## File Structure

- Create `src/app/battleSessionMachine.ts`: XState machine, context/event/input types, transition guards, and context assignment actions.
- Create `src/app/battleSessionMachine.test.ts`: pure state machine tests using `createActor` from `xstate`.
- Modify `src/app/App.tsx`: replace session-owned `useState` values with `useMachine(battleSessionMachine, { input })`.
- Modify `src/app/App.test.tsx`: only if existing tests need small assertion updates after the state source changes.
- Keep `src/game/runtime/battleRuntime.ts` unchanged. It remains the per-frame simulation engine.

---

### Task 1: Add Failing Machine Tests

**Files:**
- Create: `src/app/battleSessionMachine.test.ts`
- Test: `src/app/battleSessionMachine.test.ts`

- [ ] **Step 1: Create pure machine tests**

Create `src/app/battleSessionMachine.test.ts`:

```ts
import { createActor } from 'xstate'
import { describe, expect, it } from 'vitest'

import { battleSessionMachine } from './battleSessionMachine'
import type { Difficulty, RunResult } from '../game/types'

function createResult(overrides: Partial<RunResult> = {}): RunResult {
  return {
    outcome: 'victory',
    stageId: 'stage-1',
    stageName: 'Brass Cloud Gate',
    stageNumber: 1,
    difficulty: 'normal',
    duration: 12.5,
    remainingHp: 2,
    hitsTaken: 1,
    ...overrides,
  }
}

function createService(selectedCharacterId = 'lyra-aer') {
  const service = createActor(battleSessionMachine, {
    input: { selectedCharacterId },
  })

  service.start()
  return service
}

function deployToBattle(service: ReturnType<typeof createService>, difficulty: Difficulty = 'normal') {
  service.send({ type: 'START_SORTIE' })
  service.send({ type: 'SELECT_DIFFICULTY', difficulty })
  service.send({ type: 'DEPLOY_CHARACTER' })
  service.send({ type: 'DEPLOY_CHARACTER' })
  service.send({ type: 'BATTLE_ASSETS_READY' })
}

describe('battleSessionMachine', () => {
  it('starts at the title with the provided character selection', () => {
    const service = createService('fallback-pilot')

    expect(service.getSnapshot().matches('title')).toBe(true)
    expect(service.getSnapshot().context).toMatchObject({
      difficulty: 'normal',
      selectedCharacterId: 'fallback-pilot',
      currentStageNumber: 1,
      battleSeed: 0,
      result: null,
    })
  })

  it('moves from title to difficulty selection', () => {
    const service = createService()

    service.send({ type: 'START_SORTIE' })

    expect(service.getSnapshot().matches('difficultySelect')).toBe(true)
    expect(service.getSnapshot().context.currentStageNumber).toBe(1)
    expect(service.getSnapshot().context.result).toBeNull()
  })

  it('stores difficulty and moves to character selection', () => {
    const service = createService()

    service.send({ type: 'START_SORTIE' })
    service.send({ type: 'SELECT_DIFFICULTY', difficulty: 'hard' })

    expect(service.getSnapshot().matches('characterSelect')).toBe(true)
    expect(service.getSnapshot().context.difficulty).toBe('hard')
  })

  it('updates character selection without leaving character selection', () => {
    const service = createService()

    service.send({ type: 'START_SORTIE' })
    service.send({ type: 'SELECT_DIFFICULTY', difficulty: 'easy' })
    service.send({ type: 'SELECT_CHARACTER', characterId: 'fallback-pilot' })

    expect(service.getSnapshot().matches('characterSelect')).toBe(true)
    expect(service.getSnapshot().context.selectedCharacterId).toBe('fallback-pilot')
  })

  it('deploys from character selection to stage intro and then battle loading', () => {
    const service = createService()

    service.send({ type: 'START_SORTIE' })
    service.send({ type: 'SELECT_DIFFICULTY', difficulty: 'normal' })
    service.send({ type: 'DEPLOY_CHARACTER' })

    expect(service.getSnapshot().matches('stageIntro')).toBe(true)

    service.send({ type: 'DEPLOY_CHARACTER' })

    expect(service.getSnapshot().matches('battleLoading')).toBe(true)
    expect(service.getSnapshot().context.currentStageNumber).toBe(1)
  })

  it('moves from battle loading to battle after assets are ready', () => {
    const service = createService()

    service.send({ type: 'START_SORTIE' })
    service.send({ type: 'SELECT_DIFFICULTY', difficulty: 'normal' })
    service.send({ type: 'DEPLOY_CHARACTER' })
    service.send({ type: 'DEPLOY_CHARACTER' })
    service.send({ type: 'BATTLE_ASSETS_READY' })

    expect(service.getSnapshot().matches('battle')).toBe(true)
  })

  it('advances directly to stage 2 loading after stage 1 victory', () => {
    const service = createService()
    deployToBattle(service)

    service.send({ type: 'BATTLE_COMPLETED', result: createResult() })

    expect(service.getSnapshot().matches('battleLoading')).toBe(true)
    expect(service.getSnapshot().context.currentStageNumber).toBe(2)
    expect(service.getSnapshot().context.battleSeed).toBe(1)
    expect(service.getSnapshot().context.result).toBeNull()
  })

  it('stores stage 2 victory and moves to result', () => {
    const service = createService()
    deployToBattle(service)

    service.send({ type: 'BATTLE_COMPLETED', result: createResult() })
    service.send({ type: 'BATTLE_ASSETS_READY' })
    service.send({
      type: 'BATTLE_COMPLETED',
      result: createResult({
        stageId: 'stage-2',
        stageName: 'Burning Ruin Corridor',
        stageNumber: 2,
      }),
    })

    expect(service.getSnapshot().matches('result')).toBe(true)
    expect(service.getSnapshot().context.result).toMatchObject({
      outcome: 'victory',
      stageNumber: 2,
    })
  })

  it('stores defeat and moves to result', () => {
    const service = createService()
    deployToBattle(service, 'hard')

    service.send({
      type: 'BATTLE_COMPLETED',
      result: createResult({
        outcome: 'defeat',
        difficulty: 'hard',
        remainingHp: 0,
        hitsTaken: 3,
      }),
    })

    expect(service.getSnapshot().matches('result')).toBe(true)
    expect(service.getSnapshot().context.result).toMatchObject({
      outcome: 'defeat',
      difficulty: 'hard',
    })
  })

  it('retries the result stage and clears the stored result', () => {
    const service = createService()
    deployToBattle(service)

    service.send({
      type: 'BATTLE_COMPLETED',
      result: createResult({
        outcome: 'defeat',
        stageId: 'stage-2',
        stageName: 'Burning Ruin Corridor',
        stageNumber: 2,
      }),
    })
    service.send({ type: 'RETRY_STAGE' })

    expect(service.getSnapshot().matches('battleLoading')).toBe(true)
    expect(service.getSnapshot().context.currentStageNumber).toBe(2)
    expect(service.getSnapshot().context.battleSeed).toBe(1)
    expect(service.getSnapshot().context.result).toBeNull()
  })

  it('returns to title and resets result-stage context', () => {
    const service = createService()
    deployToBattle(service)

    service.send({
      type: 'BATTLE_COMPLETED',
      result: createResult({ outcome: 'defeat', remainingHp: 0 }),
    })
    service.send({ type: 'RETURN_TO_TITLE' })

    expect(service.getSnapshot().matches('title')).toBe(true)
    expect(service.getSnapshot().context.currentStageNumber).toBe(1)
    expect(service.getSnapshot().context.result).toBeNull()
  })
})
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
npm test -- src/app/battleSessionMachine.test.ts
```

Expected: FAIL because `src/app/battleSessionMachine.ts` does not exist.

- [ ] **Step 3: Commit the failing tests**

Run:

```bash
git add src/app/battleSessionMachine.test.ts
git commit -m "Add battle session machine tests"
```

Expected: commit succeeds with only the new failing test file staged.

---

### Task 2: Implement The Battle Session Machine

**Files:**
- Create: `src/app/battleSessionMachine.ts`
- Test: `src/app/battleSessionMachine.test.ts`

- [ ] **Step 1: Add the machine implementation**

Create `src/app/battleSessionMachine.ts`:

```ts
import { assign, setup } from 'xstate'

import type { Difficulty, RunResult } from '../game/types'

export type BattleStageNumber = 1 | 2

export type BattleSessionInput = {
  selectedCharacterId: string
}

export type BattleSessionContext = {
  difficulty: Difficulty
  selectedCharacterId: string
  currentStageNumber: BattleStageNumber
  battleSeed: number
  result: RunResult | null
}

export type BattleSessionEvent =
  | { type: 'START_SORTIE' }
  | { type: 'SELECT_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'SELECT_CHARACTER'; characterId: string }
  | { type: 'DEPLOY_CHARACTER' }
  | { type: 'BATTLE_ASSETS_READY' }
  | { type: 'BATTLE_COMPLETED'; result: RunResult }
  | { type: 'RETRY_STAGE' }
  | { type: 'RETURN_TO_TITLE' }

export const battleSessionMachine = setup({
  types: {} as {
    context: BattleSessionContext
    events: BattleSessionEvent
    input: BattleSessionInput
  },
  guards: {
    completedStageOneVictory: ({ event }) =>
      event.type === 'BATTLE_COMPLETED' &&
      event.result.outcome === 'victory' &&
      event.result.stageNumber === 1,
  },
  actions: {
    resetForNewSortie: assign({
      currentStageNumber: 1,
      result: null,
    }),
    selectDifficulty: assign(({ event }) => {
      if (event.type !== 'SELECT_DIFFICULTY') {
        return {}
      }

      return {
        difficulty: event.difficulty,
      }
    }),
    selectCharacter: assign(({ event }) => {
      if (event.type !== 'SELECT_CHARACTER') {
        return {}
      }

      return {
        selectedCharacterId: event.characterId,
      }
    }),
    prepareStageOneBattle: assign({
      currentStageNumber: 1,
    }),
    advanceToStageTwo: assign(({ context }) => ({
      currentStageNumber: 2,
      battleSeed: context.battleSeed + 1,
      result: null,
    })),
    storeBattleResult: assign(({ event }) => {
      if (event.type !== 'BATTLE_COMPLETED') {
        return {}
      }

      return {
        result: event.result,
      }
    }),
    retryResultStage: assign(({ context }) => {
      if (!context.result) {
        return {}
      }

      return {
        currentStageNumber: context.result.stageNumber === 2 ? 2 : 1,
        battleSeed: context.battleSeed + 1,
        result: null,
      }
    }),
    returnToTitle: assign({
      currentStageNumber: 1,
      result: null,
    }),
  },
}).createMachine({
  id: 'battleSession',
  initial: 'title',
  context: ({ input }) => ({
    difficulty: 'normal',
    selectedCharacterId: input.selectedCharacterId,
    currentStageNumber: 1,
    battleSeed: 0,
    result: null,
  }),
  states: {
    title: {
      on: {
        START_SORTIE: {
          target: 'difficultySelect',
          actions: 'resetForNewSortie',
        },
      },
    },
    difficultySelect: {
      on: {
        SELECT_DIFFICULTY: {
          target: 'characterSelect',
          actions: 'selectDifficulty',
        },
      },
    },
    characterSelect: {
      on: {
        SELECT_CHARACTER: {
          actions: 'selectCharacter',
        },
        DEPLOY_CHARACTER: {
          target: 'stageIntro',
        },
      },
    },
    stageIntro: {
      on: {
        DEPLOY_CHARACTER: {
          target: 'battleLoading',
          actions: 'prepareStageOneBattle',
        },
      },
    },
    battleLoading: {
      on: {
        BATTLE_ASSETS_READY: {
          target: 'battle',
        },
      },
    },
    battle: {
      on: {
        BATTLE_COMPLETED: [
          {
            guard: 'completedStageOneVictory',
            target: 'battleLoading',
            actions: 'advanceToStageTwo',
          },
          {
            target: 'result',
            actions: 'storeBattleResult',
          },
        ],
      },
    },
    result: {
      on: {
        RETRY_STAGE: {
          target: 'battleLoading',
          actions: 'retryResultStage',
        },
        RETURN_TO_TITLE: {
          target: 'title',
          actions: 'returnToTitle',
        },
      },
    },
  },
})
```

- [ ] **Step 2: Run the machine tests**

Run:

```bash
npm test -- src/app/battleSessionMachine.test.ts
```

Expected: PASS. If TypeScript errors show that action bodies cannot mutate context directly, replace mutating action bodies with `assign(...)` actions from XState while preserving the same context updates.

- [ ] **Step 3: Run typecheck for the new file**

Run:

```bash
npm run typecheck
```

Expected: existing app still typechecks or fails only because `battleSessionMachine.ts` action typing needs adjustment. Fix machine typing before moving to `App.tsx`.

- [ ] **Step 4: Commit the machine implementation**

Run:

```bash
git add src/app/battleSessionMachine.ts src/app/battleSessionMachine.test.ts
git commit -m "Add battle session state machine"
```

Expected: commit succeeds with the machine and its tests.

---

### Task 3: Wire App To The Machine

**Files:**
- Modify: `src/app/App.tsx`
- Test: `src/app/App.test.tsx`
- Test: `src/app/battleSessionMachine.test.ts`

- [ ] **Step 1: Replace session state imports**

In `src/app/App.tsx`, replace the first import and add machine imports.

Change:

```ts
import { lazy, Suspense, startTransition, useEffect, useMemo, useState } from 'react'
```

To:

```ts
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useMachine } from '@xstate/react'
```

Remove `AppScreen` and `RunResult` from the game type import.

Change:

```ts
import type { AppScreen, Difficulty, RunResult, StageDefinition } from '../game/types'
```

To:

```ts
import type { StageDefinition } from '../game/types'
```

Add:

```ts
import { battleSessionMachine } from './battleSessionMachine'
```

- [ ] **Step 2: Replace scattered session state in `App`**

In `App`, replace:

```ts
  const [screen, setScreen] = useState<AppScreen>('title')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [selectedCharacterId, setSelectedCharacterId] = useState(() =>
    resolveCharacterId(readLastCharacterId()),
  )
  const selectedCharacter = resolvePlayableCharacter(selectedCharacterId)
  const characterRoster = getCharacterSelectRoster(selectedCharacter.id)
  const [result, setResult] = useState<RunResult | null>(null)
  const [battleSeed, setBattleSeed] = useState(0)
  const [currentStageNumber, setCurrentStageNumber] = useState<1 | 2>(1)
```

With:

```ts
  const [sessionSnapshot, sendSession] = useMachine(battleSessionMachine, {
    input: {
      selectedCharacterId: resolveCharacterId(readLastCharacterId()),
    },
  })
  const {
    difficulty,
    selectedCharacterId,
    currentStageNumber,
    battleSeed,
    result,
  } = sessionSnapshot.context
  const selectedCharacter = resolvePlayableCharacter(selectedCharacterId)
  const characterRoster = getCharacterSelectRoster(selectedCharacter.id)
```

- [ ] **Step 3: Remove the `startScreen` helper**

Delete this helper from `App.tsx`:

```ts
  const startScreen = (nextScreen: AppScreen) => {
    startTransition(() => setScreen(nextScreen))
  }
```

The machine transition replaces this helper.

- [ ] **Step 4: Update battle rendering branch**

Replace:

```ts
  if (screen === 'battle') {
```

With:

```ts
  if (sessionSnapshot.matches('battle')) {
```

Inside `BattleView`, replace the `onComplete` body:

```ts
            onComplete={(nextResult) => {
              if (nextResult.outcome === 'victory' && nextResult.stageNumber === 1) {
                setResult(null)
                setCurrentStageNumber(2)
                setBattleSeed((current) => current + 1)
                startScreen('battle-loading')
                return
              }

              setResult(nextResult)
              startScreen('result')
            }}
```

With:

```ts
            onComplete={(nextResult) => {
              sendSession({ type: 'BATTLE_COMPLETED', result: nextResult })
            }}
```

- [ ] **Step 5: Update battle loading branch**

Replace:

```ts
  if (screen === 'battle-loading') {
```

With:

```ts
  if (sessionSnapshot.matches('battleLoading')) {
```

Replace:

```ts
          onReady={() => startScreen('battle')}
```

With:

```ts
          onReady={() => sendSession({ type: 'BATTLE_ASSETS_READY' })}
```

- [ ] **Step 6: Update menu rendering conditions and handlers**

In the menu JSX, replace each `screen` condition and callback.

Title:

```ts
          {sessionSnapshot.matches('title') ? (
            <TitleScreen
              onStart={() => {
                sendSession({ type: 'START_SORTIE' })
              }}
            />
          ) : null}
```

Difficulty:

```ts
          {sessionSnapshot.matches('difficultySelect') ? (
            <DifficultySelectScreen
              onSelectDifficulty={(nextDifficulty) => {
                sendSession({ type: 'SELECT_DIFFICULTY', difficulty: nextDifficulty })
              }}
            />
          ) : null}
```

Character:

```ts
          {sessionSnapshot.matches('characterSelect') ? (
            <CharacterSelectScreen
              selectedCharacter={selectedCharacter}
              characterRoster={characterRoster}
              onSelectCharacter={(nextCharacterId) => {
                sendSession({ type: 'SELECT_CHARACTER', characterId: nextCharacterId })
              }}
              onDeploy={() => {
                writeLastCharacterId(selectedCharacter.id)
                sendSession({ type: 'DEPLOY_CHARACTER' })
              }}
            />
          ) : null}
```

Stage intro:

```ts
          {sessionSnapshot.matches('stageIntro') ? (
            <StageIntroScreen
              difficulty={difficulty}
              selectedCharacter={selectedCharacter}
              onDeploy={() => {
                sendSession({ type: 'DEPLOY_CHARACTER' })
              }}
            />
          ) : null}
```

Result:

```ts
          {sessionSnapshot.matches('result') && result ? (
            <ResultScreen
              result={result}
              onRetry={() => {
                sendSession({ type: 'RETRY_STAGE' })
              }}
              onReturnToTitle={() => {
                sendSession({ type: 'RETURN_TO_TITLE' })
              }}
            />
          ) : null}
```

- [ ] **Step 7: Run focused app tests**

Run:

```bash
npm test -- src/app/battleSessionMachine.test.ts src/app/App.test.tsx
```

Expected: PASS. The existing app tests should still prove Stage 1 auto-advances to Stage 2, Stage 2 result displays, failed Stage 2 retry reloads Stage 2, and character selection storage behavior still works.

- [ ] **Step 8: Commit the App migration**

Run:

```bash
git add src/app/App.tsx src/app/App.test.tsx src/app/battleSessionMachine.ts src/app/battleSessionMachine.test.ts
git commit -m "Migrate battle session flow to XState"
```

Expected: commit succeeds. If `src/app/App.test.tsx` did not change, omit it from the staged paths.

---

### Task 4: Verification And Cleanup

**Files:**
- Modify: only files required by verification failures.
- Test: app and project verification commands.

- [ ] **Step 1: Confirm XState dependencies are staged with the migration**

Run:

```bash
git diff -- package.json package-lock.json
```

Expected: diff includes only `xstate` and `@xstate/react` dependency additions plus lockfile entries.

- [ ] **Step 2: Run focused tests**

Run:

```bash
npm test -- src/app/battleSessionMachine.test.ts src/app/App.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Run production build**

Run:

```bash
npm run build
```

Expected: PASS and Vite writes the production build to `dist`.

- [ ] **Step 6: Inspect final diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: intended changes only:

- `package.json`
- `package-lock.json`
- `src/app/App.tsx`
- `src/app/battleSessionMachine.ts`
- `src/app/battleSessionMachine.test.ts`
- `src/app/App.test.tsx` only if test expectations changed

- [ ] **Step 7: Commit dependency and cleanup changes**

If `package.json` and `package-lock.json` are still uncommitted, stage them with any remaining intended app files:

```bash
git add package.json package-lock.json src/app/App.tsx src/app/battleSessionMachine.ts src/app/battleSessionMachine.test.ts src/app/App.test.tsx
git commit -m "Install XState battle session dependencies"
```

If the app migration commit already included every intended file, do not create an empty commit.

---

## Self-Review

Spec coverage:

- App-level session machine: Tasks 1-3.
- Machine owns screen, difficulty, character id, stage number, battle seed, and result: Tasks 1-2.
- React keeps viewport, query flags, stage creation, lazy BattleView, and storage side effects: Task 3.
- Battle runtime remains unchanged: File structure and Task 3 boundaries.
- Stage 1 victory skips result and starts Stage 2: Tasks 1 and 3.
- Stage 2 victory/defeat goes to result: Tasks 1 and 3.
- Retry and return-to-title behavior: Tasks 1 and 3.
- Verification commands: Task 4.

Placeholder scan:

- No placeholder markers remain.
- Every code-changing task includes concrete file paths, code snippets, commands, and expected results.

Type consistency:

- Machine state ids use camelCase XState ids: `difficultySelect`, `characterSelect`, `stageIntro`, `battleLoading`.
- Machine events use the approved uppercase event names.
- `RunResult.stageNumber` is treated as the source of retry stage truth.
- The existing `AppScreen` union can remain in `src/game/types.ts` for other code, but `App.tsx` no longer needs to import it.
