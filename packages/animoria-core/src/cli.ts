import { promises as fs, existsSync, watch } from 'fs';
import { open } from 'fs/promises';
import { join, basename, extname } from 'path';
import { Animoria } from './animoria.js';
import { ParserRegistry } from './parsers/parser-registry.js';
import type { AnimoriaAsset } from './types/index.js';

const workspacePath = process.argv[2];
if (!workspacePath) {
  console.error(
    JSON.stringify({ event: 'error', data: { message: 'No workspace path provided' } })
  );
  process.exit(1);
}

const SUPPORTED_EXTENSIONS = new Set(['.json', '.lottie', '.rive', '.gif', '.apng', '.svg']);
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.turbo', '.animoria']);

async function start() {
  const animoria = new Animoria({
    workspacePath,
    onScanComplete: (count) => {
      console.log(
        JSON.stringify({
          event: 'scanProgress',
          data: { percent: 10, message: `Scanned ${count} assets` },
        })
      );
    },
    onAssetParsed: (asset, index, total) => {
      const percent = 10 + Math.round((index / total) * 80);
      console.log(
        JSON.stringify({
          event: 'scanProgress',
          data: { percent, message: `Parsed ${index + 1} of ${total} assets` },
        })
      );
    },
  });

  try {
    const result = await animoria.run();
    console.log(
      JSON.stringify({
        event: 'scanComplete',
        data: { assets: result.assets },
      })
    );

    // Start watching the workspace directory recursively
    startWatcher(workspacePath);
  } catch (error: any) {
    console.error(
      JSON.stringify({
        event: 'error',
        data: { message: error?.message || 'Error during scan execution' },
      })
    );
  }
}

async function parseSingleFile(filePath: string): Promise<AnimoriaAsset | null> {
  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) return null;

    const ext = extname(filePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) return null;

    let fileHandle;
    let chunk: Buffer | null = null;
    try {
      fileHandle = await open(filePath, 'r');
      const buffer = Buffer.alloc(1024);
      const { bytesRead } = await fileHandle.read(buffer, 0, 1024, 0);
      if (bytesRead > 0) {
        chunk = buffer.subarray(0, bytesRead);
      }
    } catch {
      // ignore
    } finally {
      await fileHandle?.close();
    }

    if (!chunk) return null;

    const registry = ParserRegistry.getInstance();
    const parser = registry.getParserFor(ext, chunk);
    if (!parser) return null;

    const fileBuffer = await fs.readFile(filePath);
    try {
      const metadata = await parser.parse(filePath, fileBuffer);
      return {
        path: filePath,
        name: basename(filePath),
        stem: basename(filePath, ext),
        format: parser.getFormat(),
        sizeBytes: stats.size,
        mtime: stats.mtimeMs,
        status: 'parsed',
        metadata,
      };
    } catch (err: any) {
      return {
        path: filePath,
        name: basename(filePath),
        stem: basename(filePath, ext),
        format: parser.getFormat(),
        sizeBytes: stats.size,
        mtime: stats.mtimeMs,
        status: 'error',
        error: err?.message || 'Failed to parse file',
      };
    }
  } catch {
    return null;
  }
}

function startWatcher(dir: string) {
  const debounceMap = new Map<string, NodeJS.Timeout>();
  const DEBOUNCE_MS = 250;

  try {
    watch(dir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      // Skip common excluded folders early
      const parts = filename.split(/[/\\]/);
      if (parts.some((part) => EXCLUDE_DIRS.has(part))) {
        return;
      }

      const ext = extname(filename).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) return;

      const fullPath = join(dir, filename);

      // Debounce and process file events
      const existing = debounceMap.get(fullPath);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(async () => {
        debounceMap.delete(fullPath);
        if (!existsSync(fullPath)) {
          // File was deleted
          console.log(
            JSON.stringify({
              event: 'watcherEvent',
              data: { type: 'removed', path: fullPath, asset: { path: fullPath } },
            })
          );
        } else {
          // File created or modified
          const asset = await parseSingleFile(fullPath);
          if (asset) {
            console.log(
              JSON.stringify({
                event: 'watcherEvent',
                data: {
                  type: eventType === 'rename' ? 'added' : 'modified',
                  path: fullPath,
                  asset,
                },
              })
            );
          }
        }
      }, DEBOUNCE_MS);

      debounceMap.set(fullPath, timer);
    });
  } catch {
    // Watcher failed
  }
}

start();
