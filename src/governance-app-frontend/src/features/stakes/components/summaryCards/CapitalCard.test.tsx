import '@/i18n/config';

import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { NeuronState } from '@icp-sdk/canisters/nns';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { E8Sn } from '@constants/extra';
import { mockNeuron } from '@fixtures/neuron';

import { CapitalCard } from './CapitalCard';

const USER = 'user-principal';

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({
    identity: { getPrincipal: () => ({ toText: () => USER }) },
  }),
}));

vi.mock('@hooks/tickers', () => ({
  useIcpPrice: () => ({
    icpPrice: 2,
    formatFiat: (value: number) => `CHF ${value.toFixed(2)}`,
    isLoading: false,
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    search,
    children,
    ...props
  }: {
    to: string;
    search?: Record<string, string>;
    children: ReactNode;
  }) => (
    <a href={`${to}?${new URLSearchParams(search)}`} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@features/stakes/components/DisburseModal', () => ({
  DisburseModal: ({
    neurons,
    isOpen,
    icpOnly,
  }: {
    neurons: NeuronInfo[];
    isOpen: boolean;
    icpOnly?: boolean;
  }) =>
    isOpen ? (
      <div role="dialog" data-icp-only={icpOnly}>
        {neurons.map(({ neuronId }) => neuronId.toString()).join(',')}
      </div>
    ) : null,
}));

const lockedNeuron = (neuronId: bigint, stake: bigint) =>
  mockNeuron({
    neuronId,
    state: NeuronState.Locked,
    fullNeuron: { controller: USER, cachedNeuronStake: stake * E8Sn },
  });

const dissolvedNeuron = (neuronId: bigint, stake: bigint, hotKeys: string[] = []) =>
  mockNeuron({
    neuronId,
    state: NeuronState.Dissolved,
    fullNeuron: {
      controller: hotKeys.length > 0 ? 'other-principal' : USER,
      hotKeys,
      cachedNeuronStake: stake * E8Sn,
    },
  });

describe('CapitalCard', () => {
  it('shows the total stake and its fiat value', () => {
    render(<CapitalCard neurons={[lockedNeuron(1n, 10n), dissolvedNeuron(2n, 5n, [USER])]} />);

    expect(screen.getByText('15.00 ICP')).toBeTruthy();
    expect(screen.getByText('≈ CHF 30.00')).toBeTruthy();
  });

  it('does not offer to disburse when no neuron is dissolved', () => {
    render(<CapitalCard neurons={[lockedNeuron(1n, 10n)]} />);

    expect(screen.queryByTestId('capital-card-disburse-action')).toBeNull();
  });

  it('links to the ICP disburse step of the only dissolved neuron', () => {
    render(<CapitalCard neurons={[lockedNeuron(1n, 10n), dissolvedNeuron(2n, 5n)]} />);

    expect(screen.getByText('5.00 unlocked')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Disburse' }).getAttribute('href')).toBe(
      '/neurons?neuronId=2&action=disburseIcp',
    );
  });

  it('opens the ICP disburse modal for more than one dissolved neuron', async () => {
    render(
      <CapitalCard
        neurons={[lockedNeuron(1n, 10n), dissolvedNeuron(2n, 5n), dissolvedNeuron(3n, 3n)]}
      />,
    );

    expect(screen.getByText('8.00 unlocked')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Disburse' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toBe('2,3');
    expect(dialog.getAttribute('data-icp-only')).toBe('true');
  });

  it('leaves out dissolved neurons without stake and hotkey neurons', () => {
    render(
      <CapitalCard
        neurons={[lockedNeuron(1n, 10n), dissolvedNeuron(2n, 0n), dissolvedNeuron(3n, 5n, [USER])]}
      />,
    );

    expect(screen.queryByTestId('capital-card-disburse-action')).toBeNull();
    expect(screen.getByText('≈ CHF 30.00')).toBeTruthy();
  });
});
