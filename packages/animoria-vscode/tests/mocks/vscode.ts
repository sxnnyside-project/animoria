import { EventEmitter as NodeEventEmitter } from 'node:events';

/**
 * In-memory stand-in for the `vscode` module.
 *
 * The real module only resolves inside a running Extension Host, so it
 * cannot be imported directly by a unit test. `vitest.config.ts` aliases
 * the `vscode` specifier to this file, which means production code needs
 * no test-mode branching: `import * as vscode from 'vscode'` resolves to
 * this implementation under test and to the real API inside VS Code.
 *
 * Scope is deliberately narrow — every export here backs an API the
 * extension actually calls (see the grep-derived surface in
 * TASK-H1.1). Add to it only when a real call site needs the addition.
 */

export class Disposable {
  private readonly _callOnDispose: () => void;

  constructor(callOnDispose: () => void) {
    this._callOnDispose = callOnDispose;
  }

  dispose(): void {
    this._callOnDispose();
  }

  static from(...disposables: { dispose(): unknown }[]): Disposable {
    return new Disposable(() => {
      for (const d of disposables) {
        d.dispose();
      }
    });
  }
}

export class EventEmitter<T> {
  private readonly _emitter = new NodeEventEmitter();
  private static _seq = 0;
  private readonly _eventName = `event-${EventEmitter._seq++}`;

  readonly event = (listener: (e: T) => unknown): Disposable => {
    this._emitter.on(this._eventName, listener);
    return new Disposable(() => this._emitter.off(this._eventName, listener));
  };

  fire(data: T): void {
    this._emitter.emit(this._eventName, data);
  }

  dispose(): void {
    this._emitter.removeAllListeners(this._eventName);
  }
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export enum ProgressLocation {
  SourceControl = 1,
  Window = 10,
  Notification = 15,
}

export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
}

export class ThemeIcon {
  constructor(
    public readonly id: string,
    public readonly color?: ThemeColor
  ) {}
  static readonly File = new ThemeIcon('file');
  static readonly Folder = new ThemeIcon('folder');
}

export class ThemeColor {
  constructor(public readonly id: string) {}
}

export class TreeItem {
  label?: string;
  collapsibleState?: TreeItemCollapsibleState;
  contextValue?: string;
  iconPath?: ThemeIcon | { light: string; dark: string };
  description?: string | boolean;
  tooltip?: string;
  command?: { command: string; title: string; arguments?: unknown[] };
  resourceUri?: Uri;

  constructor(
    label: string,
    collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.None
  ) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number
  ) {}
}

export class Range {
  constructor(
    public readonly start: Position,
    public readonly end: Position
  ) {}
}

export class Hover {
  constructor(
    public readonly contents: MarkdownString | MarkdownString[],
    public readonly range?: Range
  ) {}
}

export class MarkdownString {
  value = '';
  isTrusted = false;
  supportHtml = false;
  supportThemeIcons = false;

  constructor(value = '') {
    this.value = value;
  }

  appendMarkdown(text: string): this {
    this.value += text;
    return this;
  }

  appendCodeblock(code: string, language = ''): this {
    this.value += `\`\`\`${language}\n${code}\n\`\`\`\n`;
    return this;
  }
}

export class RelativePattern {
  constructor(
    public readonly base: string,
    public readonly pattern: string
  ) {}
}

export class Uri {
  private constructor(
    public readonly scheme: string,
    public readonly fsPath: string,
    public readonly path: string
  ) {}

  static file(fsPath: string): Uri {
    return new Uri('file', fsPath, fsPath);
  }

  static parse(value: string): Uri {
    return new Uri('file', value, value);
  }

  static joinPath(base: Uri, ...segments: string[]): Uri {
    const joined = [base.fsPath, ...segments].join('/').replace(/\/+/g, '/');
    return Uri.file(joined);
  }

  toString(): string {
    return this.fsPath;
  }

  with(change: { fsPath?: string }): Uri {
    return Uri.file(change.fsPath ?? this.fsPath);
  }
}

/** Text-edit and file-op batch recorded by `WorkspaceEdit`, applied by `workspace.applyEdit`. */
export class WorkspaceEdit {
  readonly fileDeletions: Uri[] = [];
  readonly fileRenames: { from: Uri; to: Uri }[] = [];
  readonly textEdits: { uri: Uri; range: Range; newText: string }[] = [];

  deleteFile(uri: Uri, _options?: { ignoreIfNotExists?: boolean }): void {
    this.fileDeletions.push(uri);
  }

  renameFile(
    from: Uri,
    to: Uri,
    _options?: { overwrite?: boolean; ignoreIfExists?: boolean }
  ): void {
    this.fileRenames.push({ from, to });
  }

  replace(uri: Uri, range: Range, newText: string): void {
    this.textEdits.push({ uri, range, newText });
  }
}

class FakeOutputChannel {
  readonly lines: string[] = [];
  constructor(public readonly name: string) {}
  appendLine(value: string): void {
    this.lines.push(value);
  }
  append(value: string): void {
    this.lines.push(value);
  }
  clear(): void {
    this.lines.length = 0;
  }
  show(): void {}
  hide(): void {}
  dispose(): void {}
}

class FakeStatusBarItem {
  text = '';
  tooltip?: string;
  command?: string;
  show(): void {}
  hide(): void {}
  dispose(): void {}
}

class FakeFileSystemWatcher implements Disposable {
  private readonly _onDidCreate = new EventEmitter<Uri>();
  private readonly _onDidChange = new EventEmitter<Uri>();
  private readonly _onDidDelete = new EventEmitter<Uri>();

  onDidCreate = this._onDidCreate.event;
  onDidChange = this._onDidChange.event;
  onDidDelete = this._onDidDelete.event;

  /** Test-only hook — fires the named event as the real watcher would on a filesystem event. */
  simulate(kind: 'create' | 'change' | 'delete', uri: Uri): void {
    if (kind === 'create') this._onDidCreate.fire(uri);
    if (kind === 'change') this._onDidChange.fire(uri);
    if (kind === 'delete') this._onDidDelete.fire(uri);
  }

  dispose(): void {
    this._onDidCreate.dispose();
    this._onDidChange.dispose();
    this._onDidDelete.dispose();
  }
}

class FakeWebview {
  html = '';
  cspSource = 'vscode-webview:';
  private readonly _onDidReceiveMessage = new EventEmitter<unknown>();
  onDidReceiveMessage = this._onDidReceiveMessage.event;
  readonly sentMessages: unknown[] = [];

  postMessage(message: unknown): Promise<boolean> {
    this.sentMessages.push(message);
    return Promise.resolve(true);
  }

  asWebviewUri(uri: Uri): Uri {
    return uri;
  }

  /** Test-only hook — simulates the webview posting a message back to the extension host. */
  simulateMessageFromWebview(message: unknown): void {
    this._onDidReceiveMessage.fire(message);
  }
}

class FakeWebviewPanel {
  readonly webview = new FakeWebview();
  visible = true;
  active = true;
  private readonly _onDidDispose = new EventEmitter<void>();
  private _disposed = false;

  constructor(
    public readonly viewType: string,
    public title: string
  ) {}

  onDidDispose(listener: () => unknown): Disposable {
    return this._onDidDispose.event(listener);
  }

  reveal(): void {
    this.active = true;
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._onDidDispose.fire();
  }

  get isDisposed(): boolean {
    return this._disposed;
  }
}

interface FakeState {
  workspaceFolders: { uri: Uri; name: string; index: number }[] | undefined;
  configuration: Record<string, Record<string, unknown>>;
  fileSystem: Map<string, Buffer>;
  quickPickResult: unknown;
  saveDialogResult: Uri | undefined;
  informationMessageResult: string | undefined;
  warningMessageResult: string | undefined;
  activeTextEditor: unknown;
}

/** Mutable state a test configures before exercising extension code. Reset between tests via `resetVscodeMock()`. */
export const __mockState: FakeState = {
  workspaceFolders: undefined,
  configuration: {},
  fileSystem: new Map(),
  quickPickResult: undefined,
  saveDialogResult: undefined,
  informationMessageResult: undefined,
  warningMessageResult: undefined,
  activeTextEditor: undefined,
};

export function resetVscodeMock(): void {
  __mockState.workspaceFolders = undefined;
  __mockState.configuration = {};
  __mockState.fileSystem = new Map();
  __mockState.quickPickResult = undefined;
  __mockState.saveDialogResult = undefined;
  __mockState.informationMessageResult = undefined;
  __mockState.warningMessageResult = undefined;
  __mockState.activeTextEditor = undefined;
  commands.__registry.clear();
}

const registeredCommands = new Map<string, (...args: unknown[]) => unknown>();

export const commands = {
  __registry: registeredCommands,
  registerCommand(command: string, callback: (...args: unknown[]) => unknown): Disposable {
    registeredCommands.set(command, callback);
    return new Disposable(() => registeredCommands.delete(command));
  },
  async executeCommand<T = unknown>(command: string, ...args: unknown[]): Promise<T> {
    const handler = registeredCommands.get(command);
    if (!handler) {
      throw new Error(`Command not registered in mock: ${command}`);
    }
    return (await handler(...args)) as T;
  },
};

export const window = {
  setStatusBarMessage(_text: string, _hideAfter?: number | Thenable<unknown>): Disposable {
    return new Disposable(() => {});
  },
  showInformationMessage: (async (
    _message: string,
    ..._items: unknown[]
  ): Promise<string | undefined> => __mockState.informationMessageResult) as (
    message: string,
    ...items: string[]
  ) => Thenable<string | undefined>,
  showWarningMessage: (async (
    _message: string,
    ..._items: unknown[]
  ): Promise<string | undefined> => __mockState.warningMessageResult) as (
    message: string,
    ...items: string[]
  ) => Thenable<string | undefined>,
  showErrorMessage: async (_message: string): Promise<string | undefined> => undefined,
  showSaveDialog: async (): Promise<Uri | undefined> => __mockState.saveDialogResult,
  showTextDocument: async (): Promise<void> => undefined,
  createQuickPick<T>(): {
    placeholder: string;
    items: T[];
    selectedItems: T[];
    show(): void;
    hide(): void;
    dispose(): void;
    onDidChangeValue(cb: (value: string) => void): Disposable;
    onDidAccept(cb: () => void): Disposable;
    onDidHide(cb: () => void): Disposable;
  } {
    const onAccept = new EventEmitter<void>();
    const onHide = new EventEmitter<void>();
    const onChangeValue = new EventEmitter<string>();
    return {
      placeholder: '',
      items: [],
      get selectedItems() {
        return __mockState.quickPickResult ? [__mockState.quickPickResult as T] : [];
      },
      set selectedItems(_v: T[]) {},
      show() {
        onAccept.fire();
      },
      hide() {
        onHide.fire();
      },
      dispose() {},
      onDidChangeValue: (cb: (value: string) => void) => onChangeValue.event(cb),
      onDidAccept: (cb: () => void) => onAccept.event(cb),
      onDidHide: (cb: () => void) => onHide.event(cb),
    } as never;
  },
  showQuickPick: async (): Promise<unknown> => __mockState.quickPickResult,
  createTreeView(_viewId: string, _options: unknown): { dispose(): void } {
    return { dispose() {} };
  },
  createWebviewPanel(viewType: string, title: string): FakeWebviewPanel {
    return new FakeWebviewPanel(viewType, title);
  },
  createOutputChannel(name: string): FakeOutputChannel {
    return new FakeOutputChannel(name);
  },
  createStatusBarItem(): FakeStatusBarItem {
    return new FakeStatusBarItem();
  },
  withProgress: async <T>(
    _options: unknown,
    task: (progress: { report(value: { message?: string }): void }) => Thenable<T>
  ): Promise<T> => task({ report: () => {} }),
  get activeTextEditor() {
    return __mockState.activeTextEditor;
  },
  onDidChangeActiveTextEditor(_listener: (editor: unknown) => unknown): Disposable {
    return new Disposable(() => {});
  },
};

export const languages = {
  registerHoverProvider(_selector: unknown, _provider: unknown): Disposable {
    return new Disposable(() => {});
  },
};

export const env = {
  language: 'en',
  clipboard: {
    _lastWrite: '',
    async writeText(value: string): Promise<void> {
      env.clipboard._lastWrite = value;
    },
  },
};

class FakeWorkspaceConfiguration {
  constructor(private readonly section: string) {}
  get<T>(key: string, defaultValue?: T): T {
    const sectionValues = __mockState.configuration[this.section] ?? {};
    return key in sectionValues ? (sectionValues[key] as T) : (defaultValue as T);
  }
}

export const workspace = {
  registerTextDocumentContentProvider(
    _scheme: string,
    _provider: TextDocumentContentProvider
  ): Disposable {
    return new Disposable(() => {});
  },
  get workspaceFolders() {
    return __mockState.workspaceFolders;
  },
  getConfiguration(section: string): FakeWorkspaceConfiguration {
    return new FakeWorkspaceConfiguration(section);
  },
  createFileSystemWatcher(_pattern: RelativePattern | string): FakeFileSystemWatcher {
    return new FakeFileSystemWatcher();
  },
  onDidChangeWorkspaceFolders(_listener: () => unknown): Disposable {
    return new Disposable(() => {});
  },
  openTextDocument: async (options: {
    content: string;
    language?: string;
  }): Promise<{ uri: Uri; getText(): string }> => {
    const uri = Uri.file(`untitled:${Date.now()}`);
    return { uri, getText: () => options.content };
  },
  async applyEdit(edit: WorkspaceEdit): Promise<boolean> {
    for (const del of edit.fileDeletions) {
      __mockState.fileSystem.delete(del.fsPath);
    }
    for (const { from, to } of edit.fileRenames) {
      const content = __mockState.fileSystem.get(from.fsPath);
      __mockState.fileSystem.delete(from.fsPath);
      if (content !== undefined) {
        __mockState.fileSystem.set(to.fsPath, content);
      }
    }
    for (const change of edit.textEdits) {
      const existing = __mockState.fileSystem.get(change.uri.fsPath)?.toString('utf-8') ?? '';
      __mockState.fileSystem.set(change.uri.fsPath, Buffer.from(existing + change.newText));
    }
    return true;
  },
  fs: {
    async delete(uri: Uri): Promise<void> {
      if (!__mockState.fileSystem.has(uri.fsPath)) {
        throw new Error(`ENOENT (mock): ${uri.fsPath}`);
      }
      __mockState.fileSystem.delete(uri.fsPath);
    },
    async writeFile(uri: Uri, content: Uint8Array): Promise<void> {
      __mockState.fileSystem.set(uri.fsPath, Buffer.from(content));
    },
    async readFile(uri: Uri): Promise<Uint8Array> {
      const value = __mockState.fileSystem.get(uri.fsPath);
      if (!value) throw new Error(`ENOENT (mock): ${uri.fsPath}`);
      return value;
    },
    async createDirectory(_uri: Uri): Promise<void> {
      // Directories are not modeled in the mock filesystem — file entries
      // exist independently of any parent directory record, so there is
      // nothing to create. Present so callers that unconditionally call
      // this (as real `vscode.workspace.fs.createDirectory` scaffolding
      // does) don't need a test-only branch.
    },
  },
};

export type ExtensionContext = {
  subscriptions: { dispose(): unknown }[];
  workspaceState: {
    get<T>(key: string, defaultValue?: T): T | undefined;
    update(key: string, value: unknown): Thenable<void>;
  };
};

export function createMockExtensionContext(): ExtensionContext {
  const state = new Map<string, unknown>();
  return {
    subscriptions: [],
    workspaceState: {
      get: (key, defaultValue) => (state.has(key) ? (state.get(key) as never) : defaultValue),
      update: async (key, value) => {
        state.set(key, value);
      },
    },
  };
}

export type Thenable<T> = PromiseLike<T>;
export type CancellationToken = { isCancellationRequested: boolean };
export type ProviderResult<T> = T | undefined | null | Thenable<T | undefined | null>;
export type TextDocument = { languageId: string; getText(): string };
export type TreeDataProvider<T> = {
  getTreeItem(element: T): TreeItem | Thenable<TreeItem>;
  getChildren(element?: T): ProviderResult<T[]>;
};
export type HoverProvider = {
  provideHover(document: TextDocument, position: Position): ProviderResult<Hover>;
};
export type WebviewPanel = FakeWebviewPanel;
export type FileSystemWatcher = FakeFileSystemWatcher;
export type OutputChannel = FakeOutputChannel;
export type TextDocumentContentProvider = {
  onDidChange?: (listener: (uri: Uri) => unknown) => Disposable;
  provideTextDocumentContent(uri: Uri): ProviderResult<string>;
};
