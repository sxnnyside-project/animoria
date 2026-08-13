import type { WorkspaceAnalysis } from '../../src/analysis/workspace-analysis.js';
import type { RuleDiagnostic } from '../../src/governance/rules-engine.js';
import type { AnimoriaAsset } from '../../src/types/asset.js';

/**
 * Builders for the canonical {@link WorkspaceAnalysis} and its parts.
 *
 * Tests previously assembled a `WorkspaceIndexSnapshot` by hand, so each one
 * encoded its own idea of what a governance result contained. When the shape
 * changed, every test had to be rewritten independently — and any test that
 * forgot a field silently exercised a state the real pipeline never produces.
 * There is one aggregate now, so there is one builder for it.
 */

export function testAsset(overrides: Partial<AnimoriaAsset> = {}): AnimoriaAsset {
  return {
    path: '/w/a.gif',
    name: 'a.gif',
    stem: 'a',
    format: 'gif',
    sizeBytes: 100,
    mtime: 0,
    status: 'parsed',
    ...overrides,
  };
}

export function testDiagnostic(overrides: Partial<RuleDiagnostic> = {}): RuleDiagnostic {
  const subject = overrides.asset ?? testAsset();
  return {
    ruleId: 'no-gif',
    severity: 'error',
    message: 'msg',
    evidence: { kind: 'file-metadata', summary: `${subject.name} is a GIF` },
    confidence: 'certain',
    remediation: { summary: 'Convert it to Lottie.' },
    helpUri: 'https://example.invalid/no-gif',
    ...overrides,
    asset: subject,
  };
}

export function testAnalysis(overrides: Partial<WorkspaceAnalysis> = {}): WorkspaceAnalysis {
  return {
    workspacePath: '/w',
    generatedAt: '2026-01-01T00:00:00.000Z',
    generation: 1,
    durationMs: 1,
    readiness: {
      assetsIndexed: true,
      referencesResolved: true,
      duplicatesResolved: true,
      complete: true,
    },
    assets: [testAsset()],
    coverage: null,
    referenceCounts: new Map(),
    referenceIndex: null,
    diagnostics: [],
    evaluatedRuleIds: ['no-gif'],
    skippedRules: [],
    configErrors: [],
    duplicateGroups: [],
    health: { status: 'unavailable', reason: 'no-rules-configured', message: 'No rules ran.' },
    ...overrides,
  };
}
