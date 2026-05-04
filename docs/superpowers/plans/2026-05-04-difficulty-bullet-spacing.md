# Difficulty Bullet Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce enemy bullet pressure across `easy`, `normal`, and `hard` while keeping `easy < normal < hard` difficulty ordering.

**Architecture:** Keep stage timelines and authored phase identities stable. Apply the balance change through the existing shared difficulty scaling layers for regular enemies and bosses, then update tests that encode the tuning contract.

**Tech Stack:** TypeScript, Vitest, Vite.

---

## File Structure

- Modify `src/game/content/enemies.ts`: update only the bullet-related fields in `tuningByDifficulty`; keep HP and wave placement behavior unchanged.
- Modify `src/game/content/enemies.test.ts`: replace loose pressure assertions with exact regular-enemy scaling expectations for easy, normal, and hard.
- Create `src/game/content/bossScaling.test.ts`: add direct tests for `scaleBossPattern(...)` covering classic and BulletML boss pattern tuning.
- Modify `src/game/content/bossScaling.ts`: update boss and midboss difficulty tuning for classic and BulletML patterns.
- Modify `src/game/content/stage1.test.ts`: update exact Stage 1 classic boss count expectations.
- Modify `src/game/content/stage2.test.ts`: update exact Stage 2 BulletML normal-rank expectation and strengthen difficulty-order assertions for rank and interval.

Do not modify `src/game/content/stage1.ts`, `stage2.ts`, or `stage3.ts` unless tests prove that the shared tuning layer is insufficient. Do not modify the unrelated dirty files `src/game/ui/battleEntities.tsx`, `src/game/ui/battleEntities.test.tsx`, or `tmp/`.

---

### Preflight: Protect Current Workspace

**Files:**
- Read-only: git working tree and index

- [ ] **Step 1: Confirm branch and staged-file boundary**

Run:

```powershell
git status --short --branch
git diff --cached --name-only
```

Expected: `git diff --cached --name-only` prints nothing. `git status --short --branch` may show unrelated working-tree entries such as `src/game/ui/battleEntities.tsx`, `src/game/ui/battleEntities.test.tsx`, and `tmp/`, but no difficulty-work source file should already be staged.

- [ ] **Step 2: Stop if the index is not empty**

If `git diff --cached --name-only` prints any path, stop before editing and ask whether to keep or unstage the pre-existing staged files. Do not run broad `git add .` at any point in this plan.

---

### Task 1: Lock Regular Enemy Difficulty Scaling

**Files:**
- Modify: `src/game/content/enemies.test.ts`
- Modify: `src/game/content/enemies.ts`

- [ ] **Step 1: Replace regular enemy tuning tests with exact expectations**

In `src/game/content/enemies.test.ts`, replace these existing tests:

- `scales pattern count, speed, and interval by difficulty without changing shape`
- `reduces easy regular enemy bullet pressure below normal`
- `reduces easy split-pattern secondary bullets`
- `keeps difficulty bullet-count tuning restrained after enemy density increases`

with:

```ts
  it('scales regular enemy bullet pressure in easy normal hard order', () => {
    const easy = resolvePatternForDifficulty(enemyArchetypes.weaver.pattern, 'easy')
    const normal = resolvePatternForDifficulty(enemyArchetypes.weaver.pattern, 'normal')
    const hard = resolvePatternForDifficulty(enemyArchetypes.weaver.pattern, 'hard')
    const easyRing = resolvePatternForDifficulty(enemyArchetypes.sentinel.pattern, 'easy')
    const normalRing = resolvePatternForDifficulty(enemyArchetypes.sentinel.pattern, 'normal')
    const hardRing = resolvePatternForDifficulty(enemyArchetypes.sentinel.pattern, 'hard')

    expect(easy.shape).toBe(enemyArchetypes.weaver.pattern.shape)
    expect(normal.shape).toBe(enemyArchetypes.weaver.pattern.shape)
    expect(hard.shape).toBe(enemyArchetypes.weaver.pattern.shape)

    expect([easy.count, normal.count, hard.count]).toEqual([3, 5, 7])
    expect([easy.speed, normal.speed, hard.speed]).toEqual([0.82, 1.03, 1.18])
    expect([easy.interval, normal.interval, hard.interval]).toEqual([1.83, 1.27, 1.09])
    expect([easy.spread, normal.spread, hard.spread]).toEqual([1.08, 1.18, 1.27])
    expect([easy.wave?.amplitude, normal.wave?.amplitude, hard.wave?.amplitude]).toEqual([
      0.33,
      0.5,
      0.58,
    ])

    expect([easyRing.count, normalRing.count, hardRing.count]).toEqual([4, 6, 8])
    expect([easyRing.interval, normalRing.interval, hardRing.interval]).toEqual([
      2.63,
      1.84,
      1.56,
    ])
  })

  it('keeps easy spread wide enough to avoid narrow concentrated streams', () => {
    const easyFan = resolvePatternForDifficulty(enemyArchetypes.scout.pattern, 'easy')
    const normalFan = resolvePatternForDifficulty(enemyArchetypes.scout.pattern, 'normal')

    expect(easyFan.spread).toBeGreaterThanOrEqual(1)
    expect(easyFan.spread).toBeLessThan(normalFan.spread)
  })

  it('scales split-pattern secondary bullets in easy normal hard order', () => {
    const placement = {
      id: 'abyssal-splitter-pressure',
      archetype: 'splitter',
      variant: 'abyssal-biomech-splitter',
      count: 1,
      spacing: 1,
    } as const
    const easy = resolveEnemyWave('easy', placement)
    const normal = resolveEnemyWave('normal', placement)
    const hard = resolveEnemyWave('hard', placement)

    expect([easy.pattern.split?.count, normal.pattern.split?.count, hard.pattern.split?.count]).toEqual([
      1,
      3,
      4,
    ])
    expect(easy.pattern.interval).toBeGreaterThan(normal.pattern.interval)
    expect(normal.pattern.interval).toBeGreaterThan(hard.pattern.interval)
  })
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```powershell
npm test -- src/game/content/enemies.test.ts
```

Expected: `enemies.test.ts` fails because the current tuning still resolves weaver and sentinel ring pressure to the old values, and the abyssal splitter easy secondary count remains higher than the new target.

- [ ] **Step 3: Apply the regular enemy tuning**

In `src/game/content/enemies.ts`, update only the bullet-related values in `tuningByDifficulty`:

```ts
  easy: {
    hp: 1,
    bulletCount: 0.58,
    bulletSpeed: 0.78,
    interval: 1.55,
    spread: 0.9,
    splitCount: 0.4,
    waveAmplitude: 0.6,
  },
  normal: {
    hp: 1.12,
    bulletCount: 0.9,
    bulletSpeed: 0.98,
    interval: 1.08,
    spread: 0.98,
    splitCount: 0.85,
    waveAmplitude: 0.9,
  },
  hard: {
    hp: 1.28,
    bulletCount: 1.12,
    bulletSpeed: 1.12,
    interval: 0.92,
    spread: 1.06,
    splitCount: 1.25,
    waveAmplitude: 1.05,
  },
```

- [ ] **Step 4: Run the focused test and confirm it passes**

Run:

```powershell
npm test -- src/game/content/enemies.test.ts
```

Expected: PASS.

- [ ] **Step 5: Create Task 1 checkpoint commit**

Run:

```powershell
git add src/game/content/enemies.ts src/game/content/enemies.test.ts
git commit -m "Tune regular enemy bullet difficulty"
```

Expected: commit includes only `enemies.ts` and `enemies.test.ts`.

This is a checkpoint commit, not final completion. If a later repo-level gate fails because of Task 1, fix it with a narrow follow-up commit before reporting the difficulty work complete.

---

### Task 2: Lock Boss And BulletML Difficulty Scaling

**Files:**
- Create: `src/game/content/bossScaling.test.ts`
- Modify: `src/game/content/bossScaling.ts`
- Modify: `src/game/content/stage1.test.ts`
- Modify: `src/game/content/stage2.test.ts`

- [ ] **Step 1: Add direct boss scaling tests**

Create `src/game/content/bossScaling.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { scaleBossPattern } from './bossScaling'
import type { BossBulletPatternConfig, BulletmlPatternConfig } from '../types'

function expectClassic(pattern: BossBulletPatternConfig) {
  if ('engine' in pattern) {
    throw new Error('expected classic boss pattern')
  }

  return pattern
}

function expectScripted(pattern: BossBulletPatternConfig): BulletmlPatternConfig {
  if (!('engine' in pattern)) {
    throw new Error('expected BulletML boss pattern')
  }

  return pattern
}

describe('boss difficulty scaling', () => {
  it('reduces classic boss pressure across easy normal and hard', () => {
    const pattern = {
      shape: 'fan',
      count: 10,
      interval: 1,
      speed: 1,
      spread: 1,
      life: 8,
    } satisfies BossBulletPatternConfig

    const easy = expectClassic(scaleBossPattern(pattern, 'easy'))
    const normal = expectClassic(scaleBossPattern(pattern, 'normal'))
    const hard = expectClassic(scaleBossPattern(pattern, 'hard'))

    expect([easy.count, normal.count, hard.count]).toEqual([7, 9, 11])
    expect([easy.speed, normal.speed, hard.speed]).toEqual([0.85, 0.98, 1.12])
    expect([easy.interval, normal.interval, hard.interval]).toEqual([1.28, 1.06, 0.92])
  })

  it('reduces BulletML boss rank and repeated pattern interval', () => {
    const pattern = {
      engine: 'bulletml',
      interval: 0.5,
      rank: 0.5,
      action: [{ type: 'wait', seconds: 0.1 }],
    } satisfies BossBulletPatternConfig

    const easy = expectScripted(scaleBossPattern(pattern, 'easy'))
    const normal = expectScripted(scaleBossPattern(pattern, 'normal'))
    const hard = expectScripted(scaleBossPattern(pattern, 'hard'))

    expect([easy.rank, normal.rank, hard.rank]).toEqual([0.18, 0.42, 0.7])
    expect([easy.interval, normal.interval, hard.interval]).toEqual([0.64, 0.53, 0.46])
  })
})
```

- [ ] **Step 2: Update stage-level expectations that encode scaled boss values**

In `src/game/content/stage1.test.ts`, update `keeps wave timing stable across difficulties while scaling bullet counts` so the exact count assertions become:

```ts
    const normal = createStageDefinition('normal')
    const normalBoss = getBossFromStage(normal, 'final')

    expect(easyBoss.phases.map((phase) => expectClassicPattern(phase.pattern).count)).toEqual([
      6,
      7,
      9,
    ])
    expect(normalBoss.phases.map((phase) => expectClassicPattern(phase.pattern).count)).toEqual([
      8,
      9,
      11,
    ])
    expect(hardBoss.phases.map((phase) => expectClassicPattern(phase.pattern).count)).toEqual([
      9,
      11,
      13,
    ])
```

In `src/game/content/stage2.test.ts`, replace `raises classic counts and scripted ranks on hard difficulty` with:

```ts
  it('raises classic counts and scripted ranks on hard difficulty', () => {
    const easy = createStage2Definition('easy')
    const normal = createStage2Definition('normal')
    const hard = createStage2Definition('hard')
    const easyMidboss = getBossFromStage(easy, 'midboss')
    const normalMidboss = getBossFromStage(normal, 'midboss')
    const hardMidboss = getBossFromStage(hard, 'midboss')
    const easyBoss = getBossFromStage(easy, 'final')
    const normalBoss = getBossFromStage(normal, 'final')
    const hardBoss = getBossFromStage(hard, 'final')

    expect(hardMidboss.phases).toHaveLength(easyMidboss.phases.length)
    hardMidboss.phases.forEach((phase, index) => {
      const easyPattern = easyMidboss.phases[index]!.pattern
      const normalPattern = normalMidboss.phases[index]!.pattern

      if (isClassicPattern(phase.pattern)) {
        if (!isClassicPattern(easyPattern) || !isClassicPattern(normalPattern)) {
          throw new Error('expected matching classic midboss patterns')
        }

        expect(easyPattern.count).toBeLessThan(normalPattern.count)
        expect(normalPattern.count).toBeLessThan(phase.pattern.count)
        expect(easyPattern.speed).toBeLessThan(normalPattern.speed)
        expect(normalPattern.speed).toBeLessThan(phase.pattern.speed)
        expect(easyPattern.interval).toBeGreaterThan(normalPattern.interval)
        expect(normalPattern.interval).toBeGreaterThan(phase.pattern.interval)
        return
      }

      if (!isScriptedPattern(easyPattern) || !isScriptedPattern(normalPattern)) {
        throw new Error('expected matching BulletML midboss patterns')
      }

      expect([easyPattern.rank, normalPattern.rank, phase.pattern.rank]).toEqual([
        0.18,
        0.42,
        0.7,
      ])
      expect(easyPattern.interval).toBeGreaterThan(normalPattern.interval)
      expect(normalPattern.interval).toBeGreaterThan(phase.pattern.interval)
    })

    expect(hardBoss.phases).toHaveLength(easyBoss.phases.length)
    hardBoss.phases.forEach((phase, index) => {
      const easyPattern = easyBoss.phases[index]!.pattern
      const normalPattern = normalBoss.phases[index]!.pattern

      if (
        !isScriptedPattern(easyPattern) ||
        !isScriptedPattern(normalPattern) ||
        !isScriptedPattern(phase.pattern)
      ) {
        throw new Error('expected matching BulletML final boss patterns')
      }

      expect([easyPattern.rank, normalPattern.rank, phase.pattern.rank]).toEqual([
        0.18,
        0.42,
        0.7,
      ])
      expect(easyPattern.interval).toBeGreaterThan(normalPattern.interval)
      expect(normalPattern.interval).toBeGreaterThan(phase.pattern.interval)
    })
  })
```

In `uses BulletML-style scripted patterns for the Stage 2 final boss phases`, change the exact normal rank expectation:

```ts
        expect.objectContaining({ engine: 'bulletml', rank: 0.42 }),
```

- [ ] **Step 3: Run focused boss and stage tests and confirm they fail**

Run:

```powershell
npm test -- src/game/content/bossScaling.test.ts src/game/content/stage1.test.ts src/game/content/stage2.test.ts
```

Expected: failures show old boss tuning values: easy classic counts remain `[8, 10, 12]`, normal BulletML rank remains `0.5`, and hard BulletML rank remains `0.78`.

- [ ] **Step 4: Apply boss and BulletML tuning**

In `src/game/content/bossScaling.ts`, update the `bossTuningByDifficulty` values to:

```ts
{
  easy: { bulletCount: 0.74, bulletSpeed: 0.85, interval: 1.28, rank: 0.18 },
  normal: { bulletCount: 0.94, bulletSpeed: 0.98, interval: 1.06, rank: 0.42 },
  hard: { bulletCount: 1.12, bulletSpeed: 1.12, interval: 0.92, rank: 0.7 },
}
```

- [ ] **Step 5: Run focused boss and stage tests and confirm they pass**

Run:

```powershell
npm test -- src/game/content/bossScaling.test.ts src/game/content/stage1.test.ts src/game/content/stage2.test.ts
```

Expected: PASS.

- [ ] **Step 6: Create Task 2 checkpoint commit**

Run:

```powershell
git add src/game/content/bossScaling.ts src/game/content/bossScaling.test.ts src/game/content/stage1.test.ts src/game/content/stage2.test.ts
git commit -m "Tune boss bullet difficulty"
```

Expected: commit includes only boss scaling and directly related content tests.

This is a checkpoint commit, not final completion. If a later repo-level gate fails because of Task 2, fix it with a narrow follow-up commit before reporting the difficulty work complete.

---

### Task 3: Run Stage Coverage And Full Verification

**Files:**
- Modify only if failures prove necessary: `src/game/content/stage3.test.ts`

- [ ] **Step 1: Run all stage content tests**

Run:

```powershell
npm test -- src/game/content/stage1.test.ts src/game/content/stage2.test.ts src/game/content/stage3.test.ts
```

Expected: PASS. If `stage3.test.ts` fails only because it expects the old exact rank value, update that exact value to `0.42` for normal difficulty. Do not change stage source files for timing, placement, or boss phase authoring in this task.

- [ ] **Step 2: Run typecheck**

Run:

```powershell
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run the full test suite**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 5: Confirm unrelated dirty files were not staged**

Run:

```powershell
git status --short
git diff --cached --name-only
```

Expected: the unrelated `src/game/ui/battleEntities.tsx`, `src/game/ui/battleEntities.test.tsx`, and `tmp/` entries may still be present in working tree status, but they must not appear in the staged set for this difficulty work.

- [ ] **Step 6: Commit stage expectation fixes when files changed**

If Task 3 required only stage test expectation updates, run:

```powershell
git add src/game/content/stage3.test.ts
git commit -m "Update stage difficulty tuning expectations"
```

Expected: run this commit only when those files actually changed.

- [ ] **Step 7: Handle failures after checkpoint commits**

If `npm run typecheck`, `npm test`, or `npm run build` fails after Task 1 or Task 2 checkpoint commits, fix the failure in the narrowest related file set, rerun the failed command, then rerun:

```powershell
npm run typecheck
npm test
npm run build
```

Expected: all three commands pass before final completion is reported. Commit any corrective change with an explicit message such as:

```powershell
git add <exact related files>
git commit -m "Fix difficulty tuning verification"
```

---

## Self-Review Checklist

- The plan implements the spec through `enemies.ts` and `bossScaling.ts` first.
- Stage source authoring remains unchanged unless shared tuning proves insufficient.
- HP, player controls, hitboxes, scoring, combo, item drops, visual rendering, and wave timings are out of scope.
- Tests encode `easy < normal < hard` pressure ordering for regular enemies, classic bosses, and BulletML bosses.
- Verification uses focused content tests before repo-level gates.
- Existing unrelated dirty files are explicitly excluded from staging.
