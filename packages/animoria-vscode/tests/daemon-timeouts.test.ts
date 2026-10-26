import { describe, expect, it } from 'vitest';
import { requestTimeoutMs } from '../src/daemon/daemon-client.js';

describe('daemon request timeouts', () => {
  it('gives analysis methods far longer than ordinary requests', () => {
    for (const method of ['scan', 'check', 'analyze']) {
      expect(requestTimeoutMs(method)).toBe(300_000);
    }
    for (const method of ['ping', 'hello', 'trash_asset', 'getLottieDocument']) {
      expect(requestTimeoutMs(method)).toBe(30_000);
    }
  });
});
