import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Platform-citizenship checks on `package.json` (V5).
 *
 * ## What these guard
 * A JSON Schema, a walkthrough and keybindings are only real if they are wired up
 * correctly — a typo in a `fileMatch` glob or a `media.markdown` path that does not
 * exist fails silently at runtime (VS Code logs a warning to its own output channel,
 * which nobody reads). These tests catch that class of mistake at build time instead.
 */
const ROOT = resolve(__dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'));

describe('package.json — platform citizenship (V5)', () => {
  it('activates on exactly one event: onStartupFinished', () => {
    // `workspaceContains:**/*.json` used to sit alongside this and did nothing —
    // `onStartupFinished` already fires unconditionally for every window, so the
    // glob only cost VS Code a startup-time filesystem scan for a result nothing
    // consumed.
    expect(manifest.activationEvents).toEqual(['onStartupFinished']);
  });

  it('validates .animoriarc.json against a real schema file', () => {
    const entries = manifest.contributes.jsonValidation;
    expect(entries).toHaveLength(1);
    expect(entries[0].fileMatch).toBe('**/.animoriarc.json');

    const schemaPath = resolve(ROOT, entries[0].url);
    expect(existsSync(schemaPath), schemaPath).toBe(true);

    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    expect(schema.properties.rules.properties).toHaveProperty('no-gif');
    expect(schema.properties.rules.properties).toHaveProperty('no-duplicate-content');
    expect(schema.properties.rules.properties).toHaveProperty('max-file-size-kb');
    expect(schema.properties.rules.properties).toHaveProperty('allowed-formats');
  });

  it('every schema-listed rule id matches a real built-in rule', async () => {
    const { createDefaultRuleRegistry } = await import('@animoria/core');
    const realIds = new Set(
      createDefaultRuleRegistry()
        .list()
        .map((r: { id: string }) => r.id)
    );

    const schema = JSON.parse(
      readFileSync(resolve(ROOT, manifest.contributes.jsonValidation[0].url), 'utf-8')
    );
    for (const ruleId of Object.keys(schema.properties.rules.properties)) {
      expect(realIds.has(ruleId), ruleId).toBe(true);
    }
  });

  it('every keybinding targets a registered command', () => {
    const commandIds = new Set(
      manifest.contributes.commands.map((c: { command: string }) => c.command)
    );
    for (const binding of manifest.contributes.keybindings) {
      expect(commandIds.has(binding.command), binding.command).toBe(true);
    }
  });

  it('every keybinding is scoped to the Animoria view, not global', () => {
    // An unscoped keybinding fights every other extension and every built-in
    // command for the same chord. Every binding here must name the view it
    // requires focus on.
    for (const binding of manifest.contributes.keybindings) {
      expect(binding.when, binding.command).toContain('animoria.gallery');
    }
  });

  it('declares one walkthrough with every media file present on disk', () => {
    const walkthroughs = manifest.contributes.walkthroughs;
    expect(walkthroughs).toHaveLength(1);
    expect(walkthroughs[0].steps.length).toBeGreaterThanOrEqual(5);

    for (const step of walkthroughs[0].steps) {
      const mediaPath = resolve(ROOT, step.media.markdown);
      expect(existsSync(mediaPath), `${step.id}: ${mediaPath}`).toBe(true);
    }
  });

  it('every command: link inside walkthrough descriptions is a real command', () => {
    const commandIds = new Set(
      manifest.contributes.commands.map((c: { command: string }) => c.command)
    );
    // VS Code auto-registers a `<viewId>.focus` command for every declared view —
    // it is real even though it has no entry in `contributes.commands`.
    const viewIds = new Set(
      Object.values(manifest.contributes.views).flatMap((views: unknown) =>
        (views as { id: string }[]).map((v) => v.id)
      )
    );

    const linkPattern = /\(command:([a-zA-Z0-9.]+)\)/g;
    for (const step of manifest.contributes.walkthroughs[0].steps) {
      for (const match of step.description.matchAll(linkPattern)) {
        const commandId: string = match[1];
        const isFocusCommand =
          commandId.endsWith('.focus') && viewIds.has(commandId.slice(0, -'.focus'.length));
        expect(
          commandIds.has(commandId) || isFocusCommand,
          `walkthrough step "${step.id}" links to unregistered command "${commandId}"`
        ).toBe(true);
      }
    }
  });
});
