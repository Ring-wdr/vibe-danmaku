# Battle Background Effects Design

## Goal

Update the battle play screen so the background communicates forward movement instead of a static arena overlay.

The current center oval ring reads as an unnecessary UI/arena decoration. It should be removed. Cloud and atmosphere layers should drift vertically over time so the player character feels like they are traveling through the sky.

## Scope

- Remove the visible center oval arena ring from the DOM presentation layer.
- Remove the matching oval border overlay from the stage plane so no duplicate ring remains.
- Rework the battle background into layered vertical motion with slow parallax.
- Preserve player, enemy, bullet, boss, drag input, HUD, and current runtime behavior.
- Add or update tests for the removed ring and animated background contract.

## Recommended Approach

Use the richer background direction: rebuild the visible background treatment around multiple moving layers instead of only adding a small CSS drift to the existing clouds.

The implementation should start with existing assets:

- `cloud-layer-a.png`
- `cloud-layer-b.png`
- current Three.js fallback color and lighting
- current DOM presentation layer structure

If the existing assets cannot make the motion readable enough, create additional project-bound assets:

- Use `imagegen` for raster cloud, fog, or streak texture images.
- Use `game-studio:web-3d-asset-pipeline` only if a new shipped GLB/glTF asset is genuinely needed for the Three.js scene.

No new asset should be referenced from outside the workspace.

## Visual Design

The battle view should feel like a vertical flight lane.

- Clouds move slowly along the vertical screen axis.
- Nearby layers move faster and with higher opacity.
- Far layers move slower and stay subtle.
- The motion loops seamlessly and should not cause jumps.
- The removed oval ring should not be replaced by another centered geometric decoration.
- The player halo and entity shadows may remain because they clarify gameplay position.

## Technical Design

The DOM presentation layer remains responsible for the most visible sprite/background composition. CSS animations are preferred for the visible cloud drift because they are simple, low-risk, and independent of battle runtime state.

The Three.js scene may keep or lightly adjust its distant cloud planes, but the primary readable movement should come from the DOM layer. If Three.js background motion is added, it should be bounded to decorative backdrop planes and must not affect gameplay positions.

Expected changes:

- Remove the `.battle-entities__arena` element from `BattlePresentationLayer`.
- Remove the `.battle-entities__arena` CSS block.
- Remove or neutralize `.battle-stage-plane::before`.
- Add background layer animation styles and keyframes.
- Add test coverage that the arena ring no longer renders and the cloud layer contract remains intact.

## Testing

Run focused tests for the presentation layer and scene config. Run the full test suite and build if time permits.

Suggested commands:

```powershell
npm test
npm run build
```

If browser verification is needed, run the app locally and inspect the battle screen for:

- no center oval ring
- clouds drifting vertically over time
- no overlap or input regression
- player/enemy/bullet readability preserved

## Out Of Scope

- Changing gameplay rules or spawn patterns.
- Replacing the player, enemy, boss, or bullet assets.
- Adding a new 3D model unless the existing 2D/cloud assets fail to achieve the requested effect.
