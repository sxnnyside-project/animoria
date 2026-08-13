/**
 * How completely a reference scan examined the workspace.
 *
 * ## Why "0 references found" is not one state but four
 * An absence finding — "nothing refers to this asset" — is only as trustworthy as
 * the search behind it. Four situations produce an identical empty result and demand
 * different responses from the reader:
 *
 * - every format that could hold a reference was read, and none did (**complete**);
 * - some formats were skipped, so a reference may exist where nobody looked (**partial**);
 * - there was nothing to read at all (**none**);
 * - the scan did not finish, so its result describes an unknown fraction of the
 *   workspace (**unknown**).
 *
 * Collapsing these into a boolean is what allows "we did not check" to be presented
 * as "there is nothing there". Every consumer branches on this instead.
 */
export type CoverageStatus = 'complete' | 'partial' | 'none' | 'unknown';

/**
 * What a reference scan actually examined — the machine-readable evidence behind
 * every reference-derived finding.
 *
 * Consumers must never reconstruct any of this by parsing a rendered message: the
 * fields below are the contract, and prose is generated *from* them.
 */
export interface ScanCoverage {
  /** Coarse verdict on the scan's completeness. See {@link CoverageStatus}. */
  readonly status: CoverageStatus;
  /** Source extensions that were read, e.g. `['.ts', '.html', '.css']`. */
  readonly scannedExtensions: readonly string[];
  /**
   * Extensions Animoria knows can carry an asset reference but deliberately does not
   * read, because it has no dependable way to tell a reference from an arbitrary
   * string in them. Non-empty means {@link status} is at best `'partial'`.
   */
  readonly unscannedExtensions: readonly string[];
  /** How many source files were actually read. */
  readonly filesScanned: number;
  /** How many references were detected across every asset in this scan. */
  readonly referencesDetected: number;
  /** Glob patterns excluded from the scan (`.animoriaignore` plus built-in defaults). */
  readonly excludedPatterns: readonly string[];
  /** Root the scan was scoped to — a monorepo package boundary, or the workspace root. */
  readonly scopePath: string;
}

/**
 * Extensions that can carry an asset reference but that Animoria does not read.
 *
 * ## Why each one is absent
 * `.json`, `.yaml`, `.yml`, `.xml` are data formats: a string equal to an asset's
 * filename inside one may be a fixture, a translation key, a changelog entry, or a
 * lockfile entry. No syntax within them distinguishes *a reference* from *a value*,
 * so reading them would mean guessing — and `.json` is Lottie's own extension, so
 * scanning it would additionally treat assets as sources for one another.
 *
 * This list exists so the disclosure cannot drift: an extension is removed from here
 * in the same change that teaches {@link REFERENCE_FORMAT_SUPPORT} to read it.
 */
export const KNOWN_UNSCANNED_REFERENCE_EXTENSIONS: readonly string[] = [
  '.json',
  '.yaml',
  '.yml',
  '.xml',
];

/**
 * Which of the known-unscannable extensions remain unread, given what was scanned.
 *
 * Takes the scanned set as input rather than assuming it, so a caller that narrows
 * the scan (a `--format`-limited run, a scoped monorepo pass) reports the narrowing
 * honestly instead of repeating a global claim.
 */
export function describeUnscannedExtensions(
  scannedExtensions: readonly string[]
): readonly string[] {
  const scanned = new Set(scannedExtensions.map((e) => e.toLowerCase()));
  return KNOWN_UNSCANNED_REFERENCE_EXTENSIONS.filter((ext) => !scanned.has(ext));
}

/**
 * Derives the coverage verdict from what a scan did.
 *
 * Centralised so every producer of a {@link ScanCoverage} reaches the same
 * conclusion from the same facts, rather than each deciding for itself what
 * "complete" means.
 *
 * @param finished `false` when the scan was aborted or could not read part of the tree.
 */
export function deriveCoverageStatus(
  filesScanned: number,
  unscannedExtensions: readonly string[],
  finished: boolean
): CoverageStatus {
  if (!finished) return 'unknown';
  if (filesScanned === 0) return 'none';
  return unscannedExtensions.length > 0 ? 'partial' : 'complete';
}

/** One-line, human-readable rendering of a coverage verdict. Prose is derived from data, never the reverse. */
export function describeCoverageStatus(status: CoverageStatus): string {
  switch (status) {
    case 'complete':
      return 'every format Animoria can read was scanned';
    case 'partial':
      return 'some formats that can hold references were not scanned';
    case 'none':
      return 'no source files were scanned, so there is no reference evidence';
    case 'unknown':
      return 'the scan did not finish, so its coverage is unknown';
  }
}
