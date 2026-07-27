import type { Stats } from 'node:fs';
import { type FileHandle, open, readFile, stat } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { logDebug } from '../logging/logger.js';
import { ParserRegistry } from '../parsers/parser-registry.js';
import type { AnimoriaAsset } from '../types/asset.js';

const CHUNK_SIZE = 1024;

/**
 * Resolves and fully parses a single asset by path, without walking any
 * directory tree.
 *
 * ## Why this exists alongside `FileScanner` and `AssetParser`
 * `FileScanner` discovers *many* candidate files by traversing the
 * workspace; `AssetParser` then parses *many* discovered assets
 * concurrently. Both are batch-shaped by design. When exactly one path
 * is known to have changed — the case the incremental indexer handles
 * on every filesystem event — walking the whole tree or standing up a
 * batch pipeline for a single item would be pure waste. This function is
 * the single-item counterpart: read one file's stats and leading bytes,
 * ask the same {@link ParserRegistry} the batch pipeline uses whether
 * any parser claims it, and parse it fully.
 *
 * Reusing `ParserRegistry` (rather than duplicating format-detection
 * logic) means a new asset format registered for the batch scanner is
 * automatically supported here too, with nothing further to update.
 *
 * @param filePath - Absolute path to the file to resolve.
 * @returns A fully-parsed {@link AnimoriaAsset} (`status: 'parsed'` or
 *   `'error'`), or `null` if the path is not a recognized animated asset
 *   format, or the file could not be read (including: it no longer
 *   exists — the caller should treat `null` as "not present" and remove
 *   any prior entry for this path rather than treating it as failure).
 */
export async function resolveAndParseAsset(filePath: string): Promise<AnimoriaAsset | null> {
  const ext = extname(filePath).toLowerCase();

  let stats: Stats;
  try {
    stats = await stat(filePath);
  } catch (err) {
    logDebug(
      'asset-parse',
      'resolveAndParseAsset',
      'File no longer exists by the time it was resolved',
      {
        assetPath: filePath,
        reason: 'stat failed',
        error: err,
        recovery: 'returned null; caller treats this as absent, not an error',
      }
    );
    return null; // Gone by the time we got here — not an error, just absent.
  }
  if (!stats.isFile()) return null;

  const chunk = await readFirstChunk(filePath);
  if (!chunk) return null;

  const registry = ParserRegistry.getInstance();
  const parser = registry.getParserFor(ext, chunk);
  if (!parser) return null; // Not a format Animoria recognizes.

  const name = basename(filePath);
  const stem = basename(filePath, ext);
  const format = parser.getFormat();

  try {
    const buffer = await readFile(filePath);
    const metadata = await parser.parse(filePath, buffer);
    return {
      path: filePath,
      name,
      stem,
      format,
      sizeBytes: stats.size,
      mtime: stats.mtimeMs,
      status: 'parsed',
      metadata,
    };
  } catch (err) {
    return {
      path: filePath,
      name,
      stem,
      format,
      sizeBytes: stats.size,
      mtime: stats.mtimeMs,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function readFirstChunk(filePath: string): Promise<Buffer | null> {
  let handle: FileHandle | undefined;
  try {
    handle = await open(filePath, 'r');
    const buffer = Buffer.alloc(CHUNK_SIZE);
    const { bytesRead } = await handle.read(buffer, 0, CHUNK_SIZE, 0);
    if (bytesRead === 0) return null;
    return buffer.subarray(0, bytesRead);
  } catch (err) {
    logDebug('asset-parse', 'readFirstChunk', 'Could not read first chunk of file', {
      assetPath: filePath,
      reason: 'file open/read failed',
      error: err,
      recovery: 'treated as unparseable',
    });
    return null;
  } finally {
    await handle?.close();
  }
}
