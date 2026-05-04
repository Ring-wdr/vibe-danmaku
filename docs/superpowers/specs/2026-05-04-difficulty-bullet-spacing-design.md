# Difficulty Bullet Spacing Design

## Goal

Reduce battle difficulty across all difficulty levels by widening practical
enemy-bullet dodge space.

The requested balance direction is:

- `easy`: major reduction.
- `normal`: clear reduction.
- `hard`: slight reduction.

The main complaint is not only total bullet volume. Some high-output enemies
create bullet lanes that are close enough together that dodging can become
physically unrealistic. The tuning should therefore lower pressure through
fewer bullets, slower bullets, and longer fire intervals while keeping the
relative ordering `easy < normal < hard`.

## Approved Direction

Use the shared difficulty tuning layers first:

- Regular enemies: `src/game/content/enemies.ts`
- Bosses and midbosses: `src/game/content/bossScaling.ts`

Do not rewrite individual stage timelines as the first step. The existing
`stage1.ts`, `stage2.ts`, and `stage3.ts` authoring should remain
the source of stage pacing, enemy order, and boss phase identity. Stage-specific
edits are only in scope if tests show that a named authored pattern still
violates the new difficulty intent after shared tuning is applied.

## Current Context

Regular enemy waves already pass through `resolvePatternForDifficulty(...)`.
That function scales:

- bullet count
- bullet speed
- firing interval
- fan or wave spread
- split bullet count
- wave-pattern amplitude

Bosses and midbosses pass through `scaleBossDefinition(...)`. Classic boss
patterns scale count, interval, and speed. BulletML-style boss patterns scale
interval and rank.

This is the right boundary for the change because it keeps authored stage data
stable while making the difficulty policy explicit and testable.

## Tuning Policy

Regular enemy tuning should move to this target shape:

| Difficulty | Bullet Count | Bullet Speed | Fire Interval | Spread | Split Count | Wave Amplitude |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | ~0.55-0.60x | ~0.75-0.80x | ~1.50-1.60x | ~0.88-0.95x | ~0.35-0.45x | ~0.55-0.65x |
| normal | ~0.88-0.95x | ~0.95-1.00x | ~1.05-1.12x | ~0.96-1.00x | ~0.80-0.90x | ~0.85-0.95x |
| hard | ~1.08-1.14x | ~1.08-1.13x | ~0.88-0.94x | ~1.04-1.08x | ~1.15-1.25x | ~1.02-1.07x |

Boss and midboss tuning should move to this target shape:

| Difficulty | Classic Count | Classic Speed | Classic Interval | BulletML Rank | BulletML Interval |
| --- | ---: | ---: | ---: | ---: | ---: |
| easy | ~0.70-0.78x | ~0.82-0.88x | ~1.22-1.32x | ~0.16-0.22 | ~1.22-1.32x |
| normal | ~0.92-1.00x | ~0.96-1.00x | ~1.04-1.10x | ~0.38-0.45 | ~1.04-1.10x |
| hard | ~1.08-1.14x | ~1.10-1.14x | ~0.88-0.94x | ~0.68-0.72 | ~0.88-0.94x |

These ranges intentionally preserve hard as the hardest option. Hard is still
allowed to increase bullet count and speed compared with normal, but less
aggressively than before.

## Bullet Spacing Rules

For regular enemies, practical spacing should be improved primarily by lowering
`count` and increasing `interval`. Spread should not be used as the main
difficulty reduction lever because reducing spread too far can make aimed or
fan patterns feel more concentrated instead of safer.

For ring patterns, lower count is the main spacing control. For fan, needle,
wave, and split patterns, lower count plus slower speed is the main control.
For split patterns, secondary split count must also drop on easy so the first
shot does not look safe but later become overcrowded.

For BulletML bosses, rank and interval are the shared levers. Lower rank reduces
rank-scaled repeat counts and speed expressions in authored scripts, while a
larger interval lowers repeated phase pressure when patterns loop or restart.

## Non-Goals

Do not change player movement, player hitbox, player damage, enemy HP, boss HP,
stage duration, wave spawn times, score rules, combo rules, item drops, or
visual bullet rendering as part of this balance pass.

Those systems can affect perceived difficulty, but the current request is
specifically about enemy bullet density and dodge spacing.

## Tests

Update existing content tests rather than adding browser-only verification.

Regular enemy tests should assert:

- `easy` has lower count and speed than `normal`.
- `easy` has longer interval than `normal`.
- `normal` has lower pressure than `hard`.
- split secondary count follows the same easy < normal < hard ordering.
- spread remains bounded so easy does not become a narrow concentrated stream.

Boss tests should assert:

- classic boss pattern count and speed follow easy < normal < hard.
- classic boss interval follows easy > normal > hard.
- BulletML rank follows easy < normal < hard with the new lower values.
- BulletML interval follows easy > normal > hard.

Stage tests should only change where they currently lock exact scaled values
that are expected to move under the new policy.

## Verification

Run the focused content tests first:

- `npm test -- src/game/content/enemies.test.ts`
- `npm test -- src/game/content/stage1.test.ts src/game/content/stage2.test.ts src/game/content/stage3.test.ts`

Then run the repo-level gates:

- `npm run typecheck`
- `npm test`
- `npm run build`

## Implementation Boundary

The implementation should touch only the tuning source and the tests that
encode the new balance policy unless stage-specific evidence requires a narrow
exception.

Do not modify the current unrelated `src/game/ui/battleEntities.tsx`,
`src/game/ui/battleEntities.test.tsx`, or `tmp/` working-tree content as part of
this difficulty pass.
