# Stage 2 Burning Ruins Design

## Goal

Add Stage 2 as an automatic continuation after Stage 1 victory.

Stage 2 should feel like a denser second act: a post-war burning ruin zone, more regular waves, twice the enemies per wave, a required midboss gate at the middle, and a stronger final boss. There is no stage select screen.

## Approved Direction

Use the Burning Ash Corridor direction.

Stage 1 remains the brass cloud gate. Stage 2 keeps the sense of forward flight but shifts the main visual signal from clouds to an endless scorched ruin floor scrolling below the battlefield. Clouds can remain as smoke and depth, but ruined ground structures must be visible under the arena and must loop continuously.

The midboss uses the approved gate behavior:

- Stage 2 regular waves pause at the midpoint.
- The midboss enters after the first half of waves.
- The second half of Stage 2 waves starts only after the midboss is defeated.

## Visual Design

Generate Stage 2 project assets with `imagegen`, using Stage 1 assets as style references:

- A burning ruin floor layer that can loop vertically under the playfield.
- Optional smoke/cloud variants that fit the hotter Stage 2 palette.
- A midboss sprite or core-like asset distinct from the final boss.

The floor should read as infinite ruins, not a single static backdrop:

- Broken road or fortress plates flow downward.
- Burnt walls, pillars, or wreckage pass under the combat lane.
- Orange ember light and dark ash contrast establish the war aftermath theme.
- Decorative details stay behind gameplay entities and use restrained opacity so bullets remain readable.

## Stage Progression

The app flow becomes:

1. Title, difficulty, character, and Stage 1 intro remain unchanged.
2. Stage 1 victory automatically starts Stage 2.
3. Stage 2 does not add a stage select screen.
4. Stage 2 victory shows the final clear result.
5. Defeat shows the result screen for the current failed run.

Retry should restart the current failed stage. Return to hangar should go back to the title flow.

## Stage 2 Content

Stage 2 derives its pacing from Stage 1:

- Stage 1 has 8 waves, so Stage 2 has 12 waves.
- Each Stage 2 wave uses twice the regular enemy count of its corresponding Stage 1-style placement.
- The midboss appears after wave 6.
- Waves 7 through 12 wait until the midboss is defeated.
- Final boss appears after the final regular wave sequence.

Stage 2 can reuse the existing enemy archetype and atlas for implementation speed, but should retune placements, timing, names, HP, and patterns so it does not feel like a simple repeat.

## Technical Design

Introduce explicit stage identity into the battle path.

Expected code shape:

- Add a Stage 2 content module beside `stage1.ts`.
- Update `StageDefinition` with enough metadata to identify Stage 1 versus Stage 2, background theme, and optional midboss.
- Update `useBattleRuntime` and `BattleView` to accept the selected stage definition instead of always creating Stage 1 internally.
- Extend the runtime with a midboss state that blocks later waves until defeated.
- Keep enemy, bullet, player, and special-attack collision rules consistent with Stage 1.
- Add Stage 2 background config and assets in the existing R3F background layer path.

The midboss should reuse boss-like render and damage behavior where practical, but it should not finish the stage when defeated. Only the final boss or normal stage completion can produce Stage 2 victory.

## Testing

Automated checks:

- Stage 2 has 12 waves.
- Stage 2 wave counts are twice the matching Stage 1-style counts.
- Stage 2 midboss starts at the midpoint gate.
- Later Stage 2 waves do not spawn before the midboss is defeated.
- Stage 1 victory transitions to Stage 2 without a stage select screen.
- Stage 2 victory produces the final result screen.
- Existing Stage 1 behavior remains covered.

Browser verification with Playwright:

- Start the game with fast stage and invincible debug flags.
- Confirm Stage 1 can clear and Stage 2 starts automatically.
- Confirm Stage 2 HUD and visuals identify Stage 2.
- Confirm the ruin floor scrolls continuously under the battlefield.
- Confirm the midboss appears before the second half of regular waves.

## Out Of Scope

- A stage selection menu.
- New player characters.
- New collision physics.
- New input controls.
- Replacing the whole runtime with a campaign manager.
