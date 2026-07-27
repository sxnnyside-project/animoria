import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { YAMLException, load as parseYaml } from 'js-yaml';
import { logDebug } from '../logging/logger.js';
import { validateAnimoriaRcShape } from './config/animoriarc-schema.js';
import type { AnimoriaRcConfig, ConfigSchemaError } from './config/animoriarc-schema.js';

export type { AnimoriaRcConfig, ConfigSchemaError } from './config/animoriarc-schema.js';

/**
 * Candidate `.animoriarc` filenames, in the fixed order they are probed.
 *
 * The first candidate found on disk wins — later candidates are never
 * consulted, even if the first one fails to parse. This is what makes
 * discovery deterministic: a workspace with both `.animoriarc.json` and
 * `.animoriarc.yaml` always resolves to the same file, never one that
 * depends on directory-listing order.
 *
 * Extension-qualified names are probed before the bare `.animoriarc` so
 * that a team can be explicit about format; the bare name exists for
 * convenience and is content-sniffed (JSON attempted first, then YAML)
 * since its extension carries no format information.
 */
const CANDIDATE_FILENAMES: readonly string[] = [
  '.animoriarc.json',
  '.animoriarc.yaml',
  '.animoriarc.yml',
  '.animoriarc',
];

/** One problem encountered while locating or parsing a config file. */
export interface ConfigLoadDiagnostic {
  /** JSON-Pointer-like path within the document, or `""` for file-level problems. */
  readonly path: string;
  /** Human-readable, actionable description of the problem. */
  readonly message: string;
}

/**
 * The outcome of a {@link ConfigLoader.load} call.
 *
 * A discriminated union rather than a nullable return: callers are
 * forced to handle "no file present" (a normal, expected state — most
 * workspaces have no `.animoriarc` and that is not an error) separately
 * from "a file was present but broken" (which the user should be told
 * about, ideally with the exact reason).
 */
export type ConfigLoadResult =
  | { readonly status: 'not-found' }
  | {
      readonly status: 'invalid';
      readonly filePath: string;
      readonly diagnostics: readonly ConfigLoadDiagnostic[];
    }
  | { readonly status: 'loaded'; readonly filePath: string; readonly config: AnimoriaRcConfig };

/**
 * Locates and parses a workspace's `.animoriarc` file.
 *
 * ## Responsibility boundary
 * `ConfigLoader` owns exactly two things: **finding** the right file
 * among several accepted names, and **parsing** its bytes (JSON or
 * YAML) into a structurally-validated {@link AnimoriaRcConfig}. It does
 * not know what a "rule" is beyond "a key under `rules`" — turning that
 * config into running policy is `RulesEngine`'s job
 * (`../rules-engine.js`). Keeping these separate means a change to how
 * rules are authored never touches file discovery, and a change to
 * supported config file formats (e.g. adding TOML someday) never
 * touches rule evaluation.
 *
 * ## Never throws
 * Every failure mode — missing file, unreadable file, malformed JSON or
 * YAML, wrong structural shape — is reported through
 * {@link ConfigLoadResult}, never a thrown exception. A broken
 * `.animoriarc` must not prevent Animoria from activating; it should
 * simply mean governance rules aren't enforced until the user fixes the
 * file, with a clear diagnostic telling them what's wrong and where.
 *
 * ## Determinism
 * Given the same workspace filesystem state, `load()` always finds the
 * same file (see {@link CANDIDATE_FILENAMES} for the fixed probe order)
 * and always produces the same result for its contents.
 */
export class ConfigLoader {
  constructor(private readonly workspacePath: string) {}

  /**
   * Attempts to locate and parse this workspace's `.animoriarc`.
   *
   * @returns `{ status: 'not-found' }` if none of the candidate
   *   filenames exist; `{ status: 'invalid', ... }` if a candidate
   *   exists but could not be parsed or does not match the expected
   *   shape; `{ status: 'loaded', ... }` on success.
   */
  async load(): Promise<ConfigLoadResult> {
    for (const filename of CANDIDATE_FILENAMES) {
      const filePath = join(this.workspacePath, filename);
      const raw = await this._tryRead(filePath);
      if (raw === undefined) continue; // Candidate does not exist — try the next one.

      return this._parse(filePath, filename, raw);
    }

    return { status: 'not-found' };
  }

  private async _tryRead(filePath: string): Promise<string | undefined> {
    try {
      return await readFile(filePath, 'utf-8');
    } catch (err) {
      logDebug(
        'config-load',
        'ConfigLoader',
        'Candidate config file not readable, trying next candidate',
        {
          assetPath: filePath,
          reason: 'file does not exist or is not accessible',
          error: err,
          recovery: 'skipped to next candidate filename',
        }
      );
      return undefined;
    }
  }

  private _parse(filePath: string, filename: string, raw: string): ConfigLoadResult {
    const isExplicitlyJson = filename.endsWith('.json');
    const isExplicitlyYaml = filename.endsWith('.yaml') || filename.endsWith('.yml');

    let parseResult: { ok: true; document: unknown } | { ok: false; message: string };
    if (isExplicitlyJson) {
      parseResult = this._parseJson(raw);
    } else if (isExplicitlyYaml) {
      parseResult = this._parseYaml(raw);
    } else {
      // Bare ".animoriarc" carries no format hint in its extension —
      // sniff by attempting JSON first (the common case), falling back
      // to YAML so a bare file can still be authored in either format.
      const asJson = this._parseJson(raw);
      parseResult = asJson.ok ? asJson : this._parseYaml(raw);
    }

    if (!parseResult.ok) {
      return {
        status: 'invalid',
        filePath,
        diagnostics: [{ path: '', message: parseResult.message }],
      };
    }

    const shapeResult = validateAnimoriaRcShape(parseResult.document);
    if (!shapeResult.valid) {
      return {
        status: 'invalid',
        filePath,
        diagnostics: shapeResult.errors.map(toLoadDiagnostic),
      };
    }

    return { status: 'loaded', filePath, config: shapeResult.config };
  }

  private _parseJson(
    raw: string
  ): { ok: true; document: unknown } | { ok: false; message: string } {
    try {
      return { ok: true, document: JSON.parse(raw) };
    } catch (err) {
      return {
        ok: false,
        message: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private _parseYaml(
    raw: string
  ): { ok: true; document: unknown } | { ok: false; message: string } {
    try {
      return { ok: true, document: parseYaml(raw) };
    } catch (err) {
      const message =
        err instanceof YAMLException
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
      return { ok: false, message: `Invalid YAML: ${message}` };
    }
  }
}

function toLoadDiagnostic(error: ConfigSchemaError): ConfigLoadDiagnostic {
  return { path: error.path, message: error.message };
}
