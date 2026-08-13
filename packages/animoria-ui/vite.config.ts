import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/**
 * Builds `@animoria/ui` into one self-contained ESM bundle.
 *
 * ## Why one file with everything inlined
 * The bundle is loaded by a VS Code webview under a nonce CSP and by JCEF through a
 * scheme handler. Neither can fetch a sibling chunk without the host also serving
 * it, and every additional served file is another place a host's CSP or scheme
 * handler can be subtly wrong in only one IDE. One file is one thing to serve.
 *
 * Lit is bundled rather than externalized for the same reason: a bare `lit` import
 * surviving into the output would need an import map in every host.
 */
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
  build: {
    lib: {
      entry: fileURLToPath(new URL('src/index.ts', import.meta.url)),
      // Two formats, because the two hosts load the bundle differently and neither
      // can use the other's.
      //
      // `es` — VS Code serves the file through `asWebviewUri` and imports it as a
      //   module under a nonce CSP. A module's exports are not globals, which is
      //   correct there because the page can `import` them.
      // `iife` — JetBrains inlines the bundle into the document it hands JCEF, so
      //   there is no URL to import from. The IIFE publishes `window.__animoriaUi`,
      //   which the inline bootstrap then calls.
      //
      // Shipping only `es` would leave JetBrains with a loaded module it has no way
      // to reach — a blank panel with no error.
      formats: ['es', 'iife'],
      name: '__animoriaUi',
      fileName: (format) => (format === 'iife' ? 'animoria-ui.global.js' : 'animoria-ui.js'),
    },
    rollupOptions: {
      output: {
        // No code splitting: see the note above.
        inlineDynamicImports: true,
        assetFileNames: 'animoria-ui.[ext]',
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    target: 'es2022',
    emptyOutDir: true,
  },
});
