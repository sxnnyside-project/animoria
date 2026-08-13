import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Copies the built `@animoria/ui` bundle into `media/`, where the webview can reach
 * it through `asWebviewUri`.
 *
 * ## Why a copy and not a workspace import
 * A VS Code webview loads resources over the `vscode-webview://` scheme, restricted
 * to `localResourceRoots`. It cannot reach into `node_modules` of a sibling
 * workspace package, and pointing a root at one would ship the whole dependency tree
 * inside the `.vsix`.
 *
 * ## Why this fails loudly
 * A missing bundle used to be the kind of thing that produced a blank panel at
 * runtime with no error anywhere. The extension's UI is the bundle; if it is not
 * there, the build has not produced a working extension and should say so.
 */
const here = dirname(fileURLToPath(import.meta.url));
const uiDist = join(here, '..', '..', 'animoria-ui', 'dist');
const media = join(here, '..', 'media');

const bundleEs = join(uiDist, 'animoria-ui.js');
const bundleGlobal = join(uiDist, 'animoria-ui.global.js');
const tokens = join(here, '..', '..', 'animoria-ui', 'src', 'styles', 'tokens.css');

if (!existsSync(bundleEs) || !existsSync(bundleGlobal)) {
  console.error(
    `[animoria-vscode] @animoria/ui is not built.\n  Expected: ${bundleEs}\n  Run: pnpm --filter @animoria/ui build`
  );
  process.exit(1);
}

mkdirSync(media, { recursive: true });
cpSync(bundleEs, join(media, 'animoria-ui.js'));
cpSync(bundleGlobal, join(media, 'animoria-ui.global.js'));
if (existsSync(`${bundleEs}.map`)) cpSync(`${bundleEs}.map`, join(media, 'animoria-ui.js.map'));
cpSync(tokens, join(media, 'tokens.css'));

console.log('[animoria-vscode] shared UI copied into media/');
