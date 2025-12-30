import { createFileRoute, Link } from '@tanstack/react-router';
import { Users } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ProposalListItem } from '@features/proposals/components/ProposalListItem';
import { useVotableLoadedProposals } from '@features/proposals/hooks/useVotableLoadedProposals';
import { getShowProposalUrlStatus } from '@features/proposals/utils';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Button } from '@components/button';
import { Card } from '@components/Card';
import { InViewSentinel } from '@components/InViewSentinel';
import { QueryStates } from '@components/QueryStates';
import { Separator } from '@components/Separator';
import { SkeletonLoader } from '@components/SkeletonLoader';
import { useGovernanceNeurons, useGovernanceProposals } from '@hooks/governance';
import useTitle from '@hooks/useTitle';
import { warningNotification } from '@utils/notification';

export const Route = createFileRoute('/voting/')({
  validateSearch: getShowProposalUrlStatus,
  component: Voting,
  staticData: {
    title: 'common.voting',
  },
});

function Voting() {
  const { t } = useTranslation();
  useTitle(t(($) => $.common.proposalsList));

  // @TODO: Derive this data from persisted user setting "advance mode", and user data(configuration of neurons).
  const hasUserSetAdvanceMode = false;
  // @TODO: Based on the previous derive if the user has the Empty state or not.
  const hasUserSetUpFollowing = false;

  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const showProposals = hasUserSetAdvanceMode || search.showProposals;
  const proposalsRef = useRef<HTMLDivElement>(null);

  const votableProposals = useVotableLoadedProposals();
  const proposals = useGovernanceProposals();

  const { data: neurons } = useGovernanceNeurons({
    includeEmptyNeurons: false,
    certified: false,
  });

  const handleManageFollowing = () => {
    if (!neurons?.response?.length) {
      warningNotification({
        description: t(($) => $.voting.warnings.stakeRequired),
      });
      return;
    }
  };

  const toggleViewProposals = () =>
    navigate({
      search: (prev) => ({ ...prev, showProposals: !showProposals ? true : undefined }),
      replace: true,
    });

  useEffect(() => {
    if (showProposals && proposalsRef.current) {
      setTimeout(() => {
        proposalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    }
  }, [showProposals]);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex flex-col gap-6 md:flex-row md:justify-between">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t(($) => $.voting.title)}</h2>
          <p className="text-sm text-muted-foreground">{t(($) => $.voting.description)}</p>
        </div>
        <Button size="xl" className="capitalize" onClick={handleManageFollowing}>
          <Users />
          {t(($) => $.voting.cta)}
        </Button>
      </div>
      {!hasUserSetAdvanceMode && !hasUserSetUpFollowing && (
        <>
          <Alert variant="warning">
            <AlertTitle className="font-semibold">{t(($) => $.common.important)}</AlertTitle>
            <AlertDescription>{t(($) => $.voting.setupFollowingReminder)}</AlertDescription>
          </Alert>

          <div className="mt-6 flex flex-col items-center justify-center gap-4 text-center lg:mt-12">
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

      {!hasUserSetAdvanceMode && (
        <>
          <Separator className="mt-8 mb-4 lg:mt-16" />
          <div ref={proposalsRef} className="mx-auto flex scroll-mt-8 items-center gap-1">
            <button onClick={toggleViewProposals} className="text-sm text-muted-foreground">
              <span>{t(($) => $.voting.proposals.cta)}</span>{' '}
              <span className="font-medium text-primary capitalize underline-offset-4 hover:underline">
                {t(($) =>
                  showProposals ? $.voting.proposals.ctaHide : $.voting.proposals.ctaShow,
                )}
              </span>
            </button>
          </div>
        </>
      )}
      {showProposals && (
        <QueryStates
          infiniteQuery={proposals}
          isEmpty={(data) => !data?.pages?.[0].response.proposals.length}
          loadingComponent={
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
          }
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
                        <Link
                          to="/voting/proposals/$id"
                          params={{ id: proposal.id! }}
                          search={{ showProposals }}
                          className="w-full"
                          preload="intent"
                        >
                          <ProposalListItem
                            proposal={proposal}
                            canUserVote={canUserVote}
                            certified={page?.certified}
                          />
                        </Link>
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
      )}
    </div>
  );
}
