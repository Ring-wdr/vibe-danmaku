# Character Select Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a character-select step between difficulty selection and the current battle screen, with a catalog structure that can grow beyond one playable character and a fallback item for invalid saved ids.

**Architecture:** Character data moves into a focused catalog module. App state stores a selected character id and resolves it through the catalog before stage intro and battle. The battle runtime receives a resolved `CharacterDefinition` instead of importing the single `stagePilot`, while the UI uses the selected character for portrait and sprite rendering.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, React Testing Library, React Three Fiber, localStorage.

---

## File Structure

- Create `src/game/content/characters.ts`: owns playable character catalog, fallback item, id resolution helpers, and UI metadata for the selection screen.
- Create `src/game/content/characters.test.ts`: covers default, fallback, and selector roster behavior.
- Create `src/app/characterSelectionStorage.ts`: small browser-storage boundary for reading and writing the last character id.
- Create `src/app/characterSelectionStorage.test.ts`: covers storage key, successful reads/writes, and storage failure tolerance.
- Modify `src/game/content/stage1.ts`: remove `stagePilot` and keep Stage 1 focused on stage content only.
- Modify `src/game/runtime/battleRuntime.ts`: accept `character` in runtime options and use it for movement and auto-fire.
- Modify `src/game/runtime/battleRuntime.test.ts`: pass Lyra into existing runtime fixtures and add injected-character behavior tests.
- Modify `src/game/ui/useBattleRuntime.ts`: accept `character` and pass it into `createBattleRuntime`.
- Modify `src/game/ui/BattleView.tsx`: accept `character`, pass it into the hook, and render the selected sprite sheet.
- Modify `src/game/ui/BattleView.test.ts`: provide a test character prop and assert the hook receives it.
- Modify `src/game/types.ts`: add `character-select` to `AppScreen`.
- Modify `src/app/App.tsx`: insert the Focus Card character selection screen, persist selection on Deploy, and pass the selected character to stage intro and battle.
- Modify `src/app/App.test.tsx`: cover the new flow, default selection, invalid saved id fallback, and Deploy persistence.
- Modify `src/style.css`: add character-select Focus Card styles while preserving current mobile shell behavior.

---

### Task 1: Character Catalog

**Files:**
- Create: `src/game/content/characters.ts`
- Create: `src/game/content/characters.test.ts`

- [ ] **Step 1: Write the failing catalog tests**

Create `src/game/content/characters.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  defaultCharacterId,
  fallbackCharacter,
  getCharacterSelectRoster,
  isPlayableCharacterId,
  playableCharacters,
  resolveCharacterId,
  resolvePlayableCharacter,
} from './characters'

describe('character catalog', () => {
  it('registers Lyra as the only normal playable character for this pass', () => {
    expect(defaultCharacterId).toBe('lyra-aer')
    expect(playableCharacters).toHaveLength(1)
    expect(playableCharacters[0]).toMatchObject({
      id: 'lyra-aer',
      name: 'Lyra Aer',
      title: 'Aether Weaver',
      frameCount: 4,
      isFallback: false,
    })
  })

  it('resolves empty selection to the default character and invalid saved ids to fallback', () => {
    expect(resolveCharacterId(null)).toBe(defaultCharacterId)
    expect(resolveCharacterId(undefined)).toBe(defaultCharacterId)
    expect(resolveCharacterId('')).toBe(defaultCharacterId)
    expect(resolveCharacterId('deleted-character')).toBe(fallbackCharacter.id)
  })

  it('resolves character definitions with safe fallback stats', () => {
    expect(resolvePlayableCharacter('lyra-aer').name).toBe('Lyra Aer')

    const resolvedFallback = resolvePlayableCharacter('deleted-character')

    expect(resolvedFallback).toBe(fallbackCharacter)
    expect(resolvedFallback.isFallback).toBe(true)
    expect(resolvedFallback.spriteSheetUrl).toBe(resolvePlayableCharacter('lyra-aer').spriteSheetUrl)
    expect(resolvedFallback.shot).toEqual(resolvePlayableCharacter('lyra-aer').shot)
  })

  it('keeps the fallback out of the normal roster until it is the active selection', () => {
    expect(isPlayableCharacterId('lyra-aer')).toBe(true)
    expect(isPlayableCharacterId(fallbackCharacter.id)).toBe(false)
    expect(getCharacterSelectRoster('lyra-aer').map((character) => character.id)).toEqual([
      'lyra-aer',
    ])
    expect(getCharacterSelectRoster(fallbackCharacter.id).map((character) => character.id)).toEqual([
      fallbackCharacter.id,
      'lyra-aer',
    ])
  })
})
```

- [ ] **Step 2: Run the catalog tests and verify they fail**

Run:

```powershell
npm run test -- src/game/content/characters.test.ts
```

Expected: FAIL because `src/game/content/characters.ts` does not exist.

- [ ] **Step 3: Implement the catalog module**

Create `src/game/content/characters.ts`:

```ts
import { gameAssets } from '../assets'
import type { CharacterDefinition } from '../types'

export type CharacterStat = {
  label: string
  value: string
  ratio: number
}

export type PlayableCharacter = CharacterDefinition & {
  portraitUrl: string
  description: string
  stats: CharacterStat[]
  isFallback: boolean
}

export const lyraAerCharacter: PlayableCharacter = {
  id: 'lyra-aer',
  name: 'Lyra Aer',
  title: 'Aether Weaver',
  spriteSheetUrl: gameAssets.playerSheetUrl,
  portraitUrl: gameAssets.playerPortraitUrl,
  description: 'Balanced sortie pilot with steady movement, rapid aether fire, and reliable beam charge.',
  frameCount: 4,
  moveRadius: {
    x: 3.85,
    minZ: -3.15,
    maxZ: -0.45,
  },
  shot: {
    interval: 0.12,
    speed: 5.4,
    power: 12,
  },
  stats: [
    { label: 'Mobility', value: 'Balanced', ratio: 0.78 },
    { label: 'Fire Rate', value: 'Rapid', ratio: 0.82 },
    { label: 'Power', value: 'Steady', ratio: 0.64 },
  ],
  isFallback: false,
}

export const fallbackCharacter: PlayableCharacter = {
  ...lyraAerCharacter,
  id: 'fallback-pilot',
  name: 'Reserve Pilot',
  title: 'Fallback Loadout',
  description: 'Safe reserve loadout restored because the last selected pilot is no longer available.',
  isFallback: true,
}

export const playableCharacters = [lyraAerCharacter] as const
export const defaultCharacterId = lyraAerCharacter.id

const playableCharacterMap = new Map<string, PlayableCharacter>(
  playableCharacters.map((character) => [character.id, character]),
)

export function isPlayableCharacterId(id: string | null | undefined) {
  return typeof id === 'string' && playableCharacterMap.has(id)
}

export function resolveCharacterId(id: string | null | undefined) {
  if (id === null || id === undefined || id === '') {
    return defaultCharacterId
  }

  if (isPlayableCharacterId(id)) {
    return id
  }

  return fallbackCharacter.id
}

export function resolvePlayableCharacter(id?: string | null): PlayableCharacter {
  const resolvedId = resolveCharacterId(id)

  return playableCharacterMap.get(resolvedId) ?? fallbackCharacter
}

export function getCharacterSelectRoster(selectedId: string): PlayableCharacter[] {
  if (selectedId === fallbackCharacter.id) {
    return [fallbackCharacter, ...playableCharacters]
  }

  return [...playableCharacters]
}
```

- [ ] **Step 4: Run the catalog tests and verify they pass**

Run:

```powershell
npm run test -- src/game/content/characters.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the catalog**

Run:

```powershell
git add -- src/game/content/characters.ts src/game/content/characters.test.ts
git commit -m "Add playable character catalog"
```

---

### Task 2: Last Character Storage Boundary

**Files:**
- Create: `src/app/characterSelectionStorage.ts`
- Create: `src/app/characterSelectionStorage.test.ts`

- [ ] **Step 1: Write the failing storage tests**

Create `src/app/characterSelectionStorage.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  lastCharacterStorageKey,
  readLastCharacterId,
  writeLastCharacterId,
} from './characterSelectionStorage'

describe('character selection storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('uses the stable last-character storage key', () => {
    expect(lastCharacterStorageKey).toBe('vibe-danmaku:last-character-id')
  })

  it('reads and writes the last selected character id', () => {
    writeLastCharacterId('lyra-aer')

    expect(window.localStorage.getItem(lastCharacterStorageKey)).toBe('lyra-aer')
    expect(readLastCharacterId()).toBe('lyra-aer')
  })

  it('returns null when no character has been saved', () => {
    expect(readLastCharacterId()).toBeNull()
  })

  it('tolerates unavailable storage without throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(readLastCharacterId()).toBeNull()
    expect(() => writeLastCharacterId('lyra-aer')).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the storage tests and verify they fail**

Run:

```powershell
npm run test -- src/app/characterSelectionStorage.test.ts
```

Expected: FAIL because `src/app/characterSelectionStorage.ts` does not exist.

- [ ] **Step 3: Implement storage helpers**

Create `src/app/characterSelectionStorage.ts`:

```ts
export const lastCharacterStorageKey = 'vibe-danmaku:last-character-id'

function getBrowserStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readLastCharacterId(storage = getBrowserStorage()) {
  if (!storage) {
    return null
  }

  try {
    return storage.getItem(lastCharacterStorageKey)
  } catch {
    return null
  }
}

export function writeLastCharacterId(characterId: string, storage = getBrowserStorage()) {
  if (!storage) {
    return
  }

  try {
    storage.setItem(lastCharacterStorageKey, characterId)
  } catch {
    // Storage can be disabled in private browser contexts. Selection still works in memory.
  }
}
```

- [ ] **Step 4: Run the storage tests and verify they pass**

Run:

```powershell
npm run test -- src/app/characterSelectionStorage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the storage boundary**

Run:

```powershell
git add -- src/app/characterSelectionStorage.ts src/app/characterSelectionStorage.test.ts
git commit -m "Add character selection storage"
```

---

### Task 3: Inject Character Into Battle Runtime

**Files:**
- Modify: `src/game/content/stage1.ts`
- Modify: `src/game/runtime/battleRuntime.ts`
- Modify: `src/game/runtime/battleRuntime.test.ts`

- [ ] **Step 1: Write failing runtime tests for injected character behavior**

In `src/game/runtime/battleRuntime.test.ts`, add this import:

```ts
import { lyraAerCharacter } from '../content/characters'
import type { CharacterDefinition, BulletPatternConfig, SpecialSlotId, StageDefinition } from '../types'
```

Replace the existing type import:

```ts
import type { BulletPatternConfig, SpecialSlotId, StageDefinition } from '../types'
```

with the combined import above.

Add these helpers near the stage fixture helpers:

```ts
const testPilot: CharacterDefinition = {
  ...lyraAerCharacter,
  id: 'test-pilot',
  name: 'Test Pilot',
  title: 'Runtime Fixture',
  moveRadius: {
    x: 1.25,
    minZ: -2.4,
    maxZ: -1.2,
  },
  shot: {
    interval: 0.5,
    speed: 6.2,
    power: 99,
  },
}

function createRuntime(options?: {
  difficulty?: Difficulty
  stage?: StageDefinition
  character?: CharacterDefinition
  invincible?: boolean
}) {
  const difficulty = options?.difficulty ?? 'normal'

  return createBattleRuntime({
    difficulty,
    stage: options?.stage ?? createStageDefinition(difficulty),
    character: options?.character ?? lyraAerCharacter,
    invincible: options?.invincible,
  })
}
```

Also add `Difficulty` to the type import:

```ts
import type {
  CharacterDefinition,
  BulletPatternConfig,
  Difficulty,
  SpecialSlotId,
  StageDefinition,
} from '../types'
```

Add these tests inside `describe('createBattleRuntime', () => { ... })`:

```ts
  it('uses the injected character movement radius while dragging', () => {
    const runtime = createRuntime({ character: testPilot })

    runtime.beginDrag({ x: 9, z: 0.8 })
    runtime.update(0.016)

    expect(runtime.getSnapshot().player.position).toEqual({
      x: 1.25,
      z: -1.2,
    })

    runtime.moveDrag({ x: -9, z: -9 })
    runtime.update(0.016)

    expect(runtime.getSnapshot().player.position).toEqual({
      x: -1.25,
      z: -2.4,
    })
  })

  it('uses the injected character shot cadence for auto fire', () => {
    const runtime = createRuntime({ character: testPilot })

    runtime.update(0.49)
    expect(runtime.getSnapshot().playerShots).toBe(1)

    runtime.update(0.49)
    expect(runtime.getSnapshot().playerShots).toBe(1)

    runtime.update(0.02)
    expect(runtime.getSnapshot().playerShots).toBe(2)
  })
```

Then replace existing `createBattleRuntime({ difficulty: 'normal', stage: ... })` calls in the file with `createRuntime({ stage: ... })`, and replace `createBattleRuntime({ difficulty: 'normal', stage, invincible: true })` with `createRuntime({ stage, invincible: true })`.

- [ ] **Step 2: Run the runtime tests and verify they fail**

Run:

```powershell
npm run test -- src/game/runtime/battleRuntime.test.ts
```

Expected: FAIL because `createBattleRuntime` does not accept `character` yet, and because `lyraAerCharacter` is not wired into old fixtures.

- [ ] **Step 3: Update `battleRuntime.ts` to accept a character**

In `src/game/runtime/battleRuntime.ts`, remove:

```ts
import { stagePilot } from '../content/stage1'
```

Add `CharacterDefinition` to the type import:

```ts
import type {
  ArenaPoint,
  BattleSnapshot,
  CharacterDefinition,
  Difficulty,
  EnemyWave,
  RenderBoss,
  RenderBullet,
  RenderEnemy,
  RenderSpecialBeam,
  RenderSpecialSlot,
  RunResult,
  SpecialSlotId,
  StageDefinition,
} from '../types'
```

Update `RuntimeOptions`:

```ts
type RuntimeOptions = {
  difficulty: Difficulty
  stage: StageDefinition
  character: CharacterDefinition
  invincible?: boolean
}
```

Update the runtime factory signature and pilot assignment:

```ts
export function createBattleRuntime({
  difficulty,
  stage,
  character,
  invincible = false,
}: RuntimeOptions) {
  const listeners = new Set<Listener>()
  const player = {
    x: 0,
    z: -1.85,
    hp: 3,
    invulnerableFor: 0,
    shotTimer: 0,
  }
  const pilot = character
```

- [ ] **Step 4: Remove the old Stage 1 pilot export**

In `src/game/content/stage1.ts`, remove `gameAssets` and `CharacterDefinition` imports.

Replace the current import block:

```ts
import { gameAssets } from '../assets'
import { resolveEnemyWave } from './enemies'
import type {
  BossDefinition,
  BulletPatternConfig,
  CharacterDefinition,
  Difficulty,
  StageDefinition,
} from '../types'
```

with:

```ts
import { resolveEnemyWave } from './enemies'
import type {
  BossDefinition,
  BulletPatternConfig,
  Difficulty,
  StageDefinition,
} from '../types'
```

Delete the `stagePilot` export at the bottom:

```ts
export const stagePilot: CharacterDefinition = {
  id: 'lyra-aer',
  name: 'Lyra Aer',
  title: 'Aether Weaver',
  spriteSheetUrl: gameAssets.playerSheetUrl,
  frameCount: 4,
  moveRadius: {
    x: 3.85,
    minZ: -3.15,
    maxZ: -0.45,
  },
  shot: {
    interval: 0.12,
    speed: 5.4,
    power: 12,
  },
}
```

- [ ] **Step 5: Run runtime tests and fix remaining compile errors**

Run:

```powershell
npm run test -- src/game/runtime/battleRuntime.test.ts src/game/content/stage1.test.ts
```

Expected: PASS after every runtime fixture passes a character.

- [ ] **Step 6: Commit runtime injection**

Run:

```powershell
git add -- src/game/content/stage1.ts src/game/runtime/battleRuntime.ts src/game/runtime/battleRuntime.test.ts
git commit -m "Inject playable character into battle runtime"
```

---

### Task 4: Pass Character Through Battle View

**Files:**
- Modify: `src/game/ui/useBattleRuntime.ts`
- Modify: `src/game/ui/BattleView.tsx`
- Modify: `src/game/ui/BattleView.test.ts`

- [ ] **Step 1: Write failing BattleView tests for character prop wiring**

In `src/game/ui/BattleView.test.ts`, add:

```ts
import { lyraAerCharacter } from '../content/characters'
```

Update the hoisted mock to include `mockUseBattleRuntime`:

```ts
const { mockActivateSpecial, mockSnapshot, mockUseBattleRuntime } = vi.hoisted(() => ({
  mockActivateSpecial: vi.fn(),
  mockUseBattleRuntime: vi.fn(),
  mockSnapshot: {
```

Replace the `vi.mock('./useBattleRuntime', ...)` block with:

```ts
vi.mock('./useBattleRuntime', () => ({
  useBattleRuntime: mockUseBattleRuntime,
}))
```

In `beforeEach`, add:

```ts
    mockUseBattleRuntime.mockReturnValue({
      runtime: {
        update: vi.fn(),
        beginDrag: vi.fn(),
        moveDrag: vi.fn(),
        endDrag: vi.fn(),
        activateSpecial: mockActivateSpecial,
      },
      snapshot: mockSnapshot,
    })
```

In every `BattleView` render, add `character: lyraAerCharacter`:

```ts
createElement(BattleView, {
  difficulty: 'normal',
  character: lyraAerCharacter,
  onComplete: vi.fn(),
})
```

Add this test inside `describe('BattleView', () => { ... })`:

```ts
  it('passes the selected character into the battle runtime hook', () => {
    render(
      createElement(BattleView, {
        difficulty: 'hard',
        character: lyraAerCharacter,
        fastStage: true,
        invincible: true,
        onComplete: vi.fn(),
      }),
    )

    expect(mockUseBattleRuntime).toHaveBeenCalledWith({
      difficulty: 'hard',
      character: lyraAerCharacter,
      fastStage: true,
      invincible: true,
    })
  })
```

- [ ] **Step 2: Run BattleView tests and verify they fail**

Run:

```powershell
npm run test -- src/game/ui/BattleView.test.ts
```

Expected: FAIL because `BattleView` and `useBattleRuntime` do not accept `character`.

- [ ] **Step 3: Update `useBattleRuntime`**

Replace `src/game/ui/useBattleRuntime.ts` with:

```ts
import { useState, useSyncExternalStore } from 'react'

import { createStageDefinition } from '../content/stage1'
import { createBattleRuntime } from '../runtime/battleRuntime'
import type { CharacterDefinition, Difficulty } from '../types'

type BattleRuntimeOptions = {
  difficulty: Difficulty
  character: CharacterDefinition
  fastStage?: boolean
  invincible?: boolean
}

export function useBattleRuntime(options: BattleRuntimeOptions) {
  const [runtime] = useState(() =>
    createBattleRuntime({
      difficulty: options.difficulty,
      stage: createStageDefinition(options.difficulty, { fastStage: options.fastStage }),
      character: options.character,
      invincible: options.invincible,
    }),
  )

  const snapshot = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot,
  )

  return { runtime, snapshot }
}
```

- [ ] **Step 4: Update `BattleView` prop and sprite rendering**

In `src/game/ui/BattleView.tsx`, add `CharacterDefinition` to the type import:

```ts
  CharacterDefinition,
```

Update `BattleViewProps`:

```ts
type BattleViewProps = {
  difficulty: Difficulty
  character: CharacterDefinition
  fastStage?: boolean
  invincible?: boolean
  onComplete: (result: RunResult) => void
}
```

Update `PlayerSprite` props and texture load:

```ts
function PlayerSprite({
  battleElapsed,
  position,
  spriteSheetUrl,
  specialActive = false,
}: {
  battleElapsed: number
  position: [number, number, number]
  spriteSheetUrl: string
  specialActive?: boolean
}) {
  const texture = useLoadedTexture(spriteSheetUrl)
```

Update `RuntimeEntityLayer`:

```ts
function RuntimeEntityLayer({
  snapshot,
  character,
}: {
  snapshot: BattleSnapshot
  character: CharacterDefinition
}) {
```

Update its `PlayerSprite` call:

```tsx
      <PlayerSprite
        battleElapsed={snapshot.elapsed}
        position={arenaPointToView(snapshot.player.position, 0.65)}
        spriteSheetUrl={character.spriteSheetUrl}
        specialActive={snapshot.specialSlots.some((slot) => slot.active)}
      />
```

Update `BattleScene`:

```ts
function BattleScene({
  snapshot,
  character,
}: {
  snapshot: BattleSnapshot
  character: CharacterDefinition
}) {
```

Update its entity layer call:

```tsx
      <RuntimeEntityLayer snapshot={snapshot} character={character} />
```

Update `BattleView` signature and hook call:

```ts
export function BattleView({
  difficulty,
  character,
  fastStage,
  invincible,
  onComplete,
}: BattleViewProps) {
  const { runtime, snapshot } = useBattleRuntime({
    difficulty,
    character,
    fastStage,
    invincible,
  })
```

Update the `BattleScene` usage:

```tsx
        <BattleScene snapshot={snapshot} character={character} />
```

- [ ] **Step 5: Run BattleView tests and verify they pass**

Run:

```powershell
npm run test -- src/game/ui/BattleView.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit BattleView wiring**

Run:

```powershell
git add -- src/game/ui/useBattleRuntime.ts src/game/ui/BattleView.tsx src/game/ui/BattleView.test.ts
git commit -m "Pass selected character into battle view"
```

---

### Task 5: Add Character Select App Flow

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`

- [ ] **Step 1: Write failing app flow tests**

Replace `src/app/App.test.tsx` with:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import { App } from './App'
import { lastCharacterStorageKey } from './characterSelectionStorage'

function renderApp(ui: ReactElement) {
  return render(ui, {
    wrapper: withNuqsTestingAdapter({ searchParams: '' }),
  })
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('moves from title to difficulty select to character select before stage intro', () => {
    renderApp(<App />)

    fireEvent.click(screen.getByRole('button', { name: /start sortie/i }))
    fireEvent.click(screen.getByRole('button', { name: /hard/i }))

    expect(screen.getByRole('heading', { name: /select pilot/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /lyra aer/i })).toBeInTheDocument()
    expect(screen.queryByText(/difficulty hard engaged/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /deploy lyra aer/i }))

    expect(screen.getByRole('heading', { name: /brass cloud gate/i })).toBeInTheDocument()
    expect(screen.getByText(/difficulty hard engaged/i)).toBeInTheDocument()
    expect(screen.getByText(/pilot lyra aer/i)).toBeInTheDocument()
    expect(screen.getByText(/전투 중 화면 어디든 드래그해 회피하세요/)).toBeInTheDocument()
  })

  it('uses the last saved character id as the default selection', () => {
    window.localStorage.setItem(lastCharacterStorageKey, 'lyra-aer')

    renderApp(<App />)

    fireEvent.click(screen.getByRole('button', { name: /start sortie/i }))
    fireEvent.click(screen.getByRole('button', { name: /normal/i }))

    expect(screen.getByRole('button', { name: /selected lyra aer/i })).toBeInTheDocument()
  })

  it('shows the fallback item when the saved character id is invalid', () => {
    window.localStorage.setItem(lastCharacterStorageKey, 'deleted-character')

    renderApp(<App />)

    fireEvent.click(screen.getByRole('button', { name: /start sortie/i }))
    fireEvent.click(screen.getByRole('button', { name: /easy/i }))

    expect(screen.getByRole('heading', { name: /reserve pilot/i })).toBeInTheDocument()
    expect(screen.getByText(/last selected pilot is no longer available/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /deploy reserve pilot/i }))

    expect(window.localStorage.getItem(lastCharacterStorageKey)).toBe('fallback-pilot')
    expect(screen.getByText(/pilot reserve pilot/i)).toBeInTheDocument()
  })

  it('shows portrait-only notice when the viewport is landscape', () => {
    renderApp(<App initialViewport={{ width: 900, height: 500 }} />)

    expect(screen.getByText(/portrait mode required/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run app tests and verify they fail**

Run:

```powershell
npm run test -- src/app/App.test.tsx
```

Expected: FAIL because the app has no `character-select` screen.

- [ ] **Step 3: Add the app screen type**

In `src/game/types.ts`, update `AppScreen`:

```ts
export type AppScreen =
  | 'title'
  | 'difficulty-select'
  | 'character-select'
  | 'stage-intro'
  | 'battle'
  | 'result'
```

- [ ] **Step 4: Update App imports and selected character state**

In `src/app/App.tsx`, add imports:

```ts
import {
  getCharacterSelectRoster,
  resolveCharacterId,
  resolvePlayableCharacter,
} from '../game/content/characters'
import { readLastCharacterId, writeLastCharacterId } from './characterSelectionStorage'
```

Add state after difficulty state:

```ts
  const [selectedCharacterId, setSelectedCharacterId] = useState(() =>
    resolveCharacterId(readLastCharacterId()),
  )
  const selectedCharacter = resolvePlayableCharacter(selectedCharacterId)
  const characterRoster = getCharacterSelectRoster(selectedCharacter.id)
```

- [ ] **Step 5: Pass character into BattleView**

Update the `BattleView` key and props in `src/app/App.tsx`:

```tsx
          <BattleView
            key={`${difficulty}-${selectedCharacter.id}-${battleSeed}-${debugFlags.fastStage}-${debugFlags.invincible}`}
            difficulty={difficulty}
            character={selectedCharacter}
            fastStage={debugFlags.fastStage}
            invincible={debugFlags.invincible}
            onComplete={(nextResult) => {
              setResult(nextResult)
              startScreen('result')
            }}
          />
```

- [ ] **Step 6: Route difficulty selection to character select**

In the difficulty-card `onClick`, replace:

```ts
                      startScreen('stage-intro')
```

with:

```ts
                      startScreen('character-select')
```

- [ ] **Step 7: Add the character-select screen**

Insert this screen between difficulty select and stage intro:

```tsx
          {screen === 'character-select' ? (
            <section className="screen character-select">
              <div className="section-heading">
                <p className="eyebrow">Select Pilot</p>
                <h2>Select Pilot</h2>
              </div>

              <div className="character-focus">
                <div className="character-focus__summary">
                  <div>
                    <p className="eyebrow">{selectedCharacter.isFallback ? 'Reserve' : 'Playable'}</p>
                    <h3>{selectedCharacter.name}</h3>
                    <strong>{selectedCharacter.title}</strong>
                  </div>
                  <img src={selectedCharacter.portraitUrl} alt={`${selectedCharacter.name} portrait`} />
                </div>

                <p className="character-focus__description">{selectedCharacter.description}</p>

                <div className="character-stat-list" aria-label={`${selectedCharacter.name} stats`}>
                  {selectedCharacter.stats.map((stat) => (
                    <div key={stat.label} className="character-stat">
                      <div>
                        <span>{stat.label}</span>
                        <strong>{stat.value}</strong>
                      </div>
                      <i style={{ width: `${Math.round(stat.ratio * 100)}%` }} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="character-roster" aria-label="Playable characters">
                {characterRoster.map((character) => {
                  const selected = character.id === selectedCharacter.id

                  return (
                    <button
                      key={character.id}
                      type="button"
                      className={`character-slot ${selected ? 'character-slot--selected' : ''}`}
                      aria-label={`${selected ? 'Selected' : 'Select'} ${character.name}`}
                      onClick={() => setSelectedCharacterId(character.id)}
                    >
                      <img src={character.portraitUrl} alt="" />
                      <span>{character.name}</span>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  writeLastCharacterId(selectedCharacter.id)
                  startScreen('stage-intro')
                }}
              >
                Deploy {selectedCharacter.name}
              </button>
            </section>
          ) : null}
```

- [ ] **Step 8: Show selected pilot on stage intro**

In the stage intro section, after the difficulty line:

```tsx
              <p>Difficulty {difficulty.toUpperCase()} engaged</p>
```

add:

```tsx
              <p className="stage-intro__pilot">Pilot {selectedCharacter.name}</p>
```

- [ ] **Step 9: Run app tests and verify they pass**

Run:

```powershell
npm run test -- src/app/App.test.tsx
```

Expected: PASS.

- [ ] **Step 10: Commit app flow**

Run:

```powershell
git add -- src/game/types.ts src/app/App.tsx src/app/App.test.tsx
git commit -m "Add character selection app flow"
```

---

### Task 6: Style the Focus Card Character Select Screen

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Add character-select style checks to App tests**

In `src/app/App.test.tsx`, add this expectation to the first flow test after character select appears:

```ts
    expect(document.querySelector('.character-focus')).toBeInTheDocument()
    expect(document.querySelector('.character-roster')).toBeInTheDocument()
```

- [ ] **Step 2: Run app tests**

Run:

```powershell
npm run test -- src/app/App.test.tsx
```

Expected: PASS. These checks prove the structural hooks exist before CSS is added.

- [ ] **Step 3: Add Focus Card CSS**

Append these styles before `.stage-intro` in `src/style.css`:

```css
.character-select {
  justify-content: center;
}

.character-focus {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.025)),
    rgba(5, 9, 17, 0.5);
  border: 1px solid rgba(213, 168, 105, 0.22);
  box-shadow: inset 0 0 0 1px rgba(105, 240, 227, 0.05);
}

.character-focus__summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 112px;
  gap: 14px;
  align-items: center;
}

.character-focus__summary h3 {
  margin: 6px 0 4px;
  font-family: 'Cinzel', serif;
  font-size: 2rem;
  line-height: 0.96;
}

.character-focus__summary strong {
  color: var(--teal);
  font-size: 13px;
}

.character-focus__summary img {
  width: 112px;
  height: 132px;
  object-fit: contain;
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(105, 240, 227, 0.12), rgba(213, 168, 105, 0.1));
  border: 1px solid rgba(255, 255, 255, 0.08);
  filter: drop-shadow(0 14px 24px rgba(0, 0, 0, 0.36));
}

.character-focus__description {
  color: var(--muted);
  line-height: 1.5;
  font-size: 13px;
}

.character-stat-list {
  display: grid;
  gap: 10px;
}

.character-stat {
  display: grid;
  gap: 6px;
}

.character-stat > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
}

.character-stat span {
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.character-stat strong {
  color: var(--cream);
}

.character-stat i {
  display: block;
  height: 7px;
  max-width: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--teal), var(--brass));
  box-shadow: 0 0 18px rgba(105, 240, 227, 0.18);
}

.character-roster {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.character-slot {
  min-height: 86px;
  border-radius: 18px;
  padding: 8px;
  display: grid;
  place-items: center;
  gap: 5px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background 180ms ease;
}

.character-slot:hover {
  transform: translateY(-1px);
}

.character-slot--selected {
  background: rgba(105, 240, 227, 0.12);
  border-color: rgba(105, 240, 227, 0.68);
}

.character-slot img {
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.character-slot span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 800;
}

.stage-intro__pilot {
  color: var(--teal);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 12px;
}
```

- [ ] **Step 4: Run app tests**

Run:

```powershell
npm run test -- src/app/App.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Focus Card styles**

Run:

```powershell
git add -- src/style.css src/app/App.test.tsx
git commit -m "Style character selection focus card"
```

---

### Task 7: Full Verification and Browser Check

**Files:**
- No planned source edits unless verification reveals a defect.

- [ ] **Step 1: Run unit tests**

Run:

```powershell
npm run test
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```powershell
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm run build
```

Expected: PASS and Vite writes `dist/`.

- [ ] **Step 4: Start the dev server for Playwright CLI verification**

Run:

```powershell
$env:BROWSER='none'
npm run dev -- --host 127.0.0.1 --port 5173
```

Expected: Vite reports a local URL at `http://127.0.0.1:5173/`. Keep this terminal running until browser verification is complete.

- [ ] **Step 5: Open the app with Playwright CLI**

Use the Playwright wrapper from the user skill:

```powershell
$env:CODEX_HOME = "$HOME\\.codex"
$env:PWCLI = "$env:CODEX_HOME\\skills\\playwright\\scripts\\playwright_cli.sh"
& 'C:\\Program Files\\Git\\bin\\bash.exe' $env:PWCLI open http://127.0.0.1:5173 --viewport-size=430,932
```

Expected: the app opens at the title screen in a portrait viewport.

- [ ] **Step 6: Navigate through the new flow**

Run `snapshot` before every click, then click the fresh element ref whose accessible text matches the target command. Expected flow:

- Click `Start Sortie`.
- Click `NORMAL`.
- See `Select Pilot`, `Lyra Aer`, stat rows, roster slot, and `Deploy Lyra Aer`.
- Click `Deploy Lyra Aer`.
- See Stage 1 intro with `Difficulty NORMAL engaged` and `Pilot Lyra Aer`.
- Click `Deploy`.
- See the battle canvas and HUD.

- [ ] **Step 7: Capture a screenshot of character select**

Navigate back or restart the app flow to the character-select screen, then run:

```powershell
New-Item -ItemType Directory -Force -Path output/playwright
& 'C:\\Program Files\\Git\\bin\\bash.exe' $env:PWCLI screenshot output/playwright/character-select-focus-card.png
```

Expected: screenshot file exists and shows no overlapping character-card text or clipped buttons.

- [ ] **Step 8: Stop the dev server**

Stop the Vite process from Step 4 with `Ctrl+C`, or if it was started in the background, find and stop the process using the port:

```powershell
Get-NetTCPConnection -LocalPort 5173 -State Listen | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ }
```

Expected: `http://127.0.0.1:5173/` no longer responds.

- [ ] **Step 9: Commit verification artifacts only if intentionally tracked**

The repo ignores `output/`, so do not stage screenshots. If Step 7 only produced ignored files, run:

```powershell
git status --short
```

Expected: no unstaged source changes unless verification found and fixed a defect.

---

## Self-Review Notes

- Spec coverage: the plan covers character catalog, fallback item, last-used storage, flow insertion, runtime injection, BattleView sprite selection, focused UI, tests, and Playwright verification.
- Placeholder scan: no `TBD`, `TODO`, or deferred implementation notes are required to execute the plan.
- Type consistency: `PlayableCharacter` extends `CharacterDefinition`; `BattleView` and `useBattleRuntime` pass `CharacterDefinition`; app-level UI resolves ids through `resolvePlayableCharacter`.
