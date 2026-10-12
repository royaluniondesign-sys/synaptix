import { defineConfig } from 'vitest/config'

// Mobile companion phase-1 tests are pure TypeScript (no DOM, no Expo runtime),
// so the node environment is sufficient. The suite is invoked explicitly from
// the repo root via `npm run check:mobile-scaffold`; apps/mobile is intentionally
// not a root workspace package while native builds stay gated.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
