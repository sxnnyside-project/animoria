import { describe, expect, it } from 'vitest';
import { hasInlineIgnoreDirective, lineMatchesAsset } from '../../src/usage/reference-patterns.js';

describe('hasInlineIgnoreDirective', () => {
  it('matches // animoria-ignore with and without a space after the slashes', () => {
    expect(hasInlineIgnoreDirective("const x = 'success.json'; // animoria-ignore")).toBe(true);
    expect(hasInlineIgnoreDirective("const x = 'success.json'; //animoria-ignore")).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(hasInlineIgnoreDirective('// ANIMORIA-IGNORE')).toBe(true);
  });

  it('does not match an unrelated comment', () => {
    expect(hasInlineIgnoreDirective("const x = 'success.json'; // TODO: rename")).toBe(false);
  });

  it('does not match a bare mention with no comment marker', () => {
    expect(hasInlineIgnoreDirective('animoria-ignore is a feature')).toBe(false);
  });
});

describe('lineMatchesAsset with an inline ignore directive', () => {
  it('suppresses an otherwise-matching line', () => {
    const line = "const x = require('./assets/success.json'); // animoria-ignore";

    expect(lineMatchesAsset(line, 'success.json', 'success', 'pattern')).toBe(false);
  });

  it('still matches the same line without the directive', () => {
    const line = "const x = require('./assets/success.json');";

    expect(lineMatchesAsset(line, 'success.json', 'success', 'pattern')).toBe(true);
  });

  it('suppresses a match under every strategy, not only "pattern"', () => {
    const line = 'success.json // animoria-ignore';

    expect(lineMatchesAsset(line, 'success.json', 'success', 'filename')).toBe(false);
    expect(lineMatchesAsset(line, 'success.json', 'success', 'stem')).toBe(false);
    expect(lineMatchesAsset(line, 'success.json', 'success', 'both')).toBe(false);
  });
});
