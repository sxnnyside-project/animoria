import { describe, expect, it } from 'vitest';
import type { HostBridge, HostInbound, HostOutbound } from '../../src/bridge/types.js';
import '../../src/components/workspace/animoria-workspace.js';
import { AnimoriaWorkspace } from '../../src/components/workspace/animoria-workspace.js';

function createMockBridge() {
  const sent: HostOutbound[] = [];
  const listeners: ((msg: HostInbound) => void)[] = [];

  const bridge: HostBridge = {
    send(message: HostOutbound) {
      sent.push(message);
    },
    subscribe(listener: (message: HostInbound) => void) {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },
  };

  return { bridge, sent, listeners };
}

describe('AnimoriaWorkspace — shell coordinator & bridge integration', () => {
  it('instantiates custom element and initializes lifecycle', () => {
    const workspace = new AnimoriaWorkspace();
    expect(workspace).toBeDefined();
    expect(workspace.surface).toBe('all');
  });

  it('binds bridge instance and sets up surface configuration', () => {
    const { bridge } = createMockBridge();
    const workspace = new AnimoriaWorkspace();
    workspace.bridge = bridge;
    workspace.surface = 'findings';
    expect(workspace.bridge).toBe(bridge);
    expect(workspace.surface).toBe('findings');
  });
});
