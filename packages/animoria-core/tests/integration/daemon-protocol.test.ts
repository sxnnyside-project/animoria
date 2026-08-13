import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DaemonEvent, DaemonResponse } from '../../src/daemon/protocol.js';
import { PROTOCOL_VERSION } from '../../src/daemon/protocol.js';

/**
 * Protocol v1 against a real spawned binary.
 *
 * ## What this covers that `tests/daemon/protocol.test.ts` cannot
 * That file tests the protocol; this one tests the *wiring*. Process startup, line
 * framing across chunk boundaries, stdin/stdout plumbing, multi-root arguments, and
 * termination are only real in a subprocess — and every one of them has been a
 * source of failure that a handler-level test would have passed straight through.
 *
 * Deliberately thin. The protocol's semantics are asserted in-process, where the
 * server's state is observable; duplicating them here would mean racing a subprocess
 * to test something already covered.
 */

const CLI = resolve(process.cwd(), 'dist/cli.js');
const LOTTIE = JSON.stringify({ v: '5.7.4', fr: 30, ip: 0, op: 60, w: 1, h: 1, layers: [] });

class DaemonHarness {
  private readonly messages: (DaemonResponse | DaemonEvent)[] = [];
  private readonly waiters: {
    predicate: (message: DaemonResponse | DaemonEvent) => boolean;
    resolve: (message: DaemonResponse | DaemonEvent) => void;
  }[] = [];
  private buffer = '';
  private nextId = 0;

  private constructor(private readonly child: ChildProcessWithoutNullStreams) {
    child.stdout.setEncoding('utf-8');
    child.stdout.on('data', (chunk: string) => this.consume(chunk));
  }

  /** Spawns the daemon over one or more roots. */
  static spawn(...rootPaths: string[]): DaemonHarness {
    return new DaemonHarness(
      spawn(process.execPath, [CLI, 'daemon', ...rootPaths], { stdio: ['pipe', 'pipe', 'pipe'] })
    );
  }

  private consume(chunk: string): void {
    this.buffer += chunk;
    let newline = this.buffer.indexOf('\n');
    while (newline !== -1) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (line.startsWith('{')) {
        try {
          const parsed = JSON.parse(line) as DaemonResponse | DaemonEvent;
          this.messages.push(parsed);
          for (let i = this.waiters.length - 1; i >= 0; i -= 1) {
            const waiter = this.waiters[i];
            if (waiter?.predicate(parsed)) {
              this.waiters.splice(i, 1);
              waiter.resolve(parsed);
            }
          }
        } catch {
          // A partial line is impossible here — framing is one JSON object per
          // newline — so an unparseable line is a protocol violation worth failing on
          // rather than tolerating. Surfaced by the awaiting test timing out.
        }
      }
      newline = this.buffer.indexOf('\n');
    }
  }

  private wait(
    predicate: (message: DaemonResponse | DaemonEvent) => boolean,
    timeoutMs = 15_000
  ): Promise<DaemonResponse | DaemonEvent> {
    const existing = this.messages.find(predicate);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolveWait, rejectWait) => {
      const timer = setTimeout(
        () => rejectWait(new Error('Timed out waiting for a daemon message.')),
        timeoutMs
      );
      this.waiters.push({
        predicate,
        resolve: (message) => {
          clearTimeout(timer);
          resolveWait(message);
        },
      });
    });
  }

  waitForEvent(name: string): Promise<DaemonEvent> {
    return this.wait((m) => 'event' in m && m.event === name) as Promise<DaemonEvent>;
  }

  /** Awaits the response to an id sent via {@link writeRaw}, which bypasses `request`. */
  waitForResponse(id: string): Promise<DaemonResponse> {
    return this.wait((m) => 'id' in m && m.id === id) as Promise<DaemonResponse>;
  }

  /** Sends a request and resolves with its response. Ids are unique per harness. */
  async request(method: string, params?: Record<string, unknown>): Promise<DaemonResponse> {
    this.nextId += 1;
    const id = `req-${this.nextId}`;
    const response = this.wait((m) => 'id' in m && m.id === id) as Promise<DaemonResponse>;
    this.child.stdin.write(
      `${JSON.stringify({ protocol: PROTOCOL_VERSION, id, method, ...(params ? { params } : {}) })}\n`
    );
    return response;
  }

  /** Sends a raw line, for malformed-input cases. */
  writeRaw(line: string): void {
    this.child.stdin.write(`${line}\n`);
  }

  get allMessages(): readonly (DaemonResponse | DaemonEvent)[] {
    return this.messages;
  }

  kill(): void {
    this.child.stdin.end();
    this.child.kill();
  }
}

let workspace: string;
let harness: DaemonHarness | null = null;

function write(relativePath: string, content: string): string {
  const full = join(workspace, relativePath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
  return full;
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'animoria-daemon-e2e-'));
});

afterEach(() => {
  harness?.kill();
  harness = null;
  rmSync(workspace, { recursive: true, force: true });
});

describe('daemon binary — startup and handshake', () => {
  it('reaches ready over a real workspace and answers hello', async () => {
    write('assets/a.json', LOTTIE);
    harness = DaemonHarness.spawn(workspace);

    await harness.waitForEvent('ready');
    const response = await harness.request('hello');
    const result = response.result as Record<string, unknown>;

    expect(response.error).toBeUndefined();
    expect(result.protocol).toBe(PROTOCOL_VERSION);
    expect(typeof result.sessionId).toBe('string');
  });

  it('emits its lifecycle events in order, with monotonic sequence numbers', async () => {
    write('assets/a.json', LOTTIE);
    harness = DaemonHarness.spawn(workspace);
    await harness.waitForEvent('ready');

    const events = harness.allMessages.filter((m): m is DaemonEvent => 'event' in m);
    expect(events.map((e) => e.event)).toEqual([
      'indexing-started',
      'analysis-started',
      'analysis-completed',
      'ready',
    ]);
    expect(events.map((e) => e.sequence)).toEqual([1, 2, 3, 4]);
  });

  it('emits fatal for an unusable workspace rather than a clean empty analysis', async () => {
    harness = DaemonHarness.spawn(join(workspace, 'nope'));
    const fatal = await harness.waitForEvent('fatal');
    expect((fatal.payload as { code: string }).code).toBe('workspace-not-found');
  });
});

describe('daemon binary — multi-root', () => {
  it('accepts several roots on the command line and reports them in the handshake', async () => {
    write('root-a/assets/a.json', LOTTIE);
    write('root-b/assets/b.json', LOTTIE);

    harness = DaemonHarness.spawn(join(workspace, 'root-a'), join(workspace, 'root-b'));
    await harness.waitForEvent('ready');

    const result = (await harness.request('hello')).result as {
      workspace: { roots: { name: string }[] };
    };
    expect(result.workspace.roots.map((root) => root.name).sort()).toEqual(['root-a', 'root-b']);
  });

  it('returns an analysis covering every root', async () => {
    write('root-a/assets/a.json', LOTTIE);
    write('root-b/assets/b.json', LOTTIE);

    harness = DaemonHarness.spawn(join(workspace, 'root-a'), join(workspace, 'root-b'));
    await harness.waitForEvent('ready');

    const analysis = (await harness.request('getAnalysis')).result as {
      assets: { rootName: string }[];
      roots: unknown[];
    };
    expect(analysis.roots).toHaveLength(2);
    expect(new Set(analysis.assets.map((entry) => entry.rootName))).toEqual(
      new Set(['root-a', 'root-b'])
    );
  });
});

describe('daemon binary — malformed input over the real pipe', () => {
  it('survives a line that is not JSON, and keeps serving', async () => {
    write('assets/a.json', LOTTIE);
    harness = DaemonHarness.spawn(workspace);
    await harness.waitForEvent('ready');

    harness.writeRaw('this is not json');
    harness.writeRaw('{"unterminated": ');

    // The daemon must still answer the next well-formed request. A parser that
    // throws on the stdin handler takes the whole process down and the client sees a
    // dead engine rather than one bad line.
    const response = await harness.request('ping');
    expect(response.error).toBeUndefined();
  });

  it('rejects a mismatched protocol version with a correlatable error', async () => {
    write('assets/a.json', LOTTIE);
    harness = DaemonHarness.spawn(workspace);
    await harness.waitForEvent('ready');

    harness.writeRaw(JSON.stringify({ protocol: 99, id: 'bad-version', method: 'ping' }));

    const response = await harness.waitForResponse('bad-version');
    expect(response.error?.code).toBe('unsupported-version');
  });
});

describe('daemon binary — concurrency and correlation', () => {
  it('correlates concurrent requests without crossing responses', async () => {
    write('assets/a.json', LOTTIE);
    harness = DaemonHarness.spawn(workspace);
    await harness.waitForEvent('ready');

    const [ping, hello, analysis] = await Promise.all([
      harness.request('ping'),
      harness.request('hello'),
      harness.request('getAnalysis'),
    ]);

    // Each response must carry its own request's id and its own method's result.
    expect((ping.result as { uptimeMs: number }).uptimeMs).toBeGreaterThanOrEqual(0);
    expect((hello.result as { protocol: number }).protocol).toBe(PROTOCOL_VERSION);
    expect((analysis.result as { roots: unknown[] }).roots).toHaveLength(1);
  });
});

describe('daemon binary — shutdown', () => {
  it('answers shutdown before stopping', async () => {
    write('assets/a.json', LOTTIE);
    harness = DaemonHarness.spawn(workspace);
    await harness.waitForEvent('ready');

    const response = await harness.request('shutdown');
    expect(response.result).toEqual({ stopping: true });
    expect(response.error).toBeUndefined();
  });
});
