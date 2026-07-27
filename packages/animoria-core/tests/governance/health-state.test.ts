import { describe, expect, it } from 'vitest';
import { describeHealthState } from '../../src/governance/health/health-state';

describe('describeHealthState', () => {
  it('returns "excellent" at and above 90', () => {
    expect(describeHealthState(100)).toBe('excellent');
    expect(describeHealthState(90)).toBe('excellent');
  });

  it('returns "good" between 75 and 89', () => {
    expect(describeHealthState(89)).toBe('good');
    expect(describeHealthState(75)).toBe('good');
  });

  it('returns "fair" between 50 and 74', () => {
    expect(describeHealthState(74)).toBe('fair');
    expect(describeHealthState(50)).toBe('fair');
  });

  it('returns "poor" below 50', () => {
    expect(describeHealthState(49)).toBe('poor');
    expect(describeHealthState(0)).toBe('poor');
  });

  it('is deterministic across repeated calls', () => {
    expect(describeHealthState(63)).toBe(describeHealthState(63));
  });
});
