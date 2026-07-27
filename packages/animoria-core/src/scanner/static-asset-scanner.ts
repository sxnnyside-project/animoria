import { promises as fs, type Dirent } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import { performance } from 'node:perf_hooks';
import { logDebug } from '../logging/logger.js';
import { SUPPORTED_STATIC_ASSET_EXTENSIONS, staticFormatForExtension } from '../types/formats.js';
import type { ScannerConfig } from '../types/index.js';
import type { AnimoriaStaticAsset } from '../types/static-asset.js';
import {
  DEFAULT_SCAN_EXCLUDE,
  DEFAULT_SCAN_EXCLUDE_DIRNAMES,
  globToRegex,
} from './glob-exclude.js';

const SUPPORTED_STATIC_EXTENSIONS = new Set(SUPPORTED_STATIC_ASSET_EXTENSIONS);

export interface StaticScanResult {
  assets: AnimoriaStaticAsset[];
  scannedFiles: number;
  durationMs: number;
}

/**
 * Walks a workspace's directory tree and discovers static visual assets
 * (SVG without animation evidence, PNG, JPEG, WebP, AVIF) by extension.
 *
 * Deliberately a separate, simpler scanner from `FileScanner` rather than
 * a shared code path with extra branching: static assets have no parsing
 * stage (no metadata to extract — see `AnimoriaStaticAsset`), so there is
 * nothing here beyond "does this file exist and match a known extension."
 * Directory-walking rules (exclusions) are still shared via
 * `glob-exclude.js` so the two scanners can never disagree about which
 * directories are off-limits.
 *
 * `.svg` files are included here unconditionally — this scanner does not
 * know whether a given `.svg` also matched `SvgAnimatedParser` as
 * animated. Callers that need "static-only, no animated overlap" (e.g.
 * the sidebar's Static Assets section) filter out paths already present
 * in the animated `AnimoriaAsset[]` list, since a single `.svg` is either
 * animated or static, never both.
 */
export class StaticAssetScanner {
  constructor(private config: ScannerConfig) {}

  async scan(): Promise<StaticScanResult> {
    const start = performance.now();
    const { workspacePath, exclude = [], maxFileSizeBytes = 10_485_760 } = this.config;

    const ignorePatterns = [...DEFAULT_SCAN_EXCLUDE, ...exclude];
    const excludeRegexes = ignorePatterns.map(globToRegex);

    const assets: AnimoriaStaticAsset[] = [];
    let scannedFiles = 0;

    const scanDir = async (dir: string): Promise<void> => {
      let entries: Dirent[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (err) {
        logDebug('file-scan', 'StaticAssetScanner.scanDir', 'Could not list directory contents', {
          assetPath: dir,
          reason: 'directory unreadable or inaccessible',
          error: err,
          recovery: 'skipped directory subtree',
        });
        return;
      }

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relPath = relative(workspacePath, fullPath).replace(/\\/g, '/');
        const testPath = entry.isDirectory() ? `${relPath}/` : relPath;

        if (excludeRegexes.some((rx) => rx.test(testPath))) continue;

        if (entry.isDirectory()) {
          if (DEFAULT_SCAN_EXCLUDE_DIRNAMES.has(entry.name)) continue;
          await scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (!SUPPORTED_STATIC_EXTENSIONS.has(ext)) continue;

          const format = staticFormatForExtension(ext);
          if (!format) continue;

          scannedFiles++;

          try {
            const stat = await fs.stat(fullPath);
            if (stat.size > maxFileSizeBytes) continue;

            assets.push({
              path: fullPath,
              name: entry.name,
              stem: basename(entry.name, ext),
              format,
              sizeBytes: stat.size,
              mtime: stat.mtimeMs,
            });
          } catch (err) {
            logDebug(
              'file-scan',
              'StaticAssetScanner.scanDir',
              'Could not stat candidate static asset file',
              {
                assetPath: fullPath,
                reason: 'stat failed',
                error: err,
                recovery: 'candidate skipped',
              }
            );
          }
        }
      }
    };

    await scanDir(workspacePath);

    return {
      assets,
      scannedFiles,
      durationMs: performance.now() - start,
    };
  }
}
