import { describe, expect, it } from 'vitest';
import {
  parseSeverityOnlyOption,
  parseSeverityWithOptions,
} from '../../src/governance/rules/shared/rule-option-parsing';

describe('parseSeverityOnlyOption', () => {
  it('accepts "error", "warning", and "off"', () => {
    expect(parseSeverityOnlyOption('error', 'x')).toEqual({
      valid: true,
      severity: 'error',
      options: undefined,
    });
    expect(parseSeverityOnlyOption('warning', 'x')).toEqual({
      valid: true,
      severity: 'warning',
      options: undefined,
    });
    expect(parseSeverityOnlyOption('off', 'x')).toEqual({
      valid: true,
      severity: 'off',
      options: undefined,
    });
  });

  it('rejects non-severity values with a readable error mentioning the rule id', () => {
    const result = parseSeverityOnlyOption('critical', 'no-gif');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain('no-gif');
      expect(result.errors[0]).toContain('critical');
    }
  });

  it('rejects non-string values', () => {
    expect(parseSeverityOnlyOption(42, 'x').valid).toBe(false);
    expect(parseSeverityOnlyOption(null, 'x').valid).toBe(false);
    expect(parseSeverityOnlyOption(undefined, 'x').valid).toBe(false);
  });
});

describe('parseSeverityWithOptions', () => {
  const parseNumber = (value: unknown) =>
    typeof value === 'number'
      ? ({ valid: true, options: value } as const)
      : ({ valid: false, errors: ['expected a number'] } as const);

  it('accepts a bare value, implying severity "error"', () => {
    const result = parseSeverityWithOptions(1024, 'max-file-size-kb', parseNumber);
    expect(result).toEqual({ valid: true, severity: 'error', options: 1024 });
  });

  it('accepts an explicit [severity, value] tuple', () => {
    const result = parseSeverityWithOptions(['warning', 512], 'max-file-size-kb', parseNumber);
    expect(result).toEqual({ valid: true, severity: 'warning', options: 512 });
  });

  it('rejects a tuple with an invalid severity', () => {
    const result = parseSeverityWithOptions(['critical', 512], 'max-file-size-kb', parseNumber);
    expect(result.valid).toBe(false);
  });

  it('does not mistake a bare 2-element array option for a [severity, options] tuple', () => {
    const parseStringArray = (value: unknown) =>
      Array.isArray(value)
        ? ({ valid: true, options: value } as const)
        : ({ valid: false, errors: ['expected an array'] } as const);

    const result = parseSeverityWithOptions(
      ['lottie', 'rive'],
      'allowed-formats',
      parseStringArray
    );
    expect(result).toEqual({ valid: true, severity: 'error', options: ['lottie', 'rive'] });
  });

  it("propagates the value parser's errors, prefixed with the rule id", () => {
    const result = parseSeverityWithOptions('not-a-number', 'max-file-size-kb', parseNumber);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain('max-file-size-kb');
      expect(result.errors[0]).toContain('expected a number');
    }
  });
});
