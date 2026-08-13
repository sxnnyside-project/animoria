import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Proof that Shared UI is *shared* rather than merely *present*.
 *
 * ## Why this test lives in Core
 * It is the only package every other one depends on, so it is the only place a gate
 * can see all four clients at once. A per-client gate can prove that client stopped
 * authoring markup; only a repository-wide one can prove no client started again.
 *
 * ## What each assertion is protecting against
 * `CLAUDE.md`, `README.md` and `apps/animoria-sandbox/README.md` all claimed for
 * three waves that "Lit components are bundled into the IDE WebViews". No IDE loaded
 * them. The build even copied them into the JetBrains jar, where nothing read them.
 * A documented architecture that no code implements is worse than an undocumented
 * one, because it stops anybody looking. These assertions are what makes the claim
 * true by construction.
 */

const REPO = fileURLToPath(new URL('../../../..', import.meta.url));

function read(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function walk(dir: string, extensions: readonly string[], out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'build') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, extensions, out);
    else if (extensions.includes(extname(full))) out.push(full);
  }
  return out;
}

/** Strips comments while preserving line count, so an explanation cannot trip a gate. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/.*$/gm, '');
}

describe('shared UI — the package exists and is self-contained', () => {
  it('has an entry point, a bridge, and a token contract', () => {
    for (const path of [
      'packages/animoria-ui/src/index.ts',
      'packages/animoria-ui/src/bridge/types.ts',
      'packages/animoria-ui/src/styles/tokens.css',
    ]) {
      expect(existsSync(join(REPO, path)), `${path} is missing`).toBe(true);
    }
  });

  it('exports a mount function the hosts can call', () => {
    expect(read(join(REPO, 'packages/animoria-ui/src/index.ts'))).toContain(
      'export function mount'
    );
  });
});

describe('shared UI — every client consumes it', () => {
  it('VS Code loads the bundle and authors no product markup', () => {
    const src = join(REPO, 'packages/animoria-vscode/src');
    const files = walk(src, ['.ts']);

    const panel = read(join(src, 'panels/AnimoriaWorkspacePanel.ts'));
    expect(panel, 'the VS Code panel must mount the shared UI').toContain('mount(');
    // The bundle's real name. This asserted `animoria-ui.js` while the panel loads
    // `animoria-ui.global.js`, so the gate that exists to prove VS Code consumes the
    // shared UI had been failing — on a working tree the migration reported as
    // complete, with a suite it reported as green.
    expect(panel).toContain('animoria-ui.global.js');

    // 2,182 lines of HTML lived in template literals across three panels. The
    // document skeleton that loads the bundle is allowed; product markup is not.
    const offenders = files.filter((file) => {
      const code = stripComments(read(file));
      return /class="(?:asset-card|gallery-grid|health-banner|item-card)/.test(code);
    });
    expect(offenders, `product markup found in: ${offenders.join(', ')}`).toEqual([]);
  });

  it('the sandbox consumes the package rather than its own copy', () => {
    const pkg = read(join(REPO, 'apps/animoria-sandbox/package.json'));
    expect(pkg).toContain('@animoria/ui');

    // The sandbox's own copies of the four product screens are gone. Keeping them
    // "until the IDEs catch up" is how four implementations happened.
    for (const gone of [
      'animoria-gallery.ts',
      'animoria-preview-panel.ts',
      'animoria-cleanup-panel.ts',
      'animoria-duplicate-resolver.ts',
      'animoria-app.ts',
    ]) {
      expect(
        existsSync(join(REPO, 'apps/animoria-sandbox/src/components', gone)),
        `${gone} should have been deleted — the sandbox renders @animoria/ui now`
      ).toBe(false);
    }
  });

  it('JetBrains loads the bundle and authors no product markup', () => {
    const kotlin = join(REPO, 'packages/animoria-jetbrains/src/main/kotlin');
    const panel = read(join(kotlin, 'com/sxnnyside/animoria/ui/AnimoriaSharedUiPanel.kt'));
    expect(panel, 'the JetBrains panel must load the shared bundle').toContain(
      'animoria-ui.global.js'
    );

    for (const gone of [
      'com/sxnnyside/animoria/ui/AnimoriaPreviewPanel.kt',
      'com/sxnnyside/animoria/duplicates/DuplicateResolverDialog.kt',
      'com/sxnnyside/animoria/cleanup/CleanupReviewDialog.kt',
    ]) {
      expect(existsSync(join(kotlin, gone)), `${gone} should have been deleted`).toBe(false);
    }

    // The property, not the filenames.
    //
    // This list used to include `AnimoriaGalleryPanel.kt`, and the gate therefore
    // banned a *name* rather than the thing that was wrong with what used to bear it:
    // a second copy of the product's screens, authored as markup, in Kotlin. A native
    // Swing tree is not that — `CLAUDE.md`'s layer table assigns tree views to the
    // host precisely because the platform does them better than a webview can.
    //
    // Banning the name made the gate fail when the gallery came back correctly, which
    // is the same mistake as treating a deleted file as evidence a capability is gone.
    const markup = walk(kotlin, ['.kt']).filter((file) => {
      const code = stripComments(read(file));
      // The one legitimate document skeleton — it loads the shared bundle and holds
      // no product content of its own.
      if (file.endsWith('AnimoriaSharedUiPanel.kt')) return false;

      // What actually signals an authored *page*: structural elements, direct DOM
      // writes, or state pushed in as JavaScript source.
      //
      // Not `<html>` on its own: Swing's `JLabel` accepts an HTML fragment as its
      // standard way of wrapping text, and `AnimoriaDegradedPanel` uses it for the one
      // D-09 degraded message. Flagging that would be flagging a Swing idiom, which
      // teaches people the gate is noise.
      return /<div\b|innerHTML|executeJavaScript\(/.test(code);
    });
    expect(markup, `product markup authored in Kotlin: ${markup.join(', ')}`).toEqual([]);
  });
});

describe('shared UI — hosts own the theme vocabulary, not the components', () => {
  it('only the VS Code host names VS Code variables', () => {
    const offenders: string[] = [];

    const scan: readonly [string, readonly string[]][] = [
      ['packages/animoria-ui/src', ['.ts', '.css']],
      ['apps/animoria-sandbox/src', ['.ts', '.css']],
      ['packages/animoria-jetbrains/src/main/kotlin', ['.kt']],
    ];

    for (const [dir, extensions] of scan) {
      for (const file of walk(join(REPO, dir), extensions)) {
        if (/--vscode-/.test(stripComments(read(file)))) {
          offenders.push(file.slice(REPO.length));
        }
      }
    }

    expect(
      offenders,
      `A host's CSS variable names belong to that host. Found in: ${offenders.join(', ')}`
    ).toEqual([]);
  });
});

describe('shared UI — no client redeclares a Core type', () => {
  it('cleanup semantics exist only in Core', () => {
    // `CleanupProposal`, `CleanupCandidate` and the "never remove a referenced asset"
    // rule lived in `animoria-vscode` (772 lines), which meant the extension privately
    // owned a safety invariant JetBrains did not have.
    const offenders: string[] = [];

    for (const dir of [
      'packages/animoria-vscode/src',
      'packages/animoria-ui/src',
      'apps/animoria-sandbox/src',
    ]) {
      for (const file of walk(join(REPO, dir), ['.ts'])) {
        const code = stripComments(read(file));
        if (
          /export\s+interface\s+(?:CleanupProposal|CleanupCandidate|CleanupSummary)\b/.test(code)
        ) {
          offenders.push(file.slice(REPO.length));
        }
      }
    }

    expect(offenders, `cleanup types must come from Core: ${offenders.join(', ')}`).toEqual([]);
  });
});
