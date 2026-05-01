# Battle Special Attack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manually triggered `beam-lance` special attack with boss-timed charge, circular radial-slot UI, R3F beam visuals, and sparkle hit effects.

**Architecture:** Keep combat authority in `createBattleRuntime`: charge, activation, beam collision, damage, and sparkle events all come from runtime state. `BattleView` renders the circular special slot, calls `runtime.activateSpecial('beam-lance')`, and draws the beam and sparkles from snapshot render data. Existing query flags move to `nuqs` because this feature's browser verification depends on query string control.

**Tech Stack:** React 19, Vite, TypeScript, Zustand-free local runtime state, React Three Fiber, Three.js, Vitest, Testing Library, nuqs.

---

## File Structure

- Modify: `package.json`
  - Add runtime dependency `nuqs`.
- Modify: `package-lock.json`
  - Created by `npm install nuqs`.
- Modify: `src/main.tsx`
  - Wrap `<App />` with `NuqsAdapter`.
- Modify: `src/app/App.tsx`
  - Replace direct `URLSearchParams` debug flag parsing with `useQueryStates`.
- Modify: `src/app/App.test.tsx`
  - Wrap test renders with `withNuqsTestingAdapter` after the app starts using nuqs hooks.
- Modify: `src/game/types.ts`
  - Add special slot, special beam, and sparkle render types to `BattleSnapshot`.
- Modify: `src/game/runtime/battleRuntime.ts`
  - Add charge, activation, beam damage, and sparkle event runtime logic.
- Modify: `src/game/runtime/battleRuntime.test.ts`
  - Add runtime tests for charge timing, activation, damage, miss behavior, and sparkles.
- Modify: `src/game/ui/BattleView.tsx`
  - Add circular radial special slot HUD and R3F beam/sparkle rendering.
- Modify: `src/game/ui/BattleView.test.ts`
  - Add UI tests for button readiness and activation.
- Modify: `src/style.css`
  - Add circular slot styling, radial gauge ring, ready/charging states, and safe pointer-events.
- Create or update: `output/playwright/battle-special-attack.png`
  - Browser verification screenshot evidence.

---

## Task 1: Install nuqs And Migrate Query Flags

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/main.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`

- [ ] **Step 1: Install nuqs**

Run:

```powershell
npm install nuqs
```

Expected:

- `package.json` adds `"nuqs"` under `dependencies`.
- `package-lock.json` updates.
- Command exits `0`.

- [ ] **Step 2: Wrap the app in the React adapter**

In `src/main.tsx`, replace the current render tree with a `NuqsAdapter` wrapper.

Use this import:

```ts
import { NuqsAdapter } from 'nuqs/adapters/react'
```

Use this render shape:

```tsx
createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <NuqsAdapter>
      <App />
    </NuqsAdapter>
  </StrictMode>,
)
```

- [ ] **Step 3: Replace direct query parsing in App**

In `src/app/App.tsx`, remove `readDebugFlags()` and add this import:

```ts
import { parseAsBoolean, useQueryStates } from 'nuqs'
```

Inside `App`, replace:

```ts
const debugFlags = readDebugFlags()
```

with:

```ts
const [debugFlags] = useQueryStates({
  fastStage: parseAsBoolean.withDefault(false),
  invincible: parseAsBoolean.withDefault(false),
})
```

Keep the existing `BattleView` props and key shape:

```tsx
key={`${difficulty}-${battleSeed}-${debugFlags.fastStage}-${debugFlags.invincible}`}
fastStage={debugFlags.fastStage}
invincible={debugFlags.invincible}
```

- [ ] **Step 4: Wrap App tests with the nuqs testing adapter**

In `src/app/App.test.tsx`, add:

```ts
import type { ReactElement } from 'react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
```

Add this helper:

```tsx
function renderApp(ui: ReactElement) {
  return render(ui, {
    wrapper: withNuqsTestingAdapter({ searchParams: '' }),
  })
}
```

Replace current `render(<App ... />)` calls with `renderApp(<App ... />)`.

- [ ] **Step 5: Verify query migration**

Run:

```powershell
npm test -- src/app/App.test.tsx
```

Expected: App tests pass.

- [ ] **Step 6: Commit query migration**

Run:

```powershell
git add -- package.json package-lock.json src/main.tsx src/app/App.tsx src/app/App.test.tsx
git commit -m "Use nuqs for debug query flags"
```

Expected: commit succeeds.

---

## Task 2: Add Runtime Types And Failing Special Tests

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/runtime/battleRuntime.test.ts`

- [ ] **Step 1: Add special render types**

In `src/game/types.ts`, add these types near the existing render types:

```ts
export type SpecialSlotId = 'beam-lance'
export type SpecialIconId = 'beam'

export type RenderSpecialSlot = {
  id: SpecialSlotId
  icon: SpecialIconId
  charge: number
  maxCharge: number
  ready: boolean
  active: boolean
  activeRatio: number
}

export type RenderSpecialBeam = {
  origin: ArenaPoint
  angle: 0
  width: number
  length: number
}

export type RenderSparkle = {
  id: string
  position: ArenaPoint
  age: number
  life: number
  intensity: number
}
```

Add these fields to `BattleSnapshot`:

```ts
specialSlots: RenderSpecialSlot[]
specialBeam: RenderSpecialBeam | null
sparkles: RenderSparkle[]
```

- [ ] **Step 2: Import the special id type in runtime tests**

Update the runtime test type import:

```ts
import type { BulletPatternConfig, SpecialSlotId, StageDefinition } from '../types'
```

Add this constant near the helper functions:

```ts
const beamLance: SpecialSlotId = 'beam-lance'
```

- [ ] **Step 3: Add a helper stage for special tests**

Add this helper to `src/game/runtime/battleRuntime.test.ts`:

```ts
function createSpecialTestStage(): StageDefinition {
  const stage = createStageDefinition('normal')

  return {
    ...stage,
    duration: 999,
    waves: [
      {
        ...stage.waves[0]!,
        id: 'special-target',
        startAt: 0,
        count: 1,
        hp: 32,
        speed: 0,
        pattern: {
          shape: 'fan',
          count: 3,
          interval: 999,
          speed: 0.5,
          spread: 0.5,
          life: 4,
        },
      },
    ],
    boss: {
      ...stage.boss,
      startAt: 0.2,
      hp: 240,
    },
  }
}

function createSpecialEnemyOnlyStage(): StageDefinition {
  const stage = createSpecialTestStage()

  return {
    ...stage,
    boss: {
      ...stage.boss,
      startAt: 999,
    },
  }
}

function createSpecialChargeBonusStage(): StageDefinition {
  const stage = createStageDefinition('normal')

  return {
    ...stage,
    duration: 999,
    waves: [
      {
        ...stage.waves[0]!,
        id: 'charge-bonus-target',
        startAt: 0,
        count: 1,
        hp: 1,
        speed: 0,
        pattern: {
          shape: 'fan',
          count: 3,
          interval: 999,
          speed: 0.5,
          spread: 0.5,
          life: 4,
        },
      },
    ],
    boss: {
      ...stage.boss,
      startAt: 999,
    },
  }
}
```

- [ ] **Step 4: Add failing charge and activation tests**

Add this describe block to `src/game/runtime/battleRuntime.test.ts`:

```ts
describe('special attack runtime', () => {
  it('charges most of the beam-lance gauge by boss arrival', () => {
    const stage = createStageDefinition('normal')
    const runtime = createBattleRuntime({ difficulty: 'normal', stage })

    runtime.update(stage.boss.startAt)

    const slot = runtime
      .getSnapshot()
      .specialSlots.find((candidate) => candidate.id === beamLance)

    expect(slot?.charge).toBeGreaterThanOrEqual(91)
    expect(slot?.charge).toBeLessThanOrEqual(94)
    expect(slot?.ready).toBe(false)
  })

  it('does not activate beam-lance before full charge', () => {
    const runtime = createBattleRuntime({
      difficulty: 'normal',
      stage: createStageDefinition('normal'),
    })

    expect(runtime.activateSpecial(beamLance)).toBe(false)
    expect(runtime.getSnapshot().specialBeam).toBeNull()
  })

  it('adds beam-lance charge when a regular enemy is defeated', () => {
    const stage = createSpecialChargeBonusStage()
    const runtime = createBattleRuntime({ difficulty: 'normal', stage })

    runtime.update(2)

    const slot = runtime
      .getSnapshot()
      .specialSlots.find((candidate) => candidate.id === beamLance)
    const naturalChargeOnly = (92 / stage.boss.startAt) * 2

    expect(slot?.charge).toBeGreaterThan(naturalChargeOnly + 0.5)
  })

  it('activates beam-lance at full charge and resets that slot', () => {
    const stage = createStageDefinition('normal')
    const runtime = createBattleRuntime({ difficulty: 'normal', stage })

    runtime.update(stage.boss.startAt + 9)

    expect(runtime.activateSpecial(beamLance)).toBe(true)

    const snapshot = runtime.getSnapshot()
    const slot = snapshot.specialSlots.find((candidate) => candidate.id === beamLance)

    expect(slot?.charge).toBe(0)
    expect(slot?.active).toBe(true)
    expect(slot?.activeRatio).toBe(1)
    expect(snapshot.specialBeam).toMatchObject({
      angle: 0,
      width: 0.42,
      length: 7,
    })
  })
})
```

- [ ] **Step 5: Add failing damage and sparkle tests**

Add these tests inside the same `special attack runtime` describe block:

```ts
it('damages enemies inside the active beam strip and creates sparkles', () => {
  const runtime = createBattleRuntime({
    difficulty: 'normal',
    stage: createSpecialEnemyOnlyStage(),
  })

  runtime.update(0.22)
  runtime.activateSpecial(beamLance)
  runtime.update(0.3)

  const snapshot = runtime.getSnapshot()

  expect(snapshot.enemies.length).toBe(0)
  expect(snapshot.sparkles.length).toBeGreaterThan(0)
  expect(snapshot.sparkles[0]?.position.x).toBeCloseTo(0, 1)
})

it('damages the boss while the boss intersects the active beam', () => {
  const runtime = createBattleRuntime({
    difficulty: 'normal',
    stage: createSpecialTestStage(),
  })

  runtime.update(0.22)

  const before = runtime.getSnapshot().boss?.hpRatio
  runtime.activateSpecial(beamLance)
  runtime.update(0.5)
  const after = runtime.getSnapshot().boss?.hpRatio

  expect(before).toBeDefined()
  expect(after).toBeDefined()
  expect(after!).toBeLessThan(before!)
})

it('misses enemies outside the active beam width or behind the player', () => {
  const stage = createSpecialTestStage()
  const runtime = createBattleRuntime({
    difficulty: 'normal',
    stage: {
      ...stage,
      waves: [
        {
          ...stage.waves[0]!,
          spacing: 0,
          count: 1,
        },
      ],
    },
  })

  runtime.beginDrag({ x: 3, z: -1.85 })
  runtime.update(0.22)
  runtime.activateSpecial(beamLance)
  runtime.update(0.3)

  expect(runtime.getSnapshot().enemies.length).toBe(1)
})

it('expires beam-lance sparkles after their lifetime', () => {
  const runtime = createBattleRuntime({
    difficulty: 'normal',
    stage: createSpecialEnemyOnlyStage(),
  })

  runtime.update(0.22)
  runtime.activateSpecial(beamLance)
  runtime.update(0.3)

  expect(runtime.getSnapshot().sparkles.length).toBeGreaterThan(0)

  runtime.update(3)

  expect(runtime.getSnapshot().sparkles.length).toBe(0)
})
```

- [ ] **Step 6: Run tests and confirm they fail for the right reason**

Run:

```powershell
npm test -- src/game/runtime/battleRuntime.test.ts
```

Expected: FAIL because `specialSlots`, `specialBeam`, `sparkles`, and `activateSpecial` are not implemented yet.

- [ ] **Step 7: Commit failing tests and types**

Run:

```powershell
git add -- src/game/types.ts src/game/runtime/battleRuntime.test.ts
git commit -m "Test battle special attack runtime"
```

Expected: commit succeeds with failing tests documented by the prior command output.

---

## Task 3: Implement Runtime Charge, Activation, Beam Damage, And Sparkles

**Files:**
- Modify: `src/game/runtime/battleRuntime.ts`

- [ ] **Step 1: Import special render types**

Update the type import in `src/game/runtime/battleRuntime.ts`:

```ts
import type {
  ArenaPoint,
  BattleSnapshot,
  Difficulty,
  EnemyWave,
  RenderBoss,
  RenderBullet,
  RenderEnemy,
  RenderSparkle,
  RenderSpecialBeam,
  RenderSpecialSlot,
  RunResult,
  SpecialSlotId,
  StageDefinition,
} from '../types'
```

- [ ] **Step 2: Add special constants and sparkle type**

Add below `enemySpawnEntry`:

```ts
const beamLanceConfig = {
  id: 'beam-lance',
  icon: 'beam',
  maxCharge: 100,
  chargeAtBossRatio: 92,
  enemyDefeatCharge: 0.85,
  activeDuration: 2.4,
  beamWidth: 0.42,
  beamLength: 7,
  damagePerSecond: 180,
  sparkleInterval: 0.08,
  sparkleLife: 0.36,
} as const
```

Add a runtime sparkle type near the other runtime types:

```ts
type RuntimeSparkle = {
  id: string
  x: number
  z: number
  age: number
  life: number
  intensity: number
}
```

- [ ] **Step 3: Add special runtime state**

Inside `createBattleRuntime`, add these state variables near the other counters:

```ts
const sparkles: RuntimeSparkle[] = []
const specialChargeRate =
  stage.boss.startAt > 0
    ? beamLanceConfig.chargeAtBossRatio / stage.boss.startAt
    : beamLanceConfig.maxCharge
let specialCharge = 0
let specialActiveFor = 0
let specialSparkleTimer = 0
let lastSparkleId = 0
```

- [ ] **Step 4: Add special snapshot helpers**

Add these helpers before `buildSnapshot`:

```ts
const getSpecialSlot = (): RenderSpecialSlot => ({
  id: beamLanceConfig.id,
  icon: beamLanceConfig.icon,
  charge: Number(specialCharge.toFixed(2)),
  maxCharge: beamLanceConfig.maxCharge,
  ready: specialCharge >= beamLanceConfig.maxCharge && specialActiveFor <= 0,
  active: specialActiveFor > 0,
  activeRatio:
    specialActiveFor > 0
      ? clamp(specialActiveFor / beamLanceConfig.activeDuration, 0, 1)
      : 0,
})

const getSpecialBeam = (): RenderSpecialBeam | null => {
  if (specialActiveFor <= 0) {
    return null
  }

  return {
    origin: { x: player.x, z: player.z + 0.18 },
    angle: 0,
    width: beamLanceConfig.beamWidth,
    length: beamLanceConfig.beamLength,
  }
}
```

- [ ] **Step 5: Add special fields to snapshots**

Inside `buildSnapshot`, add these fields to the returned object:

```ts
specialSlots: [getSpecialSlot()],
specialBeam: getSpecialBeam(),
sparkles: sparkles.map((sparkle) => ({
  id: sparkle.id,
  position: { x: sparkle.x, z: sparkle.z },
  age: sparkle.age,
  life: sparkle.life,
  intensity: sparkle.intensity,
})),
```

- [ ] **Step 6: Add charge, beam hit, and sparkle helpers**

Add these helpers before `updateEnemies`:

```ts
const addSpecialCharge = (amount: number) => {
  if (specialActiveFor > 0 || result) {
    return
  }

  specialCharge = clamp(
    specialCharge + amount,
    0,
    beamLanceConfig.maxCharge,
  )
}

const spawnSparkle = (x: number, z: number, intensity = 1) => {
  sparkles.push({
    id: `sparkle-${lastSparkleId++}`,
    x,
    z,
    age: 0,
    life: beamLanceConfig.sparkleLife,
    intensity,
  })
}

const isInsideBeam = (target: ArenaPoint, radius: number) => {
  const beam = getSpecialBeam()
  if (!beam) {
    return false
  }

  const dz = target.z - beam.origin.z
  return (
    Math.abs(target.x - beam.origin.x) <= beam.width / 2 + radius &&
    dz >= 0 &&
    dz <= beam.length
  )
}
```

- [ ] **Step 7: Award enemy defeat charge**

In `updateEnemies`, replace the removal block:

```ts
if (enemy.z < -3.3 || enemy.hp <= 0) {
  enemies.splice(index, 1)
}
```

with:

```ts
if (enemy.hp <= 0) {
  addSpecialCharge(beamLanceConfig.enemyDefeatCharge)
  enemies.splice(index, 1)
  continue
}

if (enemy.z < -3.3) {
  enemies.splice(index, 1)
}
```

- [ ] **Step 8: Add special update logic**

Add this function before `updateEnemies`:

```ts
const updateSpecial = (delta: number) => {
  for (let index = sparkles.length - 1; index >= 0; index -= 1) {
    const sparkle = sparkles[index]
    sparkle.age += delta
    if (sparkle.age >= sparkle.life) {
      sparkles.splice(index, 1)
    }
  }

  if (specialActiveFor <= 0) {
    addSpecialCharge(specialChargeRate * delta)
    return
  }

  specialActiveFor = Math.max(0, specialActiveFor - delta)
  specialSparkleTimer -= delta
  const canSpawnSparkle = specialSparkleTimer <= 0
  let spawnedSparkle = false
  const damage = beamLanceConfig.damagePerSecond * delta

  for (const enemy of enemies) {
    if (!isInsideBeam({ x: enemy.x, z: enemy.z }, enemy.hitRadius)) {
      continue
    }

    enemy.hp -= damage
    if (canSpawnSparkle) {
      spawnSparkle(enemy.x, enemy.z, 1)
      spawnedSparkle = true
    }
  }

  if (boss && isInsideBeam({ x: boss.x, z: boss.z }, 0.44)) {
    boss.hp -= damage
    if (canSpawnSparkle) {
      spawnSparkle(boss.x, boss.z, 1.25)
      spawnedSparkle = true
    }
  }

  if (spawnedSparkle) {
    specialSparkleTimer = beamLanceConfig.sparkleInterval
  }
}
```

- [ ] **Step 9: Call special update before enemies and boss update**

Inside `update`, after the player auto-fire block and before `updateEnemies(delta)`, add:

```ts
updateSpecial(delta)
```

- [ ] **Step 10: Return activateSpecial**

In the returned runtime object, add:

```ts
activateSpecial(id: SpecialSlotId) {
  if (
    id !== beamLanceConfig.id ||
    result ||
    specialActiveFor > 0 ||
    specialCharge < beamLanceConfig.maxCharge
  ) {
    return false
  }

  specialCharge = 0
  specialActiveFor = beamLanceConfig.activeDuration
  specialSparkleTimer = 0
  cuePulse += 1
  emit()
  return true
},
```

- [ ] **Step 11: Run runtime tests**

Run:

```powershell
npm test -- src/game/runtime/battleRuntime.test.ts
```

Expected: runtime tests pass.

- [ ] **Step 12: Commit runtime implementation**

Run:

```powershell
git add -- src/game/runtime/battleRuntime.ts
git commit -m "Implement beam lance battle runtime"
```

Expected: commit succeeds.

---

## Task 4: Add UI Tests For Circular Special Slot

**Files:**
- Modify: `src/game/ui/BattleView.test.ts`

- [ ] **Step 1: Import fireEvent and beforeEach**

Change the Testing Library import:

```ts
import { fireEvent, render, screen } from '@testing-library/react'
```

Change the Vitest import:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
```

- [ ] **Step 2: Add a mutable mocked runtime**

Before `vi.mock('./useBattleRuntime', ...)`, add:

```ts
const { mockActivateSpecial, mockSnapshot } = vi.hoisted(() => ({
  mockActivateSpecial: vi.fn(),
  mockSnapshot: {
    difficulty: 'normal',
    stageName: 'Test Stage',
    elapsed: 0,
    duration: 90,
    phaseLabel: 'Opening',
    player: {
      position: { x: 0, z: -3 },
      hp: 3,
      invulnerable: false,
    },
    enemies: [
      {
        id: 'sentinel-1',
        kind: 'brass-cloud-sentinel',
        archetype: 'sentinel',
        variant: 'brass-cloud-sentinel',
        atlasId: 'enemy-brass-cloud',
        frameId: 'sentinel',
        position: { x: -1, z: 1 },
        scale: 0.72,
        hitRadius: 0.28,
      },
      {
        id: 'weaver-1',
        kind: 'brass-cloud-weaver',
        archetype: 'weaver',
        variant: 'brass-cloud-weaver',
        atlasId: 'enemy-brass-cloud',
        frameId: 'weaver',
        position: { x: 1, z: 1 },
        scale: 0.82,
        hitRadius: 0.34,
      },
    ],
    boss: null,
    bullets: [],
    specialSlots: [
      {
        id: 'beam-lance',
        icon: 'beam',
        charge: 50,
        maxCharge: 100,
        ready: false,
        active: false,
        activeRatio: 0,
      },
    ],
    specialBeam: null,
    sparkles: [],
    playerShots: 0,
    hitsTaken: 0,
    bossEnteredCount: 0,
    cuePulse: 0,
    result: null,
  },
}))
```

Replace the existing `vi.mock('./useBattleRuntime', ...)` block with:

```ts
vi.mock('./useBattleRuntime', () => ({
  useBattleRuntime: () => ({
    runtime: {
      update: vi.fn(),
      beginDrag: vi.fn(),
      moveDrag: vi.fn(),
      endDrag: vi.fn(),
      activateSpecial: mockActivateSpecial,
    },
    snapshot: mockSnapshot,
  }),
}))
```

- [ ] **Step 3: Add circular slot tests**

Add these tests inside `describe('BattleView', ...)`:

```ts
it('renders a circular beam-lance special slot with radial charge state', () => {
  const { container } = render(
    createElement(BattleView, { difficulty: 'normal', onComplete: vi.fn() }),
  )

  const button = screen.getByRole('button', {
    name: /activate beam lance special/i,
  })

  expect(button).toBeDisabled()
  expect(button).toHaveAttribute('aria-valuenow', '50')
  expect(container.querySelector('.battle-special-slot')).toBeInTheDocument()
  expect(container.querySelector('.battle-special-slot__icon')).toBeInTheDocument()
})

it('activates beam-lance from the ready circular slot', () => {
  mockSnapshot.specialSlots = [
    {
      id: 'beam-lance',
      icon: 'beam',
      charge: 100,
      maxCharge: 100,
      ready: true,
      active: false,
      activeRatio: 0,
    },
  ]

  render(createElement(BattleView, { difficulty: 'normal', onComplete: vi.fn() }))

  fireEvent.click(
    screen.getByRole('button', {
      name: /activate beam lance special/i,
    }),
  )

  expect(mockActivateSpecial).toHaveBeenCalledWith('beam-lance')
})
```

Add `beforeEach` inside the `BattleView` describe block:

```ts
beforeEach(() => {
  mockActivateSpecial.mockClear()
  mockSnapshot.specialSlots = [
    {
      id: 'beam-lance',
      icon: 'beam',
      charge: 50,
      maxCharge: 100,
      ready: false,
      active: false,
      activeRatio: 0,
    },
  ]
})
```

- [ ] **Step 4: Run UI tests and confirm they fail**

Run:

```powershell
npm test -- src/game/ui/BattleView.test.ts
```

Expected: FAIL because the circular slot UI is not implemented yet.

- [ ] **Step 5: Commit UI tests**

Run:

```powershell
git add -- src/game/ui/BattleView.test.ts
git commit -m "Test battle special slot UI"
```

Expected: commit succeeds with failing tests documented by the prior command output.

---

## Task 5: Implement Circular Slot HUD, R3F Beam, And Sparkles

**Files:**
- Modify: `src/game/ui/BattleView.tsx`
- Modify: `src/style.css`

- [ ] **Step 1: Import special render types**

Update the type import in `src/game/ui/BattleView.tsx`:

```ts
import type {
  ArenaPoint,
  BattleSnapshot,
  Difficulty,
  RenderBullet,
  RenderEnemy,
  RenderSparkle,
  RenderSpecialBeam,
  RenderSpecialSlot,
  RunResult,
} from '../types'
```

- [ ] **Step 2: Pass special state into PlayerSprite**

In `RuntimeEntityLayer`, change the `PlayerSprite` call to:

```tsx
<PlayerSprite
  battleElapsed={snapshot.elapsed}
  position={arenaPointToView(snapshot.player.position, 0.65)}
  specialActive={snapshot.specialSlots.some((slot) => slot.active)}
/>
```

- [ ] **Step 3: Add beam mesh component**

Add this component before `RuntimeEntityLayer`:

```tsx
function SpecialBeamMesh({ beam }: { beam: RenderSpecialBeam }) {
  const groupRef = useRef<THREE.Group>(null)
  const origin = arenaPointToView(beam.origin, 0.82)
  const viewWidth = Math.max(0.16, beam.width * 0.55)
  const viewLength = beam.length * 0.9

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * 18) * 0.06
    groupRef.current.scale.x = pulse
  })

  return (
    <group
      ref={groupRef}
      position={[origin[0], origin[1] + viewLength / 2, origin[2] + 0.08]}
    >
      <mesh>
        <planeGeometry args={[viewWidth * 2.8, viewLength]} />
        <meshBasicMaterial
          color="#52f5ff"
          transparent
          opacity={0.18}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[viewWidth * 1.35, viewLength]} />
        <meshBasicMaterial
          color="#ffd27b"
          transparent
          opacity={0.36}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[viewWidth * 0.48, viewLength]} />
        <meshBasicMaterial
          color="#fff7df"
          transparent
          opacity={0.82}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {[-0.36, -0.12, 0.12, 0.36].map((offset) => (
        <mesh key={offset} position={[0, viewLength * offset, 0.04]}>
          <ringGeometry args={[viewWidth * 0.85, viewWidth * 1.12, 36]} />
          <meshBasicMaterial
            color={offset < 0 ? '#69f0e3' : '#f7c46b'}
            transparent
            opacity={0.34}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}
```

- [ ] **Step 4: Add sparkle mesh component**

Add this component before `RuntimeEntityLayer`:

```tsx
function SparkleMesh({ sparkle }: { sparkle: RenderSparkle }) {
  const ratio = Math.min(1, sparkle.age / sparkle.life)
  const opacity = Math.max(0, 1 - ratio)
  const radius = 0.06 + ratio * 0.16 * sparkle.intensity

  return (
    <group position={arenaPointToView(sparkle.position, 0.9)}>
      <mesh>
        <circleGeometry args={[radius, 18]} />
        <meshBasicMaterial
          color="#fff4d7"
          transparent
          opacity={opacity * 0.86}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <ringGeometry args={[radius * 1.15, radius * 1.38, 4]} />
        <meshBasicMaterial
          color="#69f0e3"
          transparent
          opacity={opacity * 0.72}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 8]}>
        <ringGeometry args={[radius * 1.55, radius * 1.72, 6]} />
        <meshBasicMaterial
          color="#f8b56b"
          transparent
          opacity={opacity * 0.48}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 5: Render beam and sparkles in RuntimeEntityLayer**

In `RuntimeEntityLayer`, after bullets, add:

```tsx
{snapshot.specialBeam ? <SpecialBeamMesh beam={snapshot.specialBeam} /> : null}
{snapshot.sparkles.map((sparkle) => (
  <SparkleMesh key={sparkle.id} sparkle={sparkle} />
))}
```

- [ ] **Step 6: Add special slot HUD component**

Add this component before `BattleView`:

```tsx
function SpecialSlotHud({
  slots,
  onActivate,
}: {
  slots: RenderSpecialSlot[]
  onActivate: (slotId: RenderSpecialSlot['id']) => void
}) {
  return (
    <div className="battle-specials" aria-label="Special attacks">
      {slots.map((slot) => {
        const chargeRatio = Math.min(1, slot.charge / slot.maxCharge)

        return (
          <button
            key={slot.id}
            type="button"
            className={`battle-special-slot ${
              slot.ready ? 'battle-special-slot--ready' : ''
            } ${slot.active ? 'battle-special-slot--active' : ''}`}
            style={{ '--special-charge': `${chargeRatio * 360}deg` } as React.CSSProperties}
            disabled={!slot.ready}
            aria-label="Activate Beam Lance special"
            aria-valuemin={0}
            aria-valuemax={slot.maxCharge}
            aria-valuenow={Math.round(slot.charge)}
            onClick={() => onActivate(slot.id)}
          >
            <span className="battle-special-slot__icon" aria-hidden="true">
              <svg viewBox="0 0 48 48" focusable="false">
                <path d="M24 5l7 18-7 20-7-20 7-18z" />
                <path d="M13 27h22" />
                <path d="M18 35h12" />
              </svg>
            </span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 7: Render the special slot HUD**

In `BattleView`, after the existing `battle-hud` block, add:

```tsx
<SpecialSlotHud
  slots={snapshot.specialSlots}
  onActivate={(slotId) => runtime.activateSpecial(slotId)}
/>
```

- [ ] **Step 8: Add CSS for circular radial slot**

In `src/style.css`, add near the battle HUD styles:

```css
.battle-specials {
  position: absolute;
  right: max(14px, env(safe-area-inset-right));
  bottom: max(18px, env(safe-area-inset-bottom));
  z-index: 6;
  display: grid;
  gap: 10px;
  pointer-events: none;
}

.battle-special-slot {
  --special-charge: 0deg;
  width: 72px;
  aspect-ratio: 1;
  border-radius: 50%;
  padding: 5px;
  position: relative;
  display: grid;
  place-items: center;
  color: var(--cream);
  background:
    conic-gradient(var(--teal) var(--special-charge), rgba(255, 255, 255, 0.14) 0),
    rgba(6, 11, 18, 0.68);
  border: 1px solid rgba(213, 168, 105, 0.3);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.34);
  pointer-events: auto;
  touch-action: manipulation;
}

.battle-special-slot::before {
  content: '';
  position: absolute;
  inset: 6px;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(14, 29, 38, 0.96), rgba(5, 9, 17, 0.94));
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.battle-special-slot:disabled {
  cursor: default;
}

.battle-special-slot--ready {
  box-shadow:
    0 0 26px rgba(105, 240, 227, 0.34),
    0 12px 30px rgba(0, 0, 0, 0.34);
}

.battle-special-slot--active {
  animation: special-slot-pulse 520ms ease-in-out infinite alternate;
}

.battle-special-slot__icon {
  position: relative;
  z-index: 1;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  color: rgba(255, 244, 223, 0.54);
}

.battle-special-slot--ready .battle-special-slot__icon,
.battle-special-slot--active .battle-special-slot__icon {
  color: var(--cream);
}

.battle-special-slot__icon svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
  stroke: #69f0e3;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@keyframes special-slot-pulse {
  from {
    transform: scale(1);
  }

  to {
    transform: scale(1.06);
  }
}
```

- [ ] **Step 9: Run UI tests**

Run:

```powershell
npm test -- src/game/ui/BattleView.test.ts
```

Expected: UI tests pass.

- [ ] **Step 10: Commit UI implementation**

Run:

```powershell
git add -- src/game/ui/BattleView.tsx src/style.css
git commit -m "Add beam lance battle UI"
```

Expected: commit succeeds.

---

## Task 6: Full Verification And Browser Capture

**Files:**
- Create or update: `output/playwright/battle-special-attack.png`

- [ ] **Step 1: Run the full automated suite**

Run:

```powershell
npm test
npm run typecheck
npm run build
```

Expected:

- `npm test` passes.
- `npm run typecheck` exits `0`.
- `npm run build` exits `0`.
- Existing Vite chunk-size warning is acceptable.

- [ ] **Step 2: Start a local dev server**

Run:

```powershell
npm run dev -- --host 127.0.0.1
```

Expected: Vite serves the app on an available localhost port. Use the printed port in the browser verification steps.

- [ ] **Step 3: Verify in browser**

Using Playwright or the in-app browser:

1. Open `http://127.0.0.1:<port>/?fastStage=true&invincible=true`.
2. Click `Start Sortie`.
3. Select `Easy`.
4. Click `Deploy`.
5. Wait for the boss timing.
6. Confirm the circular `beam-lance` slot ring becomes full.
7. Click the circular special button.
8. Confirm a bright layered beam appears from the player upward.
9. Confirm sparkle effects appear when the beam intersects the boss or enemies.
10. Drag the playfield after pressing the special button and confirm player movement still works.

- [ ] **Step 4: Save screenshot evidence**

Save a screenshot to:

```powershell
output\playwright\battle-special-attack.png
```

Expected: screenshot shows the active beam or the ready circular special slot during battle.

- [ ] **Step 5: Stop the dev server**

Stop the Vite process started in Step 2.

Expected: no lingering Vite process remains for this verification session.

- [ ] **Step 6: Commit screenshot evidence if intentionally tracked**

Check status:

```powershell
git status --short
```

If `output/playwright/battle-special-attack.png` is intended as tracked evidence for this feature, run:

```powershell
git add -- output/playwright/battle-special-attack.png
git commit -m "Capture beam lance battle verification"
```

If the output folder is not part of the intended commit set, leave the screenshot untracked and mention it in the final report.

---

## Completion Checklist

- `nuqs` is installed and query flags no longer use direct `URLSearchParams` in `App.tsx`.
- `BattleSnapshot` exposes `specialSlots`, `specialBeam`, and `sparkles`.
- `runtime.activateSpecial('beam-lance')` is implemented and tested.
- Natural charge reaches roughly `92` by `stage.boss.startAt`.
- Enemy defeat grants charge.
- Active beam damages enemies and boss.
- Beam hit sparkles render from runtime events.
- UI uses a circular icon button with radial gauge fill.
- Player sprite uses the reserved special pose while the beam is active.
- Drag movement still works after special button interaction.
- `npm test`, `npm run typecheck`, and `npm run build` pass.
