/**
 * Browserless, dependency-free renderer that turns the *static* shape
 * content of a Lottie (Bodymovin) document into a single SVG frame — no
 * Chromium process, no `lottie-web` playback.
 *
 * Supports: shape layers (`ty: 4`), walking into precomp layers (`ty: 0`)
 * recursively; rect/ellipse/bezier-path geometry; solid and (as an
 * averaged solid-color approximation) gradient fills/strokes; nested
 * shape groups; keyframed properties approximated at their first
 * keyframe. Anything it can't render (an image/text layer, a repeater,
 * a trim path, ...) is skipped individually rather than discarding the
 * whole document — only a document with *zero* renderable content falls
 * through to the caller's badge fallback.
 */

interface LottieVector2D {
  x: number;
  y: number;
}

interface StrokePaint {
  color: string;
  width: number;
}

interface RenderableShape {
  kind: 'rect' | 'ellipse' | 'path';
  center: LottieVector2D;
  size: LottieVector2D;
  cornerRadius: number;
  fill: string | null;
  stroke: StrokePaint | null;
  /** Present only when `kind === 'path'`. */
  bezier?: BezierPath;
}

/** A Lottie bezier shape (`sh`), in the shape's local (pre-transform) coordinate space. */
interface BezierPath {
  closed: boolean;
  vertices: LottieVector2D[];
  /** Relative offset from each vertex to its incoming control point. */
  inTangents: LottieVector2D[];
  /** Relative offset from each vertex to its outgoing control point. */
  outTangents: LottieVector2D[];
}

/** Raw Lottie animatable property: either a static value or a keyframe list. */
type AnimatableProperty<T> = { a?: 0 | 1; k: T | Array<{ s?: T }> };

/**
 * Options controlling how the still frame is rendered.
 */
export interface LottieVectorRenderOptions {
  /** Output canvas width, in pixels. */
  width: number;
  /** Output canvas height, in pixels. */
  height: number;
  /** Source Lottie composition width (the `w` field). */
  sourceWidth: number;
  /** Source Lottie composition height (the `h` field). */
  sourceHeight: number;
}

/**
 * Attempts to render the first supported frame of a Lottie document as SVG.
 *
 * @param animationData - Parsed Lottie JSON (already validated as Lottie by
 *   the caller — this function does not re-validate document structure).
 * @param options - Target output dimensions and source composition size,
 *   used to scale shape coordinates into the output viewport.
 * @returns A complete `<svg>...</svg>` string, or `null` if the document
 *   contains no renderable shapes or relies on an unsupported feature.
 */
const MAX_PRECOMP_DEPTH = 4;

export function renderLottieVectorFrameSvg(
  animationData: unknown,
  options: LottieVectorRenderOptions
): string | null {
  if (animationData === null || typeof animationData !== 'object') return null;
  const doc = animationData as Record<string, unknown>;
  const layers = Array.isArray(doc.layers) ? (doc.layers as Record<string, unknown>[]) : [];
  if (layers.length === 0) return null;

  const rawAssets = Array.isArray(doc.assets) ? (doc.assets as Record<string, unknown>[]) : [];
  const assetsById = new Map<string, Record<string, unknown>>();
  for (const asset of rawAssets) {
    const id = asset.id;
    if (typeof id === 'string') assetsById.set(id, asset);
  }

  const scaleX = options.width / options.sourceWidth;
  const scaleY = options.height / options.sourceHeight;
  const identityTransform: LayerTransform = {
    position: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    rotationDegrees: 0,
    opacityPercent: 100,
  };

  const elements: string[] = [];
  collectLayerElements(
    layers,
    assetsById,
    identityTransform,
    0,
    new Set(),
    scaleX,
    scaleY,
    elements
  );

  if (elements.length === 0) return null;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}">${elements.join('')}</svg>`;
}

/**
 * Walks a layer list, appending renderable SVG elements to `elements` in
 * place. Handles the three layer types that matter for a still-frame
 * thumbnail:
 * - Shape layers (`ty: 4`) — geometry is extracted and rendered directly.
 * - Precomp layers (`ty: 0`) — resolved against `assetsById` and walked
 *   into recursively, composing the precomp layer's own transform with
 *   its parent's, so nested shapes render in the right place and scale.
 *   Bounded by `MAX_PRECOMP_DEPTH` and `visitedComps` (cycle-safe).
 * - Everything else (image/text/null/solid layers, an unresolvable
 *   precomp) — skipped individually, not treated as a reason to abandon
 *   the whole render. A single image or text layer used to abort the
 *   entire document even when every other layer was perfectly
 *   renderable; professionally-authored Lottie files routinely mix a
 *   text caption or a logo image layer in among otherwise-vector content,
 *   so that all-or-nothing rule discarded far more real thumbnails than
 *   it protected.
 */
function collectLayerElements(
  layers: readonly Record<string, unknown>[],
  assetsById: ReadonlyMap<string, Record<string, unknown>>,
  parentTransform: LayerTransform,
  depth: number,
  visitedComps: ReadonlySet<string>,
  scaleX: number,
  scaleY: number,
  elements: string[]
): void {
  for (const layer of layers) {
    const layerType = typeof layer.ty === 'number' ? (layer.ty as number) : -1;

    if (layerType === 0) {
      if (depth >= MAX_PRECOMP_DEPTH) continue;
      const refId = layer.refId;
      if (typeof refId !== 'string' || visitedComps.has(refId)) continue;

      const comp = assetsById.get(refId);
      const nestedLayers =
        comp && Array.isArray(comp.layers) ? (comp.layers as Record<string, unknown>[]) : null;
      if (!nestedLayers) continue;

      const composed = composeTransform(parentTransform, readTransform(layer.ks));
      const nextVisited = new Set(visitedComps);
      nextVisited.add(refId);
      collectLayerElements(
        nestedLayers,
        assetsById,
        composed,
        depth + 1,
        nextVisited,
        scaleX,
        scaleY,
        elements
      );
      continue;
    }

    if (layerType === 1) {
      // Solid color layer — a flat rect spanning the layer's declared
      // width/height (`sw`/`sh`), positioned at the layer's transform
      // origin. Common as a background fill; trivial to render exactly.
      const layerTransform = composeTransform(parentTransform, readTransform(layer.ks));
      const width = typeof layer.sw === 'number' ? (layer.sw as number) : 0;
      const height = typeof layer.sh === 'number' ? (layer.sh as number) : 0;
      const color = typeof layer.sc === 'string' ? (layer.sc as string) : null;
      if (width > 0 && height > 0 && color) {
        const svgShape = toSvgElement(
          {
            kind: 'rect',
            center: { x: width / 2, y: height / 2 },
            size: { x: width, y: height },
            cornerRadius: 0,
            fill: color,
            stroke: null,
          },
          layerTransform,
          scaleX,
          scaleY
        );
        if (svgShape !== null) elements.push(svgShape);
      }
      continue;
    }

    if (layerType !== 4) continue; // Only shape layers contribute visuals directly.

    const layerTransform = composeTransform(parentTransform, readTransform(layer.ks));
    const groups = Array.isArray(layer.shapes) ? (layer.shapes as Record<string, unknown>[]) : [];

    for (const shape of extractRenderableShapes(groups)) {
      const svgShape = toSvgElement(shape, layerTransform, scaleX, scaleY);
      if (svgShape === null) continue; // Unsupported shape — skip it, keep the rest.
      elements.push(svgShape);
    }
  }
}

/**
 * Composes a child layer's transform with its parent's (the precomp
 * layer that contains it, or the identity transform at the document
 * root). An approximation, not a true 2D affine composition — rotation
 * is summed rather than applied to the child's position, which is
 * inaccurate for a rotated precomp containing off-center children. That
 * case is rare enough, and this is a still-frame thumbnail approximation
 * throughout, that the added complexity of a full matrix composition
 * isn't worth it here.
 */
function composeTransform(parent: LayerTransform, child: LayerTransform): LayerTransform {
  return {
    position: {
      x: parent.position.x + child.position.x * parent.scale.x,
      y: parent.position.y + child.position.y * parent.scale.y,
    },
    scale: { x: parent.scale.x * child.scale.x, y: parent.scale.y * child.scale.y },
    rotationDegrees: parent.rotationDegrees + child.rotationDegrees,
    opacityPercent: (parent.opacityPercent * child.opacityPercent) / 100,
  };
}

interface LayerTransform {
  position: LottieVector2D;
  scale: LottieVector2D;
  rotationDegrees: number;
  opacityPercent: number;
}

function readTransform(ks: unknown): LayerTransform {
  const t = (ks ?? {}) as Record<string, unknown>;
  const position = readVector2D(t.p, { x: 0, y: 0 });
  const scalePercent = readVector2D(t.s, { x: 100, y: 100 });
  return {
    position,
    scale: { x: scalePercent.x / 100, y: scalePercent.y / 100 },
    rotationDegrees: readScalar(t.r, 0),
    opacityPercent: readScalar(t.o, 100),
  };
}

function readVector2D(prop: unknown, fallback: LottieVector2D): LottieVector2D {
  const value = readAnimatableValue<number[]>(prop);
  if (!Array.isArray(value) || value.length < 2) return fallback;
  return { x: value[0] ?? fallback.x, y: value[1] ?? fallback.y };
}

function readScalar(prop: unknown, fallback: number): number {
  const value = readAnimatableValue<number>(prop);
  return typeof value === 'number' ? value : fallback;
}

/**
 * Resolves a Lottie animatable property to a single representative value.
 * Static properties (`a: 0`) return `k` directly. Keyframed properties
 * (`a: 1`) return the first keyframe's start value (`k[0].s`) — an
 * approximation acceptable for a still-frame thumbnail, not for animation.
 */
function readAnimatableValue<T>(prop: unknown): T | undefined {
  if (prop === null || typeof prop !== 'object') return undefined;
  const p = prop as AnimatableProperty<T>;
  if (p.a === 1 && Array.isArray(p.k)) {
    const first = p.k[0] as { s?: T } | undefined;
    return first?.s;
  }
  return p.k as T;
}

/** Raw shape data as it appears in a Lottie `sh` item's `ks` property. */
interface RawBezierShapeData {
  c?: boolean;
  i?: number[][];
  o?: number[][];
  v?: number[][];
}

function toPoints(raw: number[][] | undefined): LottieVector2D[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => ({ x: p[0] ?? 0, y: p[1] ?? 0 }));
}

/**
 * Resolves a Lottie `sh` item's animatable shape property to a
 * {@link BezierPath}, or `null` if it isn't in the expected shape.
 */
function readBezierPath(prop: unknown): BezierPath | null {
  const raw = readAnimatableValue<RawBezierShapeData>(prop);
  if (!raw || typeof raw !== 'object') return null;

  const vertices = toPoints(raw.v);
  if (vertices.length === 0) return null;

  return {
    closed: raw.c === true,
    vertices,
    inTangents: toPoints(raw.i),
    outTangents: toPoints(raw.o),
  };
}

function extractRenderableShapes(items: Record<string, unknown>[]): RenderableShape[] {
  const shapes: RenderableShape[] = [];
  let pendingFill: string | null = null;
  let pendingStroke: StrokePaint | null = null;

  // Lottie groups list children in paint order; a paint style applies to
  // geometry declared *before* it in the same group array.
  const geometryBuffer: Omit<RenderableShape, 'fill' | 'stroke'>[] = [];

  for (const item of items) {
    const type = typeof item.ty === 'string' ? (item.ty as string) : '';

    if (type === 'gr') {
      const nested = Array.isArray(item.it) ? (item.it as Record<string, unknown>[]) : [];
      shapes.push(...extractRenderableShapes(nested));
      continue;
    }

    if (type === 'rc') {
      geometryBuffer.push({
        kind: 'rect',
        center: readVector2D(item.p, { x: 0, y: 0 }),
        size: readVector2D(item.s, { x: 0, y: 0 }),
        cornerRadius: readScalar(item.r, 0),
      });
      continue;
    }

    if (type === 'el') {
      geometryBuffer.push({
        kind: 'ellipse',
        center: readVector2D(item.p, { x: 0, y: 0 }),
        size: readVector2D(item.s, { x: 0, y: 0 }),
        cornerRadius: 0,
      });
      continue;
    }

    if (type === 'fl') {
      pendingFill = readFillColor(item.c);
      continue;
    }

    if (type === 'gf') {
      // Gradient fill — approximated as the average of its color stops
      // rather than treated as unsupported. See module docs for why.
      pendingFill = readGradientAverageColor(item.g) ?? pendingFill;
      continue;
    }

    if (type === 'st') {
      pendingStroke = { color: readFillColor(item.c), width: readScalar(item.w, 1) };
      continue;
    }

    if (type === 'gs') {
      pendingStroke = {
        color: readGradientAverageColor(item.g) ?? '#808080',
        width: readScalar(item.w, 1),
      };
      continue;
    }

    if (type === 'sh') {
      const bezier = readBezierPath(item.ks);
      if (bezier === null) {
        // Malformed bezier data we didn't expect — treat as unsupported
        // rather than guess, same as any other unrecognized shape type.
        geometryBuffer.push({
          kind: 'rect',
          center: { x: Number.NaN, y: Number.NaN },
          size: { x: 0, y: 0 },
          cornerRadius: 0,
        });
        continue;
      }
      geometryBuffer.push({
        kind: 'path',
        center: { x: 0, y: 0 },
        size: { x: 0, y: 0 },
        cornerRadius: 0,
        bezier,
      });
      continue;
    }

    // Repeaters, trim paths, merge paths, polystars, and any other
    // shape-item type this renderer doesn't model — signal via a
    // sentinel so only *this* shape is skipped by the caller, not the
    // whole render.
    if (type !== '' && type !== 'tr') {
      geometryBuffer.push({
        kind: 'rect',
        center: { x: Number.NaN, y: Number.NaN },
        size: { x: 0, y: 0 },
        cornerRadius: 0,
      });
    }
  }

  for (const geometry of geometryBuffer) {
    shapes.push({ ...geometry, fill: pendingFill, stroke: pendingStroke });
  }

  return shapes;
}

function readFillColor(colorProp: unknown): string {
  const value = readAnimatableValue<number[]>(colorProp);
  if (!Array.isArray(value) || value.length < 3) return '#808080';
  const toByte = (c: number) => Math.max(0, Math.min(255, Math.round(c * 255)));
  const [r, g, b] = value;
  return `rgb(${toByte(r ?? 0)}, ${toByte(g ?? 0)}, ${toByte(b ?? 0)})`;
}

/**
 * Approximates a Lottie gradient (`gf`/`gs`'s `g` property) as a single
 * solid color — the average of its declared color stops. The gradient
 * color array is flat: for `p` stops, the first `p * 4` values are
 * `[offset, r, g, b]` quadruples (0–1 range), optionally followed by a
 * separate alpha-stop array this function ignores (alpha defaults to
 * fully opaque, acceptable for a thumbnail approximation).
 */
function readGradientAverageColor(gradientProp: unknown): string | null {
  if (gradientProp === null || typeof gradientProp !== 'object') return null;
  const g = gradientProp as Record<string, unknown>;
  const stopCount = typeof g.p === 'number' ? (g.p as number) : 0;
  const stops = readAnimatableValue<number[]>(g.k);
  if (!Array.isArray(stops) || stopCount <= 0) return null;

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  for (let i = 0; i < stopCount; i++) {
    const base = i * 4;
    const r = stops[base + 1];
    const gg = stops[base + 2];
    const b = stops[base + 3];
    if (typeof r === 'number' && typeof gg === 'number' && typeof b === 'number') {
      rSum += r;
      gSum += gg;
      bSum += b;
      count++;
    }
  }
  if (count === 0) return null;

  const toByte = (sum: number) => Math.max(0, Math.min(255, Math.round((sum / count) * 255)));
  return `rgb(${toByte(rSum)}, ${toByte(gSum)}, ${toByte(bSum)})`;
}

/**
 * Resolves a shape's fill/stroke to SVG paint attributes. Fill defaults to
 * a visible mid-gray only when the shape has neither a declared fill nor
 * a stroke (so *something* is always visible); a stroke-only shape (a
 * common outline-icon pattern) correctly gets `fill="none"` rather than
 * an unwanted solid gray fill underneath its outline.
 */
function paintAttrs(shape: RenderableShape, strokeScale: number): string {
  const fill = shape.fill ?? (shape.stroke ? 'none' : '#808080');
  const strokeAttrs = shape.stroke
    ? ` stroke="${shape.stroke.color}" stroke-width="${shape.stroke.width * strokeScale}"`
    : '';
  return ` fill="${fill}"${strokeAttrs}`;
}

function toSvgElement(
  shape: RenderableShape,
  layerTransform: LayerTransform,
  scaleX: number,
  scaleY: number
): string | null {
  if (shape.kind === 'path') {
    if (!shape.bezier) return null;
    return pathToSvgElement(shape, layerTransform, scaleX, scaleY);
  }

  if (Number.isNaN(shape.center.x) || Number.isNaN(shape.center.y)) return null; // sentinel for unsupported geometry

  const cx = (layerTransform.position.x + shape.center.x * layerTransform.scale.x) * scaleX;
  const cy = (layerTransform.position.y + shape.center.y * layerTransform.scale.y) * scaleY;
  const opacity = Math.max(0, Math.min(1, layerTransform.opacityPercent / 100));
  const paint = paintAttrs(shape, (scaleX + scaleY) / 2);
  const transform =
    layerTransform.rotationDegrees !== 0
      ? ` transform="rotate(${layerTransform.rotationDegrees} ${cx} ${cy})"`
      : '';

  if (shape.kind === 'ellipse') {
    const rx = (shape.size.x / 2) * layerTransform.scale.x * scaleX;
    const ry = (shape.size.y / 2) * layerTransform.scale.y * scaleY;
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${paint} opacity="${opacity}"${transform}/>`;
  }

  const w = shape.size.x * layerTransform.scale.x * scaleX;
  const h = shape.size.y * layerTransform.scale.y * scaleY;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const rx = shape.cornerRadius * scaleX;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"${paint} opacity="${opacity}"${transform}/>`;
}

/**
 * Renders a bezier path shape (`sh`) as an SVG `<path>`.
 *
 * Rotation is applied the same way as `rect`/`ellipse`: via an SVG
 * `transform="rotate(...)"` attribute around the shape's centroid, rather
 * than baked into each point — bezier tangents don't survive a naive
 * per-point rotation without extra work that isn't worth it for a still
 * thumbnail.
 */
function pathToSvgElement(
  shape: RenderableShape,
  layerTransform: LayerTransform,
  scaleX: number,
  scaleY: number
): string | null {
  const bezier = shape.bezier;
  if (!bezier || bezier.vertices.length === 0) return null;

  const toAbsolute = (local: LottieVector2D): LottieVector2D => ({
    x: (layerTransform.position.x + local.x * layerTransform.scale.x) * scaleX,
    y: (layerTransform.position.y + local.y * layerTransform.scale.y) * scaleY,
  });

  const { vertices, inTangents, outTangents, closed } = bezier;
  const points = vertices.map(toAbsolute);
  const outControls = vertices.map((v, i) => {
    const t = outTangents[i] ?? { x: 0, y: 0 };
    return toAbsolute({ x: v.x + t.x, y: v.y + t.y });
  });
  const inControls = vertices.map((v, i) => {
    const t = inTangents[i] ?? { x: 0, y: 0 };
    return toAbsolute({ x: v.x + t.x, y: v.y + t.y });
  });

  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  const segmentCount = closed ? points.length : points.length - 1;
  for (let i = 0; i < segmentCount; i++) {
    const next = (i + 1) % points.length;
    d += ` C ${outControls[i]!.x} ${outControls[i]!.y} ${inControls[next]!.x} ${inControls[next]!.y} ${points[next]!.x} ${points[next]!.y}`;
  }
  if (closed) d += ' Z';

  const opacity = Math.max(0, Math.min(1, layerTransform.opacityPercent / 100));
  const paint = paintAttrs(shape, (scaleX + scaleY) / 2);
  const centroid = points.reduce(
    (acc, p) => ({ x: acc.x + p.x / points.length, y: acc.y + p.y / points.length }),
    { x: 0, y: 0 }
  );
  const transform =
    layerTransform.rotationDegrees !== 0
      ? ` transform="rotate(${layerTransform.rotationDegrees} ${centroid.x} ${centroid.y})"`
      : '';

  return `<path d="${d}"${paint} opacity="${opacity}"${transform}/>`;
}
