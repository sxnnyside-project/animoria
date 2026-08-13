import { promises as fs, existsSync, watch } from 'node:fs';
import { extname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { buildCleanupCandidates } from '../../packages/animoria-core/src/analysis/cleanup-candidates.js';
import { readLottieDocument } from '../../packages/animoria-core/src/parsers/lottie-document.js';
import { integrationRegistry } from '../../packages/animoria-core/src/integration/index.js';
import {
  computeWorkspaceRelativePath,
  toImportSpecifier,
} from '../../packages/animoria-core/src/integration/path-resolution.js';
import {
  buildCleanupPlan,
  buildReviewableProposal,
} from '../../packages/animoria-core/src/cleanup/cleanup-plan.js';
import { buildResolutionPlan } from '../../packages/animoria-core/src/governance/duplicates/resolution-plan.js';
import { WorkspaceSession } from '../../packages/animoria-core/src/workspace/workspace-session.js';
import { StaticAssetScanner } from '../../packages/animoria-core/src/scanner/static-asset-scanner.js';
import { ThumbnailEngine } from '../../packages/animoria-core/src/thumbnails/thumbnail-engine.js';
import { resolveWithinRoot } from './src/bridge/path-containment.js';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.json': 'application/json',
  '.lottie': 'application/zip',
};

/**
 * The workspace this dev bridge inspects.
 *
 * ## Why this is never the Animoria repository
 * This previously defaulted to the repository root — so a UI development server
 * was pointed at the developer's own working copy. Combined with the write
 * endpoints this bridge used to expose, that made "iterate on a component" and
 * "delete files from your checkout" the same HTTP surface.
 *
 * The default is now the committed fixture set, which is disposable by
 * construction. `ANIMORIA_SANDBOX_WORKSPACE` overrides it for anyone who wants to
 * point the harness at a scratch project of their own.
 *
 * `fileURLToPath` rather than `URL.pathname`: the latter yields `/C:/...` on
 * Windows, which is not a usable filesystem path.
 */
function resolveWorkspacePath(): string {
  const override = process.env.ANIMORIA_SANDBOX_WORKSPACE;
  if (override && override.trim().length > 0) return resolvePath(override);
  return fileURLToPath(new URL('../../fixtures/', import.meta.url));
}

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
      '@animoria/ui/tokens.css': fileURLToPath(
        new URL('../../packages/animoria-ui/src/styles/tokens.css', import.meta.url)
      ),
      '@animoria/ui': fileURLToPath(
        new URL('../../packages/animoria-ui/src/index.ts', import.meta.url)
      ),
      '@animoria/core/contracts': fileURLToPath(
        new URL('../../packages/animoria-core/src/contracts.ts', import.meta.url)
      ),
      '@animoria/core/i18n': fileURLToPath(
        new URL('../../packages/animoria-core/src/i18n/locales.ts', import.meta.url)
      ),
      '@animoria/core': fileURLToPath(
        new URL('../../packages/animoria-core/src/index.ts', import.meta.url)
      ),
    },
  },
  plugins: [
    {
      /**
       * A **read-only** bridge between the browser harness and a real
       * `@animoria/core` index.
       *
       * ## What this bridge deliberately cannot do
       * It exposes no endpoint that mutates the filesystem. It previously offered
       * `POST /api/delete-asset`, `POST /api/execute-cleanup`, and
       * `POST /api/resolve-duplicates`, which between them called `fs.unlink` on
       * caller-supplied paths and rewrote source files in place — with no staging,
       * no undo, and (for `execute-cleanup`) no path validation at all.
       *
       * Destructive operations belong to the clients that can stage, preview, and
       * reverse them. A UI development harness has no reason to own that power, so
       * it does not have it. If a future harness genuinely needs write behaviour,
       * it must go through Core's staged-deletion path and be opt-in per run — not
       * be an unauthenticated endpoint that is always on.
       */
      name: 'animoria-core-bridge',
      // Dev server only. Vitest also constructs a serve-mode Vite server, and
      // booting a real workspace indexer plus a recursive filesystem watcher inside
      // a unit-test run is both wasteful and a source of cross-test interference.
      apply: 'serve',
      configureServer(server) {
        if (process.env.VITEST) return;

        const workspacePath = resolveWorkspacePath();

        if (!existsSync(workspacePath)) {
          server.config.logger.warn(
            `[Animoria Bridge] Workspace not found: ${workspacePath}\n  Set ANIMORIA_SANDBOX_WORKSPACE to point the harness at an existing directory.`
          );
        }

        const session = new WorkspaceSession([workspacePath]);

        // Awaited before any request is served. `getSnapshot()` used to be called
        // while this promise was still pending, so the first page load rendered an
        // empty gallery that was indistinguishable from a genuinely empty
        // workspace.
        const ready = session
          .initialize()
          .then(() => {
            server.config.logger.info(`[Animoria Bridge] Indexed ${workspacePath}`);
          })
          .catch((err) => {
            server.config.logger.error(
              `[Animoria Bridge] Failed to index workspace: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          });

        // Observing the workspace keeps the harness live while a fixture is edited.
        // Reads only — the indexer is told what changed; nothing here writes.
        const EXCLUDE_DIRS = new Set([
          'node_modules',
          '.git',
          'dist',
          'build',
          '.turbo',
          '.animoria',
        ]);
        if (existsSync(workspacePath)) {
          watch(workspacePath, { recursive: true }, (eventType, filename) => {
            if (!filename) return;
            if (filename.split(/[/\\]/).some((part) => EXCLUDE_DIRS.has(part))) return;
            const fullPath = join(workspacePath, filename);
            const kind = !existsSync(fullPath)
              ? 'deleted'
              : eventType === 'rename'
                ? 'created'
                : 'changed';
            const rootId = session.roots[0]?.id;
            if (rootId) {
              const idx = session.indexerForRoot(rootId);
              if (idx) idx.notifyFileChanged(fullPath, kind);
            }
          });
        }

        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url || '', `http://${req.headers.host}`);

          // Every mutating verb is refused outright, so a new write endpoint cannot
          // be added by accident and an old one cannot be reached by a stale client.
          if (url.pathname.startsWith('/api/') && req.method !== 'GET') {
            res.statusCode = 405;
            res.setHeader('Allow', 'GET');
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: 'The Animoria sandbox bridge is read-only.',
              })
            );
            return;
          }

          if (url.pathname === '/api/status') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ connected: true, workspacePath, readOnly: true }));
            return;
          }

          // ── Canonical analysis ────────────────────────────────────────────
          // Renamed from `/api/snapshot`: what it serves is a `WorkspaceAnalysis`,
          // and calling it a snapshot is what let the old harness treat it as one
          // input among several rather than as the single result.
          if (url.pathname === '/api/analysis' || url.pathname === '/api/snapshot') {
            try {
              await ready;
              const snap = session.getAnalysis();

              const generator = new ThumbnailEngine({ workspacePath, frame: 'middle' });
              try {
                const batch = await generator.generateBatch([...snap.assets].map((a) => a.asset));
                for (const r of batch.results) {
                  if (r.thumbnailPath) {
                    const found = snap.assets.find((a) => a.asset.path === r.asset.path);
                    if (found) found.asset.thumbnailPath = r.thumbnailPath; // Mock the path
                  }
                }
              } catch (e) {
                server.config.logger.error(`[Animoria Bridge] Thumbnail generation error: ${e}`);
              } finally {
                await generator.dispose();
              }

              const root = session.roots[0];
              const scanner = new StaticAssetScanner({
                workspacePath,
                exclude: root ? [...session.indexerForRoot(root.id)!.getIgnorePatterns()] : [],
              });
              const staticResult = await scanner.scan();
              const animatedPaths = new Set(snap.assets.map((a) => a.asset.path));
              const staticOnly = staticResult.assets.filter((a) => !animatedPaths.has(a.path));

              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ...snap,
                  roots: snap.roots.map((r) => ({
                    ...r,
                    analysis: {
                      ...r.analysis,
                      referenceCounts: Array.from(r.analysis.referenceCounts.entries()),
                    },
                  })),
                  staticAssets: staticOnly,
                })
              );
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: message }));
            }
            return;
          }

          // ── Cleanup, read-only ────────────────────────────────────────────
          // The harness can build and preview a plan; it can never apply one. Both
          // endpoints are GET, and the blanket non-GET refusal above means no apply
          // endpoint can be added by accident.
          // ── Usage references ──────────────────────────────────────────────
          //
          // Core's own reference index, not a substring search here. The harness must
          // show the same usages a real host does, or reviewing the inspector against
          // it proves nothing.
          // ── Lottie document ───────────────────────────────────────────────
          //
          // Core's own reader, so the harness plays exactly the document the IDEs do.
          if (url.pathname === '/api/lottie-document') {
            try {
              await ready;
              const assetPath = url.searchParams.get('assetPath') ?? '';
              const located = session.indexerForPath(assetPath);
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify(located ? ((await readLottieDocument(assetPath)) ?? null) : null)
              );
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
            }
            return;
          }

          // ── Snippets ──────────────────────────────────────────────────────
          if (url.pathname === '/api/snippets') {
            try {
              await ready;
              const assetPath = url.searchParams.get('assetPath') ?? '';
              const located = session.indexerForPath(assetPath);
              const asset = located?.indexer
                .getAnalysis()
                .assets.find((entry) => entry.path === assetPath);

              const results = asset
                ? integrationRegistry.generate(
                    buildIntegrationContext(asset, located?.root.path ?? workspacePath)
                  )
                : [];

              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify(
                  results.map((result) => ({
                    label: result.label,
                    language: result.language,
                    code: result.code,
                    imports: result.imports ?? null,
                    installHint: result.installHint ?? null,
                  }))
                )
              );
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
            }
            return;
          }

          if (url.pathname === '/api/usage-references') {
            try {
              await ready;
              const assetPath = url.searchParams.get('assetPath') ?? '';
              const located = session.indexerForPath(assetPath);
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  assetPath,
                  references: located?.indexer.usageReferencesFor(assetPath) ?? [],
                  complete: session.getAnalysis().readiness.referencesResolved,
                })
              );
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
            }
            return;
          }

          if (url.pathname === '/api/cleanup-proposal') {
            try {
              await ready;
              const snap = session.getAnalysis();
              // The harness passes real dismissals through, so the read-only claim
              // stays about the *workspace* rather than about the review flow.
              const dismissedPaths = new Set(
                (url.searchParams.get('dismissed') ?? '').split('\n').filter((p) => p.length > 0)
              );
              const proposals = [];
              for (const root of session.roots) {
                const idx = session.indexerForRoot(root.id);
                if (!idx) continue;
                const analysis = idx.getAnalysis();
                const proposal = await buildReviewableProposal(
                  buildCleanupCandidates(analysis, { dismissedPaths }),
                  analysis
                );
                proposals.push({ rootId: root.id, rootName: root.name, proposal });
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(proposals));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
            }
            return;
          }

          if (url.pathname === '/api/cleanup-plan') {
            try {
              await ready;
              const snap = session.getAnalysis();
              const plans = [];
              const selected = (url.searchParams.get('paths') ?? '')
                .split('\n')
                .filter((p) => p.length > 0);

              for (const root of session.roots) {
                const idx = session.indexerForRoot(root.id);
                if (!idx) continue;
                const analysis = idx.getAnalysis();
                const proposal = await buildReviewableProposal(
                  buildCleanupCandidates(analysis),
                  analysis
                );
                const plan = buildCleanupPlan(proposal, analysis, selected);
                plans.push({ rootId: root.id, rootName: root.name, planId: plan.planId, plan });
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(plans));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
            }
            return;
          }

          if (url.pathname === '/api/resolution-plan') {
            try {
              await ready;
              const snap = session.getAnalysis();
              const group = snap.duplicateGroups.find(
                (g) => g.id === url.searchParams.get('groupId')
              );
              const keepPath = url.searchParams.get('keepPath') ?? '';
              const canonical = group?.candidates.find((c) => c.asset.path === keepPath)?.asset;

              if (!group || !canonical) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'No such duplicate group or candidate.' }));
                return;
              }

              // Building a plan reads the filesystem and writes nothing — which is
              // exactly why previewing a resolution is safe in a read-only harness,
              // and why `executeResolutionPlan` is the only privileged half.
              const rootPath = session.roots[0]?.path ?? workspacePath;
              const plan = await buildResolutionPlan({
                workspacePath: rootPath,
                group,
                canonicalAsset: canonical,
              });
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  planId: `sandbox-${group.id}-${Date.now()}`,
                  plan,
                  rootId: session.roots[0]?.id,
                  rootName: session.roots[0]?.name,
                })
              );
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
            }
            return;
          }

          if (url.pathname === '/api/file') {
            // Containment is decided after normalization — see `resolveWithinRoot`
            // for why a `startsWith` prefix test (what this used to do) is not a
            // boundary.
            const requested = url.searchParams.get('path');
            const filePath = requested ? resolveWithinRoot(workspacePath, requested) : null;
            if (!filePath) {
              res.statusCode = 400;
              res.end('Path is missing or resolves outside the workspace root');
              return;
            }

            try {
              const stats = await fs.stat(filePath).catch(() => null);
              if (!stats?.isFile()) {
                res.statusCode = 404;
                res.end('File not found');
                return;
              }
              const mimeType =
                MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
              res.setHeader('Content-Type', mimeType);
              res.end(await fs.readFile(filePath));
            } catch (err) {
              res.statusCode = 500;
              res.end(err instanceof Error ? err.message : String(err));
            }
            return;
          }

          next();
        });
      },
    },
  ],
});

/** The integration context for one asset, matching what the IDE hosts build. */
function buildIntegrationContext(
  asset: import('../../packages/animoria-core/src/types/asset.js').AnimoriaAsset,
  workspacePath: string
) {
  const workspaceRelativePath = computeWorkspaceRelativePath(workspacePath, asset.path);
  return {
    asset,
    importPath: toImportSpecifier(workspaceRelativePath),
    workspaceRelativePath,
    pathResolutionBasis: 'workspace-root' as const,
    workspacePath,
  };
}
