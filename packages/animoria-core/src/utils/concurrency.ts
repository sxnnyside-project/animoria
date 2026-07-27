/**
 * Runs `fn` over `items` with at most `concurrency` calls in flight at
 * once, batch-by-batch (each batch fully settles before the next starts).
 *
 * Extracted from the batching pattern already used by `AssetParser` so
 * any other unbounded `Promise.all(items.map(...))` in the indexing
 * pipeline (each of which fires one I/O operation per item with zero
 * limit) can be bounded the same way without duplicating the loop.
 */
export async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    await Promise.all(batch.map(fn));
  }
}
