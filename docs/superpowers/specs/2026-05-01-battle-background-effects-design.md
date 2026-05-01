# Battle Background Effects Design

## Goal

Make the battle screen feel like continuous forward flight without changing gameplay.

The player, enemies, bullets, boss, drag input, HUD, and runtime coordinates must keep their current behavior. Only the R3F background treatment should move.

## Approved Direction

Use a combined approach:

- Moving cloud loop from approach 1.
- Additional 3D fixture effects to strengthen depth and speed.

The fixtures are decorative WebGL objects only. They must not participate in collision, targeting, hit tests, input, scoring, enemy movement, or stage progression.

## Visual Design

The battle view should read as a vertical flight lane:

- Cloud planes flow downward in a loop, implying the player is flying forward through the sky.
- A far cloud layer moves slowly and stays soft.
- A near cloud layer moves faster and appears slightly brighter or larger.
- 3D fixtures pass through the scene at a lower depth than gameplay entities, such as brass guide posts, small floating gate ribs, or light beacons.
- Fixtures move with parallax and subtle rotation so the background feels like a real 3D space.
- Fixtures must stay behind bullets, enemies, player, and HUD.
- Fixture silhouettes must not be mistaken for enemies or bullets.

The current player halo may remain if it helps spatial readability, but the effect should avoid adding a new centered arena UI ring.

## Technical Design

All new motion lives inside `src/game/ui/BattleView.tsx` and the R3F canvas.

Expected scene structure:

- Replace the static `CloudLayer` with a moving background group.
- Use `cloud-layer-a.png` and `cloud-layer-b.png` as separate planes.
- Spawn two or more plane instances per cloud layer so one plane can wrap above the viewport when it exits below.
- Animate cloud positions with `useFrame`; do not route this through React state.
- Add a `BackgroundFixtureLayer` component for simple Three.js geometry, such as cylinders, torus arcs, or low-opacity beacon meshes.
- Move fixtures downward on a repeating path and reset them above the viewport when they exit.
- Keep fixtures at negative or lower z-depth than gameplay entities.
- Use simple materials and bounded geometry counts to avoid hurting frame rate.

Motion should be deterministic enough for tests and screenshots. A small set of fixture seeds can be hard-coded as static config.

## Data Flow

Battle runtime state stays unchanged:

- `useBattleRuntime` continues to own gameplay simulation.
- `BattleScene` owns visual-only background motion.
- Background motion uses elapsed time and local refs only.
- DOM overlay remains responsible only for drag input and HUD.

## Testing

Automated checks:

- `npm test`
- `npm run build`
- Existing BattleView test should continue proving:
  - one R3F canvas exists
  - transparent drag overlay exists
  - old DOM entity layers are absent

Browser verification with Playwright:

- Enter battle with `?fastStage=1&invincible=1`.
- Capture at least two screenshots separated by time.
- Confirm clouds and fixtures visibly move while player/enemies/bullets remain playable.
- Confirm canvas count remains `1` and old DOM battle layers remain `0`.

## Out Of Scope

- Changing enemy spawn patterns.
- Changing bullet or collision behavior.
- Adding physics.
- Adding imported GLB assets.
- Moving HUD into WebGL.
