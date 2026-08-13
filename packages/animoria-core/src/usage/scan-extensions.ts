import { SUPPORTED_REFERENCE_EXTENSIONS } from './reference-syntax.js';

/**
 * Source file extensions scanned for asset references.
 *
 * Derived from {@link REFERENCE_FORMAT_SUPPORT} rather than maintained separately:
 * an extension is scannable precisely when a handler knows how to read references
 * out of it. Keeping a second hand-written list here is how "we scan `.css`" and
 * "we can actually find a reference in `.css`" would drift apart.
 *
 * Consumed by the workspace indexer's path classifier and by IDE file watchers, so
 * they observe exactly the files the index will read.
 */
export const DEFAULT_USAGE_SCAN_EXTENSIONS: readonly string[] = SUPPORTED_REFERENCE_EXTENSIONS;
