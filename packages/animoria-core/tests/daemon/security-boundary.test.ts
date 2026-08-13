import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DaemonEvent, DaemonResponse } from '../../src/daemon/protocol.js';
import { MUTATING_METHODS, PROTOCOL_VERSION } from '../../src/daemon/protocol.js';
import { DaemonServer } from '../../src/daemon/server.js';

/**
 * The daemon does not trust its client.
 *
 * ## Why that needs saying
 * Every client is first-party, which is exactly the reasoning that produces an
 * unchecked path parameter. But the daemon is a process reading JSON from a pipe: a
 * bug in the plugin, a stale client, or anything that can write to that pipe reaches
 * these handlers, and the handlers move and delete files. "It's our own plugin" is
 * not an authorization model.
 */

const LOTTIE = JSON.stringify({ v: '5.5.7', fr: 30, ip: 0, op: 30, w: 10, h: 10, layers: [] });

let workspace: string;
let outside: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'animoria-sec-'));
  outside = mkdtempSync(join(tmpdir(), 'animoria-outside-'));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

function writeAsset(root: string, relativePath: string): string {
  const full = join(root, relativePath);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, LOTTIE);
  return full;
}

async function start(...rootPaths: string[]) {
  const messages: (DaemonResponse | DaemonEvent)[] = [];
  const server = new DaemonServer({ rootPaths, emit: (m) => messages.push(m) });
  await server.start();

  let counter = 0;
  return {
    server,
    async send(method: string, params?: Record<string, unknown>): Promise<DaemonResponse> {
      counter += 1;
      const id = `s-${counter}`;
      await server.handleLine(
        JSON.stringify({ protocol: PROTOCOL_VERSION, id, method, ...(params ? { params } : {}) })
      );
      return messages.find((m): m is DaemonResponse => 'id' in m && m.id === id)!;
    },
  };
}

describe('security — path containment', () => {
  it('refuses an absolute path outside every root', async () => {
    const victim = writeAsset(outside, 'secret.json');
    const harness = await start(workspace);

    const response = await harness.send('buildCleanupPlan', { assetPaths: [victim] });

    expect(response.error?.code).toBe('permission-denied');
    expect(readFileSync(victim, 'utf8').length).toBeGreaterThan(0);
    harness.server.stop();
  });

  it('refuses a traversal that escapes a root', async () => {
    writeAsset(outside, 'secret.json');
    const harness = await start(workspace);

    const response = await harness.send('buildCleanupPlan', {
      assetPaths: [join(workspace, '..', '..', 'etc', 'passwd')],
    });

    expect(response.error?.code).toBe('permission-denied');
    harness.server.stop();
  });

  it('refuses a relative path in a multi-root workspace rather than guessing a root', async () => {
    // `assets/logo.json` names a different file under each root. Resolving it
    // against the first would let a client delete a file it did not name.
    mkdirSync(join(workspace, 'a'), { recursive: true });
    mkdirSync(join(workspace, 'b'), { recursive: true });
    const harness = await start(join(workspace, 'a'), join(workspace, 'b'));

    const response = await harness.send('buildCleanupPlan', {
      assetPaths: ['assets/logo.json'],
    });

    expect(response.error?.code).toBe('permission-denied');
    expect(response.error?.detail).toContain('ambiguous');
    harness.server.stop();
  });
});

describe('security — request validation', () => {
  it('validates params before any handler runs', async () => {
    const harness = await start(workspace);

    for (const [method, params] of [
      ['buildCleanupPlan', { assetPaths: 'not-an-array' }],
      ['applyCleanupPlan', { planId: 42 }],
      ['buildResolutionPlan', { groupId: 'g' }],
      ['restoreTrashSession', { sessionId: 's' }],
    ] as const) {
      const response = await harness.send(method, params as Record<string, unknown>);
      expect(response.error?.code, method).toBe('invalid-params');
    }
    harness.server.stop();
  });

  it('accepts no method outside the declared set', async () => {
    const harness = await start(workspace);
    const response = await harness.send('__proto__');
    expect(response.error?.code).toBe('unsupported-method');
    harness.server.stop();
  });

  it('takes no executable, command, or arbitrary path from params', () => {
    // The daemon must never turn a protocol parameter into something it runs. A
    // `spawn`/`exec` reachable from a request is a remote code execution primitive
    // handed to anything that can write to the pipe.
    const server = readFileSync(
      new URL('../../src/daemon/server.ts', import.meta.url),
      'utf8'
    ).replace(/\/\*[\s\S]*?\*\//g, '');

    for (const dangerous of ['child_process', 'exec(', 'spawn(', 'eval(', 'Function(']) {
      expect(server, `daemon must not reference ${dangerous}`).not.toContain(dangerous);
    }
  });
});

describe('security — mutation authorization', () => {
  it('gates every mutating method behind a capability', async () => {
    // A destructive method nobody added to the capability map would be permitted
    // unconditionally, including in a host that declared it could not mutate.
    const { CAPABILITY_BY_METHOD } = await import('../../src/daemon/protocol.js');
    for (const method of MUTATING_METHODS) {
      expect(CAPABILITY_BY_METHOD[method], `${method} is ungated`).toBeDefined();
    }
  });

  it('refuses to apply a plan the client did not receive from this session', async () => {
    const harness = await start(workspace);
    const response = await harness.send('applyCleanupPlan', {
      planId: 'fabricated',
      allowPartial: true,
    });

    expect(response.error?.code).toBe('stale-plan');
    harness.server.stop();
  });

  it('refuses every request before readiness, so nothing runs against an unestablished workspace', async () => {
    const messages: (DaemonResponse | DaemonEvent)[] = [];
    const server = new DaemonServer({ rootPaths: [workspace], emit: (m) => messages.push(m) });

    // No `start()` — the workspace has not been established.
    await server.handleLine(
      JSON.stringify({
        protocol: PROTOCOL_VERSION,
        id: 'early',
        method: 'applyCleanupPlan',
        params: { planId: 'x', allowPartial: true },
      })
    );

    const response = messages.find((m): m is DaemonResponse => 'id' in m && m.id === 'early');
    expect(response?.error?.code).toBe('analysis-incomplete');
    server.stop();
  });
});

describe('security — logging discloses identifiers, not contents', () => {
  it('logs no file contents or analysis payloads', () => {
    const server = readFileSync(new URL('../../src/daemon/server.ts', import.meta.url), 'utf8');

    // The log context carries a session id, a request id, a method and a workspace
    // id — enough to correlate a failure, and none of it a developer's source code.
    expect(server).toContain('sessionId');
    expect(server).toContain('requestId');
    expect(server).not.toMatch(/logWarn\([^)]*analysis[,)]/);
    expect(server).not.toMatch(/console\.log/);
  });

  it('carries a stack trace in `detail`, never in the developer-facing message', () => {
    const server = readFileSync(new URL('../../src/daemon/server.ts', import.meta.url), 'utf8');
    // `error.stack` may appear only as the `detail` of a structured error.
    const stackUses = server.match(/error\.stack/g) ?? [];
    for (const _ of stackUses) {
      expect(server).toMatch(/detail:\s*error instanceof Error \? \(error\.stack/);
    }
  });
});
