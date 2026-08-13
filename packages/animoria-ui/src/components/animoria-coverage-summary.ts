import type { CoverageStatus, ScanCoverage } from '@animoria/core/contracts';
import { COVERAGE_LABELS } from '@animoria/core/contracts';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * What the reference scan actually read.
 *
 * ## Why this is the most important component in the package
 * `ScanCoverage` landed in Wave 1, was extended in Wave 2, and **no client has ever
 * shown it**. So for four waves the product has rendered "0 references" identically
 * whether every source format was read and none matched, or no source file was read
 * at all. Those are the same pixel and opposite facts, and a developer deleting an
 * asset on the strength of the second one loses data.
 *
 * D-04 makes evidence mandatory for any finding derived from scanning. This is where
 * that obligation becomes visible. It is deliberately not collapsible-by-default and
 * not behind a tooltip: a caveat a developer has to go looking for is a caveat the
 * product has decided not to make.
 *
 * ## Why `none` is louder than `partial`
 * `partial` means "a reference may exist in a format we cannot read" — a real
 * limitation with a bounded scope, and the developer can see which extensions.
 * `none` means the absence finding rests on nothing at all. The first qualifies a
 * claim; the second removes its basis.
 */
@customElement('animoria-coverage-summary')
export class AnimoriaCoverageSummary extends LitElement {
  @property({ type: Object }) coverage: ScanCoverage | null = null;
  /** Renders a single inline chip instead of the full panel. For list rows. */
  @property({ type: Boolean }) compact = false;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size-sm);
    }

    .panel {
      border: 1px solid var(--status-color);
      border-left-width: 3px;
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-raised);
      padding: var(--animoria-space-2) var(--animoria-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-1);
    }

    .headline {
      display: flex;
      align-items: center;
      gap: var(--animoria-space-2);
      font-weight: 600;
      color: var(--status-color);
    }

    .meaning {
      color: var(--animoria-text-primary);
      line-height: var(--animoria-line-height);
    }

    .facts {
      color: var(--animoria-text-muted);
      font-size: var(--animoria-font-size-xs);
      display: flex;
      flex-wrap: wrap;
      gap: var(--animoria-space-1) var(--animoria-space-3);
    }

    code {
      font-family: var(--animoria-font-mono);
      background: var(--animoria-neutral-quiet);
      padding: 0 3px;
      border-radius: 2px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--animoria-space-1);
      font-size: var(--animoria-font-size-xs);
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 10px;
      color: var(--status-color);
      border: 1px solid var(--status-color);
      background: var(--animoria-neutral-quiet);
      white-space: nowrap;
    }
  `;

  private static readonly COLORS: Readonly<Record<CoverageStatus, string>> = {
    complete: 'var(--animoria-coverage-complete)',
    partial: 'var(--animoria-coverage-partial)',
    none: 'var(--animoria-coverage-none)',
    unknown: 'var(--animoria-coverage-unknown)',
  };

  /**
   * What each status means *for the reader's decision*, not what it means
   * technically. "Partial coverage" is a label; "a reference may exist in a format
   * Animoria cannot read" is the thing that changes whether they delete the file.
   */
  private static readonly MEANING: Readonly<Record<CoverageStatus, string>> = {
    complete:
      'Every source format Animoria can read was read. An asset reported as unreferenced has no reference in any of them.',
    partial:
      'Some formats that can carry a reference were not read, so an asset reported as unreferenced may still be used from one of them.',
    none: 'No source files were read. Animoria cannot say whether any asset is referenced.',
    unknown:
      'The scan did not finish, so it describes an unknown fraction of the workspace. Reference findings are withheld.',
  };

  override render() {
    const coverage = this.coverage;
    if (!coverage) return nothing;

    const color = AnimoriaCoverageSummary.COLORS[coverage.status];
    const label = COVERAGE_LABELS[coverage.status] ?? coverage.status;

    if (this.compact) {
      return html`<span
        class="chip"
        style="--status-color: ${color}"
        title=${AnimoriaCoverageSummary.MEANING[coverage.status]}
        >${label}</span
      >`;
    }

    return html`
      <div class="panel" style="--status-color: ${color}">
        <div class="headline">${label}</div>
        <div class="meaning">${AnimoriaCoverageSummary.MEANING[coverage.status]}</div>
        <div class="facts">
          <span>${coverage.filesScanned} file(s) read</span>
          <span>${coverage.referencesDetected} reference(s) detected</span>
          ${
            coverage.scannedExtensions.length > 0
              ? html`<span>read: ${coverage.scannedExtensions.join(' ')}</span>`
              : nothing
          }
          ${
            coverage.unscannedExtensions.length > 0
              ? html`<span>not read: ${coverage.unscannedExtensions.join(' ')}</span>`
              : nothing
          }
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-coverage-summary': AnimoriaCoverageSummary;
  }
}
