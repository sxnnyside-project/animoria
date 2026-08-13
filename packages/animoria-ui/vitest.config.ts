import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@animoria/core/contracts': fileURLToPath(
        new URL('../animoria-core/src/contracts.ts', import.meta.url)
      ),
      '@animoria/core/i18n': fileURLToPath(
        new URL('../animoria-core/src/i18n/locales.ts', import.meta.url)
      ),
      '@animoria/core': fileURLToPath(new URL('../animoria-core/src/index.ts', import.meta.url)),
    },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
