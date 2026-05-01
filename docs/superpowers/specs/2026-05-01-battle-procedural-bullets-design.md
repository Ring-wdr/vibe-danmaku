# Battle Procedural Bullets Design

## Goal

Improve the battle bullet visuals so they read as magical danmaku instead of flat single-color dots.

The gameplay experience must not change. Bullet positions, speed, collision radius, lifetime, damage, source, and spawn patterns remain owned by the existing battle runtime.

## Approved Direction

Use R3F-only procedural bullet rendering for this pass.

Do not create new bullet sprite assets yet. The current bullet data already provides enough signal for a strong first improvement:

- `source` separates player shots from enemy bullets.
- `radius` controls base bullet size.
- `glow` controls visual intensity.

Sprite assets may be revisited later for special boss-only bullets, but they are out of scope for this change.

## Visual Design

Each bullet should be made from layered WebGL geometry:

- A bright core disk.
- A softer inner halo.
- A larger outer aura.
- A small highlight point or ring for brighter bullets.

Visual themes:

- Player shots use warm brass, white, and gold colors.
- Normal enemy bullets use cyan and aqua colors.
- High-glow enemy bullets use cyan plus violet or pale blue accents so boss or laser-bloom bullets feel more dangerous.

The result should remain readable against the moving cloud background:

- Cores stay bright and crisp.
- Auras stay transparent enough that dense bullet patterns do not hide the player or enemies.
- Bullet scale remains derived from existing `radius` so collision expectations still feel aligned.

## Technical Design

All changes live in `src/game/ui/BattleView.tsx`.

Expected component changes:

- Add a `BulletMesh` component that receives one `RenderBullet`.
- Replace the inline bullet `mesh` in `RuntimeEntityLayer` with `<BulletMesh bullet={bullet} />`.
- Add a small helper that maps bullet source and glow into a palette.
- Use multiple simple meshes per bullet, such as:
  - outer `circleGeometry` for aura
  - inner `circleGeometry` for glow body
  - core `circleGeometry` for bright center
  - optional `ringGeometry` for high-glow enemy bullets
- Use `useFrame` only for visual pulse or shimmer. Do not write to React state for per-frame motion.

Depth ordering:

- Bullets stay in front of background fixtures and clouds.
- Player bullets and enemy bullets keep their current z placement.
- Bullet visuals must not move independently from runtime positions.

Performance:

- Keep geometry simple and reuse constants where practical.
- Avoid generating or loading new texture assets.
- Avoid post-processing requirements.

## Data Flow

Battle runtime remains unchanged:

- `createBattleRuntime` produces `snapshot.bullets`.
- `RuntimeEntityLayer` maps bullets to `BulletMesh`.
- `BulletMesh` converts existing render data into visual-only layered meshes.

No gameplay code should need to know about bullet palette, pulse, aura, highlight, or rings.

## Testing

Automated checks:

- `npm test`
- `npm run build`
- Extend the BattleView render contract if a stable test marker is useful, but do not overfit tests to exact Three geometry internals.

Browser verification with Playwright:

- Enter battle with `?fastStage=1&invincible=1`.
- Capture a screenshot while enemy bullets and player shots are visible.
- Confirm bullets have layered color rather than flat single-color disks.
- Confirm canvas count remains `1`.
- Confirm old DOM battle layers remain `0`.

## Out Of Scope

- Adding sprite sheets or generated bullet image assets.
- Changing bullet runtime data shape.
- Changing enemy bullet patterns or spawn rates.
- Adding post-processing bloom.
- Moving HUD into WebGL.
