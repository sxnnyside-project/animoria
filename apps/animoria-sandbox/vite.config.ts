import { defineConfig } from 'vite';
import { promises as fs, existsSync, watch } from 'node:fs';
import { join, extname } from 'node:path';
import { WorkspaceIndexer } from '../../packages/animoria-core/src/indexer/workspace-indexer.js';
import { StaticAssetScanner } from '../../packages/animoria-core/src/scanner/static-asset-scanner.js';
import { ThumbnailEngine } from '../../packages/animoria-core/src/thumbnails/thumbnail-engine.js';
import { GovernanceAnalyzer } from '../../packages/animoria-core/src/governance/governance-analyzer.js';
import { buildResolutionPlan } from '../../packages/animoria-core/src/governance/duplicates/resolution-plan.js';
import { validateResolutionPlan } from '../../packages/animoria-core/src/governance/duplicates/resolution-plan-validator.js';

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
  plugins: [
    {
      name: 'animoria-core-bridge',
      configureServer(server) {
        const workspacePath = new URL('../../', import.meta.url).pathname;

        const indexer = new WorkspaceIndexer({
          workspacePath,
        });

        // Initialize the indexer on server start
        indexer
          .initialize()
          .then(() => {
            console.log('[Animoria Bridge] WorkspaceIndexer initialized for', workspacePath);
          })
          .catch((err) => {
            console.error('[Animoria Bridge] Failed to initialize indexer:', err);
          });

        // Start filesystem watch and feed updates to the indexer
        const EXCLUDE_DIRS = new Set([
          'node_modules',
          '.git',
          'dist',
          'build',
          '.turbo',
          '.animoria',
        ]);
        watch(workspacePath, { recursive: true }, (eventType, filename) => {
          if (!filename) return;
          const parts = filename.split(/[/\\]/);
          if (parts.some((part) => EXCLUDE_DIRS.has(part))) {
            return;
          }
          const fullPath = join(workspacePath, filename);
          const exists = existsSync(fullPath);
          const kind = !exists ? 'deleted' : eventType === 'rename' ? 'created' : 'changed';
          indexer.notifyFileChanged(fullPath, kind as 'created' | 'changed' | 'deleted');
        });

        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url || '', `http://${req.headers.host}`);

          if (url.pathname === '/api/status') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ connected: true, workspacePath }));
            return;
          }

          if (url.pathname === '/api/snapshot') {
            try {
              const snap = indexer.getSnapshot();

              // Generate thumbnails in the background/on-demand
              const generator = new ThumbnailEngine({
                workspacePath,
                frame: 'middle',
              });
              try {
                const batch = await generator.generateBatch([...snap.assets]);
                for (const r of batch.results) {
                  if (r.thumbnailPath) {
                    const found = snap.assets.find((a) => a.path === r.asset.path);
                    if (found) {
                      found.thumbnailPath = r.thumbnailPath;
                    }
                  }
                }
              } catch (e) {
                console.error('[Animoria Bridge] Thumbnail generation error:', e);
              } finally {
                await generator.dispose();
              }

              // Scan static assets
              const scanner = new StaticAssetScanner({
                workspacePath,
                exclude: [...indexer.getIgnorePatterns()],
              });
              const staticResult = await scanner.scan();
              const animatedPaths = new Set(snap.assets.map((a) => a.path));
              const staticOnly = staticResult.assets.filter((a) => !animatedPaths.has(a.path));

              // Compute Governance Report
              const analyzer = new GovernanceAnalyzer({
                workspacePath,
                assets: [...snap.assets],
                overusedThreshold: 10,
              });
              const governanceReport = await analyzer.analyze();

              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  assets: snap.assets,
                  ruleReport: snap.ruleReport,
                  healthScore: snap.healthScore,
                  referenceCounts: Array.from(snap.referenceCounts.entries()),
                  staticAssets: staticOnly,
                  governanceReport,
                })
              );
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: message }));
            }
            return;
          }

          if (url.pathname === '/api/file') {
            const filePath = url.searchParams.get('path');
            if (!filePath || !filePath.startsWith(workspacePath)) {
              res.statusCode = 400;
              res.end('Invalid path or outside workspace');
              return;
            }

            try {
              if (existsSync(filePath)) {
                const ext = extname(filePath).toLowerCase();
                const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
                const data = await fs.readFile(filePath);
                res.setHeader('Content-Type', mimeType);
                res.end(data);
              } else {
                res.statusCode = 404;
                res.end('File not found');
              }
            } catch (err) {
              res.statusCode = 500;
              res.end(err instanceof Error ? err.message : String(err));
            }
            return;
          }

          if (url.pathname === '/api/delete-asset' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const { path } = JSON.parse(body);
                if (!path || !path.startsWith(workspacePath)) {
                  res.statusCode = 400;
                  res.end('Invalid path');
                  return;
                }
                if (existsSync(path)) {
                  await fs.unlink(path);
                  indexer.notifyFileChanged(path, 'deleted');
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: message }));
              }
            });
            return;
          }

          if (url.pathname === '/api/resolve-duplicates' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const { canonicalPath, duplicatePaths } = JSON.parse(body);
                const snap = indexer.getSnapshot();
                const canonicalAsset = snap.assets.find((a) => a.path === canonicalPath);
                const duplicateAssets = snap.assets.filter((a) => duplicatePaths.includes(a.path));

                if (!canonicalAsset || duplicateAssets.length === 0) {
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({ error: 'Canonical or duplicate assets not found in index' })
                  );
                  return;
                }

                const groupAssets = [canonicalAsset, ...duplicateAssets];
                const referenceCounts = snap.referenceCounts;

                // Build duplicate group shape
                const candidates = groupAssets.map((asset) => ({
                  asset,
                  referenceCount: referenceCounts.get(asset.path) ?? 0,
                }));

                const duplicateGroup = {
                  id: groupAssets
                    .map((a) => a.path)
                    .sort()
                    .join('|'),
                  candidates,
                  sizeBytes: canonicalAsset.sizeBytes,
                  potentialSavingsBytes: (candidates.length - 1) * canonicalAsset.sizeBytes,
                };

                // Build resolution plan
                const plan = await buildResolutionPlan({
                  group: duplicateGroup,
                  canonicalPath,
                  workspacePath,
                });

                // Validate the plan
                const validation = await validateResolutionPlan(plan);
                if (!validation.valid) {
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({ error: 'Plan validation failed', details: validation.issues })
                  );
                  return;
                }

                // Execute the reference updates
                for (const update of plan.referenceUpdates) {
                  if (existsSync(update.file)) {
                    const content = await fs.readFile(update.file, 'utf-8');
                    const lines = content.split('\n');
                    lines[update.line - 1] = update.newText;
                    await fs.writeFile(update.file, lines.join('\n'), 'utf-8');
                    indexer.notifyFileChanged(update.file, 'changed');
                  }
                }

                // Delete duplicate assets
                for (const asset of plan.assetsToDelete) {
                  if (existsSync(asset.path)) {
                    await fs.unlink(asset.path);
                    indexer.notifyFileChanged(asset.path, 'deleted');
                  }
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: message }));
              }
            });
            return;
          }

          if (url.pathname === '/api/execute-cleanup' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const { decisions } = JSON.parse(body) as {
                  decisions: Array<{ path: string; decision: string }>;
                };

                for (const item of decisions) {
                  if (item.decision === 'remove') {
                    if (existsSync(item.path)) {
                      await fs.unlink(item.path);
                      indexer.notifyFileChanged(item.path, 'deleted');
                    }
                  }
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: message }));
              }
            });
            return;
          }

          next();
        });
      },
    },
  ],
});
