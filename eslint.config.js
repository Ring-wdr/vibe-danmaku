import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const reactHooksRecommendedLatest = reactHooks.configs.flat['recommended-latest']

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'output/**', '.worktrees/**', '.playwright-cli/**'],
  },
  ...tseslint.configs.recommended,
  {
    ...reactHooksRecommendedLatest,
    files: ['src/app/**/*.{ts,tsx}'],
  },
]
