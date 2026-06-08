import type { AnimoriaMetadata } from './metadata.js';

export interface ParserResult {
  success: boolean;
  metadata?: AnimoriaMetadata;
  error?: string;
}

export interface ILottieParser {
  /** Returns true if the raw data is a valid Lottie file */
  validate(data: unknown): boolean;
  /** Extracts metadata from validated Lottie data */
  parse(data: unknown): ParserResult;
}
