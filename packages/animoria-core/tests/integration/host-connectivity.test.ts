import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DAEMON_METHODS } from '../../src/daemon/protocol';

/**
 * Proof that every declared capability is actually *reachable*.
 *
 * ## Why this suite exists
 * A pre-release audit found that seven of seventeen `HostOutbound` messages had no
 * sender anywhere in the shared UI, five of sixteen `HostInbound` messages had no
 * handler, and the JetBrains client was calling six daemon methods that the protocol
 * does not declare. Every one of those defects shipped past a green suite of 577
 * tests, because each layer was tested against its own idea of the contract:
 *
 * - `bridge.test.ts` proved the *types* were coherent.
 * - `ProtocolConformanceTest.kt` proved the request *envelope* was v1 — and never
 *   looked at the method names inside it.
 * - `cross-client-parity.test.ts` compared Core against the CLI and the daemon, all
 *   three of which are Core. No client adapter appeared in it at all.
 * - `shared-ui-adoption.test.ts` proved deleted files were *absent*, which is not the
 *   same claim as the capability surviving.
 *
 * The common shape is that each gate checked something true near the defect. What
 * none of them checked is the only thing a user experiences: whether a message a
 * component sends arrives somewhere that acts on it.
 *
 * ## Why the checks are source-level
 * They are connectivity claims about code that cannot all be loaded into one process
 * — Kotlin, a webview bundle and an extension host. The alternative is not a better
 * integration test; it is no check at all, which is the state these defects were
 * found in. Behavioural round trips live in each client's own suite and are the
 * second half of this; this half is what makes a *missing* half visible.
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

/** Strips comments, so an explanation naming a defect cannot satisfy a gate. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/\/\/.*$/gm, '');
}

function sourcesOf(dir: string, extensions: readonly string[]): string {
  return walk(join(REPO, dir), extensions)
    .map((file) => stripComments(read(file)))
    .join('\n');
}

/** The contract's own lists, read from the shared UI package rather than restated. */
function listFrom(constantName: string): readonly string[] {
  const types = read(join(REPO, 'packages/animoria-ui/src/bridge/types.ts'));
  const block = new RegExp(`export const ${constantName} = \\[([\\s\\S]*?)\\] as const`).exec(
    types
  );
  expect(block, `${constantName} must exist in @animoria/ui's bridge contract`).toBeTruthy();
  return [...block![1]!.matchAll(/'([^']+)'/g)].map((match) => match[1]!);
}

const OUTBOUND = listFrom('OUTBOUND_TYPES');
const INBOUND = listFrom('INBOUND_TYPES');

// ── Shared UI ─────────────────────────────────────────────────────────────────

describe('shared UI — every message in the vocabulary is reachable', () => {
  const components = sourcesOf('packages/animoria-ui/src/components', ['.ts']);
  const viewModel = sourcesOf('packages/animoria-ui/src/view-model', ['.ts']);
  const ui = `${components}\n${viewModel}`;

  it.each(OUTBOUND)('a component can send "%s"', (type) => {
    // A message no component sends is a capability the developer cannot reach, no
    // matter how completely every host implements it. `request-animation-data`,
    // `reveal-asset`, `copy-to-clipboard`, `generate-snippet`, `save-preferences`,
    // `request-trash-sessions` and `restore-session` were all in this state: fully
    // handled by all three hosts, sent by nobody.
    expect(
      ui.includes(`'${type}'`),
      `no component in @animoria/ui sends "${type}" — the capability is unreachable`
    ).toBe(true);
  });

  it.each(INBOUND)('a component handles "%s"', (type) => {
    // A host answer nothing renders is a round trip that ends in silence.
    expect(
      ui.includes(`case '${type}'`) || ui.includes(`'${type}'`),
      `no component in @animoria/ui handles the inbound message "${type}"`
    ).toBe(true);
  });

  it('renders every component it declares', () => {
    // `animoria-root-selector` was imported by the workspace component, exported by
    // nothing, and instantiated nowhere — so multi-root filtering existed as code and
    // not as a product. A component no template mounts is dead weight that reads as
    // a feature.
    const dir = join(REPO, 'packages/animoria-ui/src/components');
    const orphans: string[] = [];

    for (const file of walk(dir, ['.ts'])) {
      const tag = /@customElement\('([^']+)'\)/.exec(read(file))?.[1];
      if (!tag || tag === 'animoria-workspace') continue;
      if (!new RegExp(`<${tag}[\\s>]`).test(components)) orphans.push(tag);
    }

    expect(orphans, `declared but never rendered: ${orphans.join(', ')}`).toEqual([]);
  });
});

// ── Hosts ─────────────────────────────────────────────────────────────────────

const HOSTS: readonly { name: string; dir: string; extensions: readonly string[] }[] = [
  { name: 'VS Code', dir: 'packages/animoria-vscode/src', extensions: ['.ts'] },
  { name: 'the sandbox', dir: 'apps/animoria-sandbox/src', extensions: ['.ts'] },
  { name: 'JetBrains', dir: 'packages/animoria-jetbrains/src/main/kotlin', extensions: ['.kt'] },
];

describe('hosts — every host answers every message the UI can send', () => {
  for (const host of HOSTS) {
    const source = sourcesOf(host.dir, host.extensions);

    it.each(OUTBOUND)(`${host.name} handles "%s"`, (type) => {
      expect(
        source.includes(`'${type}'`) || source.includes(`"${type}"`),
        `${host.name} has no handler for "${type}" — the UI's control does nothing there`
      ).toBe(true);
    });
  }
});

describe('hosts — inbound messages carry the fields the contract requires', () => {
  /**
   * The fields a host must put on the wire, by message.
   *
   * Read from the validator rather than restated, so a contract change cannot leave
   * this list describing the previous one.
   */
  const validator = read(join(REPO, 'packages/animoria-ui/src/bridge/validate.ts'));
  const inboundShape = /const INBOUND_SHAPE[\s\S]*?\n};/.exec(validator)?.[0] ?? '';

  function requiredFields(type: string): readonly string[] {
    const entry = new RegExp(`'?${type}'?: \\[([\\s\\S]*?)\\],\\n`).exec(inboundShape);
    if (!entry) return [];
    return [...entry[1]!.matchAll(/\['([^']+)'/g)].map((match) => match[1]!);
  }

  it('JetBrains posts every required field of every message it emits', () => {
    // The JetBrains bridge posted `cleanup-proposal` with a `proposal` field (the
    // contract names `roots`), `cleanup-plan` with `plan` (it is `plans`),
    // `resolution-plan` with no `rootId` or `rootName`, `snippet` with no
    // `assetPath`, and `trash-sessions` wrapping the daemon's per-root envelope. The
    // shared UI's inbound validator rejected all of them — correctly, and silently,
    // because no host passed `onInvalid`. Four workflows ended in a panel that simply
    // never changed.
    const bridge = stripComments(
      read(
        join(
          REPO,
          'packages/animoria-jetbrains/src/main/kotlin/com/sxnnyside/animoria/bridge/JetBrainsHostBridge.kt'
        )
      )
    );

    const violations: string[] = [];
    for (const [, type] of bridge.matchAll(/put\("type",\s*"([a-z-]+)"\)/g)) {
      if (!INBOUND.includes(type!)) {
        violations.push(`emits "${type}", which the contract does not name`);
        continue;
      }
      // The block that follows this `put("type", …)` up to the next one.
      const start = bridge.indexOf(`put("type", "${type}")`);
      const rest = bridge.slice(start + 1);
      const nextType = rest.search(/put\("type",\s*"[a-z-]+"\)/);
      const block = nextType === -1 ? rest : rest.slice(0, nextType);

      for (const field of requiredFields(type!)) {
        if (!block.includes(`put("${field}"`) && !block.includes(`putJsonObject("${field}"`)) {
          violations.push(`"${type}" is emitted without its required "${field}"`);
        }
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });
});

// ── Daemon ────────────────────────────────────────────────────────────────────

describe('daemon — every client speaks the declared vocabulary', () => {
  it('JetBrains calls only methods the protocol declares', () => {
    // Six invented names shipped: `cleanupProposal`, `resolveDuplicates`,
    // `restoreTrash`, `getSnapshot`, `runGovernance` and `exportGovernanceReport`.
    // The daemon answered every one with `unsupported-method`, so cleanup, duplicate
    // resolution, restore, refresh and the governance report were dead in that client
    // from their first click. `ProtocolConformanceTest` passed throughout: it checks
    // the envelope's *shape*, and never the method name inside it.
    const kotlin = sourcesOf('packages/animoria-jetbrains/src/main/kotlin', ['.kt']);
    const called = new Set<string>();

    for (const [, name] of kotlin.matchAll(/sendCommand\(\s*"([A-Za-z]+)"/g)) called.add(name!);
    // The `Method` object is the declared allow-list; every constant in it is a
    // method name, and reading it here is what makes adding one a checked act.
    const methodObject = /private object Method \{([\s\S]*?)\n {4}\}/.exec(kotlin)?.[1] ?? '';
    for (const [, name] of methodObject.matchAll(/= "([A-Za-z]+)"/g)) called.add(name!);

    const undeclared = [...called].filter((name) => !DAEMON_METHODS.includes(name as never));
    expect(
      undeclared,
      `JetBrains sends daemon methods the protocol does not declare: ${undeclared.join(', ')}`
    ).toEqual([]);
  });

  it('implements every method a client actually calls', () => {
    // `exportReport` was declared and deliberately unimplemented while two JetBrains
    // actions depended on it. A method may be declared-and-unimplemented only while
    // nothing calls it.
    const server = stripComments(read(join(REPO, 'packages/animoria-core/src/daemon/server.ts')));
    const unimplemented = new Set(
      [
        ...server.matchAll(
          /case '([A-Za-z]+)':\s*\n\s*return \{\s*\n?\s*error: daemonError\(\s*\n?\s*'unsupported-method'/g
        ),
      ].map((match) => match[1]!)
    );

    const kotlin = sourcesOf('packages/animoria-jetbrains/src/main/kotlin', ['.kt']);
    const methodObject = /private object Method \{([\s\S]*?)\n {4}\}/.exec(kotlin)?.[1] ?? '';
    const called = [
      ...[...kotlin.matchAll(/sendCommand\(\s*"([A-Za-z]+)"/g)].map((m) => m[1]!),
      ...[...methodObject.matchAll(/= "([A-Za-z]+)"/g)].map((m) => m[1]!),
    ];

    const dead = called.filter((name) => unimplemented.has(name));
    expect(
      dead,
      `called but not implemented in this build: ${[...new Set(dead)].join(', ')}`
    ).toEqual([]);
  });
});

// ── Silent failure ────────────────────────────────────────────────────────────

describe('clients — a contract mismatch is never swallowed', () => {
  it('Kotlin does not discard a decode failure', () => {
    // `catch (_: Exception) {}` around the analysis decode, plus a
    // `runCatching {}.onSuccess {}` with no failure branch, meant the JetBrains
    // plugin held no analysis at all and said nothing about it. Every surface showed
    // "waiting for the engine" forever, and the log was empty.
    const kotlin = sourcesOf('packages/animoria-jetbrains/src/main/kotlin', ['.kt']);

    expect(
      /catch\s*\(\s*_?\s*:?\s*[A-Za-z]*\s*\)\s*\{\s*\}/.test(kotlin),
      'an empty catch in a client is a contract mismatch with no witness'
    ).toBe(false);

    // The window has to clear a whole `onSuccess` body before it can reach
    // `onFailure`, and those bodies are several lines of mapping. Too narrow a window
    // fails on correct code, which is how a gate teaches people to delete it.
    const decodeSites = [
      ...kotlin.matchAll(/runCatching\s*\{[^}]*decodeFromJsonElement[\s\S]{0,900}/g),
    ];
    for (const [site] of decodeSites) {
      expect(
        site.includes('onFailure') || site.includes('getOrElse') || site.includes('getOrNull'),
        'a decode that can fail must have a failure branch'
      ).toBe(true);
    }
  });

  it('the shared UI reports an inbound message it had to reject', () => {
    // `onInvalid` was optional and no host supplied one, so every malformed host
    // message was dropped in silence. A rejected message must leave a trace: it is
    // the only signal that two sides of the boundary disagree.
    const transport = stripComments(
      read(join(REPO, 'packages/animoria-ui/src/bridge/postmessage-bridge.ts'))
    );
    expect(
      /onInvalid\)[\s\S]{0,200}console\.(error|warn)/.test(transport),
      'a rejected inbound message must be reported even when the host supplies no handler'
    ).toBe(true);
  });
});

// ── Contextual routing ────────────────────────────────────────────────────────

describe('hosts — an action that starts from a context arrives with it', () => {
  const extension = stripComments(read(join(REPO, 'packages/animoria-vscode/src/extension.ts')));

  it('never discards the context it just computed', () => {
    // `resolveDuplicates` resolved the group by content hash, routed it to the right
    // root, and then wrote `void group;` — deliberately dropping it — before opening
    // the panel on a bare duplicates tab. A developer who clicked "Resolve
    // Duplicates" on one finding arrived at every duplicate group in the workspace
    // with no indication which one they had asked about.
    expect(
      /void\s+(group|asset|diagnostic|finding)\s*;/.test(extension),
      'a command must not compute its context and then discard it'
    ).toBe(false);
  });

  it('opens the panel with the asset or group the command was about', () => {
    // Both `openPreview` and `resolveDuplicates` unwrapped and validated their
    // argument and then called `render(context, session, 'assets')` — a tab name and
    // nothing else. The panel is a singleton, so every entry point after the first
    // reached an already-open UI that stayed exactly where it was.
    // `show(context, session, surface, focus)` — one panel per capability. The old
    // `render(context, session, tab)` opened one everything-panel and switched a tab
    // inside it, which is the model this split removed.
    const renders = [...extension.matchAll(/AnimoriaWorkspacePanel\.show\(([\s\S]*?)\);/g)];
    expect(renders.length, 'the panel must be opened from at least one command').toBeGreaterThan(0);

    const contextual = renders.filter(([call]) => /assetPath|groupId/.test(call));
    // …and each capability gets its own surface rather than a tab in a shared one.
    const surfaces = new Set(
      renders.map(([call]) => /'(inspector|findings|duplicates|cleanup)'/.exec(call)?.[1])
    );
    expect(surfaces.size, 'capabilities must not share one generic panel').toBeGreaterThan(1);
    expect(
      contextual.length,
      'no command passes an asset or a group — every entry point lands on a generic tab'
    ).toBeGreaterThan(0);
  });

  it('routes focus through a message the contract names', () => {
    // The panel used to post `{ type: "focus", focus }` — a shape `INBOUND_TYPES`
    // does not contain and `validateInbound` rejects. It was dropped in silence,
    // because no host supplied an `onInvalid` handler either.
    const panel = stripComments(
      read(join(REPO, 'packages/animoria-vscode/src/panels/AnimoriaWorkspacePanel.ts'))
    );
    const focusPost = /postMessage\(\{[\s\S]*?type: 'focus'[\s\S]*?\}\)/.exec(panel)?.[0] ?? '';

    expect(INBOUND.includes('focus'), '"focus" must be part of the vocabulary').toBe(true);
    for (const field of ['tab', 'assetPath', 'groupId', 'rootId']) {
      expect(focusPost.includes(field), `the focus message must carry "${field}"`).toBe(true);
    }
  });
});

// ── Packaging ─────────────────────────────────────────────────────────────────

describe('packaging — a host ships the bundle it loads, and nothing else', () => {
  it('packages the resources the JetBrains panel asks for', () => {
    // `AnimoriaSharedUiPanel` loads `/web/animoria-ui.global.js` and `/web/tokens.css`
    // from the plugin jar. Gradle's `copySharedUi` task produces exactly those, into
    // `build/generated-resources/web`, and fails the build when the bundle is not
    // there — the same loud-failure rule VS Code's `copy-ui.mjs` follows.
    const panel = stripComments(
      read(
        join(
          REPO,
          'packages/animoria-jetbrains/src/main/kotlin/com/sxnnyside/animoria/ui/AnimoriaSharedUiPanel.kt'
        )
      )
    );
    const loaded = [...panel.matchAll(/loadResource\("([^"]+)"\)/g)].map((match) => match[1]!);
    expect(loaded.length, 'the panel must load its bundle from the jar').toBeGreaterThan(0);

    const gradle = read(join(REPO, 'packages/animoria-jetbrains/build.gradle.kts'));
    expect(gradle).toContain('copySharedUi');
    expect(gradle, 'processResources must depend on the bundle being copied').toContain(
      'dependsOn(copySharedUi)'
    );

    for (const resource of loaded) {
      const name = resource.slice(resource.lastIndexOf('/') + 1);
      expect(
        gradle.includes(name),
        `nothing packages "${resource}" — the plugin jar would ship without it`
      ).toBe(true);
    }
  });

  it('does not copy the sandbox harness into the plugin', () => {
    // `package:jetbrains` ran `cp -r apps/animoria-sandbox/dist/* …/resources/assets/`,
    // putting the *harness* — its own `index.html`, its own bundled `index.js` — into
    // the shipped jar, where no Kotlin code reads any of it. `CLAUDE.md` records this
    // exact failure as history: "the build even copied them into the JetBrains jar
    // where nothing read them". It had survived in the packaging script.
    const pkg = read(join(REPO, 'package.json'));
    expect(
      /animoria-sandbox\/dist[\s\S]{0,120}animoria-jetbrains/.test(pkg),
      'the JetBrains package step must not copy the sandbox build into the plugin'
    ).toBe(false);

    expect(
      existsSync(join(REPO, 'packages/animoria-jetbrains/src/main/resources/assets')),
      'the stray harness must not be present in the plugin resources'
    ).toBe(false);
  });

  it('fails the build rather than shipping a plugin with no UI', () => {
    const gradle = read(join(REPO, 'packages/animoria-jetbrains/build.gradle.kts'));
    expect(
      gradle.includes('require(bundle.exists())'),
      'a missing bundle is a broken build and must stop it'
    ).toBe(true);
  });

  it('fails the VS Code build the same way', () => {
    const script = read(join(REPO, 'packages/animoria-vscode/scripts/copy-ui.mjs'));
    expect(script).toContain('process.exit(1)');
  });
});

// ── Mounted surfaces ──────────────────────────────────────────────────────────

describe('JetBrains — the gallery is a surface, not only a model', () => {
  it('mounts the asset tree the product is for', () => {
    // `AnimoriaTreeModel` and `AnimoriaTreeCellRenderer` were complete — sections,
    // folder grouping, health and governance nodes, per-asset thumbnails with pending
    // and failed states, search, a flat/tree toggle — and nothing ever constructed a
    // `JTree` from them. Their only references were their own unit tests, so the tool
    // window shipped findings, duplicates and cleanup with no way to see the assets
    // those findings are about.
    //
    // A unit-tested model with no surface passes every test and ships no feature.
    const kotlin = sourcesOf('packages/animoria-jetbrains/src/main/kotlin', ['.kt']);

    expect(
      /Tree\(\s*model\s*\)|Tree\(\s*AnimoriaTreeModel/.test(kotlin),
      'AnimoriaTreeModel must be mounted in a real tree component'
    ).toBe(true);
    expect(
      kotlin.includes('AnimoriaTreeCellRenderer()'),
      'the renderer must be attached to that tree'
    ).toBe(true);
  });

  it('gives the gallery its own tool window tab', () => {
    const factory = stripComments(
      read(
        join(
          REPO,
          'packages/animoria-jetbrains/src/main/kotlin/com/sxnnyside/animoria/ui/AnimoriaToolWindowFactory.kt'
        )
      )
    );
    expect(factory).toContain('AnimoriaGalleryPanel');
    expect(factory, 'the gallery needs a named tab').toContain('"Assets"');
    // …and the preview keeps its own, which is what the split was for.
    expect(factory).toContain('"Preview"');
  });
});
