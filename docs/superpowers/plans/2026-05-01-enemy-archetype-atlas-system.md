# Enemy Archetype Atlas System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an archetype-first regular enemy content system, generate six brass-cloud enemy sprites, pack them into one atlas, migrate Stage 1 to the new data model, and add richer enemy attack patterns.

**Architecture:** Keep `createBattleRuntime` consuming resolved `EnemyWave` objects, but move regular enemy gameplay definitions into `src/game/content/enemies.ts`. Regular enemies render from a theme-level sprite atlas using `atlasId + frameId`; boss rendering remains separate for this pass.

**Tech Stack:** React 19, React Three Fiber, Three.js, Vite, Vitest, TypeScript, imagegen built-in mode, PowerShell, `sharp` dev dependency for atlas packing.

---

## File Structure

- Modify `src/game/types.ts`: add archetype, variant, atlas frame, expanded pattern, and render-enemy metadata types.
- Create `src/game/content/enemyBrassCloudAtlas.ts`: frame metadata for the brass-cloud regular enemy atlas.
- Create `src/game/content/enemies.ts`: archetype definitions, theme variants, difficulty tuning, and wave resolver helpers.
- Create `src/game/content/enemies.test.ts`: resolver and atlas metadata contract tests.
- Modify `src/game/content/stage1.ts`: replace hard-coded regular enemy wave tuning with resolver-backed Stage 1 placements.
- Modify `src/game/content/stage1.test.ts`: assert all six archetypes appear and timing constraints still hold.
- Modify `src/game/runtime/battleRuntime.ts`: carry render metadata into snapshots and implement `needle`, `split`, `mine`, and `wave` bullet behavior.
- Modify `src/game/runtime/battleRuntime.test.ts`: assert new patterns create distinguishable bullet behavior.
- Modify `src/game/assets.ts`: expose `enemyBrassCloudAtlasUrl`.
- Modify `src/game/ui/BattleView.tsx`: load the regular enemy atlas once and render enemies with frame UVs.
- Modify `src/game/ui/BattleView.test.ts`: assert atlas-backed battle view still renders the Canvas and HUD contract.
- Create `scripts/pack-enemy-atlas.mjs`: pack normalized source enemy sprites into one atlas and write metadata-friendly frame rectangles.
- Add generated project assets:
  - `src/assets/generated/enemies/brass-cloud/scout.png`
  - `src/assets/generated/enemies/brass-cloud/sentinel.png`
  - `src/assets/generated/enemies/brass-cloud/lancer.png`
  - `src/assets/generated/enemies/brass-cloud/splitter.png`
  - `src/assets/generated/enemies/brass-cloud/mine-layer.png`
  - `src/assets/generated/enemies/brass-cloud/weaver.png`
  - `src/assets/generated/enemy-brass-cloud-atlas.png`

---

### Task 1: Expand Core Enemy Types

**Files:**
- Modify: `src/game/types.ts`

- [ ] **Step 1: Replace the narrow regular enemy identity types**

In `src/game/types.ts`, replace:

```ts
export type EnemyKind = 'steam-scout' | 'feather-drone' | 'boss-core'

export type PatternShape = 'fan' | 'ring' | 'spiral' | 'laser-bloom'
```

with:

```ts
export type EnemyArchetypeId =
  | 'scout'
  | 'sentinel'
  | 'lancer'
  | 'splitter'
  | 'mine-layer'
  | 'weaver'

export type EnemyThemeId = 'brass-cloud'
export type EnemyAtlasId = 'enemy-brass-cloud'
export type EnemyFrameId = EnemyArchetypeId
export type EnemyVariantId = `${EnemyThemeId}-${EnemyArchetypeId}`
export type EnemyKind = EnemyVariantId | 'boss-core'

export type PatternShape =
  | 'fan'
  | 'ring'
  | 'spiral'
  | 'laser-bloom'
  | 'needle'
  | 'split'
  | 'mine'
  | 'wave'
```

- [ ] **Step 2: Expand `BulletPatternConfig`**

Replace the existing `BulletPatternConfig` type with:

```ts
export type BulletPatternConfig = {
  shape: PatternShape
  count: number
  interval: number
  speed: number
  spread: number
  life: number
  aim?: 'down' | 'player'
  split?: {
    delay: number
    count: number
    speedMultiplier: number
  }
  wave?: {
    amplitude: number
    frequency: number
  }
}
```

- [ ] **Step 3: Expand `EnemyWave` and `RenderEnemy`**

Replace the existing `EnemyWave` and `RenderEnemy` types with:

```ts
export type EnemyWave = {
  id: string
  startAt: number
  kind: EnemyKind
  archetype: EnemyArchetypeId
  variant: EnemyVariantId
  atlasId: EnemyAtlasId
  frameId: EnemyFrameId
  count: number
  spacing: number
  hp: number
  speed: number
  scale: number
  hitRadius: number
  path: 'swoop-left' | 'swoop-right' | 'helix'
  pattern: BulletPatternConfig
}

export type RenderEnemy = {
  id: string
  kind: EnemyKind
  archetype: EnemyArchetypeId
  variant: EnemyVariantId
  atlasId: EnemyAtlasId
  frameId: EnemyFrameId
  position: ArenaPoint
  scale: number
}
```

- [ ] **Step 4: Run typecheck and capture expected failures**

Run:

```powershell
npm run typecheck
```

Expected: FAIL because `stage1.ts`, `battleRuntime.ts`, and `BattleView.tsx` still create/read the old regular enemy shape.

- [ ] **Step 5: Commit**

Do not commit this task alone if the repo cannot typecheck. Carry the type changes into Task 2, then commit once Task 2 passes targeted tests and typecheck.

---

### Task 2: Add Atlas Metadata And Enemy Resolver

**Files:**
- Create: `src/game/content/enemyBrassCloudAtlas.ts`
- Create: `src/game/content/enemies.ts`
- Create: `src/game/content/enemies.test.ts`
- Modify: `src/game/types.ts` if Task 1 needs small type corrections

- [ ] **Step 1: Write resolver tests**

Create `src/game/content/enemies.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  brassCloudEnemyFrames,
  brassCloudEnemyVariants,
  enemyArchetypes,
  resolveEnemyWave,
  resolvePatternForDifficulty,
} from './enemies'
import type { EnemyArchetypeId } from '../types'

const archetypeIds: EnemyArchetypeId[] = [
  'scout',
  'sentinel',
  'lancer',
  'splitter',
  'mine-layer',
  'weaver',
]

describe('enemy content resolver', () => {
  it('defines a brass-cloud variant and atlas frame for every regular archetype', () => {
    expect(Object.keys(enemyArchetypes).sort()).toEqual([...archetypeIds].sort())

    for (const archetype of archetypeIds) {
      const variant = brassCloudEnemyVariants[`brass-cloud-${archetype}`]
      const frame = brassCloudEnemyFrames[archetype]

      expect(variant).toMatchObject({
        archetype,
        theme: 'brass-cloud',
        atlasId: 'enemy-brass-cloud',
        frameId: archetype,
      })
      expect(frame.w).toBeGreaterThan(0)
      expect(frame.h).toBeGreaterThan(0)
    }
  })

  it('resolves a wave with archetype defaults, theme metadata, and difficulty tuning', () => {
    const wave = resolveEnemyWave('hard', {
      id: 'test-lancer',
      startAt: 12,
      archetype: 'lancer',
      variant: 'brass-cloud-lancer',
      count: 2,
      spacing: 1.25,
    })

    expect(wave).toMatchObject({
      id: 'test-lancer',
      kind: 'brass-cloud-lancer',
      archetype: 'lancer',
      variant: 'brass-cloud-lancer',
      atlasId: 'enemy-brass-cloud',
      frameId: 'lancer',
      count: 2,
      spacing: 1.25,
      path: 'swoop-right',
    })
    expect(wave.hp).toBeGreaterThan(enemyArchetypes.lancer.hp)
    expect(wave.pattern.shape).toBe('needle')
    expect(wave.pattern.count).toBeGreaterThan(enemyArchetypes.lancer.pattern.count)
  })

  it('scales pattern count, speed, and interval by difficulty without changing shape', () => {
    const easy = resolvePatternForDifficulty(enemyArchetypes.weaver.pattern, 'easy')
    const hard = resolvePatternForDifficulty(enemyArchetypes.weaver.pattern, 'hard')

    expect(hard.shape).toBe(easy.shape)
    expect(hard.count).toBeGreaterThan(easy.count)
    expect(hard.speed).toBeGreaterThan(easy.speed)
    expect(hard.interval).toBeLessThan(easy.interval)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- src/game/content/enemies.test.ts
```

Expected: FAIL with module-not-found errors for `./enemies`.

- [ ] **Step 3: Add atlas metadata**

Create `src/game/content/enemyBrassCloudAtlas.ts`:

```ts
import type { EnemyFrameId } from '../types'

export type AtlasFrame = {
  x: number
  y: number
  w: number
  h: number
}

export const enemyBrassCloudAtlasSize = {
  width: 768,
  height: 512,
} as const

export const brassCloudEnemyFrames: Record<EnemyFrameId, AtlasFrame> = {
  scout: { x: 0, y: 0, w: 256, h: 256 },
  sentinel: { x: 256, y: 0, w: 256, h: 256 },
  lancer: { x: 512, y: 0, w: 256, h: 256 },
  splitter: { x: 0, y: 256, w: 256, h: 256 },
  'mine-layer': { x: 256, y: 256, w: 256, h: 256 },
  weaver: { x: 512, y: 256, w: 256, h: 256 },
} as const
```

- [ ] **Step 4: Add enemy resolver**

Create `src/game/content/enemies.ts`:

```ts
import { brassCloudEnemyFrames } from './enemyBrassCloudAtlas'
import type {
  BulletPatternConfig,
  Difficulty,
  EnemyArchetypeId,
  EnemyVariantId,
  EnemyWave,
} from '../types'

type EnemyArchetypeDefinition = {
  id: EnemyArchetypeId
  hp: number
  speed: number
  scale: number
  hitRadius: number
  path: EnemyWave['path']
  pattern: BulletPatternConfig
}

type EnemyThemeVariant = {
  id: EnemyVariantId
  archetype: EnemyArchetypeId
  theme: 'brass-cloud'
  atlasId: 'enemy-brass-cloud'
  frameId: EnemyArchetypeId
  displayName: string
  patternOverride?: Partial<BulletPatternConfig>
}

type StageEnemyPlacement = {
  id: string
  startAt: number
  archetype: EnemyArchetypeId
  variant: EnemyVariantId
  count: number
  spacing: number
  hp?: number
  speed?: number
  path?: EnemyWave['path']
  pattern?: Partial<BulletPatternConfig>
}

const tuningByDifficulty: Record<
  Difficulty,
  { hp: number; bulletCount: number; bulletSpeed: number; interval: number }
> = {
  easy: { hp: 1, bulletCount: 1, bulletSpeed: 1, interval: 1 },
  normal: { hp: 1.12, bulletCount: 1.25, bulletSpeed: 1.08, interval: 0.92 },
  hard: { hp: 1.28, bulletCount: 1.5, bulletSpeed: 1.18, interval: 0.82 },
}

export const enemyArchetypes: Record<EnemyArchetypeId, EnemyArchetypeDefinition> = {
  scout: {
    id: 'scout',
    hp: 14,
    speed: 0.78,
    scale: 0.82,
    hitRadius: 0.2,
    path: 'swoop-left',
    pattern: { shape: 'fan', count: 5, interval: 1.25, speed: 1.15, spread: 1.18, life: 7.5 },
  },
  sentinel: {
    id: 'sentinel',
    hp: 26,
    speed: 0.56,
    scale: 0.92,
    hitRadius: 0.24,
    path: 'helix',
    pattern: { shape: 'ring', count: 7, interval: 1.7, speed: 0.96, spread: 0.35, life: 8.2 },
  },
  lancer: {
    id: 'lancer',
    hp: 18,
    speed: 0.66,
    scale: 0.86,
    hitRadius: 0.21,
    path: 'swoop-right',
    pattern: { shape: 'needle', count: 3, interval: 1.35, speed: 1.55, spread: 0.22, life: 6.8, aim: 'player' },
  },
  splitter: {
    id: 'splitter',
    hp: 20,
    speed: 0.62,
    scale: 0.88,
    hitRadius: 0.22,
    path: 'swoop-left',
    pattern: {
      shape: 'split',
      count: 4,
      interval: 1.5,
      speed: 1.08,
      spread: 0.74,
      life: 8,
      split: { delay: 0.55, count: 2, speedMultiplier: 0.78 },
    },
  },
  'mine-layer': {
    id: 'mine-layer',
    hp: 24,
    speed: 0.52,
    scale: 0.9,
    hitRadius: 0.24,
    path: 'helix',
    pattern: { shape: 'mine', count: 3, interval: 1.85, speed: 0.58, spread: 0.9, life: 7.2 },
  },
  weaver: {
    id: 'weaver',
    hp: 19,
    speed: 0.7,
    scale: 0.84,
    hitRadius: 0.21,
    path: 'helix',
    pattern: {
      shape: 'wave',
      count: 6,
      interval: 1.18,
      speed: 1.05,
      spread: 1.2,
      life: 8.2,
      wave: { amplitude: 0.55, frequency: 2.4 },
    },
  },
}

export const brassCloudEnemyVariants: Record<EnemyVariantId, EnemyThemeVariant> = {
  'brass-cloud-scout': {
    id: 'brass-cloud-scout',
    archetype: 'scout',
    theme: 'brass-cloud',
    atlasId: 'enemy-brass-cloud',
    frameId: 'scout',
    displayName: 'Brass Scout',
  },
  'brass-cloud-sentinel': {
    id: 'brass-cloud-sentinel',
    archetype: 'sentinel',
    theme: 'brass-cloud',
    atlasId: 'enemy-brass-cloud',
    frameId: 'sentinel',
    displayName: 'Brass Sentinel',
  },
  'brass-cloud-lancer': {
    id: 'brass-cloud-lancer',
    archetype: 'lancer',
    theme: 'brass-cloud',
    atlasId: 'enemy-brass-cloud',
    frameId: 'lancer',
    displayName: 'Brass Lancer',
  },
  'brass-cloud-splitter': {
    id: 'brass-cloud-splitter',
    archetype: 'splitter',
    theme: 'brass-cloud',
    atlasId: 'enemy-brass-cloud',
    frameId: 'splitter',
    displayName: 'Brass Splitter',
  },
  'brass-cloud-mine-layer': {
    id: 'brass-cloud-mine-layer',
    archetype: 'mine-layer',
    theme: 'brass-cloud',
    atlasId: 'enemy-brass-cloud',
    frameId: 'mine-layer',
    displayName: 'Brass Mine Layer',
  },
  'brass-cloud-weaver': {
    id: 'brass-cloud-weaver',
    archetype: 'weaver',
    theme: 'brass-cloud',
    atlasId: 'enemy-brass-cloud',
    frameId: 'weaver',
    displayName: 'Brass Weaver',
  },
}

export { brassCloudEnemyFrames }

export function resolvePatternForDifficulty(
  pattern: BulletPatternConfig,
  difficulty: Difficulty,
): BulletPatternConfig {
  const tuning = tuningByDifficulty[difficulty]

  return {
    ...pattern,
    count: Math.max(3, Math.round(pattern.count * tuning.bulletCount)),
    interval: Number((pattern.interval * tuning.interval).toFixed(2)),
    speed: Number((pattern.speed * tuning.bulletSpeed).toFixed(2)),
  }
}

export function resolveEnemyWave(
  difficulty: Difficulty,
  placement: StageEnemyPlacement,
): EnemyWave {
  const archetype = enemyArchetypes[placement.archetype]
  const variant = brassCloudEnemyVariants[placement.variant]
  const mergedPattern = {
    ...archetype.pattern,
    ...variant.patternOverride,
    ...placement.pattern,
  }
  const tuning = tuningByDifficulty[difficulty]

  return {
    id: placement.id,
    startAt: placement.startAt,
    kind: variant.id,
    archetype: archetype.id,
    variant: variant.id,
    atlasId: variant.atlasId,
    frameId: variant.frameId,
    count: placement.count,
    spacing: placement.spacing,
    hp: placement.hp ?? Math.round(archetype.hp * tuning.hp),
    speed: placement.speed ?? archetype.speed,
    scale: archetype.scale,
    hitRadius: archetype.hitRadius,
    path: placement.path ?? archetype.path,
    pattern: resolvePatternForDifficulty(mergedPattern, difficulty),
  }
}
```

- [ ] **Step 5: Run resolver test and typecheck**

Run:

```powershell
npm test -- src/game/content/enemies.test.ts
npm run typecheck
```

Expected: resolver tests PASS. Typecheck may still FAIL from `stage1.ts`, `battleRuntime.ts`, and `BattleView.tsx` until later tasks update consumers.

- [ ] **Step 6: Commit once consumer type errors are fixed by Task 3 or Task 4**

Use this commit message after the project typechecks again:

```powershell
git add -- src/game/types.ts src/game/content/enemyBrassCloudAtlas.ts src/game/content/enemies.ts src/game/content/enemies.test.ts
git commit -m "Add enemy archetype content resolver"
```

---

### Task 3: Migrate Stage 1 To Resolver-Backed Waves

**Files:**
- Modify: `src/game/content/stage1.ts`
- Modify: `src/game/content/stage1.test.ts`

- [ ] **Step 1: Add Stage 1 archetype coverage test**

Append this test to `src/game/content/stage1.test.ts`:

```ts
it('uses every regular enemy archetype in Stage 1', () => {
  const stage = createStageDefinition('normal')

  expect(new Set(stage.waves.map((wave) => wave.archetype))).toEqual(
    new Set(['scout', 'sentinel', 'lancer', 'splitter', 'mine-layer', 'weaver']),
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- src/game/content/stage1.test.ts
```

Expected: FAIL because current waves do not include `archetype`.

- [ ] **Step 3: Replace hard-coded `baseWaves` with placements**

In `src/game/content/stage1.ts`, remove the local `tuningByDifficulty` and `scalePattern` definitions. Add this import:

```ts
import { resolveEnemyWave } from './enemies'
```

Replace `baseWaves: EnemyWave[]` with:

```ts
const baseWavePlacements = [
  {
    id: 'wave-1',
    startAt: 1.8,
    archetype: 'scout',
    variant: 'brass-cloud-scout',
    count: 3,
    spacing: 1.8,
  },
  {
    id: 'wave-2',
    startAt: 10.5,
    archetype: 'sentinel',
    variant: 'brass-cloud-sentinel',
    count: 3,
    spacing: 1.45,
  },
  {
    id: 'wave-3',
    startAt: 19,
    archetype: 'lancer',
    variant: 'brass-cloud-lancer',
    count: 3,
    spacing: 1.65,
  },
  {
    id: 'wave-4',
    startAt: 28,
    archetype: 'splitter',
    variant: 'brass-cloud-splitter',
    count: 4,
    spacing: 1.45,
  },
  {
    id: 'wave-5',
    startAt: 38,
    archetype: 'mine-layer',
    variant: 'brass-cloud-mine-layer',
    count: 4,
    spacing: 1.35,
  },
  {
    id: 'wave-6',
    startAt: 48,
    archetype: 'weaver',
    variant: 'brass-cloud-weaver',
    count: 4,
    spacing: 1.25,
  },
  {
    id: 'wave-7',
    startAt: 58,
    archetype: 'scout',
    variant: 'brass-cloud-scout',
    count: 5,
    spacing: 1.25,
    pattern: { count: 7, spread: 1.45 },
  },
  {
    id: 'wave-8',
    startAt: 68,
    archetype: 'weaver',
    variant: 'brass-cloud-weaver',
    count: 5,
    spacing: 1.15,
    pattern: { count: 8, interval: 1.05 },
  },
] as const
```

- [ ] **Step 4: Resolve placements inside `createStageDefinition`**

Replace the `waves:` mapping with:

```ts
waves: baseWavePlacements.map((placement) => ({
  ...resolveEnemyWave(difficulty, placement),
  startAt: scaleTime(placement.startAt),
})),
```

- [ ] **Step 5: Keep boss pattern scaling local**

Because the boss remains outside the new regular enemy system, add this helper near `baseBoss`:

```ts
const bossTuningByDifficulty: Record<
  Difficulty,
  { bulletCount: number; bulletSpeed: number; interval: number }
> = {
  easy: { bulletCount: 1, bulletSpeed: 1, interval: 1 },
  normal: { bulletCount: 1.25, bulletSpeed: 1.08, interval: 0.92 },
  hard: { bulletCount: 1.5, bulletSpeed: 1.18, interval: 0.82 },
}

function scaleBossPattern(pattern: BulletPatternConfig, difficulty: Difficulty): BulletPatternConfig {
  const tuning = bossTuningByDifficulty[difficulty]

  return {
    ...pattern,
    count: Math.max(3, Math.round(pattern.count * tuning.bulletCount)),
    interval: Number((pattern.interval * tuning.interval).toFixed(2)),
    speed: Number((pattern.speed * tuning.bulletSpeed).toFixed(2)),
  }
}
```

Then change boss phase scaling to:

```ts
pattern: scaleBossPattern(phase.pattern, difficulty),
```

- [ ] **Step 6: Run Stage 1 tests and typecheck**

Run:

```powershell
npm test -- src/game/content/stage1.test.ts src/game/content/enemies.test.ts
npm run typecheck
```

Expected: Stage content tests PASS. Typecheck may still FAIL in runtime/rendering consumers until Task 4 and Task 6.

- [ ] **Step 7: Commit after runtime consumers typecheck**

Use this commit message after Task 4 restores typecheck:

```powershell
git add -- src/game/content/stage1.ts src/game/content/stage1.test.ts
git commit -m "Migrate Stage 1 to enemy archetypes"
```

---

### Task 4: Add New Runtime Bullet Pattern Behavior

**Files:**
- Modify: `src/game/runtime/battleRuntime.ts`
- Modify: `src/game/runtime/battleRuntime.test.ts`

- [ ] **Step 1: Add pattern behavior tests**

Append this helper and tests to `src/game/runtime/battleRuntime.test.ts`:

```ts
import type { BulletPatternConfig } from '../types'

function createPatternStage(pattern: BulletPatternConfig): StageDefinition {
  const stage = createStageDefinition('normal')

  return {
    ...stage,
    duration: 999,
    waves: [
      {
        ...stage.waves[0]!,
        id: `pattern-${pattern.shape}`,
        startAt: 0,
        count: 1,
        pattern,
      },
    ],
    boss: {
      ...stage.boss,
      startAt: 999,
    },
  }
}

describe('regular enemy bullet patterns', () => {
  it('fires needle bullets toward the player lane', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createPatternStage({
        shape: 'needle',
        count: 3,
        interval: 999,
        speed: 2,
        spread: 0.2,
        life: 5,
        aim: 'player',
      }),
    })

    runtime.update(2)

    const enemyBullets = runtime.getSnapshot().bullets.filter((bullet) => bullet.source === 'enemy')
    expect(enemyBullets.length).toBe(3)
    expect(Math.max(...enemyBullets.map((bullet) => bullet.glow))).toBeGreaterThan(1.1)
  })

  it('creates secondary bullets from split patterns', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createPatternStage({
        shape: 'split',
        count: 2,
        interval: 999,
        speed: 1.2,
        spread: 0.55,
        life: 6,
        split: { delay: 0.2, count: 2, speedMultiplier: 0.75 },
      }),
    })

    runtime.update(2)
    const beforeSplit = runtime.getSnapshot().bullets.filter((bullet) => bullet.source === 'enemy').length
    runtime.update(0.35)
    const afterSplit = runtime.getSnapshot().bullets.filter((bullet) => bullet.source === 'enemy').length

    expect(afterSplit).toBeGreaterThan(beforeSplit)
  })

  it('keeps mine bullets slower and larger than needle bullets', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createPatternStage({
        shape: 'mine',
        count: 3,
        interval: 999,
        speed: 0.45,
        spread: 0.8,
        life: 6,
      }),
    })

    runtime.update(2)

    const enemyBullets = runtime.getSnapshot().bullets.filter((bullet) => bullet.source === 'enemy')
    expect(enemyBullets.length).toBe(3)
    expect(Math.min(...enemyBullets.map((bullet) => bullet.radius))).toBeGreaterThan(0.13)
  })

  it('adds horizontal variation to wave bullets over time', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createPatternStage({
        shape: 'wave',
        count: 4,
        interval: 999,
        speed: 1,
        spread: 0.8,
        life: 6,
        wave: { amplitude: 0.55, frequency: 2.4 },
      }),
    })

    runtime.update(2)
    const firstXs = runtime.getSnapshot().bullets
      .filter((bullet) => bullet.source === 'enemy')
      .map((bullet) => bullet.position.x)
    runtime.update(0.4)
    const secondXs = runtime.getSnapshot().bullets
      .filter((bullet) => bullet.source === 'enemy')
      .map((bullet) => bullet.position.x)

    expect(secondXs.some((x, index) => Math.abs(x - firstXs[index]!) > 0.02)).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify failures**

Run:

```powershell
npm test -- src/game/runtime/battleRuntime.test.ts
```

Expected: FAIL because `RuntimeBullet` has no split or wave state and `firePattern` treats new shapes like old fan bullets.

- [ ] **Step 3: Add runtime bullet metadata**

In `src/game/runtime/battleRuntime.ts`, extend `RuntimeBullet`:

```ts
type RuntimeBullet = {
  id: string
  source: 'player' | 'enemy'
  x: number
  z: number
  vx: number
  vz: number
  radius: number
  glow: number
  life: number
  damage: number
  offViewportFor: number
  age: number
  splitAfter?: number
  splitCount?: number
  splitSpeed?: number
  hasSplit?: boolean
  waveAmplitude?: number
  waveFrequency?: number
  wavePhase?: number
}
```

Update `addBullet`:

```ts
const addBullet = (bullet: Omit<RuntimeBullet, 'id' | 'offViewportFor' | 'age'>) => {
  bullets.push({ id: `bullet-${lastBulletId++}`, offViewportFor: 0, age: 0, ...bullet })
}
```

- [ ] **Step 4: Add aiming helper**

Add below `distanceSquared`:

```ts
function normalizeVelocity(dx: number, dz: number, speed: number) {
  const length = Math.hypot(dx, dz) || 1

  return {
    vx: (dx / length) * speed,
    vz: (dz / length) * speed,
  }
}
```

- [ ] **Step 5: Replace `firePattern` with shape-specific behavior**

In `firePattern`, keep the existing `ring` branch, then add explicit branches before the final fan-like branch:

```ts
if (pattern.shape === 'needle') {
  const base =
    pattern.aim === 'player'
      ? Math.atan2(player.z - originZ, player.x - originX)
      : centerAngle

  for (let index = 0; index < pattern.count; index += 1) {
    const spreadFactor = pattern.count === 1 ? 0 : index / (pattern.count - 1) - 0.5
    const angle = base + spreadFactor * pattern.spread
    addBullet({
      source: 'enemy',
      x: originX,
      z: originZ,
      vx: Math.cos(angle) * pattern.speed,
      vz: Math.sin(angle) * pattern.speed,
      radius: 0.085,
      glow: 1.28,
      life: pattern.life,
      damage: 1,
    })
  }
  return
}

if (pattern.shape === 'mine') {
  for (let index = 0; index < pattern.count; index += 1) {
    const spreadFactor = pattern.count === 1 ? 0 : index / (pattern.count - 1) - 0.5
    const angle = centerAngle + spreadFactor * pattern.spread
    addBullet({
      source: 'enemy',
      x: originX,
      z: originZ,
      vx: Math.cos(angle) * pattern.speed,
      vz: Math.sin(angle) * pattern.speed,
      radius: 0.16,
      glow: 1.36,
      life: pattern.life,
      damage: 1,
    })
  }
  return
}
```

For `split` and `wave`, use the final branch but set metadata inside `addBullet`:

```ts
splitAfter: pattern.shape === 'split' ? pattern.split?.delay ?? 0.5 : undefined,
splitCount: pattern.shape === 'split' ? pattern.split?.count ?? 2 : undefined,
splitSpeed:
  pattern.shape === 'split'
    ? pattern.speed * (pattern.split?.speedMultiplier ?? 0.75)
    : undefined,
waveAmplitude: pattern.shape === 'wave' ? pattern.wave?.amplitude ?? 0.45 : undefined,
waveFrequency: pattern.shape === 'wave' ? pattern.wave?.frequency ?? 2.2 : undefined,
wavePhase: pattern.shape === 'wave' ? index * 0.7 : undefined,
```

- [ ] **Step 6: Update bullet movement for split and wave metadata**

In `updateBullets`, immediately after `const bullet = bullets[index]`, add:

```ts
bullet.age += delta

if (
  bullet.source === 'enemy' &&
  bullet.splitAfter !== undefined &&
  bullet.splitCount !== undefined &&
  bullet.splitSpeed !== undefined &&
  !bullet.hasSplit &&
  bullet.age >= bullet.splitAfter
) {
  bullet.hasSplit = true
  for (let splitIndex = 0; splitIndex < bullet.splitCount; splitIndex += 1) {
    const angle = -Math.PI / 2 + (splitIndex - (bullet.splitCount - 1) / 2) * 0.48
    addBullet({
      source: 'enemy',
      x: bullet.x,
      z: bullet.z,
      vx: Math.cos(angle) * bullet.splitSpeed,
      vz: Math.sin(angle) * bullet.splitSpeed,
      radius: Math.max(0.075, bullet.radius * 0.78),
      glow: Math.max(1.1, bullet.glow * 0.92),
      life: Math.max(1.8, bullet.life * 0.55),
      damage: bullet.damage,
    })
  }
}
```

Then replace:

```ts
bullet.x += bullet.vx * delta
bullet.z += bullet.vz * delta
```

with:

```ts
const waveOffset =
  bullet.waveAmplitude !== undefined && bullet.waveFrequency !== undefined
    ? Math.sin(bullet.age * bullet.waveFrequency + (bullet.wavePhase ?? 0)) *
      bullet.waveAmplitude *
      delta
    : 0

bullet.x += bullet.vx * delta + waveOffset
bullet.z += bullet.vz * delta
```

- [ ] **Step 7: Carry render metadata and hit radius**

In `RuntimeEnemy`, add:

```ts
archetype: EnemyWave['archetype']
variant: EnemyWave['variant']
atlasId: EnemyWave['atlasId']
frameId: EnemyWave['frameId']
scale: number
hitRadius: number
```

In `spawnWave`, add these fields inside the pushed enemy object:

```ts
archetype: wave.archetype,
variant: wave.variant,
atlasId: wave.atlasId,
frameId: wave.frameId,
scale: wave.scale,
hitRadius: wave.hitRadius,
```

In `buildSnapshot`, replace the old scale calculation with:

```ts
const renderEnemies: RenderEnemy[] = enemies.map((enemy) => ({
  id: enemy.id,
  kind: enemy.kind,
  archetype: enemy.archetype,
  variant: enemy.variant,
  atlasId: enemy.atlasId,
  frameId: enemy.frameId,
  position: { x: enemy.x, z: enemy.z },
  scale: enemy.scale,
}))
```

In player-shot collision, replace:

```ts
const hitDistance = bullet.radius + 0.2
```

with:

```ts
const hitDistance = bullet.radius + enemy.hitRadius
```

- [ ] **Step 8: Run runtime tests and typecheck**

Run:

```powershell
npm test -- src/game/runtime/battleRuntime.test.ts src/game/content/enemies.test.ts src/game/content/stage1.test.ts
npm run typecheck
```

Expected: tests PASS and typecheck PASS after runtime consumers understand new fields.

- [ ] **Step 9: Commit**

```powershell
git add -- src/game/runtime/battleRuntime.ts src/game/runtime/battleRuntime.test.ts src/game/types.ts src/game/content/enemyBrassCloudAtlas.ts src/game/content/enemies.ts src/game/content/enemies.test.ts src/game/content/stage1.ts src/game/content/stage1.test.ts
git commit -m "Add archetype waves and enemy pattern behavior"
```

---

### Task 5: Generate Source Sprites And Pack Brass-Cloud Atlas

**Files:**
- Create: `scripts/pack-enemy-atlas.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Add: `src/assets/generated/enemies/brass-cloud/*.png`
- Add: `src/assets/generated/enemy-brass-cloud-atlas.png`

- [ ] **Step 1: Install atlas-packing dependency**

Run:

```powershell
npm install -D sharp
```

Expected: `package.json` and `package-lock.json` include `sharp`.

- [ ] **Step 2: Generate six source sprites with imagegen**

Use built-in `image_gen`, one call per archetype. Use chroma-key prompts so the backgrounds can be removed locally before atlas packing.

```text
Use case: stylized-concept
Asset type: transparent game sprite for a vertical danmaku shooter
Primary request: Create a brass-cloud aether aircraft enemy sprite for the scout archetype.
Style: painterly fantasy steampunk aircraft, brass plating, turquoise aether core glow, clean readable silhouette, premium 2D game art.
Composition: centered single compact fast dart-shaped scout, top-down or slight three-quarter top view, forward wings, light body, generous padding, symmetrical enough to read at small size.
Background: perfectly flat solid #00ff00 chroma-key background for background removal.
Constraints: no text, no watermark, no cast shadow, no ground plane, no environment, no extra aircraft, no UI.
Do not use #00ff00 anywhere in the subject.
```

```text
Use case: stylized-concept
Asset type: transparent game sprite for a vertical danmaku shooter
Primary request: Create a brass-cloud aether aircraft enemy sprite for the sentinel archetype.
Style: painterly fantasy steampunk aircraft, brass plating, turquoise aether core glow, clean readable silhouette, premium 2D game art.
Composition: centered single round shield-like guard craft, top-down or slight three-quarter top view, heavy ring armor, defensive core, generous padding, symmetrical enough to read at small size.
Background: perfectly flat solid #00ff00 chroma-key background for background removal.
Constraints: no text, no watermark, no cast shadow, no ground plane, no environment, no extra aircraft, no UI.
Do not use #00ff00 anywhere in the subject.
```

```text
Use case: stylized-concept
Asset type: transparent game sprite for a vertical danmaku shooter
Primary request: Create a brass-cloud aether aircraft enemy sprite for the lancer archetype.
Style: painterly fantasy steampunk aircraft, brass plating, turquoise aether core glow, clean readable silhouette, premium 2D game art.
Composition: centered single long narrow spear-like craft, top-down or slight three-quarter top view, extended barrel nose, precision sniper silhouette, generous padding, symmetrical enough to read at small size.
Background: perfectly flat solid #00ff00 chroma-key background for background removal.
Constraints: no text, no watermark, no cast shadow, no ground plane, no environment, no extra aircraft, no UI.
Do not use #00ff00 anywhere in the subject.
```

```text
Use case: stylized-concept
Asset type: transparent game sprite for a vertical danmaku shooter
Primary request: Create a brass-cloud aether aircraft enemy sprite for the splitter archetype.
Style: painterly fantasy steampunk aircraft, brass plating, turquoise aether core glow, clean readable silhouette, premium 2D game art.
Composition: centered single angular crystal-like craft, top-down or slight three-quarter top view, segmented wings suggesting splitting projectiles, generous padding, symmetrical enough to read at small size.
Background: perfectly flat solid #00ff00 chroma-key background for background removal.
Constraints: no text, no watermark, no cast shadow, no ground plane, no environment, no extra aircraft, no UI.
Do not use #00ff00 anywhere in the subject.
```

```text
Use case: stylized-concept
Asset type: transparent game sprite for a vertical danmaku shooter
Primary request: Create a brass-cloud aether aircraft enemy sprite for the mine-layer archetype.
Style: painterly fantasy steampunk aircraft, brass plating, turquoise aether core glow, clean readable silhouette, premium 2D game art.
Composition: centered single bulky carrier craft, top-down or slight three-quarter top view, lower pods suggesting mine deployment, generous padding, symmetrical enough to read at small size.
Background: perfectly flat solid #00ff00 chroma-key background for background removal.
Constraints: no text, no watermark, no cast shadow, no ground plane, no environment, no extra aircraft, no UI.
Do not use #00ff00 anywhere in the subject.
```

```text
Use case: stylized-concept
Asset type: transparent game sprite for a vertical danmaku shooter
Primary request: Create a brass-cloud aether aircraft enemy sprite for the weaver archetype.
Style: painterly fantasy steampunk aircraft, brass plating, turquoise aether core glow, clean readable silhouette, premium 2D game art.
Composition: centered single curved wing craft, top-down or slight three-quarter top view, arcane turbine rings suggesting spiral and wave patterns, generous padding, symmetrical enough to read at small size.
Background: perfectly flat solid #00ff00 chroma-key background for background removal.
Constraints: no text, no watermark, no cast shadow, no ground plane, no environment, no extra aircraft, no UI.
Do not use #00ff00 anywhere in the subject.
```

- [ ] **Step 3: Remove chroma-key backgrounds**

For each generated source image copied into `src/assets/generated/enemies/brass-cloud/source-keyed/`, run:

```powershell
python C:\Users\enne1\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py --input src\assets\generated\enemies\brass-cloud\source-keyed\scout.png --out src\assets\generated\enemies\brass-cloud\scout.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
```

Repeat for `sentinel`, `lancer`, `splitter`, `mine-layer`, and `weaver`.

- [ ] **Step 4: Add atlas packer script**

Create `scripts/pack-enemy-atlas.mjs`:

```js
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sourceDir = path.join(root, 'src/assets/generated/enemies/brass-cloud')
const outPath = path.join(root, 'src/assets/generated/enemy-brass-cloud-atlas.png')
const cellSize = 256
const columns = 3
const rows = 2
const frames = ['scout', 'sentinel', 'lancer', 'splitter', 'mine-layer', 'weaver']

await fs.mkdir(path.dirname(outPath), { recursive: true })

const composites = await Promise.all(
  frames.map(async (frame, index) => {
    const input = await sharp(path.join(sourceDir, `${frame}.png`))
      .resize({
        width: 220,
        height: 220,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer()

    const left = (index % columns) * cellSize + 18
    const top = Math.floor(index / columns) * cellSize + 18

    return { input, left, top }
  }),
)

await sharp({
  create: {
    width: columns * cellSize,
    height: rows * cellSize,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(composites)
  .png()
  .toFile(outPath)

console.log(`Packed ${frames.length} frames into ${path.relative(root, outPath)}`)
```

- [ ] **Step 5: Add package script**

In `package.json`, add:

```json
"assets:pack-enemies": "node scripts/pack-enemy-atlas.mjs"
```

Keep the existing scripts intact.

- [ ] **Step 6: Pack the atlas**

Run:

```powershell
npm run assets:pack-enemies
```

Expected: `src/assets/generated/enemy-brass-cloud-atlas.png` exists and is a 768x512 PNG.

- [ ] **Step 7: Verify generated files**

Run:

```powershell
Get-ChildItem -LiteralPath src\assets\generated\enemies\brass-cloud -Filter *.png | Select-Object Name,Length
Get-Item -LiteralPath src\assets\generated\enemy-brass-cloud-atlas.png | Select-Object Name,Length
```

Expected: six source sprites and one non-empty atlas image.

- [ ] **Step 8: Commit**

```powershell
git add -- package.json package-lock.json scripts/pack-enemy-atlas.mjs src/assets/generated/enemies/brass-cloud src/assets/generated/enemy-brass-cloud-atlas.png
git commit -m "Add brass-cloud enemy atlas assets"
```

---

### Task 6: Render Regular Enemies From Atlas Frames

**Files:**
- Modify: `src/game/assets.ts`
- Modify: `src/game/ui/BattleView.tsx`
- Modify: `src/game/ui/BattleView.test.ts`

- [ ] **Step 1: Expose atlas asset**

In `src/game/assets.ts`, add:

```ts
import enemyBrassCloudAtlasUrl from '../assets/generated/enemy-brass-cloud-atlas.png'
```

Add this property to `gameAssets`:

```ts
enemyBrassCloudAtlasUrl,
```

Keep existing individual enemy imports until the atlas renderer is fully wired, then remove `enemyFeatherUrl` and `enemyScoutUrl` if no references remain.

- [ ] **Step 2: Add UV material support**

In `src/game/ui/BattleView.tsx`, import atlas metadata:

```ts
import {
  brassCloudEnemyFrames,
  enemyBrassCloudAtlasSize,
  type AtlasFrame,
} from '../content/enemyBrassCloudAtlas'
```

Change `RestoredTextureMaterial` props to accept optional `uvScale` and `uvOffset`:

```ts
  uvScale = new THREE.Vector2(1 / frameColumns, 1),
  uvOffset = new THREE.Vector2(0, 0),
```

Update the prop type:

```ts
  uvScale?: THREE.Vector2
  uvOffset?: THREE.Vector2
```

In the material uniforms, initialize:

```ts
uvScale: { value: uvScale.clone() },
uvOffset: { value: uvOffset.clone() },
```

In the `useFrame` animation block, only mutate frame columns when no explicit atlas UV is supplied:

```ts
if (frameColumns <= 1 || uvScale.x !== 1 / frameColumns || uvOffset.x !== 0) {
  return
}
```

In the `useEffect`, replace the unconditional `uvScale` update with:

```ts
material.uniforms.uvScale.value.copy(uvScale)
material.uniforms.uvOffset.value.copy(uvOffset)
```

- [ ] **Step 3: Add atlas frame helper**

Add near `resolveEnemyAssetUrl` replacement:

```ts
function getAtlasFrameUv(frame: AtlasFrame) {
  return {
    uvScale: new THREE.Vector2(
      frame.w / enemyBrassCloudAtlasSize.width,
      frame.h / enemyBrassCloudAtlasSize.height,
    ),
    uvOffset: new THREE.Vector2(
      frame.x / enemyBrassCloudAtlasSize.width,
      1 - (frame.y + frame.h) / enemyBrassCloudAtlasSize.height,
    ),
  }
}
```

- [ ] **Step 4: Replace regular enemy sprite URL routing**

Remove `resolveEnemyAssetUrl`. Replace `EnemySprite` with:

```tsx
function EnemySprite({
  frameId,
  position,
  scale,
}: {
  frameId: keyof typeof brassCloudEnemyFrames
  position: [number, number, number]
  scale: number
}) {
  const enemyTexture = useLoadedTexture(gameAssets.enemyBrassCloudAtlasUrl)
  const frame = brassCloudEnemyFrames[frameId]
  const { uvScale, uvOffset } = useMemo(() => getAtlasFrameUv(frame), [frame])

  if (!enemyTexture) {
    return (
      <mesh position={position}>
        <circleGeometry args={[0.36, 32]} />
        <meshBasicMaterial color="#ffbe62" toneMapped={false} />
      </mesh>
    )
  }

  return (
    <mesh position={position}>
      <planeGeometry args={[scale, scale]} />
      <RestoredTextureMaterial
        texture={enemyTexture}
        uvScale={uvScale}
        uvOffset={uvOffset}
      />
    </mesh>
  )
}
```

Update `RuntimeEntityLayer`:

```tsx
<EnemySprite
  key={enemy.id}
  frameId={enemy.frameId}
  position={arenaPointToView(enemy.position, 0.7)}
  scale={enemy.scale}
/>
```

- [ ] **Step 5: Keep boss on standalone asset**

Leave `BossSprite` using `gameAssets.bossCoreUrl`.

- [ ] **Step 6: Add render contract test**

In `src/game/ui/BattleView.test.ts`, add:

```ts
it('renders the Canvas-backed battle view with atlas-backed enemy metadata', () => {
  render(<BattleView difficulty="easy" fastStage invincible onComplete={() => {}} />)

  expect(document.querySelector('canvas')).toBeInTheDocument()
  expect(screen.getByLabelText('Battle status')).toBeInTheDocument()
})
```

If a similar Canvas/HUD test already exists, extend that test instead of duplicating it.

- [ ] **Step 7: Run UI tests and typecheck**

Run:

```powershell
npm test -- src/game/ui/BattleView.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Remove unused standalone enemy imports**

If TypeScript reports no references to `enemyFeatherUrl` or `enemyScoutUrl`, remove their imports and properties from `src/game/assets.ts`. Keep the files in `src/assets/generated/` unless the user explicitly asks for asset cleanup.

- [ ] **Step 9: Commit**

```powershell
git add -- src/game/assets.ts src/game/ui/BattleView.tsx src/game/ui/BattleView.test.ts
git commit -m "Render enemies from brass-cloud atlas"
```

---

### Task 7: Full Verification And Browser Screenshot

**Files:**
- Update: `output/playwright/battle-enemy-atlas-system.png`

- [ ] **Step 1: Run full automated verification**

Run:

```powershell
npm test
npm run typecheck
npm run build
```

Expected: all pass. A Vite chunk-size warning is acceptable if it matches the existing warning pattern.

- [ ] **Step 2: Start Vite dev server**

Run:

```powershell
Start-Process -FilePath "powershell" -ArgumentList @("-NoProfile", "-Command", "cd D:\vibe-danmaku; npm run dev -- --host 127.0.0.1 *> vite-enemy-atlas.log") -WindowStyle Hidden
```

Expected: dev server starts on the default Vite port or the next available port.

- [ ] **Step 3: Verify in browser**

Open:

```text
http://127.0.0.1:5173?fastStage=1&invincible=1
```

Use the app flow to enter battle on easy difficulty. Wait until at least two enemy waves have appeared.

- [ ] **Step 4: Capture screenshot**

Use Playwright or the in-app browser screenshot tool to save:

```powershell
output\playwright\battle-enemy-atlas-system.png
```

Expected screenshot evidence:

- Canvas is nonblank.
- Regular enemies render from the brass-cloud atlas.
- Enemy silhouettes are visibly varied.
- Enemy bullets include at least one non-fan behavior.
- HUD remains readable.

- [ ] **Step 5: Stop Vite dev server**

Find and stop the process bound to the dev server port:

```powershell
$vitePids = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique
if ($vitePids) {
  Stop-Process -Id $vitePids
}
```

- [ ] **Step 6: Commit screenshot evidence if desired**

If the repo has been committing `output/playwright` evidence for similar battle changes, commit it:

```powershell
git add -- output/playwright/battle-enemy-atlas-system.png
git commit -m "Add enemy atlas battle screenshot"
```

If screenshots are not intended for this change, leave the screenshot untracked and mention the local path in the final answer.

---

### Task 8: Final Cleanup

**Files:**
- Modify only files with verified issues from previous tasks.

- [ ] **Step 1: Check intended file set**

Run:

```powershell
git status --short
```

Expected tracked or staged changes should be limited to the planned source, test, script, asset, and optional screenshot files.

- [ ] **Step 2: Run final verification**

Run:

```powershell
npm test
npm run typecheck
npm run build
```

Expected: all pass, with only known non-blocking Vite chunk-size warnings if they appear.

- [ ] **Step 3: Review generated asset sizes**

Run:

```powershell
Get-ChildItem -LiteralPath src\assets\generated -Recurse -File | Sort-Object Length -Descending | Select-Object -First 12 Name,Length,FullName
```

Expected: atlas and source sprites are reasonable project assets, not accidental multi-megabyte drafts.

- [ ] **Step 4: Final commit if any cleanup remains**

If Step 1 shows remaining intended source or test changes from this plan:

```powershell
git add -- src/game/types.ts src/game/content src/game/runtime src/game/ui src/game/assets.ts scripts/pack-enemy-atlas.mjs package.json package-lock.json
git commit -m "Finalize enemy archetype atlas system"
```

If Step 1 is clean, do not create an empty commit.
