import { ProposalStatus } from '@icp-sdk/canisters/nns';
import { isNullish, nonNullish } from '@dfinity/utils';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Eye, EyeOff, Users } from 'lucide-react';
import { type MouseEvent, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ProposalListItem } from '@features/proposals/components/ProposalListItem';
import {
  isProposalFilter,
  ProposalFilter,
  validateProposalsSearch,
} from '@features/proposals/utils';
import { FollowedNeuronCard } from '@features/voting/components/FollowedNeuronCard';
import { getUsersFollowedNeurons } from '@features/voting/utils/findFollowedNeuron';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Button } from '@components/button';
import { Card } from '@components/Card';
import { InViewSentinel } from '@components/InViewSentinel';
import { MultipleSkeletons } from '@components/MultipleSkeletons';
import { PageHeader } from '@components/PageHeader';
import { QueryStates } from '@components/QueryStates';
import { Separator } from '@components/Separator';
import { Skeleton } from '@components/Skeleton';
import { ToggleGroup, ToggleGroupItem } from '@components/ToggleGroup';
import { useGovernanceNeurons, useGovernanceProposals } from '@hooks/governance';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';
import { warningNotification } from '@utils/notification';

import i18n from '@/i18n/config';

export const Route = createFileRoute('/_auth/voting/')({
  validateSearch: validateProposalsSearch,
  component: Voting,
  pendingComponent: () => <MultipleSkeletons count={3} />,
  head: () => {
    const title = i18n.t(($) => $.common.head.voting.title);

    return {
      meta: [{ title }],
    };
  },
  staticData: {
    title: 'common.voting',
  },
});

function Voting() {
  const { t } = useTranslation();

  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const showProposals = search.showProposals;
  const proposalsRef = useRef<HTMLDivElement>(null);

  const proposalFilter = search.proposalFilter ?? ProposalFilter.Open;
  const openProposals = useGovernanceProposals({
    includeStatus: [ProposalStatus.Open],
  });
  const allProposals = useGovernanceProposals();
  const activeQuery = proposalFilter === ProposalFilter.Open ? openProposals : allProposals;

  const neuronsQuery = useGovernanceNeurons();
  const knownNeuronsQuery = useGovernanceKnownNeurons();
  const isLoadingFollowing = neuronsQuery.isLoading || knownNeuronsQuery.isLoading;

  const userNeurons = neuronsQuery.data?.response ?? [];
  const knownNeurons = knownNeuronsQuery.data?.response ?? [];
  const followedNeurons = getUsersFollowedNeurons({
    userNeurons,
    knownNeurons,
  });
  // @TODO: Set "noUncheckedIndexedAccess": true in tsconfig to handle possible undefined values more safely.
  const hasConsistentFollowees = followedNeurons.length === 1;
  const followedNeuron = followedNeurons[0];

  const handleManageFollowing = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!neuronsQuery.data?.response?.length) {
      e.preventDefault();
      warningNotification({
        description: t(($) => $.voting.warnings.stakeRequired),
      });
    }
  };

  const toggleViewProposals = () =>
    navigate({
      search: (prev) => ({ ...prev, showProposals: !showProposals ? true : undefined }),
      replace: true,
    });

  useEffect(() => {
    if (!showProposals) return;

    const id = setTimeout(() => {
      proposalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
    return () => clearTimeout(id);
  }, [showProposals, proposalFilter]);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {!isNullish(followedNeuron) && (
        <PageHeader
          title={t(($) => $.voting.title)}
          description={t(($) => $.voting.description)}
          actions={
            <Button size="xl" className="w-full sm:w-auto" asChild>
              <Link to="/voting/representatives" onClick={handleManageFollowing}>
                <Users />
                {t(($) => $.voting.cta)}
              </Link>
            </Button>
          }
        />
      )}

      {(neuronsQuery.isError || knownNeuronsQuery.isError) && (
        <Alert variant="destructive">
          <AlertTitle>{t(($) => $.common.loadingError)}</AlertTitle>
          <AlertDescription>{t(($) => $.voting.errors.loadFollowing)}</AlertDescription>
        </Alert>
      )}

      {isLoadingFollowing ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : isNullish(followedNeuron) ? (
        <>
          <div className="mt-20 flex flex-col items-center justify-center gap-6 text-center">
            <div className="rounded-full border-2 border-secondary/90 bg-secondary/30 p-6">
              <Users className="size-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold">{t(($) => $.voting.noFollowing.title)}</h3>
            <p className="max-w-sm text-base text-muted-foreground">
              {t(($) => $.voting.noFollowing.body)}
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:items-center">
              <Button size="xl" className="w-full sm:w-auto" asChild>
                <Link to="/voting/representatives" onClick={handleManageFollowing}>
                  <Users />
                  {t(($) => $.voting.noFollowing.cta)}
                </Link>
              </Button>
            </div>
          </div>

          <Separator className="mt-8 mb-4 lg:mt-16" />

          <div ref={proposalsRef} className="mx-auto flex scroll-mt-8 flex-col items-center gap-3">
            <p className="text-sm text-foreground">{t(($) => $.voting.proposals.cta)}</p>
            <Button variant="outline" size="sm" onClick={toggleViewProposals} className="gap-2">
              <span className="font-medium">
                {t(($) =>
                  showProposals ? $.voting.proposals.ctaHide : $.voting.proposals.ctaShow,
                )}
              </span>
              {showProposals ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
        </>
      ) : !hasConsistentFollowees ? (
        <>
          <Alert variant="warning">
            <AlertTitle className="font-semibold">
              {t(($) => $.voting.warnings.followingMismatchTitle)}
            </AlertTitle>
            <AlertDescription>{t(($) => $.voting.warnings.followingMismatch)}</AlertDescription>
          </Alert>
        </>
      ) : (
        <FollowedNeuronCard neuron={followedNeuron} />
      )}

      {nonNullish(followedNeuron) && (
        <>
          <Separator className="mt-8 mb-4 lg:mt-16" />

          <div ref={proposalsRef} className="mx-auto flex scroll-mt-8 flex-col items-center gap-3">
            <p className="text-sm text-foreground">{t(($) => $.voting.proposals.cta)}</p>
            <Button variant="outline" size="sm" onClick={toggleViewProposals} className="gap-2">
              <span className="font-medium">
                {t(($) =>
                  showProposals ? $.voting.proposals.ctaHide : $.voting.proposals.ctaShow,
                )}
              </span>
              {showProposals ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
        </>
      )}

      {showProposals && (
        <div className="flex flex-col gap-4">
          <ToggleGroup
            type="single"
            value={proposalFilter}
            onValueChange={(v) => {
              if (!isProposalFilter(v)) return;
              navigate({
                search: (prev) => ({
                  ...prev,
                  proposalFilter: v === ProposalFilter.Open ? undefined : v,
                }),
                replace: true,
              });
            }}
            variant="outline"
            size="lg"
          >
            <ToggleGroupItem
              value={ProposalFilter.Open}
              className="px-5 data-[state=on]:font-semibold"
            >
              {t(($) => $.voting.proposals.filterOpen)}
            </ToggleGroupItem>
            <ToggleGroupItem
              value={ProposalFilter.All}
              className="px-5 data-[state=on]:font-semibold"
            >
              {t(($) => $.voting.proposals.filterAll)}
            </ToggleGroupItem>
          </ToggleGroup>

          <QueryStates
            infiniteQuery={activeQuery}
            isEmpty={(data) => !data?.pages?.[0].response.proposals.length}
            emptyComponent={
              proposalFilter === ProposalFilter.Open ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t(($) => $.voting.proposals.noOpenProposals)}
                </p>
              ) : undefined
            }
            loadingComponent={
              <div className="flex flex-col gap-4">
                <Card>
                  <MultipleSkeletons count={3} />
                </Card>
                <Card>
                  <MultipleSkeletons count={3} />
                </Card>
                <Card>
                  <MultipleSkeletons count={3} />
                </Card>
              </div>
            }
          >
            {(data) => (
              <>
                {data?.pages?.map((page) =>
                  page?.response.proposals.map((proposal) => (
                    <div key={proposal.id?.toString()} className="w-full">
                      <Link
                        to="/voting/proposals/$id"
                        params={{ id: proposal.id! }}
                        search={{
                          showProposals,
                          proposalFilter:
                            proposalFilter === ProposalFilter.Open ? undefined : proposalFilter,
                        }}
                        className="w-full"
                      >
                        <ProposalListItem proposal={proposal} certified={page?.certified} />
                      </Link>
                    </div>
                  )),
                )}

                {activeQuery.hasNextPage && (
                  <InViewSentinel retrigger={data} callback={activeQuery.fetchNextPage}>
                    {/* @TODO: Update skeleton loader to match list item */}
                    <MultipleSkeletons count={3} />
                  </InViewSentinel>
                )}
              </>
            )}
          </QueryStates>
        </div>
      )}
    </div>
  );
}
