import { describe, expect, it } from 'vitest';
import { SvgAnimatedParser } from '../../src/parsers/svg-animated-parser';

const parser = new SvgAnimatedParser();

describe('SvgAnimatedParser.supports', () => {
  it('rejects a static SVG with no animation evidence — regression for Product Hardening Observation 1', () => {
    // A plain favicon/manual icon SVG. Previously accepted unconditionally
    // by `supports()`, which swept static SVGs into governance as if they
    // were animated assets with no way to exclude them.
    const staticSvg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="10"/></svg>'
    );
    expect(parser.supports('.svg', staticSvg)).toBe(false);
  });

  it('accepts an SVG containing SMIL animation elements', () => {
    const smilSvg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"><animate attributeName="r" to="20" dur="1s"/></circle></svg>'
    );
    expect(parser.supports('.svg', smilSvg)).toBe(true);
  });

  it('accepts an SVG containing CSS @keyframes animation', () => {
    const cssSvg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><style>@keyframes spin { to { transform: rotate(360deg); } }</style></svg>'
    );
    expect(parser.supports('.svg', cssSvg)).toBe(true);
  });

  it('rejects a non-SVG extension regardless of content', () => {
    const smilSvg = Buffer.from('<svg><animate attributeName="r" to="20"/></svg>');
    expect(parser.supports('.png', smilSvg)).toBe(false);
  });

  it('rejects content without an <svg> root tag', () => {
    expect(parser.supports('.svg', Buffer.from('not svg content'))).toBe(false);
  });
});
