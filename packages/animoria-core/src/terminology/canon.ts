/**
 * The product's vocabulary, as data.
 *
 * ## Why this is code and not a style guide
 * D-14 fixed Animoria's terminology in Wave 1 and nothing enforced it, so by Wave 4
 * the same concept had four names across three clients: VS Code's badge presenter
 * said `orphaned`, its health widget said `opportunities`, the JetBrains gallery
 * rendered `Unused` chips, and the sandbox preview said `Overused asset` for a
 * category that had already been deleted from the model. A developer reading the
 * tree, the report and the tool window saw three products.
 *
 * Consolidating three UIs into one makes this worse, not better: whatever words the
 * shared components ship with become the words *everywhere*, instantly and
 * permanently. So the canon lands before the extraction, with a gate, rather than
 * after it with an apology.
 *
 * ## What the gate checks
 * `terminology.test.ts` reads this module and fails the build when a banned synonym
 * appears in user-facing text. It is deliberately scoped to **rendered strings and
 * identifiers**, not comments: a comment explaining *why* `overused` was deleted is
 * documentation, and banning the word there would make the codebase unable to
 * describe its own history.
 */

/** One concept, its canonical term, and the synonyms that must not appear instead. */
export interface TerminologyEntry {
  /** The concept, for humans reading a failure message. */
  readonly concept: string;
  /** The one word the product uses. */
  readonly canonical: string;
  /** Words that mean this concept but must not be used for it. */
  readonly banned: readonly string[];
  /** Why the canonical term was chosen — surfaced in gate failures. */
  readonly rationale: string;
}

/**
 * The canon. Adding a concept here makes it enforced; there is no second list.
 */
export const TERMINOLOGY_CANON: readonly TerminologyEntry[] = [
  {
    concept: 'An asset with no reference evidence',
    canonical: 'unreferenced',
    banned: ['orphaned', 'orphan', 'unused'],
    rationale:
      '"Unreferenced" states what was observed — no reference was found. "Unused" and "orphaned" claim something stronger that a scan cannot establish, especially under partial coverage.',
  },
  {
    concept: 'A governance finding about an asset',
    canonical: 'finding',
    banned: ['violation', 'issue', 'opportunity', 'opportunities'],
    rationale:
      '"Finding" is neutral and true of every diagnostic. "Violation" presumes a rule the user agreed to; "opportunity" is marketing for a problem.',
  },
  {
    concept: 'Byte-identical assets',
    canonical: 'duplicate',
    // `copy` is deliberately absent. It is ordinary English — "keep one copy and
    // update references to point at it" is correct remediation prose, and
    // `success-copy.json` is a fixture filename. A word-level gate cannot tell
    // those from the concept, so banning it would produce ~60 false positives,
    // and a gate people routinely suppress has stopped being a gate.
    banned: ['clone'],
    rationale: "The rule is named `no-duplicate-content`; the UI must use the rule's word.",
  },
  {
    concept: 'The staged deletion area',
    canonical: 'trash',
    // `bin` is absent for the same reason as `copy`: it collides with `bin/`
    // directories and binary-format prose far more often than it names this concept.
    banned: ['quarantine', 'purgatory'],
    rationale: 'Trash is recoverable and every client writes the same manifest to it.',
  },
  {
    concept: 'The 0–100 number',
    canonical: 'health score',
    banned: ['grade', 'rating'],
    rationale: 'A grade implies a pass mark Animoria does not define.',
  },
  {
    concept: 'A deleted reuse heuristic',
    canonical: '',
    banned: ['overused'],
    rationale:
      'Deleted in Wave 3 (D-07): a threshold on a heuristic count with no remediation. It must not be reconstructed downstream, which is exactly what the sandbox did after the model dropped it.',
  },
] as const;

/** Every banned word, flattened. */
export const BANNED_TERMS: readonly string[] = TERMINOLOGY_CANON.flatMap((e) => e.banned);

/** The canon entry that bans a given word, or `undefined` when it is not banned. */
export function entryForBannedTerm(term: string): TerminologyEntry | undefined {
  const lowered = term.toLowerCase();
  return TERMINOLOGY_CANON.find((e) => e.banned.includes(lowered));
}

/**
 * The canonical label for a cleanup reason.
 *
 * Exists so no surface writes these words itself. `CleanupReason` is a machine
 * identifier; this is the one place it becomes English.
 */
export const CLEANUP_REASON_LABELS: Readonly<Record<string, string>> = {
  unreferenced: 'Unreferenced',
  duplicate: 'Duplicate content',
  oversized: 'Over size limit',
  'forbidden-format': 'Format not allowed',
};

/** The canonical label for a confidence level. */
export const CONFIDENCE_LABELS: Readonly<Record<string, string>> = {
  certain: 'Certain',
  high: 'High confidence',
  moderate: 'Moderate confidence',
  low: 'Low confidence',
};

/** The canonical label for a coverage status. */
export const COVERAGE_LABELS: Readonly<Record<string, string>> = {
  complete: 'Full coverage',
  partial: 'Partial coverage',
  none: 'No coverage',
  unknown: 'Coverage unknown',
};

/** The canonical label for each lifecycle state. */
export const LIFECYCLE_LABELS: Readonly<Record<string, string>> = {
  initializing: 'Initializing',
  analyzing: 'Analyzing',
  ready: 'Ready',
  stale: 'Out of date',
  incomplete: 'Incomplete',
  failed: 'Analysis failed',
};
