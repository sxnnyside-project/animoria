import { promises as fs, existsSync } from 'node:fs';
import { extname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { RustDaemonClient } from './src/host/rust-daemon-client.js';
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
      '@animoria/ui/bridge': fileURLToPath(
        new URL('../../packages/animoria-ui/src/bridge/index.ts', import.meta.url)
      ),
      '@animoria/ui': fileURLToPath(
        new URL('../../packages/animoria-ui/src/index.ts', import.meta.url)
      ),
      '@animoria/contracts': fileURLToPath(
        new URL('../../packages/animoria-contracts/src/index.ts', import.meta.url)
      ),
    },
  },
  plugins: [
    {
      /**
       * A **read-only** bridge between the browser harness and the real
       * `animoria` native daemon — the same Protocol v1 process VS Code and
       * JetBrains spawn. Every response the harness renders is Core's own
       * answer, not a second computation of it: a previous version of this
       * bridge imported `@animoria/core` (the legacy TypeScript engine) by
       * relative path, which meant the harness used to build and review
       * `@animoria/ui` ran a different engine than the one that ships.
       *
       * ## What this bridge deliberately cannot do
       * It exposes no endpoint that mutates the filesystem. Destructive
       * operations belong to clients that can stage, preview, and reverse
       * them; a UI development harness has no reason to own that power.
       */
      name: 'animoria-daemon-bridge',
      // Dev server only. Vitest also constructs a serve-mode Vite server, and
      // spawning a real daemon subprocess inside a unit-test run is both
      // wasteful and a source of cross-test interference.
      apply: 'serve',
      configureServer(server) {
        if (process.env.VITEST) return;

        const workspacePath = resolveWorkspacePath();
        if (!existsSync(workspacePath)) {
          server.config.logger.warn(
            `[Animoria Bridge] Workspace not found: ${workspacePath}\n  Set ANIMORIA_SANDBOX_WORKSPACE to point the harness at an existing directory.`
          );
        }

        const daemon = new RustDaemonClient();
        const ready = daemon
          .start()
          .then(() => {
            server.config.logger.info(
              `[Animoria Bridge] Connected to the native daemon for ${workspacePath}`
            );
          })
          .catch((err) => {
            server.config.logger.error(
              `[Animoria Bridge] Failed to start the native daemon: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          });

        server.httpServer?.once('close', () => {
          void daemon.stop();
        });

        interface ScanResult {
          analysis: {
            root_id: string;
            root_path: string;
            state: string;
            assets: unknown[];
            diagnostics: unknown[];
            health_score: unknown;
            indexed_at_ms: number;
          };
          references: { asset_id: string }[];
          duplicate_groups: unknown[];
        }

        async function scan(): Promise<ScanResult> {
          return daemon.request<ScanResult>('scan', { workspace_path: workspacePath });
        }

        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url || '', `http://${req.headers.host}`);

          // Every mutating verb is refused outright, so a new write endpoint cannot
          // be added by accident and an old one cannot be reached by a stale client.
          if (url.pathname.startsWith('/api/') && req.method !== 'GET') {
            res.statusCode = 405;
            res.setHeader('Allow', 'GET');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'The Animoria sandbox bridge is read-only.' }));
            return;
          }

          if (url.pathname === '/api/status') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ connected: true, workspacePath, readOnly: true }));
            return;
          }

          // ── Canonical analysis ────────────────────────────────────────────
          // Rescanned on every request: the daemon's own benchmarks put a scan of
          // a workspace this size at single-digit milliseconds, so a fresh answer
          // costs less than the staleness bugs a cache would need to avoid.
          if (url.pathname === '/api/analysis' || url.pathname === '/api/snapshot') {
            try {
              await ready;
              const result = await scan();

              const refCounts: Record<string, number> = {};
              for (const r of result.references) {
                refCounts[r.asset_id] = (refCounts[r.asset_id] ?? 0) + 1;
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  roots: [result.analysis],
                  assets: result.analysis.assets,
                  duplicateGroups: result.duplicate_groups,
                  referenceCounts: refCounts,
                  readiness: { referencesResolved: true },
                })
              );
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: message }));
            }
            return;
          }

          if (url.pathname === '/api/lottie-document') {
            try {
              await ready;
              const assetPath = url.searchParams.get('assetPath') ?? '';
              const document = await daemon.request('getLottieDocument', { assetPath });
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(document));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
            }
            return;
          }

          if (url.pathname === '/api/snippets') {
            try {
              await ready;
              const assetPath = url.searchParams.get('assetPath') ?? '';
              const response = await daemon.request<{ results: unknown[]; error?: string | null }>(
                'generateSnippet',
                { assetPath, workspace_path: workspacePath }
              );
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(response.results ?? []));
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
              const response = await daemon.request('getUsageReferences', {
                assetPath,
                workspace_path: workspacePath,
              });
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(response));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
            }
            return;
          }

          // ── Cleanup / resolution, read-only ─────────────────────────────────
          // The harness can build and preview a plan; it can never apply one —
          // there is no `applyCleanupPlan`/`applyResolutionPlan` endpoint here,
          // and the blanket non-GET refusal above means one cannot be added by
          // accident either.
          if (url.pathname === '/api/cleanup-proposal') {
            try {
              await ready;
              const dismissed = (url.searchParams.get('dismissed') ?? '')
                .split('\n')
                .filter((p) => p.length > 0);
              const response = await daemon.request<{ roots: unknown[] }>('buildCleanupProposal', {
                workspace_path: workspacePath,
                dismissedPaths: dismissed,
              });
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(response.roots ?? []));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
            }
            return;
          }

          if (url.pathname === '/api/cleanup-plan') {
            try {
              await ready;
              const selected = (url.searchParams.get('paths') ?? '')
                .split('\n')
                .filter((p) => p.length > 0);
              const response = await daemon.request<{ plans: unknown[] }>('buildCleanupPlan', {
                workspace_path: workspacePath,
                assetPaths: selected,
              });
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(response.plans ?? []));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
            }
            return;
          }

          if (url.pathname === '/api/resolution-plan') {
            try {
              await ready;
              const groupId = url.searchParams.get('groupId') ?? '';
              const keepPath = url.searchParams.get('keepPath') ?? '';
              const response = await daemon.request('buildResolutionPlan', {
                workspace_path: workspacePath,
                groupId,
                keepPath,
              });
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(response));
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
