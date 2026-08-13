import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DaemonEvent, DaemonResponse } from '../../src/daemon/protocol.js';
import {
  DAEMON_METHODS,
  MIN_SUPPORTED_PROTOCOL_VERSION,
  PROTOCOL_VERSION,
  checkProtocolCompatibility,
  validateRequest,
} from '../../src/daemon/protocol.js';
import { DaemonServer } from '../../src/daemon/server.js';

/**
 * Protocol v1, exercised in-process.
 *
 * ## Why in-process rather than against a spawned binary
 * The protocol used to live inside the CLI's watch command, so the only way to ask
 * "is a duplicate request id rejected?" was to boot a subprocess and race it —
 * which is slow, flaky, and cannot observe the daemon's internal state at all.
 * `DaemonServer` takes an injected `emit`, so every message in both directions is a
 * value this file can assert on. The subprocess test is left to prove only that the
 * pipes are connected.
 */

const LOTTIE = JSON.stringify({ v: '5.5.7', fr: 30, ip: 0, op: 30, w: 10, h: 10, layers: [] });

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'animoria-daemon-'));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function writeAsset(root: string, relativePath: string, content = LOTTIE): string {
  const full = join(root, relativePath);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
  return full;
}

interface Harness {
  readonly server: DaemonServer;
  readonly messages: (DaemonResponse | DaemonEvent)[];
  readonly responses: () => DaemonResponse[];
  readonly events: () => DaemonEvent[];
  send(id: string, method: string, params?: Record<string, unknown>): Promise<void>;
  responseFor(id: string): DaemonResponse | undefined;
}

async function start(rootPaths: readonly string[]): Promise<Harness> {
  const messages: (DaemonResponse | DaemonEvent)[] = [];
  const server = new DaemonServer({
    rootPaths,
    emit: (message) => messages.push(message),
    coreVersion: '1.0.0-test',
    daemonVersion: '1.0.0-test',
  });
  await server.start();

  return {
    server,
    messages,
    responses: () => messages.filter((m): m is DaemonResponse => 'id' in m),
    events: () => messages.filter((m): m is DaemonEvent => 'event' in m),
    async send(id, method, params) {
      await server.handleLine(
        JSON.stringify({ protocol: PROTOCOL_VERSION, id, method, ...(params ? { params } : {}) })
      );
    },
    responseFor(id) {
      return messages.filter((m): m is DaemonResponse => 'id' in m).find((m) => m.id === id);
    },
  };
}

// ── Envelope ──────────────────────────────────────────────────────────────────

describe('protocol — envelope validation', () => {
  it('rejects a non-object', () => {
    const result = validateRequest('nope');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid-request');
  });

  it('rejects a request with no id, and says so', () => {
    const result = validateRequest({ protocol: PROTOCOL_VERSION, method: 'ping' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid-request');
      expect(result.error.message).toContain('id');
    }
  });

  it('rejects an unknown method and lists the known ones', () => {
    // A silently-dropped unknown command is why the old daemon's answer to a typo
    // was the client's timeout, reported to the user as "the engine is slow".
    const result = validateRequest({ protocol: PROTOCOL_VERSION, id: '1', method: 'rm -rf' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('unsupported-method');
      expect(result.error.detail).toContain('ping');
    }
  });

  it('rejects non-object params', () => {
    const result = validateRequest({
      protocol: PROTOCOL_VERSION,
      id: '1',
      method: 'ping',
      params: 'nope',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid-params');
  });

  it('recovers the id even from an invalid request, so the failure is correlatable', () => {
    const result = validateRequest({ protocol: 999, id: 'req-1', method: 'ping' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.id).toBe('req-1');
  });
});

describe('protocol — version compatibility', () => {
  it('accepts its own version', () => {
    expect(checkProtocolCompatibility(PROTOCOL_VERSION).compatible).toBe(true);
  });

  it('names the direction of a mismatch, because the two fixes are opposite', () => {
    // "Update your plugin" and "reinstall so the engine updates" send users to
    // different places; a single "protocol mismatch" sends half of them to the
    // wrong one.
    const tooOld = checkProtocolCompatibility(MIN_SUPPORTED_PROTOCOL_VERSION - 1);
    expect(tooOld.reason).toBe('client-too-old');
    expect(tooOld.message).toContain('Update');

    const tooNew = checkProtocolCompatibility(PROTOCOL_VERSION + 1);
    expect(tooNew.reason).toBe('client-too-new');
    expect(tooNew.message).toContain('Reinstall');
  });

  it('rejects a malformed version rather than coercing it', () => {
    for (const bad of [undefined, null, '1', 1.5, Number.NaN]) {
      expect(checkProtocolCompatibility(bad).compatible, String(bad)).toBe(false);
    }
  });

  it('never silently downgrades — a mismatched request gets an error, not a result', async () => {
    const harness = await start([workspace]);
    await harness.server.handleLine(
      JSON.stringify({ protocol: 99, id: 'v', method: 'getAnalysis' })
    );

    const response = harness.responseFor('v');
    expect(response?.error?.code).toBe('unsupported-version');
    expect(response?.result).toBeUndefined();
    expect(response?.error?.retryable).toBe(false);
    harness.server.stop();
  });

  it('refuses a method the protocol does not declare', async () => {
    // Every *declared* method is now implemented — `getUsageReferences` and
    // `exportReport` were the last two that were not, and both had real consumers
    // waiting on them. What must still be refused deterministically is a name the
    // vocabulary does not contain, which is how six invented JetBrains method names
    // stayed invisible for a whole migration.
    const harness = await start([workspace]);
    await harness.send('bad-1', 'getSnapshot');
    const response = harness.responseFor('bad-1');
    expect(response?.error?.code).toBe('unsupported-method');
    expect(response?.error?.message).toContain('getSnapshot');

    harness.server.stop();
  });

  it('answers getUsageReferences, for the asset and for the file', async () => {
    // The capability D-04 calls the highest priority after the core flow. It was
    // declared here and refused, so the shared UI's inspector had nothing to list and
    // the JetBrains hover matched asset stems against document text instead.
    writeAsset(workspace, 'assets/spinner.json');
    mkdirSync(join(workspace, 'src'), { recursive: true });
    writeFileSync(
      join(workspace, 'src', 'app.ts'),
      `import spinner from '../assets/spinner.json';\n`,
      'utf8'
    );
    const harness = await start([workspace]);
    await harness.send('an-1', 'analyze');

    await harness.send('u-1', 'getUsageReferences', {
      assetPath: join(workspace, 'assets', 'spinner.json'),
    });
    const byAsset = harness.responseFor('u-1')?.result as {
      references: { file: string; line: number }[];
      complete: boolean;
    };
    expect(byAsset.complete).toBe(true);
    expect(byAsset.references.length).toBeGreaterThan(0);

    // The reverse lookup a hover needs, so no client has to match text itself.
    await harness.send('u-2', 'getUsageReferences', { file: join(workspace, 'src', 'app.ts') });
    const byFile = harness.responseFor('u-2')?.result as {
      references: { assetPath: string }[];
    };
    expect(byFile.references.length).toBeGreaterThan(0);

    // Neither parameter: the whole workspace, so a hover can fetch once per
    // generation rather than once per mouse move.
    await harness.send('u-3', 'getUsageReferences');
    const all = harness.responseFor('u-3')?.result as { references: unknown[]; generation: number };
    expect(all.references.length).toBeGreaterThan(0);
    expect(all.generation).toBeGreaterThan(0);

    harness.server.stop();
  });

  it('answers exportReport, because two JetBrains actions depend on it', async () => {
    // It used to be refused alongside `getUsageReferences`, while the plugin's
    // "Governance Report" and "Export Report" actions both called it. A declared
    // method may only stay unimplemented while nothing calls it —
    // `host-connectivity.test.ts` now checks that pairing directly.
    writeAsset(workspace, 'assets/a.json');
    const harness = await start([workspace]);

    await harness.send('rep-1', 'exportReport', { format: 'markdown' });
    const markdown = harness.responseFor('rep-1')?.result as { format: string; content: string };
    expect(markdown.format).toBe('markdown');
    expect(markdown.content.length).toBeGreaterThan(0);

    await harness.send('rep-2', 'exportReport', { format: 'json' });
    const json = harness.responseFor('rep-2')?.result as { format: string; content: string };
    expect(json.format).toBe('json');
    expect(() => JSON.parse(json.content)).not.toThrow();

    await harness.send('rep-3', 'exportReport', { format: 'pdf' });
    expect(harness.responseFor('rep-3')?.error?.code).toBe('invalid-params');

    harness.server.stop();
  });
});

// ── Handshake ─────────────────────────────────────────────────────────────────

describe('protocol — handshake', () => {
  it('establishes protocol, versions, session, capabilities and workspace in one round trip', async () => {
    writeAsset(workspace, 'assets/a.json');
    const harness = await start([workspace]);

    await harness.send('h', 'hello');
    const result = harness.responseFor('h')?.result as Record<string, unknown>;

    expect(result.protocol).toBe(PROTOCOL_VERSION);
    expect(result.coreVersion).toBe('1.0.0-test');
    expect(result.sessionId).toBe(harness.server.sessionId);
    expect((result.capabilities as Record<string, boolean>).multiRoot).toBe(true);
    expect((result.workspace as { roots: unknown[] }).roots).toHaveLength(1);
    harness.server.stop();
  });

  it('emits ready only after the analysis is established, and in order', async () => {
    writeAsset(workspace, 'assets/a.json');
    const harness = await start([workspace]);

    const names = harness.events().map((event) => event.event);
    expect(names).toEqual(['indexing-started', 'analysis-started', 'analysis-completed', 'ready']);
    expect(harness.server.isReady).toBe(true);
    harness.server.stop();
  });

  it('numbers events monotonically from 1, so a client can detect a gap', async () => {
    const harness = await start([workspace]);
    const sequences = harness.events().map((event) => event.sequence);
    expect(sequences).toEqual([1, 2, 3, 4]);
    harness.server.stop();
  });

  it('answers ping with liveness that distinguishes slow from dead', async () => {
    const harness = await start([workspace]);
    await harness.send('p', 'ping');
    const result = harness.responseFor('p')?.result as Record<string, unknown>;

    expect(result.sessionId).toBe(harness.server.sessionId);
    expect(result.ready).toBe(true);
    expect(result.inFlight).toBe(0);
    expect(typeof result.uptimeMs).toBe('number');
    harness.server.stop();
  });
});

describe('protocol — pre-ready behaviour is deterministic', () => {
  it('refuses non-handshake requests before ready, with a retryable error', async () => {
    // Deterministic by construction: there is no window in which a request's
    // behaviour depends on how fast the initial scan happened to run.
    const messages: (DaemonResponse | DaemonEvent)[] = [];
    const server = new DaemonServer({ rootPaths: [workspace], emit: (m) => messages.push(m) });

    await server.handleLine(
      JSON.stringify({ protocol: PROTOCOL_VERSION, id: 'early', method: 'getAnalysis' })
    );

    const response = messages.find((m): m is DaemonResponse => 'id' in m && m.id === 'early');
    expect(response?.error?.code).toBe('analysis-incomplete');
    expect(response?.error?.retryable).toBe(true);
    server.stop();
  });

  it('answers hello and ping before ready', async () => {
    const messages: (DaemonResponse | DaemonEvent)[] = [];
    const server = new DaemonServer({ rootPaths: [workspace], emit: (m) => messages.push(m) });

    await server.handleLine(
      JSON.stringify({ protocol: PROTOCOL_VERSION, id: 'h', method: 'hello' })
    );
    const response = messages.find((m): m is DaemonResponse => 'id' in m && m.id === 'h');
    expect(response?.result).toBeDefined();
    server.stop();
  });
});

// ── Fatal ─────────────────────────────────────────────────────────────────────

describe('protocol — unusable workspace', () => {
  it('emits fatal instead of reporting a clean empty workspace', async () => {
    // P4. The old daemon indexed whatever path it was handed and emitted
    // `scanComplete` with zero assets and a perfect score, so a host could not tell
    // "your workspace is clean" from "that path is not a directory".
    const harness = await start([join(workspace, 'does-not-exist')]);

    const fatal = harness.events().find((event) => event.event === 'fatal');
    expect(fatal).toBeDefined();
    expect(harness.server.isReady).toBe(false);
  });

  it('answers every subsequent request with the fatal reason', async () => {
    const harness = await start([join(workspace, 'does-not-exist')]);
    await harness.send('after', 'getAnalysis');

    const response = harness.responseFor('after');
    expect(response?.error).toBeDefined();
    expect(response?.result).toBeUndefined();
  });
});

// ── Request lifecycle ─────────────────────────────────────────────────────────

describe('protocol — request ids', () => {
  it('echoes the id exactly', async () => {
    const harness = await start([workspace]);
    await harness.send('a-very-specific-id', 'ping');
    expect(harness.responseFor('a-very-specific-id')).toBeDefined();
    harness.server.stop();
  });

  it('rejects a reused id rather than executing twice', async () => {
    // A client retrying an id after a timeout would otherwise get two executions of
    // a mutating operation.
    const harness = await start([workspace]);
    await harness.send('dup', 'ping');
    await harness.send('dup', 'ping');

    const responses = harness.responses().filter((r) => r.id === 'dup');
    expect(responses).toHaveLength(2);
    expect(responses[1]?.error?.code).toBe('duplicate-request-id');
    harness.server.stop();
  });

  it('keeps concurrent requests separate', async () => {
    writeAsset(workspace, 'assets/a.json');
    const harness = await start([workspace]);

    await Promise.all([
      harness.send('c1', 'ping'),
      harness.send('c2', 'getAnalysis'),
      harness.send('c3', 'hello'),
    ]);

    for (const id of ['c1', 'c2', 'c3']) {
      const response = harness.responseFor(id);
      expect(response, id).toBeDefined();
      expect(response?.id, id).toBe(id);
      expect(response?.error, id).toBeUndefined();
    }
    harness.server.stop();
  });

  it('answers every request exactly once', async () => {
    const harness = await start([workspace]);
    await Promise.all([
      harness.send('r1', 'ping'),
      harness.send('r2', 'ping'),
      harness.send('r3', 'ping'),
    ]);

    for (const id of ['r1', 'r2', 'r3']) {
      expect(harness.responses().filter((r) => r.id === id)).toHaveLength(1);
    }
    harness.server.stop();
  });
});

describe('protocol — cancellation', () => {
  it('reports an unknown cancel target rather than silently succeeding', async () => {
    // A client that believes it cancelled something never running will wait for a
    // cancellation that is not coming.
    const harness = await start([workspace]);
    await harness.send('c', 'cancel', { requestId: 'nothing-is-running' });

    expect(harness.responseFor('c')?.error?.code).toBe('unknown-request-id');
    harness.server.stop();
  });

  it('refuses a request that cancels itself', async () => {
    const harness = await start([workspace]);
    await harness.send('self', 'cancel', { requestId: 'self' });
    expect(harness.responseFor('self')?.error?.code).toBe('invalid-params');
    harness.server.stop();
  });

  it('reports cancellation as its own state, not as a generic failure', async () => {
    const harness = await start([workspace]);

    // Cancel arrives while `analyze` is executing; the analyze response must be
    // `cancelled`, not `internal-error`.
    const analyzing = harness.send('long', 'analyze');
    await harness.send('killer', 'cancel', { requestId: 'long' });
    await analyzing;

    const response = harness.responseFor('long');
    if (response?.error) {
      expect(response.error.code).toBe('cancelled');
      expect(response.error.retryable).toBe(true);
    }
    harness.server.stop();
  });
});

describe('protocol — shutdown', () => {
  it('answers outstanding requests rather than leaving clients to time out', async () => {
    const harness = await start([workspace]);
    await harness.send('s', 'shutdown');

    expect(harness.responseFor('s')?.result).toEqual({ stopping: true });
    harness.server.stop();
    expect(harness.server.isReady).toBe(false);
  });

  it('refuses new requests once stopped', async () => {
    const harness = await start([workspace]);
    harness.server.stop();
    await harness.send('after-stop', 'ping');

    const response = harness.responseFor('after-stop');
    expect(response?.error?.code).toBe('cancelled');
    expect(response?.result).toBeUndefined();
  });
});

// ── Session isolation ─────────────────────────────────────────────────────────

describe('protocol — session isolation', () => {
  it('gives each session a distinct id', async () => {
    const a = await start([workspace]);
    const b = await start([workspace]);
    expect(a.server.sessionId).not.toBe(b.server.sessionId);
    a.server.stop();
    b.server.stop();
  });

  it('scopes events to their session', async () => {
    const a = await start([workspace]);
    const b = await start([workspace]);

    for (const event of a.events()) expect(event.sessionId).toBe(a.server.sessionId);
    for (const event of b.events()) expect(event.sessionId).toBe(b.server.sessionId);
    a.server.stop();
    b.server.stop();
  });

  it('refuses a plan id issued by another session', async () => {
    // The cross-session guarantee needs no separate check: another session's plan
    // is simply not in this session's map.
    writeAsset(workspace, 'assets/unused.json');
    const a = await start([workspace]);
    const b = await start([workspace]);

    await a.send('plan', 'buildCleanupPlan', {
      assetPaths: [join(workspace, 'assets/unused.json')],
    });
    const plans = (a.responseFor('plan')?.result as { plans: { planId: string }[] } | undefined)
      ?.plans;
    const foreignPlanId = plans?.[0]?.planId;
    expect(foreignPlanId).toBeDefined();

    await b.send('apply', 'applyCleanupPlan', { planId: foreignPlanId, allowPartial: false });
    expect(b.responseFor('apply')?.error?.code).toBe('stale-plan');

    a.server.stop();
    b.server.stop();
  });

  it('does not let one session see another sessions responses', async () => {
    const a = await start([workspace]);
    const b = await start([workspace]);

    await a.send('only-in-a', 'ping');

    expect(b.responses().some((r) => r.id === 'only-in-a')).toBe(false);
    a.server.stop();
    b.server.stop();
  });
});

// ── Restart ───────────────────────────────────────────────────────────────────

describe('protocol — restart is a protocol-level invariant', () => {
  it('a restarted daemon issues a new session and rejects the old sessions plans', async () => {
    writeAsset(workspace, 'assets/unused.json');

    const first = await start([workspace]);
    await first.send('plan', 'buildCleanupPlan', {
      assetPaths: [join(workspace, 'assets/unused.json')],
    });
    const planId = (first.responseFor('plan')?.result as { plans: { planId: string }[] }).plans[0]
      ?.planId;
    first.server.stop();

    const second = await start([workspace]);
    expect(second.server.sessionId).not.toBe(first.server.sessionId);

    await second.send('apply', 'applyCleanupPlan', { planId, allowPartial: false });
    expect(second.responseFor('apply')?.error?.code).toBe('stale-plan');
    second.server.stop();
  });

  it('the second session starts from a clean request registry', async () => {
    const first = await start([workspace]);
    await first.send('reused', 'ping');
    first.server.stop();

    // The same id is fine in a new session: uniqueness is per-session, which is
    // correct because the session id also changed and a client must have discarded
    // its old state.
    const second = await start([workspace]);
    await second.send('reused', 'ping');
    expect(second.responseFor('reused')?.error).toBeUndefined();
    second.server.stop();
  });
});

// ── Method surface ────────────────────────────────────────────────────────────

describe('protocol — method surface', () => {
  it('every declared method is either implemented or explicitly refused', async () => {
    const harness = await start([workspace]);

    for (const [index, method] of DAEMON_METHODS.entries()) {
      if (method === 'shutdown') continue; // Stops the server under test.
      const id = `m-${index}`;
      await harness.send(id, method, {
        requestId: 'x',
        assetPaths: [],
        planId: 'x',
        groupId: 'x',
        keepPath: workspace,
        sessionId: 'x',
        rootId: 'x',
      });

      const response = harness.responseFor(id);
      expect(response, method).toBeDefined();
      // Either it worked or it named a reason. What must never happen is silence.
      expect(response?.result !== undefined || response?.error !== undefined, method).toBe(true);
    }
    harness.server.stop();
  });
});
