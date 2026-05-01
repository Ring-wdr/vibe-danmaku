# Enemy Archetype Atlas System Design

## Goal

Replace the current small, stage-local enemy set with a reusable enemy content system that can support more enemy aircraft, richer attack patterns, future themes, and difficulty-specific tuning.

The first implementation should focus on the data system and Stage 1 migration. It should not build an automatic wave generator yet.

## Chosen Approach

Use an archetype-first content model.

An enemy archetype defines the gameplay role:

- role identity
- base HP and movement speed
- default movement path
- default bullet pattern
- render scale and hitbox expectations

A theme variant defines the presentation and theme-specific flavor:

- display name
- atlas id
- frame id
- palette or glow metadata
- small pattern overrides when the theme needs a distinct feel

Difficulty tuning is applied after archetype and theme data are combined. Stage definitions then choose which archetype and variant appear in each wave.

This keeps the current runtime shape stable: `createBattleRuntime` can continue consuming resolved `EnemyWave` objects while the content layer becomes reusable.

## Enemy Archetypes

The first vocabulary should include six regular enemy archetypes:

- `scout`: fast entry enemy with shallow fan fire, preserving the current basic wave rhythm.
- `sentinel`: slower durable guard enemy with ring or guard-style fire that controls dodge space.
- `lancer`: sniper enemy with delayed needle or lane pressure.
- `splitter`: enemy that produces split bullets or staged density increases.
- `mine-layer`: enemy that drops slow persistent hazards to temporarily block movement lanes.
- `weaver`: pattern enemy for spiral, wave, or curved bullet pressure.

The current `steam-scout` and `feather-drone` concepts should be absorbed into this vocabulary rather than staying as one-off stage-only kinds.

## Sprite Atlas Asset Model

Multiple enemy images should be generated, but runtime loading should be minimized with theme-level sprite atlases.

For the first brass-cloud theme:

- Generate six source enemy sprites with `imagegen`, one per archetype.
- Pack those sprites into one atlas image, for example `enemy-brass-cloud-atlas.png`.
- Store frame metadata in TypeScript, for example `enemy-brass-cloud-atlas.ts`.
- Theme variants reference `atlasId + frameId` instead of individual PNG URLs.

At runtime, the renderer loads one texture per enemy theme and renders each enemy by applying frame UVs from the atlas metadata.

Future themes should follow the same structure:

- `enemy-ice-ruin-atlas.png`
- `enemy-void-orbit-atlas.png`
- matching TypeScript frame metadata

This gives the project more visual variety without multiplying texture requests.

## Pattern Vocabulary

Keep pattern definitions enum-based in the first pass. Do not introduce a scripting DSL yet.

The existing shapes are:

- `fan`
- `ring`
- `spiral`
- `laser-bloom`

Add regular-enemy-focused patterns:

- `needle`: narrow aimed or lane-like pressure for lancer enemies.
- `split`: bullets that create secondary bullets after time or distance.
- `mine`: slow hazard bullets with longer life and larger area pressure.
- `wave`: staggered curved or sine-like fire for weaver enemies.

Pattern configuration should remain serializable and testable. If a pattern needs extra knobs, add explicit optional fields rather than embedding behavior in ad hoc strings.

## Data Flow

The content layer resolves regular waves with this composition:

```text
EnemyArchetype
  + ThemeVariant
  + DifficultyTuning
  + StageWavePlacement
  = EnemyWave
```

Responsibilities:

- `EnemyArchetype`: gameplay defaults.
- `ThemeVariant`: asset frame, display identity, and small theme flavor overrides.
- `DifficultyTuning`: HP multiplier, bullet count multiplier, bullet speed multiplier, and interval scale.
- `StageWavePlacement`: timing, count, spacing, archetype id, variant id, and narrow per-wave overrides.

Stage files should read as stage composition rather than low-level enemy tuning tables.

## Component And File Design

Add a regular enemy content module:

- `src/game/content/enemies.ts`
  - archetype definitions
  - theme variant definitions
  - difficulty tuning definitions
  - wave resolver helpers

Add atlas metadata near generated assets or content definitions:

- `src/assets/generated/enemy-brass-cloud-atlas.png`
- `src/game/content/enemyBrassCloudAtlas.ts`

Update existing assets and rendering:

- `src/game/assets.ts` exposes atlas textures instead of every enemy image as a standalone runtime URL.
- `src/game/types.ts` expands enemy and pattern types to represent archetype/variant-based regular enemies and the new pattern shapes.
- `src/game/ui/BattleView.tsx` resolves enemy atlas frames and renders enemy planes with frame UVs.
- `src/game/content/stage1.ts` uses the resolver to define Stage 1 waves.
- `src/game/runtime/battleRuntime.ts` adds only the pattern behavior needed by the new enum shapes.

The renderer should keep the boss path separate in the first pass. Boss atlas support can be added later if boss variety becomes a theme requirement.

## Stage 1 Migration

Stage 1 should keep its current brass-cloud identity but use the new system.

The migrated Stage 1 should:

- include all six regular enemy archetypes at least once
- keep early combat starting quickly after deploy
- avoid long empty gaps between waves
- preserve the boss timing structure unless pattern pressure requires small timing adjustments
- keep the current `fastStage` scaling behavior

The initial wave list can remain hand-authored. Automatic wave composition is out of scope for this pass.

## Image Generation Plan

Use `imagegen` to create six brass-cloud enemy aircraft sprites:

- scout
- sentinel
- lancer
- splitter
- mine-layer
- weaver

Prompt constraints:

- consistent brass-cloud / aether aircraft art direction
- readable top-down or three-quarter silhouette for a vertical danmaku game
- clean transparent or chroma-key-removable background
- no text, watermark, cast shadow, or complex environment
- generous padding and consistent framing so atlas packing is reliable

After generation, store final project-bound assets inside the workspace and pack the selected sprites into the atlas before wiring them into code.

## Testing

Automated tests should cover:

- resolver output for each difficulty
- all six archetypes appearing in the migrated Stage 1
- pattern scaling still changes count, speed, and interval by difficulty
- atlas metadata references valid frames for every brass-cloud variant
- runtime creates expected bullet behavior for new pattern shapes

Verification commands:

```powershell
npm test
npm run typecheck
npm run build
```

Browser verification should include:

- start the Vite app
- enter battle with a fast-stage/invincible path
- confirm the Canvas is nonblank
- confirm new enemy variants are visible from the atlas
- confirm the HUD and drag controls still work
- capture an updated screenshot under `output/playwright/`

## Out Of Scope

- automatic wave generation
- multi-stage campaign structure
- boss archetype system
- boss atlas migration
- pattern scripting DSL
- scoring, drops, upgrades, or progression changes
- replacing the player sprite pipeline

## Open Risks

Atlas UV rendering needs careful verification because a wrong frame rectangle can produce subtle visual errors that unit tests may not catch. Browser screenshot verification is required.

Generated sprites may vary in framing or background cleanup quality. The implementation should include a small normalization or packing step so source image differences do not leak into gameplay scale.

New bullet patterns can increase visual density quickly. Difficulty tuning should include caps or conservative first values so the battle remains readable.
