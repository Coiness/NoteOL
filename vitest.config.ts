import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    include: ['tests/unit/**/*.{test,spec}.{js,ts,tsx}', 'tests/integration/**/*.{test,spec}.{js,ts,tsx}', 'lib/**/*.{test,spec}.{js,ts,tsx}', 'app/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['tests/e2e/**']
  },
})
