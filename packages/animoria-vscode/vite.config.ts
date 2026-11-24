import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

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
      '@animoria/ui/bridge': fileURLToPath(
        new URL('../../packages/animoria-ui/src/bridge/index.ts', import.meta.url),
      ),
      '@animoria/contracts': fileURLToPath(
        new URL('../../packages/animoria-contracts/src/index.ts', import.meta.url),
      ),
    },
  },
});
