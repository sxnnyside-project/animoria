import { readFile } from 'fs/promises';
import { performance } from 'perf_hooks';
import { resolve } from 'path';
import fg from 'fast-glob';
import type { UsageSearchConfig, UsageSearchResult, UsageReference } from '../types/asset.js';
import { buildPatternsForAsset } from './reference-patterns.js';

const DEFAULT_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.swift',
  '.kt',
  '.dart',
  '.vue',
  '.svelte',
  '.py',
  '.cs',
];

const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/.turbo/**',
];

const BATCH_SIZE = 8;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineMatchesAsset(line: string, filename: string, stem: string, strategy: string): boolean {
  switch (strategy) {
    case 'pattern': {
      const patterns = buildPatternsForAsset(filename, stem);
      return patterns.some((p) => p.test(line));
    }
    case 'filename': {
      return line.includes(filename);
    }
    case 'stem': {
      const stemPattern = new RegExp(`\\b${escapeRegex(stem)}\\b`, 'i');
      return stemPattern.test(line);
    }
    case 'both': {
      const stemPattern = new RegExp(`\\b${escapeRegex(stem)}\\b`, 'i');
      return line.includes(filename) || stemPattern.test(line);
    }
    default:
      return false;
  }
}

export class UsageScanner {
  constructor(private config: UsageSearchConfig) {}

  async search(): Promise<UsageSearchResult> {
    const start = performance.now();
    const {
      workspacePath,
      asset,
      strategy = 'pattern',
      extensions = DEFAULT_EXTENSIONS,
      exclude = [],
      scopePath,
    } = this.config;

    const extList = extensions.map((e) => e.replace(/^\./, '')).join(',');
    const pattern = `**/*.{${extList}}`;
    const ignorePatterns = [...DEFAULT_EXCLUDE, ...exclude];

    const files = await fg(pattern, {
      cwd: workspacePath,
      absolute: true,
      ignore: ignorePatterns,
    });

    let references: UsageReference[] = [];

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((file) => this._searchFile(file, asset.name, asset.stem, strategy))
      );
      for (const refs of batchResults) {
        references.push(...refs);
      }
    }

    if (scopePath) {
      const scope = resolve(scopePath);
      references = references.filter((r) => r.file.startsWith(scope));
    }

    return {
      asset,
      references,
      searchedFiles: files.length,
      durationMs: performance.now() - start,
    };
  }

  private async _searchFile(
    file: string,
    filename: string,
    stem: string,
    strategy: string
  ): Promise<UsageReference[]> {
    try {
      const content = await readFile(file, 'utf-8');
      const lines = content.split('\n');
      const refs: UsageReference[] = [];

      for (let i = 0; i < lines.length; i++) {
        if (lineMatchesAsset(lines[i], filename, stem, strategy)) {
          refs.push({
            file,
            line: i + 1,
            content: lines[i].trim(),
          });
        }
      }

      return refs;
    } catch {
      return [];
    }
  }
}
