import { readFile } from 'node:fs/promises';
import { DotLottie } from '@dotlottie/dotlottie-js';
import { logWarn } from '../logging/logger.js';

/**
 * The Lottie document a player would render, for `.json` and `.lottie` alike.
 *
 * ## Why this is in Core
 * A host needs the animation itself to offer playback — a rendered frame cannot be
 * scrubbed, paused or slowed. Reading it means knowing that `.lottie` is a zip whose
 * `animations/` entry holds the JSON, and that is asset knowledge: exactly the kind
 * of thing the layer rule keeps out of hosts. Two hosts reading the archive
 * separately is two implementations of "what is a dotLottie", and they would
 * eventually disagree with the parser that produced the metadata beside them.
 *
 * The parsers already do this work to extract metadata; this exposes the document
 * itself, from the same reader, so what plays is what Core parsed.
 */

/** Frame geometry a player needs, read from the document it is about to render. */
export interface LottieDocument {
  /** The animation JSON, exactly as a player consumes it. */
  readonly animation: Record<string, unknown>;
  /** Frames between the document's in and out points. */
  readonly totalFrames: number;
  readonly frameRate: number;
}

/**
 * Reads one asset's Lottie document, or `null` when it cannot be read.
 *
 * `null` rather than a throw: a document that will not parse is not an error the
 * caller must handle — the preview falls back to Core's rendered still, which is a
 * better answer for an unusual file than a failure message. The reason is logged, so
 * "why is this one not playing?" stays answerable.
 */
export async function readLottieDocument(filePath: string): Promise<LottieDocument | null> {
  try {
    const animation = filePath.toLowerCase().endsWith('.lottie')
      ? await readFromArchive(filePath)
      : await readFromJson(filePath);

    if (!animation) return null;
    return { animation, ...frameGeometry(animation) };
  } catch (error) {
    logWarn('asset-parse', 'readLottieDocument', 'A Lottie document could not be read', {
      reason: `reading ${filePath} failed`,
      error,
      recovery: 'the preview falls back to the rendered still frame',
    });
    return null;
  }
}

async function readFromJson(filePath: string): Promise<Record<string, unknown> | null> {
  const parsed: unknown = JSON.parse(await readFile(filePath, 'utf8'));
  // Structural validation, the same rule detection uses (D-03): a Lottie is a
  // document with `v`, `fr` and `layers`, not a file with a particular extension.
  if (!parsed || typeof parsed !== 'object') return null;
  const document = parsed as Record<string, unknown>;
  return 'layers' in document && 'fr' in document ? document : null;
}

async function readFromArchive(filePath: string): Promise<Record<string, unknown> | null> {
  const buffer = await readFile(filePath);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;

  const archive = await new DotLottie().fromArrayBuffer(arrayBuffer);
  // The first animation, matching `DotLottieParser`'s own choice. A `.lottie` may
  // hold several; picking a different one here than the parser did would show
  // metadata describing one animation beside a preview playing another.
  const primary = archive.animations?.[0];
  if (!primary) return null;
  return (await primary.toJSON()) as unknown as Record<string, unknown>;
}

function frameGeometry(animation: Record<string, unknown>): {
  totalFrames: number;
  frameRate: number;
} {
  const inPoint = typeof animation.ip === 'number' ? animation.ip : 0;
  const outPoint = typeof animation.op === 'number' ? animation.op : 0;
  const frameRate = typeof animation.fr === 'number' ? animation.fr : 0;
  return { totalFrames: Math.max(0, Math.round(outPoint - inPoint)), frameRate };
}
