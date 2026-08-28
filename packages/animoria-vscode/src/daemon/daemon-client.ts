import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface, type Interface } from 'node:readline';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type {
  WorkspaceAnalysis,
  DuplicateGroup,
  UsageReference,
  TrashItem,
  ResolutionPlan,
} from '@animoria/contracts';

export const PROTOCOL_VERSION = 1;

/**
 * Metadata and capabilities returned by the native engine during Protocol v1 handshake.
 */
export interface HelloResult {
  engine: string;
  version: string;
  protocol_version: number;
  supported_formats: string[];
  capabilities: string[];
}

/**
 * Result payload returned from full workspace analysis operations.
 */
export interface DaemonScanResult {
  analysis: WorkspaceAnalysis;
  references: UsageReference[];
  duplicate_groups: DuplicateGroup[];
}

/**
 * Structured error details returned by the daemon on request failure.
 */
export interface DaemonError {
  code: string;
  message: string;
  detail?: string;
}

/**
 * Protocol v1 NDJSON response envelope.
 */
export interface DaemonResponseEnvelope<T = any> {
  protocol: number;
  id: string;
  result?: T;
  error?: DaemonError;
}

/**
 * Async client for the native `animoria daemon` process communicating over Protocol v1 stdio NDJSON.
 *
 * Handles binary discovery, process lifecycle supervision, line-buffered JSON parsing,
 * and concurrent request/response correlation by unique request IDs.
 */
export class VsCodeDaemonClient {
  private process: ChildProcess | null = null;
  private readline: Interface | null = null;
  private pendingRequests = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: Error) => void }
  >();
  private reqIdCounter = 0;

  constructor(private binaryPath?: string) {
    if (!this.binaryPath) {
      this.binaryPath = this.resolveBinary();
    }
  }

  /**
   * Resolves the native `animoria` executable from environment overrides or release/debug artifacts.
   */
  private resolveBinary(): string {
    const customBin = process.env.ANIMORIA_DAEMON_BIN || process.env.ANIMORIA_BINARY_PATH;
    if (customBin && existsSync(customBin)) {
      return customBin;
    }

    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'animoria.exe' : 'animoria';

    const home = process.env.HOME || process.env.USERPROFILE || '';
    const candidates = [
      resolve(__dirname, '../bin', binaryName),
      resolve(__dirname, '../../bin', binaryName),
      resolve(__dirname, 'bin', binaryName),
      resolve(__dirname, '../../../packages/animoria-core-rust/target/release', binaryName),
      resolve(__dirname, '../../../packages/animoria-core-rust/target/debug', binaryName),
      resolve(__dirname, '../../../../packages/animoria-core-rust/target/release', binaryName),
      resolve(__dirname, '../../../../packages/animoria-core-rust/target/debug', binaryName),
      resolve(__dirname, '../../../animoria-core-rust/target/release', binaryName),
      resolve(__dirname, '../../../animoria-core-rust/target/debug', binaryName),
      resolve(__dirname, '../../../../animoria-core-rust/target/release', binaryName),
      resolve(process.cwd(), 'packages/animoria-core-rust/target/release', binaryName),
      resolve(process.cwd(), 'packages/animoria-core-rust/target/debug', binaryName),
      resolve(process.cwd(), 'target/release', binaryName),
      resolve(process.cwd(), 'target/debug', binaryName),
      join(home, '.cargo/bin', binaryName),
      `/opt/homebrew/bin/${binaryName}`,
      `/usr/local/bin/${binaryName}`,
      binaryName,
    ];

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
      crlfDelay: Infinity,
    });

    this.readline.on('line', (line) => {
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
    });

    this.process.on('error', (err) => {
      for (const [, pending] of this.pendingRequests) {
        pending.reject(err);
      }
      this.pendingRequests.clear();
    });

    this.process.on('exit', () => {
      this.process = null;
      this.readline = null;
    });

    await this.hello();
  }

  /**
   * Sends a framed Protocol v1 request and awaits the correlated response.
   */
  private async request<T>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!this.process) {
      await this.start();
    }

    const id = `vscode-req-${++this.reqIdCounter}`;
    const envelope = JSON.stringify({
      protocol: PROTOCOL_VERSION,
      id,
      method,
      params,
    });

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.process!.stdin!.write(envelope + '\n');
    });
  }

  public async hello(): Promise<HelloResult> {
    return this.request<HelloResult>('hello');
  }

  public async scan(
    workspacePath: string,
    customIgnorePatterns: string[] = []
  ): Promise<DaemonScanResult> {
    return this.request<DaemonScanResult>('scan', {
      workspace_path: workspacePath,
      custom_ignore_patterns: customIgnorePatterns,
    });
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

  public async createRemediationPlan(duplicateGroup: DuplicateGroup): Promise<ResolutionPlan> {
    return this.request<ResolutionPlan>('remediate_plan', {
      duplicate_group: duplicateGroup,
    });
  }

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

  public async restoreAsset(
    workspacePath: string,
    item: TrashItem
  ): Promise<{ restored: boolean }> {
    return this.request<{ restored: boolean }>('restore_asset', {
      workspace_path: workspacePath,
      trash_item: item,
    });
  }

  /**
   * Shuts down the daemon process gracefully.
   */
  public async shutdown(): Promise<void> {
    if (!this.process) return;
    try {
      await this.request('shutdown');
    } catch {
      // Best-effort shutdown
    } finally {
      if (this.process) {
        this.process.kill();
        this.process = null;
      }
    }
  }
}
