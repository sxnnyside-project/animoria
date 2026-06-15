import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { isPotentialLottie } from '../src/scanner/fast-validator';

const FIXTURES_DIR = resolve(__dirname, './fixtures');
const VALID_LOTTIE_PATH = resolve(FIXTURES_DIR, './valid.lottie.json');
const INVALID_JSON_PATH = resolve(FIXTURES_DIR, './invalid.json');

describe('fast-validator - isPotentialLottie()', () => {
  it('should return true for a valid Lottie JSON file', async () => {
    const result = await isPotentialLottie(VALID_LOTTIE_PATH);
    expect(result).toBe(true);
  });

  it('should return false for a non-Lottie JSON file', async () => {
    const result = await isPotentialLottie(INVALID_JSON_PATH);
    expect(result).toBe(false);
  });

  it('should return false for a non-existent file path', async () => {
    const result = await isPotentialLottie(resolve(FIXTURES_DIR, './non-existent.json'));
    expect(result).toBe(false);
  });

  it('should return false for files that do not start with a JSON object', async () => {
    // We can test against a path we know isn't a JSON object, like a directory or index file
    const result = await isPotentialLottie(resolve(__dirname, '../src/index.ts'));
    expect(result).toBe(false);
  });
});
