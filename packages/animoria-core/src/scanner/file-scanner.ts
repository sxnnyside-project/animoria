import { promises as fs, type Dirent } from 'node:fs';
import { type FileHandle, open } from 'node:fs/promises';
import { basename, extname, join, relative } from 'node:path';
import { performance } from 'node:perf_hooks';
import { logDebug } from '../logging/logger.js';
import { ParserRegistry } from '../parsers/parser-registry.js';
import { SUPPORTED_ASSET_EXTENSIONS } from '../types/formats.js';
import type { AnimoriaAsset, ScannerConfig, ScannerResult } from '../types/index.js';
import {
  DEFAULT_SCAN_EXCLUDE,
  DEFAULT_SCAN_EXCLUDE_DIRNAMES,
  globToRegex,
} from './glob-exclude.js';

const DEFAULT_MAX_FILE_SIZE = 10_485_760; // 10 MB

// Supported animated asset file extensions — see the canonical
// definition and rationale in `types/formats.ts`.
const SUPPORTED_EXTENSIONS = new Set(SUPPORTED_ASSET_EXTENSIONS);

/**
 * Reads the first chunk of bytes from a file safely and asynchronously.
 */
async function readFirstChunk(filePath: string, chunkSize = 1024): Promise<Buffer | null> {
  let fileHandle: FileHandle | undefined;
  try {
    fileHandle = await open(filePath, 'r');
    const buffer = Buffer.alloc(chunkSize);
    const { bytesRead } = await fileHandle.read(buffer, 0, chunkSize, 0);
    if (bytesRead === 0) return null;
    return buffer.subarray(0, bytesRead);
  } catch (err) {
    logDebug(
      'file-scan',
      'FileScanner.readFirstChunk',
      'Could not read first chunk of candidate file',
      {
        assetPath: filePath,
        reason: 'file open/read failed',
        error: err,
        recovery: 'candidate skipped',
      }
    );
    return null;
  } finally {
    await fileHandle?.close();
  }
}

/**
 * Reads a whole file safely and asynchronously, for use as the detection
 * chunk handed to `ParserRegistry.getParserFor` — unlike
 * {@link readFirstChunk}, this is not truncated.
 *
 * ## Why JSON (Lottie) needs this and binary formats don't
 * GIF/APNG/Rive signatures are always at byte 0 by format spec, so a 1KB
 * prefix is sufficient and cheap. Lottie/Bodymovin JSON has no such
 * guarantee: key order is not part of the spec, and real-world export
 * tools routinely emit a large `assets` array (embedded images, precomp
 * definitions) *before* the top-level `v`/`fr`/`ip`/`op` metadata keys —
 * observed in practice pushing `"v"` past byte 40,000 and `"fr"` to the
 * very end of a 125KB file. A fixed 1KB-prefix substring check for `"v"`
 * and `"layers"` silently excludes exactly this kind of file from the
 * scan entirely — not "shows a badge," not "fails to parse," but never
 * discovered as a candidate asset at all, invisible everywhere in the
 * product. Reading the whole file for a plain substring check is still
 * far cheaper than the full `JSON.parse` the parsing stage performs next
 * (no parse tree is built here), and file size is already bounded by
 * `maxFileSizeBytes` before this is ever called.
 */
async function readWholeFile(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath);
  } catch (err) {
    logDebug('file-scan', 'FileScanner.readWholeFile', 'Could not read candidate file', {
      assetPath: filePath,
      reason: 'file open/read failed',
      error: err,
      recovery: 'candidate skipped',
    });
    return null;
  }
}

/**
 * Walks a workspace's directory tree and discovers candidate animated
 * assets by extension and byte signature, without parsing them.
 *
 * Discovery and parsing are deliberately separate stages: `FileScanner`
 * only decides *which files exist and look like a supported format*
 * (cheap — a directory walk plus a 1KB read per candidate); `AssetParser`
 * then extracts each one's full metadata (parses the whole file). This
 * split is what lets `Animoria.run()` report scan progress before
 * parsing even starts, and lets either stage be reused independently
 * (the incremental indexer's single-file resolver, for instance, needs
 * parsing without a directory walk at all).
 */
export class FileScanner {
  constructor(private config: ScannerConfig) {}

  /** Recursively scans `config.workspacePath`, honoring `config.exclude` and `config.maxFileSizeBytes`. */
  async scan(): Promise<ScannerResult> {
    const start = performance.now();
    const { workspacePath, exclude = [], maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE } = this.config;

    const ignorePatterns = [...DEFAULT_SCAN_EXCLUDE, ...exclude];
    const excludeRegexes = ignorePatterns.map(globToRegex);

    const registry = ParserRegistry.getInstance();
    const assets: AnimoriaAsset[] = [];
    let scannedFiles = 0;

    const scanDir = async (dir: string): Promise<void> => {
      let entries: Dirent[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (err) {
        logDebug('file-scan', 'FileScanner.scanDir', 'Could not list directory contents', {
          assetPath: dir,
          reason: 'directory unreadable or inaccessible',
          error: err,
          recovery: 'skipped directory subtree',
        });
        return; // Skip directories without read permissions
      }

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relPath = relative(workspacePath, fullPath).replace(/\\/g, '/');
        const testPath = entry.isDirectory() ? `${relPath}/` : relPath;

        // Verify exclusion patterns using glob regexes
        if (excludeRegexes.some((rx) => rx.test(testPath))) {
          continue;
        }

        if (entry.isDirectory()) {
          // Direct short-circuit to avoid descending into default excludes
          if (DEFAULT_SCAN_EXCLUDE_DIRNAMES.has(entry.name)) {
            continue;
          }
          await scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (SUPPORTED_EXTENSIONS.has(ext)) {
            scannedFiles++;

            try {
              const stat = await fs.stat(fullPath);
              if (stat.size > maxFileSizeBytes) {
                continue;
              }

              const chunk =
                ext === '.json' ? await readWholeFile(fullPath) : await readFirstChunk(fullPath);
              if (!chunk) continue;

              const parser = registry.getParserFor(ext, chunk);
              if (parser) {
                const name = entry.name;
                const stem = basename(entry.name, ext);

                assets.push({
                  path: fullPath,
                  name,
                  stem,
                  format: parser.getFormat(),
                  sizeBytes: stat.size,
                  mtime: stat.mtimeMs,
                  status: 'pending',
                });
              }
            } catch (err) {
              logDebug(
                'file-scan',
                'FileScanner.scanDir',
                'Could not stat or read candidate file during scan',
                {
                  assetPath: fullPath,
                  reason: 'stat or chunk read failed',
                  error: err,
                  recovery: 'candidate skipped',
                }
              );
            }
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
