# Enemy Wave Formation Variety Design

## Goal

Make regular enemy waves feel less repetitive by varying how enemy groups enter, hold position, and move as formations. The change applies to all regular Stage 1-4 waves while preserving the existing stage event timeline, difficulty tuning, scoring, combo, boss flow, and rendering contracts.

## Current Problem

Regular waves are authored with `count`, `spacing`, and optional movement. The runtime turns most waves into a centered horizontal line and then applies either fly-through or enter-and-strafe movement. Even when enemy archetypes and bullet patterns differ, the visual read repeats: enemies appear from the top in a flat row, drift down, and leave or die.

The existing stage event model is already a good fit for this work. `EnemyWave` is the spawn-group contract, and `resolveEnemyWave` already centralizes defaults for movement and resolution. The missing piece is a compact formation contract that lets authored wave data describe entry side and per-enemy layout.

## Approved Direction

Add a shared `EnemyFormationConfig` to `EnemyWave`. Stage content will author formation presets per wave, and the battle runtime will use that contract to compute each enemy's initial position and formation origin.

This keeps variety visible in stage data instead of hiding it behind runtime-only procedural rules. It also avoids one-off movement branches per stage.

## Wave Contract

Add an `EnemyFormationConfig` union:

```ts
type EnemyFormationSide = 'top' | 'left' | 'right'

type EnemyFormationConfig =
  | { type: 'line'; side?: EnemyFormationSide; offsetX?: number }
  | { type: 'vee'; side?: EnemyFormationSide; depth: number }
  | { type: 'column'; side: 'left' | 'right'; depth: number }
  | { type: 'arc'; side?: 'top'; depth: number; bend: number }
  | { type: 'grid'; side?: EnemyFormationSide; columns: number; rowGap: number }
```

`EnemyWave` gains `formation: EnemyFormationConfig`.

`StageEnemyPlacement` gains optional `formation?: EnemyFormationConfig`.

`resolveEnemyWave` defaults missing formations to `{ type: 'line', side: 'top' }`, preserving existing content behavior.

## Runtime Behavior

Move the per-enemy spawn position calculation out of the inline loop in `spawnWave` into a small helper. Given a wave, enemy index, and count, it returns:

- `x`: initial horizontal position.
- `z`: initial depth position.
- `strafeOriginX`: the origin used by enter-and-strafe movement.
- `shootDelayOffset`: a small stagger so larger formations do not fire as one flat wall.

Formation semantics:

- `line`: current horizontal line, with optional left/right entry side.
- `vee`: enemies form a shallow V, with rear rows staggered farther back.
- `column`: enemies enter from one side in a vertical lane.
- `arc`: enemies form a curved front instead of a flat row.
- `grid`: enemies occupy several rows, useful for fixed or strafe guard groups.

For left/right side entry, enemies start outside or near the lateral edge, while `strafeOriginX` is calculated inside the playable arena. Fixed side waves should use `enterAndStrafe`, so they enter, hold, and sweep horizontally inside the arena. Fly-through side waves should keep their normal forward motion but begin from the left or right lane, creating a readable diagonal pass without adding a new movement type.

## Stage Content

Apply formations to every regular wave in Stage 1-4:

- Stage 1 introduces readable variety: line, vee, arc, and a light side-entry wave.
- Stage 2 uses denser side and grid formations around the midboss gate.
- Stage 3 emphasizes pressure formations: columns, arcs, and fixed grid holds.

Each stage should use at least three distinct formation signatures across its regular waves. A formation signature is `type:side`, such as `vee:top` or `column:left`.

Hold-position formations must use a resolution that cannot stall the stage. Prefer `allDefeated` for intentional guard waves and `timeout` with `forceEscape` when a fixed group should eventually clear itself.

## Testing

Follow test-first implementation:

1. Add `src/game/content/enemies.test.ts` coverage for formation defaults and placement overrides.
2. Add `src/game/runtime/battleRuntime.test.ts` coverage showing a side-entry wave starts from the side and moves inward.
3. Add Stage 1-4 content tests asserting each stage has at least three formation signatures and no stage is entirely the default top line formation.

Then implement the minimal production changes to pass those tests.

## Out Of Scope

- New enemy sprites or atlases.
- Boss movement or boss bullet pattern changes.
- Score, combo, player weapons, item drops, health, or difficulty tuning changes.
- UI layout changes.
- Replacing the stage event timeline.

## Verification

Run the targeted content/runtime tests first, then the repo verification ladder:

```powershell
npm test -- src/game/content/enemies.test.ts src/game/content/stage1.test.ts src/game/content/stage2.test.ts src/game/content/stage3.test.ts src/game/runtime/battleRuntime.test.ts
npm run typecheck
npm test
npm run build
```
