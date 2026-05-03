# Stage 3 Abyssal Biomech Design

## Goal

Add Stage 3 as a real campaign stage after Stage 2. The theme is a deep-sea
abyssal biomech zone: organic deep-sea silhouettes fused with mechanical hulls,
pressure valves, glowing lure cores, plated shells, and tendril fins.

Stage 3 should feel like a new act, not a recolor. It needs new enemy assets,
new midboss and boss assets, new scripted danmaku patterns, and a Stage 3-only
phase transition break where bosses stop attacking and become invulnerable for
3.0 seconds.

## Approved Direction

Use the "Abyssal Biomech" visual language.

Keep the existing six regular enemy archetype roles:

- `scout`
- `sentinel`
- `lancer`
- `splitter`
- `mine-layer`
- `weaver`

Add a new abyssal enemy theme and variants mapped to those roles:

- `abyssal-scout`
- `abyssal-sentinel`
- `abyssal-lancer`
- `abyssal-splitter`
- `abyssal-mine-layer`
- `abyssal-weaver`

This preserves the current movement, spawning, hit, and difficulty contracts
while letting Stage 3 look and play differently through theme-specific assets
and authored patterns.

## Campaign Flow

Stage 3 is part of the normal campaign:

1. Stage 1 victory waits for player confirmation and continues to Stage 2.
2. Stage 2 victory waits for player confirmation and continues to Stage 3.
3. Stage 3 victory shows the final result.

The battle session state model should expand from `1 | 2` to `1 | 2 | 3`.
Retry should support Stage 3. Returning to title should still reset to Stage 1.

`createBattleStageDefinition(stageNumber, difficulty, options)` should route:

- `1` to Stage 1.
- `2` to Stage 2.
- `3` to the new Stage 3.

## Stage Definition

Add `createStage3Definition(...)` beside the existing stage content files.
Stage 3 should use the current event-first model rather than runtime-specific
stage branches.

The timeline should include:

- Timed first-half waves.
- A midboss spawn.
- Post-midboss waves gated on midboss defeat.
- A final boss spawn gated on the midboss.
- A final victory event gated on final boss defeat.

Fast-stage scaling should use the same explicit event-time scaling convention
as the earlier stages.

## Midboss

The Stage 3 midboss should be a newly generated abyssal biomech asset.

Behavior:

- 2 phases.
- Phase 1 lasts above 50% HP.
- Phase 2 starts at or below 50% HP.
- The phase change uses the Stage 3 phase-break rule.

Pattern direction:

- Phase 1 introduces pressure lanes or lure-guided aimed shots with readable
  gaps.
- Phase 2 adds delayed blooms, bending currents, or contracting rings.

The midboss should not finish the stage when defeated. It only opens the
post-midboss timeline.

## Final Boss

The Stage 3 final boss should be a newly generated abyssal biomech asset with a
larger, clearer silhouette than the midboss.

Behavior:

- 4 phases.
- Phase thresholds are 75%, 50%, 25%, and 0%.
- Every phase transition uses the Stage 3 phase-break rule.

Pattern direction:

- Phase 1: readable pressure-ring or lane pattern.
- Phase 2: mirrored current lanes with delayed turning bullets.
- Phase 3: mine blooms or split shells that open after a telegraphed delay.
- Phase 4: mixed desperation pattern combining a pressure geometry layer with
  limited aimed pressure.

The patterns should be new Stage 3 BulletML-style scripts, not Stage 2 patterns
with different numbers.

## Stage 3 Phase Break

Stage 3 bosses use a longer phase transition than earlier stages.

When the midboss or final boss changes phase:

- Boss vulnerability becomes invulnerable for 3.0 seconds.
- Fire pattern becomes idle.
- Active attack cadence is interrupted.
- Movement may hold, drift, or retreat, but should not create a confusing
  damage window.
- Combat resumes after the break.

This is Stage 3-only. Stage 1 and Stage 2 phase transition timing should remain
unchanged unless a small generic hook is needed to support per-boss timing.

Tests can allow a small timing tolerance around the 3.0 second break, such as
2.8 to 3.2 seconds, to avoid brittle floating-point assertions.

The implementation should use the existing boss FSM surface where practical:
phase, fire pattern, vulnerability, and movement should reflect the transition
instead of being hidden in content-only timers.

## Assets

Use the built-in `imagegen` path for new raster assets.

Required project-bound assets:

- Abyssal enemy atlas covering the six variants.
- Stage 3 deep-sea background layer or layers.
- Stage 3 midboss asset.
- Stage 3 final boss asset.

Final runtime assets should live under `src/assets/generated/...` and be
registered through `src/game/assets.ts`. Runtime imports should use
web-optimized `.webp` files where the existing asset registry expects them.

The battle preload list should include Stage 3-specific enemy, background,
midboss, and final boss assets.

## Bullet Pattern Rules

Use BulletML scripted patterns for the Stage 3 midboss phase 2 and all final
boss phases. The midboss phase 1 can use either a classic pattern or BulletML if
that keeps the implementation clearer.

Fairness rules:

- Opening cadence should be readable.
- Dense sections should use repeated geometry: lanes, mirrored pairs, rotating
  sequence, contracting rings, or delayed blooms.
- A player should infer safe paths from geometry, not luck.
- Rank should scale count, speed, or wait time smoothly.
- Aimed shots should add pressure without sealing all exits.
- Delayed turning or bloom bullets need a readable delay before they change.

Avoid random-only chaos and unavoidable full-width walls at player depth.

## Testing

Add or update focused tests for:

- Stage 3 metadata, stage number, theme, event timeline, and fast-stage scaling.
- Abyssal enemy variants mapped to all six existing archetypes.
- Stage 3 midboss gate: post-midboss waves and final boss wait for midboss
  defeat.
- Midboss has 2 phases with the 50% transition.
- Final boss has 4 phases with 75%, 50%, and 25% transition thresholds.
- Stage 3 phase transitions produce 3.0 seconds of invulnerability and no
  firing, with a tolerance-based assertion.
- Stage 1 and Stage 2 phase transition behavior remains unchanged.
- Campaign flow continues Stage 2 victory into Stage 3 and makes Stage 3 victory
  the final result.
- Retry supports Stage 3.
- Asset registry and preload include Stage 3 background, enemy atlas, midboss,
  and boss assets.
- Battle rendering chooses the Stage 3 abyssal enemy atlas and boss textures.

## Verification

After implementation, run:

```bash
npm run typecheck
npm test
npm run build
```

Because this feature adds visible game assets and battle presentation changes,
also run a browser smoke check of the campaign path when practical.
