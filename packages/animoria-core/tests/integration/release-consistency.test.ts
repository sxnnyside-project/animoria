import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Release-artifact consistency, checked at build time rather than at publish time.
 *
 * ## Why this is not left to the release workflow alone
 * `release.yml` already verifies every version against the git tag — but it does
 * so on a tag push, which is the last possible moment to discover a mismatch and
 * the one where the cost is highest: the tag exists, the release is half-published,
 * and fixing it means a new tag. These assertions fail on an ordinary test run
 * instead, when the fix is a one-line edit.
 *
 * The failure this class of check exists to prevent is on record: the JetBrains
 * plugin version was a hardcoded literal nothing compared against anything, so
 * every release after the first republished the same version, the Marketplace
 * rejected it as a duplicate, and — because the publish step was
 * `continue-on-error` — the release reported success while the plugin silently
 * never updated.
 */
const REPO = resolve(process.cwd(), '../..');

const read = (relativePath: string) => readFileSync(resolve(REPO, relativePath), 'utf-8');
const json = (relativePath: string) => JSON.parse(read(relativePath));

describe('release consistency', () => {
  it('ships the same version from every published package', () => {
    const core = json('packages/animoria-core/package.json').version;
    const vscode = json('packages/animoria-vscode/package.json').version;

    expect(core).toMatch(/^\d+\.\d+\.\d+/);
    expect(vscode).toBe(core);
  });

  it('derives the JetBrains plugin version from the environment, never a literal', () => {
    const gradle = read('packages/animoria-jetbrains/build.gradle.kts');

    expect(gradle).toContain('ANIMORIA_VERSION');
    // A literal `version = "1.2.3"` is the exact defect that made every release
    // after the first a silent no-op.
    expect(gradle).not.toMatch(/^\s*version\s*=\s*"\d+\.\d+\.\d+"/m);
  });

  it('verifies every artifact against the tag before building anything', () => {
    const release = read('.github/workflows/release.yml');

    expect(release).toContain('verify-versions');
    expect(release).toContain('animoria-vscode/package.json');
    expect(release).toContain('animoria-core/package.json');
    expect(release).toContain('ANIMORIA_VERSION');
    // Build and publish must depend on the check, not run beside it.
    expect(release).toMatch(/needs:\s*verify-versions/);
  });

  it('never marks a publish step as continue-on-error', () => {
    const release = read('.github/workflows/release.yml');

    // A failed publish that reports success is worse than a failed release: the
    // team believes the version shipped.
    //
    // Matched as a YAML key rather than as raw text: the workflow's comments
    // deliberately name `continue-on-error` to explain why it was removed, and a
    // substring check would flag that explanation as the defect it describes.
    const activeKeys = release.split('\n').filter((line) => /^\s*continue-on-error\s*:/.test(line));

    expect(activeKeys).toEqual([]);
  });

  it('builds a native daemon for every platform the plugin claims to support', () => {
    const release = read('.github/workflows/release.yml');

    // The matrix is the supported-platform list. A triple missing here is a
    // platform where the plugin silently requires a system Node install.
    for (const runner of [
      'ubuntu-latest',
      'ubuntu-24.04-arm',
      'macos-latest',
      'macos-13',
      'windows-latest',
    ]) {
      expect(release, runner).toContain(runner);
    }
  });

  it('requires real macOS signing for a release rather than falling back to ad-hoc', () => {
    const release = read('.github/workflows/release.yml');
    const sea = read('packages/animoria-core/scripts/build-sea.mjs');

    expect(release).toContain('ANIMORIA_RELEASE_SIGNING: required');
    // The script must treat the required flag as fatal when credentials are
    // absent — an ad-hoc signature is blocked by Gatekeeper on every downloaded
    // copy, so silently producing one is shipping a daemon that cannot launch.
    expect(sea).toContain("ANIMORIA_RELEASE_SIGNING === 'required'");
    expect(sea).toMatch(/throw new Error\(\s*'Release signing is required/);
  });

  it('verifies the produced binary actually runs before publishing it', () => {
    const release = read('.github/workflows/release.yml');
    expect(release).toContain('--version');
  });

  it('keeps the migration workspace out of every published artifact', () => {
    // The migration directory is working material, not product documentation.
    const vsceIgnore = existsSync(resolve(REPO, 'packages/animoria-vscode/.vscodeignore'))
      ? read('packages/animoria-vscode/.vscodeignore')
      : '';
    const publishedDocs = [
      'README.md',
      'packages/animoria-core/README.md',
      'packages/animoria-vscode/README.md',
      'packages/animoria-jetbrains/README.md',
    ];

    for (const doc of publishedDocs) {
      expect(read(doc), doc).not.toContain('.migration');
    }
    expect(vsceIgnore).not.toContain('!.migration');
  });
});

describe('release gates — every release-critical step fails loudly', () => {
  it('marks no release-critical step `continue-on-error`', () => {
    const release = read('.github/workflows/release.yml');
    const code = release
      .split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .join('\n');

    // The original defect: the publish step swallowed its own failure, so a release
    // reported success while the Marketplace rejected the artifact and the plugin
    // silently stopped updating.
    expect(code).not.toContain('continue-on-error');
  });

  it('runs tests, typecheck and lint before publishing anything', () => {
    const release = read('.github/workflows/release.yml');
    for (const gate of ['pnpm test', 'pnpm typecheck', 'pnpm lint']) {
      expect(release, `${gate} must gate the release`).toContain(gate);
    }
  });

  it('asserts both hosts actually carry the shared UI bundle', () => {
    // A host without the bundle installs, launches, and renders an empty rectangle.
    // `verifyPlugin` does not catch it and neither does `vsce package`, so the
    // artifact is inspected directly.
    const release = read('.github/workflows/release.yml');
    expect(release).toContain('web/animoria-ui.global.js');
    expect(release).toContain('packages/animoria-vscode/media/animoria-ui.js');
  });

  it('no longer copies a directory nothing reads into the plugin jar', () => {
    // The build used to `cp apps/animoria-sandbox/dist/*` into the plugin's
    // resources. Nothing loaded it — the plugin rendered its own inline HTML — so
    // the jar shipped a directory of dead files while the claim that the shared
    // components were bundled stayed in the docs.
    const release = read('.github/workflows/release.yml');
    expect(release).not.toContain('animoria-sandbox/dist');
  });

  it('runs verifyPlugin in the release, not only on pull requests', () => {
    expect(read('.github/workflows/release.yml')).toContain('verifyPlugin');
  });
});
