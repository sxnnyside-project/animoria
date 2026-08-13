import type { DaemonEvent, DaemonResponse } from '@animoria/core/contracts';
import { PROTOCOL_VERSION } from '@animoria/core/contracts';
import { describe, expect, it } from 'vitest';
import { FakeDaemon, type DaemonScenario } from '../src/host/fake-daemon.js';

/**
 * The harness's scripted protocol host.
 *
 * These assert that each scenario produces the protocol shape the real daemon would
 * — a fake that answered differently from the thing it stands in for would let the
 * UI be developed against behaviour that never happens.
 */

function run(scenario: DaemonScenario) {
  const messages: (DaemonResponse | DaemonEvent)[] = [];
  const daemon = new FakeDaemon({
    scenario,
    analysisPayload: { roots: [] },
    onMessage: (message) => messages.push(message),
  });
  daemon.start();
  return { daemon, messages };
}

const events = (messages: (DaemonResponse | DaemonEvent)[]) =>
  messages.filter((m): m is DaemonEvent => 'event' in m);

const responses = (messages: (DaemonResponse | DaemonEvent)[]) =>
  messages.filter((m): m is DaemonResponse => 'id' in m);

describe('fake daemon — healthy path', () => {
  it('emits the startup sequence in order', () => {
    const { messages, daemon } = run('healthy');
    expect(events(messages).map((e) => e.event)).toEqual([
      'indexing-started',
      'analysis-started',
      'analysis-completed',
      'ready',
    ]);
    expect(daemon.isReady).toBe(true);
  });

  it('numbers events monotonically', () => {
    const { messages } = run('healthy');
    expect(events(messages).map((e) => e.sequence)).toEqual([1, 2, 3, 4]);
  });

  it('answers hello with the protocol contract', () => {
    const { daemon, messages } = run('healthy');
    daemon.request('h', 'hello');
    const result = responses(messages).find((r) => r.id === 'h')?.result as { protocol: number };
    expect(result.protocol).toBe(PROTOCOL_VERSION);
  });
});

describe('fake daemon — failure scenarios the real one cannot be asked to produce', () => {
  it('unavailable: emits nothing at all', () => {
    // The case a client can only distinguish from "slow" by asking, which is what
    // `ping` is for.
    const { messages, daemon } = run('unavailable');
    expect(messages).toEqual([]);
    expect(daemon.isReady).toBe(false);
  });

  it('never-ready: accepts a request and never answers it', () => {
    const { daemon, messages } = run('never-ready');
    daemon.request('hangs', 'getAnalysis');
    expect(responses(messages)).toEqual([]);
  });

  it('protocol-mismatch: refuses with a non-retryable, actionable error', () => {
    const { daemon, messages } = run('protocol-mismatch');
    daemon.request('m', 'getAnalysis');

    const error = responses(messages).find((r) => r.id === 'm')?.error;
    expect(error?.code).toBe('unsupported-version');
    expect(error?.retryable).toBe(false);
    // Tells the developer what to do, not what happened.
    expect(error?.message).toMatch(/Reinstall/i);
  });

  it('rejects a caller claiming an unsupported protocol, even in a healthy scenario', () => {
    const { daemon, messages } = run('healthy');
    daemon.request('v', 'ping', 99);
    expect(responses(messages).find((r) => r.id === 'v')?.error?.code).toBe('unsupported-version');
  });

  it('fatal-workspace: stops after fatal and never reaches ready', () => {
    const { messages, daemon } = run('fatal-workspace');
    const names = events(messages).map((e) => e.event);

    expect(names).toContain('fatal');
    expect(names).not.toContain('ready');
    expect(daemon.isReady).toBe(false);
  });

  it('analysis-failed: reaches analysis-started, then fails, and is never ready', () => {
    const { messages, daemon } = run('analysis-failed');
    const names = events(messages).map((e) => e.event);

    expect(names).toEqual(['indexing-started', 'analysis-started', 'analysis-failed']);
    expect(daemon.isReady).toBe(false);
  });

  it('stale-plan: rejects every request as retryable', () => {
    const { daemon, messages } = run('stale-plan');
    daemon.request('s', 'applyCleanupPlan');

    const error = responses(messages).find((r) => r.id === 's')?.error;
    expect(error?.code).toBe('stale-plan');
    expect(error?.retryable).toBe(true);
  });

  it('cancelled: reports cancellation as its own code, not a generic failure', () => {
    const { daemon, messages } = run('cancelled');
    daemon.request('c', 'analyze');
    expect(responses(messages).find((r) => r.id === 'c')?.error?.code).toBe('cancelled');
  });

  it('answers ping even while a scenario is failing, so liveness stays observable', () => {
    // A daemon that refuses everything including its own liveness probe is
    // indistinguishable from a dead one — and the two need different fixes.
    const { daemon, messages } = run('stale-plan');
    daemon.request('p', 'ping');
    expect(responses(messages).find((r) => r.id === 'p')?.error).toBeUndefined();
  });
});

describe('fake daemon — it stands in for the daemon, not for Core', () => {
  it('replays the analysis it was given rather than computing one', () => {
    const payload = { roots: [], marker: 'fixture' };
    const messages: (DaemonResponse | DaemonEvent)[] = [];
    const daemon = new FakeDaemon({
      scenario: 'healthy',
      analysisPayload: payload,
      onMessage: (message) => messages.push(message),
    });
    daemon.start();
    daemon.request('a', 'getAnalysis');

    expect(responses(messages).find((r) => r.id === 'a')?.result).toBe(payload);
  });

  it('refuses a method it does not implement rather than inventing a result', () => {
    const { daemon, messages } = run('healthy');
    daemon.request('u', 'buildResolutionPlan');
    expect(responses(messages).find((r) => r.id === 'u')?.error?.code).toBe('unsupported-method');
  });
});
