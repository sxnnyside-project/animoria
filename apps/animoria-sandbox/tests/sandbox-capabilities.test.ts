import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SANDBOX_CAPABILITIES } from '../src/host/sandbox-host.js';

// Comments are stripped so a mention of a removed endpoint in an explanatory
// comment doesn't get flagged as if the endpoint still existed.
function bridgeSource(): string {
  return readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

// Asserts the sandbox's read-only guarantee as a property, not a promise: the
// reference host declares `canMutate: false` and nothing in the bridge can
// still delete or rewrite files.
describe('sandbox capabilities', () => {
  it('declares mutation unavailable', () => {
    expect(SANDBOX_CAPABILITIES.canMutate).toBe(false);
    expect(SANDBOX_CAPABILITIES.canRestore).toBe(false);
  });

  it('states why, so the disabled control is explicable', () => {
    // A disabled button with no reason is worse than a missing one: the developer
    // cannot tell whether it is broken, unimplemented, or deliberately off.
    expect(SANDBOX_CAPABILITIES.mutationUnavailableReason).toBeTruthy();
    expect(SANDBOX_CAPABILITIES.mutationUnavailableReason).toContain('Sandbox');
  });

  it('keeps read-only capabilities on, so every screen stays reviewable', () => {
    // Read-only must not mean inert. A harness that cannot navigate to a reference
    // cannot review the evidence panel, which is the component that most needed one.
    expect(SANDBOX_CAPABILITIES.canOpenReference).toBe(true);
    expect(SANDBOX_CAPABILITIES.canCopyToClipboard).toBe(true);
  });
});

describe('sandbox dev bridge', () => {
  it('exposes no mutating endpoint', () => {
    // Read from source rather than by booting the server: the guarantee is that no
    // such route exists, and the honest way to check that is to look.
    const config = bridgeSource();

    // The blanket refusal is what makes a new write endpoint impossible to add by
    // accident, so it is the thing worth asserting — not the absence of any one route.
    expect(config).toContain("req.method !== 'GET'");
    expect(config).toContain('405');

    for (const removed of [
      '/api/delete-asset',
      '/api/execute-cleanup',
      '/api/resolve-duplicates',
    ]) {
      expect(config, `${removed} must not exist`).not.toContain(removed);
    }
  });

  it('serves plan-building endpoints, which read but never write', () => {
    // Building a `CleanupPlan` or a `ResolutionPlan` reads the filesystem and writes
    // nothing — which is exactly why previewing is safe in a read-only harness, and
    // why only the `execute*` half is privileged.
    const config = bridgeSource();
    expect(config).toContain('/api/cleanup-plan');
    expect(config).toContain('/api/resolution-plan');
    expect(config).not.toContain('executeCleanupPlan');
    expect(config).not.toContain('executeResolutionPlan');
  });
});
