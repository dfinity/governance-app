import { arrow, autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import { PointerEvent, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@utils/shadcn';

import { KnownNeuronVote, KnownNeuronVoteState } from '../knownNeuronVotes';

const YES_FILL = 'bg-emerald-800 dark:bg-emerald-400';
const NO_FILL = 'bg-red-800 dark:bg-red-400';

type Props = {
  votes: KnownNeuronVote[];
  newIds: Set<bigint>;
  label: (vote: KnownNeuronVote) => string;
};

type Hovered = { id: string; element: HTMLElement; moved: boolean };

/**
 * One tooltip serves the whole grid. It follows the pointer from square to square and stays open
 * over the gaps, so it does not close and open again at each square.
 */
export const KnownNeuronGrid = ({ votes, newIds, label }: Props) => {
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const [floatingElement, setFloatingElement] = useState<HTMLElement | null>(null);
  const [arrowElement, setArrowElement] = useState<HTMLElement | null>(null);

  const { floatingStyles, placement, middlewareData, isPositioned } = useFloating({
    open: hovered !== null,
    placement: 'top',
    elements: { reference: hovered?.element, floating: floatingElement },
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      arrow({ element: arrowElement }),
    ],
  });

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    // Touch opens no tooltip, as with the other tooltips.
    if (event.pointerType === 'touch') return;
    if (!(event.target instanceof Element)) return;
    const square = event.target.closest<HTMLElement>('[data-vote-id]');
    // Over a gap, the tooltip stays on the last square.
    if (!square?.dataset.voteId || square.dataset.voteId === hovered?.id) return;
    setHovered({ id: square.dataset.voteId, element: square, moved: hovered !== null });
  };

  const hoveredVote = hovered && votes.find((vote) => String(vote.id) === hovered.id);
  const side = placement.split('-')[0];

  return (
    <>
      <div
        data-testid="known-neuron-grid"
        className="grid grid-cols-[repeat(25,minmax(0,1fr))] gap-[3px]"
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHovered(null)}
      >
        {votes.map((vote) => (
          <span
            key={String(vote.id)}
            aria-hidden
            data-vote-id={String(vote.id)}
            className={cn(
              'aspect-square rounded-[2px] border',
              vote.state === KnownNeuronVoteState.Yes && cn(YES_FILL, 'border-transparent'),
              vote.state === KnownNeuronVoteState.No && cn(NO_FILL, 'border-transparent'),
              vote.state === KnownNeuronVoteState.NotVoted && 'border-border',
              vote.state === KnownNeuronVoteState.Unknown && 'border-dashed border-border',
              newIds.has(vote.id) && 'outline-2 outline-offset-1 outline-primary',
            )}
          />
        ))}
      </div>
      {hoveredVote &&
        createPortal(
          // The squares are in a screen reader list, so the tooltip is for sight only.
          <div
            ref={setFloatingElement}
            aria-hidden
            data-testid="known-neuron-tooltip"
            style={floatingStyles}
            className={cn(
              'z-50',
              !isPositioned && 'invisible',
              hovered.moved &&
                'transition-transform duration-100 ease-out motion-reduce:transition-none',
            )}
          >
            {/* The open animation is on an inner element, because the outer transform places the tooltip. */}
            <div
              className={cn(
                'relative max-w-64 rounded-md bg-foreground px-3 py-1.5 text-xs text-pretty text-background',
                !hovered.moved && 'animate-in fade-in-0 zoom-in-95',
                side === 'top' ? 'origin-bottom' : 'origin-top',
              )}
            >
              {label(hoveredVote)}
              <span
                ref={setArrowElement}
                className="absolute size-2.5 rotate-45 rounded-[2px] bg-foreground"
                style={{
                  left: middlewareData.arrow?.x,
                  ...(side === 'top'
                    ? { top: 'calc(100% - 7px)' }
                    : { bottom: 'calc(100% - 7px)' }),
                }}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
