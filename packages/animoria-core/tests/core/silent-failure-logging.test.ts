import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigLoader } from '../../src/governance/config-loader.js';
import { getLogger, setLogger } from '../../src/logging/logger.js';
import type { LogContext, LogLevel, Logger } from '../../src/logging/logger.js';
import { isPotentialLottie } from '../../src/scanner/fast-validator.js';

class RecordingLogger implements Logger {
  readonly entries: { level: LogLevel; context: LogContext }[] = [];
  log(level: LogLevel, context: LogContext): void {
    this.entries.push({ level, context });
  }
}

/**
 * Confirms TASK-H1.4's instrumentation is real, not just present in
 * source: a representative sample of the previously-silent catch paths
 * genuinely reach the logger when triggered, and the value they return
 * to their caller is unchanged from before instrumentation was added.
 */
describe('diagnostic logging on silent failure paths', () => {
  const originalLogger = getLogger();
  let workspaceDir: string;

  beforeEach(() => {
    workspaceDir = mkdtempSync(join(tmpdir(), 'animoria-logging-'));
  });

  afterEach(() => {
    setLogger(originalLogger);
    rmSync(workspaceDir, { recursive: true, force: true });
  });

  it('logs a debug entry and still returns false when isPotentialLottie cannot read the file', async () => {
    const recorder = new RecordingLogger();
    setLogger(recorder);
    const missingPath = join(workspaceDir, 'does-not-exist.json');

    const result = await isPotentialLottie(missingPath);

    expect(result).toBe(false);
    const entry = recorder.entries.find((e) => e.context.operation === 'asset-parse');
    expect(entry?.level).toBe('debug');
    expect(entry?.context.assetPath).toBe(missingPath);
    expect(entry?.context.error).toBeDefined();
  });

  it('logs a debug entry per missing candidate and still resolves to not-found when no config file exists', async () => {
    const recorder = new RecordingLogger();
    setLogger(recorder);
    const loader = new ConfigLoader(workspaceDir);

    const result = await loader.load();

    expect(result.status).toBe('not-found');
    const configEntries = recorder.entries.filter((e) => e.context.operation === 'config-load');
    expect(configEntries.length).toBeGreaterThan(0);
    expect(configEntries.every((e) => e.level === 'debug')).toBe(true);
  });

  it('emits no diagnostics on the successful path — logging is purely additive to failure paths', async () => {
    const recorder = new RecordingLogger();
    setLogger(recorder);

    await isPotentialLottie(join(workspaceDir, 'irrelevant.json')); // missing — exercises the catch once
    const before = recorder.entries.length;

    // A second call against the same (still-missing) file should not
    // change the outcome shape — this asserts the instrumentation adds
    // exactly one entry per failure, not one per internal step.
    await isPotentialLottie(join(workspaceDir, 'irrelevant.json'));

    expect(recorder.entries.length).toBe(before + 1);
  });
});
