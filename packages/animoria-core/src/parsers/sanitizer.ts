/**
 * Sanitiza una cadena de texto para evitar inyecciones de HTML o desbordamientos de atributos.
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
