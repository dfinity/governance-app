import { arrow, autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import { PointerEvent, useEffect, useState } from 'react';
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

type Hovered = {
  id: string;
  index: number;
  element: HTMLElement;
  moved: boolean;
  dismissed: boolean;
};

/**
 * One tooltip serves the whole grid. It follows the pointer from square to square and stays open
 * over the gaps, so it does not close and open again at each square.
 */
export const KnownNeuronGrid = ({ votes, newIds, label }: Props) => {
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const [floatingElement, setFloatingElement] = useState<HTMLElement | null>(null);
  const [arrowElement, setArrowElement] = useState<HTMLElement | null>(null);

  const index = hovered ? votes.findIndex((vote) => String(vote.id) === hovered.id) : -1;
  // A new vote reorders the squares, so the hovered square can move away from the pointer. The
  // tooltip then closes until the next pointer move.
  const current = hovered && index === hovered.index ? hovered : null;
  const open = current !== null && !current.dismissed;

  const { floatingStyles, placement, middlewareData, isPositioned } = useFloating({
    open,
    placement: 'top',
    elements: { reference: current?.element, floating: floatingElement },
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
    const id = square?.dataset.voteId;
    if (!square || !id || id === current?.id) return;
    setHovered({
      id,
      index: votes.findIndex((vote) => String(vote.id) === id),
      element: square,
      moved: open,
      dismissed: false,
    });
  };

  // Escape hides the tooltip until the pointer moves to another square. A scroll moves the squares
  // under a still pointer, so it closes the tooltip until the next pointer move.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setHovered((value) => value && { ...value, dismissed: true });
    };
    const onScroll = () => setHovered(null);
    document.addEventListener('keydown', onKeyDown);
    // The capture phase also catches a scroll of an inner element, such as the page main.
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [open]);

  const hoveredVote = open ? votes[index] : undefined;
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
          // The squares are in a screen reader list, so the tooltip is for sight only. It lets the
          // pointer through, so it does not cover the squares under it.
          <div
            ref={setFloatingElement}
            aria-hidden
            data-testid="known-neuron-tooltip"
            style={floatingStyles}
            className={cn(
              'pointer-events-none z-50',
              !isPositioned && 'invisible',
              current?.moved &&
                'transition-transform duration-100 ease-out motion-reduce:transition-none',
            )}
          >
            {/* The open animation is on an inner element, because the outer transform places the tooltip. */}
            <div
              className={cn(
                'relative max-w-64 rounded-md bg-foreground px-3 py-1.5 text-xs text-pretty text-background',
                !current?.moved && 'animate-in fade-in-0 zoom-in-95',
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
