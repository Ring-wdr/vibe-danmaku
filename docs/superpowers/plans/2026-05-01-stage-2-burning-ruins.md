# Stage 2 Burning Ruins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Stage 2 as an automatic post-Stage-1 continuation with a burning ruin background, denser waves, a required midpoint midboss, and a final Stage 2 clear result.

**Architecture:** Keep Stage 1 content intact and introduce explicit stage identity into `StageDefinition`. The runtime receives a stage definition and owns midboss gating; the app owns campaign progression from Stage 1 victory into Stage 2. Battle rendering switches visuals from stage metadata without adding a stage select screen.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, React Testing Library, Three.js through React Three Fiber, project image assets generated with `imagegen`, browser verification through the Playwright CLI skill.

---

## File Structure

- Create `src/game/content/stage2.ts`: Stage 2 wave placements, midboss definition, final boss tuning, and `createStage2Definition`.
- Create `src/game/content/stage2.test.ts`: Stage 2 content contract tests for 12 waves, doubled counts, midboss gate, and fast-stage scaling.
- Modify `src/game/content/stage1.ts`: Add stable `stageNumber`, `backgroundTheme`, and boss metadata while preserving Stage 1 values.
- Modify `src/game/types.ts`: Add `StageId`, `StageBackgroundTheme`, `MidbossDefinition`, `StageDefinition.midboss`, and `RunResult.stageId/stageName/stageNumber`.
- Modify `src/game/runtime/battleRuntime.ts`: Add midboss runtime state and wave gating while preserving existing boss victory behavior.
- Modify `src/game/runtime/battleRuntime.test.ts`: Add runtime tests for midboss blocking, midboss defeat resuming waves, and final boss victory.
- Modify `src/game/ui/useBattleRuntime.ts`: Accept a supplied `StageDefinition` instead of always creating Stage 1.
- Modify `src/game/ui/BattleView.tsx`: Accept `stage`, switch background theme, render Stage 2 HUD labels, and render midboss health as a boss-style bar when active.
- Modify `src/game/ui/BattleView.test.ts`: Verify the hook receives the selected stage and Stage 2 labels render from snapshot/stage data.
- Modify `src/game/ui/sceneConfig.ts`: Add Stage 2 burning ruin background motion config.
- Modify `src/game/ui/sceneConfig.test.ts`: Verify Stage 2 config has looping ruin layers distinct from cloud-only Stage 1.
- Modify `src/game/assets.ts`: Import Stage 2 generated assets.
- Modify `src/app/App.tsx`: Track current stage, auto-start Stage 2 after Stage 1 victory, keep retry scoped to the current failed stage.
- Modify `src/app/App.test.tsx`: Mock battle completion and assert automatic Stage 1 to Stage 2 transition without stage select.
- Add generated assets under `src/assets/generated/`: `stage2-ruin-floor.png/.webp`, optional smoke variant, and `stage2-midboss-core.png/.webp`.

---

### Task 1: Stage Metadata And Stage 2 Content

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/content/stage1.ts`
- Create: `src/game/content/stage2.ts`
- Create: `src/game/content/stage2.test.ts`

- [ ] **Step 1: Write the failing Stage 2 content tests**

Add `src/game/content/stage2.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { createStageDefinition as createStage1Definition } from './stage1'
import { createStage2Definition } from './stage2'

describe('createStage2Definition', () => {
  it('defines Stage 2 as a burning ruin stage with 12 regular waves', () => {
    const stage = createStage2Definition('normal')

    expect(stage.id).toBe('burning-ruin-corridor')
    expect(stage.stageNumber).toBe(2)
    expect(stage.backgroundTheme).toBe('burning-ruins')
    expect(stage.waves).toHaveLength(12)
    expect(stage.midboss?.gateAfterWaveIndex).toBe(5)
  })

  it('uses twice the Stage 1-style wave counts', () => {
    const stage1 = createStage1Definition('normal')
    const stage2 = createStage2Definition('normal')

    const expectedCounts = Array.from({ length: 12 }, (_, index) => {
      const sourceWave = stage1.waves[index % stage1.waves.length]!
      return sourceWave.count * 2
    })

    expect(stage2.waves.map((wave) => wave.count)).toEqual(expectedCounts)
  })

  it('keeps the second half of waves after the midboss start', () => {
    const stage = createStage2Definition('normal')
    const midbossStart = stage.midboss?.startAt ?? 0
    const secondHalfStarts = stage.waves.slice(6).map((wave) => wave.startAt)

    expect(secondHalfStarts.every((startAt) => startAt > midbossStart)).toBe(true)
    expect(stage.boss.startAt).toBeGreaterThan(secondHalfStarts.at(-1) ?? 0)
  })

  it('scales timing in fast-stage mode without changing wave count or gate index', () => {
    const normal = createStage2Definition('normal')
    const fast = createStage2Definition('normal', { fastStage: true })

    expect(fast.waves).toHaveLength(normal.waves.length)
    expect(fast.midboss?.gateAfterWaveIndex).toBe(normal.midboss?.gateAfterWaveIndex)
    expect(fast.boss.startAt).toBeLessThan(normal.boss.startAt)
    expect(fast.duration).toBeLessThan(normal.duration)
  })
})
```

- [ ] **Step 2: Run the content test to verify it fails**

Run:

```powershell
npm test -- src/game/content/stage2.test.ts
```

Expected: FAIL because `./stage2` does not exist and `StageDefinition` does not yet include `stageNumber`, `backgroundTheme`, or `midboss`.

- [ ] **Step 3: Extend shared types**

In `src/game/types.ts`, add:

```ts
export type StageId = 'brass-cloud-gate' | 'burning-ruin-corridor'
export type StageBackgroundTheme = 'brass-cloud' | 'burning-ruins'

export type MidbossDefinition = BossDefinition & {
  gateAfterWaveIndex: number
}
```

Update `StageDefinition`:

```ts
export type StageDefinition = {
  id: StageId
  stageNumber: 1 | 2
  name: string
  lore: string
  backgroundTheme: StageBackgroundTheme
  duration: number
  waves: EnemyWave[]
  midboss?: MidbossDefinition
  boss: BossDefinition
}
```

Update `RunResult`:

```ts
export type RunResult = {
  outcome: 'victory' | 'defeat'
  difficulty: Difficulty
  stageId: StageId
  stageName: string
  stageNumber: 1 | 2
  duration: number
  remainingHp: number
  hitsTaken: number
}
```

- [ ] **Step 4: Add Stage 1 metadata**

In `src/game/content/stage1.ts`, update the returned object:

```ts
return {
  id: 'brass-cloud-gate',
  stageNumber: 1,
  name: 'Brass Cloud Gate',
  lore: '황동 비공정 항로 위를 뒤덮은 마도 구름 회랑을 돌파해 비공정 코어를 파괴한다.',
  backgroundTheme: 'brass-cloud',
  duration: scaleTime(165),
  waves: baseWavePlacements.map((placement) => ({
    ...resolveEnemyWave(difficulty, placement),
    startAt: scaleTime(placement.startAt),
  })),
  boss: {
    ...baseBoss,
    startAt: scaleTime(baseBoss.startAt),
    phases: baseBoss.phases.map((phase) => ({
      ...phase,
      pattern: scaleBossPattern(phase.pattern, difficulty),
    })),
  },
}
```

- [ ] **Step 5: Implement Stage 2 content**

Create `src/game/content/stage2.ts` using Stage 1-style placements but retuned:

```ts
import { resolveEnemyWave } from './enemies'
import type {
  BossDefinition,
  BulletPatternConfig,
  Difficulty,
  StageDefinition,
} from '../types'

const stage2WavePlacements = [
  { id: 'stage2-wave-1', startAt: 1.6, archetype: 'scout', variant: 'brass-cloud-scout', count: 14, spacing: 0.42, pattern: { count: 7, spread: 1.5 } },
  { id: 'stage2-wave-2', startAt: 8.5, archetype: 'sentinel', variant: 'brass-cloud-sentinel', count: 14, spacing: 0.42 },
  { id: 'stage2-wave-3', startAt: 15.5, archetype: 'lancer', variant: 'brass-cloud-lancer', count: 14, spacing: 0.42, pattern: { count: 5, interval: 1.15 } },
  { id: 'stage2-wave-4', startAt: 23, archetype: 'splitter', variant: 'brass-cloud-splitter', count: 18, spacing: 0.32 },
  { id: 'stage2-wave-5', startAt: 31, archetype: 'mine-layer', variant: 'brass-cloud-mine-layer', count: 18, spacing: 0.31 },
  { id: 'stage2-wave-6', startAt: 39, archetype: 'weaver', variant: 'brass-cloud-weaver', count: 18, spacing: 0.3, pattern: { interval: 1.02 } },
  { id: 'stage2-wave-7', startAt: 58, archetype: 'scout', variant: 'brass-cloud-scout', count: 24, spacing: 0.24, pattern: { count: 8, spread: 1.6 } },
  { id: 'stage2-wave-8', startAt: 66, archetype: 'weaver', variant: 'brass-cloud-weaver', count: 24, spacing: 0.23, pattern: { count: 8, interval: 0.95 } },
  { id: 'stage2-wave-9', startAt: 74, archetype: 'scout', variant: 'brass-cloud-scout', count: 14, spacing: 0.4, pattern: { count: 8, interval: 1.05 } },
  { id: 'stage2-wave-10', startAt: 82, archetype: 'sentinel', variant: 'brass-cloud-sentinel', count: 14, spacing: 0.4, pattern: { count: 8 } },
  { id: 'stage2-wave-11', startAt: 90, archetype: 'lancer', variant: 'brass-cloud-lancer', count: 14, spacing: 0.4, pattern: { count: 5, interval: 1 } },
  { id: 'stage2-wave-12', startAt: 98, archetype: 'splitter', variant: 'brass-cloud-splitter', count: 18, spacing: 0.3, pattern: { count: 5, interval: 1.05 } },
] as const

const baseMidboss: BossDefinition & { gateAfterWaveIndex: number } = {
  id: 'midboss-ember-gate',
  gateAfterWaveIndex: 5,
  startAt: 47,
  hp: 620,
  phases: [
    {
      id: 'midboss-phase-1',
      threshold: 0.5,
      label: 'Midboss · Ember Gate',
      supportLaser: false,
      pattern: { shape: 'ring', count: 9, interval: 0.95, speed: 1.05, spread: 0.5, life: 7.4 },
    },
    {
      id: 'midboss-phase-2',
      threshold: 0,
      label: 'Midboss · Ruin Furnace',
      supportLaser: true,
      pattern: { shape: 'fan', count: 11, interval: 0.74, speed: 1.22, spread: 1.9, life: 7.8 },
    },
  ],
}

const baseFinalBoss: BossDefinition = {
  id: 'boss-ash-citadel-core',
  startAt: 110,
  hp: 1380,
  phases: [
    {
      id: 'ash-phase-1',
      threshold: 0.66,
      label: 'Phase 1 · Ash Fan',
      supportLaser: false,
      pattern: { shape: 'fan', count: 10, interval: 0.86, speed: 1.2, spread: 2, life: 8.2 },
    },
    {
      id: 'ash-phase-2',
      threshold: 0.33,
      label: 'Phase 2 · Furnace Wheel',
      supportLaser: false,
      pattern: { shape: 'spiral', count: 12, interval: 0.7, speed: 1.28, spread: 0.48, life: 8.4 },
    },
    {
      id: 'ash-phase-3',
      threshold: 0,
      label: 'Phase 3 · Ruin Bloom',
      supportLaser: true,
      pattern: { shape: 'laser-bloom', count: 14, interval: 0.58, speed: 1.42, spread: 0.56, life: 9 },
    },
  ],
}

const bossTuningByDifficulty: Record<
  Difficulty,
  { bulletCount: number; bulletSpeed: number; interval: number }
> = {
  easy: { bulletCount: 1, bulletSpeed: 1, interval: 1 },
  normal: { bulletCount: 1.08, bulletSpeed: 1.08, interval: 0.92 },
  hard: { bulletCount: 1.22, bulletSpeed: 1.2, interval: 0.8 },
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

function scaleBoss<T extends BossDefinition>(boss: T, difficulty: Difficulty): T {
  return {
    ...boss,
    phases: boss.phases.map((phase) => ({
      ...phase,
      pattern: scaleBossPattern(phase.pattern, difficulty),
    })),
  }
}

export function createStage2Definition(
  difficulty: Difficulty,
  options?: { fastStage?: boolean },
): StageDefinition {
  const fastMultiplier = options?.fastStage ? 0.22 : 1
  const scaleTime = (value: number) => Number((value * fastMultiplier).toFixed(2))
  const midboss = scaleBoss(baseMidboss, difficulty)
  const boss = scaleBoss(baseFinalBoss, difficulty)

  return {
    id: 'burning-ruin-corridor',
    stageNumber: 2,
    name: 'Burning Ruin Corridor',
    lore: '전쟁 뒤 불타는 폐허 회랑을 돌파하고 잿빛 성채 코어를 붕괴시킨다.',
    backgroundTheme: 'burning-ruins',
    duration: scaleTime(205),
    waves: stage2WavePlacements.map((placement) => ({
      ...resolveEnemyWave(difficulty, placement),
      startAt: scaleTime(placement.startAt),
    })),
    midboss: {
      ...midboss,
      startAt: scaleTime(midboss.startAt),
    },
    boss: {
      ...boss,
      startAt: scaleTime(boss.startAt),
    },
  }
}
```

- [ ] **Step 6: Run tests and commit**

Run:

```powershell
npm test -- src/game/content/stage2.test.ts src/game/content/stage1.test.ts
```

Expected: PASS.

Commit:

```powershell
git add -- src/game/types.ts src/game/content/stage1.ts src/game/content/stage2.ts src/game/content/stage2.test.ts
git commit -m "Add stage 2 content definition"
```

---

### Task 2: Runtime Midboss Gate

**Files:**
- Modify: `src/game/runtime/battleRuntime.ts`
- Modify: `src/game/runtime/battleRuntime.test.ts`

- [ ] **Step 1: Write failing runtime tests**

Add tests to `src/game/runtime/battleRuntime.test.ts`:

```ts
function createMidbossGateStage(): StageDefinition {
  const stage = createStageDefinition('normal')

  return {
    ...stage,
    duration: 999,
    waves: [
      { ...stage.waves[0]!, id: 'before-gate', startAt: 0, count: 1, hp: 1 },
      { ...stage.waves[1]!, id: 'after-gate', startAt: 0.1, count: 1, hp: 1 },
    ],
    midboss: {
      ...stage.boss,
      id: 'test-midboss',
      gateAfterWaveIndex: 0,
      startAt: 0.05,
      hp: 240,
      phases: [
        {
          id: 'midboss-test-phase',
          threshold: 0,
          label: 'Midboss Test',
          supportLaser: false,
          pattern: {
            shape: 'fan',
            count: 3,
            interval: 999,
            speed: 0.6,
            spread: 0.5,
            life: 4,
          },
        },
      ],
    },
    boss: {
      ...stage.boss,
      startAt: 999,
    },
  }
}

it('blocks post-gate waves while the midboss is alive', () => {
  const runtime = createRuntime({ stage: createMidbossGateStage(), character: testPilot })

  runtime.update(0.2)

  const snapshot = runtime.getSnapshot()
  expect(snapshot.boss?.id).toBe('test-midboss')
  expect(snapshot.enemies.some((enemy) => enemy.waveId === 'after-gate')).toBe(false)
})

it('resumes post-gate waves after the midboss is defeated', () => {
  const runtime = createRuntime({ stage: createMidbossGateStage(), character: testPilot })

  for (let index = 0; index < 80; index += 1) {
    runtime.update(0.1)
  }

  const snapshot = runtime.getSnapshot()
  expect(snapshot.boss?.id).not.toBe('test-midboss')
  expect(snapshot.enemies.some((enemy) => enemy.waveId === 'after-gate')).toBe(true)
  expect(snapshot.result).toBeNull()
})
```

- [ ] **Step 2: Run the focused runtime tests to verify failure**

Run:

```powershell
npm test -- src/game/runtime/battleRuntime.test.ts
```

Expected: FAIL because the runtime has no midboss concept and spawns all eligible waves by start time.

- [ ] **Step 3: Add midboss runtime state**

In `src/game/runtime/battleRuntime.ts`, add stage-result fields in `finish`:

```ts
result = {
  outcome,
  difficulty,
  stageId: stage.id,
  stageName: stage.name,
  stageNumber: stage.stageNumber,
  duration: elapsed,
  remainingHp: player.hp,
  hitsTaken,
}
```

Add state near the existing boss state:

```ts
let boss: RuntimeBoss | null = null
let activeBossRole: 'midboss' | 'final' | null = null
let midbossDefeated = !stage.midboss
const midbossGateAfterWaveIndex = stage.midboss?.gateAfterWaveIndex ?? -1
```

- [ ] **Step 4: Gate wave spawning**

Replace the wave spawning loop with index-aware gating:

```ts
while (waveQueue[0] && elapsed >= waveQueue[0].startAt) {
  const nextWave = waveQueue[0]
  const originalIndex = stage.waves.findIndex((wave) => wave.id === nextWave.id)
  const isBlockedByMidboss =
    !midbossDefeated &&
    originalIndex > midbossGateAfterWaveIndex

  if (isBlockedByMidboss) {
    break
  }

  waveQueue.shift()
  spawnWave(nextWave)
}
```

- [ ] **Step 5: Spawn midboss before final boss**

Split the existing `spawnBoss` into a definition-aware helper:

```ts
const spawnBoss = (definition: BossDefinition, role: 'midboss' | 'final') => {
  const bossHp = invincible ? Math.round(definition.hp * 0.28) : definition.hp
  boss = {
    id: definition.id,
    x: 0,
    z: 2.15,
    hp: bossHp,
    maxHp: bossHp,
    shootTimer: 0.45,
    supportLaserTimer: 1.1,
  }
  activeBossRole = role
  bossEnteredCount += 1
  cuePulse += 1
}
```

Then update the spawn conditions:

```ts
if (
  !boss &&
  stage.midboss &&
  !midbossDefeated &&
  elapsed >= stage.midboss.startAt
) {
  spawnBoss(stage.midboss, 'midboss')
}

if (!boss && midbossDefeated && elapsed >= stage.boss.startAt) {
  spawnBoss(stage.boss, 'final')
}
```

- [ ] **Step 6: Use the active boss definition for phases and defeat**

Update `getBossPhase`:

```ts
const getBossDefinition = () => {
  if (activeBossRole === 'midboss') {
    return stage.midboss ?? null
  }

  if (activeBossRole === 'final') {
    return stage.boss
  }

  return null
}

const getBossPhase = () => {
  if (!boss) {
    return null
  }

  const definition = getBossDefinition()
  const ratio = boss.hp / boss.maxHp
  return (
    definition?.phases.find((phase) => ratio >= phase.threshold) ??
    definition?.phases[definition.phases.length - 1] ??
    null
  )
}
```

Update boss defeat:

```ts
if (boss.hp <= 0) {
  const defeatedRole = activeBossRole
  boss = null
  activeBossRole = null

  if (defeatedRole === 'midboss') {
    midbossDefeated = true
    cuePulse += 1
    return
  }

  finish('victory')
}
```

- [ ] **Step 7: Run tests and commit**

Run:

```powershell
npm test -- src/game/runtime/battleRuntime.test.ts
```

Expected: PASS.

Commit:

```powershell
git add -- src/game/runtime/battleRuntime.ts src/game/runtime/battleRuntime.test.ts
git commit -m "Add midboss gate runtime"
```

---

### Task 3: Campaign Flow Without Stage Select

**Files:**
- Modify: `src/game/ui/useBattleRuntime.ts`
- Modify: `src/game/ui/BattleView.tsx`
- Modify: `src/game/ui/BattleView.test.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`

- [ ] **Step 1: Write failing UI flow tests**

In `src/game/ui/BattleView.test.ts`, update the hook expectation test to include a stage object:

```ts
import { createStageDefinition } from '../content/stage1'

it('passes the selected stage and character into the battle runtime hook', () => {
  const stage = createStageDefinition('hard', { fastStage: true })

  render(
    createElement(BattleView, {
      difficulty: 'hard',
      stage,
      character: lyraAerCharacter,
      fastStage: true,
      invincible: true,
      onComplete: vi.fn(),
    }),
  )

  expect(mockUseBattleRuntime).toHaveBeenCalledWith({
    difficulty: 'hard',
    stage,
    character: lyraAerCharacter,
    fastStage: true,
    invincible: true,
  })
})
```

In `src/app/App.test.tsx`, mock `BattleView` at the top of the file:

```ts
import { vi } from 'vitest'

const { mockBattleView } = vi.hoisted(() => ({
  mockBattleView: vi.fn(),
}))

vi.mock('../game/ui/BattleView', () => ({
  BattleView: mockBattleView,
}))
```

Add this test:

```ts
it('automatically starts Stage 2 after Stage 1 victory without showing stage select', async () => {
  mockBattleView.mockImplementation(({ stage, onComplete }) => (
    <button
      type="button"
      onClick={() =>
        onComplete({
          outcome: 'victory',
          difficulty: 'normal',
          stageId: stage.id,
          stageName: stage.name,
          stageNumber: stage.stageNumber,
          duration: 1,
          remainingHp: 3,
          hitsTaken: 0,
        })
      }
    >
      Clear {stage.name}
    </button>
  ))

  renderApp(<App />)

  fireEvent.click(screen.getByRole('button', { name: /start sortie/i }))
  fireEvent.click(screen.getByRole('button', { name: /normal/i }))
  fireEvent.click(screen.getByRole('button', { name: /deploy lyra aer/i }))
  fireEvent.click(screen.getByRole('button', { name: /deploy/i }))
  fireEvent.click(await screen.findByRole('button', { name: /clear brass cloud gate/i }))

  expect(await screen.findByRole('button', { name: /clear burning ruin corridor/i })).toBeInTheDocument()
  expect(screen.queryByText(/select stage/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/game/ui/BattleView.test.ts src/app/App.test.tsx
```

Expected: FAIL because `BattleView` has no `stage` prop and `App` does not track campaign stage.

- [ ] **Step 3: Update `useBattleRuntime`**

Modify `src/game/ui/useBattleRuntime.ts`:

```ts
import { useState, useSyncExternalStore } from 'react'

import { createBattleRuntime } from '../runtime/battleRuntime'
import type { CharacterDefinition, Difficulty, StageDefinition } from '../types'

type BattleRuntimeOptions = {
  difficulty: Difficulty
  stage: StageDefinition
  character: CharacterDefinition
  fastStage?: boolean
  invincible?: boolean
}

export function useBattleRuntime(options: BattleRuntimeOptions) {
  const [runtime] = useState(() =>
    createBattleRuntime({
      difficulty: options.difficulty,
      stage: options.stage,
      character: options.character,
      invincible: options.invincible,
    }),
  )

  const snapshot = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot,
  )

  return { runtime, snapshot }
}
```

- [ ] **Step 4: Update `BattleView` props and labels**

Modify `BattleViewProps`:

```ts
type BattleViewProps = {
  difficulty: Difficulty
  stage: StageDefinition
  character: CharacterDefinition
  fastStage?: boolean
  invincible?: boolean
  onComplete: (result: RunResult) => void
}
```

Call the hook with `stage`:

```ts
const { runtime, snapshot } = useBattleRuntime({
  difficulty,
  stage,
  character,
  fastStage,
  invincible,
})
```

Use dynamic labels:

```tsx
<section className="battle-shell" aria-label={`Stage ${stage.stageNumber} battle`}>
...
<span>Stage {stage.stageNumber}</span>
```

- [ ] **Step 5: Update `App` campaign state**

Import both stage factories:

```ts
import { createStageDefinition as createStage1Definition } from '../game/content/stage1'
import { createStage2Definition } from '../game/content/stage2'
import type { AppScreen, Difficulty, RunResult, StageDefinition } from '../game/types'
```

Add state:

```ts
const [currentStageNumber, setCurrentStageNumber] = useState<1 | 2>(1)
const currentStage: StageDefinition =
  currentStageNumber === 1
    ? createStage1Definition(difficulty, { fastStage: debugFlags.fastStage })
    : createStage2Definition(difficulty, { fastStage: debugFlags.fastStage })
```

Pass `stage` to `BattleView` and update completion:

```tsx
<BattleView
  key={`${difficulty}-${selectedCharacter.id}-${battleSeed}-${currentStage.id}-${debugFlags.fastStage}-${debugFlags.invincible}`}
  difficulty={difficulty}
  stage={currentStage}
  character={selectedCharacter}
  fastStage={debugFlags.fastStage}
  invincible={debugFlags.invincible}
  onComplete={(nextResult) => {
    if (nextResult.outcome === 'victory' && nextResult.stageNumber === 1) {
      setCurrentStageNumber(2)
      setBattleSeed((current) => current + 1)
      startScreen('battle')
      return
    }

    setResult(nextResult)
    startScreen('result')
  }}
/>
```

Reset stage when starting a new campaign:

```ts
const startNewCampaign = () => {
  setCurrentStageNumber(1)
  setResult(null)
  setBattleSeed((current) => current + 1)
  startScreen('difficulty-select')
}
```

Use it for `Start Sortie`, and set `currentStageNumber` to `1` before deploying from Stage 1 intro.

Retry current failed stage:

```ts
setCurrentStageNumber(result.stageNumber)
setBattleSeed((current) => current + 1)
startScreen('battle')
```

Update result copy to use `result.stageName`.

- [ ] **Step 6: Run tests and commit**

Run:

```powershell
npm test -- src/game/ui/BattleView.test.ts src/app/App.test.tsx
```

Expected: PASS.

Commit:

```powershell
git add -- src/game/ui/useBattleRuntime.ts src/game/ui/BattleView.tsx src/game/ui/BattleView.test.ts src/app/App.tsx src/app/App.test.tsx
git commit -m "Add automatic stage 2 campaign flow"
```

---

### Task 4: Stage 2 Assets And Asset Registry

**Files:**
- Add: `src/assets/generated/stage2-ruin-floor.png`
- Add: `src/assets/generated/stage2-ruin-floor.webp`
- Add: `src/assets/generated/stage2-smoke-layer.png`
- Add: `src/assets/generated/stage2-smoke-layer.webp`
- Add: `src/assets/generated/stage2-midboss-core.png`
- Add: `src/assets/generated/stage2-midboss-core.webp`
- Modify: `src/game/assets.ts`
- Modify: `src/game/assets.test.ts`

- [ ] **Step 1: Write failing asset registry test**

In `src/game/assets.test.ts`, add:

```ts
it('exports Stage 2 burning ruin assets', () => {
  expect(gameAssets.stage2RuinFloorUrl).toMatch(/stage2-ruin-floor/)
  expect(gameAssets.stage2SmokeLayerUrl).toMatch(/stage2-smoke-layer/)
  expect(gameAssets.stage2MidbossCoreUrl).toMatch(/stage2-midboss-core/)
})
```

- [ ] **Step 2: Run the asset test to verify failure**

Run:

```powershell
npm test -- src/game/assets.test.ts
```

Expected: FAIL because Stage 2 assets are not imported or exported.

- [ ] **Step 3: Generate Stage 2 images with `imagegen`**

Use built-in `imagegen` with these prompts, saving final files into `src/assets/generated/`:

```text
Use case: stylized-concept
Asset type: vertically looping game background texture
Primary request: a seamless top-down burning post-war ruin floor for a vertical bullet-hell stage
Scene/backdrop: scorched fortress road plates, collapsed stone, broken brass machinery, glowing ember cracks, ash dust
Style/medium: painterly game asset matching a steampunk fantasy bullet-hell, compatible with existing Stage 1 brass cloud assets
Composition/framing: top-down vertical tile, no horizon, no characters, no readable text, edges suitable for vertical looping
Lighting/mood: dark ash base with restrained orange ember glow
Constraints: must work behind bright cyan/orange bullets, avoid high contrast enemy-like silhouettes, no watermark
```

```text
Use case: stylized-concept
Asset type: transparent-feeling smoke layer for a game background
Primary request: smoky ash cloud layer for a burning ruin bullet-hell stage
Scene/backdrop: dark smoke, ember haze, torn cloud wisps
Style/medium: painterly game VFX layer matching Stage 1 cloud assets
Composition/framing: wide soft texture with no hard central subject
Lighting/mood: smoky charcoal with low-opacity orange glow
Constraints: no characters, no text, no watermark, avoid bright bullet-like dots
```

```text
Use case: stylized-concept
Asset type: midboss sprite
Primary request: an ember gate midboss core for a steampunk fantasy bullet-hell game
Subject: floating ruined brass gate engine with cracked furnace core, distinct from the final boss
Style/medium: painterly sprite-like game asset, transparent-friendly edges, strong readable silhouette
Composition/framing: centered object with generous padding, no background scenery
Lighting/mood: dark brass, scorched metal, controlled orange core glow
Constraints: no text, no watermark, no player character
```

- [ ] **Step 4: Optimize assets**

Run:

```powershell
npm run assets:optimize
```

Expected: generated `.webp` files exist for the new Stage 2 images. If the optimizer only handles known files, update `scripts/optimize-runtime-assets.mjs` to include the three Stage 2 PNG sources and rerun.

- [ ] **Step 5: Export new assets**

In `src/game/assets.ts`, add imports:

```ts
import stage2MidbossCoreUrl from '../assets/generated/stage2-midboss-core.webp'
import stage2RuinFloorUrl from '../assets/generated/stage2-ruin-floor.webp'
import stage2SmokeLayerUrl from '../assets/generated/stage2-smoke-layer.webp'
```

Add exports:

```ts
stage2MidbossCoreUrl,
stage2RuinFloorUrl,
stage2SmokeLayerUrl,
```

- [ ] **Step 6: Run tests and commit**

Run:

```powershell
npm test -- src/game/assets.test.ts
```

Expected: PASS.

Commit:

```powershell
git add -- src/assets/generated/stage2-ruin-floor.png src/assets/generated/stage2-ruin-floor.webp src/assets/generated/stage2-smoke-layer.png src/assets/generated/stage2-smoke-layer.webp src/assets/generated/stage2-midboss-core.png src/assets/generated/stage2-midboss-core.webp src/game/assets.ts src/game/assets.test.ts scripts/optimize-runtime-assets.mjs
git commit -m "Add stage 2 burning ruins assets"
```

---

### Task 5: Stage-Specific Battle Visuals

**Files:**
- Modify: `src/game/ui/sceneConfig.ts`
- Modify: `src/game/ui/sceneConfig.test.ts`
- Modify: `src/game/ui/BattleView.tsx`
- Modify: `src/game/ui/BattleView.test.ts`

- [ ] **Step 1: Write failing scene config test**

In `src/game/ui/sceneConfig.test.ts`, add:

```ts
import { stageBackgroundMotionConfigs } from './sceneConfig'

it('defines a Stage 2 ruin floor motion config distinct from Stage 1 clouds', () => {
  const stage2 = stageBackgroundMotionConfigs['burning-ruins']

  expect(stage2.floorLayers).toHaveLength(2)
  expect(stage2.floorLayers.every((layer) => layer.textureKey === 'ruinFloor')).toBe(true)
  expect(stage2.floorLayers.every((layer) => layer.speed > 0)).toBe(true)
  expect(stage2.cloudLayers.length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Run scene tests to verify failure**

Run:

```powershell
npm test -- src/game/ui/sceneConfig.test.ts
```

Expected: FAIL because `stageBackgroundMotionConfigs` does not exist.

- [ ] **Step 3: Add background config**

In `src/game/ui/sceneConfig.ts`, add:

```ts
export const stageBackgroundMotionConfigs = {
  'brass-cloud': {
    cloudLayers: battleBackgroundMotionConfig.cloudLayers,
    floorLayers: [],
    fixtures: battleBackgroundMotionConfig.fixtures,
  },
  'burning-ruins': {
    cloudLayers: [
      {
        textureKey: 'stage2Smoke',
        x: -0.1,
        startY: 1.4,
        z: -1.65,
        width: 10.4,
        height: 5,
        opacity: 0.26,
        speed: 0.48,
        spacing: 5,
        rotation: -0.05,
        sway: 0.09,
      },
    ],
    floorLayers: [
      {
        textureKey: 'ruinFloor',
        x: 0,
        startY: 1.1,
        z: -1.95,
        width: 7.4,
        height: 6,
        opacity: 0.58,
        speed: 0.72,
        spacing: 5.9,
        rotation: 0,
        sway: 0.02,
      },
      {
        textureKey: 'ruinFloor',
        x: 0.18,
        startY: 4.05,
        z: -2.05,
        width: 7.9,
        height: 6.2,
        opacity: 0.36,
        speed: 0.55,
        spacing: 6.05,
        rotation: Math.PI,
        sway: 0.03,
      },
    ],
    fixtures: [
      { x: -2.8, y: 3.2, z: -1.16, scale: 0.5, speed: 0.98, spin: 0.28, phase: 0.6 },
      { x: 2.55, y: 1.1, z: -1.2, scale: 0.44, speed: 0.9, spin: -0.35, phase: 2.1 },
      { x: -1.2, y: -1.25, z: -1.24, scale: 0.38, speed: 0.8, spin: 0.4, phase: 3.3 },
    ],
  },
} as const
```

- [ ] **Step 4: Switch `BattleView` background textures by theme**

Update `MovingBackgroundLayer` props:

```ts
function MovingBackgroundLayer({ theme }: { theme: StageDefinition['backgroundTheme'] }) {
  const config = stageBackgroundMotionConfigs[theme]
  const cloudTextureA = useLoadedTexture(gameAssets.cloudLayerAUrl)
  const cloudTextureB = useLoadedTexture(gameAssets.cloudLayerBUrl)
  const stage2SmokeTexture = useLoadedTexture(gameAssets.stage2SmokeLayerUrl)
  const ruinFloorTexture = useLoadedTexture(gameAssets.stage2RuinFloorUrl)

  const textureByKey = {
    a: cloudTextureA,
    b: cloudTextureB,
    stage2Smoke: stage2SmokeTexture,
    ruinFloor: ruinFloorTexture,
  }

  return (
    <group name="battle-background-motion" userData={{ testId: 'battle-background-motion' }}>
      {[...config.floorLayers, ...config.cloudLayers].map((layer) => {
        const texture = textureByKey[layer.textureKey]

        if (!texture) {
          return null
        }

        return [0, layer.spacing].map((offset) => (
          <MovingCloudPlane
            key={`${layer.textureKey}-${offset}-${layer.z}`}
            texture={texture}
            config={layer}
            offset={offset}
          />
        ))
      })}
    </group>
  )
}
```

Pass it in `BattleScene`:

```tsx
function BattleScene({ character, snapshot, stage }: {
  character: CharacterDefinition
  snapshot: BattleSnapshot
  stage: StageDefinition
}) {
...
<MovingBackgroundLayer theme={stage.backgroundTheme} />
```

- [ ] **Step 5: Render midboss asset distinct from final boss**

Update `BossSprite`:

```ts
const bossTexture = useLoadedTexture(
  snapshot.boss?.id.startsWith('midboss-')
    ? gameAssets.stage2MidbossCoreUrl
    : gameAssets.bossCoreUrl,
)
```

- [ ] **Step 6: Run tests and commit**

Run:

```powershell
npm test -- src/game/ui/sceneConfig.test.ts src/game/ui/BattleView.test.ts
```

Expected: PASS.

Commit:

```powershell
git add -- src/game/ui/sceneConfig.ts src/game/ui/sceneConfig.test.ts src/game/ui/BattleView.tsx src/game/ui/BattleView.test.ts
git commit -m "Render stage 2 burning ruins background"
```

---

### Task 6: Full Verification And Browser Smoke

**Files:**
- No source file changes expected unless verification reveals defects.

- [ ] **Step 1: Run the full automated suite**

Run:

```powershell
npm test
npm run build
```

Expected: both commands PASS.

- [ ] **Step 2: Check Playwright CLI prerequisite**

Run:

```powershell
Get-Command npx -ErrorAction SilentlyContinue
```

Expected: returns the `npx` command path. If missing, install Node.js/npm before using the Playwright CLI wrapper.

- [ ] **Step 3: Start Vite dev server**

Run:

```powershell
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL. Use an unused port if the default port is occupied.

- [ ] **Step 4: Verify automatic Stage 1 to Stage 2 transition**

Use the Playwright CLI wrapper from the skill:

```powershell
$env:CODEX_HOME = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { "$HOME\\.codex" }
$env:PWCLI = "$env:CODEX_HOME\\skills\\playwright\\scripts\\playwright_cli.sh"
```

Open:

```powershell
bash $env:PWCLI open "http://127.0.0.1:5173/?fastStage=1&invincible=1" --headed
bash $env:PWCLI snapshot
```

Click through title, difficulty, pilot, and deploy using refs from each fresh snapshot. Wait for Stage 1 to complete and confirm the HUD changes to Stage 2 without any stage select screen.

- [ ] **Step 5: Capture Stage 2 visual evidence**

Run:

```powershell
bash $env:PWCLI screenshot --output output/playwright/stage2-burning-ruins-a.png
Start-Sleep -Seconds 2
bash $env:PWCLI screenshot --output output/playwright/stage2-burning-ruins-b.png
```

Expected:

- Stage 2 HUD is visible.
- Burning ruin floor appears below gameplay.
- Screenshots differ in background floor position.
- No text overlap or unusable drag overlay is visible.

- [ ] **Step 6: Final commit if verification fixes were needed**

If defects were fixed during verification:

```powershell
git add -- <fixed-files>
git commit -m "Polish stage 2 verification issues"
```

If no source changes were needed, do not create an empty commit.
