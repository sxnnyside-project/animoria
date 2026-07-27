import { describe, expect, it } from 'vitest';
import { renderFormatBadgeSvg } from '../../src/thumbnails/format-badge-renderer';
import type { AnimatedFormat } from '../../src/types/asset';

const FORMATS: AnimatedFormat[] = ['lottie', 'dotlottie', 'rive', 'gif', 'apng', 'animated-svg'];

describe('renderFormatBadgeSvg', () => {
  it.each(FORMATS)('renders a well-formed SVG document for %s', (format) => {
    const svg = renderFormatBadgeSvg(format, 256);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('width="256"');
    expect(svg).toContain('height="256"');
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('never references external resources', () => {
    for (const format of FORMATS) {
      const svg = renderFormatBadgeSvg(format, 128);
      expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
      expect(svg).not.toContain('<script');
    }
  });

  it('scales font size relative to badge size', () => {
    const small = renderFormatBadgeSvg('lottie', 32);
    const large = renderFormatBadgeSvg('lottie', 512);
    expect(small).not.toEqual(large);
  });
});
