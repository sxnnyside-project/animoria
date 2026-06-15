import type { AnimatedFormat } from '../types/index.js';
import type { IAssetParser } from './base-parser.js';
import { LottieParserAdapter } from './lottie-parser-adapter.js';
import { DotLottieParserAdapter } from './dotlottie-parser-adapter.js';
import { RiveParser } from './rive-parser.js';
import { GifParser, ApngParser } from './raster-animated-parser.js';
import { SvgAnimatedParser } from './svg-animated-parser.js';

/**
 * Registro central y factoría (Singleton) que administra y provee
 * los parsers para cada formato animado de forma dinámica.
 */
export class ParserRegistry {
  private static _instance: ParserRegistry | null = null;
  private _parsers = new Map<AnimatedFormat, IAssetParser>();

  private constructor() {
    this.initializeDefaults();
  }

  /**
   * Obtiene la instancia única del registro de parsers.
   */
  static getInstance(): ParserRegistry {
    if (!ParserRegistry._instance) {
      ParserRegistry._instance = new ParserRegistry();
    }
    return ParserRegistry._instance;
  }

  /**
   * Registra dinámicamente un nuevo parser en el ecosistema.
   */
  registerParser(parser: IAssetParser): void {
    this._parsers.set(parser.getFormat(), parser);
  }

  /**
   * Busca un parser registrado que sea compatible con la extensión y firma de bytes dadas.
   *
   * @param ext Extensión en minúsculas del archivo analizado
   * @param chunk Fragmento inicial de bytes del archivo en memoria
   */
  getParserFor(ext: string, chunk: Buffer): IAssetParser | null {
    for (const parser of this._parsers.values()) {
      if (parser.supports(ext, chunk)) {
        return parser;
      }
    }
    return null;
  }

  /**
   * Registra los parsers de formatos por defecto.
   */
  initializeDefaults(): void {
    this.registerParser(new LottieParserAdapter());
    this.registerParser(new DotLottieParserAdapter());
    this.registerParser(new RiveParser());
    this.registerParser(new GifParser());
    this.registerParser(new ApngParser());
    this.registerParser(new SvgAnimatedParser());
  }

  /**
   * Retorna una lista con todos los formatos actualmente registrados.
   */
  getRegisteredFormats(): AnimatedFormat[] {
    return Array.from(this._parsers.keys());
  }

  /**
   * Limpia los parsers registrados (útil para pruebas unitarias).
   */
  clear(): void {
    this._parsers.clear();
  }
}
