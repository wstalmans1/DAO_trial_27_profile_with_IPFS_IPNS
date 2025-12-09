import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        alert: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        fetch: 'readonly',
        File: 'readonly',
        setTimeout: 'readonly',
        indexedDB: 'readonly',
        IDBDatabase: 'readonly',
        IDBValidKey: 'readonly',
        IDBDatabaseInfo: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        alert: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        fetch: 'readonly',
        File: 'readonly',
        setTimeout: 'readonly',
        indexedDB: 'readonly',
        IDBDatabase: 'readonly',
        IDBValidKey: 'readonly',
        IDBDatabaseInfo: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.js', 'vite.config.ts'],
  },
]
