import { describe, expect, it } from 'vitest';
import { buildCleanupCandidates, isProposalStale } from '../../src/analysis/cleanup-candidates';
import { testAnalysis, testAsset, testDiagnostic } from '../support/analysis.js';

/**
 * Cleanup candidates, derived rather than re-computed.
 *
 * ## The specific dishonesty this replaces
 * The old `GovernanceAnalyzer` produced its own `unused`/`duplicate` classification
 * by re-scanning the workspace, then stamped `confidence: 'high'` on every candidate
 * it emitted — a value no measurement produced. A developer looking at the cleanup
 * panel therefore saw a confident deletion offer whose confidence was a constant,
 * and which could contradict the governance section of the very same sidebar.
 *
 * These tests hold the two properties that fix it: a candidate exists only because
 * a rule produced a finding, and its confidence is the *weakest* claim being used to
 * justify removal — never the strongest, and never a literal.
 */
describe('buildCleanupCandidates', () => {
  it('offers nothing when no rule produced a removable finding', () => {
    const analysis = testAnalysis({ diagnostics: [] });
    expect(buildCleanupCandidates(analysis).candidates).toEqual([]);
  });

  it('ignores findings that do not justify removal', () => {
    // A filename collision means two files need better names, not that either is
    // disposable — deleting one would lose an asset with different contents.
    const analysis = testAnalysis({
      diagnostics: [testDiagnostic({ ruleId: 'no-duplicate-names' })],
    });

    expect(buildCleanupCandidates(analysis).candidates).toEqual([]);
  });

  it('maps each removable rule to its reason', () => {
    const cases = [
      ['no-unreferenced-assets', 'unreferenced'],
      ['no-duplicate-content', 'duplicate'],
      ['max-file-size-kb', 'oversized'],
      ['allowed-formats', 'forbidden-format'],
    ] as const;

    for (const [ruleId, reason] of cases) {
      const analysis = testAnalysis({ diagnostics: [testDiagnostic({ ruleId })] });
      const [candidate] = buildCleanupCandidates(analysis).candidates;

      expect(candidate?.reasons, ruleId).toEqual([reason]);
      expect(candidate?.ruleIds, ruleId).toEqual([ruleId]);
    }
  });

  it('collects every reason for one asset into a single candidate', () => {
    const subject = testAsset({ path: '/w/big-orphan.gif' });
    const analysis = testAnalysis({
      assets: [subject],
      diagnostics: [
        testDiagnostic({ asset: subject, ruleId: 'no-unreferenced-assets' }),
        testDiagnostic({ asset: subject, ruleId: 'max-file-size-kb' }),
      ],
    });

    const { candidates } = buildCleanupCandidates(analysis);

    // One asset, one offer — not two rows a developer has to recognize as the
    // same file.
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.reasons.slice().sort()).toEqual(['oversized', 'unreferenced']);
  });

  it('takes the weakest confidence among the findings, not the strongest', () => {
    const subject = testAsset({ path: '/w/maybe.gif' });
    const analysis = testAnalysis({
      assets: [subject],
      diagnostics: [
        // Byte-level certainty about the size…
        testDiagnostic({ asset: subject, ruleId: 'max-file-size-kb', confidence: 'certain' }),
        // …but the reference scan only supports a moderate claim.
        testDiagnostic({
          asset: subject,
          ruleId: 'no-unreferenced-assets',
          confidence: 'moderate',
        }),
      ],
    });

    // Offering this as a "certain" deletion would let the strong claim launder the
    // weak one: the file is certainly large, but that is not why anyone deletes it.
    expect(buildCleanupCandidates(analysis).candidates[0]?.confidence).toBe('moderate');
  });

  it('never invents a confidence — it reproduces the diagnostic verbatim', () => {
    for (const confidence of ['certain', 'high', 'moderate', 'low'] as const) {
      const analysis = testAnalysis({
        diagnostics: [testDiagnostic({ ruleId: 'no-unreferenced-assets', confidence })],
      });

      expect(buildCleanupCandidates(analysis).candidates[0]?.confidence, confidence).toBe(
        confidence
      );
    }
  });

  it('excludes dismissed assets', () => {
    const subject = testAsset({ path: '/w/keep-me.gif' });
    const analysis = testAnalysis({
      assets: [subject],
      diagnostics: [testDiagnostic({ asset: subject, ruleId: 'no-unreferenced-assets' })],
    });

    const proposal = buildCleanupCandidates(analysis, {
      dismissedPaths: new Set([subject.path]),
    });

    expect(proposal.candidates).toEqual([]);
  });

  it('filters below a minimum confidence when one is requested', () => {
    const weak = testAsset({ path: '/w/weak.gif' });
    const strong = testAsset({ path: '/w/strong.gif' });
    const analysis = testAnalysis({
      assets: [weak, strong],
      diagnostics: [
        testDiagnostic({ asset: weak, ruleId: 'no-unreferenced-assets', confidence: 'low' }),
        testDiagnostic({ asset: strong, ruleId: 'no-unreferenced-assets', confidence: 'high' }),
      ],
    });

    const proposal = buildCleanupCandidates(analysis, { minimumConfidence: 'high' });

    expect(proposal.candidates.map((c) => c.asset.path)).toEqual([strong.path]);
  });

  it('orders candidates largest-first, breaking ties by path', () => {
    const assets = [
      testAsset({ path: '/w/small.gif', sizeBytes: 10 }),
      testAsset({ path: '/w/b-tied.gif', sizeBytes: 100 }),
      testAsset({ path: '/w/a-tied.gif', sizeBytes: 100 }),
    ];
    const analysis = testAnalysis({
      assets,
      diagnostics: assets.map((asset) =>
        testDiagnostic({ asset, ruleId: 'no-unreferenced-assets' })
      ),
    });

    // Deterministic order matters: this list drives a bulk-deletion UI, and a
    // reordering between two runs over identical input would move a checkbox
    // under the developer's cursor.
    expect(buildCleanupCandidates(analysis).candidates.map((c) => c.asset.path)).toEqual([
      '/w/a-tied.gif',
      '/w/b-tied.gif',
      '/w/small.gif',
    ]);
  });

  it('reports the recoverable total as the sum of its candidates', () => {
    const assets = [
      testAsset({ path: '/w/a.gif', sizeBytes: 300 }),
      testAsset({ path: '/w/b.gif', sizeBytes: 200 }),
    ];
    const analysis = testAnalysis({
      assets,
      diagnostics: assets.map((asset) =>
        testDiagnostic({ asset, ruleId: 'no-unreferenced-assets' })
      ),
    });

    expect(buildCleanupCandidates(analysis).totalSizeBytes).toBe(500);
  });

  it('marks a proposal built on an incomplete analysis as incomplete', () => {
    // Not a refusal — an incomplete analysis can still be worth looking at. But a
    // surface that offers bulk deletion needs to know it is working from a partial
    // picture, and the proposal is where it finds that out.
    const analysis = testAnalysis({
      readiness: {
        assetsIndexed: true,
        referencesResolved: false,
        duplicatesResolved: false,
        complete: false,
      },
    });

    expect(buildCleanupCandidates(analysis).analysisComplete).toBe(false);
  });
});

describe('stale-state semantics', () => {
  it('stamps a proposal with the analysis generation it was derived from', () => {
    const proposal = buildCleanupCandidates(testAnalysis({ generation: 7 }));
    expect(proposal.analysisGeneration).toBe(7);
  });

  it('reports a proposal as current while the workspace has not moved on', () => {
    const analysis = testAnalysis({ generation: 3 });
    expect(isProposalStale(buildCleanupCandidates(analysis), analysis)).toBe(false);
  });

  it('reports a proposal as stale once the workspace changes underneath it', () => {
    // The scenario: a cleanup list is on screen while a file is saved, so the
    // index re-converges. Confirming now would delete against evidence that has
    // already been superseded.
    const proposal = buildCleanupCandidates(testAnalysis({ generation: 3 }));
    expect(isProposalStale(proposal, testAnalysis({ generation: 4 }))).toBe(true);
  });

  it('detects staleness from any workspace change, not only changes to the candidates', () => {
    // A newly-added source file can reference an asset the proposal lists as
    // unreferenced. Comparing per-candidate would miss exactly that case, which
    // is why the whole-analysis generation is the unit of comparison.
    const subject = testAsset({ path: '/w/orphan.gif' });
    const proposal = buildCleanupCandidates(
      testAnalysis({
        generation: 1,
        assets: [subject],
        diagnostics: [testDiagnostic({ asset: subject, ruleId: 'no-unreferenced-assets' })],
      })
    );

    const unrelatedChange = testAnalysis({ generation: 2, assets: [subject, testAsset()] });

    expect(proposal.candidates).toHaveLength(1);
    expect(isProposalStale(proposal, unrelatedChange)).toBe(true);
  });
});
