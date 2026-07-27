import { beforeEach, describe, expect, it } from 'vitest';
import { OutputChannelLogger } from '../../src/logging/OutputChannelLogger.js';
import { resetTestWorkspace, vscodeMock } from '../harness.js';

/**
 * Confirms diagnostic entries reach the `OutputChannel` formatted so the
 * operation identifier leads every line — the property TASK-H1.4's
 * "operation-oriented, not event-oriented" requirement depends on — and
 * that optional structured fields are included only when present.
 */
describe('OutputChannelLogger', () => {
  let channel: ReturnType<(typeof vscodeMock.window)['createOutputChannel']>;
  let logger: OutputChannelLogger;

  beforeEach(() => {
    resetTestWorkspace();
    channel = vscodeMock.window.createOutputChannel('Animoria');
    logger = new OutputChannelLogger(channel);
  });

  it('writes exactly one line per entry to the output channel', () => {
    logger.log('debug', { operation: 'asset-parse', component: 'Test', message: 'hello' });

    expect(channel.lines).toHaveLength(1);
  });

  it('leads each line with the level and the operation identifier, ahead of the component', () => {
    logger.log('warn', {
      operation: 'thumbnail-generation',
      component: 'ThumbnailEngine',
      message: 'fallback used',
    });

    const line = channel.lines[0]!;
    const levelIndex = line.indexOf('WARN');
    const operationIndex = line.indexOf('[thumbnail-generation]');
    const componentIndex = line.indexOf('ThumbnailEngine');

    expect(levelIndex).toBeGreaterThanOrEqual(0);
    expect(operationIndex).toBeGreaterThan(levelIndex);
    expect(componentIndex).toBeGreaterThan(operationIndex);
  });

  it('includes assetPath, reason, recovery, and a readable error message when present', () => {
    logger.log('debug', {
      operation: 'file-scan',
      component: 'FileScanner',
      message: 'skipped candidate',
      assetPath: '/workspace/asset.json',
      reason: 'stat failed',
      error: new Error('ENOENT'),
      recovery: 'candidate skipped',
    });

    const line = channel.lines[0]!;
    expect(line).toContain('path=/workspace/asset.json');
    expect(line).toContain('reason=stat failed');
    expect(line).toContain('recovery=candidate skipped');
    expect(line).toContain('error=ENOENT');
  });

  it('omits optional field segments that were not provided', () => {
    logger.log('debug', {
      operation: 'usage-scan',
      component: 'UsageScanner',
      message: 'plain entry',
    });

    const line = channel.lines[0]!;
    expect(line).not.toContain('path=');
    expect(line).not.toContain('reason=');
    expect(line).not.toContain('recovery=');
    expect(line).not.toContain('error=');
  });

  it('stringifies a non-Error thrown value rather than losing it', () => {
    logger.log('error', {
      operation: 'config-load',
      component: 'ConfigLoader',
      message: 'unexpected throw',
      error: 'plain string failure',
    });

    expect(channel.lines[0]).toContain('error=plain string failure');
  });
});
