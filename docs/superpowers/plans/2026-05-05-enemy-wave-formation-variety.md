# Enemy Wave Formation Variety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authored enemy wave formations so Stage 1-4 regular waves enter from varied directions, hold in fixed groups, and move in visually distinct layouts.

**Architecture:** Extend the existing `EnemyWave` spawn-group contract with `formation`, then keep all positioning in the battle runtime spawn path. Stage files author formation presets directly so the visual intent remains visible in data and existing event triggers stay unchanged.

**Tech Stack:** TypeScript, React Three Fiber render data, Vitest, Vite.

---

## File Structure

- Modify `src/game/types.ts`: define `EnemyFormationSide` and `EnemyFormationConfig`, then add `formation` to `EnemyWave`.
- Modify `src/game/content/enemies.ts`: allow optional placement formations and default unresolved waves to top-line formation.
- Modify `src/game/content/enemies.test.ts`: add tests for default formation and placement override.
- Modify `src/game/runtime/battleRuntime.ts`: compute per-enemy formation slots in `spawnWave` and preserve side-entry movement while entering fixed strafe positions.
- Modify `src/game/runtime/battleRuntime.test.ts`: add side-entry runtime coverage.
- Modify `src/game/content/stage1.ts`, `stage2.ts`, `stage3.ts`: author formation presets on every regular wave.
- Modify `src/game/content/stage1.test.ts`, `stage2.test.ts`, `stage3.test.ts`: assert each stage uses at least three formation signatures.

Do not modify unrelated dirty files in the original workspace: `src/game/ui/battleEntities.tsx`, `src/game/ui/battleEntities.test.tsx`, or `tmp/`.

---

### Preflight: Isolated Workspace

**Files:**
- Read-only: git worktree state

- [ ] **Step 1: Confirm the current index is clean before creating a worktree**

Run:

```powershell
git status --short --branch
git diff --cached --name-only
```

Expected: `git diff --cached --name-only` prints nothing. `git status --short --branch` may show unrelated original-workspace files, but no files for this feature should be staged.

- [ ] **Step 2: Verify `.worktrees` is ignored**

Run:

```powershell
git check-ignore -q .worktrees
```

Expected: exit code `0`.

- [ ] **Step 3: Create the feature worktree**

Run:

```powershell
git worktree add .worktrees/enemy-wave-formations -b codex/enemy-wave-formations
```

Expected: new worktree exists at `.worktrees/enemy-wave-formations`.

- [ ] **Step 4: Run a baseline targeted test in the worktree**

Run:

```powershell
npm test -- src/game/content/enemies.test.ts src/game/runtime/battleRuntime.test.ts
```

Expected: existing tests pass before feature edits.

---

### Task 1: Add Formation Contract

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/content/enemies.ts`
- Modify: `src/game/content/enemies.test.ts`

- [ ] **Step 1: Write failing tests for default and overridden formations**

In `src/game/content/enemies.test.ts`, update `resolves regular enemy waves as fly-through spawn groups` to include:

```ts
    expect(wave.formation).toEqual({ type: 'line', side: 'top' })
```

Add this test after `allows placement overrides for guard-style strafe waves`:

```ts
  it('allows placement overrides for enemy wave formations', () => {
    const wave = resolveEnemyWave('normal', {
      id: 'test-side-formation',
      archetype: 'scout',
      variant: 'brass-cloud-scout',
      count: 5,
      spacing: 0.6,
      formation: { type: 'vee', side: 'left', depth: 0.28 },
    })

    expect(wave.formation).toEqual({ type: 'vee', side: 'left', depth: 0.28 })
  })
```

- [ ] **Step 2: Run tests and verify they fail for missing formation support**

Run:

```powershell
npm test -- src/game/content/enemies.test.ts
```

Expected: FAIL because `EnemyWave` has no `formation` property and `StageEnemyPlacement` rejects `formation`.

- [ ] **Step 3: Add formation types and default resolution**

In `src/game/types.ts`, add after `EnemyMovementConfig`:

```ts
export type EnemyFormationSide = 'top' | 'left' | 'right'

export type EnemyFormationConfig =
  | { type: 'line'; side?: EnemyFormationSide; offsetX?: number }
  | { type: 'vee'; side?: EnemyFormationSide; depth: number }
  | { type: 'column'; side: 'left' | 'right'; depth: number }
  | { type: 'arc'; side?: 'top'; depth: number; bend: number }
  | { type: 'grid'; side?: EnemyFormationSide; columns: number; rowGap: number }
```

In `EnemyWave`, add:

```ts
  formation: EnemyFormationConfig
```

In `src/game/content/enemies.ts`, import `EnemyFormationConfig`, add `formation?: EnemyFormationConfig` to `StageEnemyPlacement`, and add this field to the returned wave:

```ts
    formation: placement.formation ?? { type: 'line', side: 'top' },
```

- [ ] **Step 4: Run tests and verify they pass**

Run:

```powershell
npm test -- src/game/content/enemies.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Run:

```powershell
git add src/game/types.ts src/game/content/enemies.ts src/game/content/enemies.test.ts
git commit -m "Add enemy wave formation contract"
```

---

### Task 2: Use Formations In Runtime Spawning

**Files:**
- Modify: `src/game/runtime/battleRuntime.ts`
- Modify: `src/game/runtime/battleRuntime.test.ts`

- [ ] **Step 1: Write a failing side-entry runtime test**

In `src/game/runtime/battleRuntime.test.ts`, add after `moves enter-and-strafe enemies at twice their authored movement speed`:

```ts
  it('enters side formations from the edge before holding inside the arena', () => {
    const stage = createStageDefinition('normal')
    const wave = {
      ...getFirstWave(stage),
      id: 'left-side-formation',
      count: 1,
      hp: 999,
      formation: { type: 'column', side: 'left', depth: 0.3 },
      movement: {
        type: 'enterAndStrafe',
        entrySpeed: 1,
        holdZ: 3.1,
        strafeSpeed: 0,
        strafeRange: 0,
      },
      pattern: {
        shape: 'fan',
        count: 0,
        interval: 999,
        speed: 0,
        spread: 0,
        life: 0,
      },
    } satisfies EnemyWave
    const runtime = createRuntime({
      stage: createEventStage(stage, [
        createWaveEvent('left-side-formation-event', { type: 'time', at: 0 }, wave),
      ]),
    })

    runtime.update(0.01)
    const entryX = runtime.getSnapshot().enemies[0]?.position.x
    runtime.update(1.1)
    const holdX = runtime.getSnapshot().enemies[0]?.position.x

    expect(entryX).toBeLessThan(-3.4)
    expect(holdX).toBeGreaterThan(-3.4)
    expect(holdX).toBeLessThan(-1.5)
  })
```

- [ ] **Step 2: Run tests and verify the runtime test fails**

Run:

```powershell
npm test -- src/game/runtime/battleRuntime.test.ts -t "enters side formations"
```

Expected: FAIL because runtime still spawns centered top-line positions.

- [ ] **Step 3: Add formation slot calculation**

In `src/game/runtime/battleRuntime.ts`, add to `RuntimeEnemy`:

```ts
  entryOriginX: number
  entryStartZ: number
```

Add this helper near `getEnemyEntryShootDelay`:

```ts
const getFormationSide = (formation: EnemyWave['formation']) => {
  if (formation.type === 'column') {
    return formation.side
  }

  return formation.side ?? 'top'
}

const getSideEntryX = (side: 'left' | 'right') =>
  side === 'left' ? bulletViewportBounds.minX - 0.72 : bulletViewportBounds.maxX + 0.72

const getSideHoldCenterX = (side: 'left' | 'right') =>
  side === 'left' ? bulletViewportBounds.minX + 1.08 : bulletViewportBounds.maxX - 1.08

const getCenteredX = (count: number, spacing: number, index: number) =>
  -(((count - 1) * spacing) / 2) + index * spacing

const getEnemyFormationSlot = (wave: EnemyWave, index: number) => {
  const formation = wave.formation
  const side = getFormationSide(formation)
  const centeredX = getCenteredX(wave.count, wave.spacing, index)
  const baseZ = enemySpawnEntry.startZ + index * enemySpawnEntry.rowOffset

  if (side === 'left' || side === 'right') {
    const sideSign = side === 'left' ? 1 : -1
    const entryX = getSideEntryX(side)
    const holdCenterX = getSideHoldCenterX(side)

    if (formation.type === 'column') {
      return {
        x: entryX,
        z: enemySpawnEntry.startZ + index * formation.depth,
        strafeOriginX: holdCenterX,
        shootDelayOffset: index * 0.1,
      }
    }

    return {
      x: entryX + centeredX * 0.2 * sideSign,
      z: baseZ,
      strafeOriginX: holdCenterX + centeredX * 0.45,
      shootDelayOffset: index * 0.08,
    }
  }

  if (formation.type === 'vee') {
    const center = (wave.count - 1) / 2
    const depth = Math.abs(index - center) * formation.depth

    return {
      x: centeredX,
      z: enemySpawnEntry.startZ + depth + index * enemySpawnEntry.rowOffset,
      strafeOriginX: centeredX,
      shootDelayOffset: depth * 0.3,
    }
  }

  if (formation.type === 'arc') {
    const arcDepth = Math.abs(centeredX) * formation.bend + (index % 2) * formation.depth

    return {
      x: centeredX,
      z: enemySpawnEntry.startZ + arcDepth,
      strafeOriginX: centeredX,
      shootDelayOffset: arcDepth * 0.25,
    }
  }

  if (formation.type === 'grid') {
    const columns = Math.max(1, formation.columns)
    const row = Math.floor(index / columns)
    const column = index % columns
    const rowCount = Math.min(columns, wave.count - row * columns)
    const rowX = getCenteredX(rowCount, wave.spacing, column)

    return {
      x: rowX,
      z: enemySpawnEntry.startZ + row * formation.rowGap,
      strafeOriginX: rowX,
      shootDelayOffset: row * 0.12 + column * 0.04,
    }
  }

  return {
    x: centeredX + (formation.offsetX ?? 0),
    z: baseZ,
    strafeOriginX: centeredX + (formation.offsetX ?? 0),
    shootDelayOffset: index * 0.18,
  }
}
```

In `spawnWave`, replace the inline `halfSpread`, `spawnZ`, x, shoot timer, and `strafeOriginX` calculation with:

```ts
      const slot = getEnemyFormationSlot(wave, index)
      const entrySpeed = getEffectiveEnemyMovementSpeed(
        movement.type === 'flyThrough' ? movement.speed : movement.entrySpeed,
      )
```

Then set enemy fields:

```ts
        x: slot.x,
        z: slot.z,
        shootTimer: getEnemyEntryShootDelay(slot.z, entrySpeed) + slot.shootDelayOffset,
        strafeOriginX: slot.strafeOriginX,
        entryOriginX: slot.x,
        entryStartZ: slot.z,
```

In the `enterAndStrafe` branch of `updateEnemies`, replace the current x assignment with:

```ts
        if (enemy.z > enemy.movement.holdZ) {
          enemy.z = Math.max(
            enemy.movement.holdZ,
            enemy.z - getEffectiveEnemyMovementSpeed(enemy.movement.entrySpeed) * delta,
          )
          const entryDistance = Math.max(0.001, enemy.entryStartZ - enemy.movement.holdZ)
          const entryProgress = clamp(
            (enemy.entryStartZ - enemy.z) / entryDistance,
            0,
            1,
          )
          enemy.x =
            enemy.entryOriginX +
            (enemy.strafeOriginX - enemy.entryOriginX) * entryProgress
        } else {
          enemy.x =
            enemy.strafeOriginX +
            Math.sin(
              elapsed * getEffectiveEnemyMovementSpeed(enemy.movement.strafeSpeed) +
                enemy.drift,
            ) *
              enemy.movement.strafeRange
        }
```

- [ ] **Step 4: Run the targeted runtime test and verify it passes**

Run:

```powershell
npm test -- src/game/runtime/battleRuntime.test.ts -t "enters side formations"
```

Expected: PASS.

- [ ] **Step 5: Run runtime tests**

Run:

```powershell
npm test -- src/game/runtime/battleRuntime.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

Run:

```powershell
git add src/game/runtime/battleRuntime.ts src/game/runtime/battleRuntime.test.ts
git commit -m "Spawn enemies with authored formations"
```

---

### Task 3: Author Stage 1-4 Formation Variety

**Files:**
- Modify: `src/game/content/stage1.ts`
- Modify: `src/game/content/stage2.ts`
- Modify: `src/game/content/stage3.ts`
- Modify: `src/game/content/stage1.test.ts`
- Modify: `src/game/content/stage2.test.ts`
- Modify: `src/game/content/stage3.test.ts`

- [ ] **Step 1: Add failing Stage 1 formation signature test**

In `src/game/content/stage1.test.ts`, add this helper near the other helper functions:

```ts
function getFormationSignatures(stage: StageDefinition) {
  return new Set(
    getSpawnedWaves(stage).map((wave) => `${wave.formation.type}:${wave.formation.side ?? 'top'}`),
  )
}
```

In `src/game/content/stage1.test.ts`, add this test inside `describe('createStageDefinition', ...)`:

```ts
  it('varies regular wave formation signatures', () => {
    const stage = createStageDefinition('normal')
    const signatures = getFormationSignatures(stage)

    expect(signatures.size).toBeGreaterThanOrEqual(3)
    expect(signatures).not.toEqual(new Set(['line:top']))
  })
```

- [ ] **Step 2: Add failing Stage 2 formation signature test**

In `src/game/content/stage2.test.ts`, add this helper near the other helper functions:

```ts
function getFormationSignatures(stage: StageDefinition) {
  return new Set(
    getSpawnedWaves(stage).map((wave) => `${wave.formation.type}:${wave.formation.side ?? 'top'}`),
  )
}
```

In `src/game/content/stage2.test.ts`, add this test inside `describe('createStage2Definition', ...)`:

```ts
  it('varies regular wave formation signatures', () => {
    const stage = createStage2Definition('normal')
    const signatures = getFormationSignatures(stage)

    expect(signatures.size).toBeGreaterThanOrEqual(3)
    expect(signatures).not.toEqual(new Set(['line:top']))
  })
```

- [ ] **Step 3: Add failing Stage 3 formation signature test**

In `src/game/content/stage3.test.ts`, add this helper near the other helper functions:

```ts
function getFormationSignatures(stage: StageDefinition) {
  return new Set(
    getSpawnedWaves(stage).map((wave) => `${wave.formation.type}:${wave.formation.side ?? 'top'}`),
  )
}
```

In `src/game/content/stage3.test.ts`, add this test inside `describe('createStage3Definition', ...)`:

```ts
  it('varies regular wave formation signatures', () => {
    const stage = createStage3Definition('normal')
    const signatures = getFormationSignatures(stage)

    expect(signatures.size).toBeGreaterThanOrEqual(3)
    expect(signatures).not.toEqual(new Set(['line:top']))
  })
```

- [ ] **Step 5: Run stage tests and verify they fail**

Run:

```powershell
npm test -- src/game/content/stage1.test.ts src/game/content/stage2.test.ts src/game/content/stage3.test.ts -t "varies regular wave formation signatures"
```

Expected: FAIL because stages still resolve every wave to `line:top`.

- [ ] **Step 6: Add Stage 1 formations**

In `src/game/content/stage1.ts`, add these placement fields:

```ts
// wave-1
formation: { type: 'line', side: 'top' },
// wave-2
formation: { type: 'vee', side: 'top', depth: 0.22 },
// wave-3
formation: { type: 'arc', side: 'top', depth: 0.08, bend: 0.18 },
// wave-4
formation: { type: 'grid', side: 'top', columns: 3, rowGap: 0.24 },
// wave-5
formation: { type: 'column', side: 'left', depth: 0.26 },
movement: { type: 'enterAndStrafe', entrySpeed: 1.05, holdZ: 1.45, strafeSpeed: 0.65, strafeRange: 0.45 },
resolution: { type: 'timeout', seconds: 7, then: 'forceEscape' },
// wave-6
formation: { type: 'vee', side: 'right', depth: 0.2 },
movement: { type: 'enterAndStrafe', entrySpeed: 1.08, holdZ: 1.35, strafeSpeed: 0.72, strafeRange: 0.5 },
resolution: { type: 'timeout', seconds: 7, then: 'forceEscape' },
// wave-7
formation: { type: 'arc', side: 'top', depth: 0.1, bend: 0.16 },
// wave-8
formation: { type: 'grid', side: 'right', columns: 4, rowGap: 0.22 },
movement: { type: 'enterAndStrafe', entrySpeed: 1.12, holdZ: 1.25, strafeSpeed: 0.84, strafeRange: 0.62 },
resolution: { type: 'timeout', seconds: 8, then: 'forceEscape' },
```

- [ ] **Step 7: Add Stage 2 formations**

In `src/game/content/stage2.ts`, add these placement fields to wave-1 through wave-12:

```ts
formation: { type: 'line', side: 'top' }
formation: { type: 'vee', side: 'top', depth: 0.2 }
formation: { type: 'arc', side: 'top', depth: 0.08, bend: 0.16 }
formation: { type: 'grid', side: 'left', columns: 3, rowGap: 0.22 }
formation: { type: 'column', side: 'right', depth: 0.24 }
formation: { type: 'vee', side: 'left', depth: 0.2 }
formation: { type: 'grid', side: 'top', columns: 4, rowGap: 0.2 }
formation: { type: 'column', side: 'left', depth: 0.24 }
formation: { type: 'arc', side: 'top', depth: 0.1, bend: 0.14 }
formation: { type: 'vee', side: 'right', depth: 0.22 }
formation: { type: 'grid', side: 'right', columns: 4, rowGap: 0.2 }
formation: { type: 'line', side: 'left', offsetX: -0.45 }
```

For Stage 2 side/grid waves that hold in place, add enter-and-strafe movement with timeout force-escape:

```ts
movement: { type: 'enterAndStrafe', entrySpeed: 1.15, holdZ: 1.35, strafeSpeed: 0.8, strafeRange: 0.62 },
resolution: { type: 'timeout', seconds: 7.5, then: 'forceEscape' },
```

Apply that movement to waves 4, 5, 8, 10, and 11.

- [ ] **Step 8: Add Stage 3 formations**

In `src/game/content/stage3.ts`, add formation fields to all 14 placements with this signature sequence:

```ts
line:top, vee:top, column:left, arc:top, grid:right, vee:left, arc:top,
column:right, grid:top, vee:right, column:left, arc:top, grid:left, line:right
```

Use concrete formation objects:

```ts
{ type: 'line', side: 'top' }
{ type: 'vee', side: 'top', depth: 0.22 }
{ type: 'column', side: 'left', depth: 0.23 }
{ type: 'arc', side: 'top', depth: 0.08, bend: 0.15 }
{ type: 'grid', side: 'right', columns: 4, rowGap: 0.2 }
{ type: 'vee', side: 'left', depth: 0.2 }
{ type: 'arc', side: 'top', depth: 0.1, bend: 0.18 }
{ type: 'column', side: 'right', depth: 0.22 }
{ type: 'grid', side: 'top', columns: 4, rowGap: 0.2 }
{ type: 'vee', side: 'right', depth: 0.2 }
{ type: 'column', side: 'left', depth: 0.22 }
{ type: 'arc', side: 'top', depth: 0.08, bend: 0.16 }
{ type: 'grid', side: 'left', columns: 4, rowGap: 0.2 }
{ type: 'line', side: 'right', offsetX: 0.4 }
```

Add enter-and-strafe timeout movement to Stage 3 waves 3, 5, 8, 11, and 13:

```ts
movement: { type: 'enterAndStrafe', entrySpeed: 1.18, holdZ: 1.25, strafeSpeed: 0.9, strafeRange: 0.68 },
resolution: { type: 'timeout', seconds: 8, then: 'forceEscape' },
```

- [ ] **Step 10: Run the formation signature tests and verify they pass**

Run:

```powershell
npm test -- src/game/content/stage1.test.ts src/game/content/stage2.test.ts src/game/content/stage3.test.ts -t "varies regular wave formation signatures"
```

Expected: PASS.

- [ ] **Step 11: Run all targeted content/runtime tests**

Run:

```powershell
npm test -- src/game/content/enemies.test.ts src/game/content/stage1.test.ts src/game/content/stage2.test.ts src/game/content/stage3.test.ts src/game/runtime/battleRuntime.test.ts
```

Expected: PASS.

- [ ] **Step 12: Commit Task 3**

Run:

```powershell
git add src/game/content/stage1.ts src/game/content/stage2.ts src/game/content/stage3.ts src/game/content/stage1.test.ts src/game/content/stage2.test.ts src/game/content/stage3.test.ts
git commit -m "Author varied enemy wave formations"
```

---

### Task 4: Final Verification And Local Integration

**Files:**
- Read-only: all source files changed in Tasks 1-3
- Modify only if verification exposes a defect in this feature

- [ ] **Step 1: Run typecheck**

Run:

```powershell
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2: Run the full test suite**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 4: Inspect final diff boundary**

Run:

```powershell
git status --short
git diff --name-only HEAD
```

Expected: no uncommitted changes. The branch history should contain only the plan commit plus feature commits.

- [ ] **Step 5: Merge back to local main after verification**

Run from `D:\vibe-danmaku` after returning to the original workspace:

```powershell
git merge --ff-only codex/enemy-wave-formations
```

Expected: local `main` fast-forwards. Do not push unless explicitly requested.
