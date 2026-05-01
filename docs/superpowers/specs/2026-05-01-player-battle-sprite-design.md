# Player Battle Sprite Design

## Goal

Create a new player battle sprite sheet that fits the current steamfantasy danmaku concept while preserving the existing `player-sprite-sheet.png` file for later reuse.

The new sprite should keep the pilot-character identity instead of replacing the player with a pure aircraft. It should also respect the vertical shooter screen grammar: the player is positioned near the bottom of the screen and fights enemies above, so the sprite must read as a bottom-side pilot facing or banking upward rather than a front-facing character illustration.

## Chosen Direction

Use a battle-focused Lyra Aer pilot sprite sheet.

The sprite should preserve the current character cues:

- brass and teal steamfantasy palette
- aviator goggles, cape, feathered or mechanical wing accents
- bright aether effects that match the brass-cloud enemy theme
- full-body pilot silhouette

The battle version should simplify and brighten the silhouette so it remains readable on the R3F canvas, especially when bullets are dense. It should prioritize back-view or upward three-quarter poses, visible wings, cape flow, upward weapon direction, and propulsion/aether effects that imply movement toward the top of the battlefield.

## Asset Model

Add a new generated asset:

- `src/assets/generated/player-battle-sprite-sheet.png`

Keep the existing asset unchanged:

- `src/assets/generated/player-sprite-sheet.png`

The new sheet should remain a horizontal four-frame PNG because the current renderer already animates player textures with `frameColumns={4}`.

Recommended frame meanings:

- frame 1: neutral hover, seen from behind or upward three-quarter view
- frame 2: slight left bank while still facing upward
- frame 3: upward firing or aether focus pose
- frame 4: upward boost or evasive flourish pose

All frames should use consistent scale, baseline, padding, and character proportions so the animation does not wobble.

## Rendering Integration

Update `src/game/assets.ts` so `gameAssets.playerSheetUrl` points to the new battle sheet.

Do not change `PlayerSprite` geometry or animation behavior in the first pass. The existing R3F plane size, shader material, exposure, saturation, and four-column frame animation stay in place unless visual verification shows the new sprite is badly framed.

## Image Generation Prompt

Use `imagegen` to generate a single horizontal four-frame transparent game sprite sheet for a vertical danmaku shooter.

Prompt constraints:

- style: polished anime game sprite, steamfantasy brass and teal
- subject: Lyra Aer style female pilot, full-body, bottom-side player unit facing upward toward enemies
- perspective: back view or upward three-quarter view, not front-facing portrait poses
- layout: four evenly spaced frames in one horizontal row
- background: transparent or flat chroma-key-removable background
- no text, watermark, logos, cast shadow, environment, UI, or extra characters
- consistent framing, proportions, and foot baseline across all frames
- strong silhouette, brighter player-readability accents, upward weapon/aether direction, less tiny costume noise than the current sheet
- compact aether effects only; do not add long beams or trails that force the character to shrink inside the frame

If the generated output needs background removal, use the standard chroma-key cleanup path and save only the final project-bound PNG in the workspace.

## Testing And Verification

Automated verification:

```powershell
npm test
npm run build
```

Visual verification:

- start the Vite app
- enter the battle flow
- confirm the original `player-sprite-sheet.png` file still exists
- confirm the player uses the new battle sheet
- confirm the player remains readable against clouds, bullets, enemies, and the HUD
- capture an updated screenshot under `output/playwright/` if the battle view changed materially

## Out Of Scope

- deleting or overwriting the existing player sprite sheet
- changing player collision, movement, HP, shooting cadence, or runtime state
- replacing the UI portrait
- redesigning enemies, bullets, boss, or background assets
- introducing a new player atlas metadata system

## Risks

Generated sprite sheets may vary in frame alignment or background quality. The selected output must be checked before wiring it into the game, and a small local cleanup or crop is acceptable if it only normalizes the generated asset.

The current player plane is narrow and tall. If the generated sheet has wide wing poses, the first integration should prefer preserving gameplay scale over enlarging the plane.
