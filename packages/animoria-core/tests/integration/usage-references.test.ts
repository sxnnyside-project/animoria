import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkspaceIndexer } from '../../src/indexer/workspace-indexer';

/**
 * Usage References, end to end through Core.
 *
 * ## Why this did not exist
 * The reference scan computed every location and kept only the count. `getUsageReferences`
 * was declared on the protocol and answered `unsupported-method`, so the one question
 * an "unreferenced asset" finding raises — *where is it used?* — had no answer
 * anywhere in the product. The JetBrains editor hover, needing one, matched asset
 * stems against document text in Kotlin and documented itself as an approximation.
 *
 * D-04 names this the highest-priority capability after the core flow. It could not
 * exist while the only thing surviving the scan was an integer.
 */

const workspaces: string[] = [];

function makeWorkspace(): string {
  const root = mkdtempSync(join(tmpdir(), 'animoria-usage-'));
  workspaces.push(root);
  mkdirSync(join(root, 'assets'), { recursive: true });
  mkdirSync(join(root, 'src'), { recursive: true });
  return root;
}

/** A structurally valid Lottie — detection is structural, never by magic bytes (D-03). */
function writeLottie(root: string, relativePath: string): string {
  const absolute = join(root, relativePath);
  writeFileSync(
    absolute,
    JSON.stringify({ v: '5.7.4', fr: 30, ip: 0, op: 60, w: 100, h: 100, layers: [] })
  );
  return absolute;
}

afterEach(() => {
  for (const root of workspaces.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('usage references — the locations survive the scan', () => {
  it('reports every place an asset is referenced, with line and content', async () => {
    const root = makeWorkspace();
    const asset = writeLottie(root, 'assets/spinner.json');
    writeFileSync(
      join(root, 'src/app.ts'),
      ["import spinner from '../assets/spinner.json';", '', 'export const a = spinner;'].join('\n')
    );

    const indexer = new WorkspaceIndexer({ workspacePath: root });
    try {
      await indexer.analyzeComplete();
      const references = indexer.usageReferencesFor(asset);

      expect(references.length, 'the import is a reference').toBeGreaterThan(0);

      const first = references[0]!;
      expect(first.file).toBe(join(root, 'src/app.ts'));
      // 1-based, as a person reads a file. Hosts convert to their own indexing.
      expect(first.line).toBe(1);
      expect(first.content).toContain('spinner.json');
      expect(first.kind).toBeTruthy();

      // The count and the locations must describe the same thing. They were derived
      // from one scan and only one of them used to survive it.
      expect(indexer.getAnalysis().referenceCounts.get(asset)).toBe(references.length);
    } finally {
      indexer.dispose();
    }
  });

  it('answers the reverse lookup a hover needs', async () => {
    // "What does this editor line refer to?" is the question the deleted JetBrains
    // hover answered by substring-matching stems in Kotlin. Core answers it here, so
    // no client has to.
    const root = makeWorkspace();
    const asset = writeLottie(root, 'assets/logo.json');
    const source = join(root, 'src/app.ts');
    writeFileSync(
      source,
      ['const other = 1;', "import logo from '../assets/logo.json';"].join('\n')
    );

    const indexer = new WorkspaceIndexer({ workspacePath: root });
    try {
      await indexer.analyzeComplete();
      const inFile = indexer.referencesInFile(source);

      expect(inFile.length).toBeGreaterThan(0);
      expect(inFile[0]!.assetPath).toBe(asset);
      expect(inFile[0]!.reference.line).toBe(2);

      // A file nothing references is an empty answer, not a failure — a hover over an
      // unrelated file must not surface an error.
      expect(indexer.referencesInFile(join(root, 'src/nothing.ts'))).toEqual([]);
    } finally {
      indexer.dispose();
    }
  });

  it('returns an empty list for an asset with no usages', async () => {
    const root = makeWorkspace();
    const asset = writeLottie(root, 'assets/orphan.json');
    writeFileSync(join(root, 'src/app.ts'), 'export const nothing = 1;\n');

    const indexer = new WorkspaceIndexer({ workspacePath: root });
    try {
      await indexer.analyzeComplete();
      expect(indexer.usageReferencesFor(asset)).toEqual([]);
      // …and the analysis says the scan finished, which is what makes the empty list
      // a finding rather than an unknown.
      expect(indexer.getAnalysis().readiness.referencesResolved).toBe(true);
    } finally {
      indexer.dispose();
    }
  });

  it('forgets the locations of an asset that has gone', async () => {
    // Retained state that outlives its subject is how a panel comes to show usages of
    // a file the developer deleted ten minutes ago.
    const root = makeWorkspace();
    const asset = writeLottie(root, 'assets/temp.json');
    writeFileSync(join(root, 'src/app.ts'), `import t from '../assets/temp.json';\n`);

    const indexer = new WorkspaceIndexer({ workspacePath: root });
    try {
      await indexer.analyzeComplete();
      expect(indexer.usageReferencesFor(asset).length).toBeGreaterThan(0);

      rmSync(asset);
      indexer.notifyFileChanged(asset, 'deleted');
      await indexer.analyzeComplete();

      expect(indexer.usageReferencesFor(asset)).toEqual([]);
    } finally {
      indexer.dispose();
    }
  });
});
