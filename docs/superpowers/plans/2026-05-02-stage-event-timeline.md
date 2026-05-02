# Stage Event Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace stage-specific wave, midboss, and boss progression with an explicit event timeline that supports many stages, multiple midbosses, boss-triggered summons, and non-time-only wave progression.

**Architecture:** Add stage event, trigger, action, movement, and resolution types to the shared game model, then convert Stage 1 and Stage 2 content to emit `events`. Refactor the battle runtime around event evaluation, spawn group tracking, and an internal multi-boss array while preserving the existing UI-facing `snapshot.boss` compatibility field during this migration.

**Tech Stack:** TypeScript, React, React Three Fiber, Vitest, Vite.

---

## File Structure

- Modify `src/game/types.ts`: add `StageEvent`, `StageTrigger`, `StageAction`, `StageCondition`, `EnemyMovementConfig`, `SpawnGroupResolution`, and update `EnemyWave`, `BossDefinition`, `StageDefinition`, `BattleSnapshot`.
- Create `src/game/content/stageEvents.ts`: helper builders for event ids, time scaling, sequential wave events, boss spawn events, and victory events.
- Modify `src/game/content/enemies.ts`: replace `speed` and `path` output with `movement`, add default `resolution`, and keep helper accessors for tests that need movement speed/path.
- Modify `src/game/content/stage1.ts`: build Stage 1 as event timeline data.
- Modify `src/game/content/stage2.ts`: build Stage 2 as event timeline data, representing the midboss as a normal boss event.
- Modify `src/game/content/stage1.test.ts`: assert explicit event triggers instead of relying on `wave.startAt`.
- Modify `src/game/content/stage2.test.ts`: assert event-based midboss gate and final boss ordering.
- Modify `src/game/runtime/battleRuntime.ts`: replace queue and single-midboss state with event state, spawn group state, boss state array, trigger evaluation, action execution, movement handling, and explicit victory actions.
- Modify `src/game/runtime/battleRuntime.test.ts`: convert fixtures to event timeline stages and add resolution, strafe, multi-midboss, boss HP, boss phase, and explicit victory tests.
- Modify `src/game/ui/battleEntities.tsx`: accept multiple boss candidates for texture selection while retaining current visual output.
- Modify `src/game/ui/BattleHud.tsx` if needed: render the primary boss from `snapshot.boss` for now; add `snapshot.bosses` assertions only if tests require it.
- Modify `src/game/ui/BattleView.test.ts`: update midboss texture fixtures to use `stage.events`.
- Modify `src/game/ui/useBattleRuntime.test.ts`: update immediate-victory fixture to use explicit `finishStage`.

---

### Task 1: Add Timeline Types And Content Helpers

**Files:**
- Modify: `src/game/types.ts`
- Create: `src/game/content/stageEvents.ts`
- Test: `src/game/content/stageEvents.test.ts`

- [ ] **Step 1: Write failing tests for stage event helpers**

Create `src/game/content/stageEvents.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  createSequentialWaveEvents,
  createTimeBossEvent,
  createVictoryEvent,
  scaleEventTime,
} from './stageEvents'
import type { BossDefinition, EnemyWave, StageEvent } from '../types'

const fixtureWave = {
  id: 'wave-1',
  kind: 'brass-cloud-scout',
  archetype: 'scout',
  variant: 'brass-cloud-scout',
  atlasId: 'enemy-brass-cloud',
  frameId: 'scout',
  count: 2,
  spacing: 1,
  hp: 10,
  movement: { type: 'flyThrough', path: 'swoop-left', speed: 1 },
  resolution: { type: 'allInactive' },
  scale: 0.8,
  hitRadius: 0.33,
  pattern: { shape: 'fan', count: 3, interval: 1, speed: 1, spread: 1, life: 4 },
} satisfies EnemyWave

const fixtureBoss = {
  id: 'boss-brass-core',
  hp: 240,
  phases: [
    {
      id: 'phase-1',
      threshold: 0,
      label: 'Phase 1',
      supportLaser: false,
      pattern: { shape: 'fan', count: 3, interval: 1, speed: 1, spread: 1, life: 4 },
    },
  ],
} satisfies BossDefinition

describe('stage event helpers', () => {
  it('scales time triggers without changing non-time triggers', () => {
    const events = [
      {
        id: 'wave-1-event',
        trigger: { type: 'time', at: 10 },
        actions: [],
      },
      {
        id: 'wave-2-event',
        trigger: { type: 'afterResolved', target: 'wave-1', delay: 2 },
        actions: [],
      },
    ] satisfies StageEvent[]

    expect(events.map((event) => scaleEventTime(event, 0.5))).toEqual([
      {
        id: 'wave-1-event',
        trigger: { type: 'time', at: 5 },
        actions: [],
      },
      {
        id: 'wave-2-event',
        trigger: { type: 'afterResolved', target: 'wave-1', delay: 1 },
        actions: [],
      },
    ])
  })

  it('creates explicit sequential wave events', () => {
    const waveEvents = createSequentialWaveEvents(
      [fixtureWave, { ...fixtureWave, id: 'wave-2' }],
      {
        firstAt: 1.8,
        delayAfterResolved: 1.5,
      },
    )

    expect(waveEvents).toMatchObject([
      {
        id: 'wave-1-event',
        trigger: { type: 'time', at: 1.8 },
        actions: [{ type: 'spawnWave', wave: { id: 'wave-1' } }],
      },
      {
        id: 'wave-2-event',
        trigger: { type: 'afterResolved', target: 'wave-1', delay: 1.5 },
        actions: [{ type: 'spawnWave', wave: { id: 'wave-2' } }],
      },
    ])
  })

  it('creates boss and victory events with stage-owned ids', () => {
    const bossEvent = createTimeBossEvent(fixtureBoss, 'final', 78)
    const victoryEvent = createVictoryEvent(fixtureBoss.id)

    expect(bossEvent).toMatchObject({
      id: 'boss-brass-core-spawn',
      trigger: { type: 'time', at: 78 },
      actions: [{ type: 'spawnBoss', boss: { id: 'boss-brass-core' }, role: 'final' }],
    })
    expect(victoryEvent).toEqual({
      id: 'boss-brass-core-victory',
      trigger: { type: 'afterDefeated', target: 'boss-brass-core', delay: 0 },
      actions: [{ type: 'finishStage', outcome: 'victory' }],
    })
  })
})
```

- [ ] **Step 2: Run helper tests and verify they fail**

Run: `npm test -- src/game/content/stageEvents.test.ts`

Expected: FAIL because `src/game/content/stageEvents.ts` does not exist and `StageEvent` types are not defined.

- [ ] **Step 3: Add event, movement, resolution, and snapshot types**

In `src/game/types.ts`, update the relevant type section to include:

```ts
export type StageCondition =
  | { type: 'bossActive'; bossId: string }
  | { type: 'bossPhase'; bossId: string; phaseId: string }

export type StageTrigger =
  | { type: 'time'; at: number }
  | { type: 'afterResolved'; target: string; delay: number }
  | { type: 'afterDefeated'; target: string; delay: number }
  | { type: 'bossHp'; bossId: string; atOrBelow: number }
  | { type: 'bossPhase'; bossId: string; phaseId: string }
  | { type: 'interval'; every: number; while: StageCondition }

export type StageAction =
  | { type: 'spawnWave'; wave: EnemyWave; groupKind?: 'wave' | 'summon' }
  | { type: 'spawnBoss'; boss: BossDefinition; role: 'midboss' | 'final' }
  | { type: 'finishStage'; outcome: 'victory' }

export type StageEvent = {
  id: string
  trigger: StageTrigger
  actions: StageAction[]
  once?: boolean
}

export type EnemyMovementConfig =
  | { type: 'flyThrough'; path: 'swoop-left' | 'swoop-right' | 'helix'; speed: number }
  | {
      type: 'enterAndStrafe'
      entrySpeed: number
      holdZ: number
      strafeSpeed: number
      strafeRange: number
    }

export type SpawnGroupResolution =
  | { type: 'allInactive' }
  | { type: 'allDefeated' }
  | { type: 'timeout'; seconds: number; then: 'resolve' | 'fail' | 'forceEscape' }
```

Update `EnemyWave` by replacing `speed` and `path` with:

```ts
  movement: EnemyMovementConfig
  resolution: SpawnGroupResolution
```

Update `BossDefinition`:

```ts
export type BossDefinition = {
  id: string
  hp: number
  phases: BossPhaseDefinition[]
}
```

Update `StageDefinition`:

```ts
export type StageId = string

export type StageDefinition = {
  id: StageId
  stageNumber: number
  backgroundTheme: StageBackgroundTheme
  name: string
  lore: string
  duration?: number
  events: StageEvent[]
}
```

Update `BattleSnapshot` by adding `bosses` while keeping `boss`:

```ts
  boss: RenderBoss | null
  bosses: RenderBoss[]
```

- [ ] **Step 4: Add helper implementation**

Create `src/game/content/stageEvents.ts`:

```ts
import type { BossDefinition, StageEvent, StageTrigger, EnemyWave } from '../types'

function roundTime(value: number) {
  return Number(value.toFixed(2))
}

function scaleTriggerTime(trigger: StageTrigger, multiplier: number): StageTrigger {
  if (trigger.type === 'time') {
    return { ...trigger, at: roundTime(trigger.at * multiplier) }
  }

  if (trigger.type === 'afterResolved' || trigger.type === 'afterDefeated') {
    return { ...trigger, delay: roundTime(trigger.delay * multiplier) }
  }

  if (trigger.type === 'interval') {
    return { ...trigger, every: roundTime(trigger.every * multiplier) }
  }

  return trigger
}

export function scaleEventTime<TEvent extends StageEvent>(
  event: TEvent,
  multiplier: number,
): TEvent {
  return {
    ...event,
    trigger: scaleTriggerTime(event.trigger, multiplier),
  }
}

export function createSequentialWaveEvents(
  waves: EnemyWave[],
  options: { firstAt: number; delayAfterResolved: number },
): StageEvent[] {
  return waves.map((wave, index) => ({
    id: `${wave.id}-event`,
    trigger:
      index === 0
        ? { type: 'time', at: options.firstAt }
        : {
            type: 'afterResolved',
            target: waves[index - 1]!.id,
            delay: options.delayAfterResolved,
          },
    actions: [{ type: 'spawnWave', wave }],
  }))
}

export function createTimeBossEvent(
  boss: BossDefinition,
  role: 'midboss' | 'final',
  at: number,
): StageEvent {
  return {
    id: `${boss.id}-spawn`,
    trigger: { type: 'time', at },
    actions: [{ type: 'spawnBoss', boss, role }],
  }
}

export function createBossEventAfterResolved(
  boss: BossDefinition,
  role: 'midboss' | 'final',
  target: string,
  delay: number,
): StageEvent {
  return {
    id: `${boss.id}-spawn`,
    trigger: { type: 'afterResolved', target, delay },
    actions: [{ type: 'spawnBoss', boss, role }],
  }
}

export function createVictoryEvent(target: string): StageEvent {
  return {
    id: `${target}-victory`,
    trigger: { type: 'afterDefeated', target, delay: 0 },
    actions: [{ type: 'finishStage', outcome: 'victory' }],
  }
}
```

- [ ] **Step 5: Run helper tests and typecheck**

Run: `npm test -- src/game/content/stageEvents.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: FAIL because existing content and runtime still use `stage.waves`, `stage.boss.startAt`, `wave.speed`, `wave.path`, and `stage.midboss`.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add src/game/types.ts src/game/content/stageEvents.ts src/game/content/stageEvents.test.ts
git commit -m "Add stage event timeline types"
```

---

### Task 2: Convert Enemy Wave Content To Movement And Resolution

**Files:**
- Modify: `src/game/content/enemies.ts`
- Modify: `src/game/content/enemies.test.ts`

- [ ] **Step 1: Write failing tests for default wave movement and resolution**

In `src/game/content/enemies.test.ts`, add:

```ts
  it('resolves regular enemy waves as fly-through spawn groups', () => {
    const wave = resolveEnemyWave('normal', {
      id: 'test-scout',
      startAt: 12,
      archetype: 'scout',
      variant: 'brass-cloud-scout',
      count: 2,
      spacing: 1,
    })

    expect(wave.movement).toEqual({
      type: 'flyThrough',
      path: enemyArchetypes.scout.path,
      speed: enemyArchetypes.scout.speed,
    })
    expect(wave.resolution).toEqual({ type: 'allInactive' })
  })

  it('allows placement overrides for guard-style strafe waves', () => {
    const wave = resolveEnemyWave('normal', {
      id: 'test-guard',
      startAt: 12,
      archetype: 'sentinel',
      variant: 'brass-cloud-sentinel',
      count: 2,
      spacing: 1,
      movement: {
        type: 'enterAndStrafe',
        entrySpeed: 1.1,
        holdZ: 1.35,
        strafeSpeed: 0.9,
        strafeRange: 1.8,
      },
      resolution: { type: 'allDefeated' },
    })

    expect(wave.movement.type).toBe('enterAndStrafe')
    expect(wave.resolution).toEqual({ type: 'allDefeated' })
  })
```

- [ ] **Step 2: Run enemy content tests and verify they fail**

Run: `npm test -- src/game/content/enemies.test.ts`

Expected: FAIL because `StageEnemyPlacement` has no `movement` or `resolution`, and `EnemyWave` still returns `speed` and `path`.

- [ ] **Step 3: Update placement and resolver types**

In `src/game/content/enemies.ts`, update imports:

```ts
  EnemyMovementConfig,
  SpawnGroupResolution,
```

Update `StageEnemyPlacement`:

```ts
type StageEnemyPlacement = {
  id: string
  startAt: number
  archetype: EnemyArchetypeId
  variant: EnemyVariantId
  count: number
  spacing: number
  hp?: number
  speed?: number
  movement?: EnemyMovementConfig
  resolution?: SpawnGroupResolution
  pattern?: Partial<BulletPatternConfig>
}
```

Update the returned wave in `resolveEnemyWave`:

```ts
    movement:
      placement.movement ??
      ({
        type: 'flyThrough',
        path: archetype.path,
        speed: placement.speed ?? archetype.speed,
      } satisfies EnemyMovementConfig),
    resolution: placement.resolution ?? { type: 'allInactive' },
```

Remove `speed` and `path` from the returned object.

- [ ] **Step 4: Remove remaining placement `speed` field usage**

If TypeScript reports `placement.speed` no longer exists, keep `speed?: number` in `StageEnemyPlacement` only as a migration input and map it into `movement.speed` as shown above. Do not expose `speed` on `EnemyWave`.

- [ ] **Step 5: Run enemy tests and typecheck**

Run: `npm test -- src/game/content/enemies.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: FAIL in stage/runtime tests and runtime code that still read `wave.speed`, `wave.path`, `wave.startAt`, `stage.waves`, and `stage.boss`.

- [ ] **Step 6: Commit Task 2**

Run:

```bash
git add src/game/content/enemies.ts src/game/content/enemies.test.ts
git commit -m "Convert enemy waves to movement resolution data"
```

---

### Task 3: Convert Stage 1 And Stage 2 Content To Events

**Files:**
- Modify: `src/game/content/stage1.ts`
- Modify: `src/game/content/stage2.ts`
- Modify: `src/game/content/stage1.test.ts`
- Modify: `src/game/content/stage2.test.ts`

- [ ] **Step 1: Write failing Stage 1 event tests**

Replace the timing assertions in `src/game/content/stage1.test.ts` with event-based assertions:

```ts
  it('expresses every Stage 1 spawn through explicit events', () => {
    const stage = createStageDefinition('normal')

    const spawnWaveEvents = stage.events.filter((event) =>
      event.actions.some((action) => action.type === 'spawnWave'),
    )
    const spawnBossEvents = stage.events.filter((event) =>
      event.actions.some((action) => action.type === 'spawnBoss'),
    )
    const victoryEvents = stage.events.filter((event) =>
      event.actions.some((action) => action.type === 'finishStage'),
    )

    expect(spawnWaveEvents).toHaveLength(8)
    expect(spawnWaveEvents[0]?.trigger).toEqual({ type: 'time', at: 1.8 })
    expect(spawnWaveEvents[1]?.trigger).toEqual({
      type: 'afterResolved',
      target: 'wave-1',
      delay: 1.5,
    })
    expect(spawnBossEvents).toHaveLength(1)
    expect(spawnBossEvents[0]?.id).toBe('boss-brass-core-spawn')
    expect(spawnBossEvents[0]?.trigger).toEqual({
      type: 'afterResolved',
      target: 'wave-8',
      delay: 2,
    })
    expect(spawnBossEvents[0]?.actions[0]).toMatchObject({
      type: 'spawnBoss',
      role: 'final',
      boss: { id: 'boss-brass-core' },
    })
    expect(victoryEvents).toEqual([
      {
        id: 'boss-brass-core-victory',
        trigger: { type: 'afterDefeated', target: 'boss-brass-core', delay: 0 },
        actions: [{ type: 'finishStage', outcome: 'victory' }],
      },
    ])
  })
```

- [ ] **Step 2: Write failing Stage 2 event tests**

In `src/game/content/stage2.test.ts`, replace midboss gate tests with:

```ts
  it('expresses the midboss and second-half waves through explicit triggers', () => {
    const stage = createStage2Definition('normal')
    const midbossEvent = stage.events.find((event) => event.id === 'midboss-ember-gate-spawn')
    const wave7Event = stage.events.find((event) => event.id === 'wave-7-event')
    const finalBossEvent = stage.events.find(
      (event) => event.id === 'boss-ash-citadel-core-spawn',
    )

    expect(midbossEvent?.trigger).toEqual({
      type: 'afterResolved',
      target: 'wave-6',
      delay: 1.5,
    })
    expect(wave7Event?.trigger).toEqual({
      type: 'afterDefeated',
      target: 'midboss-ember-gate',
      delay: 1.5,
    })
    expect(finalBossEvent?.trigger).toEqual({
      type: 'afterResolved',
      target: 'wave-12',
      delay: 2,
    })
  })
```

- [ ] **Step 3: Run stage content tests and verify they fail**

Run: `npm test -- src/game/content/stage1.test.ts src/game/content/stage2.test.ts`

Expected: FAIL because `createStageDefinition` and `createStage2Definition` still return `waves`, `midboss`, and `boss` instead of `events`.

- [ ] **Step 4: Convert Stage 1 content**

In `src/game/content/stage1.ts`, import:

```ts
import {
  createBossEventAfterResolved,
  createSequentialWaveEvents,
  createVictoryEvent,
  scaleEventTime,
} from './stageEvents'
```

Keep `baseWavePlacements` and `baseBoss`. In `createStageDefinition`, replace the returned `waves` and `boss` shape with:

```ts
  const waves = baseWavePlacements.map((placement) => resolveEnemyWave(difficulty, placement))
  const boss = scaleBossDefinition(baseBoss, difficulty)
  const events = [
    ...createSequentialWaveEvents(waves, {
      firstAt: 1.8,
      delayAfterResolved: 1.5,
    }),
    createBossEventAfterResolved(boss, 'final', waves[waves.length - 1]!.id, 2),
    createVictoryEvent(boss.id),
  ].map((event) => scaleEventTime(event, fastMultiplier))
```

Return:

```ts
    duration: scaleTime(165),
    events,
```

- [ ] **Step 5: Convert Stage 2 content**

In `src/game/content/stage2.ts`, import the same helpers.

Build events:

```ts
  const waves = baseWavePlacements.map((placement) => resolveEnemyWave(difficulty, placement))
  const midboss = scaleBossDefinition(baseMidboss, difficulty)
  const boss = scaleBossDefinition(baseBoss, difficulty)
  const firstHalf = waves.slice(0, 6)
  const secondHalf = waves.slice(6)
  const firstHalfEvents = createSequentialWaveEvents(firstHalf, {
    firstAt: 1.8,
    delayAfterResolved: 1.25,
  })
  const secondHalfEvents = secondHalf.map((wave, index) => ({
    id: `${wave.id}-event`,
    trigger:
      index === 0
        ? { type: 'afterDefeated', target: midboss.id, delay: 1.5 }
        : { type: 'afterResolved', target: secondHalf[index - 1]!.id, delay: 1.25 },
    actions: [{ type: 'spawnWave', wave }],
  }))
  const events = [
    ...firstHalfEvents,
    createBossEventAfterResolved(midboss, 'midboss', firstHalf[firstHalf.length - 1]!.id, 1.5),
    ...secondHalfEvents,
    createBossEventAfterResolved(boss, 'final', waves[waves.length - 1]!.id, 2),
    createVictoryEvent(boss.id),
  ].map((event) => scaleEventTime(event, fastMultiplier))
```

Return `events` instead of `waves`, `midboss`, and `boss`.

- [ ] **Step 6: Update tests that inspect wave counts from events**

In `stage1.test.ts` and `stage2.test.ts`, add local helpers:

```ts
function getSpawnedWaves(stage: ReturnType<typeof createStageDefinition>) {
  return stage.events.flatMap((event) =>
    event.actions.flatMap((action) => (action.type === 'spawnWave' ? [action.wave] : [])),
  )
}
```

For Stage 2, type the helper with `ReturnType<typeof createStage2Definition>`.

Replace `stage.waves` reads with `getSpawnedWaves(stage)`.

Replace `stage.boss` reads with:

```ts
const finalBoss = stage.events
  .flatMap((event) => event.actions)
  .find((action) => action.type === 'spawnBoss' && action.role === 'final')?.boss
```

- [ ] **Step 7: Run stage content tests and typecheck**

Run: `npm test -- src/game/content/stage1.test.ts src/game/content/stage2.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: FAIL only in runtime and UI tests/code still expecting legacy stage shape.

- [ ] **Step 8: Commit Task 3**

Run:

```bash
git add src/game/content/stage1.ts src/game/content/stage2.ts src/game/content/stage1.test.ts src/game/content/stage2.test.ts
git commit -m "Convert stages to explicit event timelines"
```

---

### Task 4: Refactor Runtime To Evaluate Stage Events

**Files:**
- Modify: `src/game/runtime/battleRuntime.ts`
- Modify: `src/game/runtime/battleRuntime.test.ts`

- [ ] **Step 1: Write failing runtime tests for afterResolved and afterDefeated**

In `src/game/runtime/battleRuntime.test.ts`, add helper functions near the existing fixtures:

```ts
function getFirstWave(stage: StageDefinition) {
  const action = stage.events
    .flatMap((event) => event.actions)
    .find((candidate) => candidate.type === 'spawnWave')

  if (!action || action.type !== 'spawnWave') {
    throw new Error('test stage must include a spawn wave')
  }

  return action.wave
}

function createTwoWaveResolvedStage(): StageDefinition {
  const stage = createStageDefinition('normal')
  const first = { ...getFirstWave(stage), id: 'first', count: 1, hp: 999 }
  const second = { ...getFirstWave(stage), id: 'second', count: 1, hp: 999 }

  return {
    ...stage,
    duration: 999,
    events: [
      {
        id: 'first-event',
        trigger: { type: 'time', at: 0 },
        actions: [{ type: 'spawnWave', wave: first }],
      },
      {
        id: 'second-event',
        trigger: { type: 'afterResolved', target: 'first', delay: 0.2 },
        actions: [{ type: 'spawnWave', wave: second }],
      },
    ],
  }
}

function createTwoWaveDefeatedStage(): StageDefinition {
  const stage = createTwoWaveResolvedStage()

  return {
    ...stage,
    events: [
      stage.events[0]!,
      {
        id: 'second-event',
        trigger: { type: 'afterDefeated', target: 'first', delay: 0.2 },
        actions: stage.events[1]!.actions,
      },
    ],
  }
}
```

Add tests:

```ts
describe('stage event runtime', () => {
  it('fires afterResolved after a fly-through enemy escapes the viewport', () => {
    const runtime = createRuntime({ stage: createTwoWaveResolvedStage() })

    for (let index = 0; index < 90; index += 1) {
      runtime.update(0.1)
    }

    expect(runtime.getSnapshot().enemies.some((enemy) => enemy.waveId === 'second')).toBe(true)
  })

  it('does not fire afterDefeated when the target wave only escapes', () => {
    const runtime = createRuntime({ stage: createTwoWaveDefeatedStage() })

    for (let index = 0; index < 90; index += 1) {
      runtime.update(0.1)
    }

    expect(runtime.getSnapshot().enemies.some((enemy) => enemy.waveId === 'second')).toBe(false)
  })
})
```

- [ ] **Step 2: Run runtime tests and verify they fail**

Run: `npm test -- src/game/runtime/battleRuntime.test.ts`

Expected: FAIL because runtime still uses `stage.waves`, `stage.midboss`, and `stage.boss`.

- [ ] **Step 3: Add runtime event state types**

In `battleRuntime.ts`, replace `RuntimeBoss`, update `RuntimeEnemy`, and add:

```ts
type RuntimeEnemy = {
  id: string
  groupId: string
  waveId: string
  kind: EnemyWave['kind']
  archetype: EnemyWave['archetype']
  variant: EnemyWave['variant']
  atlasId: EnemyWave['atlasId']
  frameId: EnemyWave['frameId']
  x: number
  z: number
  hp: number
  pattern: EnemyWave['pattern']
  shootTimer: number
  drift: number
  movement: EnemyWave['movement']
  scale: number
  hitRadius: number
}

type RuntimeBoss = {
  id: string
  role: 'midboss' | 'final'
  x: number
  z: number
  hp: number
  maxHp: number
  shootTimer: number
  supportLaserTimer: number
  definition: BossDefinition
  currentPhaseId: string | null
  enteredPhaseIds: Set<string>
}

type EventState = {
  id: string
  fired: boolean
  lastFiredAt?: number
  readyAt?: number
}

type SpawnGroupState = {
  id: string
  kind: 'wave' | 'summon'
  resolution: EnemyWave['resolution']
  spawned: number
  defeated: number
  escaped: number
  forcedResolved: boolean
  startedAt: number
  resolvedAt?: number
}

const eventStates = new Map<string, EventState>()
const spawnGroups = new Map<string, SpawnGroupState>()
const defeatedBosses = new Map<string, number>()
```

- [ ] **Step 4: Replace single boss state with array**

Replace:

```ts
let boss: RuntimeBoss | null = null
let activeBossRole: 'midboss' | 'final' | null = null
```

with:

```ts
const bosses: RuntimeBoss[] = []
```

Add:

```ts
const getPrimaryBoss = () =>
  bosses.find((candidate) => candidate.role === 'final') ?? bosses[0] ?? null
```

Keep snapshot compatibility by using `const primaryBoss = getPrimaryBoss()`.

- [ ] **Step 5: Implement spawn group creation in spawnWave**

Update `spawnWave`:

```ts
  const spawnWave = (wave: EnemyWave, groupKind: 'wave' | 'summon' = 'wave') => {
    const halfSpread = ((wave.count - 1) * wave.spacing) / 2
    spawnGroups.set(wave.id, {
      id: wave.id,
      kind: groupKind,
      resolution: wave.resolution,
      spawned: wave.count,
      defeated: 0,
      escaped: 0,
      forcedResolved: false,
      startedAt: elapsed,
    })

    const entrySpeed =
      wave.movement.type === 'flyThrough' ? wave.movement.speed : wave.movement.entrySpeed

    for (let index = 0; index < wave.count; index += 1) {
      const spawnZ = enemySpawnEntry.startZ + index * enemySpawnEntry.rowOffset
      enemies.push({
        id: `enemy-${lastEnemyId++}`,
        groupId: wave.id,
        waveId: wave.id,
        kind: wave.kind,
        archetype: wave.archetype,
        variant: wave.variant,
        atlasId: wave.atlasId,
        frameId: wave.frameId,
        x: -halfSpread + index * wave.spacing,
        z: spawnZ,
        hp: wave.hp,
        pattern: wave.pattern,
        shootTimer: getEnemyEntryShootDelay(spawnZ, entrySpeed) + index * 0.18,
        drift: index * 0.7,
        movement: wave.movement,
        scale: wave.scale,
        hitRadius: wave.hitRadius,
      })
    }
  }
```

- [ ] **Step 6: Track defeated and escaped enemies**

Add:

```ts
  const markEnemyDefeated = (enemy: RuntimeEnemy) => {
    const group = spawnGroups.get(enemy.groupId)
    if (group) {
      group.defeated += 1
    }
  }

  const markEnemyEscaped = (enemy: RuntimeEnemy) => {
    const group = spawnGroups.get(enemy.groupId)
    if (group) {
      group.escaped += 1
    }
  }

  const updateSpawnGroupResolution = () => {
    for (const group of spawnGroups.values()) {
      if (group.resolvedAt !== undefined) {
        continue
      }

      if (group.resolution.type === 'allInactive') {
        if (group.defeated + group.escaped >= group.spawned) {
          group.resolvedAt = elapsed
        }
        continue
      }

      if (group.resolution.type === 'allDefeated') {
        if (group.defeated >= group.spawned) {
          group.resolvedAt = elapsed
        }
        continue
      }

      if (elapsed - group.startedAt < group.resolution.seconds) {
        continue
      }

      if (group.resolution.then === 'resolve') {
        group.forcedResolved = true
        group.resolvedAt = elapsed
      }

      if (group.resolution.then === 'forceEscape') {
        for (let index = enemies.length - 1; index >= 0; index -= 1) {
          if (enemies[index]!.groupId === group.id) {
            enemies.splice(index, 1)
            group.escaped += 1
          }
        }
        group.forcedResolved = true
        group.resolvedAt = elapsed
      }
    }
  }
```

Call `markEnemyDefeated(enemy)` before splicing defeated enemies. Call `markEnemyEscaped(enemy)` before splicing enemies that leave the viewport.

- [ ] **Step 7: Implement event trigger evaluation**

Add:

```ts
  const getBossById = (bossId: string) =>
    bosses.find((candidate) => candidate.id === bossId) ?? null

  const isConditionMet = (condition: StageCondition) => {
    if (condition.type === 'bossActive') {
      return getBossById(condition.bossId) !== null
    }

    const boss = getBossById(condition.bossId)
    return boss?.currentPhaseId === condition.phaseId
  }

  const isTriggerMet = (trigger: StageTrigger, eventState: EventState) => {
    if (trigger.type === 'time') {
      return elapsed >= trigger.at
    }

    if (trigger.type === 'afterResolved') {
      const group = spawnGroups.get(trigger.target)
      if (group?.resolvedAt === undefined) {
        return false
      }
      return elapsed >= group.resolvedAt + trigger.delay
    }

    if (trigger.type === 'afterDefeated') {
      const group = spawnGroups.get(trigger.target)
      if (group) {
        return group.defeated >= group.spawned && elapsed >= (group.resolvedAt ?? elapsed) + trigger.delay
      }

      const defeatedAt = defeatedBosses.get(trigger.target)
      return defeatedAt !== undefined && elapsed >= defeatedAt + trigger.delay
    }

    if (trigger.type === 'bossHp') {
      const boss = getBossById(trigger.bossId)
      return boss ? boss.hp / boss.maxHp <= trigger.atOrBelow : false
    }

    if (trigger.type === 'bossPhase') {
      const boss = getBossById(trigger.bossId)
      return boss?.enteredPhaseIds.has(trigger.phaseId) ?? false
    }

    if (!isConditionMet(trigger.while)) {
      return false
    }

    return eventState.lastFiredAt === undefined || elapsed >= eventState.lastFiredAt + trigger.every
  }
```

Import `StageCondition` and `StageTrigger` from `../types`.

- [ ] **Step 8: Implement action execution**

Add:

```ts
  const executeEventAction = (action: StageAction) => {
    if (action.type === 'spawnWave') {
      spawnWave(action.wave, action.groupKind ?? 'wave')
      return
    }

    if (action.type === 'spawnBoss') {
      spawnBoss(action.boss, action.role)
      return
    }

    finish(action.outcome)
  }

  const updateStageEvents = () => {
    for (const event of stage.events) {
      const eventState =
        eventStates.get(event.id) ??
        {
          id: event.id,
          fired: false,
        }
      eventStates.set(event.id, eventState)

      if ((event.once ?? true) && eventState.fired) {
        continue
      }

      if (!isTriggerMet(event.trigger, eventState)) {
        continue
      }

      for (const action of event.actions) {
        executeEventAction(action)
      }
      eventState.fired = true
      eventState.lastFiredAt = elapsed
    }
  }
```

- [ ] **Step 9: Update enemy movement**

Replace movement code in `updateEnemies` with:

```ts
      if (enemy.movement.type === 'flyThrough') {
        enemy.z -= enemy.movement.speed * delta
        const waveShift = elapsed * 1.8 + enemy.drift
        if (enemy.movement.path === 'swoop-left') {
          enemy.x += Math.sin(waveShift) * 0.012
        } else if (enemy.movement.path === 'swoop-right') {
          enemy.x -= Math.sin(waveShift) * 0.012
        } else {
          enemy.x += Math.sin(waveShift * 1.2) * 0.02
        }
      } else if (enemy.z > enemy.movement.holdZ) {
        enemy.z = Math.max(enemy.movement.holdZ, enemy.z - enemy.movement.entrySpeed * delta)
      } else {
        const waveShift = elapsed * enemy.movement.strafeSpeed + enemy.drift
        enemy.x = Math.sin(waveShift) * enemy.movement.strafeRange
      }
```

When checking escape, only fly-through enemies naturally escape:

```ts
      if (enemy.movement.type === 'flyThrough' && enemy.z < -3.3) {
        markEnemyEscaped(enemy)
        enemies.splice(index, 1)
      }
```

- [ ] **Step 10: Update boss handling**

Update `spawnBoss`:

```ts
  const spawnBoss = (definition: BossDefinition, role: 'midboss' | 'final') => {
    const bossHp = invincible ? Math.round(definition.hp * 0.28) : definition.hp
    bosses.push({
      id: definition.id,
      role,
      x: 0,
      z: 2.15,
      hp: bossHp,
      maxHp: bossHp,
      shootTimer: 0.45,
      supportLaserTimer: 1.1,
      definition,
      currentPhaseId: null,
      enteredPhaseIds: new Set<string>(),
    })
    bossEnteredCount += 1
    cuePulse += 1
  }
```

Update `getBossPhase` to accept a boss:

```ts
  const getBossPhase = (candidate: RuntimeBoss) => {
    const ratio = candidate.hp / candidate.maxHp
    return (
      candidate.definition.phases.find((phase) => ratio >= phase.threshold) ??
      candidate.definition.phases[candidate.definition.phases.length - 1] ??
      null
    )
  }
```

Update `updateBoss` into `updateBosses` by iterating `bosses` backward. On defeat:

```ts
        defeatedBosses.set(candidate.id, elapsed)
        bosses.splice(index, 1)
        cuePulse += 1
        continue
```

Do not call `finish('victory')` in boss defeat logic. Victory now comes from a `finishStage` event.

- [ ] **Step 11: Update special beam and player bullet boss collision**

Replace single `boss` checks with loops:

```ts
    for (const candidate of bosses) {
      if (isInsideBeam({ x: candidate.x, z: candidate.z }, 0.44)) {
        candidate.hp -= damage
        if (canSpawnSparkle) {
          spawnSparkle(candidate.x, candidate.z, 1.25)
          spawnedSparkle = true
        }
      }
    }
```

For player bullets:

```ts
        for (const candidate of bosses) {
          const hitDistance = bullet.radius + 0.44
          if (
            distanceSquared(
              { x: bullet.x, z: bullet.z },
              { x: candidate.x, z: candidate.z },
            ) < hitDistance * hitDistance
          ) {
            candidate.hp -= bullet.damage
            bullets.splice(index, 1)
            consumed = true
            break
          }
        }
```

- [ ] **Step 12: Update buildSnapshot for bosses**

Create `renderBosses`:

```ts
    const renderBosses: RenderBoss[] = bosses.map((candidate) => {
      const phase = getBossPhase(candidate)

      return {
        id: candidate.id,
        position: { x: candidate.x, z: candidate.z },
        hpRatio: clamp(candidate.hp / candidate.maxHp, 0, 1),
        phaseLabel: phase?.label ?? 'Phase',
        supportLaser: phase?.supportLaser ?? false,
      }
    })
    const renderBoss = renderBosses.find((candidate) =>
      bosses.find((bossCandidate) => bossCandidate.id === candidate.id && bossCandidate.role === 'final'),
    ) ?? renderBosses[0] ?? null
```

Return both:

```ts
      boss: renderBoss,
      bosses: renderBosses,
```

- [ ] **Step 13: Replace update loop stage progression**

Remove `waveQueue`, `midbossDefeated`, `midbossGateDelay`, `midbossGateAfterWaveIndex`, `getPostMidbossTimelineElapsed`, and old spawn checks.

In `update`, after `updateBullets(delta)` call:

```ts
    updateSpawnGroupResolution()
    updateStageEvents()
```

Remove hard-coded duration victory:

```ts
    if (!result && !stage.midboss && elapsed >= stage.duration && !boss) {
      finish('victory')
    }
```

- [ ] **Step 14: Run runtime tests**

Run: `npm test -- src/game/runtime/battleRuntime.test.ts`

Expected: PASS after updating all test fixtures to create event stages. If failures mention `stage.waves` or `stage.boss`, update the fixture helper to extract spawn waves and final boss from `stage.events`.

- [ ] **Step 15: Commit Task 4**

Run:

```bash
git add src/game/runtime/battleRuntime.ts src/game/runtime/battleRuntime.test.ts
git commit -m "Evaluate battle progression through stage events"
```

---

### Task 5: Add Strafe, Timeout, Boss HP, Boss Phase, And Multi-Midboss Coverage

**Files:**
- Modify: `src/game/runtime/battleRuntime.test.ts`

- [ ] **Step 1: Add a strafe fixture**

In `battleRuntime.test.ts`, add:

```ts
function createStrafeStage(options?: {
  resolution?: StageDefinition['events'][number]['actions'][number]
}): StageDefinition {
  const stage = createStageDefinition('normal')
  const baseWave = getFirstWave(stage)
  const guardWave = {
    ...baseWave,
    id: 'guard',
    count: 1,
    hp: 999,
    movement: {
      type: 'enterAndStrafe',
      entrySpeed: 5,
      holdZ: 1.2,
      strafeSpeed: 2,
      strafeRange: 1.6,
    },
    resolution: { type: 'allDefeated' },
  } satisfies typeof baseWave
  const secondWave = { ...baseWave, id: 'after-guard', count: 1, hp: 999 }

  return {
    ...stage,
    duration: 999,
    events: [
      {
        id: 'guard-event',
        trigger: { type: 'time', at: 0 },
        actions: [{ type: 'spawnWave', wave: guardWave }],
      },
      {
        id: 'after-guard-event',
        trigger: { type: 'afterResolved', target: 'guard', delay: 0.1 },
        actions: [{ type: 'spawnWave', wave: secondWave }],
      },
    ],
  }
}
```

If `satisfies typeof baseWave` is too strict for narrowed union types, use `const guardWave: typeof baseWave = { ... }`.

- [ ] **Step 2: Add strafe tests**

Add:

```ts
  it('keeps enter-and-strafe enemies near their hold line', () => {
    const runtime = createRuntime({ stage: createStrafeStage() })

    runtime.update(1)
    const firstZ = runtime.getSnapshot().enemies[0]?.position.z
    runtime.update(1)
    const secondZ = runtime.getSnapshot().enemies[0]?.position.z

    expect(firstZ).toBeCloseTo(1.2, 1)
    expect(secondZ).toBeCloseTo(1.2, 1)
  })

  it('does not resolve allDefeated strafe waves while the guard is alive', () => {
    const runtime = createRuntime({ stage: createStrafeStage() })

    for (let index = 0; index < 60; index += 1) {
      runtime.update(0.1)
    }

    expect(runtime.getSnapshot().enemies.some((enemy) => enemy.waveId === 'after-guard')).toBe(false)
  })
```

- [ ] **Step 3: Add forceEscape timeout fixture and test**

Add:

```ts
function createForceEscapeStrafeStage(): StageDefinition {
  const stage = createStrafeStage()
  const guardAction = stage.events[0]!.actions[0]
  if (guardAction.type !== 'spawnWave') {
    throw new Error('guard event must spawn a wave')
  }

  return {
    ...stage,
    events: [
      {
        ...stage.events[0]!,
        actions: [
          {
            type: 'spawnWave',
            wave: {
              ...guardAction.wave,
              resolution: { type: 'timeout', seconds: 0.5, then: 'forceEscape' },
            },
          },
        ],
      },
      stage.events[1]!,
    ],
  }
}

it('force-escapes timeout strafe waves so progression cannot hang', () => {
  const runtime = createRuntime({ stage: createForceEscapeStrafeStage() })

  runtime.update(0.7)
  runtime.update(0.2)

  expect(runtime.getSnapshot().enemies.some((enemy) => enemy.waveId === 'after-guard')).toBe(true)
})
```

- [ ] **Step 4: Add boss HP summon fixture and test**

Add:

```ts
function createBossHpSummonStage(): StageDefinition {
  const stage = createStageDefinition('normal')
  const baseWave = getFirstWave(stage)
  const finalBossAction = stage.events
    .flatMap((event) => event.actions)
    .find((action) => action.type === 'spawnBoss' && action.role === 'final')

  if (!finalBossAction || finalBossAction.type !== 'spawnBoss') {
    throw new Error('stage must include a final boss')
  }

  return {
    ...stage,
    duration: 999,
    events: [
      {
        id: 'boss-now',
        trigger: { type: 'time', at: 0 },
        actions: [{ type: 'spawnBoss', boss: { ...finalBossAction.boss, hp: 120 }, role: 'final' }],
      },
      {
        id: 'boss-hp-summon',
        trigger: { type: 'bossHp', bossId: finalBossAction.boss.id, atOrBelow: 0.7 },
        actions: [{ type: 'spawnWave', groupKind: 'summon', wave: { ...baseWave, id: 'hp-summon', count: 1 } }],
      },
    ],
  }
}

it('spawns summon waves from boss HP triggers', () => {
  const runtime = createRuntime({ stage: createBossHpSummonStage(), character: midbossSlayerPilot })

  for (let index = 0; index < 12; index += 1) {
    runtime.update(0.05)
  }

  expect(runtime.getSnapshot().enemies.some((enemy) => enemy.waveId === 'hp-summon')).toBe(true)
})
```

- [ ] **Step 5: Add boss phase summon fixture and test**

Add:

```ts
function createBossPhaseSummonStage(): StageDefinition {
  const stage = createBossHpSummonStage()
  const bossAction = stage.events[0]!.actions[0]
  const summonAction = stage.events[1]!.actions[0]
  if (bossAction.type !== 'spawnBoss' || summonAction.type !== 'spawnWave') {
    throw new Error('phase fixture must include boss then summon')
  }

  return {
    ...stage,
    events: [
      stage.events[0]!,
      {
        id: 'phase-summon',
        trigger: { type: 'bossPhase', bossId: bossAction.boss.id, phaseId: bossAction.boss.phases[1]!.id },
        actions: [{ type: 'spawnWave', groupKind: 'summon', wave: { ...summonAction.wave, id: 'phase-summon' } }],
      },
    ],
  }
}

it('spawns summon waves from boss phase triggers', () => {
  const runtime = createRuntime({ stage: createBossPhaseSummonStage(), character: midbossSlayerPilot })

  for (let index = 0; index < 12; index += 1) {
    runtime.update(0.05)
  }

  expect(runtime.getSnapshot().enemies.some((enemy) => enemy.waveId === 'phase-summon')).toBe(true)
})
```

- [ ] **Step 6: Add multi-midboss test**

Add:

```ts
function createMultiMidbossStage(): StageDefinition {
  const stage = createBossHpSummonStage()
  const bossAction = stage.events[0]!.actions[0]
  if (bossAction.type !== 'spawnBoss') {
    throw new Error('multi-midboss fixture must include a boss action')
  }

  return {
    ...stage,
    events: [
      {
        id: 'midboss-a',
        trigger: { type: 'time', at: 0 },
        actions: [{ type: 'spawnBoss', boss: { ...bossAction.boss, id: 'midboss-a' }, role: 'midboss' }],
      },
      {
        id: 'midboss-b',
        trigger: { type: 'time', at: 0.1 },
        actions: [{ type: 'spawnBoss', boss: { ...bossAction.boss, id: 'midboss-b' }, role: 'midboss' }],
      },
    ],
  }
}

it('supports multiple active midbosses in the snapshot', () => {
  const runtime = createRuntime({ stage: createMultiMidbossStage() })

  runtime.update(0.2)

  expect(runtime.getSnapshot().bosses.map((boss) => boss.id).sort()).toEqual([
    'midboss-a',
    'midboss-b',
  ])
})
```

- [ ] **Step 7: Run runtime tests**

Run: `npm test -- src/game/runtime/battleRuntime.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit Task 5**

Run:

```bash
git add src/game/runtime/battleRuntime.test.ts
git commit -m "Cover event-driven wave and boss progression"
```

---

### Task 6: Update UI And Hook Tests For Event Stages

**Files:**
- Modify: `src/game/ui/battleEntities.tsx`
- Modify: `src/game/ui/BattleView.test.ts`
- Modify: `src/game/ui/useBattleRuntime.test.ts`
- Modify: `src/game/ui/BattleHud.tsx` only if `BattleSnapshot` usage requires it

- [ ] **Step 1: Write failing texture selection test for event-owned bosses**

In `src/game/ui/BattleView.test.ts`, replace `stage.midboss` access in the midboss texture test with event extraction:

```ts
function getBossFromStage(stage: StageDefinition, role: 'midboss' | 'final') {
  const action = stage.events
    .flatMap((event) => event.actions)
    .find((candidate) => candidate.type === 'spawnBoss' && candidate.role === role)

  if (!action || action.type !== 'spawnBoss') {
    throw new Error(`stage must include a ${role} boss`)
  }

  return action.boss
}
```

Update assertions:

```ts
    const midboss = getBossFromStage(stage, 'midboss')
    const stageWithUnprefixedMidboss: StageDefinition = {
      ...stage,
      events: stage.events.map((event) => ({
        ...event,
        actions: event.actions.map((action) =>
          action.type === 'spawnBoss' && action.role === 'midboss'
            ? { ...action, boss: { ...action.boss, id: 'ember-gate' } }
            : action,
        ),
      })),
    }

    expect(getBossCoreTextureUrl(stageWithUnprefixedMidboss, { id: 'ember-gate' })).toBe(
      gameAssets.stage2MidbossCoreUrl,
    )
```

- [ ] **Step 2: Run UI tests and verify failures**

Run: `npm test -- src/game/ui/BattleView.test.ts src/game/ui/useBattleRuntime.test.ts`

Expected: FAIL where code still expects `stage.midboss` or `stage.boss`.

- [ ] **Step 3: Update `getBossCoreTextureUrl`**

In `src/game/ui/battleEntities.tsx`, replace the function:

```ts
function getBossDefinitionsByRole(stage: StageDefinition, role: 'midboss' | 'final') {
  return stage.events.flatMap((event) =>
    event.actions.flatMap((action) =>
      action.type === 'spawnBoss' && action.role === role ? [action.boss] : [],
    ),
  )
}

export function getBossCoreTextureUrl(stage: StageDefinition, boss: { id: string } | null) {
  const midbosses = getBossDefinitionsByRole(stage, 'midboss')
  if (boss && midbosses.some((definition) => definition.id === boss.id)) {
    return gameAssets.stage2MidbossCoreUrl
  }

  const finalBosses = getBossDefinitionsByRole(stage, 'final')
  if (
    boss &&
    finalBosses.some((definition) => definition.id === boss.id) &&
    stage.backgroundTheme === 'burning-ruins'
  ) {
    return gameAssets.stage2BossCoreUrl
  }

  return gameAssets.bossCoreUrl
}
```

Keep `BossSprite` using `snapshot.boss` for now.

- [ ] **Step 4: Update immediate victory hook fixture**

In `src/game/ui/useBattleRuntime.test.ts`, update `createImmediateVictoryStage`:

```ts
function createImmediateVictoryStage(): StageDefinition {
  const stage = createStageDefinition('normal')

  return {
    ...stage,
    duration: 999,
    events: [
      {
        id: 'immediate-victory',
        trigger: { type: 'time', at: 0.01 },
        actions: [{ type: 'finishStage', outcome: 'victory' }],
      },
    ],
  }
}
```

- [ ] **Step 5: Run UI tests**

Run: `npm test -- src/game/ui/BattleView.test.ts src/game/ui/useBattleRuntime.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit Task 6**

Run:

```bash
git add src/game/ui/battleEntities.tsx src/game/ui/BattleView.test.ts src/game/ui/useBattleRuntime.test.ts src/game/ui/BattleHud.tsx
git commit -m "Update UI for event-owned bosses"
```

---

### Task 7: Full Verification And Cleanup

**Files:**
- Modify any test fixtures still using removed fields.
- Modify docs only if implementation diverged from `docs/superpowers/specs/2026-05-02-stage-event-timeline-design.md`.

- [ ] **Step 1: Search for removed stage and wave fields**

Run:

```bash
rg -n "stage\\.waves|stage\\.boss|stage\\.midboss|wave\\.startAt|wave\\.speed|wave\\.path|gateAfterWaveIndex|midbossGateDelay|midbossDefeated|waveQueue" src
```

Expected: no matches, except comments in tests that intentionally describe removed behavior. Remove or update any code matches.

- [ ] **Step 2: Run all tests**

Run: `npm test`

Expected: all test files pass.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: `tsc && vite build` succeeds.

- [ ] **Step 5: Inspect final diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: only intended implementation files are modified.

- [ ] **Step 6: Commit final cleanup**

If Step 5 shows remaining intended modifications, run:

```bash
git add src/game/types.ts src/game/content src/game/runtime src/game/ui
git commit -m "Finish stage event timeline migration"
```

If there are no remaining changes because prior tasks committed everything, do not create an empty commit.

---

## Self-Review

Spec coverage:

- Shared stage event contract: Tasks 1 and 3.
- Explicit triggers for all wave progression: Tasks 1, 3, and 4.
- Any number of midbosses: Tasks 4 and 5.
- Boss and midboss summons: Tasks 4 and 5.
- `afterResolved` versus `afterDefeated`: Tasks 4 and 5.
- Viewport escape tracking: Task 4.
- `enterAndStrafe` enemy movement: Tasks 2, 4, and 5.
- Explicit victory actions: Tasks 3, 4, 6, and 7.
- Existing Stage 1 and Stage 2 behavior coverage: Tasks 3, 4, 6, and 7.

Placeholder scan:

- No placeholder markers or deferred-work phrases remain.
- Each code-changing task includes concrete file paths, snippets, commands, and expected outcomes.

Type consistency:

- `StageEvent`, `StageTrigger`, `StageAction`, `StageCondition`, `EnemyMovementConfig`, and `SpawnGroupResolution` are introduced before use.
- `BattleSnapshot.boss` remains for compatibility and `BattleSnapshot.bosses` is added for multiple bosses.
- `EnemyWave.startAt`, `EnemyWave.speed`, and `EnemyWave.path` are removed from the target contract and replaced with `StageEvent.trigger` plus `EnemyWave.movement`.
