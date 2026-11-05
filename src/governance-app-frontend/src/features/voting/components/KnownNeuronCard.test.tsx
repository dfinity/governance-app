import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KnownNeuronCard } from './KnownNeuronCard';

const renderCard = () => {
  const onSelect = vi.fn();
  render(
    <KnownNeuronCard
      neuron={{
        id: 27n,
        name: 'Alpha',
        description: 'See [the docs](https://example.com/docs).',
        links: [],
        committed_topics: [],
      }}
      isSelected={false}
      isDisabled={false}
      onSelect={onSelect}
    />,
  );
  return onSelect;
};

describe('KnownNeuronCard', () => {
  it('selects the neuron on a click on the card', () => {
    const onSelect = renderCard();

    fireEvent.click(screen.getByText('Alpha'));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  describe('with the external link dialog of the description open', () => {
    const openExternalLinkDialog = () => {
      const card = screen.getByText('Alpha').closest('[role="button"]') as HTMLElement;
      fireEvent.click(within(card).getByRole('button'));
      fireEvent.click(screen.getByText('the docs'));
      return screen.getByRole('alertdialog');
    };

    it('does not select the neuron on a click on a dialog button', () => {
      const onSelect = renderCard();
      const dialog = openExternalLinkDialog();
      onSelect.mockClear();

      fireEvent.click(within(dialog).getAllByRole('button')[0]);

      expect(onSelect).not.toHaveBeenCalled();
    });

    it('does not select the neuron on a click on the dialog overlay', () => {
      const onSelect = renderCard();
      openExternalLinkDialog();
      onSelect.mockClear();

      fireEvent.click(document.querySelector('[data-slot="alert-dialog-overlay"]')!);

      expect(onSelect).not.toHaveBeenCalled();
    });
  });
});
