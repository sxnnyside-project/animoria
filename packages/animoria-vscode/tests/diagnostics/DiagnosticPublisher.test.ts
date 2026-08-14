import type { AnimoriaAsset, RuleDiagnostic } from '@animoria/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { DiagnosticPublisher } from '../../src/diagnostics/DiagnosticPublisher.js';
import { DiagnosticSeverity, languages } from '../mocks/vscode.js';
import { buildAnalysis } from '../support/fakes.js';

/**
 * Publication of governance findings to the Problems panel.
 *
 * ## Why the destination matters
 * Animoria's findings used to be announced with
 * `setStatusBarMessage(..., 5000)` — a line of text that disappeared after five
 * seconds and could not be recalled — plus rows in a sidebar the developer had to
 * already have open. The extension declares itself a linter; a linter's findings
 * belong somewhere they persist, can be navigated with `F8`, and survive the moment
 * they were produced.
 *
 * ## What these tests hold
 * That the publisher *translates* and never *decides*. Severity, message, evidence,
 * confidence, coverage, remediation and the help link all come from the
 * `RuleDiagnostic`; if this class could compute any of them, VS Code and the CLI
 * could disagree about the same file.
 */
function asset(overrides: Partial<AnimoriaAsset> = {}): AnimoriaAsset {
  return {
    path: '/workspace/assets/hero.json',
    name: 'hero.json',
    stem: 'hero',
    format: 'lottie',
    sizeBytes: 2048,
    mtime: 0,
    status: 'parsed',
    ...overrides,
  };
}

function diagnostic(overrides: Partial<RuleDiagnostic> = {}): RuleDiagnostic {
  const subject = overrides.asset ?? asset();
  return {
    ruleId: 'no-unreferenced-assets',
    severity: 'warning',
    message: `${subject.name} is not referenced by any scanned file.`,
    evidence: { kind: 'absence', summary: 'No references found in 12 scanned file(s).' },
    confidence: 'high',
    remediation: { summary: 'Delete it, or reference it from code.' },
    helpUri: 'https://animoria.dev/rules/no-unreferenced-assets',
    ...overrides,
    asset: subject,
  };
}

describe('DiagnosticPublisher', () => {
  let publisher: DiagnosticPublisher;

  beforeEach(() => {
    publisher = new DiagnosticPublisher();
  });

  const collection = () => {
    const created = languages._lastDiagnosticCollection;
    if (!created) throw new Error('no diagnostic collection was created');
    return created;
  };

  it('publishes one VS Code diagnostic per finding, filed against its asset', () => {
    const hero = asset();
    const logo = asset({ path: '/workspace/assets/logo.json', name: 'logo.json' });
    publisher.publish(
      buildAnalysis({
        assets: [hero, logo],
        diagnostics: [diagnostic({ asset: hero }), diagnostic({ asset: logo })],
      })
    );

    expect(collection().get({ fsPath: hero.path } as never)).toHaveLength(1);
    expect(collection().get({ fsPath: logo.path } as never)).toHaveLength(1);
  });

  it('groups multiple findings about one asset under that file', () => {
    const subject = asset();
    publisher.publish(
      buildAnalysis({
        assets: [subject],
        diagnostics: [
          diagnostic({ asset: subject, ruleId: 'no-unreferenced-assets' }),
          diagnostic({ asset: subject, ruleId: 'max-file-size-kb' }),
        ],
      })
    );

    expect(collection().get({ fsPath: subject.path } as never)).toHaveLength(2);
  });

  it('maps Core severity onto VS Code severity without reinterpreting it', () => {
    const subject = asset();
    publisher.publish(
      buildAnalysis({
        assets: [subject],
        diagnostics: [
          diagnostic({ asset: subject, severity: 'error', ruleId: 'no-gif' }),
          diagnostic({ asset: subject, severity: 'warning', ruleId: 'max-file-size-kb' }),
        ],
      })
    );

    const published = collection().get({ fsPath: subject.path } as never) ?? [];
    expect(published.map((d) => d.severity)).toEqual([
      DiagnosticSeverity.Error,
      DiagnosticSeverity.Warning,
    ]);
  });

  it('renders the evidence, confidence and remediation the developer needs to judge it', () => {
    const subject = asset();
    publisher.publish(
      buildAnalysis({ assets: [subject], diagnostics: [diagnostic({ asset: subject })] })
    );

    const [published] = collection().get({ fsPath: subject.path } as never) ?? [];
    // A finding a developer cannot evaluate is a finding they will learn to ignore.
    expect(published?.message).toContain('is not referenced by any scanned file');
    expect(published?.message).toContain('No references found in 12 scanned file(s).');
    expect(published?.message).toContain('Confidence: high');
    expect(published?.message).toContain('Delete it, or reference it from code.');
  });

  it('discloses the reach of the scan behind an absence finding', () => {
    const subject = asset();
    publisher.publish(
      buildAnalysis({
        assets: [subject],
        diagnostics: [
          diagnostic({
            asset: subject,
            coverage: {
              status: 'partial',
              scannedExtensions: ['.ts'],
              unscannedExtensions: ['.json'],
              filesScanned: 7,
              referencesDetected: 0,
              excludedPatterns: [],
              scopePath: '/workspace',
            },
          }),
        ],
      })
    );

    const [published] = collection().get({ fsPath: subject.path } as never) ?? [];
    // "Nothing references this" means something different when the search skipped
    // formats — so the panel says which search produced the claim.
    expect(published?.message).toContain('coverage: partial');
    expect(published?.message).toContain('7 file(s) scanned');
  });

  it('makes the rule id a clickable link to its documentation', () => {
    const subject = asset();
    publisher.publish(
      buildAnalysis({ assets: [subject], diagnostics: [diagnostic({ asset: subject })] })
    );

    const [published] = collection().get({ fsPath: subject.path } as never) ?? [];
    expect(published?.source).toBe('Animoria');
    expect(published?.code).toMatchObject({ value: 'no-unreferenced-assets' });
    // `| undefined` on the cast, and `?.` before `.target`: with the assertion written
    // as `(published?.code as T).target`, a missing diagnostic threw a TypeError here
    // rather than failing the expectation it was written to check.
    expect((published?.code as { target: { scheme: string } } | undefined)?.target.scheme).toBe(
      'https'
    );
  });

  it('turns evidence locations into navigable related information', () => {
    const subject = asset();
    publisher.publish(
      buildAnalysis({
        assets: [subject],
        diagnostics: [
          diagnostic({
            asset: subject,
            ruleId: 'no-duplicate-content',
            evidence: {
              kind: 'content-hash',
              summary: 'Content hash a1b2c3d4e5f6 is shared with 1 other asset(s).',
              locations: [{ file: '/workspace/vendor/hero-copy.json' }],
            },
          }),
        ],
      })
    );

    const [published] = collection().get({ fsPath: subject.path } as never) ?? [];
    // The developer can jump straight to the file this one was found identical to.
    expect(published?.relatedInformation).toHaveLength(1);
    expect(published?.relatedInformation?.[0]?.location.uri.fsPath).toBe(
      '/workspace/vendor/hero-copy.json'
    );
  });

  it('attaches no related information to a finding that has no locations', () => {
    const subject = asset();
    publisher.publish(
      buildAnalysis({ assets: [subject], diagnostics: [diagnostic({ asset: subject })] })
    );

    // An absence has nothing to point at. Fabricating a location to fill the field
    // would send the developer somewhere the evidence does not lead.
    const [published] = collection().get({ fsPath: subject.path } as never) ?? [];
    expect(published?.relatedInformation).toBeUndefined();
  });

  it('removes a finding that no longer exists on the next publication', () => {
    const subject = asset();
    publisher.publish(
      buildAnalysis({ assets: [subject], diagnostics: [diagnostic({ asset: subject })] })
    );
    expect(collection().get({ fsPath: subject.path } as never)).toHaveLength(1);

    // The developer fixed it. A stale entry that lingers until the window reloads
    // is exactly as misleading as a missing one.
    publisher.publish(buildAnalysis({ assets: [subject], diagnostics: [] }));
    expect(collection().get({ fsPath: subject.path } as never)).toBeUndefined();
  });

  it('publishes nothing for an analysis with no findings', () => {
    publisher.publish(buildAnalysis());
    expect(collection().entries.size).toBe(0);
  });

  it('clears everything on dispose', () => {
    const subject = asset();
    publisher.publish(
      buildAnalysis({ assets: [subject], diagnostics: [diagnostic({ asset: subject })] })
    );

    publisher.dispose();
    expect(collection().disposed).toBe(true);
  });
});
