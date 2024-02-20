/// <reference types="vitest" />

// Configure Vitest (https://vitest.dev/config/)

import path from 'node:path'
import swc from 'unplugin-swc'
import { defineConfig, mergeConfig } from 'vite'

const sharedConfig = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    restoreMocks: true,
    testTimeout: 5000,
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './test'),
    },
  },
  plugins: [
    swc.vite({
      // Explicitly set the module type to avoid inheriting this value from a `.swcrc` config file
      module: { type: 'es6' },
    }),
  ],
})

const unitTests = mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'unit',
      dir: path.resolve(__dirname, './test'),
      include: ['**/*.test.ts'],
      // globalSetup: ['./test/setupTests.ts'],
      reporters: ['default', 'junit'],
      outputFile: path.resolve(__dirname, './coverage/unit/junit.xml'),
      coverage: { enabled: true },
      restoreMocks: true,
    },
  }),
)

export default unitTests
