import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Catches wiring typos (a bad fileMatch glob, a missing media.markdown path) that VS Code fails on silently at runtime.
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

  // The engine is the source of truth for rule ids: each `Rule::id` returns a string literal.
  const engineRuleIds = (): Set<string> => {
    const dir = resolve(ROOT, '../animoria-core-rust/src/governance/rules');
    const ids = new Set<string>();
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.rs'))) {
      const source = readFileSync(resolve(dir, file), 'utf-8');
      for (const match of source.matchAll(/fn id\(&self\) -> &str \{\s*"([a-z0-9-]+)"/g)) {
        ids.add(match[1] as string);
      }
    }
    return ids;
  };
  const schemaRuleIds = (): string[] => {
    const schema = JSON.parse(
      readFileSync(resolve(ROOT, manifest.contributes.jsonValidation[0].url), 'utf-8'),
    );
    return Object.keys(schema.properties.rules.properties);
  };

  it('every schema-listed rule id matches a real built-in rule', () => {
    // `no-duplicate-names` is the one documented compatibility stub: listed, but the engine has no such rule.
    const realIds = new Set([...engineRuleIds(), 'no-duplicate-names']);
    for (const ruleId of schemaRuleIds()) {
      expect(realIds.has(ruleId), ruleId).toBe(true);
    }
  });

  it('every built-in rule the engine registers is described by the schema', () => {
    const listed = new Set(schemaRuleIds());
    const ids = engineRuleIds();
    expect(ids.size).toBeGreaterThanOrEqual(8);
    for (const ruleId of ids) {
      expect(listed.has(ruleId), ruleId).toBe(true);
    }
  });

  it('every keybinding targets a registered command', () => {
    const commandIds = new Set(
      manifest.contributes.commands.map((c: { command: string }) => c.command),
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
      manifest.contributes.commands.map((c: { command: string }) => c.command),
    );
    // VS Code auto-registers a `<viewId>.focus` command for every declared view —
    // it is real even though it has no entry in `contributes.commands`.
    const viewIds = new Set(
      Object.values(manifest.contributes.views).flatMap((views: unknown) =>
        (views as { id: string }[]).map((v) => v.id),
      ),
    );

    const linkPattern = /\(command:([a-zA-Z0-9.]+)\)/g;
    for (const step of manifest.contributes.walkthroughs[0].steps) {
      for (const match of step.description.matchAll(linkPattern)) {
        const commandId: string = match[1];
        const isFocusCommand =
          commandId.endsWith('.focus') && viewIds.has(commandId.slice(0, -'.focus'.length));
        expect(
          commandIds.has(commandId) || isFocusCommand,
          `walkthrough step "${step.id}" links to unregistered command "${commandId}"`,
        ).toBe(true);
      }
    }
  });
});
