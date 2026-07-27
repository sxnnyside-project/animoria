import type { AnimoriaAsset } from '../types/asset.js';

/**
 * Projects a flat asset list into... a flat asset list, sorted for
 * stable presentation.
 *
 * Trivial by design — this function exists so "Flat View" is
 * structurally the same *kind* of thing as
 * `buildAssetTreeProjection` (a pure `(assets) => projection` function
 * over the shared asset model), not a special case the presentation
 * layer handles by skipping projection entirely. A future third
 * projection (grouped by format, by governance status, ...) has an
 * obvious pattern to follow because both existing ones already follow
 * it.
 *
 * @param assets - The current, flat asset list — typically
 *   `WorkspaceIndexSnapshot.assets`.
 * @returns A new array, sorted alphabetically by name, leaving `assets`
 *   itself untouched.
 */
export function buildAssetFlatProjection(
  assets: readonly AnimoriaAsset[]
): readonly AnimoriaAsset[] {
  return assets.slice().sort((a, b) => a.name.localeCompare(b.name));
}
