# Battle R3F Render Unification Design

## Goal

Move the battle playfield to a single React Three Fiber scene so Three.js is doing the visible battle rendering work.

The current battle screen already has a `Canvas`, but the most important visible sprites are still duplicated through a DOM presentation layer that positions entities with CSS percentages. The new design keeps the same gameplay feel while removing that split responsibility:

- enemies still descend from the top of the lane
- the player still stays near the lower battle area
- dragging still moves the player with the existing runtime input path
- HUD and status UI remain DOM overlays

## Chosen Approach

Use the existing React app and R3F stack. The Canvas becomes the only battle playfield renderer.

Player, enemies, and boss render as textured billboard planes using the existing PNG assets. Bullets and positional cues render as simple Three.js meshes. The 3D background remains in the same scene with cloud planes, fog, lighting, and floor/depth cues.

This keeps simulation state outside Three.js objects. `createBattleRuntime` stays the source of truth for positions, collisions, phases, HP, and completion. The scene reads each `BattleSnapshot` and translates it into visual objects.

## Alternatives Considered

Keeping DOM entities and improving only the background would be lower risk, but it would not solve the central problem: Three.js would still feel decorative instead of carrying the battle screen.

Moving to plain imperative Three.js would give maximum render-loop control, but this is already a React app with `@react-three/fiber` installed and active. Replacing R3F would add churn without improving the requested player experience.

## Component Design

`BattleView.tsx` remains the owner of the battle screen.

- `StageScene` renders the full visible playfield inside `Canvas`.
- The transparent pointer overlay remains above the canvas and forwards drag input to the runtime.
- `battle-hud` remains a DOM overlay because it is interface text and status, not world rendering.
- `BattlePresentationLayer` is removed from the active battle screen once the Canvas renders all entities.

The old DOM projection helper is no longer used by `BattleView`. It can be deleted if no tests or callers need it after the migration.

## Visual Design

The battle view should read as a 2D character layer inside a 3D sky lane:

- existing 2D assets stay recognizable and keep their aspect ratios
- billboard planes face the camera consistently
- enemies, boss, player, and bullets use the same runtime world positions as before
- depth is communicated through scale, z position, shadows, glow, and background motion
- the screen should not introduce new gameplay cues or change hitbox expectations

## Interaction Design

Pointer input remains DOM-based.

`createArenaPoint` continues mapping pointer coordinates into the runtime arena space. This preserves the existing drag feel and keeps input independent from camera picking or raycasting.

The pointer overlay must stay above the Canvas and below the HUD, with `touch-action: none`.

## Testing

Automated tests should cover the migration contract:

- `BattleView` renders a Canvas-backed battle screen.
- The old DOM entity layer is absent from the active battle screen.
- HUD text and battle status remain present.
- Pointer drag input still reaches the runtime path.

Verification commands:

```powershell
npm test
npm run build
```

Browser verification uses Playwright CLI:

- start the Vite app
- enter the battle flow
- confirm the Canvas is visible and nonblank
- confirm old DOM battle entities are absent
- drag on the battle area and confirm the player visual changes position

## Out Of Scope

- Changing enemy spawn timing, collision rules, HP, boss behavior, or scoring.
- Replacing the current PNG assets.
- Moving HUD, menus, or status text into WebGL.
- Adding physics or GLB assets.
