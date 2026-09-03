import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['packages/**/test/**/*.test.ts', 'apps/**/test/**/*.test.ts'] },
  resolve: {
    alias: {
      '@setld/protocol-types': new URL('./packages/protocol-types/src/index.ts', import.meta.url).pathname,
      '@setld/reference-model': new URL('./packages/reference-model/src/index.ts', import.meta.url).pathname,
    },
  },
});
