import { open } from 'fs/promises';

/**
 * Valida rápidamente si un archivo JSON tiene potencial de ser un archivo Lottie
 * leyendo únicamente el primer bloque de bytes de disco.
 *
 * @param filePath Ruta absoluta al archivo JSON a verificar
 * @param chunkSize Tamaño en bytes a leer para el bloque inicial (default: 1024)
 * @returns Promesa que resuelve a `true` si cumple con la firma estructural de Lottie, de lo contrario `false`
 */
export async function isPotentialLottie(filePath: string, chunkSize = 1024): Promise<boolean> {
  let fileHandle: any = null;
  try {
    fileHandle = await open(filePath, 'r');
    const buffer = Buffer.alloc(chunkSize);
    const { bytesRead } = await fileHandle.read(buffer, 0, chunkSize, 0);

    if (bytesRead === 0) return false;

    const chunkStr = buffer.toString('utf8', 0, bytesRead).trim();

    // Debe comenzar con una llave de apertura para ser un objeto JSON válido
    if (!chunkStr.startsWith('{')) {
      return false;
    }

    // Buscamos firmas específicas de Lottie en el fragmento leído:
    // la versión ("v") y la lista de capas ("layers").
    // Se contemplan comillas simples y dobles por robustez.
    const hasVersion = chunkStr.includes('"v"') || chunkStr.includes("'v'");
    const hasLayers = chunkStr.includes('"layers"') || chunkStr.includes("'layers'");

    return hasVersion && hasLayers;
  } catch {
    // Si falla la apertura o lectura, se reporta como falso
    return false;
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
}
