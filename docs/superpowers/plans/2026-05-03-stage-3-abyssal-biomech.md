# Stage 3 Abyssal Biomech Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stage 3 as a real campaign stage with abyssal biomech enemies, new assets, midboss/final boss danmaku, and Stage 3-only 3.0 second phase breaks.

**Architecture:** Extend the existing event-first stage model instead of adding stage-specific runtime branches. Add a reusable theme-aware enemy asset path and a per-boss phase break duration hook so Stage 3 can differ without changing Stage 1/2 behavior.

**Tech Stack:** React, TypeScript, XState, Vitest, React Three Fiber, BulletML-style runtime scripts, Sharp asset optimization, built-in imagegen for source raster assets.

---

## File Structure

- Modify `src/game/types.ts`: add Stage 3 background theme, abyssal enemy theme/atlas ids, and optional boss phase break timing.
- Modify `src/game/content/enemies.ts`: generalize enemy variants beyond brass-cloud and add abyssal variants.
- Create `src/game/content/enemyAtlasFrames.ts`: shared atlas frame map and atlas sizes for brass-cloud and abyssal enemy atlases.
- Modify `src/game/content/enemies.test.ts`: lock the six abyssal variants and resolve behavior.
- Create `src/game/content/stage3.ts`: Stage 3 waves, midboss, final boss, BulletML patterns, and event timeline.
- Create `src/game/content/stage3.test.ts`: Stage 3 data contract tests.
- Modify `src/game/content/battleStage.ts`: route stage number 3.
- Modify `src/app/battleSessionMachine.ts`: support stage numbers 1, 2, and 3.
- Modify `src/app/battleSessionMachine.test.ts`, `src/app/App.test.tsx`, `src/app/screens/ResultScreen.tsx`: campaign continuation/result behavior.
- Modify `src/game/runtime/fsm/bossFsmTypes.ts`, `src/game/runtime/fsm/bossFsm.ts`, `src/game/runtime/battleRuntime.ts`: Stage 3 phase break duration via boss definition.
- Modify `src/game/runtime/fsm/bossFsm.test.ts`, `src/game/runtime/battleRuntime.test.ts`: phase break runtime guardrails.
- Modify `src/game/assets.ts`, `src/game/assets.test.ts`: Stage 3 asset registration.
- Modify `src/app/battleAssetPreload.ts`, `src/app/battleAssetPreload.test.ts`: preload Stage 3 assets.
- Modify `src/game/ui/battleBackground.tsx`, `src/game/ui/sceneConfig.ts`, `src/game/ui/battleEntities.tsx`, `src/game/ui/BattleView.test.ts`: Stage 3 background, enemy atlas, boss texture selection.
- Modify `scripts/pack-enemy-atlas.mjs`: pack both brass-cloud and abyssal enemy atlases.
- Modify `scripts/optimize-runtime-assets.mjs`: optimize Stage 3 background and boss source PNGs to WebP.
- Create new image files under `src/assets/generated/backgrounds/abyssal-biomech/`, `src/assets/generated/enemies/abyssal/`, and `src/assets/generated/bosses/`.

---

### Task 1: Generalize Enemy Themes And Atlas Metadata

**Files:**
- Modify: `src/game/types.ts`
- Create: `src/game/content/enemyAtlasFrames.ts`
- Modify: `src/game/content/enemies.ts`
- Modify: `src/game/content/enemies.test.ts`

- [ ] **Step 1: Write failing tests for abyssal variants**

Add these tests to `src/game/content/enemies.test.ts`:

```ts
it('defines an abyssal variant and atlas frame for every regular archetype', () => {
  for (const archetype of enemyArchetypeIds) {
    const variant = enemyVariants[`abyssal-biomech-${archetype}`]

    expect(variant).toEqual({
      id: `abyssal-biomech-${archetype}`,
      archetype,
      theme: 'abyssal-biomech',
      atlasId: 'enemy-abyssal-biomech',
      frameId: archetype,
      displayName: expect.stringMatching(/^Abyssal /),
      patternOverride: expect.any(Object),
    })
  }
})

it('resolves abyssal placements without changing the authored archetype role', () => {
  const wave = resolveEnemyWave('normal', {
    id: 'abyssal-test-wave',
    archetype: 'weaver',
    variant: 'abyssal-biomech-weaver',
    count: 3,
    spacing: 0.4,
  })

  expect(wave.kind).toBe('abyssal-biomech-weaver')
  expect(wave.archetype).toBe('weaver')
  expect(wave.atlasId).toBe('enemy-abyssal-biomech')
  expect(wave.frameId).toBe('weaver')
  expect(wave.pattern.shape).toBe('wave')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/game/content/enemies.test.ts
```

Expected: FAIL because `enemyVariants`, `abyssal-biomech-*`, and `enemy-abyssal-biomech` are not defined yet.

- [ ] **Step 3: Update shared types**

In `src/game/types.ts`, replace the current theme/atlas aliases with:

```ts
export type StageBackgroundTheme = 'brass-cloud' | 'burning-ruins' | 'abyssal-biomech'

export type EnemyThemeId = 'brass-cloud' | 'abyssal-biomech'
export type EnemyAtlasId = 'enemy-brass-cloud' | 'enemy-abyssal-biomech'
export type EnemyFrameId = EnemyArchetypeId
export type EnemyVariantId = `${EnemyThemeId}-${EnemyArchetypeId}`
export type EnemyKind = EnemyVariantId | 'boss-core'
```

- [ ] **Step 4: Extract atlas frame metadata**

Create `src/game/content/enemyAtlasFrames.ts`:

```ts
import type { EnemyAtlasId, EnemyFrameId } from '../types'

export type AtlasFrame = {
  x: number
  y: number
  w: number
  h: number
}

export const enemyAtlasSizeById: Record<EnemyAtlasId, { width: number; height: number }> = {
  'enemy-brass-cloud': { width: 576, height: 384 },
  'enemy-abyssal-biomech': { width: 576, height: 384 },
}

const sharedFrames: Record<EnemyFrameId, AtlasFrame> = {
  scout: { x: 0, y: 0, w: 192, h: 192 },
  sentinel: { x: 192, y: 0, w: 192, h: 192 },
  lancer: { x: 384, y: 0, w: 192, h: 192 },
  splitter: { x: 0, y: 192, w: 192, h: 192 },
  'mine-layer': { x: 192, y: 192, w: 192, h: 192 },
  weaver: { x: 384, y: 192, w: 192, h: 192 },
}

export const enemyAtlasFramesById: Record<EnemyAtlasId, Record<EnemyFrameId, AtlasFrame>> = {
  'enemy-brass-cloud': sharedFrames,
  'enemy-abyssal-biomech': sharedFrames,
}

export const brassCloudEnemyFrames = enemyAtlasFramesById['enemy-brass-cloud']
export const enemyBrassCloudAtlasSize = enemyAtlasSizeById['enemy-brass-cloud']
```

Change `src/game/content/enemyBrassCloudAtlas.ts` to re-export compatibility names:

```ts
export {
  brassCloudEnemyFrames,
  enemyBrassCloudAtlasSize,
  type AtlasFrame,
} from './enemyAtlasFrames'
```

- [ ] **Step 5: Add abyssal variants**

In `src/game/content/enemies.ts`, change `EnemyThemeVariant` and exports to:

```ts
type EnemyThemeVariant = {
  id: EnemyVariantId
  archetype: EnemyArchetypeId
  theme: EnemyThemeId
  atlasId: EnemyAtlasId
  frameId: EnemyArchetypeId
  displayName: string
  patternOverride?: Partial<BulletPatternConfig>
}

export const enemyArchetypeIds = Object.keys(enemyArchetypes) as EnemyArchetypeId[]

export const brassCloudEnemyVariants = {
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
} satisfies Record<`brass-cloud-${EnemyArchetypeId}`, EnemyThemeVariant>

export const abyssalEnemyVariants = {
  'abyssal-biomech-scout': {
    id: 'abyssal-biomech-scout',
    archetype: 'scout',
    theme: 'abyssal-biomech',
    atlasId: 'enemy-abyssal-biomech',
    frameId: 'scout',
    displayName: 'Abyssal Scout',
    patternOverride: { interval: 1.08, speed: 1.22, spread: 1.32 },
  },
  'abyssal-biomech-sentinel': {
    id: 'abyssal-biomech-sentinel',
    archetype: 'sentinel',
    theme: 'abyssal-biomech',
    atlasId: 'enemy-abyssal-biomech',
    frameId: 'sentinel',
    displayName: 'Abyssal Sentinel',
    patternOverride: { count: 8, speed: 0.9, life: 8.8 },
  },
  'abyssal-biomech-lancer': {
    id: 'abyssal-biomech-lancer',
    archetype: 'lancer',
    theme: 'abyssal-biomech',
    atlasId: 'enemy-abyssal-biomech',
    frameId: 'lancer',
    displayName: 'Abyssal Lancer',
    patternOverride: { speed: 1.72, spread: 0.34 },
  },
  'abyssal-biomech-splitter': {
    id: 'abyssal-biomech-splitter',
    archetype: 'splitter',
    theme: 'abyssal-biomech',
    atlasId: 'enemy-abyssal-biomech',
    frameId: 'splitter',
    displayName: 'Abyssal Splitter',
    patternOverride: { split: { delay: 0.68, count: 3, speedMultiplier: 0.72 } },
  },
  'abyssal-biomech-mine-layer': {
    id: 'abyssal-biomech-mine-layer',
    archetype: 'mine-layer',
    theme: 'abyssal-biomech',
    atlasId: 'enemy-abyssal-biomech',
    frameId: 'mine-layer',
    displayName: 'Abyssal Mine Layer',
    patternOverride: { count: 4, interval: 1.65, life: 8.4 },
  },
  'abyssal-biomech-weaver': {
    id: 'abyssal-biomech-weaver',
    archetype: 'weaver',
    theme: 'abyssal-biomech',
    atlasId: 'enemy-abyssal-biomech',
    frameId: 'weaver',
    displayName: 'Abyssal Weaver',
    patternOverride: { wave: { amplitude: 0.72, frequency: 2.8 } },
  },
} satisfies Record<`abyssal-biomech-${EnemyArchetypeId}`, EnemyThemeVariant>

export const enemyVariants: Record<EnemyVariantId, EnemyThemeVariant> = {
  ...brassCloudEnemyVariants,
  ...abyssalEnemyVariants,
}
```

Then update `resolveEnemyWave`:

```ts
const variant = enemyVariants[placement.variant]
```

The spec used the shorthand `abyssal-scout`, but the current `EnemyVariantId` template is `${EnemyThemeId}-${EnemyArchetypeId}`. Use `abyssal-biomech-scout` in code for type consistency and keep UI display names short.

- [ ] **Step 6: Run targeted tests**

Run:

```bash
npm test -- src/game/content/enemies.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/game/types.ts src/game/content/enemyAtlasFrames.ts src/game/content/enemyBrassCloudAtlas.ts src/game/content/enemies.ts src/game/content/enemies.test.ts
git commit -m "Add abyssal enemy theme metadata"
```

---

### Task 2: Extend Campaign Flow To Stage 3

**Files:**
- Modify: `src/app/battleSessionMachine.ts`
- Modify: `src/app/battleSessionMachine.test.ts`
- Modify: `src/app/screens/ResultScreen.tsx`
- Modify: `src/app/App.test.tsx`

- [ ] **Step 1: Write failing machine tests**

In `src/app/battleSessionMachine.test.ts`, replace the Stage 2 final-result test with:

```ts
it('stores stage 2 victory and waits for confirmation before stage 3 loading', () => {
  const service = createActor(battleSessionMachine, {
    input: { selectedCharacterId: 'iuno-fulmine' },
  }).start()

  service.send({ type: 'START_SORTIE' })
  service.send({ type: 'SELECT_DIFFICULTY', difficulty: 'normal' })
  service.send({ type: 'DEPLOY_CHARACTER' })
  service.send({ type: 'DEPLOY_CHARACTER' })
  service.send({ type: 'BATTLE_ASSETS_READY' })
  service.send({
    type: 'BATTLE_COMPLETED',
    result: { ...victoryResult, stageNumber: 1 },
  })
  service.send({ type: 'CONTINUE_CAMPAIGN' })
  service.send({ type: 'BATTLE_ASSETS_READY' })
  service.send({
    type: 'BATTLE_COMPLETED',
    result: { ...victoryResult, stageNumber: 2 },
  })

  expect(service.getSnapshot().matches('result')).toBe(true)
  expect(service.getSnapshot().context.currentStageNumber).toBe(2)

  service.send({ type: 'CONTINUE_CAMPAIGN' })

  expect(service.getSnapshot().matches('battleLoading')).toBe(true)
  expect(service.getSnapshot().context.currentStageNumber).toBe(3)
})

it('stores stage 3 victory and moves to final result', () => {
  const service = createActor(battleSessionMachine, {
    input: { selectedCharacterId: 'iuno-fulmine' },
  }).start()

  service.send({ type: 'START_SORTIE' })
  service.send({ type: 'SELECT_DIFFICULTY', difficulty: 'normal' })
  service.send({ type: 'DEPLOY_CHARACTER' })
  service.send({ type: 'DEPLOY_CHARACTER' })
  service.send({ type: 'BATTLE_ASSETS_READY' })
  service.send({ type: 'BATTLE_COMPLETED', result: { ...victoryResult, stageNumber: 1 } })
  service.send({ type: 'CONTINUE_CAMPAIGN' })
  service.send({ type: 'BATTLE_ASSETS_READY' })
  service.send({ type: 'BATTLE_COMPLETED', result: { ...victoryResult, stageNumber: 2 } })
  service.send({ type: 'CONTINUE_CAMPAIGN' })
  service.send({ type: 'BATTLE_ASSETS_READY' })
  service.send({ type: 'BATTLE_COMPLETED', result: { ...victoryResult, stageNumber: 3 } })

  expect(service.getSnapshot().matches('result')).toBe(true)
  expect(service.getSnapshot().context.currentStageNumber).toBe(3)

  service.send({ type: 'CONTINUE_CAMPAIGN' })

  expect(service.getSnapshot().matches('result')).toBe(true)
  expect(service.getSnapshot().context.currentStageNumber).toBe(3)
})

it('retries stage 3 from a stage 3 result', () => {
  const service = createActor(battleSessionMachine, {
    input: { selectedCharacterId: 'iuno-fulmine' },
  }).start()

  service.send({ type: 'START_SORTIE' })
  service.send({ type: 'SELECT_DIFFICULTY', difficulty: 'normal' })
  service.send({ type: 'DEPLOY_CHARACTER' })
  service.send({ type: 'DEPLOY_CHARACTER' })
  service.send({ type: 'BATTLE_ASSETS_READY' })
  service.send({ type: 'BATTLE_COMPLETED', result: { ...defeatResult, stageNumber: 3 } })
  service.send({ type: 'RETRY_STAGE' })

  expect(service.getSnapshot().matches('battleLoading')).toBe(true)
  expect(service.getSnapshot().context.currentStageNumber).toBe(3)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/app/battleSessionMachine.test.ts
```

Expected: FAIL because Stage 2 victory is still final and stage number type only allows `1 | 2`.

- [ ] **Step 3: Update the session machine**

In `src/app/battleSessionMachine.ts`, update:

```ts
export type BattleStageNumber = 1 | 2 | 3
```

Replace the guard/actions:

```ts
guards: {
  canContinueCampaign: ({ context }) =>
    context.result?.outcome === 'victory' && context.result.stageNumber < 3,
},
actions: {
  advanceToNextStage: assign(({ context }) => ({
    currentStageNumber:
      context.result?.stageNumber === 2 ? 3 : 2,
    battleSeed: context.battleSeed + 1,
    result: null,
  })),
  retryResultStage: assign(({ context }) => {
    if (!context.result) {
      return {}
    }

    return {
      currentStageNumber: Math.min(3, Math.max(1, context.result.stageNumber)) as BattleStageNumber,
      battleSeed: context.battleSeed + 1,
      result: null,
    }
  }),
}
```

Change the transition action:

```ts
CONTINUE_CAMPAIGN: {
  guard: 'canContinueCampaign',
  target: 'battleLoading',
  actions: 'advanceToNextStage',
},
```

- [ ] **Step 4: Update result screen continue condition**

In `src/app/screens/ResultScreen.tsx`, change:

```ts
const canContinueCampaign = result.outcome === 'victory' && result.stageNumber < 3
```

Keep the button text unchanged unless existing tests require a stage-specific label.

- [ ] **Step 5: Update app flow tests**

In `src/app/App.test.tsx`, update the mocked stage id/name helper:

```ts
const stageNames = {
  1: ['brass-cloud-gate', 'Brass Cloud Gate'],
  2: ['burning-ruin-corridor', 'Burning Ruin Corridor'],
  3: ['abyssal-biomech-trench', 'Abyssal Biomech Trench'],
} as const

const [stageId, stageName] = stageNames[stageNumber as keyof typeof stageNames]
```

Add a test:

```ts
it('continues from stage 2 victory into stage 3 before final result', async () => {
  render(<App initialViewport={{ width: 430, height: 932 }} />)

  fireEvent.click(screen.getByRole('button', { name: /start sortie/i }))
  fireEvent.click(screen.getByRole('button', { name: /normal/i }))
  fireEvent.click(screen.getByRole('button', { name: /deploy/i }))
  fireEvent.click(screen.getByRole('button', { name: /deploy/i }))
  await screen.findByLabelText(/mock stage 1 battle/i)
  fireEvent.click(screen.getByRole('button', { name: /complete victory/i }))
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  await screen.findByLabelText(/mock stage 2 battle/i, undefined, { timeout: 2500 })
  fireEvent.click(screen.getByRole('button', { name: /complete victory/i }))
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))

  await screen.findByLabelText(/mock stage 3 battle/i, undefined, { timeout: 2500 })
})
```

Update the old "final stage result after stage 2 victory" test so the final result is after Stage 3 victory.

- [ ] **Step 6: Run targeted tests**

Run:

```bash
npm test -- src/app/battleSessionMachine.test.ts src/app/App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/battleSessionMachine.ts src/app/battleSessionMachine.test.ts src/app/screens/ResultScreen.tsx src/app/App.test.tsx
git commit -m "Extend campaign flow to stage 3"
```

---

### Task 3: Add Stage 3 Content And BulletML Patterns

**Files:**
- Create: `src/game/content/stage3.ts`
- Create: `src/game/content/stage3.test.ts`
- Modify: `src/game/content/battleStage.ts`

- [ ] **Step 1: Write failing Stage 3 tests**

Create `src/game/content/stage3.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { createStage3Definition } from './stage3'
import type {
  BossBulletPatternConfig,
  BulletmlPatternConfig,
  StageDefinition,
} from '../types'

function isScriptedPattern(
  pattern: BossBulletPatternConfig,
): pattern is BulletmlPatternConfig {
  return 'engine' in pattern && pattern.engine === 'bulletml'
}

function getSpawnedWaves(stage: StageDefinition) {
  return stage.events.flatMap((event) =>
    event.actions.flatMap((action) => (action.type === 'spawnWave' ? [action.wave] : [])),
  )
}

function getBossFromStage(stage: StageDefinition, role: 'midboss' | 'final') {
  const action = stage.events
    .flatMap((event) => event.actions)
    .find((candidate) => candidate.type === 'spawnBoss' && candidate.role === role)

  if (!action || action.type !== 'spawnBoss') {
    throw new Error(`missing ${role} boss`)
  }

  return action.boss
}

describe('createStage3Definition', () => {
  it('defines Abyssal Biomech Trench metadata and abyssal waves', () => {
    const stage = createStage3Definition('normal')
    const waves = getSpawnedWaves(stage)

    expect(stage.id).toBe('abyssal-biomech-trench')
    expect(stage.stageNumber).toBe(3)
    expect(stage.backgroundTheme).toBe('abyssal-biomech')
    expect(stage.name).toBe('Abyssal Biomech Trench')
    expect(stage.lore).toContain('심해')
    expect(waves).toHaveLength(14)
    expect(waves.every((wave) => wave.variant.startsWith('abyssal-biomech-'))).toBe(true)
    expect(new Set(waves.map((wave) => wave.archetype))).toEqual(
      new Set(['scout', 'sentinel', 'lancer', 'splitter', 'mine-layer', 'weaver']),
    )
  })

  it('gates second-half waves and the final boss after the midboss', () => {
    const stage = createStage3Definition('normal')
    const wave8Event = stage.events.find((event) => event.id === 'wave-8-event')
    const finalBossEvent = stage.events.find(
      (event) => event.id === 'boss-abyssal-leviathan-core-spawn',
    )

    expect(stage.events.find((event) => event.id === 'midboss-pressure-lure-spawn')?.trigger).toEqual({
      type: 'time',
      at: 44,
    })
    expect(wave8Event?.trigger).toEqual({
      type: 'timeAfterDefeated',
      at: 52,
      target: 'midboss-pressure-lure',
      delay: 8,
    })
    expect(finalBossEvent?.trigger).toEqual({
      type: 'timeAfterDefeated',
      at: 96,
      target: 'midboss-pressure-lure',
      delay: 52,
    })
  })

  it('defines two midboss phases and four final boss phases with Stage 3 phase breaks', () => {
    const stage = createStage3Definition('normal')
    const midboss = getBossFromStage(stage, 'midboss')
    const boss = getBossFromStage(stage, 'final')

    expect(midboss.phaseBreakDuration).toBe(3)
    expect(midboss.phases.map((phase) => phase.threshold)).toEqual([0.5, 0])
    expect(boss.phaseBreakDuration).toBe(3)
    expect(boss.phases.map((phase) => phase.threshold)).toEqual([0.75, 0.5, 0.25, 0])
    expect(midboss.phases.slice(1).every((phase) => isScriptedPattern(phase.pattern))).toBe(true)
    expect(boss.phases.every((phase) => isScriptedPattern(phase.pattern))).toBe(true)
  })

  it('scales timing for fast stages', () => {
    const regular = createStage3Definition('normal')
    const fast = createStage3Definition('normal', { fastStage: true })

    expect(fast.duration).toBeCloseTo((regular.duration ?? 0) * 0.22)
    expect(fast.events.find((event) => event.id === 'midboss-pressure-lure-spawn')?.trigger).toEqual({
      type: 'time',
      at: 9.68,
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/game/content/stage3.test.ts
```

Expected: FAIL because `stage3.ts`, `phaseBreakDuration`, and abyssal variants do not exist yet.

- [ ] **Step 3: Add phase break field to boss type**

In `src/game/types.ts`, add an optional field:

```ts
export type BossDefinition = {
  id: string
  hp: number
  phaseBreakDuration?: number
  phases: BossPhaseDefinition[]
}
```

- [ ] **Step 4: Create Stage 3 data**

Create `src/game/content/stage3.ts` using the same helper style as `stage2.ts`. Use these constants:

```ts
const midbossAt = 44
const finalBossAt = 96
const fastStageMultiplier = 0.22
const rankExpression = { type: 'rank' } satisfies BulletmlExpression
```

Use these base placements:

```ts
const baseWavePlacements = [
  { id: 'wave-1', at: 2, archetype: 'scout', variant: 'abyssal-biomech-scout', count: 18, spacing: 0.34 },
  { id: 'wave-2', at: 8.4, archetype: 'sentinel', variant: 'abyssal-biomech-sentinel', count: 16, spacing: 0.38 },
  { id: 'wave-3', at: 14.8, archetype: 'lancer', variant: 'abyssal-biomech-lancer', count: 18, spacing: 0.34 },
  { id: 'wave-4', at: 21.2, archetype: 'splitter', variant: 'abyssal-biomech-splitter', count: 20, spacing: 0.3 },
  { id: 'wave-5', at: 27.6, archetype: 'mine-layer', variant: 'abyssal-biomech-mine-layer', count: 20, spacing: 0.3 },
  { id: 'wave-6', at: 34, archetype: 'weaver', variant: 'abyssal-biomech-weaver', count: 20, spacing: 0.3 },
  { id: 'wave-7', at: 40.4, archetype: 'scout', variant: 'abyssal-biomech-scout', count: 24, spacing: 0.26 },
  { id: 'wave-8', at: 52, archetype: 'weaver', variant: 'abyssal-biomech-weaver', count: 24, spacing: 0.25 },
  { id: 'wave-9', at: 58.4, archetype: 'lancer', variant: 'abyssal-biomech-lancer', count: 20, spacing: 0.3 },
  { id: 'wave-10', at: 64.8, archetype: 'splitter', variant: 'abyssal-biomech-splitter', count: 22, spacing: 0.28 },
  { id: 'wave-11', at: 71.2, archetype: 'mine-layer', variant: 'abyssal-biomech-mine-layer', count: 22, spacing: 0.28 },
  { id: 'wave-12', at: 77.6, archetype: 'sentinel', variant: 'abyssal-biomech-sentinel', count: 18, spacing: 0.34 },
  { id: 'wave-13', at: 84, archetype: 'weaver', variant: 'abyssal-biomech-weaver', count: 24, spacing: 0.25 },
  { id: 'wave-14', at: 90.4, archetype: 'scout', variant: 'abyssal-biomech-scout', count: 28, spacing: 0.22 },
] as const
```

Implement helper expressions:

```ts
function add(left: BulletmlExpression, right: BulletmlExpression): BulletmlExpression {
  return { type: 'add', left, right }
}

function sub(left: BulletmlExpression, right: BulletmlExpression): BulletmlExpression {
  return { type: 'sub', left, right }
}

function mul(left: BulletmlExpression, right: BulletmlExpression): BulletmlExpression {
  return { type: 'mul', left, right }
}

function rankScale(base: number, factor: number) {
  return add(base, mul(rankExpression, factor))
}

function rankWait(base: number, reduction: number) {
  return sub(base, mul(rankExpression, reduction))
}
```

Author four named BulletML patterns:

```ts
const pressureBloomPattern = {
  engine: 'bulletml',
  interval: 0.68,
  loop: true,
  bullet: { radius: 0.092, glow: 1.48, life: 8.8 },
  action: [
    {
      type: 'repeat',
      times: rankScale(56, 34),
      actions: [
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: rankScale(32, 5) },
          speed: { type: 'absolute', value: rankScale(0.72, 0.38) },
          actions: [
            { type: 'wait', seconds: 0.44 },
            { type: 'changeSpeed', speed: { type: 'absolute', value: rankScale(1.32, 0.46) }, term: 0.42 },
          ],
        },
        { type: 'wait', seconds: rankWait(0.11, 0.03) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig
```

Add the remaining named patterns:

```ts
const currentLanePattern = {
  engine: 'bulletml',
  interval: 0.62,
  loop: true,
  bullet: { radius: 0.088, glow: 1.4, life: 9 },
  action: [
    {
      type: 'repeat',
      times: rankScale(60, 38),
      actions: [
        {
          type: 'fire',
          direction: { type: 'aim', degrees: -28 },
          speed: { type: 'absolute', value: rankScale(0.92, 0.4) },
          actions: [
            { type: 'wait', seconds: 0.36 },
            { type: 'changeDirection', direction: { type: 'relative', degrees: 18 }, term: 0.48 },
          ],
        },
        {
          type: 'fire',
          direction: { type: 'aim', degrees: 28 },
          speed: { type: 'absolute', value: rankScale(0.92, 0.4) },
          actions: [
            { type: 'wait', seconds: 0.36 },
            { type: 'changeDirection', direction: { type: 'relative', degrees: -18 }, term: 0.48 },
          ],
        },
        { type: 'wait', seconds: rankWait(0.12, 0.03) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const mineBloomPattern = {
  engine: 'bulletml',
  interval: 0.7,
  loop: true,
  bullet: { radius: 0.105, glow: 1.58, life: 8.8 },
  action: [
    {
      type: 'repeat',
      times: rankScale(44, 28),
      actions: [
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: rankScale(45, 6) },
          speed: { type: 'absolute', value: rankScale(0.58, 0.28) },
          actions: [
            { type: 'wait', seconds: 0.62 },
            {
              type: 'repeat',
              times: 3,
              actions: [
                {
                  type: 'fire',
                  direction: { type: 'sequence', degrees: 34 },
                  speed: { type: 'relative', value: rankScale(0.42, 0.16) },
                  radius: 0.078,
                  glow: 1.36,
                  life: 4.2,
                },
              ],
            },
            { type: 'vanish' },
          ],
        },
        { type: 'wait', seconds: rankWait(0.16, 0.04) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig

const leviathanCollapsePattern = {
  engine: 'bulletml',
  interval: 0.54,
  loop: true,
  bullet: { radius: 0.098, glow: 1.68, life: 9.4 },
  action: [
    {
      type: 'repeat',
      times: rankScale(80, 48),
      actions: [
        {
          type: 'fire',
          direction: { type: 'sequence', degrees: rankScale(27, 5) },
          speed: { type: 'absolute', value: rankScale(0.76, 0.38) },
          actions: [
            { type: 'wait', seconds: 0.4 },
            { type: 'changeDirection', direction: { type: 'relative', degrees: -36 }, term: 0.5 },
            { type: 'changeSpeed', speed: { type: 'relative', value: rankScale(0.34, 0.18) }, term: 0.48 },
          ],
        },
        {
          type: 'fire',
          direction: { type: 'aim', degrees: 0 },
          speed: { type: 'absolute', value: rankScale(1.0, 0.34) },
          radius: 0.082,
          glow: 1.46,
          life: 5.8,
        },
        { type: 'wait', seconds: rankWait(0.1, 0.025) },
      ],
    },
  ],
} satisfies BulletmlPatternConfig
```

These waits stay above `0.06` at normal rank and keep aimed pressure limited to one layer.

Create bosses:

```ts
const baseMidboss: BossDefinition = {
  id: 'midboss-pressure-lure',
  hp: 980,
  phaseBreakDuration: 3,
  phases: [
    {
      id: 'phase-1',
      threshold: 0.5,
      label: 'Midboss · Pressure Lure',
      supportLaser: false,
      pattern: { shape: 'wave', count: 7, interval: 1.0, speed: 1.08, spread: 1.25, life: 8.4, wave: { amplitude: 0.58, frequency: 2.6 } },
    },
    {
      id: 'phase-2',
      threshold: 0,
      label: 'Midboss · Bloom Current',
      supportLaser: false,
      pattern: pressureBloomPattern,
    },
  ],
}

const baseBoss: BossDefinition = {
  id: 'boss-abyssal-leviathan-core',
  hp: 2300,
  phaseBreakDuration: 3,
  phases: [
    { id: 'phase-1', threshold: 0.75, label: 'Phase 1 · Pressure Ring', supportLaser: false, pattern: pressureBloomPattern },
    { id: 'phase-2', threshold: 0.5, label: 'Phase 2 · Current Lanes', supportLaser: false, pattern: currentLanePattern },
    { id: 'phase-3', threshold: 0.25, label: 'Phase 3 · Mine Bloom', supportLaser: false, pattern: mineBloomPattern },
    { id: 'phase-4', threshold: 0, label: 'Phase 4 · Leviathan Collapse', supportLaser: true, pattern: leviathanCollapsePattern },
  ],
}
```

Build events by slicing the first seven waves before the midboss and the remaining seven after it, mirroring `stage2.ts`.

- [ ] **Step 5: Route stage 3 stage definitions**

In `src/game/content/battleStage.ts`, update:

```ts
import { createStageDefinition as createStage1Definition } from './stage1'
import { createStage2Definition } from './stage2'
import { createStage3Definition } from './stage3'
import type { Difficulty, StageDefinition } from '../types'

export function createBattleStageDefinition(
  stageNumber: number,
  difficulty: Difficulty,
  options?: { fastStage?: boolean },
): StageDefinition {
  if (stageNumber === 1) {
    return createStage1Definition(difficulty, options)
  }

  if (stageNumber === 2) {
    return createStage2Definition(difficulty, options)
  }

  return createStage3Definition(difficulty, options)
}
```

- [ ] **Step 6: Run Stage 3 tests**

Run:

```bash
npm test -- src/game/content/stage3.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/game/types.ts src/game/content/stage3.ts src/game/content/stage3.test.ts src/game/content/battleStage.ts
git commit -m "Add stage 3 abyssal biomech content"
```

---

### Task 4: Generate And Register Stage 3 Assets

**Files:**
- Create: `src/assets/generated/backgrounds/abyssal-biomech/stage3-trench-floor.png`
- Create: `src/assets/generated/backgrounds/abyssal-biomech/stage3-pressure-layer.png`
- Create: `src/assets/generated/enemies/abyssal/*.png`
- Create: `src/assets/generated/enemies/enemy-abyssal-biomech-atlas.webp`
- Create: `src/assets/generated/bosses/stage3-midboss-core.png`
- Create: `src/assets/generated/bosses/stage3-boss-core.png`
- Modify: `scripts/pack-enemy-atlas.mjs`
- Modify: `scripts/optimize-runtime-assets.mjs`
- Modify: `src/game/assets.ts`
- Modify: `src/game/assets.test.ts`

- [ ] **Step 1: Generate image assets with built-in imagegen**

Use built-in `imagegen` calls with these prompts, one asset at a time:

```text
Use case: stylized-concept
Asset type: browser danmaku game enemy sprite, isolated game asset
Primary request: abyssal biomech scout enemy, small agile deep-sea mechanical organism with bioluminescent lure core
Style/medium: polished 2D game sprite concept, clean silhouette
Composition/framing: centered full body, generous padding, no crop
Lighting/mood: dark deep sea with cyan and teal bioluminescent accents
Constraints: no text, no watermark, readable at small size, no background detail
Avoid: humanoid, cute mascot, photoreal fish, gore
```

Repeat with subject lines for `sentinel`, `lancer`, `splitter`, `mine-layer`, and `weaver`.

Use these two background prompts:

```text
Use case: stylized-concept
Asset type: vertical scrolling browser game background layer
Primary request: abyssal biomech trench floor, deep ocean pressure canyon with mechanical ribs, dark water, subtle cyan bioluminescence
Style/medium: painterly game background, tile-friendly vertical layer
Composition/framing: top-down/angled battle backdrop, no horizon, no characters
Constraints: no text, no watermark, readable behind bullets, low contrast center lane
```

```text
Use case: stylized-concept
Asset type: transparent-feeling overlay background layer
Primary request: drifting deep-sea pressure haze with faint biomechanical plankton lights and current streaks
Style/medium: soft game VFX layer
Composition/framing: full-frame texture, no focal character
Constraints: no text, no watermark, dark transparent-looking edges
```

Use these boss prompts:

```text
Use case: stylized-concept
Asset type: browser danmaku game midboss sprite
Primary request: abyssal biomech pressure lure midboss, compact deep-sea machine organism with a bright lure core, plated shell, tendril fins
Style/medium: polished 2D boss sprite concept, strong silhouette
Composition/framing: centered full body, generous padding
Constraints: no text, no watermark, distinct from final boss, readable at 256px
```

```text
Use case: stylized-concept
Asset type: browser danmaku game final boss sprite
Primary request: abyssal biomech leviathan core final boss, massive deep-sea mechanical organism with pressure armor, luminous eyes, valve-like shell plates, tendril arrays
Style/medium: polished 2D boss sprite concept, dramatic but readable silhouette
Composition/framing: centered full body, generous padding, boss-facing-down perspective
Constraints: no text, no watermark, larger and more imposing than midboss
```

Move selected outputs into the exact PNG paths listed in this task. Do not leave project-referenced files under `$CODEX_HOME/generated_images`.

- [ ] **Step 2: Update atlas packer**

Change `scripts/pack-enemy-atlas.mjs` to pack both themes:

```js
const themes = [
  {
    sourceDir: path.join(root, 'src/assets/generated/enemies/brass-cloud'),
    outPath: path.join(root, 'src/assets/generated/enemies/enemy-brass-cloud-atlas.webp'),
  },
  {
    sourceDir: path.join(root, 'src/assets/generated/enemies/abyssal'),
    outPath: path.join(root, 'src/assets/generated/enemies/enemy-abyssal-biomech-atlas.webp'),
  },
]

for (const theme of themes) {
  await packTheme(theme)
}
```

Extract the existing single-theme body into:

```js
async function packTheme({ sourceDir, outPath }) {
  const frames = ['scout', 'sentinel', 'lancer', 'splitter', 'mine-layer', 'weaver']
  const frameSize = 192
  const columns = 3
  const rows = 2
  const composites = []

  for (const [index, frame] of frames.entries()) {
    const input = await sharp(path.join(sourceDir, `${frame}.png`))
      .resize(frameSize, frameSize, { fit: 'contain' })
      .png()
      .toBuffer()

    composites.push({
      input,
      left: (index % columns) * frameSize,
      top: Math.floor(index / columns) * frameSize,
    })
  }

  await sharp({
    create: {
      width: frameSize * columns,
      height: frameSize * rows,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .webp({ quality: 76, alphaQuality: 84, effort: 5 })
    .toFile(outPath)
}
```

- [ ] **Step 3: Update runtime optimizer**

Add entries to `scripts/optimize-runtime-assets.mjs`:

```js
{
  source: 'backgrounds/abyssal-biomech/stage3-trench-floor.png',
  output: 'backgrounds/abyssal-biomech/stage3-trench-floor.webp',
  width: 1536,
},
{
  source: 'backgrounds/abyssal-biomech/stage3-pressure-layer.png',
  output: 'backgrounds/abyssal-biomech/stage3-pressure-layer.webp',
  width: 1536,
},
{
  source: 'bosses/stage3-midboss-core.png',
  output: 'bosses/stage3-midboss-core.webp',
  width: 512,
},
{
  source: 'bosses/stage3-boss-core.png',
  output: 'bosses/stage3-boss-core.webp',
  width: 768,
},
```

- [ ] **Step 4: Generate WebP outputs**

Run:

```bash
node scripts/pack-enemy-atlas.mjs
node scripts/optimize-runtime-assets.mjs
```

Expected: WebP files exist at:

```text
src/assets/generated/enemies/enemy-abyssal-biomech-atlas.webp
src/assets/generated/backgrounds/abyssal-biomech/stage3-trench-floor.webp
src/assets/generated/backgrounds/abyssal-biomech/stage3-pressure-layer.webp
src/assets/generated/bosses/stage3-midboss-core.webp
src/assets/generated/bosses/stage3-boss-core.webp
```

- [ ] **Step 5: Register assets**

In `src/game/assets.ts`, add imports:

```ts
import stage3TrenchFloorUrl from '../assets/generated/backgrounds/abyssal-biomech/stage3-trench-floor.webp'
import stage3PressureLayerUrl from '../assets/generated/backgrounds/abyssal-biomech/stage3-pressure-layer.webp'
import stage3MidbossCoreUrl from '../assets/generated/bosses/stage3-midboss-core.webp'
import stage3BossCoreUrl from '../assets/generated/bosses/stage3-boss-core.webp'
import enemyAbyssalBiomechAtlasUrl from '../assets/generated/enemies/enemy-abyssal-biomech-atlas.webp'
```

Add keys to `gameAssets`:

```ts
enemyAbyssalBiomechAtlasUrl,
stage3BossCoreUrl,
stage3MidbossCoreUrl,
stage3PressureLayerUrl,
stage3TrenchFloorUrl,
```

- [ ] **Step 6: Add asset registry tests**

In `src/game/assets.test.ts`, add:

```ts
it('registers stage 3 abyssal biomech runtime assets', () => {
  expect(gameAssets.stage3TrenchFloorUrl).toMatch(/backgrounds\/abyssal-biomech\/stage3-trench-floor/)
  expect(gameAssets.stage3PressureLayerUrl).toMatch(/backgrounds\/abyssal-biomech\/stage3-pressure-layer/)
  expect(gameAssets.enemyAbyssalBiomechAtlasUrl).toMatch(/enemies\/enemy-abyssal-biomech-atlas/)
  expect(gameAssets.stage3MidbossCoreUrl).toMatch(/bosses\/stage3-midboss-core/)
  expect(gameAssets.stage3BossCoreUrl).toMatch(/bosses\/stage3-boss-core/)
})
```

- [ ] **Step 7: Run asset tests**

Run:

```bash
npm test -- src/game/assets.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add scripts/pack-enemy-atlas.mjs scripts/optimize-runtime-assets.mjs src/game/assets.ts src/game/assets.test.ts src/assets/generated/backgrounds/abyssal-biomech src/assets/generated/enemies/abyssal src/assets/generated/enemies/enemy-abyssal-biomech-atlas.webp src/assets/generated/bosses/stage3-midboss-core.png src/assets/generated/bosses/stage3-midboss-core.webp src/assets/generated/bosses/stage3-boss-core.png src/assets/generated/bosses/stage3-boss-core.webp
git commit -m "Add stage 3 abyssal assets"
```

---

### Task 5: Add Stage 3 Presentation And Preload Wiring

**Files:**
- Modify: `src/app/battleAssetPreload.ts`
- Modify: `src/app/battleAssetPreload.test.ts`
- Modify: `src/game/ui/battleBackground.tsx`
- Modify: `src/game/ui/sceneConfig.ts`
- Modify: `src/game/ui/BattleView.test.ts`
- Modify: `src/game/ui/battleEntities.tsx`

- [ ] **Step 1: Write failing preload and UI tests**

In `src/app/battleAssetPreload.test.ts`, add:

```ts
it('preloads stage 3 abyssal biomech assets', () => {
  const items = getBattleAssetPreloadItems({
    stage: createStage3Definition('normal'),
    character: characters[0]!,
  })
  const urls = items.map((item) => item.url)

  expect(urls.some((url) => url.includes('/enemies/enemy-abyssal-biomech-atlas'))).toBe(true)
  expect(urls.some((url) => url.includes('/backgrounds/abyssal-biomech/stage3-trench-floor'))).toBe(true)
  expect(urls.some((url) => url.includes('/backgrounds/abyssal-biomech/stage3-pressure-layer'))).toBe(true)
  expect(urls.some((url) => url.includes('/bosses/stage3-midboss-core'))).toBe(true)
  expect(urls.some((url) => url.includes('/bosses/stage3-boss-core'))).toBe(true)
})
```

In `src/game/ui/BattleView.test.ts`, add:

```ts
it('returns only abyssal biomech textures for Stage 3', () => {
  const textures = getBackgroundTextureUrls(createStage3Definition('normal'))

  expect(textures).toEqual({
    abyssalFloor: gameAssets.stage3TrenchFloorUrl,
    abyssalPressure: gameAssets.stage3PressureLayerUrl,
  })
})

it('uses Stage 3 boss textures by event-owned boss role', () => {
  const stage = createStage3Definition('normal')
  const midboss = getBossFromStage(stage, 'midboss')
  const finalBoss = getBossFromStage(stage, 'final')

  expect(getBossCoreTextureUrl(stage, { id: midboss.id })).toBe(gameAssets.stage3MidbossCoreUrl)
  expect(getBossCoreTextureUrl(stage, { id: finalBoss.id })).toBe(gameAssets.stage3BossCoreUrl)
})

it('uses the Stage 3 enemy atlas for abyssal enemies', () => {
  expect(getEnemyAtlasTextureUrl('enemy-abyssal-biomech')).toBe(
    gameAssets.enemyAbyssalBiomechAtlasUrl,
  )
  expect(getEnemyAtlasTextureUrl('enemy-brass-cloud')).toBe(gameAssets.enemyBrassCloudAtlasUrl)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/app/battleAssetPreload.test.ts src/game/ui/BattleView.test.ts
```

Expected: FAIL because Stage 3 asset routing is not wired.

- [ ] **Step 3: Add Stage 3 preload branch**

In `src/app/battleAssetPreload.ts`, make the enemy atlas stage-aware:

```ts
const enemyAtlasUrl =
  stage.backgroundTheme === 'abyssal-biomech'
    ? gameAssets.enemyAbyssalBiomechAtlasUrl
    : gameAssets.enemyBrassCloudAtlasUrl
```

Use `enemyAtlasUrl` in the common `enemy-atlas` item.

Replace the current binary `stageItems` with:

```ts
const stageItems =
  stage.backgroundTheme === 'abyssal-biomech'
    ? [
        { id: 'stage3-trench-floor', label: 'Abyssal trench floor', url: gameAssets.stage3TrenchFloorUrl },
        { id: 'stage3-pressure-layer', label: 'Abyssal pressure layer', url: gameAssets.stage3PressureLayerUrl },
        { id: 'stage3-midboss-core', label: 'Pressure Lure core', url: gameAssets.stage3MidbossCoreUrl },
        { id: 'stage3-boss-core', label: 'Abyssal Leviathan core', url: gameAssets.stage3BossCoreUrl },
      ]
    : stage.backgroundTheme === 'burning-ruins'
      ? [
          { id: 'stage2-ruin-floor', label: 'Burning ruins floor', url: gameAssets.stage2RuinFloorUrl },
          { id: 'stage2-smoke-layer', label: 'Burning ruins smoke', url: gameAssets.stage2SmokeLayerUrl },
          { id: 'stage2-midboss-core', label: 'Ember Gate core', url: gameAssets.stage2MidbossCoreUrl },
          { id: 'stage2-boss-core', label: 'Ash Citadel core', url: gameAssets.stage2BossCoreUrl },
        ]
      : [
          { id: 'cloud-layer-a', label: 'Brass cloud layer A', url: gameAssets.cloudLayerAUrl },
          { id: 'cloud-layer-b', label: 'Brass cloud layer B', url: gameAssets.cloudLayerBUrl },
          { id: 'boss-core', label: 'Brass boss core', url: gameAssets.bossCoreUrl },
        ]
```

- [ ] **Step 4: Add background config**

In `src/game/ui/sceneConfig.ts`, extend:

```ts
export type BackgroundTextureKey =
  | 'a'
  | 'b'
  | 'stage2Smoke'
  | 'ruinFloor'
  | 'abyssalFloor'
  | 'abyssalPressure'
```

Add `abyssal-biomech` to `stageBackgroundMotionConfigs`:

```ts
'abyssal-biomech': {
  floorLayers: [
    {
      textureKey: 'abyssalFloor',
      x: -0.12,
      startY: 0.85,
      z: -1.96,
      width: 8.6,
      height: 5.7,
      opacity: 0.54,
      speed: 0.36,
      spacing: 5.55,
      rotation: -0.02,
      sway: 0.04,
    },
    {
      textureKey: 'abyssalFloor',
      x: 0.22,
      startY: 3.9,
      z: -2.02,
      width: 9.0,
      height: 5.9,
      opacity: 0.42,
      speed: 0.48,
      spacing: 5.75,
      rotation: 0.035,
      sway: 0.045,
    },
  ],
  cloudLayers: [
    {
      textureKey: 'abyssalPressure',
      x: -0.18,
      startY: 1.3,
      z: -1.62,
      width: 9.6,
      height: 4.9,
      opacity: 0.24,
      speed: 0.28,
      spacing: 5.05,
      rotation: -0.05,
      sway: 0.12,
    },
    {
      textureKey: 'abyssalPressure',
      x: 0.24,
      startY: 2.85,
      z: -1.44,
      width: 10.4,
      height: 5.1,
      opacity: 0.17,
      speed: 0.44,
      spacing: 5.3,
      rotation: 0.045,
      sway: 0.16,
    },
  ],
  fixtures: [
    { x: -2.7, y: 3.15, z: -1.08, scale: 0.5, speed: 0.72, spin: 0.22, phase: 0.4, ringColor: '#1fc7c2', crossColor: '#5eead4', coreColor: '#b6fff7', ringOpacity: 0.22, crossOpacity: 0.16, coreOpacity: 0.12 },
    { x: 2.45, y: 1.2, z: -1.0, scale: 0.44, speed: 0.66, spin: -0.2, phase: 1.6, ringColor: '#147d93', crossColor: '#67e8f9', coreColor: '#d7fffb', ringOpacity: 0.22, crossOpacity: 0.16, coreOpacity: 0.1 },
  ],
}
```

- [ ] **Step 5: Make enemy rendering atlas-aware**

In `src/game/ui/battleEntities.tsx`, import the new atlas maps:

```ts
import {
  enemyAtlasFramesById,
  enemyAtlasSizeById,
  type AtlasFrame,
} from '../content/enemyAtlasFrames'
```

Change `getAtlasFrameUv`:

```ts
export function getAtlasFrameUv(frame: AtlasFrame, atlasId: RenderEnemy['atlasId']) {
  const atlasSize = enemyAtlasSizeById[atlasId]
  const uvScale = new THREE.Vector2(frame.w / atlasSize.width, frame.h / atlasSize.height)
  const uvOffset = new THREE.Vector2(
    frame.x / atlasSize.width,
    1 - (frame.y + frame.h) / atlasSize.height,
  )

  return { uvScale, uvOffset }
}
```

Add this exported helper:

```ts
export function getEnemyAtlasTextureUrl(atlasId: RenderEnemy['atlasId']) {
  return atlasId === 'enemy-abyssal-biomech'
    ? gameAssets.enemyAbyssalBiomechAtlasUrl
    : gameAssets.enemyBrassCloudAtlasUrl
}
```

Update `EnemySprite`:

```ts
function EnemySprite({
  enemyTexture,
  atlasId,
  frameId,
  hitFlashRatio,
  position,
  scale,
}: {
  enemyTexture: THREE.Texture | null
  atlasId: RenderEnemy['atlasId']
  frameId: RenderEnemy['frameId']
  hitFlashRatio: number
  position: [number, number, number]
  scale: number
}) {
  const atlasUv = useMemo(
    () => getAtlasFrameUv(enemyAtlasFramesById[atlasId][frameId], atlasId),
    [atlasId, frameId],
  )
  const flashOpacity = Math.min(0.72, Math.max(0, hitFlashRatio) * 0.72)

  return enemyTexture ? (
    <group position={position}>
      <mesh>
        <planeGeometry args={[scale, scale]} />
        <RestoredTextureMaterial
          texture={enemyTexture}
          uvScale={atlasUv.uvScale}
          uvOffset={atlasUv.uvOffset}
        />
      </mesh>
      {flashOpacity > 0 ? (
        <mesh position={[0, 0, 0.018]}>
          <planeGeometry args={[scale, scale]} />
          <RestoredTextureMaterial
            texture={enemyTexture}
            opacity={flashOpacity}
            exposure={1}
            saturation={1}
            contrast={1}
            tintColor="#ff2a2a"
            tintStrength={1}
            uvScale={atlasUv.uvScale}
            uvOffset={atlasUv.uvOffset}
          />
        </mesh>
      ) : null}
    </group>
  ) : (
    <group position={position}>
      <mesh>
        <circleGeometry args={[0.36, 32]} />
        <meshBasicMaterial color="#ffbe62" toneMapped={false} />
      </mesh>
      {flashOpacity > 0 ? (
        <mesh position={[0, 0, 0.018]}>
          <circleGeometry args={[0.38, 32]} />
          <meshBasicMaterial
            color="#ff2828"
            transparent
            opacity={flashOpacity}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}
    </group>
  )
}
```

In `RuntimeEntityLayer`, load the atlas textures by atlas id:

```ts
const brassEnemyTexture = useLoadedTexture(gameAssets.enemyBrassCloudAtlasUrl)
const abyssalEnemyTexture = useLoadedTexture(gameAssets.enemyAbyssalBiomechAtlasUrl)
const enemyTextureByAtlasId = {
  'enemy-brass-cloud': brassEnemyTexture,
  'enemy-abyssal-biomech': abyssalEnemyTexture,
} satisfies Record<RenderEnemy['atlasId'], THREE.Texture | null>
```

Pass the atlas-specific texture:

```tsx
<EnemySprite
  key={enemy.id}
  enemyTexture={enemyTextureByAtlasId[enemy.atlasId]}
  atlasId={enemy.atlasId}
  frameId={enemy.frameId}
  hitFlashRatio={enemy.hitFlashRatio}
  position={arenaPointToView(enemy.position, 0.7)}
  scale={enemy.scale}
/>
```

- [ ] **Step 6: Route background and boss textures**

In `src/game/ui/battleBackground.tsx`, add:

```ts
if (stage.backgroundTheme === 'abyssal-biomech') {
  return {
    abyssalFloor: gameAssets.stage3TrenchFloorUrl,
    abyssalPressure: gameAssets.stage3PressureLayerUrl,
  }
}
```

In `src/game/ui/battleEntities.tsx`, add Stage 3 boss texture cases before the fallback:

```ts
if (
  boss &&
  eventMidbosses.some((definition) => definition.id === boss.id) &&
  stage.backgroundTheme === 'abyssal-biomech'
) {
  return gameAssets.stage3MidbossCoreUrl
}

if (
  boss &&
  eventFinalBosses.some((definition) => definition.id === boss.id) &&
  stage.backgroundTheme === 'abyssal-biomech'
) {
  return gameAssets.stage3BossCoreUrl
}
```

- [ ] **Step 7: Run targeted tests**

Run:

```bash
npm test -- src/app/battleAssetPreload.test.ts src/game/ui/BattleView.test.ts src/game/ui/sceneConfig.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/battleAssetPreload.ts src/app/battleAssetPreload.test.ts src/game/ui/battleBackground.tsx src/game/ui/sceneConfig.ts src/game/ui/BattleView.test.ts src/game/ui/battleEntities.tsx
git commit -m "Wire stage 3 presentation assets"
```

---

### Task 6: Implement Stage 3 Phase Break Runtime

**Files:**
- Modify: `src/game/runtime/fsm/bossFsmTypes.ts`
- Modify: `src/game/runtime/fsm/bossFsm.ts`
- Modify: `src/game/runtime/fsm/bossFsm.test.ts`
- Modify: `src/game/runtime/battleRuntime.ts`
- Modify: `src/game/runtime/battleRuntime.test.ts`

- [ ] **Step 1: Write failing FSM test**

In `src/game/runtime/fsm/bossFsm.test.ts`, add:

```ts
it('uses per-boss phase break duration to hold invulnerability and idle fire', () => {
  const actor = createBossFsmActor()
  const opening = {
    id: 'opening',
    threshold: 0.5,
    label: 'Opening',
    supportLaser: false,
    pattern: { shape: 'fan', count: 3, interval: 1, speed: 1, spread: 1, life: 5 },
  } satisfies BossPhaseDefinition
  const bloom = {
    ...opening,
    id: 'bloom',
    label: 'Bloom',
    threshold: 0,
  } satisfies BossPhaseDefinition

  sendBossFsmTick(actor, {
    elapsedInBoss: 1,
    delta: 0.1,
    hpRatio: 1,
    phase: opening,
    phaseIndex: 0,
    phaseCount: 2,
    bossX: 0,
    playerX: 0,
    defeated: false,
    phaseBreakDuration: 3,
  })
  sendBossFsmTick(actor, {
    elapsedInBoss: 2,
    delta: 0.1,
    hpRatio: 0.45,
    phase: bloom,
    phaseIndex: 1,
    phaseCount: 2,
    bossX: 0,
    playerX: 0,
    defeated: false,
    phaseBreakDuration: 3,
  })

  expect(getBossFsmSnapshot(actor)).toEqual(
    expect.objectContaining({
      phase: 'Break',
      phaseId: 'bloom',
      firePattern: 'Idle',
      vulnerability: 'Invulnerable',
    }),
  )

  sendBossFsmTick(actor, {
    elapsedInBoss: 4.9,
    delta: 2.9,
    hpRatio: 0.45,
    phase: bloom,
    phaseIndex: 1,
    phaseCount: 2,
    bossX: 0,
    playerX: 0,
    defeated: false,
    phaseBreakDuration: 3,
  })

  expect(getBossFsmSnapshot(actor).vulnerability).toBe('Invulnerable')

  sendBossFsmTick(actor, {
    elapsedInBoss: 5.1,
    delta: 0.2,
    hpRatio: 0.45,
    phase: bloom,
    phaseIndex: 1,
    phaseCount: 2,
    bossX: 0,
    playerX: 0,
    defeated: false,
    phaseBreakDuration: 3,
  })

  expect(getBossFsmSnapshot(actor).vulnerability).toBe('Vulnerable')
  expect(getBossFsmSnapshot(actor).firePattern).not.toBe('Idle')
})
```

- [ ] **Step 2: Run FSM test to verify it fails**

Run:

```bash
npm test -- src/game/runtime/fsm/bossFsm.test.ts
```

Expected: FAIL because `phaseBreakDuration` is not part of the update and current break duration is `0.42`.

- [ ] **Step 3: Add phase break duration to FSM update**

In `src/game/runtime/fsm/bossFsmTypes.ts`, add:

```ts
phaseBreakDuration?: number
```

to `BossFsmUpdate`.

In `src/game/runtime/fsm/bossFsm.ts`, change:

```ts
const armorBreakDuration = update.phaseBreakDuration ?? bossFsmTiming.armorBreakDuration
const armorBreakFor = phaseChanged
  ? armorBreakDuration
  : Math.max(0, current.armorBreakFor - update.delta)
```

- [ ] **Step 4: Pass boss-specific timing from runtime**

In `src/game/runtime/battleRuntime.ts`, update `sendBossFsmTick` calls:

```ts
sendBossFsmTick(boss.fsm, {
  elapsedInBoss: elapsed - boss.spawnedAt,
  delta,
  hpRatio: boss.hp / boss.maxHp,
  phase,
  phaseIndex,
  phaseCount: boss.definition.phases.length,
  bossX: boss.x,
  playerX: player.x,
  defeated: boss.hp <= 0,
  phaseBreakDuration: boss.definition.phaseBreakDuration,
})
```

- [ ] **Step 5: Write runtime test for no firing during Stage 3 break**

In `src/game/runtime/battleRuntime.test.ts`, add a focused test near boss FSM tests:

```ts
it('pauses Stage 3 boss firing during the 3 second phase break', () => {
  const stage = createStage3Definition('normal', { fastStage: true })
  const baseBoss = getBossFromStage(stage, 'final')
  const boss = {
    ...baseBoss,
    hp: 120,
    phases: baseBoss.phases.map((phase) => ({
      ...phase,
      pattern:
        'engine' in phase.pattern
          ? {
              ...phase.pattern,
              interval: 0.12,
              action: [
                {
                  type: 'repeat',
                  times: 1,
                  actions: [
                    {
                      type: 'fire',
                      direction: { type: 'aim', degrees: 0 },
                      speed: { type: 'absolute', value: 1 },
                    },
                    { type: 'wait', seconds: 0.08 },
                  ],
                },
              ],
            }
          : { ...phase.pattern, interval: 0.12 },
    })),
  } satisfies BossDefinition
  const testStage = {
    ...stage,
    events: [
      createBossEvent('stage3-boss-event', { type: 'time', at: 0.05 }, boss, 'final'),
    ],
  }
  const phaseBreakPilot: CharacterDefinition = {
    ...testPilot,
    id: 'phase-break-pilot',
    shot: {
      interval: 0.05,
      speed: 24,
      power: 34,
    },
  }
  const runtime = createRuntime({ stage: testStage, character: phaseBreakPilot })

  for (let index = 0; index < 10; index += 1) {
    runtime.update(0.05)
  }

  expect(runtime.getSnapshot().bosses[0]?.fsm.vulnerability).toBe('Vulnerable')

  for (let index = 0; index < 20; index += 1) {
    runtime.update(0.05)
    if (runtime.getSnapshot().bosses[0]?.fsm.phaseId === 'phase-2') {
      break
    }
  }

  expect(runtime.getSnapshot().bosses[0]?.fsm.phaseId).toBe('phase-2')
  const bulletsAtBreakStart = runtime.getSnapshot().bullets.length
  for (let index = 0; index < 56; index += 1) {
    runtime.update(0.05)
  }

  expect(runtime.getSnapshot().bosses[0]?.fsm).toEqual(
    expect.objectContaining({
      vulnerability: 'Invulnerable',
      firePattern: 'Idle',
    }),
  )
  expect(runtime.getSnapshot().bullets.length).toBe(bulletsAtBreakStart)

  for (let index = 0; index < 10; index += 1) {
    runtime.update(0.05)
  }

  expect(runtime.getSnapshot().bosses[0]?.fsm.vulnerability).toBe('Vulnerable')
})
```

This test uses existing local helpers: `createRuntime`, `getBossFromStage`, and `createBossEvent`.

- [ ] **Step 6: Confirm Stage 1/2 break remains short**

Add a second runtime or FSM assertion:

```ts
it('keeps default boss phase break timing when no boss override is set', () => {
  const actor = createBossFsmActor()
  const opening = {
    id: 'opening',
    threshold: 0.5,
    label: 'Opening',
    supportLaser: false,
    pattern: { shape: 'fan', count: 3, interval: 1, speed: 1, spread: 1, life: 5 },
  } satisfies BossPhaseDefinition
  const bloom = {
    ...opening,
    id: 'bloom',
    label: 'Bloom',
    threshold: 0,
  } satisfies BossPhaseDefinition

  sendBossFsmTick(actor, {
    elapsedInBoss: 1,
    delta: 0.1,
    hpRatio: 1,
    phase: opening,
    phaseIndex: 0,
    phaseCount: 2,
    bossX: 0,
    playerX: 0,
    defeated: false,
  })
  sendBossFsmTick(actor, {
    elapsedInBoss: 2,
    delta: 0.1,
    hpRatio: 0.45,
    phase: bloom,
    phaseIndex: 1,
    phaseCount: 2,
    bossX: 0,
    playerX: 0,
    defeated: false,
  })

  expect(getBossFsmSnapshot(actor).vulnerability).toBe('Invulnerable')

  sendBossFsmTick(actor, {
    elapsedInBoss: 2.5,
    delta: 0.5,
    hpRatio: 0.45,
    phase: bloom,
    phaseIndex: 1,
    phaseCount: 2,
    bossX: 0,
    playerX: 0,
    defeated: false,
  })

  expect(getBossFsmSnapshot(actor).vulnerability).toBe('Vulnerable')
})
```

- [ ] **Step 7: Run targeted tests**

Run:

```bash
npm test -- src/game/runtime/fsm/bossFsm.test.ts src/game/runtime/battleRuntime.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/game/runtime/fsm/bossFsmTypes.ts src/game/runtime/fsm/bossFsm.ts src/game/runtime/fsm/bossFsm.test.ts src/game/runtime/battleRuntime.ts src/game/runtime/battleRuntime.test.ts
git commit -m "Add stage-specific boss phase breaks"
```

---

### Task 7: Full Verification And Browser Smoke

**Files:**
- Modify only files needed for fixes found during verification.

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2: Run full tests**

```bash
npm test
```

Expected: PASS. If nested `.worktrees` are present under the repo root, remove or exclude them before treating duplicate test discovery as a product failure.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Run browser smoke**

Start the app:

```bash
npm run dev -- --host 127.0.0.1
```

Use the in-app browser or Playwright to verify:

```text
1. Start sortie.
2. Select normal difficulty.
3. Deploy the selected character.
4. Clear Stage 1 using fastStage/invincible debug flags if needed.
5. Continue to Stage 2.
6. Clear Stage 2.
7. Continue to Stage 3.
8. Confirm the Stage 3 loading/intro/battle view uses abyssal background and enemy/boss assets.
```

- [ ] **Step 5: Stop dev server**

Stop the `npm run dev` process started in Step 4. On Windows, if needed:

```powershell
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

- [ ] **Step 6: Final git status**

```bash
git status --short --branch
```

Expected: only intended committed changes remain. Existing unrelated `tmp/` may remain untracked if it was present before implementation.
