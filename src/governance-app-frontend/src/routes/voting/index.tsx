import { isNullish } from '@dfinity/utils';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Users } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ProposalListItem } from '@features/proposals/components/ProposalListItem';
import { getShowProposalUrlStatus } from '@features/proposals/utils';
import { FollowedNeuronCard } from '@features/voting/components/FollowedNeuronCard';
import { getUsersFollowedNeurons } from '@features/voting/utils/findFollowedNeuron';
import { sortProposals } from '@features/voting/utils/proposals';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Button } from '@components/button';
import { Card } from '@components/Card';
import { InViewSentinel } from '@components/InViewSentinel';
import { QueryStates } from '@components/QueryStates';
import { Separator } from '@components/Separator';
import { SkeletonLoader } from '@components/SkeletonLoader';
import { useGovernanceNeurons, useGovernanceProposals } from '@hooks/governance';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';
import useTitle from '@hooks/useTitle';
import { warningNotification } from '@utils/notification';
import { requireIdentity } from '@utils/router';

export const Route = createFileRoute('/voting/')({
  validateSearch: getShowProposalUrlStatus,
  component: Voting,
  pendingComponent: () => <SkeletonLoader count={3} />,
  beforeLoad: requireIdentity,
  staticData: {
    title: 'common.voting',
  },
});

function Voting() {
  const { t } = useTranslation();
  useTitle(t(($) => $.common.proposalsList));

  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const showProposals = search.showProposals;
  const proposalsRef = useRef<HTMLDivElement>(null);

  const proposals = useGovernanceProposals();

  const neuronsQuery = useGovernanceNeurons();
  const knownNeuronsQuery = useGovernanceKnownNeurons();

  const userNeurons = neuronsQuery.data?.response ?? [];
  const knownNeurons = knownNeuronsQuery.data?.response ?? [];
  const followedNeurons = getUsersFollowedNeurons({
    userNeurons,
    knownNeurons,
  });
  // @TODO: Set "noUncheckedIndexedAccess": true in tsconfig to handle possible undefined values more safely.
  const hasConsistentFollowees = followedNeurons.length === 1;
  const followedNeuron = followedNeurons[0];

  // @TODO: Prefer Link component when available
  const handleManageFollowing = () => {
    if (!neuronsQuery.data?.response?.length) {
      warningNotification({
        description: t(($) => $.voting.warnings.stakeRequired),
      });
      return;
    }

    navigate({ to: '/voting/known-neurons' });
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
      {!isNullish(followedNeuron) && (
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
      )}

      {(neuronsQuery.isError || knownNeuronsQuery.isError) && (
        <Alert variant="destructive">
          <AlertTitle>{t(($) => $.common.loadingError)}</AlertTitle>
          <AlertDescription>{t(($) => $.voting.errors.loadFollowing)}</AlertDescription>
        </Alert>
      )}

      {isNullish(followedNeuron) ? (
        <>
          <Alert variant="warning">
            <AlertTitle className="font-semibold">{t(($) => $.common.important)}</AlertTitle>
            <AlertDescription>
              {t(($) => $.voting.noFollowing.setupFollowingReminder)}
            </AlertDescription>
          </Alert>

          <div className="mt-20 flex flex-col items-center justify-center gap-6 text-center">
            <div className="rounded-full border-2 border-secondary/90 bg-secondary/30 p-6">
              <Users className="size-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold">{t(($) => $.voting.noFollowing.title)}</h3>
            <p className="max-w-sm text-base text-muted-foreground">
              {t(($) => $.voting.noFollowing.description)}
            </p>
            <div className="flex flex-col gap-3 sm:items-center">
              <Button
                size="xl"
                className="w-full capitalize sm:w-auto"
                onClick={handleManageFollowing}
              >
                <Users />
                {t(($) => $.voting.cta)}
              </Button>
              <Button
                variant="ghost"
                size="xl"
                onClick={toggleViewProposals}
                className="w-full sm:w-auto"
              >
                {t(($) =>
                  showProposals ? $.voting.proposals.ctaHide : $.voting.proposals.ctaShow,
                )}
              </Button>
            </div>
          </div>
        </>
      ) : !hasConsistentFollowees ? (
        <>
          {/* @TODO: Improve how we inform users that they have a mix of following */}
          <Alert variant="warning">
            <AlertTitle className="font-semibold">{t(($) => $.common.caution)}</AlertTitle>
            <AlertDescription>{t(($) => $.voting.warnings.followingMismatch)}</AlertDescription>
          </Alert>
        </>
      ) : (
        <FollowedNeuronCard neuron={followedNeuron} />
      )}

      {!isNullish(followedNeuron) && (
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
                page?.response.proposals.toSorted(sortProposals).map((proposal) => (
                  <div key={proposal.id?.toString()} className="w-full">
                    <Link
                      to="/voting/proposals/$id"
                      params={{ id: proposal.id! }}
                      search={{ showProposals }}
                      className="w-full"
                      preload="intent"
                    >
                      <ProposalListItem proposal={proposal} certified={page?.certified} />
                    </Link>
                  </div>
                )),
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
