import { defineConfig } from 'vitest/config';

// Package-level config so `turbo run test` (which runs vitest from this
// directory) finds the suite. The root config covers `vitest` run from the
// repo root. Web tests are pure-logic only (no DOM), so the node environment
// is sufficient.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
