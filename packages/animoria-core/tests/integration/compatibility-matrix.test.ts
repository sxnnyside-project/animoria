import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MIN_SUPPORTED_PROTOCOL_VERSION,
  PROTOCOL_VERSION,
  checkProtocolCompatibility,
} from '../../src/daemon/protocol.js';

/**
 * The one compatibility matrix: client, Core, daemon, protocol.
 *
 * ## The failure this prevents
 * A new plugin beside an old bundled daemon — or the reverse — is a routine outcome
 * of a partial install, a cached artifact, or a user updating one half. Before the
 * protocol carried a version, that combination ran with undefined behaviour: both
 * sides parsed the other's payloads under their own assumptions, and the first
 * visible symptom was a governance answer that was quietly wrong.
 *
 * Every assertion here is a way that could come back.
 */

const REPO = resolve(process.cwd(), '../..');
const read = (relativePath: string) => readFileSync(resolve(REPO, relativePath), 'utf-8');
const json = (relativePath: string) => JSON.parse(read(relativePath));

describe('compatibility matrix — protocol version', () => {
  it('is a single integer constant, declared once in TypeScript', () => {
    expect(Number.isInteger(PROTOCOL_VERSION)).toBe(true);
    expect(PROTOCOL_VERSION).toBeGreaterThanOrEqual(1);
  });

  it('has a support window that cannot silently exclude itself', () => {
    expect(MIN_SUPPORTED_PROTOCOL_VERSION).toBeLessThanOrEqual(PROTOCOL_VERSION);
    expect(checkProtocolCompatibility(PROTOCOL_VERSION).compatible).toBe(true);
    expect(checkProtocolCompatibility(MIN_SUPPORTED_PROTOCOL_VERSION).compatible).toBe(true);
  });

  it('is mirrored exactly by the JetBrains client', () => {
    // Kotlin cannot import the TypeScript constant, so it holds a copy. A copy that
    // drifts produces a mismatch banner at every startup — visible, but only after
    // shipping.
    const kotlin = read(
      'packages/animoria-jetbrains/src/main/kotlin/com/sxnnyside/animoria/backend/CoreProcessManager.kt'
    );
    const declared = /PROTOCOL_VERSION:\s*Int\s*=\s*(\d+)/.exec(kotlin)?.[1];

    expect(declared, 'CoreProcessManager must declare PROTOCOL_VERSION').toBeDefined();
    expect(Number(declared)).toBe(PROTOCOL_VERSION);
  });

  it('rejects both directions of mismatch with distinguishable reasons', () => {
    // "Update your plugin" and "reinstall so the engine updates" are opposite fixes.
    // A single "mismatch" message sends half the users to the wrong one.
    expect(checkProtocolCompatibility(PROTOCOL_VERSION + 1).reason).toBe('client-too-new');
    expect(checkProtocolCompatibility(MIN_SUPPORTED_PROTOCOL_VERSION - 1).reason).toBe(
      'client-too-old'
    );
  });

  it('never treats a missing or malformed version as compatible', () => {
    // The old envelope had no version field at all. Coercing `undefined` to a
    // default would silently readmit exactly the daemons this check excludes.
    for (const value of [undefined, null, '1', 1.5, Number.NaN, {}, []]) {
      expect(checkProtocolCompatibility(value).compatible, String(value)).toBe(false);
    }
  });
});

describe('compatibility matrix — artifact versions', () => {
  it('ships one version across Core and the VS Code extension', () => {
    const core = json('packages/animoria-core/package.json').version;
    expect(json('packages/animoria-vscode/package.json').version).toBe(core);
  });

  it('gives the shared UI the same version as the packages that bundle it', () => {
    // The bundle is copied into both hosts at build time. Two versions of it in one
    // release means a VS Code panel and a JetBrains tool window rendering different
    // components while claiming the same release.
    const core = json('packages/animoria-core/package.json').version;
    expect(json('packages/animoria-ui/package.json').version).toBe(core);
  });

  it('declares the daemon subcommand the JetBrains client actually spawns', () => {
    // The client passes `daemon` explicitly and the entry point must route it.
    // A drift here means the plugin spawns a process that prints usage and exits,
    // which the host reports as "the engine did not start".
    const entryPoint = read('packages/animoria-core/src/cli/entry-point.ts');
    expect(entryPoint).toContain("first === 'daemon'");
    expect(entryPoint).toContain('workspacePaths');

    const kotlin = read(
      'packages/animoria-jetbrains/src/main/kotlin/com/sxnnyside/animoria/backend/CoreProcessManager.kt'
    );
    expect(kotlin).toContain('"daemon"');
  });
});

describe('compatibility matrix — no silent fallback', () => {
  it('has no legacy-protocol branch in the daemon', () => {
    // "Absence means legacy" was the original plan. It was dropped: a daemon that
    // accepts an unversioned request has no way to know which contract the sender
    // believed it was using, so the fallback is a guess dressed as compatibility.
    const server = read('packages/animoria-core/src/daemon/server.ts');
    const withoutComments = server.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    expect(withoutComments).not.toMatch(/legacy/i);
    expect(withoutComments).not.toMatch(/protocol\s*(?:===|==)\s*undefined/);
  });

  it('routes every inbound line through one validator', () => {
    const server = read('packages/animoria-core/src/daemon/server.ts');
    expect(server).toContain('validateRequest');
  });
});
