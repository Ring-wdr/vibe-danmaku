# Battle Background Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add continuous forward-flight background motion to the R3F battle screen without changing gameplay.

**Architecture:** Keep gameplay runtime state untouched. Replace the static cloud plane with ref-driven R3F background layers that loop downward, and add deterministic decorative 3D fixtures behind gameplay entities. DOM remains limited to drag input and HUD.

**Tech Stack:** React 19, React Three Fiber, Three.js, Vite, Vitest, Playwright CLI.

---

## File Structure

- Modify `src/game/ui/BattleView.tsx`: add moving cloud planes, fixture seed config, and fixture animation components.
- Modify `src/game/ui/BattleView.test.ts`: assert the Canvas contract still exists and expose a testable background marker.
- Update `output/playwright/battle-r3f-final.png`: final visual evidence after Playwright verification.

---

### Task 1: Expose A Battle Background Motion Contract In The BattleView Test

**Files:**
- Modify: `src/game/ui/BattleView.test.ts`

- [x] **Step 1: Keep the Canvas mock focused on the canvas contract**

Keep the mock as a lightweight canvas stand-in so React DOM does not need to render R3F-only elements:

```tsx
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ style }: { children: ReactNode; style?: CSSProperties }) =>
    createElement('canvas', { 'data-testid': 'battle-canvas', style }),
  useFrame: vi.fn(),
}))
```

- [x] **Step 2: Add a background marker assertion**

Add this assertion to the existing `BattleView` render test:

```tsx
expect(screen.getByTestId('battle-background-motion')).toBeInTheDocument()
```

- [x] **Step 3: Run the focused test**

Run:

```powershell
npm test -- BattleView
```

Expected: PASS after the hidden battle background motion marker is added.

---

### Task 2: Add Moving Cloud Loop

**Files:**
- Modify: `src/game/ui/BattleView.tsx`

- [x] **Step 1: Replace `CloudLayer` with `MovingCloudLayer`**

Add a component that loads both cloud textures, stores a group ref, and updates child mesh positions in `useFrame`:

```tsx
const cloudLayerConfigs = [
  { texture: 'a', x: -0.15, z: -1.85, width: 6.3, height: 3.15, opacity: 0.34, speed: 0.28, gap: 3.05, rotation: -0.08 },
  { texture: 'b', x: 0.2, z: -1.55, width: 6.9, height: 3.25, opacity: 0.26, speed: 0.46, gap: 3.2, rotation: 0.06 },
] as const
```

Use two plane instances per layer and wrap them when local y falls below `-3.9`.

- [x] **Step 2: Add a test marker wrapper**

Wrap the moving background in:

```tsx
<group name="battle-background-motion" userData={{ testId: 'battle-background-motion' }}>
```

Add a tiny DOM marker only in tests by rendering:

```tsx
<object3D userData={{ testId: 'battle-background-motion' }} />
```

If the mocked Canvas cannot expose `object3D`, render a hidden sibling marker from `BattleView`:

```tsx
<span hidden data-testid="battle-background-motion" />
```

- [x] **Step 3: Replace `<CloudLayer />` in `BattleScene`**

Use:

```tsx
<MovingBackgroundLayer />
```

- [x] **Step 4: Run focused test**

Run:

```powershell
npm test -- BattleView
```

Expected: PASS.

---

### Task 3: Add Decorative 3D Fixtures

**Files:**
- Modify: `src/game/ui/BattleView.tsx`

- [x] **Step 1: Add deterministic fixture seeds**

Add a small seed array:

```tsx
const backgroundFixtureSeeds = [
  { x: -2.85, y: 3.4, z: -1.15, scale: 0.52, speed: 0.72, spin: 0.35, phase: 0 },
  { x: 2.65, y: 1.5, z: -1.05, scale: 0.46, speed: 0.66, spin: -0.28, phase: 1.4 },
  { x: -1.65, y: -0.8, z: -1.2, scale: 0.38, speed: 0.58, spin: 0.42, phase: 2.3 },
] as const
```

- [x] **Step 2: Add `BackgroundFixtureLayer`**

Create a group ref and update each fixture child in `useFrame` using elapsed time. Fixture y position should wrap from below `-4.1` back to above `3.6`.

- [x] **Step 3: Build each fixture from simple geometry**

Each fixture should use muted brass/cyan materials and simple shapes:

```tsx
<group>
  <mesh rotation={[Math.PI / 2, 0, 0]}>
    <torusGeometry args={[0.32, 0.025, 8, 32]} />
    <meshBasicMaterial color="#c99a45" transparent opacity={0.34} toneMapped={false} />
  </mesh>
  <mesh>
    <cylinderGeometry args={[0.035, 0.06, 0.7, 10]} />
    <meshBasicMaterial color="#5ceee4" transparent opacity={0.18} toneMapped={false} />
  </mesh>
</group>
```

- [x] **Step 4: Render fixtures behind gameplay**

Place:

```tsx
<BackgroundFixtureLayer />
```

after the moving clouds and before the player halo / runtime entity layer.

---

### Task 4: Full Verification And Screenshot

**Files:**
- Update: `output/playwright/battle-r3f-final.png`

- [x] **Step 1: Run automated checks**

Run:

```powershell
npm test
npm run build
```

Expected: both pass. Vite chunk warning is acceptable.

- [x] **Step 2: Capture two Playwright screenshots**

Run the battle flow at `http://127.0.0.1:5173?fastStage=1&invincible=1`, then save:

```powershell
output\playwright\battle-background-motion-a.png
output\playwright\battle-background-motion-b.png
```

Wait at least 1.4 seconds between captures.

- [x] **Step 3: Confirm DOM contract**

Evaluate:

```js
() => ({
  canvas: document.querySelectorAll('canvas').length,
  oldDom: {
    battleEntities: document.querySelectorAll('.battle-entities').length,
    stagePlane: document.querySelectorAll('.battle-stage-plane').length,
  },
  hud: document.querySelector('[aria-label="Battle status"]')?.textContent ?? null,
})
```

Expected:

```json
{
  "canvas": 1,
  "oldDom": { "battleEntities": 0, "stagePlane": 0 }
}
```

- [x] **Step 4: Save final screenshot**

Copy the better visual capture to:

```powershell
output\playwright\battle-r3f-final.png
```

---

## Verification Summary

Required commands:

```powershell
npm test
npm run build
```

Required browser evidence:

- Two screenshots show cloud/fixture movement over time.
- Final screenshot shows colored sprites, moving background composition, and readable HUD.
