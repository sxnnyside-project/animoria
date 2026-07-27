import type { AnimatedFormat, AnimoriaMetadata } from '../types/index.js';

/**
 * Contract every asset-format parser implements to plug into Animoria's
 * parser pipeline (`ParserRegistry`, `FileScanner`, `AssetParser`).
 *
 * A new format is added by writing one class that implements this
 * interface and registering it — no existing parser or scanning code
 * needs to change.
 */
export interface IAssetParser {
  /**
   * Determines whether this parser handles the given file, based on its
   * extension and/or the first chunk of bytes read from disk (magic-byte
   * sniffing). Must be cheap and synchronous — called during workspace
   * scanning, before any parser commits to reading the full file.
   *
   * @param ext Lowercased file extension (e.g. `.json`).
   * @param bufferChunk The first chunk (1KB by default) of the file's bytes.
   */
  supports(ext: string, bufferChunk: Buffer): boolean;

  /**
   * Parses the complete file and returns its structured metadata.
   *
   * @param filePath Absolute path to the file.
   * @param buffer Full file contents in memory.
   */
  parse(filePath: string, buffer: Buffer): Promise<AnimoriaMetadata>;

  /** The animated format this parser handles (e.g. `"lottie"`). */
  getFormat(): AnimatedFormat;
}
