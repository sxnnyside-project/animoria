import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@animoria/core': new URL('../../packages/animoria-core/src/index.ts',
        import.meta.url).pathname,
    },
  },
});
