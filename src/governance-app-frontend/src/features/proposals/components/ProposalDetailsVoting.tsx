import { ProposalInfo, Vote } from '@icp-sdk/canisters/nns';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { CheckCircle, ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@components/Card';
import { Spinner } from '@components/Spinner';
import { E8S } from '@constants/extra';
import { formatNumber, formatPercentage } from '@utils/numbers';
import { cn } from '@utils/shadcn';

import { useVoting } from '../hooks/useVoting';

type Props = {
  proposal: ProposalInfo;
};

/**
 * Footer of the voting card that sticks to the bottom of the scroll area while the card is
 * below it, and docks under the card once the user reaches it.
 * It must be a direct child of the page column: the negative margins cancel the column's `gap-6`.
 */
const DockingFooter = ({ children }: { children: ReactNode }) => {
  const footerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isDocked, setIsDocked] = useState(true);

  useEffect(() => {
    const main = document.querySelector('main');
    const footer = footerRef.current;
    const sentinel = sentinelRef.current;
    if (!main || !footer || !sentinel) return;

    let observer: IntersectionObserver | undefined;
    let observedRoot: Element | null | undefined;
    let observedInset: number | undefined;

    // `main` scrolls on desktop and the document scrolls on mobile. The footer sticks at its
    // `bottom` offset, above the bottom padding of `main` when `main` is the scroller.
    // Both change with the breakpoint, so the observer follows the size of `main`.
    const observe = () => {
      const mainStyle = getComputedStyle(main);
      const root = mainStyle.overflowY === 'visible' ? null : main;
      const inset =
        (parseFloat(getComputedStyle(footer).bottom) || 0) +
        (root ? parseFloat(mainStyle.paddingBottom) || 0 : 0);
      if (root === observedRoot && inset === observedInset) return;

      observedRoot = root;
      observedInset = inset;
      observer?.disconnect();
      observer = new IntersectionObserver(
        ([entry]) => setIsDocked(entry.boundingClientRect.top < (entry.rootBounds?.bottom ?? 0)),
        { root, rootMargin: `0px 0px -${inset}px 0px` },
      );
      observer.observe(sentinel);
    };

    observe();
    const resizeObserver = new ResizeObserver(observe);
    resizeObserver.observe(main);

    return () => {
      resizeObserver.disconnect();
      observer?.disconnect();
    };
  }, []);

  return (
    <>
      {/* Inset shadows draw the outline, so the docked footer joins the card without a seam. */}
      <div
        ref={footerRef}
        data-state={isDocked ? 'docked' : 'floating'}
        className={cn(
          'sticky bottom-[calc(var(--bottom-nav-space)+1rem)] z-10 -mt-6 bg-card px-6 py-5 transition-[border-radius,box-shadow] duration-200 ease-out motion-reduce:transition-none lg:bottom-0',
          isDocked
            ? 'rounded-t-none rounded-b-[6px] shadow-[inset_1px_0_var(--color-border),inset_-1px_0_var(--color-border),inset_0_-1px_var(--color-border),inset_0_1px_transparent,0_8px_30px_transparent]'
            : 'rounded-xl shadow-[inset_1px_0_var(--color-border),inset_-1px_0_var(--color-border),inset_0_-1px_var(--color-border),inset_0_1px_var(--color-border),0_8px_30px_rgb(0_0_0/0.12)]',
        )}
      >
        {children}
      </div>
      <div ref={sentinelRef} className="-mt-6" />
    </>
  );
};

export const ProposalDetailsVoting: React.FC<Props> = ({ proposal }) => {
  const { identity } = useInternetIdentity();
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  const [votingFor, setVotingFor] = useState<Vote.No | Vote.Yes | undefined>();

  const yes = Number(proposal.latestTally?.yes ?? 0n) / E8S;
  const no = Number(proposal.latestTally?.no ?? 0n) / E8S;
  const total = Number(proposal.latestTally?.total ?? 0n) / E8S;

  const yesProportion = total > 0 ? yes / total : 0;
  const noProportion = total > 0 ? no / total : 0;
  const totalProportion = yesProportion + noProportion;

  const { vote, isVoting, hasVoted, isVoteMixed, voteValue, canVote } = useVoting(proposal);

  const voteHandler = (
    ballot: Vote.Yes | Vote.No,
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.preventDefault();
    setVotingFor(ballot);
    vote(ballot);
  };

  useEffect(() => {
    if (!isVoting) {
      setVotingFor(undefined);
    }
  }, [isVoting]);

  useEffect(() => {
    requestAnimationFrame(() => setIsMounted(true));
  }, []);

  if (!identity) return null;

  return (
    <>
      <Card className={cn(canVote && 'rounded-b-none border-b-0 pb-3')}>
        <CardHeader>
          <CardTitle>{t(($) => $.proposal.votingStatus)}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-emerald-800 dark:text-emerald-400">
                {t(($) => $.proposal.yes)}: {formatPercentage(yesProportion)}
              </span>
              <span className="text-red-700 dark:text-red-400">
                {t(($) => $.proposal.no)}: {formatPercentage(noProportion)}
              </span>
            </div>
            <div
              className="relative h-3 w-full overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-label={t(($) => $.proposal.voteProgress)}
              aria-valuenow={yes + no}
              aria-valuemin={0}
              aria-valuemax={total}
            >
              <div className="absolute top-0 left-1/2 z-10 h-full w-0.5 -translate-x-1/2 bg-foreground/10" />
              <div
                className="absolute top-0 bottom-0 left-0 bg-emerald-800 transition-all duration-1000 ease-out dark:bg-emerald-400"
                style={{ width: `${isMounted ? yesProportion * 100 : 0}%` }}
              />
              <div
                className="absolute top-0 right-0 bottom-0 bg-red-800 transition-all duration-1000 ease-out dark:bg-red-400"
                style={{ width: `${isMounted ? noProportion * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t(($) => $.proposal.totalVotingPower)}
              </span>
              <span className="font-semibold">
                {formatNumber(total, {
                  minFraction: 0,
                  maxFraction: 0,
                })}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t(($) => $.proposal.participation)}
              </span>
              <span className="font-semibold">{formatPercentage(totalProportion)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{t(($) => $.proposal.yesVotes)}</span>
              <span className="font-semibold text-emerald-800 dark:text-emerald-400">
                {formatNumber(yes, { minFraction: 0, maxFraction: 0 })}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{t(($) => $.proposal.noVotes)}</span>
              <span className="font-semibold text-red-800 dark:text-red-400">
                {formatNumber(no, { minFraction: 0, maxFraction: 0 })}
              </span>
            </div>
          </div>
        </CardContent>

        {hasVoted && (
          <CardFooter className="py-2">
            <div
              className={cn(
                'flex w-full items-center gap-2 rounded-md border p-2 text-sm',
                isVoteMixed
                  ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                  : voteValue === Vote.Yes
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400',
              )}
            >
              {isVoteMixed ? (
                <>
                  <TriangleAlert className="size-4" />
                  <Trans
                    values={{ vote: t(($) => $.proposal.mixed) }}
                    i18nKey={($) => $.proposal.voteCast}
                    components={{ strong: <strong /> }}
                  />
                </>
              ) : voteValue === Vote.Yes ? (
                <>
                  <CheckCircle className="size-4" />
                  <Trans
                    values={{ vote: t(($) => $.proposal.yes) }}
                    i18nKey={($) => $.proposal.voteCast}
                    components={{ strong: <strong /> }}
                  />
                </>
              ) : (
                <>
                  <CheckCircle className="size-4" />
                  <Trans
                    values={{ vote: t(($) => $.proposal.no) }}
                    i18nKey={($) => $.proposal.voteCast}
                    components={{ strong: <strong /> }}
                  />
                </>
              )}
            </div>
          </CardFooter>
        )}
      </Card>

      {canVote && (
        <DockingFooter>
          <div className="flex w-full items-center gap-2">
            <Button
              aria-busy={isVoting}
              aria-label={t(($) => $.proposal.ariaLabelVote, {
                vote: t(($) => $.proposal.yes),
                proposalId: proposal.id?.toString(),
              })}
              className="flex-1 text-emerald-800 hover:border-emerald-700 hover:bg-emerald-100/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:border-emerald-300 dark:hover:bg-emerald-50/10 dark:hover:text-emerald-300"
              disabled={isVoting}
              onClick={(e) => voteHandler(Vote.Yes, e)}
              size="xl"
              variant="outline"
            >
              {isVoting && votingFor === Vote.Yes ? (
                <Spinner className="mr-2" />
              ) : (
                <ThumbsUp className="mr-2 size-4" />
              )}
              {t(($) => $.proposal.yes)}
            </Button>
            <Button
              aria-busy={isVoting}
              aria-label={t(($) => $.proposal.ariaLabelVote, {
                vote: t(($) => $.proposal.no),
                proposalId: proposal.id?.toString(),
              })}
              className="flex-1 text-red-800 hover:border-red-700 hover:bg-red-100/10 hover:text-red-700 dark:text-red-400 dark:hover:border-red-300 dark:hover:bg-red-900/10 dark:hover:text-red-300"
              disabled={isVoting}
              onClick={(e) => voteHandler(Vote.No, e)}
              size="xl"
              variant="outline"
            >
              {isVoting && votingFor === Vote.No ? (
                <Spinner className="mr-2" />
              ) : (
                <ThumbsDown className="mr-2 size-4" />
              )}
              {t(($) => $.proposal.no)}
            </Button>
          </div>
        </DockingFooter>
      )}
    </>
  );
};
