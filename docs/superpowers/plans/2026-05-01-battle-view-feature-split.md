# Battle View Feature Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the oversized `src/game/ui/BattleView.tsx` into feature-focused modules without changing runtime behavior or the public import surface.

**Architecture:** Keep `BattleView.tsx` as the public facade that exports `BattleView` and compatibility helpers used by existing tests. Move math/input helpers, texture material helpers, background rendering, runtime entity rendering, projectile/effect rendering, HUD, and scene composition into neighboring `src/game/ui` modules.

**Tech Stack:** React 19, TypeScript 6, React Three Fiber, Three.js, Vitest, Testing Library.

---

## File Structure

- Modify: `src/game/ui/BattleView.tsx`
  - Owns the public `BattleView` component, runtime update loop, pointer overlay, and compatibility re-exports.
- Create: `src/game/ui/battleViewMath.ts`
  - Owns arena coordinate mapping, drag bounds, airflow dynamics, and view-coordinate conversion.
- Create: `src/game/ui/battleTexture.tsx`
  - Owns Three.js texture-loading hooks and restored texture material shader.
- Create: `src/game/ui/battleBackground.tsx`
  - Owns moving stage background texture selection, cloud/floor layers, and decorative fixtures.
- Create: `src/game/ui/battleEntities.tsx`
  - Owns player, enemy, boss, and runtime entity layer rendering.
- Create: `src/game/ui/battleEffects.tsx`
  - Owns bullet meshes, beam-lance beam meshes, sparkles, and player airflow effects.
- Create: `src/game/ui/BattleScene.tsx`
  - Owns R3F scene composition: clear color, base plane, background layers, lane guide, runtime entity layer.
- Create: `src/game/ui/BattleHud.tsx`
  - Owns battle status HUD and special attack slot controls.
- Modify: `src/game/ui/BattleView.test.ts`
  - Keep import path as `./BattleView`; no test behavior changes expected.

## Tasks

### Task 1: Establish Public Facade Boundaries

**Files:**
- Modify: `src/game/ui/BattleView.tsx`
- Test: `src/game/ui/BattleView.test.ts`

- [ ] **Step 1: Preserve public exports**

Keep these names importable from `./BattleView`:

```ts
export { battleDragInputConfig, createArenaPoint, getFlightAirflowDynamics } from './battleViewMath'
export { getAtlasFrameUv, getBossCoreTextureUrl, getPlayerBattleSpritePose } from './battleEntities'
export { getBackgroundTextureUrls } from './battleBackground'
export function BattleView(props: BattleViewProps) { /* existing public component */ }
```

- [ ] **Step 2: Run compatibility tests**

Run: `npm test -- src/game/ui/BattleView.test.ts`

Expected: all `BattleView` tests pass with imports unchanged.

### Task 2: Extract Math And Texture Helpers

**Files:**
- Create: `src/game/ui/battleViewMath.ts`
- Create: `src/game/ui/battleTexture.tsx`
- Modify: `src/game/ui/BattleView.tsx`

- [ ] **Step 1: Move math helpers**

Move `battleDragInputConfig`, `createArenaPoint`, `arenaPointToView`, and `getFlightAirflowDynamics` into `battleViewMath.ts`.

- [ ] **Step 2: Move texture helpers**

Move `useLoadedTexture`, `useLoadedTextureMap`, and `RestoredTextureMaterial` into `battleTexture.tsx`.

- [ ] **Step 3: Verify helper tests**

Run: `npm test -- src/game/ui/BattleView.test.ts`

Expected: helper-focused tests pass.

### Task 3: Extract Feature Renderers

**Files:**
- Create: `src/game/ui/battleBackground.tsx`
- Create: `src/game/ui/battleEntities.tsx`
- Create: `src/game/ui/battleEffects.tsx`
- Create: `src/game/ui/BattleScene.tsx`
- Create: `src/game/ui/BattleHud.tsx`
- Modify: `src/game/ui/BattleView.tsx`

- [ ] **Step 1: Move background rendering**

Move `getBackgroundTextureUrls`, `MovingCloudPlane`, `MovingBackgroundLayer`, `BackgroundFixture`, and `BackgroundFixtureLayer` into `battleBackground.tsx`.

- [ ] **Step 2: Move entity rendering**

Move `getAtlasFrameUv`, `getPlayerBattleSpritePose`, `getBossCoreTextureUrl`, `PlayerSprite`, `EnemySprite`, `BossSprite`, and `RuntimeEntityLayer` into `battleEntities.tsx`.

- [ ] **Step 3: Move visual effects**

Move `BulletMesh`, `SpecialBeamMesh`, `SparkleMesh`, `PlayerFlightAirflow`, `TurnWakeRing`, and `BodyAirflowCowl` into `battleEffects.tsx`.

- [ ] **Step 4: Move scene and HUD composition**

Move `BattleScene` into `BattleScene.tsx`; move `SpecialSlotHud` and battle status HUD markup into `BattleHud.tsx`.

- [ ] **Step 5: Verify focused component tests**

Run: `npm test -- src/game/ui/BattleView.test.ts`

Expected: `BattleView` still renders the mocked canvas, hidden markers, HUD, controls, and special slot.

### Task 4: Final Verification

**Files:**
- All changed files under `src/game/ui`

- [ ] **Step 1: Run UI test file**

Run: `npm test -- src/game/ui/BattleView.test.ts`

Expected: exit code 0.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: exit code 0. Existing chunk-size warnings are acceptable if the build succeeds.
