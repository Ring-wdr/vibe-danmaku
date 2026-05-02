# Stage Event Timeline Design

## Goal

Replace the current stage-specific progression logic with a shared stage event interface that can support many future stages without adding per-stage runtime branches.

The new model must handle:

- Stage 1 and Stage 2 through the same stage contract.
- Any number of midbosses.
- Bosses or midbosses that summon regular enemy waves during combat.
- Wave progression based on explicit triggers instead of implicit time-only movement.
- Enemy waves that resolve when enemies are defeated, escape the viewport, or satisfy an explicit timeout rule.

## Current Problem

`StageDefinition` currently separates content into `waves`, optional single `midboss`, and final `boss`. The runtime mirrors that shape with one midboss gate, one final boss, and special timeline delay logic for Stage 2.

That works for two stages, but it does not scale cleanly:

- More than one midboss requires new runtime state.
- Boss summons require special-case spawn paths.
- Time-only waves cannot express "spawn after the previous wave is handled".
- A wave can block progression if enemies stop moving downward and never leave the viewport.
- Victory by duration or final boss defeat is not represented as stage data.

## Approved Direction

Use an explicit event timeline.

Each stage defines `events`. Each event declares why it fires through a `trigger`, and what happens through `actions`. Runtime no longer infers stage flow from array position or from a hard-coded Stage 2 midboss rule.

Enemy waves remain the reusable unit for "a group of enemies to spawn", but wave timing moves out of `EnemyWave` and into `StageEvent.trigger`.

## Stage Contract

Target shape:

```ts
type StageDefinition = {
  id: StageId
  stageNumber: number
  backgroundTheme: StageBackgroundTheme
  name: string
  lore: string
  duration?: number
  events: StageEvent[]
}

type StageEvent = {
  id: string
  trigger: StageTrigger
  actions: StageAction[]
  once?: boolean
}
```

`stageNumber` should no longer be limited to `1 | 2`.

`duration` becomes optional metadata. Survival stages can still use duration, but regular stage completion should be represented by a `finishStage` action.

## Triggers

Initial trigger set:

```ts
type StageTrigger =
  | { type: 'time'; at: number }
  | { type: 'afterResolved'; target: string; delay: number }
  | { type: 'afterDefeated'; target: string; delay: number }
  | { type: 'bossHp'; bossId: string; atOrBelow: number }
  | { type: 'bossPhase'; bossId: string; phaseId: string }
  | { type: 'interval'; every: number; while: StageCondition }
```

Trigger meanings:

- `time`: Fires at a stage timestamp.
- `afterResolved`: Fires after the target spawn group is inactive. Defeated and escaped enemies both count.
- `afterDefeated`: Fires after the target spawn group or boss is defeated. For spawn groups, escaped enemies do not count.
- `bossHp`: Fires when a specific boss reaches an HP ratio at or below the threshold.
- `bossPhase`: Fires when a specific boss enters a phase.
- `interval`: Fires repeatedly while a condition is true. This is for boss or phase-based summons.

`target` refers to a stage-owned id. It can be a spawn group id created by `spawnWave` or a boss id created by `spawnBoss`. A target id must be unique within a stage.

Every wave event should declare one of these triggers. Avoid implicit "next wave" rules.

## Actions

Initial action set:

```ts
type StageAction =
  | { type: 'spawnWave'; wave: EnemyWave; groupKind?: 'wave' | 'summon' }
  | { type: 'spawnBoss'; boss: BossDefinition; role: 'midboss' | 'final' }
  | { type: 'finishStage'; outcome: 'victory' }
```

The first implementation should keep this small. A future `setGate` or branch action can be added only when a stage needs it.

Boss and midboss summons should use `spawnWave` first. This keeps enemy spawning, rendering, movement, hit tracking, and difficulty tuning on the same path as regular waves.

## Enemy Wave Contract

`EnemyWave` should become a spawn group definition instead of a timeline item.

Target additions:

```ts
type EnemyWave = {
  id: string
  count: number
  spacing: number
  hp: number
  pattern: BulletPatternConfig
  movement: EnemyMovementConfig
  resolution: SpawnGroupResolution
  // existing enemy identity, atlas, scale, radius, and pattern fields remain
}

type EnemyMovementConfig =
  | {
      type: 'flyThrough'
      path: 'swoop-left' | 'swoop-right' | 'helix'
      speed: number
    }
  | {
      type: 'enterAndStrafe'
      entrySpeed: number
      holdZ: number
      strafeSpeed: number
      strafeRange: number
    }

type SpawnGroupResolution =
  | { type: 'allInactive' }
  | { type: 'allDefeated' }
  | { type: 'timeout'; seconds: number; then: 'resolve' | 'fail' | 'forceEscape' }
```

`flyThrough` covers current moving enemies. They enter from above, move through the playfield, and become escaped when they leave the viewport.

`enterAndStrafe` supports guard-style enemies. They enter once, hold a combat lane, and move side to side without drifting toward the player. These waves should usually use `allDefeated` or an explicit timeout so progression cannot hang by accident.

## Spawn Group Resolution

Runtime should track every spawned wave or summon:

```ts
type SpawnGroupState = {
  id: string
  kind: 'wave' | 'summon'
  spawned: number
  defeated: number
  escaped: number
  forcedResolved: boolean
  startedAt: number
  resolvedAt?: number
}
```

Resolution rules:

- `allInactive`: resolved when `defeated + escaped >= spawned`.
- `allDefeated`: resolved when `defeated >= spawned`.
- `timeout` with `resolve`: resolved after the timeout even if enemies remain.
- `timeout` with `forceEscape`: despawns remaining enemies, records them as escaped, then resolves.
- `timeout` with `fail`: reserved for future failure or branch behavior. It should not be used until the runtime supports the result.

Viewport escape must update the spawn group. An enemy leaving the viewport is not just deleted; it increments `escaped`.

## Boss Model

Runtime should support multiple bosses internally:

```ts
type BossState = {
  id: string
  role: 'midboss' | 'final'
  hp: number
  maxHp: number
  currentPhaseId: string
  enteredPhases: Set<string>
}
```

`BossDefinition` can keep its phase structure, but phase entry should be observable by the event engine so `bossPhase` triggers and interval summons can work.

Boss defeat should be recorded in the event engine in the same way spawn group resolution is recorded. This lets `afterDefeated` target either `wave-3` or `boss-ash-citadel-core` without a special victory branch.

`BattleSnapshot` should move toward `bosses: RenderBoss[]`. If the UI still needs a primary boss bar, it can derive the primary boss from the first active final boss or the currently focused midboss. Avoid keeping only `boss: RenderBoss | null` as the long-term runtime contract because multiple midbosses are now valid.

## Runtime Update Order

Each update should use a stable order:

1. Advance time.
2. Update player fire and special state.
3. Update enemies, bullets, and bosses.
4. Record enemy defeated and escaped counts into spawn groups.
5. Record boss phase transitions and HP threshold state.
6. Evaluate stage event triggers.
7. Execute newly ready event actions.
8. Emit a snapshot.

`afterResolved` and `afterDefeated` should read `SpawnGroupState`, not scan active enemies directly.

## Victory

Stage completion should be data-driven.

Final boss stages:

```ts
{
  id: 'victory',
  trigger: { type: 'afterDefeated', target: 'boss-ash-citadel-core', delay: 0 },
  actions: [{ type: 'finishStage', outcome: 'victory' }]
}
```

Survival stages:

```ts
{
  id: 'survive-clear',
  trigger: { type: 'time', at: 180 },
  actions: [{ type: 'finishStage', outcome: 'victory' }]
}
```

The runtime should not hard-code "no midboss plus duration means victory" after this migration.

## Migration Shape

Implement this in compatibility-friendly steps:

1. Add event types and helper builders while keeping current stage content readable.
2. Convert Stage 1 to event timeline data.
3. Convert Stage 2 to event timeline data with one midboss represented as a normal `spawnBoss` event.
4. Replace runtime `waveQueue`, `midbossDefeated`, and `midbossGateDelay` with event evaluation and spawn group tracking.
5. Expand boss runtime and snapshot handling only as far as needed by current tests, while keeping the type ready for multiple bosses.
6. Add one test fixture with an `enterAndStrafe` wave to prove progression behavior is explicit.
7. Add one test fixture where a boss HP threshold summons an enemy wave.

## Testing

Automated checks:

- Stage 1 and Stage 2 both expose `events`.
- Every enemy wave spawn is owned by an explicit trigger.
- `afterResolved` fires after all enemies are defeated or escaped.
- `afterDefeated` does not fire when enemies only escape.
- `enterAndStrafe` enemies stop advancing downward after reaching `holdZ`.
- A strafe wave with `allDefeated` blocks the next event until enemies are defeated.
- A timeout with `forceEscape` resolves a strafe wave without hanging.
- Multiple midboss definitions can be spawned by separate events.
- Boss HP threshold events can spawn regular enemy waves.
- Boss phase events can spawn regular enemy waves or schedule interval summons.
- Final victory comes from an explicit `finishStage` event.
- Existing Stage 1 and Stage 2 gameplay flow remains covered.

## Out Of Scope

- A visual stage editor.
- Branching stage routes.
- Failure conditions for missed enemies.
- New enemy art assets.
- New boss rendering assets for multiple simultaneous bosses.
- Reworking bullet pattern shapes beyond what summons need.
