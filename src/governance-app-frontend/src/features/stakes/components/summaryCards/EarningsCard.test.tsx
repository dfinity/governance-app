import '@/i18n/config';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { E8Sn } from '@constants/extra';
import { mockNeuron } from '@fixtures/neuron';

import { EarningsCard } from './EarningsCard';

describe('EarningsCard', () => {
  const neuron = mockNeuron({
    fullNeuron: {
      cachedNeuronStake: 10n * E8Sn,
      stakedMaturityE8sEquivalent: 2n * E8Sn,
      maturityE8sEquivalent: 3n * E8Sn,
    },
  });

  it('shows the locked plus the available maturity', () => {
    render(<EarningsCard neurons={[neuron]} />);

    expect(screen.getByText('5.00')).toBeTruthy();
  });

  it('shows the split of the maturity in the tooltip', () => {
    render(<EarningsCard neurons={[neuron]} />);

    expect(
      screen.getByRole('button', { name: 'Maturity Locked: 2.00. Available: 3.00.' }),
    ).toBeTruthy();
  });
});
