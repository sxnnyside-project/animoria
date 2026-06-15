import type { AnimatedFormat, AnimoriaMetadata } from '../types/index.js';

/**
 * Interfaz base que todo parser de formato animado debe implementar
 * para integrarse en el pipeline modular y extensible de Animoria.
 */
export interface IAssetParser {
  /**
   * Determina si este parser soporta el archivo analizado a partir
   * de su extensión y/o del primer fragmento de bytes (magic bytes).
   *
   * @param ext Extensión en minúsculas del archivo (ej. ".json")
   * @param bufferChunk Primer fragmento (1KB por defecto) del archivo leído de disco
   */
  supports(ext: string, bufferChunk: Buffer): boolean;

  /**
   * Procesa el archivo completo y retorna sus metadatos estructurados.
   *
   * @param filePath Ruta absoluta al archivo
   * @param buffer Contenido completo del archivo en memoria
   */
  parse(filePath: string, buffer: Buffer): Promise<AnimoriaMetadata>;

  /**
   * Retorna el tipo de formato animado manejado por este parser (ej. "lottie")
   */
  getFormat(): AnimatedFormat;
}
