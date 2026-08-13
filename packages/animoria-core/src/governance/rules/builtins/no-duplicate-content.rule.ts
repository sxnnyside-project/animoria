import { helpUriForRule } from '../rule-help.js';
import { parseSeverityOnlyOption } from '../shared/rule-option-parsing.js';
import {
  DIRECT_OBSERVATION_CONFIDENCE,
  type GovernanceRule,
  type RuleEvaluationContext,
  type RuleOutcome,
  type RuleViolation,
  evaluated,
  skipped,
} from '../types.js';

const RULE_ID = 'no-duplicate-content';

/**
 * Flags assets whose file contents are byte-identical to another asset's.
 *
 * ## Why this is a rule and not a separate analyzer
 * Duplicate detection used to live inside `GovernanceAnalyzer`, a second governance
 * engine that produced its own result shape, fed nothing into the Health Score, and
 * used vocabulary ("issue", "category") that no other part of the system shared. The
 * finding itself was never the problem — running it through a parallel pipeline was.
 * As a rule it produces the same `RuleDiagnostic` as every other finding, is
 * configurable in `.animoriarc`, contributes to the Health Score, and reaches every
 * client through the one canonical analysis.
 *
 * ## Distinct from `no-duplicate-names`
 * That rule answers "will a developer searching for `success` be confused?" — a
 * *naming* collision, where the files may differ completely. This one answers "is
 * this the same file, checked in twice?" — a *content* collision, and the only one of
 * the two on which deleting a copy is safe. Both can fire for the same asset, and
 * neither implies the other.
 *
 * ## Evidence
 * The rule performs no I/O: content hashing is done once per analysis by
 * `detectDuplicateGroups` and handed in via {@link GovernanceSignals.duplicateGroups}.
 * Each violation names its siblings, so a reader can see what the asset was found
 * identical *to* without re-running anything. Confidence is `certain` — byte equality
 * is not weakened by anything the reference scan did or did not cover.
 *
 * Configuration: a bare severity — `"error" | "warning" | "off"`.
 */
export const noDuplicateContentRule: GovernanceRule<void> = {
  id: RULE_ID,
  description: 'Disallows two assets with byte-identical contents.',
  helpUri: helpUriForRule(RULE_ID),

  parseOptions(raw) {
    return parseSeverityOnlyOption(raw, RULE_ID);
  },

  evaluate(context: RuleEvaluationContext<void>): RuleOutcome {
    const { duplicateGroups } = context.signals;

    if (!duplicateGroups) {
      // Content hashing is I/O the rule contract forbids it from doing itself. With
      // no groups supplied it cannot know whether duplicates exist, and reporting
      // "none" would be indistinguishable from "checked, and there are none".
      return skipped(
        'missing-signal',
        'Content hashes were not available for this run, so duplicate content could not be identified.'
      );
    }

    const indexedAssetPaths = new Set(context.assets.map((asset) => asset.path));
    const violations: RuleViolation[] = [];

    for (const group of duplicateGroups) {
      if (group.candidates.length < 2) continue;

      for (const candidate of group.candidates) {
        // A group is computed over the whole workspace; this rule reports only on
        // assets the caller actually asked about (a scoped run may pass a subset).
        if (!indexedAssetPaths.has(candidate.asset.path)) continue;

        const siblings = group.candidates
          .filter((other) => other.asset.path !== candidate.asset.path)
          .map((other) => other.asset.path);

        violations.push({
          asset: candidate.asset,
          message: `"${candidate.asset.name}" is byte-identical to ${siblings.length} other asset(s): ${siblings.join(', ')}.`,
          details: {
            contentHash: group.contentHash,
            duplicatePaths: siblings,
            potentialSavingsBytes: group.potentialSavingsBytes,
          },
          evidence: {
            kind: 'content-hash',
            summary: `Content hash ${group.contentHash.slice(0, 12)} is shared with ${siblings.length} other asset(s).`,
            locations: siblings.map((file) => ({ file })),
            data: {
              matchKind: group.matchKind,
              contentHash: group.contentHash,
              groupId: group.id,
              siblingPaths: siblings,
              sizeBytes: group.sizeBytes,
              potentialSavingsBytes: group.potentialSavingsBytes,
            },
          },
          // Byte equality. Nothing about reference-scan coverage can weaken it.
          confidence: DIRECT_OBSERVATION_CONFIDENCE,
          remediation: {
            summary: `Keep one copy — ${group.candidates[0]?.asset.path ?? 'the most referenced'} is the most referenced — repoint references at it, and remove the rest.`,
          },
        });
      }
    }

    return evaluated(violations);
  },
};
