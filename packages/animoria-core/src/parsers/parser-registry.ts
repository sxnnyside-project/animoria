import type { AnimatedFormat } from '../types/index.js';
import type { IAssetParser } from './base-parser.js';
import { DotLottieParserAdapter } from './dotlottie-parser-adapter.js';
import { LottieParserAdapter } from './lottie-parser-adapter.js';
import { ApngParser, GifParser } from './raster-animated-parser.js';
import { RiveParser } from './rive-parser.js';
import { SvgAnimatedParser } from './svg-animated-parser.js';

/**
 * Singleton catalog of every `IAssetParser` Animoria ships, keyed by the
 * format each one handles.
 *
 * `FileScanner` and `AssetParser` both resolve parsers through this
 * registry rather than holding their own instances, so a new format is
 * introduced by adding one parser class and one `registerParser` call
 * here — never a change to scanning or parsing logic.
 */
export class ParserRegistry {
  private static _instance: ParserRegistry | null = null;
  private _parsers = new Map<AnimatedFormat, IAssetParser>();

  private constructor() {
    this.initializeDefaults();
  }

  /** Returns the shared registry instance, creating it on first use. */
  static getInstance(): ParserRegistry {
    if (!ParserRegistry._instance) {
      ParserRegistry._instance = new ParserRegistry();
    }
    return ParserRegistry._instance;
  }

  /** Registers a parser under its own reported format, replacing any previous parser for that format. */
  registerParser(parser: IAssetParser): void {
    this._parsers.set(parser.getFormat(), parser);
  }

  /**
   * Finds the registered parser that claims support for the given
   * extension and byte signature, or `null` if none does.
   *
   * @param ext Lowercased extension of the file being resolved.
   * @param chunk Leading bytes of the file, already read into memory.
   */
  getParserFor(ext: string, chunk: Buffer): IAssetParser | null {
    for (const parser of this._parsers.values()) {
      if (parser.supports(ext, chunk)) {
        return parser;
      }
    }
    return null;
  }

  /** Registers Animoria's built-in parsers. Called once, by the constructor. */
  initializeDefaults(): void {
    this.registerParser(new LottieParserAdapter());
    this.registerParser(new DotLottieParserAdapter());
    this.registerParser(new RiveParser());
    this.registerParser(new GifParser());
    this.registerParser(new ApngParser());
    this.registerParser(new SvgAnimatedParser());
  }

  /** Every format with a currently registered parser. */
  getRegisteredFormats(): AnimatedFormat[] {
    return Array.from(this._parsers.keys());
  }

  /** Removes every registered parser. Intended for test isolation. */
  clear(): void {
    this._parsers.clear();
  }
}
