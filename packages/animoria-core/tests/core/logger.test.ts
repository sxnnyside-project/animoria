import { afterEach, describe, expect, it } from 'vitest';
import { getLogger, logDebug, logError, logWarn, setLogger } from '../../src/logging/logger.js';
import type { LogContext, LogLevel, Logger } from '../../src/logging/logger.js';

class RecordingLogger implements Logger {
  readonly entries: { level: LogLevel; context: LogContext }[] = [];
  log(level: LogLevel, context: LogContext): void {
    this.entries.push({ level, context });
  }
}

describe('logging/logger', () => {
  const originalLogger = getLogger();
  afterEach(() => {
    setLogger(originalLogger);
  });

  it('discards entries by default without throwing', () => {
    expect(() => logDebug('asset-parse', 'Test', 'no logger installed yet')).not.toThrow();
  });

  it('routes logDebug/logWarn/logError through the installed logger at the matching level', () => {
    const recorder = new RecordingLogger();
    setLogger(recorder);

    logDebug('asset-parse', 'Test', 'debug message');
    logWarn('cli-watch', 'Test', 'warn message');
    logError('thumbnail-generation', 'Test', 'error message');

    expect(recorder.entries.map((e) => e.level)).toEqual(['debug', 'warn', 'error']);
  });

  it('includes the operation, component, and message on every entry', () => {
    const recorder = new RecordingLogger();
    setLogger(recorder);

    logDebug('usage-scan', 'UsageScanner', 'could not read file');

    expect(recorder.entries[0]?.context).toMatchObject({
      operation: 'usage-scan',
      component: 'UsageScanner',
      message: 'could not read file',
    });
  });

  it('carries optional structured fields through untouched', () => {
    const recorder = new RecordingLogger();
    setLogger(recorder);
    const originalError = new Error('ENOENT');

    logDebug('file-scan', 'FileScanner', 'skipped candidate', {
      assetPath: '/workspace/asset.json',
      reason: 'stat failed',
      error: originalError,
      recovery: 'candidate skipped',
    });

    expect(recorder.entries[0]?.context).toMatchObject({
      assetPath: '/workspace/asset.json',
      reason: 'stat failed',
      error: originalError,
      recovery: 'candidate skipped',
    });
  });

  it('lets setLogger swap the active logger and getLogger reflect the change', () => {
    const first = new RecordingLogger();
    const second = new RecordingLogger();

    setLogger(first);
    logDebug('config-load', 'Test', 'goes to first');
    setLogger(second);
    logDebug('config-load', 'Test', 'goes to second');

    expect(getLogger()).toBe(second);
    expect(first.entries).toHaveLength(1);
    expect(second.entries).toHaveLength(1);
  });
});
