import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@animoria/core/i18n': new URL(
        '../../packages/animoria-core/src/i18n/locales.ts',
        import.meta.url
      ).pathname,
      '@animoria/core': new URL('../../packages/animoria-core/src/index.ts', import.meta.url)
        .pathname,
    },
  },
});
