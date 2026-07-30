import { defineConfig } from 'vitest/config';

// No Private Polling contract tests exist yet (the old bboard-example tests were
// removed as stale scaffolding). `passWithNoTests` keeps `npm run test` / `npm run ci`
// green until a private-polling test suite is written.
export default defineConfig({
  test: {
    passWithNoTests: true,
  },
});
