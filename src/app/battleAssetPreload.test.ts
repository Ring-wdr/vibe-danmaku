import { describe, expect, it } from 'vitest'

import {
  lyraAerCharacter,
  reinaShiroganeCharacter,
  vesperNoireCharacter,
} from '../game/content/characters'
import { createStageDefinition } from '../game/content/stage1'
import { createStage2Definition } from '../game/content/stage2'
import { createStage3Definition } from '../game/content/stage3'
import { createStage4Definition } from '../game/content/stage4'
import { getBattleAssetPreloadItems } from './battleAssetPreload'

describe('getBattleAssetPreloadItems', () => {
  it('preloads only Stage 1 battle assets before Stage 1 entry', () => {
    const items = getBattleAssetPreloadItems({
      stage: createStageDefinition('normal'),
      character: lyraAerCharacter,
    })
    const urls = items.map((item) => item.url)

    expect(urls).toContain(lyraAerCharacter.spriteSheetUrl)
    expect(urls.some((url) => url.includes('/items/item-atlas'))).toBe(true)
    expect(urls.some((url) => url.includes('/enemies/enemy-brass-cloud-atlas'))).toBe(true)
    expect(urls.some((url) => url.includes('/backgrounds/brass-cloud/cloud-layer-a'))).toBe(true)
    expect(urls.some((url) => url.includes('/backgrounds/brass-cloud/cloud-layer-b'))).toBe(true)
    expect(urls.some((url) => url.includes('/bosses/boss-core'))).toBe(true)
    expect(urls.some((url) => url.includes('/backgrounds/burning-ruins/'))).toBe(false)
    expect(urls.some((url) => url.includes('/bosses/stage2-'))).toBe(false)
  })

  it('preloads Stage 2-specific backgrounds and boss assets before Stage 2 entry', () => {
    const items = getBattleAssetPreloadItems({
      stage: createStage2Definition('normal'),
      character: lyraAerCharacter,
    })
    const urls = items.map((item) => item.url)

    expect(urls).toContain(lyraAerCharacter.spriteSheetUrl)
    expect(urls.some((url) => url.includes('/enemies/enemy-brass-cloud-atlas'))).toBe(true)
    expect(urls.some((url) => url.includes('/backgrounds/burning-ruins/stage2-ruin-floor'))).toBe(
      true,
    )
    expect(urls.some((url) => url.includes('/backgrounds/burning-ruins/stage2-smoke-layer'))).toBe(
      true,
    )
    expect(urls.some((url) => url.includes('/bosses/stage2-midboss-core'))).toBe(true)
    expect(urls.some((url) => url.includes('/bosses/stage2-boss-core'))).toBe(true)
    expect(urls.some((url) => url.includes('/backgrounds/brass-cloud/'))).toBe(false)
    expect(urls.some((url) => url.includes('/bosses/boss-core'))).toBe(false)
  })

  it('preloads stage 3 abyssal biomech assets', () => {
    const items = getBattleAssetPreloadItems({
      stage: createStage3Definition('normal'),
      character: lyraAerCharacter,
    })
    const urls = items.map((item) => item.url)

    expect(urls.some((url) => url.includes('/enemies/enemy-abyssal-biomech-atlas'))).toBe(
      true,
    )
    expect(
      urls.some((url) =>
        url.includes('/backgrounds/abyssal-biomech/stage3-trench-floor'),
      ),
    ).toBe(true)
    expect(
      urls.some((url) =>
        url.includes('/backgrounds/abyssal-biomech/stage3-pressure-layer'),
      ),
    ).toBe(true)
    expect(urls.some((url) => url.includes('/bosses/stage3-midboss-core'))).toBe(true)
    expect(urls.some((url) => url.includes('/bosses/stage3-boss-core'))).toBe(true)
    expect(urls.some((url) => url.includes('/bosses/stage3-boss-body'))).toBe(true)
    expect(urls.some((url) => url.includes('/bosses/stage3-boss-appendages'))).toBe(true)
    expect(urls.some((url) => url.includes('/bosses/stage3-boss-armor-texture'))).toBe(false)
  })

  it('preloads stage 4 city-state background and boss asset slots', () => {
    const items = getBattleAssetPreloadItems({
      stage: createStage4Definition('normal'),
      character: lyraAerCharacter,
    })
    const urls = items.map((item) => item.url)

    expect(urls.some((url) => url.includes('/enemies/enemy-city-state-atlas'))).toBe(true)
    expect(urls.some((url) => url.includes('/backgrounds/city-states/stage4-city-block-a'))).toBe(true)
    expect(urls.some((url) => url.includes('/backgrounds/city-states/stage4-city-block-b'))).toBe(true)
    expect(urls.some((url) => url.includes('/backgrounds/city-states/stage4-city-block-c'))).toBe(true)
    expect(urls.some((url) => url.includes('/bosses/stage4-midboss-knight'))).toBe(true)
    expect(urls.some((url) => url.includes('/bosses/stage4-knight-armor-texture'))).toBe(true)
    expect(urls.some((url) => url.includes('/bosses/stage4-gunslinger-sheet'))).toBe(true)
    expect(urls.some((url) => url.includes('/backgrounds/brass-cloud/'))).toBe(false)
    expect(urls.some((url) => url.includes('/backgrounds/abyssal-biomech/'))).toBe(false)
  })

  it('preloads the selected character sprite sheet instead of only Lyra assets', () => {
    const items = getBattleAssetPreloadItems({
      stage: createStageDefinition('normal'),
      character: vesperNoireCharacter,
    })

    expect(items).toContainEqual(
      expect.objectContaining({
        id: 'player-sheet',
        label: 'Vesper Noire sprite sheet',
        url: vesperNoireCharacter.spriteSheetUrl,
      }),
    )
    expect(items.map((item) => item.url)).not.toContain(lyraAerCharacter.spriteSheetUrl)
  })

  it('preloads selected character side panel textures before battle entry', () => {
    const items = getBattleAssetPreloadItems({
      stage: createStageDefinition('normal'),
      character: vesperNoireCharacter,
    })

    expect(items).toContainEqual(
      expect.objectContaining({
        id: 'player-side-panel-1',
        label: 'Vesper Noire side panel',
        url: vesperNoireCharacter.sidePanels?.[0]?.textureUrl,
      }),
    )
  })

  it('deduplicates Reina orbiting sword textures before battle entry', () => {
    const items = getBattleAssetPreloadItems({
      stage: createStageDefinition('normal'),
      character: reinaShiroganeCharacter,
    })

    const swordItems = items.filter((item) => item.url.includes('reina-shirogane-sword'))

    expect(swordItems).toHaveLength(1)
    expect(swordItems[0]).toMatchObject({
      id: 'player-side-panel-1',
      label: 'Reina Shirogane side panel',
      url: reinaShiroganeCharacter.sidePanels?.[0]?.textureUrl,
    })
  })
})
