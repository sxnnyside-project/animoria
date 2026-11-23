import type { RuleDiagnostic } from '@animoria/contracts';
import { describe, expect, it } from 'vitest';
import '../../src/components/gallery/animoria-finding.js';
import { AnimoriaFinding } from '../../src/components/gallery/animoria-finding.js';

const SAMPLE_DIAGNOSTIC: RuleDiagnostic = {
  rule_id: 'no-unreferenced-assets',
  severity: 'warning',
  message: 'Asset hero.json is not referenced in any project files.',
  target_asset_path: 'assets/hero.json',
  evidence_file: 'src/App.tsx',
  evidence_line: 42,
  evidence_excerpt: '<HeroAnimation />',
};

describe('AnimoriaFinding — component rendering & events', () => {
  it('instantiates custom element and sets properties conforming to P17', () => {
    const finding = new AnimoriaFinding();
    finding.diagnostic = SAMPLE_DIAGNOSTIC;
    finding.rootId = 'root-1';
    finding.rootName = 'web';
    finding.isSelected = true;
    finding.isCompact = false;
    finding.shouldHideRoot = false;

    expect(finding).toBeDefined();
    expect(finding.isSelected).toBe(true);
    expect(finding.isCompact).toBe(false);
    expect(finding.shouldHideRoot).toBe(false);
  });

  it('emits open-asset event using AnimoriaElement helper', () => {
    const finding = new AnimoriaFinding();
    finding.diagnostic = SAMPLE_DIAGNOSTIC;
    finding.rootId = 'root-web';

    let emittedDetail: { assetPath: string; rootId: string } | null = null;
    finding.addEventListener('open-asset', (e: Event) => {
      emittedDetail = (e as CustomEvent<{ assetPath: string; rootId: string }>).detail;
    });

    // Invoke open asset logic
    (finding as unknown as { _openAsset: () => void })._openAsset();

    expect(emittedDetail).toEqual({
      assetPath: 'assets/hero.json',
      rootId: 'root-web',
    });
  });
});
