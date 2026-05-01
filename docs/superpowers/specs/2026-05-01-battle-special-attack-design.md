# Battle Special Attack Design

## Goal

Add a manually triggered special attack to the battle screen.

The player should usually have the special ready around the current Stage 1 boss arrival timing. The special should feel like a high-impact boss opener or emergency damage window, not a passive background buff.

## Approved Direction

Use hybrid charge generation:

- Natural recovery fills most of the gauge by `stage.boss.startAt`.
- Enemy defeats add a small charge bonus.
- The player manually triggers the special when the gauge is full.

Do not add collectible charge items in this pass. Item drops would require new spawn, pickup, attraction, and miss-state rules, which is more system surface than the first special attack needs.

## Player Experience

The battle HUD shows a special gauge and an activation button.

- Before full charge, the button is visibly unavailable.
- At full charge, the button becomes active.
- Pressing the button starts the special immediately.
- During the special, the player keeps normal drag movement and auto-fire behavior.
- When the special starts, the gauge resets to empty and starts charging again only after the active window ends.

The special should usually become available just before or shortly after the boss appears in Stage 1:

- Normal Stage 1 boss arrival is currently `78s`.
- Fast-stage verification uses the scaled `stage.boss.startAt`, currently `17.16s`.
- Charge timing should be derived from `stage.boss.startAt`, not hard-coded to a fixed second value.

## Special Attack Behavior

The special is a sustained straight beam fired from the player upward at angle `0`.
In this runtime, angle `0` means the arena's positive `z` direction, visually upward from the player toward enemies and the boss.

Runtime behavior:

- The beam lasts for a short fixed duration.
- The beam origin tracks the current player position while active.
- The beam uses a narrow but readable hit width.
- Enemies inside the beam line take high tick damage.
- The boss takes high tick damage while intersecting the beam line.
- Existing player bullets continue to fire normally.
- Enemy bullets are not cleared by the beam in this pass.

The first implementation should focus the special identity on damage, not screen-clearing utility. This keeps the mechanic distinct from a bomb and makes the boss-timing charge rule matter.

Suggested initial tuning:

- Charge cap: `100`.
- Natural charge rate: `92 / stage.boss.startAt` charge per second.
- Enemy defeat bonus: `0.85` charge per defeated enemy.
- Active duration: `2.4s`.
- Beam width: `0.42` arena units.
- Beam length: `7.0` arena units.
- Beam damage: `180` damage per second to regular enemies and bosses.

Exact numbers can be tuned during implementation tests and browser verification.

## Runtime Architecture

`createBattleRuntime` remains the source of truth for special state and beam damage.

Add runtime state for:

- `specialCharge`
- `specialActiveFor`
- `specialSparkleTimer`
- recent beam hit sparkle events

Expose special state through `BattleSnapshot`:

```ts
special: {
  charge: number
  maxCharge: number
  ready: boolean
  active: boolean
  activeRatio: number
}
```

Expose beam render data only while active:

```ts
specialBeam: {
  origin: ArenaPoint
  angle: 0
  width: number
  length: number
} | null
```

Expose short-lived sparkle render data:

```ts
sparkles: Array<{
  id: string
  position: ArenaPoint
  age: number
  life: number
  intensity: number
}>
```

Add a runtime method:

```ts
activateSpecial(): boolean
```

It returns `true` only when the gauge is full and no result has been reached. Invalid activation attempts should leave state unchanged.

## Damage And Hit Events

Beam collision should be deterministic and testable in the runtime.

For angle `0`, treat the beam as a vertical strip extending upward from the player:

- Target `x` must be within the beam half-width plus target hit radius.
- Target `z` must be above the player origin and within beam length.

During each update tick while active:

- Apply damage scaled by `delta`.
- Generate sparkle events at hit targets on a throttled cadence so rendering stays lively without creating unbounded objects.
- Remove expired sparkles each update.

Sparkles are visual render events, but their creation belongs in the runtime because they depend on hit detection.

## R3F Visual Design

The beam should not be a flat rectangle.

Render the active beam in `BattleView.tsx` using layered R3F geometry:

- A bright warm-white core.
- A wider teal or gold translucent aura.
- Animated pulse rings or bands along the beam.
- Small drifting particles near the beam path.
- Slight width pulsing via `useFrame` without React state updates per frame.

Render sparkles as short-lived R3F groups at the runtime-provided positions:

- Several small star points or tiny circles per sparkle.
- Quick expansion and fade.
- Warm core with teal/gold accents so hits feel connected to the beam.

The existing player sprite pose helper already reserves `specialActive` for frame `2`; pass the active state into `PlayerSprite` so the player visibly enters the special pose while the beam is firing.

## UI Design

Add a compact special control to the battle HUD.

Requirements:

- Shows gauge fill percentage.
- Has a clear ready state.
- Allows pointer interaction without breaking the full-screen drag movement area.
- Keeps the battle canvas as the primary surface.
- Does not add instructional text blocks over the playfield.

The control can sit near the lower-right or lower-center edge, with `pointer-events` enabled only on the button area. The rest of the overlay should keep existing drag behavior.

## Data Flow

1. `createBattleRuntime` updates charge, active duration, beam damage, and sparkles.
2. `BattleSnapshot` exposes `special`, `specialBeam`, and `sparkles`.
3. `BattleView` renders the gauge and button from `snapshot.special`.
4. Clicking the button calls `runtime.activateSpecial()`.
5. `BattleScene` renders the beam and sparkle effects from snapshot render data.

## Testing

Runtime tests:

- Natural charge approaches full around `stage.boss.startAt`.
- Enemy defeat grants charge bonus.
- `activateSpecial()` fails before full charge.
- `activateSpecial()` succeeds at full charge and resets the gauge.
- Active beam damages enemies in its vertical strip.
- Active beam damages the boss.
- Beam misses targets outside its width or behind the player.
- Beam hits create sparkle render events.
- Sparkles expire after their lifetime.

UI tests:

- Battle HUD renders special gauge and activation button.
- Button is disabled before ready and enabled at full charge in the mocked snapshot.
- Clicking the ready button calls `runtime.activateSpecial()`.

Browser verification:

- Start battle with `?fastStage=1&invincible=1`.
- Reach boss timing.
- Confirm the gauge becomes ready around boss arrival.
- Trigger the special manually.
- Capture a screenshot showing the active R3F beam and sparkle hits.
- Confirm movement drag still works after interacting with the special button.

## Out Of Scope

- Charge pickup items.
- Multiple special types.
- Upgrade trees or meta progression.
- Enemy bullet clearing.
- Post-processing bloom.
- Audio changes.
