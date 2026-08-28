import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@animoria/contracts': fileURLToPath(
        new URL('../animoria-contracts/src/index.ts', import.meta.url)
      ),
    },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
