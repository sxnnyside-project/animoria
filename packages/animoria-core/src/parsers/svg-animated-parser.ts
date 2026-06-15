import type { AnimatedFormat, AnimoriaMetadata } from '../types/index.js';
import type { IAssetParser } from './base-parser.js';

/**
 * Parser para el formato vectorial animado SVG (.svg).
 * Analiza el árbol XML a nivel de texto para buscar declaraciones de
 * animaciones CSS (@keyframes), animaciones SMIL (<animate>) o scripts,
 * y extrae las dimensiones del viewport.
 */
export class SvgAnimatedParser implements IAssetParser {
  supports(ext: string, bufferChunk: Buffer): boolean {
    if (ext !== '.svg') return false;
    const chunkStr = bufferChunk.toString('utf8').trim();
    // Debe contener la firma de la etiqueta SVG
    return chunkStr.includes('<svg');
  }

  async parse(filePath: string, buffer: Buffer): Promise<AnimoriaMetadata> {
    try {
      const content = buffer.toString('utf8');

      // 1. Extraer dimensiones mediante expresiones regulares en la etiqueta <svg>
      const svgTagMatch = content.match(/<svg([^>]+)>/);
      let width = 400; // Valores por defecto
      let height = 400;

      if (svgTagMatch) {
        const svgAttributes = svgTagMatch[1];

        const wMatch = svgAttributes.match(/width=["']([^"']+)["']/);
        const hMatch = svgAttributes.match(/height=["']([^"']+)["']/);
        const vbMatch = svgAttributes.match(/viewBox=["']([^"']+)["']/);

        if (wMatch && hMatch) {
          width = parseFloat(wMatch[1]) || 400;
          height = parseFloat(hMatch[1]) || 400;
        } else if (vbMatch) {
          const parts = vbMatch[1].trim().split(/\s+/);
          if (parts.length === 4) {
            width = parseFloat(parts[2]) || 400;
            height = parseFloat(parts[3]) || 400;
          }
        }
      }

      // 2. Clasificar el tipo de animación
      const hasSmil = /<(animate|animateTransform|animateMotion|set|mpath)\b/.test(content);
      const hasCss =
        /@keyframes\b/.test(content) ||
        /animation\s*:\s*/.test(content) ||
        /transition\s*:\s*/.test(content);

      let animationType: 'css' | 'smil' | 'mixed' = 'css';
      if (hasSmil && hasCss) {
        animationType = 'mixed';
      } else if (hasSmil) {
        animationType = 'smil';
      }

      // Contar elementos totales en el SVG de forma aproximada
      const elementCount = (content.match(/<[a-zA-Z0-9_-]+/g) || []).length;

      return {
        format: 'animated-svg',
        width,
        height,
        durationSeconds: 0, // SVG no tiene una duración global fija y fácil de predecir sin ejecutar SMIL
        sizeBytes: buffer.length,
        animationType,
        elementCount,
      } as AnimoriaMetadata;
    } catch (err) {
      throw new Error(`SVG parsing failed: ${err instanceof Error ? err.message : String(err)}`, {
        cause: err,
      });
    }
  }

  getFormat(): AnimatedFormat {
    return 'animated-svg';
  }
}
