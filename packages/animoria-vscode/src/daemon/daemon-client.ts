import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { type Interface, createInterface } from 'node:readline';
import type {
  DuplicateGroup,
  ReferenceRewriteProposal,
  ResolutionPlan,
  TrashItem,
  UsageReference,
  WorkspaceAnalysis,
} from '@animoria/contracts';

export interface DaemonRequestEnvelope {
  protocol: number;
  id: string;
  method: string;
  params: Record<string, unknown>;
}

export interface DaemonResponseEnvelope {
  protocol: number;
  id: string;
  result?: unknown;
  error?: {
    code: string;
    message: string;
    detail?: string;
  };
}

export interface HelloResult {
  engine: string;
  version: string;
  protocol_version: number;
  supported_formats: string[];
  capabilities: string[];
}

export interface DaemonScanResult {
  analysis: WorkspaceAnalysis;
  references: UsageReference[];
  duplicate_groups: DuplicateGroup[];
}

/**
 * Client for communicating with the Animoria native daemon process over Protocol v1 (NDJSON).
 */
export class VsCodeDaemonClient {
  private process?: ChildProcess | undefined;
  private readline?: Interface | undefined;
  private requestIdCounter = 0;
  private pendingRequests = new Map<
    string,
    { resolve: (val: unknown) => void; reject: (err: Error) => void }
  >();
  private readonly binaryPath?: string;

  constructor(binaryPath?: string, extensionPath?: string) {
    this.binaryPath = binaryPath ?? this.resolveBinaryPath(extensionPath);
  }

  /**
   * Resolves the canonical path to the native Animoria binary.
   */
  private resolveBinaryPath(extensionPath?: string): string {
    const custom = process.env.ANIMORIA_BINARY_PATH;
    if (custom && existsSync(custom)) {
      return custom;
    }

    const home = homedir();
    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'animoria.exe' : 'animoria';

    const candidates = [
      extensionPath ? join(extensionPath, 'bin', binaryName) : '',
      resolve(__dirname, '../bin', binaryName),
      resolve(__dirname, 'bin', binaryName),
      resolve(process.cwd(), 'bin', binaryName),
      resolve(process.cwd(), 'packages/animoria-vscode/bin', binaryName),
      resolve(process.cwd(), 'packages/animoria-core-rust/target/release', binaryName),
      resolve(process.cwd(), 'packages/animoria-core-rust/target/debug', binaryName),
      resolve(process.cwd(), '../animoria-core-rust/target/release', binaryName),
      resolve(process.cwd(), '../animoria-core-rust/target/debug', binaryName),
      resolve(process.cwd(), 'target/release', binaryName),
      resolve(process.cwd(), 'target/debug', binaryName),
      resolve(process.cwd(), '../../target/release', binaryName),
      resolve(process.cwd(), '../../target/debug', binaryName),
      join(home, '.cargo/bin', binaryName),
      `/opt/homebrew/bin/${binaryName}`,
      `/usr/local/bin/${binaryName}`,
      binaryName,
    ].filter(Boolean);

    for (const cand of candidates) {
      if (cand !== binaryName && existsSync(cand)) {
        return cand;
      }
    }

    return binaryName;
  }

  /**
   * Spawns the daemon subprocess and performs the initial Protocol v1 handshake.
   */
  public async start(): Promise<void> {
    if (this.process) return;

    const bin = this.binaryPath!;
    if (bin !== 'animoria' && bin !== 'animoria.exe' && !existsSync(bin)) {
      throw new Error(
        `Animoria native binary not found at "${bin}". Build with 'cargo build --release -p animoria-core-rust' or configure ANIMORIA_BINARY_PATH.`
      );
    }

    this.process = spawn(bin, ['daemon'], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    this.readline = createInterface({
      input: this.process.stdout!,
      crlfDelay: Number.POSITIVE_INFINITY,
    });

    this.readline.on('line', (line) => this.handleLine(line));

    this.process.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      if (text.trim()) {
        console.warn(`[Animoria Native Daemon Log] ${text.trim()}`);
      }
    });

    this.process.on('exit', (code, signal) => {
      this.rejectAllPending(new Error(`Daemon process exited (code=${code}, signal=${signal})`));
      this.process = undefined;
    });

    this.process.on('error', (err) => {
      this.rejectAllPending(err);
      this.process = undefined;
    });
  }

  private handleLine(line: string) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('{')) return;

    try {
      const response = JSON.parse(trimmed) as DaemonResponseEnvelope;
      const reqId = response.id;
      const pending = this.pendingRequests.get(reqId);

      if (pending) {
        this.pendingRequests.delete(reqId);
        if (!response.error) {
          pending.resolve(response.result);
        } else {
          pending.reject(new Error(`[${response.error.code}] ${response.error.message}`));
        }
      }
    } catch {
      // Silently ignore malformed non-JSON output on stdout
    }
  }

  private rejectAllPending(err: Error) {
    for (const [, pending] of this.pendingRequests) {
      pending.reject(err);
    }
    this.pendingRequests.clear();
  }

  /**
   * Sends a framed Protocol v1 request and awaits the correlated response.
   */
  private async request<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.process) {
      await this.start();
    }

    const id = `req-${++this.requestIdCounter}`;
    const envelope = JSON.stringify({
      protocol: 1,
      id,
      method,
      params,
    });

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve: resolve as (val: unknown) => void, reject });
      this.process?.stdin?.write(`${envelope}\n`);
    });
  }

  public async hello(): Promise<HelloResult> {
    return this.request<HelloResult>('hello');
  }

  /** Liveness check. Answered in arrival order like any other request, so it confirms the daemon is alive between operations — not concurrently during a long-running one. */
  public async ping(): Promise<{ ready: boolean; uptime_ms: number }> {
    return this.request('ping');
  }

  public async scan(
    workspacePath: string,
    customIgnorePatterns: string[] = [],
    enableAuditLog?: boolean
  ): Promise<DaemonScanResult> {
    const params: Record<string, unknown> = {
      workspace_path: workspacePath,
      custom_ignore_patterns: customIgnorePatterns,
    };
    if (typeof enableAuditLog === 'boolean') {
      params.enable_audit_log = enableAuditLog;
    }
    return this.request<DaemonScanResult>('scan', params);
  }

  public async check(
    workspacePath: string,
    customIgnorePatterns: string[] = []
  ): Promise<DaemonScanResult> {
    return this.request<DaemonScanResult>('check', {
      workspace_path: workspacePath,
      custom_ignore_patterns: customIgnorePatterns,
    });
  }

  public async aggregateHealthScores(
    roots: { report: WorkspaceAnalysis['health_score']; asset_count: number }[]
  ): Promise<WorkspaceAnalysis['health_score']> {
    return this.request<WorkspaceAnalysis['health_score']>('aggregateHealthScores', { roots });
  }

  /** Builds a `ResolutionPlan` for keeping one candidate in a duplicate group. */
  public async remediatePlan(duplicateGroup: DuplicateGroup): Promise<ResolutionPlan> {
    return this.request<ResolutionPlan>('remediate_plan', {
      duplicate_group: duplicateGroup,
    });
  }

  /** Moves one asset to `.animoria/trash/` and returns the resulting `TrashItem`. */
  public async trashAsset(
    workspacePath: string,
    assetId: string,
    filePath: string
  ): Promise<TrashItem> {
    return this.request<TrashItem>('trash_asset', {
      workspace_path: workspacePath,
      asset_id: assetId,
      file_path: filePath,
    });
  }

  /** Restores a previously trashed asset to its original location. */
  public async restoreAsset(workspacePath: string, trashItem: TrashItem): Promise<void> {
    await this.request('restore_asset', {
      workspace_path: workspacePath,
      trash_item: trashItem,
    });
  }

  /**
   * Applies one already-confirmed reference-rewrite proposal to disk. The
   * daemon refuses (throws) if the target line no longer matches
   * `proposal.original_line` — the confirmation was for that exact line.
   */
  public async applyReferenceRewrite(
    workspacePath: string,
    proposal: ReferenceRewriteProposal
  ): Promise<void> {
    await this.request('applyReferenceRewrite', { workspace_path: workspacePath, proposal });
  }

  public async shutdown(): Promise<void> {
    if (!this.process) return;

    try {
      await this.request('shutdown');
    } catch {
      // Process may already be closed
    } finally {
      if (this.readline) {
        this.readline.close();
        this.readline = undefined;
      }
      if (this.process) {
        this.process.kill();
        this.process = undefined;
      }
      this.rejectAllPending(new Error('Daemon client shut down.'));
    }
  }
}
