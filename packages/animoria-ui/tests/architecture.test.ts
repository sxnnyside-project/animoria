import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The gates that make "shared UI" true rather than aspirational.
 *
 * Each one corresponds to a specific failure the audit found. They are asserted here,
 * in the package they constrain, so a violation fails the package's own build rather
 * than surfacing as a broken IDE later.
 */

const SRC = fileURLToPath(new URL('../src', import.meta.url));

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const FILES = walk(SRC);
const TS_FILES = FILES.filter((f) => extname(f) === '.ts');
const CSS_FILES = FILES.filter((f) => extname(f) === '.css');

function read(file: string): { rel: string; source: string } {
  return { rel: relative(SRC, file), source: readFileSync(file, 'utf8') };
}

/**
 * Blanks every comment while preserving line numbering, so a violation still reports
 * the line it is on. Handles both `/* … *​/` (across lines) and `//` (to end of line).
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/\/\/.*$/gm, '');
}

/** Import specifiers only — a host name inside a comment explaining the ban is fine. */
function importSpecifiers(raw: string): readonly string[] {
  // Comments first. The `[\s\S]*?` between `import` and `from` spans lines, so a
  // doc comment containing the words "…from \"somewhere\"" was reported as a
  // forbidden import — a gate that fails on documentation teaches people to write
  // less of it.
  const source = stripComments(raw);
  const found: string[] = [];
  const pattern = /(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null = pattern.exec(source);
  while (match !== null) {
    if (match[1]) found.push(match[1]);
    match = pattern.exec(source);
  }
  return found;
}

describe('@animoria/ui — host independence', () => {
  it('imports no host or platform module', () => {
    // `vscode` and the IntelliJ packages are the obvious ones. `node:` is here too:
    // a UI package that can read the filesystem is one commit from being a host, and
    // it would immediately stop loading in a webview.
    const forbidden = [/^vscode$/, /^node:/, /^com\.intellij/, /^fs$/, /^path$/, /^child_process$/];

    const violations: string[] = [];
    for (const file of TS_FILES) {
      const { rel, source } = read(file);
      for (const specifier of importSpecifiers(source)) {
        if (forbidden.some((p) => p.test(specifier))) {
          violations.push(`${rel} imports "${specifier}"`);
        }
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });

  it('depends only on @animoria/core, lit, and itself', () => {
    const allowedExternal = [/^@animoria\/core/, /^lit/];
    const violations: string[] = [];

    for (const file of TS_FILES) {
      const { rel, source } = read(file);
      for (const specifier of importSpecifiers(source)) {
        if (specifier.startsWith('.')) continue;
        if (allowedExternal.some((p) => p.test(specifier))) continue;
        violations.push(`${rel} imports "${specifier}"`);
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });
});

describe('@animoria/ui — no host theme identifiers', () => {
  it('never names a host CSS variable', () => {
    // The precise defect this replaces: `theme-bridge.css` defined every
    // `--animoria-*` token in terms of a `--vscode-*` variable, so the abstraction
    // whose purpose was removing host names was written in host names — and the
    // JetBrains plugin emitted `--vscode-*` from JBColor values to satisfy it.
    const forbidden = /--vscode-|--jb-|--intellij-|JBColor|darcula/i;
    const violations: string[] = [];

    for (const file of [...TS_FILES, ...CSS_FILES]) {
      const { rel, source } = read(file);
      // A comment may name the thing it forbids — that is how the ban is explained,
      // and both `tokens.css` and this test do exactly that. Block comments are
      // blanked across lines (preserving line numbers) before the check, so a
      // multi-line rationale cannot trip the rule it is documenting.
      const code = stripComments(source);
      code.split('\n').forEach((line, index) => {
        if (forbidden.test(line)) violations.push(`${rel}:${index + 1}  ${line.trim()}`);
      });
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });

  it('loads no remote font or stylesheet', () => {
    // The old token file began with an `@import` of Google Fonts, which a VS Code
    // webview CSP blocks and an offline JCEF cannot reach — so the intended typeface
    // silently never applied in either IDE.
    const violations: string[] = [];
    for (const file of [...TS_FILES, ...CSS_FILES]) {
      const { rel, source } = read(file);
      if (/@import\s+url\(\s*["']?https?:/i.test(source)) violations.push(`${rel}: remote @import`);
      if (/https?:\/\/fonts\./i.test(source)) violations.push(`${rel}: remote font host`);
    }
    expect(violations, violations.join('\n')).toEqual([]);
  });
});

describe('@animoria/ui — no governance computation', () => {
  it('never classifies an asset from a reference count', () => {
    // Every one of these is a real line that existed in a client: the sandbox
    // preview labelled `refs >= 10` as a deleted category, its cleanup panel
    // decided duplicates by testing whether a filename contained "copy", and the
    // VS Code planner derived confidence from `referenceCount === 0`.
    const patterns: readonly [RegExp, string][] = [
      [/referenceCount\s*[<>]=?\s*\d/, 'thresholds a reference count'],
      [/refs\s*[<>]=?\s*\d/, 'thresholds a reference count'],
      [/\.name\.includes\(\s*['"]copy/i, 'infers duplication from a filename'],
      [/confidence\s*=\s*['"](certain|high|moderate|low)['"]/, 'asserts a confidence literal'],
      [/score\s*[+\-]\s*delta/i, 'derives a health score'],
    ];

    const violations: string[] = [];
    for (const file of TS_FILES) {
      const { rel, source } = read(file);
      source.split('\n').forEach((line, index) => {
        const code = line.replace(/(\/\/|\*).*$/, '');
        for (const [pattern, why] of patterns) {
          if (pattern.test(code)) violations.push(`${rel}:${index + 1} ${why}: ${line.trim()}`);
        }
      });
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });

  it('imports no retired governance type', () => {
    const retired = [
      'RuleEngineReport',
      'GovernanceAnalyzer',
      'GovernanceCategory',
      'GovernanceIssueData',
      'GovernanceResultData',
      'GovernanceReport',
      'WorkspaceIndexSnapshot',
    ];

    const violations: string[] = [];
    for (const file of TS_FILES) {
      const { rel, source } = read(file);
      for (const specifier of retired) {
        if (new RegExp(`\\b${specifier}\\b`).test(source.replace(/\/\*[\s\S]*?\*\//g, ''))) {
          violations.push(`${rel} references retired type "${specifier}"`);
        }
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });
});
