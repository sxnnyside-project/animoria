import { describe, expect, it } from 'vitest';
import { validateInboundMessage } from '../../src/panels/preview-panel-messages.js';

/**
 * `validateInboundMessage` is the single runtime boundary every webview
 * message crosses before `AnimoriaPreviewPanel` acts on it. These tests
 * cover the contract itself, independent of the panel — no webview, no
 * `vscode` mock needed, since the function takes a plain `unknown` and
 * returns a plain result.
 */
describe('validateInboundMessage', () => {
  it('accepts every no-payload message type', () => {
    for (const type of [
      'ready',
      'copy-path',
      'copy-stem',
      'reveal-in-explorer',
      'get-integrations',
    ]) {
      const result = validateInboundMessage({ type });
      expect(result).toEqual({ ok: true, message: { type } });
    }
  });

  it('accepts a valid save-preferences message, with and without customHex', () => {
    const withHex = validateInboundMessage({
      type: 'save-preferences',
      payload: { speed: 1.5, bg: 'dark', customHex: '#000000' },
    });
    expect(withHex).toEqual({
      ok: true,
      message: {
        type: 'save-preferences',
        payload: { speed: 1.5, bg: 'dark', customHex: '#000000' },
      },
    });

    const withoutHex = validateInboundMessage({
      type: 'save-preferences',
      payload: { speed: 1, bg: 'light' },
    });
    expect(withoutHex.ok).toBe(true);
  });

  it('accepts a valid copy-integration message', () => {
    const result = validateInboundMessage({
      type: 'copy-integration',
      payload: { text: 'import x', label: 'React' },
    });
    expect(result).toEqual({
      ok: true,
      message: { type: 'copy-integration', payload: { text: 'import x', label: 'React' } },
    });
  });

  it('accepts a valid load-dotlottie-animation message', () => {
    const result = validateInboundMessage({
      type: 'load-dotlottie-animation',
      payload: { animationId: 'anim-1' },
    });
    expect(result).toEqual({
      ok: true,
      message: { type: 'load-dotlottie-animation', payload: { animationId: 'anim-1' } },
    });
  });

  it('accepts a valid open-usage-file message', () => {
    const result = validateInboundMessage({
      type: 'open-usage-file',
      payload: { file: '/workspace/src/App.tsx', line: 12 },
    });
    expect(result).toEqual({
      ok: true,
      message: { type: 'open-usage-file', payload: { file: '/workspace/src/App.tsx', line: 12 } },
    });
  });

  it('rejects a non-object message', () => {
    expect(validateInboundMessage('just a string').ok).toBe(false);
    expect(validateInboundMessage(42).ok).toBe(false);
    expect(validateInboundMessage(null).ok).toBe(false);
    expect(validateInboundMessage(undefined).ok).toBe(false);
  });

  it('rejects a message with a missing or non-string type', () => {
    expect(validateInboundMessage({}).ok).toBe(false);
    expect(validateInboundMessage({ type: 42 }).ok).toBe(false);
    expect(validateInboundMessage({ type: null }).ok).toBe(false);
  });

  it('rejects an unrecognized message type', () => {
    const result = validateInboundMessage({ type: 'delete-workspace' });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('unrecognized message type');
  });

  it('rejects save-preferences with a missing required field', () => {
    const missingSpeed = validateInboundMessage({
      type: 'save-preferences',
      payload: { bg: 'dark' },
    });
    expect(missingSpeed.ok).toBe(false);

    const missingBg = validateInboundMessage({
      type: 'save-preferences',
      payload: { speed: 1 },
    });
    expect(missingBg.ok).toBe(false);
  });

  it('rejects save-preferences with a field of the wrong type', () => {
    const result = validateInboundMessage({
      type: 'save-preferences',
      payload: { speed: '1', bg: 'dark' }, // speed must be a number, not a string
    });
    expect(result.ok).toBe(false);
  });

  it('rejects save-preferences when customHex is present but not a string', () => {
    const result = validateInboundMessage({
      type: 'save-preferences',
      payload: { speed: 1, bg: 'dark', customHex: 12345 },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects open-usage-file with a non-finite line number', () => {
    expect(
      validateInboundMessage({ type: 'open-usage-file', payload: { file: 'x', line: Number.NaN } })
        .ok
    ).toBe(false);
    expect(
      validateInboundMessage({
        type: 'open-usage-file',
        payload: { file: 'x', line: Number.POSITIVE_INFINITY },
      }).ok
    ).toBe(false);
  });

  it('rejects a payload-carrying message with no payload at all', () => {
    expect(validateInboundMessage({ type: 'copy-integration' }).ok).toBe(false);
    expect(validateInboundMessage({ type: 'load-dotlottie-animation', payload: null }).ok).toBe(
      false
    );
  });

  it('rejects a payload that is a primitive rather than an object', () => {
    const result = validateInboundMessage({ type: 'copy-integration', payload: 'not an object' });
    expect(result.ok).toBe(false);
  });

  it('accepts a message with unexpected additional properties, and the required fields still validate correctly', () => {
    const result = validateInboundMessage({
      type: 'save-preferences',
      payload: { speed: 1, bg: 'dark', customHex: '#fff', extra: 'ignored-by-every-consumer' },
      unrelatedTopLevelField: 'should not matter',
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.message.type === 'save-preferences') {
      // Handlers destructure only the contract's named fields (`{ speed, bg, customHex }`),
      // so an unexpected extra property can never itself drive behavior —
      // it simply has nothing that reads it.
      expect(result.message.payload.speed).toBe(1);
      expect(result.message.payload.bg).toBe('dark');
      expect(result.message.payload.customHex).toBe('#fff');
    }
  });
});
