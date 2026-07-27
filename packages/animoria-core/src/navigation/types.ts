import type { AnimoriaAsset } from '../types/asset.js';

/**
 * Contracts for Animoria's asset navigation projections.
 *
 * ## Why "projections" instead of two separate tree-builders
 * A Directory Tree view and a Flat view are not two different features
 * — they are two different *views onto the same asset list*. Building
 * them as independent implementations (one that walks directories, one
 * that just lists assets) would let them silently drift apart — a
 * filter or sort applied to one but forgotten in the other, for
 * instance — and would double the surface area a future third
 * projection (grouped by format? by governance status?) would need to
 * reimplement. Instead, both `asset-tree-projection.js` and
 * `asset-flat-projection.js` are pure functions with the same shape,
 * `(assets, ...) => a structure`, over the identical input: the
 * workspace's current `AnimoriaAsset[]`. Neither one knows about VS
 * Code, tree items, or icons — see `AnimoriaTreeProvider` for where that
 * translation happens.
 */

/**
 * One node in a directory-tree projection: either a folder containing
 * more nodes, or a leaf wrapping a single asset.
 *
 * A discriminated union (rather than, say, an "asset OR null" folder
 * shape) so consumers can exhaustively `switch` on `kind` and the
 * compiler catches a missed case the moment a new node kind is ever
 * introduced.
 */
export type AssetTreeNode = AssetFolderNode | AssetFileNode;

/** A directory that contains one or more assets, directly or in subfolders. */
export interface AssetFolderNode {
  readonly kind: 'folder';
  /** Directory name only, e.g. `"animations"` — not the full path. */
  readonly name: string;
  /** Path relative to the workspace root, using `/` separators regardless of platform. */
  readonly relativePath: string;
  /** Child nodes, folders before files, each alphabetically sorted — see `asset-tree-projection.js` for the full ordering rule. */
  readonly children: readonly AssetTreeNode[];
}

/** A leaf node wrapping exactly one asset. */
export interface AssetFileNode {
  readonly kind: 'file';
  readonly asset: AnimoriaAsset;
}
