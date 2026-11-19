import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx}'],
      // test files themselves are not production code
      exclude: ['src/**/*.test.{js,jsx}'],
      // `npm run test:coverage` fails if line or branch coverage drops below 80%
      thresholds: { lines: 80, branches: 80 },
    },
  },
})
