import { promises as fs } from 'fs';
import { open } from 'fs/promises';
import { basename, extname, join, relative } from 'path';
import { performance } from 'perf_hooks';
import { ParserRegistry } from '../parsers/parser-registry.js';
import type { ScannerConfig, ScannerResult, AnimoriaAsset } from '../types/index.js';

const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/.turbo/**',
];

const DEFAULT_MAX_FILE_SIZE = 10_485_760; // 10 MB

// Extensiones de archivos de assets animados soportados por el ecosistema Animoria
const SUPPORTED_EXTENSIONS = new Set(['.json', '.lottie', '.rive', '.gif', '.apng', '.svg']);

/**
 * Convierte un patrón glob simple en una RegExp
 */
function globToRegex(pattern: string): RegExp {
  const p = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escapar caracteres especiales de regex
    .replace(/\*\*\//g, '(?:.*/)?') // **/ coincide con cualquier subdirectorio
    .replace(/\*\*/g, '.*') // ** coincide con cualquier cosa
    .replace(/\*/g, '[^/]*'); // * coincide con caracteres sin barra
  return new RegExp(`^${p}$`);
}

/**
 * Lee el primer fragmento de bytes de un archivo de manera segura y no bloqueante.
 */
async function readFirstChunk(filePath: string, chunkSize = 1024): Promise<Buffer | null> {
  let fileHandle;
  try {
    fileHandle = await open(filePath, 'r');
    const buffer = Buffer.alloc(chunkSize);
    const { bytesRead } = await fileHandle.read(buffer, 0, chunkSize, 0);
    if (bytesRead === 0) return null;
    return buffer.subarray(0, bytesRead);
  } catch {
    return null;
  } finally {
    await fileHandle?.close();
  }
}

export class FileScanner {
  constructor(private config: ScannerConfig) {}

  async scan(): Promise<ScannerResult> {
    const start = performance.now();
    const { workspacePath, exclude = [], maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE } = this.config;

    const ignorePatterns = [...DEFAULT_EXCLUDE, ...exclude];
    const excludeRegexes = ignorePatterns.map(globToRegex);

    // Directorios de exclusión por defecto para corte rápido
    const defaultExcludes = new Set([
      'node_modules',
      '.git',
      'dist',
      'build',
      '.turbo',
      '.animoria',
    ]);

    const registry = ParserRegistry.getInstance();
    const assets: AnimoriaAsset[] = [];
    let scannedFiles = 0;

    const scanDir = async (dir: string): Promise<void> => {
      let entries: any[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return; // Salta directorios sin permisos de lectura
      }

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relPath = relative(workspacePath, fullPath);
        const testPath = entry.isDirectory() ? relPath + '/' : relPath;

        // Comprobación de exclusión usando expresiones regulares glob
        if (excludeRegexes.some((rx) => rx.test(testPath))) {
          continue;
        }

        if (entry.isDirectory()) {
          // Cortocircuito directo y estricto para evitar descender
          if (defaultExcludes.has(entry.name)) {
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

              const chunk = await readFirstChunk(fullPath);
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
            } catch {
              continue; // Salta en caso de error leyendo el stat o el primer chunk
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
