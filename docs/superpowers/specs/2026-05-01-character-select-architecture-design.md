# Character Select Architecture Design

## Goal

Change the battle entry flow so the player can choose a playable character before entering the current battle screen.

This pass prepares the structure for multiple playable characters without adding a second real character yet. The app should ship with Lyra Aer as the only real playable character plus a fallback character item that safely handles missing, deleted, or invalid saved character ids.

## Current Context

The app currently moves through:

```text
title -> difficulty-select -> stage-intro -> battle -> result
```

`CharacterDefinition` already exists in `src/game/types.ts`, but the runtime is effectively single-character:

- `src/game/content/stage1.ts` exports `stagePilot`.
- `src/game/runtime/battleRuntime.ts` imports `stagePilot` directly.
- `src/game/ui/BattleView.tsx` uses the global `gameAssets.playerSheetUrl` for the player sprite.
- `src/app/App.tsx` has no selected character state.

The new structure should remove those single-character assumptions while preserving the existing battle behavior for Lyra.

## Chosen UI Direction

Use the Focus Card layout.

After the user selects a difficulty, the app shows a character selection screen. The selected character is presented as the primary visual object: portrait, name, title, short description, and compact stat rows. A small slot strip below the hero card lets the player switch characters later when more are added. The primary action continues to the stage intro.

This fits the current mobile-first, portrait-oriented shell better than a dense roster grid because the game currently has one real character and a strong character-art identity. It also makes the "last used character" default feel natural: the screen opens focused on that character.

## Flow

The new app flow is:

```text
title -> difficulty-select -> character-select -> stage-intro -> battle -> result
```

Behavior:

- `Start Sortie` still opens difficulty selection.
- Choosing a difficulty stores the difficulty and moves to `character-select`.
- `character-select` defaults to the last valid character id used by this browser.
- If the saved id is missing or unknown, the selected item becomes the fallback character.
- Choosing `Deploy` saves the selected character id and moves to `stage-intro`.
- `stage-intro` displays the selected character enough to confirm the loadout, then deploys into battle.
- Result retry should reuse the same selected character and difficulty.
- Returning to hangar should preserve the last saved character for the next run.

## Character Catalog

Add a character catalog module at `src/game/content/characters.ts`.

The module owns:

- `playableCharacters`: visible selectable characters.
- `fallbackCharacter`: safe reserve item used for invalid ids.
- `defaultCharacterId`: the first intended default, currently `lyra-aer`.
- `resolvePlayableCharacter(id)`: returns a real character when the id is valid, otherwise the fallback item.
- `isPlayableCharacterId(id)`: checks whether a value is a visible catalog id.

The catalog should keep runtime and UI data together unless the file becomes large enough to split later. The first version should avoid over-abstraction.

Suggested shape:

```ts
export type PlayableCharacter = CharacterDefinition & {
  portraitUrl: string
  description: string
  stats: Array<{
    label: string
    value: string
    ratio: number
  }>
  isFallback?: boolean
}
```

Lyra Aer remains the only real item in `playableCharacters`.

The fallback item should:

- have a stable id such as `fallback-pilot`;
- use safe Lyra-equivalent movement and shot values;
- use existing Lyra portrait and sprite assets;
- appear in the selector only when it is the active selection because of invalid saved state;
- stay out of the normal roster when the saved id is valid;
- make invalid state visible enough in tests and debugging without feeling broken to a player.

## Last Used Character

Persist the last selected character id in `localStorage`.

Use this exact key:

```text
vibe-danmaku:last-character-id
```

Read behavior:

- On app mount, read the saved id if `window.localStorage` exists.
- If the saved id is a visible playable character, select it.
- If the saved id is unknown, select the fallback character.
- If storage is unavailable, use `defaultCharacterId`.

Write behavior:

- Save the selected id when the user confirms with `Deploy`.
- Do not write on every hover or tentative slot click.
- If the selected item is fallback because the saved id was invalid, saving fallback is acceptable for this pass because it stabilizes future launches.

## Runtime Boundary

`createBattleRuntime` should receive the selected character instead of importing `stagePilot`.

Target shape:

```ts
createBattleRuntime({
  difficulty,
  stage,
  character,
  invincible,
})
```

Runtime responsibilities:

- Use `character.moveRadius` for drag bounds.
- Use `character.shot` for player auto-fire timing, speed, and damage.
- Keep battle result shape unchanged for this pass.

The runtime should not resolve character ids by itself. It should receive a resolved `CharacterDefinition` so it remains easy to test with custom character fixtures.

## Battle View Boundary

`BattleView` should receive the selected character as a prop and pass it into `useBattleRuntime`.

Player rendering should use the selected character sprite sheet instead of `gameAssets.playerSheetUrl`.

The lowest-risk implementation is to pass the character into `PlayerSprite` from `BattleView` props. The runtime snapshot does not need to include sprite URLs because sprite choice is render configuration, not simulation state.

## App State

`App` should own `selectedCharacterId`.

`selectedCharacterId` drives the character-select screen and is resolved through the catalog before stage intro and battle rendering. `Deploy` is the confirmation boundary: it saves the current `selectedCharacterId` and advances to `stage-intro`.

The `BattleView` key should include the selected character id so changing characters between sorties creates a fresh runtime:

```text
${difficulty}-${character.id}-${battleSeed}-${debugFlags.fastStage}-${debugFlags.invincible}
```

## Tests

Add or update tests at these levels:

- `App.test.tsx`: difficulty selection opens character select before stage intro.
- `App.test.tsx`: character select shows Lyra by default when there is no saved id.
- `App.test.tsx`: invalid saved character id resolves to the fallback item.
- `App.test.tsx`: Deploy moves from character select to stage intro and keeps the selected character visible.
- `battleRuntime.test.ts`: injected character movement radius clamps drag bounds.
- `battleRuntime.test.ts`: injected character shot configuration changes firing cadence or damage in a fixture-friendly way.

Existing runtime and BattleView tests should continue to pass with Lyra-equivalent defaults.

## Browser Verification

Use Playwright CLI after implementation:

1. Start the Vite dev server.
2. Open the app in a mobile portrait viewport.
3. Run through `Start Sortie -> difficulty -> character select`.
4. Confirm the Focus Card UI is visible and not overlapping.
5. Confirm `Deploy` reaches the existing stage intro.
6. Confirm the stage can enter the current battle screen.
7. Capture a screenshot under `output/playwright/` if the visual flow changed materially.

## Out Of Scope

- Adding a second real character.
- Generating new character art.
- Character unlock progression.
- Character-specific specials.
- Stage-specific character restrictions.
- Result screen character stats.
