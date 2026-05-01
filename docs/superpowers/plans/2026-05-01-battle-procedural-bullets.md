# Battle Procedural Bullets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace flat single-color bullet dots with layered R3F procedural bullet visuals.

**Architecture:** Keep `createBattleRuntime` and `RenderBullet` unchanged. Add visual-only helpers and a `BulletMesh` component inside `src/game/ui/BattleView.tsx`, then have `RuntimeEntityLayer` render bullets through that component. Use Playwright screenshots for visual validation because R3F geometry internals are not represented in the current DOM test harness.

**Tech Stack:** React 19, React Three Fiber, Three.js, Vite, Vitest, Playwright CLI.

---

## File Structure

- Modify `src/game/ui/BattleView.tsx`: add bullet palette helpers and `BulletMesh`.
- Keep `src/game/runtime/battleRuntime.ts` unchanged.
- Keep `src/game/types.ts` unchanged.
- Update `output/playwright/battle-r3f-final.png`: final screenshot evidence.

---

### Task 1: Add Bullet Visual Helpers

**Files:**
- Modify: `src/game/ui/BattleView.tsx`

- [x] **Step 1: Import the render bullet type**

Change:

```ts
import type { ArenaPoint, BattleSnapshot, Difficulty, EnemyKind, RunResult } from '../types'
```

to:

```ts
import type {
  ArenaPoint,
  BattleSnapshot,
  Difficulty,
  EnemyKind,
  RenderBullet,
  RunResult,
} from '../types'
```

- [x] **Step 2: Add palette and phase helpers**

Add helpers near `arenaPointToView`:

```ts
type BulletPalette = {
  aura: string
  body: string
  core: string
  accent: string
}

function getBulletPalette(bullet: RenderBullet): BulletPalette {
  if (bullet.source === 'player') {
    return { aura: '#ffb45d', body: '#ffd28a', core: '#fff7d7', accent: '#f8e27a' }
  }

  if (bullet.glow >= 1.45) {
    return { aura: '#9b7cff', body: '#55f0ff', core: '#e8fdff', accent: '#d29bff' }
  }

  return { aura: '#2ceaff', body: '#55f0ff', core: '#d9fdff', accent: '#8ff7ff' }
}

function getBulletPhase(id: string) {
  let hash = 0
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997
  }
  return hash / 997
}
```

---

### Task 2: Add `BulletMesh`

**Files:**
- Modify: `src/game/ui/BattleView.tsx`

- [x] **Step 1: Create `BulletMesh`**

Add a component before `RuntimeEntityLayer`:

```tsx
function BulletMesh({ bullet }: { bullet: RenderBullet }) {
  const groupRef = useRef<THREE.Group>(null)
  const palette = getBulletPalette(bullet)
  const phase = getBulletPhase(bullet.id)
  const baseRadius = Math.max(0.052, bullet.radius * 0.72)
  const glow = Math.min(1.8, Math.max(0.75, bullet.glow))
  const isHeavyEnemyBullet = bullet.source === 'enemy' && bullet.glow >= 1.35

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * 8 + phase * Math.PI * 2) * 0.08 * glow
    groupRef.current.scale.setScalar(pulse)
    groupRef.current.rotation.z += 0.018 * glow
  })

  return (
    <group
      ref={groupRef}
      position={arenaPointToView(bullet.position, bullet.source === 'player' ? 0.76 : 0.74)}
    >
      <mesh>
        <circleGeometry args={[baseRadius * (2.45 + glow * 0.26), 32]} />
        <meshBasicMaterial color={palette.aura} transparent opacity={0.16 + glow * 0.08} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh>
        <circleGeometry args={[baseRadius * (1.38 + glow * 0.14), 28]} />
        <meshBasicMaterial color={palette.body} transparent opacity={0.5 + glow * 0.1} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[baseRadius * 0.16, baseRadius * 0.16, 0.018]}>
        <circleGeometry args={[baseRadius * 0.66, 24]} />
        <meshBasicMaterial color={palette.core} transparent opacity={0.94} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[-baseRadius * 0.36, baseRadius * 0.42, 0.028]}>
        <circleGeometry args={[baseRadius * 0.26, 16]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.84} depthWrite={false} toneMapped={false} />
      </mesh>
      {isHeavyEnemyBullet ? (
        <mesh rotation={[0, 0, phase * Math.PI]}>
          <ringGeometry args={[baseRadius * 1.72, baseRadius * 1.98, 36]} />
          <meshBasicMaterial color={palette.accent} transparent opacity={0.38} depthWrite={false} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  )
}
```

- [x] **Step 2: Replace inline bullet circles**

Change the `snapshot.bullets.map` block in `RuntimeEntityLayer` to:

```tsx
{snapshot.bullets.map((bullet) => (
  <BulletMesh key={bullet.id} bullet={bullet} />
))}
```

---

### Task 3: Verify

**Files:**
- Update: `output/playwright/battle-r3f-final.png`

- [x] **Step 1: Run automated checks**

Run:

```powershell
npm test
npm run build
```

Expected: both pass. Vite chunk warning is acceptable.

- [x] **Step 2: Verify in browser**

Use Playwright to enter `http://127.0.0.1:5173?fastStage=1&invincible=1`, deploy on easy, wait until bullets are visible, then capture:

```powershell
output\playwright\battle-procedural-bullets.png
```

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

Copy the verified screenshot to:

```powershell
output\playwright\battle-r3f-final.png
```
