import { describe, expect, it } from 'vitest';

import {
  formatMaturityModulation,
  formatMaturityModulationRate,
  maturityModulationRate,
} from './maturityModulation';

describe('maturityModulation', () => {
  it('converts permyriad to the ICP per maturity rate', () => {
    expect(maturityModulationRate(-195)).toBeCloseTo(0.9805);
    expect(maturityModulationRate(0)).toBe(1);
    expect(maturityModulationRate(200)).toBeCloseTo(1.02);
  });

  it('formats the modulation with a sign', () => {
    expect(formatMaturityModulation(-195)).toBe('−1.95%');
    expect(formatMaturityModulation(50)).toBe('+0.50%');
    expect(formatMaturityModulation(0)).toBe('0.00%');
  });

  it('formats the rate with four decimals', () => {
    expect(formatMaturityModulationRate(-195)).toBe('0.9805');
  });
});
