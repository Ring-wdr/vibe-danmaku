import * as THREE from 'three'

type TexturePreloadItem = {
  id?: string
  label?: string
  url: string
}

const loadedTexturesByUrl = new Map<string, THREE.Texture>()
const pendingTexturesByUrl = new Map<string, Promise<THREE.Texture>>()

function uniqueTextureUrls(items: readonly TexturePreloadItem[]) {
  return Array.from(new Set(items.map((item) => item.url)))
}

export function getPreloadedBattleTexture(url: string) {
  return loadedTexturesByUrl.get(url) ?? null
}

export function loadBattleTexture(url: string) {
  const loadedTexture = loadedTexturesByUrl.get(url)

  if (loadedTexture) {
    return Promise.resolve(loadedTexture)
  }

  const pendingTexture = pendingTexturesByUrl.get(url)

  if (pendingTexture) {
    return pendingTexture
  }

  const loader = new THREE.TextureLoader()
  const texturePromise = new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        pendingTexturesByUrl.delete(url)
        loadedTexturesByUrl.set(url, texture)
        resolve(texture)
      },
      undefined,
      (error) => {
        pendingTexturesByUrl.delete(url)
        reject(error instanceof Error ? error : new Error(`Failed to load texture ${url}`))
      },
    )
  })

  pendingTexturesByUrl.set(url, texturePromise)
  return texturePromise
}

export async function preloadBattleTextures(items: readonly TexturePreloadItem[]) {
  await Promise.all(uniqueTextureUrls(items).map((url) => loadBattleTexture(url)))
}

export function clearPreloadedBattleTextures() {
  pendingTexturesByUrl.clear()
  loadedTexturesByUrl.forEach((texture) => texture.dispose())
  loadedTexturesByUrl.clear()
}
