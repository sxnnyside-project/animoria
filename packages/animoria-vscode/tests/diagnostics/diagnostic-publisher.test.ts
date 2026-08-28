import type { Asset, RuleDiagnostic } from '@animoria/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { DiagnosticPublisher } from '../../src/diagnostics/diagnostic-publisher.js';
import { DiagnosticSeverity, languages } from '../mocks/vscode.js';
import { buildAnalysis, buildAsset, buildDiagnostic } from '../support/fakes.js';

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
    const hero = buildAsset();
    const logo = buildAsset({
      path: '/workspace/assets/logo.json',
      name: 'logo.json',
      stem: 'logo',
    });
    publisher.publish(
      buildAnalysis({
        assets: [hero, logo],
        diagnostics: [
          buildDiagnostic({ target_asset_path: hero.path }),
          buildDiagnostic({ target_asset_path: logo.path }),
        ],
      })
    );

    expect(collection().get({ fsPath: hero.path } as never)).toHaveLength(1);
    expect(collection().get({ fsPath: logo.path } as never)).toHaveLength(1);
  });

  it('groups multiple findings about one asset under that file', () => {
    const subject = buildAsset();
    publisher.publish(
      buildAnalysis({
        assets: [subject],
        diagnostics: [
          buildDiagnostic({ target_asset_path: subject.path, rule_id: 'no-unreferenced-assets' }),
          buildDiagnostic({ target_asset_path: subject.path, rule_id: 'max-file-size-kb' }),
        ],
      })
    );

    expect(collection().get({ fsPath: subject.path } as never)).toHaveLength(2);
  });

  it('maps Core severity onto VS Code severity without reinterpreting it', () => {
    const subject = buildAsset();
    publisher.publish(
      buildAnalysis({
        assets: [subject],
        diagnostics: [
          buildDiagnostic({
            target_asset_path: subject.path,
            severity: 'error',
            rule_id: 'no-gif',
          }),
          buildDiagnostic({
            target_asset_path: subject.path,
            severity: 'warning',
            rule_id: 'no-unreferenced-assets',
          }),
        ],
      })
    );

    const diagnostics = collection().get({ fsPath: subject.path } as never);
    expect(diagnostics?.[0]?.severity).toBe(DiagnosticSeverity.Error);
    expect(diagnostics?.[1]?.severity).toBe(DiagnosticSeverity.Warning);
  });

  it('replaces previous findings on publish so resolved issues disappear', () => {
    const subject = buildAsset();
    publisher.publish(
      buildAnalysis({
        assets: [subject],
        diagnostics: [buildDiagnostic({ target_asset_path: subject.path })],
      })
    );
    expect(collection().get({ fsPath: subject.path } as never)).toHaveLength(1);

    publisher.publish(buildAnalysis({ assets: [subject], diagnostics: [] }));
    expect(collection().get({ fsPath: subject.path } as never) ?? []).toHaveLength(0);
  });

  it('clears all diagnostics on clear()', () => {
    const subject = buildAsset();
    publisher.publish(
      buildAnalysis({
        assets: [subject],
        diagnostics: [buildDiagnostic({ target_asset_path: subject.path })],
      })
    );
    publisher.clear();
    expect(collection().get({ fsPath: subject.path } as never) ?? []).toHaveLength(0);
  });
});
