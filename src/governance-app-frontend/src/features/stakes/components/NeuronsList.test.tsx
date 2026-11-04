import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { tapOverlay, waitForOutsideListeners } from '@utils/unitTest';
import { mockNeuron } from '@fixtures/neuron';

import { NeuronsList } from './NeuronsList';

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({ identity: undefined }),
}));

vi.mock('@hooks/tickers/useIcpPrice', () => ({
  useIcpPrice: () => ({ icpPrice: undefined, isLoading: false }),
}));

vi.mock('@hooks/useApyColor', () => ({
  useApyColor: () => ({ ready: false }),
}));

vi.mock('@hooks/governance/useGovernanceEconomics', () => ({
  useGovernanceEconomics: () => ({ data: undefined, isLoading: false }),
}));

vi.mock('@features/accounts/hooks/useHardwareWalletsMetadata', () => ({
  useHardwareWalletsMetadata: () => ({ data: [], isLoading: false }),
}));

vi.mock('./neuronDetail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./neuronDetail')>()),
  NeuronDetailModal: () => null,
}));
vi.mock('./DisburseIcpModal', () => ({ DisburseIcpModal: () => null }));
vi.mock('./DisburseMaturityModal', () => ({ DisburseMaturityModal: () => null }));
vi.mock('./StakeMaturityModal', () => ({ StakeMaturityModal: () => null }));

const NEURON_ID = 7n;

const renderList = () => {
  const onSelectedNeuronChange = vi.fn();
  render(
    <NeuronsList
      neurons={[mockNeuron({ neuronId: NEURON_ID })]}
      selectedNeuronId={undefined}
      onSelectedNeuronChange={onSelectedNeuronChange}
    />,
  );
  return onSelectedNeuronChange;
};

const getMaturityTrigger = () =>
  screen.getByTestId('neuron-card').querySelector('[data-slot="drawer-trigger"]')!;

const openMaturityDrawer = async () => {
  fireEvent.click(getMaturityTrigger());
  await waitForOutsideListeners();
};

describe('NeuronsList', () => {
  it('opens the neuron on a click on its card', () => {
    const onSelectedNeuronChange = renderList();

    fireEvent.click(screen.getByTestId('neuron-card'));

    expect(onSelectedNeuronChange).toHaveBeenCalledWith(NEURON_ID);
  });

  describe('with the maturity drawer of a card open', () => {
    it('does not open the neuron on a click inside the drawer', async () => {
      const onSelectedNeuronChange = renderList();
      await openMaturityDrawer();

      fireEvent.click(screen.getByRole('dialog'));

      expect(onSelectedNeuronChange).not.toHaveBeenCalled();
    });

    it('does not open the neuron on Enter inside the drawer', async () => {
      const onSelectedNeuronChange = renderList();
      await openMaturityDrawer();

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });

      expect(onSelectedNeuronChange).not.toHaveBeenCalled();
    });

    it('closes the drawer and does not open the neuron on a tap on the overlay', async () => {
      const onSelectedNeuronChange = renderList();
      await openMaturityDrawer();

      tapOverlay('touch');

      await waitFor(() => expect(getMaturityTrigger().getAttribute('aria-expanded')).toBe('false'));
      expect(onSelectedNeuronChange).not.toHaveBeenCalled();
    });
  });
});
