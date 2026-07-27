import type { RuleDiagnostic } from '../rules-engine.js';
import type { HealthScoreWeights } from './types.js';

/** Reference size used to scale the orphan (unreferenced-asset) penalty. */
const ORPHAN_SIZE_REFERENCE_BYTES = 256 * 1024; // 256 KB
/** Bounds on the orphan size-scaling factor, so one huge asset can't dominate the score. */
const ORPHAN_SIZE_FACTOR_MIN = 0.5;
const ORPHAN_SIZE_FACTOR_MAX = 3;

/** Bounds on the oversized-asset penalty, scaled by how far over the limit an asset is. */
const OVERSIZE_PENALTY_MIN = 3;
const OVERSIZE_PENALTY_MAX = 15;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Scales the `no-unreferenced-assets` penalty by asset size: an
 * unreferenced 5 MB Lottie file is a bigger problem than an unreferenced
 * 2 KB one, since both cost the same amount of *investigation* time but
 * only one costs meaningful bundle size. Reads `diagnostic.asset` —
 * already attached to every diagnostic by the Rule Engine — rather than
 * looking anything up itself.
 */
function orphanPenalty(diagnostic: RuleDiagnostic): number {
  const factor = clamp(
    diagnostic.asset.sizeBytes / ORPHAN_SIZE_REFERENCE_BYTES,
    ORPHAN_SIZE_FACTOR_MIN,
    ORPHAN_SIZE_FACTOR_MAX
  );
  return 5 * factor;
}

/**
 * Scales the `max-file-size-kb` penalty by how far over the configured
 * limit an asset is, using the `{ limitKb, actualKb }` detail the rule
 * itself already attaches to the diagnostic (see
 * `rules/builtins/max-file-size.rule.ts`) — not a re-derivation of the
 * limit or the asset's size.
 */
function oversizePenalty(diagnostic: RuleDiagnostic): number {
  const details = diagnostic.details as { limitKb?: number; actualKb?: number } | undefined;
  const limitKb = details?.limitKb;
  const actualKb = details?.actualKb;
  const ratio = limitKb && actualKb && limitKb > 0 ? actualKb / limitKb : 1;
  return clamp(3 * ratio, OVERSIZE_PENALTY_MIN, OVERSIZE_PENALTY_MAX);
}

/**
 * Animoria's built-in scoring policy.
 *
 * Every weight and multiplier below is a deliberate, documented product
 * decision — not a magic number. A workspace that disagrees overrides
 * this wholesale via {@link HealthScoreEngineConfig.weights} rather than
 * patching individual constants; a future built-in rule this table
 * doesn't yet know about falls back to `defaultWeight` automatically
 * (see the module docs in `./types.js` for why that matters).
 */
export const DEFAULT_HEALTH_SCORE_WEIGHTS: HealthScoreWeights = {
  perRule: {
    'no-unreferenced-assets': orphanPenalty,
    'max-file-size-kb': oversizePenalty,
    'no-duplicate-names': 4,
    'allowed-formats': 6,
    'no-gif': 2,
  },
  defaultWeight: 3,
  severityMultiplier: {
    error: 1,
    warning: 0.5,
  },
};
