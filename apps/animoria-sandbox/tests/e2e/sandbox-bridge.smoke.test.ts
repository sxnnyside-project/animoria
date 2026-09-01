import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * The one test in this suite that boots the real thing. `vite.config.ts`
 * disables the daemon bridge whenever `process.env.VITEST` is set, so every
 * other test runs inside Vitest's own server without it. This spawns the
 * actual `vite` CLI with `VITEST` stripped, so the bridge runs for real
 * against the real daemon — the only test that can catch the response shape
 * drifting from what `SandboxHost` expects.
 */
describe('sandbox daemon bridge — real Vite server, real daemon, real fixtures', () => {
  const appRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
  const port = 5391;
  const baseUrl = `http://localhost:${port}`;
  let child: ChildProcessWithoutNullStreams;

  beforeAll(async () => {
    const env = { ...process.env };
    delete env.VITEST;

    child = spawn(
      'node',
      [resolve(appRoot, 'node_modules/vite/bin/vite.js'), '--port', String(port), '--strictPort'],
      { cwd: appRoot, env, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    await new Promise<void>((res, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`Vite dev server did not become ready in time.\n${stderr}`)),
        30_000
      );

      const tryConnect = async () => {
        try {
          const response = await fetch(`${baseUrl}/api/status`);
          if (response.ok) {
            clearTimeout(timeout);
            res();
            return;
          }
        } catch {
          // Server not accepting connections yet — keep polling.
        }
        setTimeout(tryConnect, 250);
      };

      child.on('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error(`Vite dev server exited early (code=${code}).\n${stderr}`));
      });

      void tryConnect();
    });
  }, 35_000);

  afterAll(() => {
    child?.kill();
  });

  it('reports the bridge as connected and read-only', async () => {
    const response = await fetch(`${baseUrl}/api/status`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ connected: true, readOnly: true });
  });

  it('refuses a mutating verb on every /api/* route, not just the ones with handlers', async () => {
    const response = await fetch(`${baseUrl}/api/analysis`, { method: 'POST' });
    expect(response.status).toBe(405);
  });

  it('serves /api/analysis from the real daemon, in the shape SandboxHost consumes', async () => {
    const response = await fetch(`${baseUrl}/api/analysis`);
    expect(response.status).toBe(200);

    const body = await response.json();

    // The exact shape `sandbox-host.ts#_runAnalysis` reads.
    expect(Array.isArray(body.roots)).toBe(true);
    expect(body.roots.length).toBeGreaterThan(0);
    expect(Array.isArray(body.assets)).toBe(true);
    expect(body.assets.length).toBeGreaterThan(0);

    const [root] = body.roots;
    expect(root).toHaveProperty('root_id');
    expect(root).toHaveProperty('health_score');
    expect(root.health_score).toHaveProperty('score');

    expect(Array.isArray(body.duplicateGroups)).toBe(true);
    expect(typeof body.referenceCounts).toBe('object');
  });
});
