import { describe, expect, it } from 'vitest';
import {
  type AnalysisLifecycleState,
  deriveAnalysisLifecycle,
  isEmptyWorkspace,
} from '../../src/analysis/analysis-lifecycle.js';
import type { WorkspaceAnalysis } from '../../src/analysis/workspace-analysis.js';

/**
 * The six states, and the distinctions `loading: boolean` erased.
 *
 * Each test here corresponds to a claim the product used to make wrongly, not to a
 * branch of the function. The function is small; the reason it exists is not.
 */

function analysis(overrides: Partial<WorkspaceAnalysis> = {}): WorkspaceAnalysis {
  return {
    workspacePath: '/w',
    generatedAt: new Date().toISOString(),
    generation: 1,
    durationMs: 1,
    readiness: {
      assetsIndexed: true,
      referencesResolved: true,
      duplicatesResolved: true,
      complete: true,
    },
    assets: [],
    coverage: {
      status: 'complete',
      scannedExtensions: ['.ts'],
      unscannedExtensions: [],
      filesScanned: 10,
      referencesDetected: 3,
      excludedPatterns: [],
      scopePath: '/w',
    },
    referenceCounts: new Map(),
    referenceIndex: null,
    diagnostics: [],
    evaluatedRuleIds: [],
    skippedRules: [],
    configErrors: [],
    duplicateGroups: [],
    health: { status: 'unavailable', reason: 'no-assets', message: 'No assets.' },
    freshness: 'current',
    failure: null,
    ...overrides,
  } as WorkspaceAnalysis;
}

function stateOf(overrides: Partial<WorkspaceAnalysis>): AnalysisLifecycleState {
  return deriveAnalysisLifecycle(analysis(overrides)).state;
}

describe('the six lifecycle states', () => {
  it('distinguishes "not indexed yet" from "indexed and empty"', () => {
    // The distinction the whole contract exists for. Both used to render as an empty
    // gallery, which reads as "you have no animated assets" — a claim only one of
    // them had earned.
    expect(
      stateOf({
        readiness: {
          assetsIndexed: false,
          referencesResolved: false,
          duplicatesResolved: false,
          complete: false,
        },
      })
    ).toBe('initializing');

    expect(stateOf({ assets: [] })).toBe('ready');
    expect(isEmptyWorkspace(analysis({ assets: [] }))).toBe(true);
  });

  it('distinguishes a failed scan from an empty workspace', () => {
    // A scan that threw used to leave the index looking exactly like a workspace with
    // no assets. `failure` is what makes "we could not look" sayable.
    const failed = analysis({
      failure: { reason: 'workspace-missing', message: 'Workspace not found: /w' },
    });

    expect(deriveAnalysisLifecycle(failed).state).toBe('failed');
    expect(deriveAnalysisLifecycle(failed).summary).toContain('/w');
    expect(isEmptyWorkspace(failed)).toBe(false);
  });

  it('reports "analyzing" while reference evidence is still being established', () => {
    expect(
      stateOf({
        readiness: {
          assetsIndexed: true,
          referencesResolved: false,
          duplicatesResolved: false,
          complete: false,
        },
      })
    ).toBe('analyzing');
  });

  it('reports "stale" when the workspace moved on', () => {
    expect(stateOf({ freshness: 'stale' })).toBe('stale');
  });

  it('reports "incomplete" when coverage cannot support an absence claim', () => {
    // `partial` and `none` both qualify a finding; neither is `ready`. Rendering them
    // as `ready` is how a `coverage: 'none'` absence finding came to look exactly as
    // trustworthy as a complete one.
    expect(
      stateOf({
        coverage: {
          status: 'none',
          scannedExtensions: [],
          unscannedExtensions: ['.ts'],
          filesScanned: 0,
          referencesDetected: 0,
          excludedPatterns: [],
          scopePath: '/w',
        },
      })
    ).toBe('incomplete');
  });

  it('reports "incomplete" when a configured rule declined to run', () => {
    expect(
      stateOf({
        skippedRules: [
          { ruleId: 'no-unreferenced-assets', reason: 'no-reference-evidence', message: 'skipped' },
        ] as WorkspaceAnalysis['skippedRules'],
      })
    ).toBe('incomplete');
  });
});

describe('destructive-action gating', () => {
  it('forbids destructive actions in every state but ready and incomplete', () => {
    const forbidden: Partial<WorkspaceAnalysis>[] = [
      { freshness: 'stale' },
      { failure: { reason: 'scan-failed', message: 'boom' } },
      {
        readiness: {
          assetsIndexed: false,
          referencesResolved: false,
          duplicatesResolved: false,
          complete: false,
        },
      },
    ];

    for (const overrides of forbidden) {
      expect(deriveAnalysisLifecycle(analysis(overrides)).allowsDestructiveActions).toBe(false);
    }
  });

  it('allows destructive actions under a coverage caveat', () => {
    // `incomplete` warns, it does not forbid. Refusing outright would make a
    // partially-scannable workspace unusable, and the caveat travels with the finding.
    const incomplete = analysis({
      coverage: {
        status: 'partial',
        scannedExtensions: ['.ts'],
        unscannedExtensions: ['.json'],
        filesScanned: 5,
        referencesDetected: 1,
        excludedPatterns: [],
        scopePath: '/w',
      },
    });

    const lifecycle = deriveAnalysisLifecycle(incomplete);
    expect(lifecycle.state).toBe('incomplete');
    expect(lifecycle.allowsDestructiveActions).toBe(true);
  });

  it('gives every state a summary a developer can act on', () => {
    // A spinner with no explanation is a state the user cannot interpret; so is a
    // disabled button with no reason.
    const cases: Partial<WorkspaceAnalysis>[] = [
      {},
      { freshness: 'stale' },
      { failure: { reason: 'scan-failed', message: 'boom' } },
      {
        readiness: {
          assetsIndexed: false,
          referencesResolved: false,
          duplicatesResolved: false,
          complete: false,
        },
      },
    ];

    for (const overrides of cases) {
      expect(deriveAnalysisLifecycle(analysis(overrides)).summary.length).toBeGreaterThan(0);
    }
  });
});
