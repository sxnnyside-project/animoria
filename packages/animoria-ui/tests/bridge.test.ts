import { describe, expect, it } from 'vitest';
import type { HostCapabilities, HostOutbound } from '../src/bridge/types.js';
import {
  CAPABILITY_BY_OUTBOUND_TYPE,
  INBOUND_TYPES,
  NO_CAPABILITIES,
  OUTBOUND_TYPES,
  isPermitted,
} from '../src/bridge/types.js';
import { validateInbound, validateOutbound } from '../src/bridge/validate.js';

const FULL: HostCapabilities = {
  canMutate: true,
  canRestore: true,
  canRevealInFileManager: true,
  canOpenReference: true,
  canGenerateSnippet: true,
  canCopyToClipboard: true,
  mutationUnavailableReason: null,
};

describe('host bridge — vocabulary', () => {
  it('validates every declared outbound type', () => {
    // A type in the union with no validation branch would be silently rejected at
    // runtime by a host that validates — the drift this contract exists to prevent,
    // reintroduced one level down.
    const sample: Record<string, Record<string, unknown>> = {
      ready: {},
      'run-analysis': {},
      'open-asset': { assetPath: '/w/a.json', rootId: 'r1' },
      'reveal-asset': { assetPath: '/w/a.json', rootId: 'r1' },
      'open-reference': { file: '/w/a.ts', line: 4, rootId: 'r1' },
      'request-thumbnail': { assetPath: '/w/a.json' },
      'request-animation-data': { assetPath: '/w/a.json' },
      'copy-to-clipboard': { text: 'x', label: 'Path' },
      'generate-snippet': { assetPath: '/w/a.json' },
      'save-preferences': {
        preferences: {
          playbackSpeed: 1,
          previewBackground: 'transparent',
          locale: 'en',
          assetViewMode: 'flat',
        },
      },
      'request-usage-references': { assetPath: '/w/a.json' },
      'dismiss-cleanup-candidate': { assetPath: '/w/a.json', dismissed: true },
      'request-cleanup-proposal': {},
      'request-cleanup-plan': { assetPaths: ['/w/a.json'] },
      'apply-cleanup-plan': { planId: 'p1', allowPartial: false },
      'request-resolution-plan': { groupId: 'g1', keepPath: '/w/a.json' },
      'apply-resolution-plan': { planId: 'p1', allowPartial: true },
      'request-trash-sessions': {},
      'restore-session': { sessionId: 's1' },
    };

    for (const type of OUTBOUND_TYPES) {
      const result = validateOutbound({ type, ...sample[type] });
      expect(result.ok, `${type}: ${result.ok ? '' : result.reason}`).toBe(true);
    }
  });

  it('validates every declared inbound type', () => {
    const sample: Record<string, Record<string, unknown>> = {
      capabilities: { capabilities: {} },
      preferences: { preferences: {} },
      'usage-references': { assetPath: '/w/a.json', references: [], complete: true },
      focus: { tab: 'duplicates', assetPath: null, groupId: 'g1', rootId: 'r1' },
      analysis: { analysis: {} },
      'analysis-progress': { readiness: {}, message: 'Scanning' },
      thumbnail: { assetPath: '/w/a.json', source: null },
      'animation-data': { assetPath: '/w/a.json', preview: null, error: null },
      'cleanup-proposal': { roots: [] },
      'cleanup-plan': { plans: [] },
      'cleanup-result': { result: {} },
      'resolution-plan': { planId: 'p1', plan: {}, rootId: 'r1', rootName: 'root' },
      'resolution-result': { status: 'applied' },
      'trash-sessions': { sessions: [] },
      'restore-result': { result: {} },
      snippets: { assetPath: '/w/a.json', snippets: [] },
      error: { message: 'boom', recoverable: true },
      'roots-changed': { roots: [] },
    };

    for (const type of INBOUND_TYPES) {
      const result = validateInbound({ type, ...sample[type] });
      expect(result.ok, `${type}: ${result.ok ? '' : result.reason}`).toBe(true);
    }
  });

  it('rejects an unknown type rather than passing it through', () => {
    const result = validateOutbound({ type: 'delete-everything' });
    expect(result.ok).toBe(false);
  });

  it('rejects a known type with a malformed payload', () => {
    // The failure mode this catches: a renamed field on one side only, arriving as
    // `undefined` in business logic with no diagnostic trail.
    expect(validateOutbound({ type: 'open-reference', file: '/w/a.ts' }).ok).toBe(false);
    expect(validateOutbound({ type: 'apply-cleanup-plan', planId: 'p1' }).ok).toBe(false);
    expect(validateOutbound({ type: 'request-cleanup-plan', assetPaths: 'nope' }).ok).toBe(false);
  });

  it('rejects a non-object', () => {
    expect(validateInbound(null).ok).toBe(false);
    expect(validateInbound('analysis').ok).toBe(false);
    expect(validateInbound([]).ok).toBe(false);
  });
});

describe('host bridge — capabilities', () => {
  it('permits everything on a fully capable host', () => {
    for (const type of OUTBOUND_TYPES) {
      expect(isPermitted({ type } as HostOutbound, FULL), type).toBe(true);
    }
  });

  it('refuses every destructive message on a read-only host', () => {
    // This is the sandbox's guarantee, expressed as a property rather than as a
    // separate build: the same components, the same bridge, mutation off.
    const readOnly: HostCapabilities = { ...FULL, canMutate: false, canRestore: false };

    expect(
      isPermitted({ type: 'apply-cleanup-plan', planId: 'p', allowPartial: false }, readOnly)
    ).toBe(false);
    expect(
      isPermitted({ type: 'apply-resolution-plan', planId: 'p', allowPartial: false }, readOnly)
    ).toBe(false);
    expect(isPermitted({ type: 'restore-session', sessionId: 's' }, readOnly)).toBe(false);

    // Read-only must not mean inert: analysis and navigation still work, which is
    // what lets the harness exercise the real screens.
    expect(isPermitted({ type: 'run-analysis' }, readOnly)).toBe(true);
    expect(
      isPermitted({ type: 'open-asset', assetPath: '/w/a.json', rootId: 'r1' }, readOnly)
    ).toBe(true);
  });

  it('defaults to no capabilities', () => {
    for (const type of Object.keys(CAPABILITY_BY_OUTBOUND_TYPE) as HostOutbound['type'][]) {
      expect(isPermitted({ type } as HostOutbound, NO_CAPABILITIES), type).toBe(false);
    }
  });

  it('gates every mutating message on a capability', () => {
    // A new destructive message that nobody added to the map would be permitted on
    // every host including the sandbox. This asserts the map covers them.
    const mustBeGated: HostOutbound['type'][] = [
      'apply-cleanup-plan',
      'apply-resolution-plan',
      'restore-session',
    ];
    for (const type of mustBeGated) {
      expect(CAPABILITY_BY_OUTBOUND_TYPE[type], `${type} is ungated`).toBeDefined();
    }
  });
});
