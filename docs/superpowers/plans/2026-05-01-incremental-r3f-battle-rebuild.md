# Incremental R3F Battle Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the battle screen from a verified R3F baseline, adding one visible gameplay layer at a time without returning to CSS-positioned DOM entities.

**Architecture:** The battle screen bypasses the app phone frame while `screen === 'battle'` and renders a full-screen R3F Canvas. Assets are loaded as Three.js textures and placed on planes inside the Canvas. Runtime state is reintroduced only after visual layers are confirmed.

**Tech Stack:** React 19, React Three Fiber, Three.js, Vite, Vitest, Playwright CLI.

---

## File Structure

- Modify `src/game/ui/BattleView.tsx`: add enemies, runtime snapshot positions, drag input, bullets, boss, and HUD incrementally.
- Modify `src/game/ui/BattleView.test.ts`: keep the battle-only Canvas contract and add targeted runtime/input assertions when the runtime reconnects.
- Modify `src/app/App.tsx`: keep battle mode outside the phone shell until the R3F playfield is complete.
- Modify `src/style.css`: keep full-screen battle root styles and add only DOM HUD/input styles when those layers return.

---

### Task 1: Add One Enemy Asset

- [x] Add `enemy-steam-scout` as a single WebGL plane.
- [x] Keep the player and cloud probes unchanged.
- [x] Run `npm test` and `npm run build`.
- [x] Verify with Playwright screenshot that the enemy asset is visible in Canvas.

### Task 2: Reconnect Runtime Snapshot Positions

- [x] Restore `useBattleRuntime`.
- [x] Keep DOM HUD and pointer input disabled.
- [x] Render player, one enemy list, and cloud layer from `snapshot`.
- [x] Keep the fallback baseline box until runtime rendering is visually confirmed.
- [x] Run `npm test` and `npm run build`.
- [x] Verify with Playwright screenshot that enemies descend and player remains near the lower lane.

### Task 3: Reconnect Drag Input Only

- [x] Add a transparent `battle-shell__controls` overlay.
- [x] Forward pointer down/move/up through existing `createArenaPoint`.
- [x] Keep HUD disabled.
- [x] Run `npm test` and `npm run build`.
- [x] Verify with Playwright drag that the player plane moves horizontally.

### Task 4: Add Bullets, Boss, And HUD

- [x] Add bullets as WebGL meshes from `snapshot.bullets`.
- [x] Add boss as a WebGL plane from `snapshot.boss`.
- [x] Add DOM HUD only after WebGL gameplay layers are visible.
- [x] Run `npm test` and `npm run build`.
- [x] Verify with Playwright that old DOM entity layers are absent and gameplay remains playable.

### Task 5: Clean Up Baseline Scaffolding

- [x] Remove temporary baseline box only after player/enemy/bullet/boss layers are visible.
- [x] Keep a small WebGL-only background lane.
- [x] Ensure `battlePresentation.tsx` stays deleted.
- [x] Run `npm test`, `npm run build`, and final Playwright screenshot.

---

## Verification

Use:

```powershell
npm test
npm run build
npx --package @playwright/cli playwright-cli open http://127.0.0.1:5173 --headed
```

Screenshots go under `output/playwright/`.
