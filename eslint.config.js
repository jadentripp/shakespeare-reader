import tseslint from 'typescript-eslint'
import pluginQuery from '@tanstack/eslint-plugin-query'

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      '@tanstack/query': pluginQuery,
    },
    rules: {
      ...pluginQuery.configs.recommended.rules,
      // Explicitly highlight the rules the user mentioned
      '@tanstack/query/exhaustive-deps': 'error',
      '@tanstack/query/stable-query-client': 'error',
      '@tanstack/query/no-void-query-fn': 'error',
      '@tanstack/query/no-rest-destructuring': 'warn',
      '@tanstack/query/no-unstable-deps': 'warn',
      '@tanstack/query/infinite-query-property-order': 'warn',
      '@tanstack/query/mutation-property-order': 'warn',
    },
  },
  {
    // Ignore build artifacts and tauri files
    ignores: ['dist/**', 'src-tauri/**', 'node_modules/**', 'docs/**'],
  },
)
