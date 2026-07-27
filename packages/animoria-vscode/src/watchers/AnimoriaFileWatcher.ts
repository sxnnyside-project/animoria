import {
  DEFAULT_USAGE_SCAN_EXTENSIONS,
  type FileChangeKind,
  SUPPORTED_ASSET_EXTENSIONS,
  type WorkspaceIndexer,
} from '@animoria/core';
import * as vscode from 'vscode';

/**
 * Every extension the reactive index cares about: animated asset
 * formats plus source files scanned for asset references (the
 * `.animoriarc*`/`.animoriaignore` config family is matched separately in the glob below,
 * since its "extension" isn't a simple suffix). Derived from
 * `@animoria/core`'s own canonical lists — `SUPPORTED_ASSET_EXTENSIONS`
 * (see `types/formats.ts`) and `DEFAULT_USAGE_SCAN_EXTENSIONS` — rather
 * than re-declared here, so this watcher can never drift out of sync
 * with what the indexer it feeds actually classifies as relevant.
 */
const WATCHED_EXTENSIONS = [
  ...SUPPORTED_ASSET_EXTENSIONS.map((ext) => ext.replace(/^\./, '')),
  ...DEFAULT_USAGE_SCAN_EXTENSIONS.map((ext) => ext.replace(/^\./, '')),
];

/**
 * Bridges VS Code's native `FileSystemWatcher` to Animoria's IDE-agnostic
 * {@link WorkspaceIndexer}.
 *
 * ## Why this class is this thin
 * All of the actual reactive-indexing logic — debouncing, deduplicating,
 * classifying paths, incremental re-parsing, reference-count deltas,
 * rule evaluation — lives in `@animoria/core`'s `WorkspaceIndexer`, which
 * has zero VS Code dependencies by design (see the repository's
 * architectural rules, and `WorkspaceIndexer`'s own documentation for
 * why: it must remain reusable by any future IDE integration). This
 * class's entire job is translating `vscode.FileSystemWatcher`'s three
 * event kinds into calls to
 * {@link WorkspaceIndexer.notifyFileChanged | indexer.notifyFileChanged}.
 * It does not parse files, does not maintain its own debounce timers, and
 * does not decide what counts as a relevant change — the indexer already
 * does all of that, and doing any of it here too would be the exact
 * "governance logic coupled to VS Code APIs" this architecture avoids.
 *
 * ## Coverage
 * Watches both animated asset extensions and source-code extensions
 * (see {@link WATCHED_EXTENSIONS}), plus the `.animoriarc*` config
 * family and `.animoriaignore`, in a single glob — the indexer itself classifies which
 * bucket each changed path falls into. This is also a correctness fix
 * over the previous watcher, which only ever observed `.json` files
 * (silently missing `.lottie`, `.riv`, `.gif`, `.apng`, and `.svg`
 * changes) and never observed source-code edits at all, meaning
 * reference counts could only ever go stale, never self-correct.
 *
 * ## Known limitation
 * Like the watcher it replaces, this uses a single inclusion glob with
 * no directory exclusion (`node_modules`, `dist`, etc.) — VS Code's
 * `FileSystemWatcher` API has no exclude parameter, only an inclusion
 * pattern. In a workspace with a very large `node_modules`, this means
 * some irrelevant native filesystem events are observed and discarded by
 * the indexer's own classification rather than never being observed at
 * all. This mirrors a pre-existing constraint in `FileScanner`'s design
 * space and is not a regression introduced here.
 */
export class AnimoriaFileWatcher {
  private _watcher: vscode.FileSystemWatcher | undefined;

  constructor(private readonly _indexer: WorkspaceIndexer) {}

  start(workspacePath: string): void {
    const extList = WATCHED_EXTENSIONS.join(',');
    this._watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspacePath, `**/{.animoriarc*,.animoriaignore,*.{${extList}}}`)
    );

    this._watcher.onDidCreate((uri) => this._notify(uri, 'created'));
    this._watcher.onDidChange((uri) => this._notify(uri, 'changed'));
    this._watcher.onDidDelete((uri) => this._notify(uri, 'deleted'));
  }

  dispose(): void {
    this._watcher?.dispose();
  }

  private _notify(uri: vscode.Uri, kind: FileChangeKind): void {
    this._indexer.notifyFileChanged(uri.fsPath, kind);
  }
}
