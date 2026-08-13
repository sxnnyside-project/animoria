import type { CoverageStatus, ScanCoverage } from '../../../types/scan-coverage.js';
import { helpUriForRule } from '../rule-help.js';
import { parseSeverityOnlyOption } from '../shared/rule-option-parsing.js';
import {
  type Confidence,
  type GovernanceRule,
  type RuleEvaluationContext,
  type RuleOutcome,
  evaluated,
  skipped,
} from '../types.js';

const RULE_ID = 'no-unreferenced-assets';

/**
 * Flags assets with zero detected source-code references.
 *
 * This rule does not scan source code itself — usage scanning requires walking the
 * workspace's source files, which is I/O the rule contract forbids (see
 * `GovernanceRule` in `../types.js`). It consults
 * `context.signals.referenceCounts`, which the caller populates via
 * `buildReferenceIndex`.
 *
 * ## Three states, not two
 * The rule distinguishes outcomes that a naive implementation collapses:
 *
 * - **references found** — no violation;
 * - **no references found** — a violation, carrying the coverage that justifies it;
 * - **no references *could be* checked** — {@link skipped}, never a violation.
 *
 * The third case is the original defect: with no reference signal the rule returned
 * an empty violation list, indistinguishable from a clean workspace, and
 * `animoria check` reported `PASS` on repositories full of unreferenced assets.
 *
 * ## Confidence tracks coverage, and is never asserted
 * An absence is only as strong as the search behind it. A workspace where every
 * readable format was scanned supports a `'high'` claim; one where `.json` data
 * files were skipped supports `'moderate'`; one where nothing at all was read
 * supports `'low'`. The rule never states a confidence its coverage does not earn —
 * which is what stops a cleanup flow from offering an irreversible deletion on the
 * strength of a search that never happened.
 */
export const noUnreferencedAssetsRule: GovernanceRule<void> = {
  id: RULE_ID,
  description: 'Disallows assets with no detected references in source code.',
  helpUri: helpUriForRule(RULE_ID),

  parseOptions(raw) {
    return parseSeverityOnlyOption(raw, RULE_ID);
  },

  evaluate(context: RuleEvaluationContext<void>): RuleOutcome {
    const { referenceCounts, scanCoverage } = context.signals;

    if (!referenceCounts) {
      return skipped(
        'missing-signal',
        'Reference evidence was not available for this run, so unreferenced assets could not be identified.'
      );
    }

    // An interrupted scan describes an unknown fraction of the workspace. Reporting
    // its silence as an absence would be reporting a result nobody obtained.
    if (scanCoverage?.status === 'unknown') {
      return skipped(
        'missing-signal',
        'The reference scan did not finish, so its coverage is unknown and absences cannot be trusted.'
      );
    }

    const confidence = confidenceFor(scanCoverage);

    const violations = context.assets
      .filter((asset) => (referenceCounts.get(asset.path) ?? 0) === 0)
      .map((asset) => ({
        asset,
        message: `"${asset.name}" has no detected references in source code.`,
        evidence: {
          kind: 'absence' as const,
          summary: describeAbsence(scanCoverage),
          // Deliberately empty: an absence has no supporting location. The reach of
          // the search is carried on `coverage` instead.
          locations: [],
          data: {
            referenceCount: 0,
            coverageStatus: scanCoverage?.status ?? 'unknown',
          },
        },
        confidence,
        remediation: {
          summary: buildRemediation(scanCoverage),
        },
        ...(scanCoverage ? { coverage: scanCoverage } : {}),
      }));

    return evaluated(violations);
  },
};

/**
 * Maps coverage to how strongly an absence can be claimed.
 *
 * Derived on every call from the scan that actually ran — never a literal, and never
 * cached across runs, so a narrowed or interrupted scan immediately weakens the
 * claims built on it.
 */
function confidenceFor(coverage: ScanCoverage | undefined): Confidence {
  const status: CoverageStatus = coverage?.status ?? 'unknown';
  switch (status) {
    case 'complete':
      // Every format Animoria can read was read, and none referenced the asset.
      return 'high';
    case 'partial':
      // A reference may exist in a format that was never opened.
      return 'moderate';
    case 'none':
      // Nothing was read at all: technically true, evidentially worthless.
      return 'low';
    case 'unknown':
      return 'low';
  }
}

/**
 * States the observation, not the whole scan configuration.
 *
 * The full list of scanned extensions is a property of the *run*, identical for
 * every finding in it; repeating two dozen of them under each violation buries the
 * one fact that differs. The list stays available on `coverage.scannedExtensions`
 * for any consumer that wants it, and renderers show it once per run.
 */
function describeAbsence(coverage: ScanCoverage | undefined): string {
  if (!coverage) return 'No references were found; the reach of the scan is unknown.';
  if (coverage.filesScanned === 0) {
    return 'No source files were scanned, so no reference could have been found.';
  }
  const formatCount = coverage.scannedExtensions.length;
  return `No references found in ${coverage.filesScanned} file(s) across ${formatCount} scanned format(s).`;
}

function buildRemediation(coverage: ScanCoverage | undefined): string {
  const base = 'Delete the asset, reference it from source, or add its path to .animoriaignore.';
  if (coverage && coverage.unscannedExtensions.length > 0) {
    return `${base} Check ${coverage.unscannedExtensions.join(', ')} first — those formats are not scanned.`;
  }
  if (coverage?.filesScanned === 0) {
    return `${base} No source files were scanned at all, so verify the workspace path and .animoriaignore before acting.`;
  }
  return base;
}
