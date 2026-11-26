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
  const { rerender } = render(<KnownNeuronGrid votes={votes} newIds={new Set()} label={label} />);
  const grid = screen.getByTestId('known-neuron-grid');
  const square = (id: bigint) => grid.querySelector(`[data-vote-id="${id}"]`)!;
  const setVotes = (next: KnownNeuronVote[]) =>
    rerender(<KnownNeuronGrid votes={next} newIds={new Set()} label={label} />);
  return { grid, square, setVotes };
};

const tooltip = () => screen.queryByTestId('known-neuron-tooltip');

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

  it('lets the pointer through the tooltip', () => {
    const { square } = renderGrid();

    hover(square(1n));

    expect(tooltip()?.className).toContain('pointer-events-none');
  });

  it('closes the tooltip when a new vote moves the hovered square', () => {
    const { square, setVotes } = renderGrid();

    hover(square(3n));
    setVotes([{ ...votes[2], state: KnownNeuronVoteState.Yes }, votes[0], votes[1]]);

    expect(tooltip()).toBeNull();

    hover(square(1n));

    expect(tooltip()?.textContent).toBe('Alpha yes');
  });

  it('keeps the tooltip open when a new vote does not move the hovered square', () => {
    const { square, setVotes } = renderGrid();

    hover(square(1n));
    setVotes([votes[0], votes[1], { ...votes[2], state: KnownNeuronVoteState.No }]);

    expect(tooltip()?.textContent).toBe('Alpha yes');
  });

  it('hides the tooltip on Escape until the pointer reaches another square', () => {
    const { grid, square } = renderGrid();

    hover(square(1n));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(tooltip()).toBeNull();

    hover(square(1n));
    hover(grid);

    expect(tooltip()).toBeNull();

    hover(square(2n));

    expect(tooltip()?.textContent).toBe('Beta no');
  });

  it('closes the tooltip on a scroll until the pointer moves again', () => {
    const { square } = renderGrid();
    const scroller = document.createElement('main');
    document.body.append(scroller);

    hover(square(1n));
    fireEvent.scroll(scroller);

    expect(tooltip()).toBeNull();

    hover(square(1n));

    expect(tooltip()?.textContent).toBe('Alpha yes');
    scroller.remove();
  });
});
