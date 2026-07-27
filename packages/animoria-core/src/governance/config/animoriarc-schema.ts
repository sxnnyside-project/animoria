/**
 * Structural definition of the `.animoriarc` configuration file, and the
 * outcome types produced while loading one.
 *
 * ## What "schema" means here
 * This module validates only the *envelope* of a config file — that the
 * parsed document is an object, and that its `rules` property (if
 * present) is itself a plain object mapping strings to arbitrary values.
 * It deliberately does **not** know that `max-file-size-kb` expects a
 * number or that `allowed-formats` expects an array of format names —
 * that per-rule shape validation belongs to each rule's own
 * `parseOptions` (see `../rules/types.js`). A schema that tried to also
 * validate rule-specific shapes would need to change every time a rule
 * was added, defeating the entire point of a pluggable rule registry.
 */

/** The validated, structural shape of a `.animoriarc` document. */
export interface AnimoriaRcConfig {
  /**
   * Raw, rule-specific configuration values keyed by rule id. Each
   * value is handed unmodified to that rule's `parseOptions` by
   * `RulesEngine` — this schema only guarantees the map itself is
   * well-formed, not that any individual entry is valid for its rule.
   */
  readonly rules: Readonly<Record<string, unknown>>;
}

/** A single structural problem found while validating a config document. */
export interface ConfigSchemaError {
  /**
   * A JSON-Pointer-like path to the offending value, e.g. `"rules"` or
   * `"rules.no-gif"`. Empty string means the problem is with the
   * document root.
   */
  readonly path: string;
  /** Human-readable description of what was expected and what was found. */
  readonly message: string;
}

/**
 * Validates that a parsed JSON/YAML document has the structural shape
 * expected of `.animoriarc`, without inspecting individual rule values.
 *
 * @param document - The result of `JSON.parse` or a YAML parse — anything,
 *   since the file's contents are untrusted until this function says
 *   otherwise.
 * @returns The validated {@link AnimoriaRcConfig} shape, or a list of
 *   structural errors. Never throws.
 */
export function validateAnimoriaRcShape(
  document: unknown
): { valid: true; config: AnimoriaRcConfig } | { valid: false; errors: ConfigSchemaError[] } {
  if (document === null || typeof document !== 'object' || Array.isArray(document)) {
    return {
      valid: false,
      errors: [
        {
          path: '',
          message: `Expected an object at the document root, got: ${typeName(document)}.`,
        },
      ],
    };
  }

  const root = document as Record<string, unknown>;

  if (!('rules' in root)) {
    return { valid: true, config: { rules: {} } };
  }

  const rules = root.rules;
  if (rules === null || typeof rules !== 'object' || Array.isArray(rules)) {
    return {
      valid: false,
      errors: [
        { path: 'rules', message: `Expected "rules" to be an object, got: ${typeName(rules)}.` },
      ],
    };
  }

  return { valid: true, config: { rules: rules as Record<string, unknown> } };
}

function typeName(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
