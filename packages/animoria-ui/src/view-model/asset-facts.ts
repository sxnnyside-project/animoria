import type { AnimoriaAsset, AnimoriaMetadata } from '@animoria/core/contracts';
import { formatBytes } from './analysis-view-model.js';

/**
 * What is worth saying about one asset, decided by what it *is*.
 *
 * ## Why this exists
 * The inspector rendered the same three rows for every asset — format, size,
 * references — and Animoria is Visual Asset Governance, not a Lottie viewer. Core
 * already extracts artboards and state machines from Rive, frame counts and loop
 * counts from GIF, animation type and element counts from animated SVG, and the
 * dotLottie manifest from an archive. None of it reached a screen. A panel that
 * renders every format identically is a panel that has thrown that away.
 *
 * ## Why the facts are derived here and not in the component
 * A template that branches on `format` five ways becomes a template nobody can read,
 * and the branching is not presentation — it is *what this kind of asset has*. Keeping
 * it as data means the component renders a list, and a new format is a case here
 * rather than another arm of a conditional in markup.
 *
 * ## What this may not do
 * Judge. Nothing here decides whether 40 layers is too many or a 12-second animation
 * is too long — those are governance verdicts and they arrive as diagnostics. This
 * formats numbers Core already produced.
 */

/** One labelled fact, optionally with the longer form behind a tooltip. */
export interface AssetFact {
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
}

/**
 * Facts under a heading.
 *
 * Grouped rather than one flat table because the groups answer different questions:
 * *what is this file*, *how does it move*, *what is inside it*. A single twelve-row
 * list forces the reader to scan all of it to find the one row they came for.
 */
export interface AssetFactGroup {
  readonly title: string;
  readonly facts: readonly AssetFact[];
}

/** Broad families the inspector treats differently. */
export type AssetFamily = 'lottie' | 'rive' | 'raster-animated' | 'vector' | 'raster' | 'unknown';

const RASTER_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'jfif', 'webp', 'avif', 'bmp', 'ico']);

/**
 * Which family an asset belongs to.
 *
 * Reads `format` when Core has classified the asset, and falls back to the extension
 * only for files Core does not model as animated assets — the static images the
 * inspector must still describe usefully rather than call "unknown".
 */
export function familyOf(asset: { format?: string; path: string }): AssetFamily {
  switch (asset.format) {
    case 'lottie':
    case 'dotlottie':
      return 'lottie';
    case 'rive':
      return 'rive';
    case 'gif':
    case 'apng':
      return 'raster-animated';
    case 'animated-svg':
    case 'svg':
      return 'vector';
    default:
      break;
  }

  const extension = asset.path.slice(asset.path.lastIndexOf('.') + 1).toLowerCase();
  if (extension === 'svg') return 'vector';
  if (RASTER_EXTENSIONS.has(extension)) return 'raster';
  return 'unknown';
}

/** Whether this family can be played, and therefore whether transport controls belong. */
export function isPlayable(family: AssetFamily): boolean {
  return family === 'lottie' || family === 'raster-animated';
}

/**
 * The facts for one asset, in the order a developer reads them.
 *
 * Identity first (format, dimensions, size), then time, then structure. A parse
 * failure replaces the structural facts with the reason, because "this file could not
 * be read" outranks everything Core would otherwise have said about it.
 */
export function factGroupsFor(asset: AnimoriaAsset): readonly AssetFactGroup[] {
  const metadata = asset.metadata;

  // Identity: what a developer needs to recognise the file.
  const identity: AssetFact[] = [{ label: 'Format', value: describeFormat(asset.format) }];
  if (metadata) {
    identity.push({ label: 'Dimensions', value: `${metadata.width} × ${metadata.height}` });
  }
  identity.push({ label: 'Size', value: formatBytes(asset.sizeBytes) });

  if (asset.status === 'error') {
    // The parse failure replaces everything structural. "This file could not be read"
    // outranks anything else Core would have said about it.
    return [
      { title: 'Asset', facts: identity },
      {
        title: 'Problem',
        facts: [
          {
            label: 'Could not be parsed',
            value: asset.error ?? 'Animoria could not read this file.',
          },
        ],
      },
    ];
  }

  if (!metadata) {
    return [
      { title: 'Asset', facts: identity },
      { title: 'Details', facts: [{ label: 'Status', value: 'Not parsed yet.' }] },
    ];
  }

  const groups: AssetFactGroup[] = [{ title: 'Asset', facts: identity }];

  const timing = timeFacts(metadata);
  if (timing.length > 0) groups.push({ title: 'Animation', facts: timing });

  const structure = structureFacts(metadata);
  if (structure.length > 0) {
    // Named for what it holds: a Rive file's artboards and a Lottie's layers are both
    // "what is inside", and calling the section that in both places is what lets a
    // reader learn the panel once.
    const last = groups[groups.length - 1];
    if (last && last.title === 'Animation') {
      groups[groups.length - 1] = { title: 'Animation', facts: [...last.facts, ...structure] };
    } else {
      groups.push({ title: 'Structure', facts: structure });
    }
  }

  return groups;
}

/** The flat list, for surfaces with no room for headings. */
export function factsFor(asset: AnimoriaAsset): readonly AssetFact[] {
  const facts: AssetFact[] = [{ label: 'Format', value: describeFormat(asset.format) }];

  const metadata = asset.metadata;
  if (metadata) {
    facts.push({ label: 'Dimensions', value: `${metadata.width} × ${metadata.height}` });
  }
  facts.push({ label: 'Size', value: formatBytes(asset.sizeBytes) });

  if (asset.status === 'error') {
    facts.push({
      label: 'Could not be parsed',
      value: asset.error ?? 'Animoria could not read this file.',
    });
    return facts;
  }

  if (!metadata) {
    facts.push({ label: 'Details', value: 'Not parsed yet.' });
    return facts;
  }

  facts.push(...timeFacts(metadata), ...structureFacts(metadata));
  return facts;
}

function timeFacts(metadata: AnimoriaMetadata): readonly AssetFact[] {
  if (metadata.durationSeconds <= 0) return [];
  const seconds = Number.parseFloat(metadata.durationSeconds.toFixed(2));
  return [{ label: 'Duration', value: `${seconds}s` }];
}

function structureFacts(metadata: AnimoriaMetadata): readonly AssetFact[] {
  switch (metadata.format) {
    case 'lottie':
    case 'dotlottie': {
      const facts: AssetFact[] = [
        { label: 'Frame rate', value: `${metadata.fps} fps` },
        { label: 'Frames', value: String(metadata.totalFrames) },
        { label: 'Layers', value: String(metadata.layerCount) },
      ];
      if (metadata.markers && metadata.markers.length > 0) {
        facts.push({
          label: 'Markers',
          value: metadata.markers.map((marker) => marker.name).join(', '),
          detail: 'Named segments an integration can play in isolation.',
        });
      }
      if (metadata.dotLottie) {
        facts.push({
          label: 'Archive',
          value: `${metadata.dotLottie.animations.length} animation(s)`,
          detail: `Previewing "${metadata.dotLottie.primaryAnimation}"${
            metadata.dotLottie.hasImages ? ' · contains embedded images' : ''
          }`,
        });
      }
      return facts;
    }

    case 'rive':
      // Artboards and state machines are the whole reason a Rive file is bigger than
      // the animation it shows, and the previous inspector showed none of them.
      return [
        { label: 'Artboards', value: listOrNone(metadata.artboards) },
        { label: 'State machines', value: listOrNone(metadata.stateMachines) },
        { label: 'Animations', value: listOrNone(metadata.animations) },
      ];

    case 'gif':
    case 'apng':
      return [
        { label: 'Frames', value: String(metadata.frameCount) },
        {
          label: 'Loops',
          value: metadata.loopCount === 0 ? 'Forever' : String(metadata.loopCount),
        },
      ];

    case 'animated-svg':
      return [
        {
          label: 'Animation',
          value: describeSvgAnimation(metadata.animationType),
          detail: 'How motion is expressed inside the document.',
        },
        { label: 'Elements', value: String(metadata.elementCount) },
      ];

    default:
      return [];
  }
}

function listOrNone(values: readonly string[]): string {
  return values.length > 0 ? values.join(', ') : 'None';
}

function describeSvgAnimation(kind: 'css' | 'smil' | 'mixed'): string {
  switch (kind) {
    case 'css':
      return 'CSS';
    case 'smil':
      return 'SMIL';
    default:
      return 'CSS and SMIL';
  }
}

/** Core's format ids in the words the product uses for them. */
function describeFormat(format: string): string {
  switch (format) {
    case 'lottie':
      return 'Lottie';
    case 'dotlottie':
      return 'dotLottie';
    case 'rive':
      return 'Rive';
    case 'gif':
      return 'GIF';
    case 'apng':
      return 'APNG';
    case 'animated-svg':
      return 'Animated SVG';
    default:
      return format.toUpperCase();
  }
}
