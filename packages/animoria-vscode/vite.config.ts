import { defineConfig } from 'vite';
import { builtinModules } from 'module';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/extension.ts',
      formats: ['cjs'],
      fileName: () => 'extension.js',
    },
    rollupOptions: {
      // Externalize vscode + every Node.js built-in (with and without node: prefix)
      external: ['vscode', ...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
    },
    outDir: 'dist',
    sourcemap: true,
    target: 'node18',
  },
  resolve: {
    alias: {
      '@animoria/core': new URL('../../packages/animoria-core/src/index.ts', import.meta.url)
        .pathname,
    },
  },
});
