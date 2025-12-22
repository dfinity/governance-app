import { createFileRoute } from '@tanstack/react-router';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ProposalListItem } from '@features/proposals/components/ProposalListItem';
import { useVotableLoadedProposals } from '@features/proposals/hooks/useVotableLoadedProposals';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Button } from '@components/button';
import { Card } from '@components/Card';
import { InViewSentinel } from '@components/InViewSentinel';
import { QueryStates } from '@components/QueryStates';
import { Separator } from '@components/Separator';
import { SkeletonLoader } from '@components/SkeletonLoader';
import { useGovernanceProposals } from '@hooks/governance';
import useTitle from '@hooks/useTitle';
import { Users } from 'lucide-react';

export const Route = createFileRoute('/voting/')({
  component: Voting,
});

function Voting() {
  const { t } = useTranslation();
  useTitle(t(($) => $.common.proposalsList));
  const [showProposals, setShowProposals] = useState(false);
  const shouldShowProposals = useDeferredValue(showProposals);
  const proposalsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showProposals && proposalsRef.current) {
      setTimeout(() => {
        proposalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    }
  }, [showProposals]);

  const votableProposals = useVotableLoadedProposals();
  const proposals = useGovernanceProposals();
  const toggleViewProposals = () => setShowProposals((prev) => !prev);
  // @TODO: Check if user has Neurons, if it does and non-advance mode use the value of a neuron?
  // what if multiple neurons have different followings because and update went wrong?
  // if no neurons, then no following -> if user sets following and then close the dapp without creating a neuron? localstorage?
  const hasUserSetUpFollowing = false;

  // @TODO: The conditional rendering of the proposals list depends on the Advance Toggle
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t(($) => $.voting.title)}</h2>
          <p className="text-sm text-muted-foreground">{t(($) => $.voting.description)}</p>
        </div>
        <Button size="xl" disabled>
          <Users />
          {t(($) => $.voting.cta)}
        </Button>
      </div>
      {!hasUserSetUpFollowing && (
        <>
          <Alert className="flex gap-1" variant="warning">
            <AlertTitle className="font-semibold">{t(($) => $.common.important)}:</AlertTitle>
            <AlertDescription>{t(($) => $.voting.setupFollowingReminder)}</AlertDescription>
          </Alert>

          <div className="mt-12 flex flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-18 w-18 items-center justify-center rounded-full border-2 bg-muted">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold">{t(($) => $.voting.noFollowing.title)}</h3>
            <p className="max-w-sm font-light text-muted-foreground">
              {t(($) => $.voting.noFollowing.description)}
            </p>
          </div>
        </>
      )}

      <Separator className="mt-16 mb-4" />

      <div
        ref={proposalsRef}
        className="mr-auto ml-auto flex scroll-mt-24 items-center gap-1 text-muted-foreground"
      >
        <span>{t(($) => $.voting.proposals.title)}</span>
        <button
          onClick={toggleViewProposals}
          className="font-medium text-primary capitalize underline-offset-4 hover:underline"
        >
          {t(($) => (showProposals ? $.voting.proposals.ctaHide : $.voting.proposals.ctaShow))}
        </button>
      </div>
      {showProposals &&
        (!shouldShowProposals ? (
          <div className="flex flex-col gap-4">
            <Card>
              <SkeletonLoader count={3} />
            </Card>
            <Card>
              <SkeletonLoader count={3} />
            </Card>
            <Card>
              <SkeletonLoader count={3} />
            </Card>
          </div>
        ) : (
          <QueryStates
            infiniteQuery={proposals}
            isEmpty={(data) => !data?.pages?.[0].response.proposals.length}
          >
            {(data) => (
              <div className="flex flex-col gap-4">
                {data?.pages?.map((page) =>
                  page?.response.proposals
                    .toSorted((a, b) => {
                      const isAOpen = a.status === 1;
                      const isBOpen = b.status === 1;

                      // If both are open, or neither are open, keep original order
                      if (isAOpen === isBOpen) return 0;
                      if (isAOpen) return -1;
                      return 1;
                    })
                    .map((proposal) => {
                      const canUserVote = votableProposals.has(proposal.id);

                      return (
                        <div key={proposal.id?.toString()} className="w-full">
                          <ProposalListItem
                            proposal={proposal}
                            canUserVote={canUserVote}
                            certified={page?.certified}
                          />
                        </div>
                      );
                    }),
                )}

                {proposals.hasNextPage && (
                  <InViewSentinel retrigger={data} callback={proposals.fetchNextPage}>
                    {/* @TODO: Update skeleton loader to match list item */}
                    <SkeletonLoader count={3} />
                  </InViewSentinel>
                )}
              </div>
            )}
          </QueryStates>
        ))}
    </div>
  );
}
