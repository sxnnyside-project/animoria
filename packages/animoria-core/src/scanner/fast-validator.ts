import { open } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { logDebug } from '../logging/logger.js';

/**
 * Cheaply estimates whether a JSON file could be a Lottie asset by
 * reading only its leading bytes, without parsing the full document.
 *
 * @param filePath Absolute path to the candidate JSON file.
 * @param chunkSize Bytes to read from the start of the file (default: 1024).
 * @returns `true` if the leading bytes match Lottie's structural
 *   signature, `false` otherwise (including on any read failure).
 */
export async function isPotentialLottie(filePath: string, chunkSize = 1024): Promise<boolean> {
  let fileHandle: FileHandle | null = null;
  try {
    fileHandle = await open(filePath, 'r');
    const buffer = Buffer.alloc(chunkSize);
    const { bytesRead } = await fileHandle.read(buffer, 0, chunkSize, 0);

    if (bytesRead === 0) return false;

    const chunkStr = buffer.toString('utf8', 0, bytesRead).trim();

    // A JSON object must open with a brace.
    if (!chunkStr.startsWith('{')) {
      return false;
    }

    // Lottie's two defining top-level keys: version ("v") and the layer
    // list ("layers"). Both quote styles are checked for robustness.
    const hasVersion = chunkStr.includes('"v"') || chunkStr.includes("'v'");
    const hasLayers = chunkStr.includes('"layers"') || chunkStr.includes("'layers'");

    return hasVersion && hasLayers;
  } catch (err) {
    logDebug(
      'asset-parse',
      'isPotentialLottie',
      'Could not read candidate file for Lottie signature check',
      {
        assetPath: filePath,
        reason: 'file open/read failed',
        error: err,
        recovery: 'treated as not a Lottie file',
      }
    );
    return false;
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
}
