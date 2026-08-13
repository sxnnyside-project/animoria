import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  diagnosticCountBySeverity,
  diagnosticsForAsset,
  duplicateGroupForAsset,
  totalAssetCount,
} from '../../src/analysis/workspace-analysis';
import type { WorkspaceAnalysis } from '../../src/analysis/workspace-analysis';
import { WorkspaceIndexer } from '../../src/indexer/workspace-indexer';
import { testAnalysis, testAsset, testDiagnostic } from '../support/analysis.js';

/**
 * The canonical aggregate.
 *
 * ## What "canonical" has to mean to be worth anything
 * Before this type existed, the same workspace produced a `WorkspaceIndexSnapshot`
 * for the extension, a `GovernanceReport` from `GovernanceAnalyzer`, and a
 * flattened `GovernanceCheckReport` for the CLI. Each was assembled separately, so
 * the three could — and did — disagree about how many assets existed, which rules
 * had run, and whether the workspace was healthy.
 *
 * These tests assert the two properties that make one aggregate meaningful:
 * every governance fact is *present* on it (so nothing needs computing elsewhere),
 * and every derived figure is *computed from* it (so nothing can drift).
 */
const FIXTURE = resolve(process.cwd(), '../../fixtures/mixed-governance');

async function analyzeFixture(path = FIXTURE): Promise<WorkspaceAnalysis> {
  const indexer = new WorkspaceIndexer({ workspacePath: path });
  try {
    return await indexer.analyzeComplete();
  } finally {
    indexer.dispose();
  }
}

describe('WorkspaceAnalysis — completeness', () => {
  it('carries every governance fact a client needs, in one value', async () => {
    const analysis = await analyzeFixture();

    // Not a shape assertion for its own sake: each field below was previously
    // reachable only by calling a different API, and a client that forgot one
    // rendered a partial picture as a complete one.
    expect(analysis.workspacePath).toBe(FIXTURE);
    expect(analysis.assets.length).toBeGreaterThan(0);
    expect(analysis.readiness.complete).toBe(true);
    expect(analysis.coverage).not.toBeNull();
    expect(analysis.referenceCounts).toBeInstanceOf(Map);
    expect(Array.isArray(analysis.diagnostics)).toBe(true);
    expect(Array.isArray(analysis.evaluatedRuleIds)).toBe(true);
    expect(Array.isArray(analysis.skippedRules)).toBe(true);
    expect(Array.isArray(analysis.configErrors)).toBe(true);
    expect(Array.isArray(analysis.duplicateGroups)).toBe(true);
    expect(analysis.health.status).toMatch(/^(computed|unavailable)$/);
  });

  it('reports a completed analysis as ready in every dimension', async () => {
    const { readiness } = await analyzeFixture();

    expect(readiness).toEqual({
      assetsIndexed: true,
      referencesResolved: true,
      duplicatesResolved: true,
      complete: true,
    });
  });

  it('accounts for every diagnostic against an asset that is in the analysis', async () => {
    const analysis = await analyzeFixture();
    const indexed = new Set(analysis.assets.map((a) => a.path));

    // A diagnostic about an asset the analysis does not list would be a finding
    // no client could navigate to.
    for (const diagnostic of analysis.diagnostics) {
      expect(indexed.has(diagnostic.asset.path), diagnostic.asset.path).toBe(true);
    }
  });

  it('never lists a rule as both evaluated and skipped', async () => {
    const analysis = await analyzeFixture();
    const skipped = new Set(analysis.skippedRules.map((r) => r.ruleId));

    for (const ruleId of analysis.evaluatedRuleIds) {
      expect(skipped.has(ruleId), ruleId).toBe(false);
    }
  });

  it('produces no diagnostic for a rule that never ran', async () => {
    const analysis = await analyzeFixture();
    const skipped = new Set(analysis.skippedRules.map((r) => r.ruleId));

    for (const diagnostic of analysis.diagnostics) {
      expect(skipped.has(diagnostic.ruleId), diagnostic.ruleId).toBe(false);
    }
  });

  it('gives every diagnostic evidence, confidence, remediation and a help link', async () => {
    const analysis = await analyzeFixture();
    expect(analysis.diagnostics.length).toBeGreaterThan(0);

    for (const diagnostic of analysis.diagnostics) {
      expect(diagnostic.evidence.summary, diagnostic.ruleId).toBeTruthy();
      expect(diagnostic.confidence, diagnostic.ruleId).toMatch(/^(certain|high|moderate|low)$/);
      expect(diagnostic.remediation.summary, diagnostic.ruleId).toBeTruthy();
      expect(diagnostic.helpUri, diagnostic.ruleId).toMatch(/^https?:\/\//);
    }
  });

  it('deliberately excludes cleanup candidates, which are policy rather than fact', async () => {
    const analysis = await analyzeFixture();

    // What is *true* about the workspace and what a user should be *offered* are
    // different questions. Baking a deletion list into the aggregate would make
    // every consumer inherit one client's cleanup policy.
    expect(analysis).not.toHaveProperty('cleanupCandidates');
  });
});

describe('WorkspaceAnalysis — derived figures', () => {
  it('counts assets from the asset list rather than from a stored total', () => {
    const analysis = testAnalysis({ assets: [testAsset(), testAsset({ path: '/w/b.gif' })] });
    expect(totalAssetCount(analysis)).toBe(2);
  });

  it('counts diagnostics by severity from the diagnostics themselves', () => {
    const analysis = testAnalysis({
      diagnostics: [
        testDiagnostic({ severity: 'error' }),
        testDiagnostic({ severity: 'warning' }),
        testDiagnostic({ severity: 'warning' }),
      ],
    });

    expect(diagnosticCountBySeverity(analysis)).toEqual({ error: 1, warning: 2 });
  });

  it('selects the diagnostics belonging to one asset', () => {
    const subject = testAsset({ path: '/w/subject.gif' });
    const other = testAsset({ path: '/w/other.gif' });
    const analysis = testAnalysis({
      assets: [subject, other],
      diagnostics: [
        testDiagnostic({ asset: subject, ruleId: 'no-gif' }),
        testDiagnostic({ asset: subject, ruleId: 'max-file-size-kb' }),
        testDiagnostic({ asset: other, ruleId: 'no-gif' }),
      ],
    });

    expect(diagnosticsForAsset(analysis, subject.path).map((d) => d.ruleId)).toEqual([
      'no-gif',
      'max-file-size-kb',
    ]);
  });

  it('finds the duplicate group an asset belongs to, and nothing when it has none', async () => {
    const analysis = await analyzeFixture(resolve(process.cwd(), '../../fixtures/duplicates'));
    const duplicated = analysis.assets.find((a) => a.path.endsWith('assets/spinner.json'));
    const unique = analysis.assets.find((a) => a.path.endsWith('assets/unique.json'));

    expect(duplicated).toBeDefined();
    expect(unique).toBeDefined();
    expect(duplicateGroupForAsset(analysis, duplicated!.path)?.candidates).toHaveLength(2);
    expect(duplicateGroupForAsset(analysis, unique!.path)).toBeUndefined();
  });
});
