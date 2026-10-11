import { defineConfig } from 'vitest/config';

// Package-level config so the desktop boundary suite can run on its own
// (`npx vitest run --config apps/desktop/vitest.config.ts`). The desktop app
// is intentionally not part of root npm workspaces yet, so turbo does not
// pick this up and root build/lint stay unaffected.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
