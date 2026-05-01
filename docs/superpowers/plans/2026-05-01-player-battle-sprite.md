# Player Battle Sprite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new battle-focused four-frame player sprite sheet while preserving the existing player sprite sheet for later reuse.

**Architecture:** Keep the renderer contract stable: `PlayerSprite` continues loading `gameAssets.playerSheetUrl` as a four-column texture. Add a new generated PNG asset and update only the asset import/export pointer so gameplay, input, collision, and R3F geometry remain unchanged. The new art must read as a bottom-side player facing upward toward enemies, not as a front-facing character illustration.

**Tech Stack:** Vite, React, React Three Fiber, Three.js, PNG image asset imports, built-in `imagegen`, local chroma-key cleanup when needed.

---

## File Structure

- Create: `src/assets/generated/player-battle-sprite-sheet.png`
  - New four-frame horizontal player battle sprite sheet.
- Modify: `src/game/assets.ts`
  - Import the new PNG and keep `gameAssets.playerSheetUrl` pointing to the active battle sprite sheet.
- Preserve: `src/assets/generated/player-sprite-sheet.png`
  - Existing image remains in the repo for future use.

## Task 1: Generate New Player Battle Sprite Sheet

**Files:**
- Create: `src/assets/generated/player-battle-sprite-sheet.png`
- Preserve: `src/assets/generated/player-sprite-sheet.png`

- [ ] **Step 1: Generate the candidate image with imagegen**

Use the current `src/assets/generated/player-sprite-sheet.png` only as the character/style reference. Generate a new image with this prompt:

```text
Use case: stylized-concept
Asset type: four-frame horizontal transparent game sprite sheet for a vertical danmaku shooter
Primary request: Create a battle-focused Lyra Aer style female pilot sprite sheet that preserves the current brass-and-teal steamfantasy character identity, but is brighter and easier to read in a small active battle scene.
Input image role: existing player sprite sheet is character identity and costume reference only; do not overwrite it.
Subject: full-body anime pilot as the bottom-side player unit, seen from behind or upward three-quarter view, facing toward enemies above. Show aviator goggles, brass trim, teal cape, feathered or mechanical wing accents, and small compact aether propulsion effects.
Layout: exactly four evenly spaced full-body frames in one horizontal row, consistent scale and baseline across frames.
Frame sequence: neutral upward hover, slight left bank while still facing upward, upward firing or compact aether focus pose, upward boost or evasive flourish pose.
Style/medium: polished anime game sprite, clean silhouette, less tiny costume noise than the reference.
Color palette: brass, warm gold, teal, cyan aether highlights, dark navy accents.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for background removal.
Constraints: no text, no watermark, no logos, no cast shadow, no environment, no UI, no extra characters. Do not use #ff00ff anywhere in the character or effects. Keep moderate padding around each frame, and make the pilot fill most of each frame.
Avoid: front-facing portrait poses, looking at the viewer, sideways-only attacks, long beams, long projectile streaks, oversized exhaust trails, cropped limbs, frame-to-frame scale changes, multiple rows, dark unreadable details, realistic photography.
```

- [ ] **Step 2: Remove the chroma-key background**

Run the installed helper against the generated source image:

```powershell
python "C:\Users\enne1\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py" --input "<generated-source.png>" --out "D:\vibe-danmaku\src\assets\generated\player-battle-sprite-sheet.png" --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
```

Expected: output PNG has an alpha channel and transparent corners.

- [ ] **Step 3: Inspect dimensions and alpha**

Run:

```powershell
node -e "const fs=require('fs'); const p='src/assets/generated/player-battle-sprite-sheet.png'; console.log(fs.existsSync(p), fs.statSync(p).size)"
```

Expected: prints `true` and a non-zero byte size.

## Task 2: Wire The Game To The New Asset

**Files:**
- Modify: `src/game/assets.ts`

- [ ] **Step 1: Update the import**

Replace:

```ts
import playerSheetUrl from '../assets/generated/player-sprite-sheet.png'
```

With:

```ts
import playerSheetUrl from '../assets/generated/player-battle-sprite-sheet.png'
```

- [ ] **Step 2: Confirm the old file still exists**

Run:

```powershell
Test-Path -LiteralPath 'D:\vibe-danmaku\src\assets\generated\player-sprite-sheet.png'
```

Expected: `True`.

## Task 3: Verify

**Files:**
- Read: `src/game/assets.ts`
- Read: `src/assets/generated/player-sprite-sheet.png`
- Read: `src/assets/generated/player-battle-sprite-sheet.png`

- [ ] **Step 1: Run automated verification**

Run:

```powershell
npm test
npm run build
```

Expected: both commands pass.

- [ ] **Step 2: Run browser visual verification**

Start Vite:

```powershell
Start-Process -FilePath "powershell" -ArgumentList @("-NoProfile", "-Command", "cd D:\vibe-danmaku; npm run dev -- --host 127.0.0.1 *> vite-player-sprite.log") -WindowStyle Hidden
```

Open the app in a browser, enter battle, and capture a screenshot under `output/playwright/`.

Expected: the player is visible near the bottom, animated as a four-frame sheet, facing upward toward enemies, and readable against clouds, enemies, bullets, and HUD.

## Self-Review

- Spec coverage: the plan preserves the old asset, creates a new battle sheet, updates the active asset pointer, and verifies the result.
- Placeholder scan: no placeholders remain.
- Type consistency: `gameAssets.playerSheetUrl` remains the renderer-facing asset key, so `PlayerSprite` requires no type or prop changes.
