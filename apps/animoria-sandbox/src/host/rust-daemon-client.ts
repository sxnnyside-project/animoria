import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { type Interface, createInterface } from 'node:readline';

/**
 * Node-side client for the real `animoria` native daemon (Protocol v1
 * NDJSON over stdio) — the same binary VS Code spawns.
 *
 * ## Why the sandbox needed this
 * The dev bridge previously imported `@animoria/core` (the legacy TS
 * engine) by relative path, computing its own answer instead of showing
 * Core's. That meant the harness used to develop and review `@animoria/ui`
 * ran against a different engine than the one shipping in VS Code and
 * JetBrains — a real analysis and a plausible-looking one could silently
 * diverge. This client makes the sandbox a host over the *same* daemon the
 * IDEs use, matching `packages/animoria-vscode/src/daemon/daemon-client.ts`.
 */
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
  error?: { code: string; message: string; detail?: string };
}

export class RustDaemonClient {
  private process?: ChildProcess | undefined;
  private readline?: Interface | undefined;
  private requestIdCounter = 0;
  private pendingRequests = new Map<
    string,
    { resolve: (val: unknown) => void; reject: (err: Error) => void }
  >();
  private readonly binaryPath: string;

  constructor(binaryPath?: string) {
    this.binaryPath = binaryPath ?? this.resolveBinaryPath();
  }

  private resolveBinaryPath(): string {
    const custom = process.env.ANIMORIA_BINARY_PATH;
    if (custom && existsSync(custom)) return custom;

    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'animoria.exe' : 'animoria';
    const home = homedir();

    // Walk upward from both this file's location and the process cwd — the
    // sandbox may be launched from the repo root (`pnpm dev` via Turborepo)
    // or from its own package directory (`pnpm dev` inside the app), so a
    // fixed relative depth is fragile either way.
    const startPoints = [__dirname, process.cwd()];
    const candidates: string[] = [];
    for (const start of startPoints) {
      let dir = start;
      for (let i = 0; i < 8; i++) {
        candidates.push(
          resolve(dir, 'packages/animoria-core-rust/target/release', binaryName),
          resolve(dir, 'packages/animoria-core-rust/target/debug', binaryName)
        );
        const parent = resolve(dir, '..');
        if (parent === dir) break;
        dir = parent;
      }
    }
    candidates.push(
      join(home, '.cargo/bin', binaryName),
      `/opt/homebrew/bin/${binaryName}`,
      `/usr/local/bin/${binaryName}`
    );

    for (const cand of candidates) {
      if (existsSync(cand)) return cand;
    }
    return binaryName;
  }

  async start(): Promise<void> {
    if (this.process) return;

    const bin = this.binaryPath;
    if (bin !== 'animoria' && bin !== 'animoria.exe' && !existsSync(bin)) {
      throw new Error(
        `Animoria native binary not found at "${bin}". Build with 'cargo build -p animoria-core-rust' or set ANIMORIA_BINARY_PATH.`
      );
    }

    this.process = spawn(bin, ['daemon'], { stdio: ['pipe', 'pipe', 'inherit'] });
    this.readline = createInterface({
      input: this.process.stdout!,
      crlfDelay: Number.POSITIVE_INFINITY,
    });
    this.readline.on('line', (line) => this.handleLine(line));

    this.process.on('exit', (code, signal) => {
      this.rejectAllPending(new Error(`Daemon process exited (code=${code}, signal=${signal})`));
      this.process = undefined;
    });
    this.process.on('error', (err) => {
      this.rejectAllPending(err);
      this.process = undefined;
    });
  }

  private handleLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('{')) return;
    try {
      const response = JSON.parse(trimmed) as DaemonResponseEnvelope;
      const pending = this.pendingRequests.get(response.id);
      if (!pending) return;
      this.pendingRequests.delete(response.id);
      if (!response.error) pending.resolve(response.result);
      else pending.reject(new Error(`[${response.error.code}] ${response.error.message}`));
    } catch {
      // Malformed non-JSON stdout output, ignored.
    }
  }

  private rejectAllPending(err: Error): void {
    for (const [, pending] of this.pendingRequests) pending.reject(err);
    this.pendingRequests.clear();
  }

  async request<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.process) await this.start();

    const id = `req-${++this.requestIdCounter}`;
    const envelope = JSON.stringify({ protocol: 1, id, method, params });

    return new Promise<T>((resolvePromise, reject) => {
      this.pendingRequests.set(id, { resolve: resolvePromise as (val: unknown) => void, reject });
      this.process?.stdin?.write(`${envelope}\n`);
    });
  }

  async stop(): Promise<void> {
    if (!this.process) return;
    try {
      await this.request('shutdown');
    } catch {
      // Process may already be closed.
    } finally {
      this.readline?.close();
      this.readline = undefined;
      this.process?.kill();
      this.process = undefined;
      this.rejectAllPending(new Error('Daemon client stopped.'));
    }
  }
}
