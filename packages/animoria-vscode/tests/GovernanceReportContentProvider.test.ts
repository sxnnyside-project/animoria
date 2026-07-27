import { describe, expect, it } from 'vitest';
import { GovernanceReportContentProvider } from '../src/extension.js';

/**
 * Regresses the "governance report opens twice" bug: `viewGovernanceReport`
 * previously called `vscode.workspace.openTextDocument({ content, ... })`
 * on every invocation, allocating a brand-new `untitled:` document — and
 * therefore a brand-new editor tab — each time, so pairing it with
 * `markdown.showPreview` opened both a raw source tab and a rendered
 * preview tab, stacking further on every repeat click. Serving content
 * through one fixed-identity provider instead means every call updates
 * the same underlying document, so VS Code reuses the existing tab.
 */
describe('GovernanceReportContentProvider', () => {
  it('returns the most recently set content', () => {
    const provider = new GovernanceReportContentProvider();

    provider.update('# First report');
    expect(provider.provideTextDocumentContent()).toBe('# First report');

    provider.update('# Second report');
    expect(provider.provideTextDocumentContent()).toBe('# Second report');
  });

  it('fires onDidChange on every update, so an already-open preview re-renders instead of a new tab opening', () => {
    const provider = new GovernanceReportContentProvider();
    const fired: unknown[] = [];
    provider.onDidChange((uri) => fired.push(uri));

    provider.update('# Report A');
    provider.update('# Report B');

    expect(fired).toHaveLength(2);
  });

  it('fires the exact same URI on every change — content updates in place rather than targeting a new document identity', () => {
    const provider = new GovernanceReportContentProvider();
    const uris: unknown[] = [];
    provider.onDidChange((uri) => uris.push(uri));

    provider.update('# First');
    provider.update('# Second');
    provider.update('# Third');

    expect(new Set(uris).size).toBe(1);
  });
});
