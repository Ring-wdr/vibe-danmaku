# Battle Background Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the center oval battle ring and make cloud/background layers drift vertically so the play screen feels like forward flight.

**Architecture:** Keep gameplay state unchanged. The visible battle composition stays in `BattlePresentationLayer`, while CSS owns the decorative background motion. Existing cloud PNG assets are used first; new raster or GLB assets are only introduced if visual verification shows the current assets cannot communicate motion.

**Tech Stack:** React 19, TypeScript, Vite, React Testing Library, Vitest, CSS animations, existing PNG game assets.

---

## File Structure

- Modify `src/game/ui/battlePresentation.tsx`: remove the decorative `.battle-entities__arena` element while preserving cloud, player, enemy, boss, and bullet rendering.
- Modify `src/game/ui/battlePresentation.test.ts`: assert that generated cloud assets still render, old placeholder cores remain absent, and the center arena ring is absent.
- Modify `src/style.css`: remove the oval ring CSS, remove the stage-plane oval pseudo-element, add layered vertical cloud drift and subtle atmospheric streaks using CSS only.
- Optional after visual check: add files under `src/assets/generated/` only if current cloud assets are insufficient. Use `imagegen` for PNG/WebP textures; use `game-studio:web-3d-asset-pipeline` only for GLB/glTF assets.

---

### Task 1: Remove Center Oval Ring Contract

**Files:**
- Modify: `src/game/ui/battlePresentation.test.ts`
- Modify: `src/game/ui/battlePresentation.tsx`

- [ ] **Step 1: Add the failing test assertion**

In `src/game/ui/battlePresentation.test.ts`, extend the existing asset-connection test with this assertion:

```ts
expect(container.querySelector('.battle-entities__arena')).not.toBeInTheDocument()
```

Run: `npx vitest run src/game/ui/battlePresentation.test.ts`
Expected before implementation: FAIL because `.battle-entities__arena` is still rendered.

- [ ] **Step 2: Remove the arena element**

In `src/game/ui/battlePresentation.tsx`, delete this JSX line from `BattlePresentationLayer`:

```tsx
<div className="battle-entities__arena" />
```

- [ ] **Step 3: Verify the focused test passes**

Run: `npx vitest run src/game/ui/battlePresentation.test.ts`
Expected: PASS.

---

### Task 2: Replace Static Ring Background With Vertical Motion

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Remove remaining oval decorations**

In `src/style.css`, delete the `.battle-stage-plane::before` rule and delete the `.battle-entities__arena` rule.

- [ ] **Step 2: Add moving background layers**

Replace the `.battle-stage-plane` background with a vertical atmosphere treatment:

```css
.battle-stage-plane {
  position: relative;
  flex: 1;
  min-height: 0;
  z-index: 4;
  background:
    linear-gradient(180deg, rgba(255, 190, 98, 0.05), transparent 16%),
    linear-gradient(180deg, rgba(92, 238, 228, 0.08), transparent 42%),
    radial-gradient(circle at 50% 84%, rgba(92, 238, 228, 0.08), transparent 11%);
}
```

Add a subtle moving atmospheric overlay:

```css
.battle-stage-plane::before {
  content: '';
  position: absolute;
  inset: -18% 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, transparent 0 18%, rgba(105, 240, 227, 0.08) 19%, transparent 24%),
    linear-gradient(180deg, transparent 0 42%, rgba(255, 190, 98, 0.06) 43%, transparent 48%),
    linear-gradient(180deg, transparent 0 66%, rgba(105, 240, 227, 0.06) 67%, transparent 72%);
  background-size: 100% 58%;
  opacity: 0.5;
  animation: battle-atmosphere-drift 18s linear infinite;
}
```

Update cloud styles so both layers drift vertically at different speeds:

```css
.battle-entities__cloud {
  position: absolute;
  left: 50%;
  width: 132%;
  max-width: none;
  object-fit: contain;
  opacity: 0.5;
  filter: saturate(1.08);
  transform: translate3d(-50%, var(--cloud-drift-start, 0), 0);
  user-select: none;
  z-index: 0;
  animation: battle-cloud-drift var(--cloud-drift-duration, 24s) linear infinite;
  will-change: transform;
}

.battle-entities__cloud--a {
  top: -18%;
  --cloud-drift-start: -14%;
  --cloud-drift-end: 62%;
  --cloud-drift-duration: 24s;
}

.battle-entities__cloud--b {
  top: 18%;
  width: 116%;
  opacity: 0.34;
  --cloud-drift-start: -8%;
  --cloud-drift-end: 78%;
  --cloud-drift-duration: 34s;
  animation-delay: -12s;
}

@keyframes battle-cloud-drift {
  from {
    transform: translate3d(-50%, var(--cloud-drift-start, 0), 0);
  }

  to {
    transform: translate3d(-50%, var(--cloud-drift-end, 60%), 0);
  }
}

@keyframes battle-atmosphere-drift {
  from {
    transform: translateY(-18%);
  }

  to {
    transform: translateY(18%);
  }
}
```

- [ ] **Step 3: Verify CSS contract by focused test**

Run: `npx vitest run src/game/ui/battlePresentation.test.ts`
Expected: PASS.

---

### Task 3: Full Verification And Visual Decision

**Files:**
- No required code files.
- Optional asset files only if the current assets fail visual verification.

- [ ] **Step 1: Run automated verification**

Run:

```powershell
npm test
npm run build
```

Expected: both commands complete successfully.

- [ ] **Step 2: Run the app for visual inspection**

Run:

```powershell
npm run dev -- --host 127.0.0.1
```

Open the Vite URL and start the battle.

Expected visual result:

- no center oval arena ring
- cloud layers drift vertically over time
- player, enemies, bullets, boss, and HUD remain readable
- drag input still works because the input overlay remains above decorative layers

- [ ] **Step 3: Decide whether assets are needed**

If the existing clouds make the motion readable, do not add assets.

If the sky feels empty or the loop is too obvious, use `imagegen` to generate a transparent or chroma-keyed raster mist/streak texture and save it under `src/assets/generated/`. Only use `game-studio:web-3d-asset-pipeline` if the design requires a shipped GLB/glTF background object, which is not expected for this task.

---

## Self-Review

- Spec coverage: ring removal, vertical drift, preservation of gameplay/HUD/input, and optional asset path are covered.
- Placeholder scan: no placeholders or deferred unknowns.
- Type consistency: no new TypeScript interfaces are required; CSS variables are scoped to existing battle background classes.
