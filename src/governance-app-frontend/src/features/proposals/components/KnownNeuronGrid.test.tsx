import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KnownNeuronVote, KnownNeuronVoteState } from '../knownNeuronVotes';
import { KnownNeuronGrid } from './KnownNeuronGrid';

const votes: KnownNeuronVote[] = [
  { id: 1n, name: 'Alpha', state: KnownNeuronVoteState.Yes },
  { id: 2n, name: 'Beta', state: KnownNeuronVoteState.No },
  { id: 3n, name: 'Gamma', state: KnownNeuronVoteState.NotVoted },
];

const label = ({ name, state }: KnownNeuronVote) => `${name} ${state}`;

const renderGrid = () => {
  render(<KnownNeuronGrid votes={votes} newIds={new Set()} label={label} />);
  const grid = screen.getByTestId('known-neuron-grid');
  const square = (id: bigint) => grid.querySelector(`[data-vote-id="${id}"]`)!;
  return { grid, square };
};

const hover = (element: Element, pointerType = 'mouse') =>
  fireEvent.pointerMove(element, { pointerType });

describe('KnownNeuronGrid', () => {
  it('shows the label of the square under the pointer', () => {
    const { square } = renderGrid();

    hover(square(2n));

    expect(screen.getByTestId('known-neuron-tooltip').textContent).toBe('Beta no');
  });

  it('moves the same tooltip to the next square', () => {
    const { square } = renderGrid();

    hover(square(1n));
    const tooltip = screen.getByTestId('known-neuron-tooltip');
    hover(square(3n));

    expect(screen.getByTestId('known-neuron-tooltip')).toBe(tooltip);
    expect(tooltip.textContent).toBe('Gamma notVoted');
  });

  it('keeps the tooltip open over a gap', () => {
    const { grid, square } = renderGrid();

    hover(square(1n));
    hover(grid);

    expect(screen.getByTestId('known-neuron-tooltip').textContent).toBe('Alpha yes');
  });

  it('closes the tooltip when the pointer leaves the grid', () => {
    const { grid, square } = renderGrid();

    hover(square(1n));
    fireEvent.pointerLeave(grid);

    expect(screen.queryByTestId('known-neuron-tooltip')).toBeNull();
  });

  it('opens no tooltip for touch', () => {
    const { square } = renderGrid();

    hover(square(1n), 'touch');

    expect(screen.queryByTestId('known-neuron-tooltip')).toBeNull();
  });
});
