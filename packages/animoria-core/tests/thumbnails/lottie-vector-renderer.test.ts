import { describe, expect, it } from 'vitest';
import { renderLottieVectorFrameSvg } from '../../src/thumbnails/lottie-vector-renderer';

const baseOptions = { width: 256, height: 256, sourceWidth: 512, sourceHeight: 512 };

describe('renderLottieVectorFrameSvg', () => {
  it('renders a filled rectangle shape layer', () => {
    const doc = {
      w: 512,
      h: 512,
      layers: [
        {
          ty: 4,
          ks: {
            p: { a: 0, k: [256, 256] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
          shapes: [
            {
              ty: 'gr',
              it: [
                { ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 8 } },
                { ty: 'fl', c: { a: 0, k: [1, 0, 0] } },
              ],
            },
          ],
        },
      ],
    };

    const svg = renderLottieVectorFrameSvg(doc, baseOptions);

    expect(svg).not.toBeNull();
    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
    expect(svg).toContain('rgb(255, 0, 0)');
  });

  it('renders an ellipse shape layer', () => {
    const doc = {
      w: 512,
      h: 512,
      layers: [
        {
          ty: 4,
          ks: {},
          shapes: [
            {
              ty: 'gr',
              it: [
                { ty: 'el', p: { a: 0, k: [256, 256] }, s: { a: 0, k: [200, 200] } },
                { ty: 'fl', c: { a: 0, k: [0, 1, 0] } },
              ],
            },
          ],
        },
      ],
    };

    const svg = renderLottieVectorFrameSvg(doc, baseOptions);

    expect(svg).not.toBeNull();
    expect(svg).toContain('<ellipse');
  });

  it('resolves keyframed properties using the first keyframe start value', () => {
    const doc = {
      w: 512,
      h: 512,
      layers: [
        {
          ty: 4,
          ks: { p: { a: 1, k: [{ s: [100, 100] }, { s: [200, 200] }] } },
          shapes: [
            {
              ty: 'gr',
              it: [
                { ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [10, 10] } },
                { ty: 'fl', c: { a: 0, k: [0, 0, 1] } },
              ],
            },
          ],
        },
      ],
    };

    const svg = renderLottieVectorFrameSvg(doc, baseOptions);
    expect(svg).not.toBeNull();
  });

  it('returns null when no layers are present', () => {
    expect(renderLottieVectorFrameSvg({ w: 512, h: 512, layers: [] }, baseOptions)).toBeNull();
  });

  it('returns null when a layer has no renderable shapes', () => {
    const doc = { w: 512, h: 512, layers: [{ ty: 4, ip: 0, op: 90 }] };
    expect(renderLottieVectorFrameSvg(doc, baseOptions)).toBeNull();
  });

  it('returns null when an image layer is present', () => {
    const doc = { w: 512, h: 512, layers: [{ ty: 2 }] };
    expect(renderLottieVectorFrameSvg(doc, baseOptions)).toBeNull();
  });

  it('returns null when a text layer is present', () => {
    const doc = { w: 512, h: 512, layers: [{ ty: 5 }] };
    expect(renderLottieVectorFrameSvg(doc, baseOptions)).toBeNull();
  });

  it('returns null when an unresolvable precomp layer (no refId, no matching asset) is present', () => {
    const doc = { w: 512, h: 512, layers: [{ ty: 0 }] };
    expect(renderLottieVectorFrameSvg(doc, baseOptions)).toBeNull();
  });

  /**
   * Real, professionally-authored Lottie files are almost always
   * structured with actual shape content nested inside precomps for
   * organization — a top-level precomp layer used to abort the entire
   * render unconditionally. Verified against real files from lottie-web's
   * demo assets: this single fix took real-world thumbnail success from
   * 2/16 files to 13/16 before the solid-layer fix below, and 16/16 after.
   */
  it('walks into a precomp to render shapes nested inside it', () => {
    const doc = {
      w: 512,
      h: 512,
      assets: [
        {
          id: 'comp_0',
          layers: [
            {
              ty: 4,
              ks: {
                p: { a: 0, k: [0, 0] },
                s: { a: 0, k: [100, 100] },
                r: { a: 0, k: 0 },
                o: { a: 0, k: 100 },
              },
              shapes: [
                {
                  ty: 'gr',
                  it: [
                    { ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [50, 50] } },
                    { ty: 'fl', c: { a: 0, k: [1, 0, 0] } },
                  ],
                },
              ],
            },
          ],
        },
      ],
      layers: [
        {
          ty: 0,
          refId: 'comp_0',
          ks: {
            p: { a: 0, k: [256, 256] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
        },
      ],
    };

    const svg = renderLottieVectorFrameSvg(doc, baseOptions);

    expect(svg).not.toBeNull();
    expect(svg).toContain('<rect');
    expect(svg).toContain('rgb(255, 0, 0)');
  });

  it('does not hang on a cyclic precomp reference', () => {
    const doc = {
      w: 512,
      h: 512,
      assets: [
        { id: 'comp_a', layers: [{ ty: 0, refId: 'comp_b', ks: {} }] },
        { id: 'comp_b', layers: [{ ty: 0, refId: 'comp_a', ks: {} }] },
      ],
      layers: [{ ty: 0, refId: 'comp_a', ks: {} }],
    };

    expect(renderLottieVectorFrameSvg(doc, baseOptions)).toBeNull();
  });

  it('renders a solid color layer (ty: 1) as a filled rect spanning its declared width/height', () => {
    const doc = {
      w: 512,
      h: 512,
      layers: [
        {
          ty: 1,
          sc: '#ff8800',
          sw: 512,
          sh: 512,
          ks: {
            p: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
        },
      ],
    };

    const svg = renderLottieVectorFrameSvg(doc, baseOptions);

    expect(svg).not.toBeNull();
    expect(svg).toContain('<rect');
    expect(svg).toContain('fill="#ff8800"');
  });

  it('skips a layer type it does not model (e.g. a text layer) while still rendering the rest of the document', () => {
    // Previously a single image/text layer anywhere in the document
    // aborted the *entire* render, even when every other layer was
    // perfectly renderable.
    const doc = {
      w: 512,
      h: 512,
      layers: [
        { ty: 5 }, // text layer — not modeled
        {
          ty: 4,
          ks: {
            p: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
          shapes: [
            {
              ty: 'gr',
              it: [
                { ty: 'el', p: { a: 0, k: [256, 256] }, s: { a: 0, k: [100, 100] } },
                { ty: 'fl', c: { a: 0, k: [0, 0, 1] } },
              ],
            },
          ],
        },
      ],
    };

    const svg = renderLottieVectorFrameSvg(doc, baseOptions);

    expect(svg).not.toBeNull();
    expect(svg).toContain('rgb(0, 0, 255)');
  });

  it('returns null when a bezier shape item has no point data', () => {
    const doc = {
      w: 512,
      h: 512,
      layers: [
        {
          ty: 4,
          shapes: [{ ty: 'gr', it: [{ ty: 'sh' }, { ty: 'fl', c: { a: 0, k: [1, 1, 1] } }] }],
        },
      ],
    };

    expect(renderLottieVectorFrameSvg(doc, baseOptions)).toBeNull();
  });

  it('renders a bezier path (sh) shape as an SVG <path> — regression for Product Hardening Observation 6', () => {
    // `sh` is the primitive real-world (After Effects-exported) Lottie
    // files almost always use — rect/ellipse are rare in practice.
    // Before this fix, any `sh` item made the whole render bail out to
    // the format-badge fallback, which is what made thumbnails "always
    // show the fallback, never the real preview" for nearly all real
    // Lottie assets.
    const doc = {
      w: 512,
      h: 512,
      layers: [
        {
          ty: 4,
          ks: {
            p: { a: 0, k: [256, 256] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
          shapes: [
            {
              ty: 'gr',
              it: [
                {
                  ty: 'sh',
                  ks: {
                    a: 0,
                    k: {
                      c: true,
                      v: [
                        [0, -50],
                        [50, 0],
                        [0, 50],
                        [-50, 0],
                      ],
                      i: [
                        [0, 0],
                        [0, 0],
                        [0, 0],
                        [0, 0],
                      ],
                      o: [
                        [0, 0],
                        [0, 0],
                        [0, 0],
                        [0, 0],
                      ],
                    },
                  },
                },
                { ty: 'fl', c: { a: 0, k: [0, 1, 0] } },
              ],
            },
          ],
        },
      ],
    };

    const svg = renderLottieVectorFrameSvg(doc, baseOptions);

    expect(svg).not.toBeNull();
    expect(svg).toContain('<path');
    expect(svg).toContain('rgb(0, 255, 0)');
  });

  it('approximates a gradient fill (gf) as a solid average color instead of treating it as unsupported', () => {
    const doc = {
      w: 512,
      h: 512,
      layers: [
        {
          ty: 4,
          ks: {
            p: { a: 0, k: [256, 256] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
          shapes: [
            {
              ty: 'gr',
              it: [
                { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [200, 200] } },
                {
                  ty: 'gf',
                  g: { p: 2, k: { a: 0, k: [0, 1, 0, 0, 1, 0, 0, 1] } }, // red -> blue
                  s: { a: 0, k: [0, -100] },
                  e: { a: 0, k: [0, 100] },
                  t: 1,
                },
              ],
            },
          ],
        },
      ],
    };

    const svg = renderLottieVectorFrameSvg(doc, baseOptions);

    expect(svg).not.toBeNull();
    expect(svg).toContain('<ellipse');
    // Average of pure red (1,0,0) and pure blue (0,0,1) is (0.5,0,0.5).
    expect(svg).toContain('rgb(128, 0, 128)');
  });

  it('renders a stroke (st) with fill="none" when the shape has no fill', () => {
    const doc = {
      w: 512,
      h: 512,
      layers: [
        {
          ty: 4,
          ks: {
            p: { a: 0, k: [256, 256] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
          shapes: [
            {
              ty: 'gr',
              it: [
                { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [200, 200] } },
                { ty: 'st', c: { a: 0, k: [0, 0, 0] }, w: { a: 0, k: 4 } },
              ],
            },
          ],
        },
      ],
    };

    const svg = renderLottieVectorFrameSvg(doc, baseOptions);

    expect(svg).not.toBeNull();
    expect(svg).toContain('fill="none"');
    expect(svg).toContain('stroke="rgb(0, 0, 0)"');
  });

  it('skips a shape using an unsupported feature (repeater) instead of discarding the whole render', () => {
    // Before this fix, a single unsupported shape item anywhere in the
    // document aborted the ENTIRE render — a 20-shape illustration with
    // one repeater rendered nothing at all, falling back to the generic
    // badge even though almost everything in it was renderable.
    const doc = {
      w: 512,
      h: 512,
      layers: [
        {
          ty: 4,
          nm: 'renderable',
          ks: {
            p: { a: 0, k: [256, 256] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
          shapes: [
            {
              ty: 'gr',
              it: [
                { ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [50, 50] } },
                { ty: 'fl', c: { a: 0, k: [1, 0, 0] } },
              ],
            },
          ],
        },
        {
          ty: 4,
          nm: 'has-repeater',
          ks: {
            p: { a: 0, k: [256, 256] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
          shapes: [
            {
              ty: 'gr',
              it: [
                { ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [10, 10] } },
                { ty: 'rp', c: { a: 0, k: 5 } },
                { ty: 'fl', c: { a: 0, k: [0, 0, 1] } },
              ],
            },
          ],
        },
      ],
    };

    const svg = renderLottieVectorFrameSvg(doc, baseOptions);

    expect(svg).not.toBeNull();
    expect(svg).toContain('rgb(255, 0, 0)'); // the renderable layer survived
  });

  it('returns null for non-object input', () => {
    expect(renderLottieVectorFrameSvg(null, baseOptions)).toBeNull();
    expect(renderLottieVectorFrameSvg('not json', baseOptions)).toBeNull();
  });
});
