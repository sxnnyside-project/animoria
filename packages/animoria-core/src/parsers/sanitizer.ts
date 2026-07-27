/**
 * Strips tags and escapes HTML-significant characters in a string
 * pulled from parsed asset metadata (marker names, layer names, ...)
 * before it is ever rendered into a webview or HTML attribute.
 *
 * Asset metadata originates from files a developer didn't necessarily
 * author themselves (a downloaded Lottie file, a shared design asset);
 * treating any string extracted from it as untrusted is what prevents
 * a crafted marker/layer name from injecting markup into a hover card
 * or preview panel.
 */
export function sanitizeMetadataString(value: string): string {
  if (typeof value !== 'string') return '';
  let clean = value.replace(/<[^>]*>?/gm, '');
  clean = clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return clean;
}
