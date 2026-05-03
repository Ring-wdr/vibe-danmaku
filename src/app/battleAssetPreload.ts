import { gameAssets } from '../game/assets'
import type { CharacterDefinition, StageDefinition } from '../game/types'

export type BattleAssetPreloadItem = {
  id: string
  label: string
  url: string
}

export type BattleAssetProgress = {
  loadedItems: number
  totalItems: number
  ratio: number
  currentLabel: string
}

type AssetByteProgress = {
  loadedBytes: number
  totalBytes?: number
}

type BattleAssetLoader = (
  item: BattleAssetPreloadItem,
  onProgress: (progress: AssetByteProgress) => void,
) => Promise<void>

function uniqueItems(items: BattleAssetPreloadItem[]) {
  const seen = new Set<string>()

  return items.filter((item) => {
    if (seen.has(item.url)) {
      return false
    }

    seen.add(item.url)
    return true
  })
}

export function getBattleAssetPreloadItems({
  stage,
  character,
}: {
  stage: StageDefinition
  character: CharacterDefinition
}): BattleAssetPreloadItem[] {
  const commonItems: BattleAssetPreloadItem[] = [
    {
      id: 'player-sheet',
      label: `${character.name} sprite sheet`,
      url: character.spriteSheetUrl,
    },
    ...(character.sidePanels ?? []).map((panel, index) => ({
      id: `player-side-panel-${index + 1}`,
      label: `${character.name} side panel`,
      url: panel.textureUrl,
    })),
    {
      id: 'enemy-atlas',
      label: 'Enemy atlas',
      url:
        stage.backgroundTheme === 'abyssal-biomech'
          ? gameAssets.enemyAbyssalBiomechAtlasUrl
          : gameAssets.enemyBrassCloudAtlasUrl,
    },
    {
      id: 'item-atlas',
      label: 'Item atlas',
      url: gameAssets.itemAtlasUrl,
    },
  ]

  const stageItems = (() => {
    if (stage.backgroundTheme === 'abyssal-biomech') {
      return [
        {
          id: 'stage3-trench-floor',
          label: 'Abyssal trench floor',
          url: gameAssets.stage3TrenchFloorUrl,
        },
        {
          id: 'stage3-pressure-layer',
          label: 'Abyssal pressure layer',
          url: gameAssets.stage3PressureLayerUrl,
        },
        {
          id: 'stage3-midboss-core',
          label: 'Pressure Lure core',
          url: gameAssets.stage3MidbossCoreUrl,
        },
        {
          id: 'stage3-boss-core',
          label: 'Abyssal Leviathan core',
          url: gameAssets.stage3BossCoreUrl,
        },
      ]
    }

    if (stage.backgroundTheme === 'burning-ruins') {
      return [
          {
            id: 'stage2-ruin-floor',
            label: 'Burning ruins floor',
            url: gameAssets.stage2RuinFloorUrl,
          },
          {
            id: 'stage2-smoke-layer',
            label: 'Burning ruins smoke',
            url: gameAssets.stage2SmokeLayerUrl,
          },
          {
            id: 'stage2-midboss-core',
            label: 'Ember Gate core',
            url: gameAssets.stage2MidbossCoreUrl,
          },
          {
            id: 'stage2-boss-core',
            label: 'Ash Citadel core',
            url: gameAssets.stage2BossCoreUrl,
          },
        ]
    }

    return [
      {
        id: 'cloud-layer-a',
        label: 'Brass cloud layer A',
        url: gameAssets.cloudLayerAUrl,
      },
      {
        id: 'cloud-layer-b',
        label: 'Brass cloud layer B',
        url: gameAssets.cloudLayerBUrl,
      },
      {
        id: 'boss-core',
        label: 'Brass boss core',
        url: gameAssets.bossCoreUrl,
      },
    ]
  })()

  return uniqueItems([...commonItems, ...stageItems])
}

export async function preloadAssetUrl(
  item: BattleAssetPreloadItem,
  onProgress: (progress: AssetByteProgress) => void,
) {
  const response = await fetch(item.url)

  if (!response.ok) {
    throw new Error(`Failed to preload ${item.label}`)
  }

  const totalHeader = response.headers.get('content-length')
  const totalBytes = totalHeader ? Number(totalHeader) : undefined

  if (!response.body) {
    const blob = await response.blob()
    onProgress({ loadedBytes: blob.size, totalBytes: totalBytes ?? blob.size })
    return
  }

  const reader = response.body.getReader()
  let loadedBytes = 0

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    loadedBytes += value.byteLength
    onProgress({ loadedBytes, totalBytes })
  }

  if (loadedBytes === 0) {
    onProgress({ loadedBytes: totalBytes ?? 1, totalBytes: totalBytes ?? 1 })
  }
}

export async function preloadBattleAssets(
  items: BattleAssetPreloadItem[],
  onProgress: (progress: BattleAssetProgress) => void,
  loadAsset: BattleAssetLoader = preloadAssetUrl,
) {
  const totalItems = items.length

  if (totalItems === 0) {
    onProgress({ loadedItems: 0, totalItems: 0, ratio: 1, currentLabel: 'Battle assets' })
    return
  }

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]!
    const loadedItems = index

    onProgress({
      loadedItems,
      totalItems,
      ratio: loadedItems / totalItems,
      currentLabel: item.label,
    })

    await loadAsset(item, (assetProgress) => {
      const assetRatio =
        assetProgress.totalBytes && assetProgress.totalBytes > 0
          ? Math.min(1, assetProgress.loadedBytes / assetProgress.totalBytes)
          : 0

      onProgress({
        loadedItems,
        totalItems,
        ratio: (loadedItems + assetRatio) / totalItems,
        currentLabel: item.label,
      })
    })

    onProgress({
      loadedItems: loadedItems + 1,
      totalItems,
      ratio: (loadedItems + 1) / totalItems,
      currentLabel: item.label,
    })
  }
}
