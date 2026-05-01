import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

function normalizeModuleId(id: string) {
  return id.replace(/\\/g, '/')
}

function isThreeModule(id: string) {
  const normalizedId = normalizeModuleId(id)
  return normalizedId.includes('/node_modules/three/')
}

function isReactThreeModule(id: string) {
  const normalizedId = normalizeModuleId(id)
  return (
    normalizedId.includes('/node_modules/@react-three/') ||
    normalizedId.includes('/node_modules/@pmndrs/')
  )
}

function isBattleThreeVendor(id: string) {
  const normalizedId = normalizeModuleId(id)
  if (normalizedId.includes('/node_modules/three/')) {
    return true
  }

  return (
    normalizedId.includes('/node_modules/@react-three/') ||
    normalizedId.includes('/node_modules/@pmndrs/') ||
    normalizedId.includes('/node_modules/react-reconciler/')
  )
}

export function getGithubPagesBase(repository = process.env.GITHUB_REPOSITORY) {
  if (!repository) {
    return '/'
  }

  const [owner, repo] = repository.split('/')
  if (!owner || !repo || repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return '/'
  }

  return `/${repo}/`
}

const base = process.env.VITE_BASE_PATH ?? (process.env.GITHUB_ACTIONS ? getGithubPagesBase() : '/')

export default defineConfig({
  base,
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
  ],
  build: {
    chunkSizeWarningLimit: 450,
    rolldownOptions: {
      output: {
        strictExecutionOrder: true,
        codeSplitting: {
          includeDependenciesRecursively: false,
          maxSize: 430 * 1024,
          groups: [
            {
              name: 'vendor-three',
              test: isThreeModule,
              priority: 30,
            },
            {
              name: 'vendor-r3f',
              test: isReactThreeModule,
              priority: 20,
            },
            {
              name: 'vendor-battle-3d',
              test: isBattleThreeVendor,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
