import { formatNumber, formatPercentage } from '@utils/numbers';

const PERMYRIAD_PER_UNIT = 10_000;

/** ICP that one unit of maturity converts to at the given modulation. */
export const maturityModulationRate = (permyriad: number): number =>
  1 + permyriad / PERMYRIAD_PER_UNIT;

export const applyMaturityModulation = (maturity: number, permyriad: number): number =>
  maturity * maturityModulationRate(permyriad);

/** Signed percentage with a minus sign (U+2212), for example "−1.95%" or "+0.50%". */
export const formatMaturityModulation = (permyriad: number): string =>
  `${permyriad > 0 ? '+' : ''}${formatPercentage(permyriad / PERMYRIAD_PER_UNIT).replace('-', '−')}`;

export const formatMaturityModulationRate = (permyriad: number): string =>
  formatNumber(maturityModulationRate(permyriad), { minFraction: 4, maxFraction: 4 });
