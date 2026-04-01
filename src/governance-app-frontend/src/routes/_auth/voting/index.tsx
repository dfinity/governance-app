import { ProposalStatus } from '@icp-sdk/canisters/nns';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ProposalListItem } from '@features/proposals/components/ProposalListItem';
import {
  isProposalFilter,
  ProposalFilter,
  validateProposalsSearch,
} from '@features/proposals/utils';
import { useNonConstructiveProposalIds } from '@hooks/spamFilter';
import { AdvancedFollowingModal } from '@features/voting/components/AdvancedFollowingModal';
import { SimpleFollowingModal } from '@features/voting/components/SimpleFollowingModal';
import { VotingOverviewAdvanced } from '@features/voting/components/VotingOverviewAdvanced';
import { VotingOverviewSimple } from '@features/voting/components/VotingOverviewSimple';
import {
  getConsistentTopicFollowees,
  getSingleUniformFollowee,
} from '@features/voting/utils/topicFollowing';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Button } from '@components/button';
import { Card } from '@components/Card';
import { InViewSentinel } from '@components/InViewSentinel';
import { MultipleSkeletons } from '@components/MultipleSkeletons';
import { QueryStates } from '@components/QueryStates';
import { Separator } from '@components/Separator';
import { ToggleGroup, ToggleGroupItem } from '@components/ToggleGroup';
import { DIALOG_RESET_DELAY_MS } from '@constants/extra';
import { useGovernanceNeurons, useGovernanceProposals } from '@hooks/governance';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { AdvancedFeature } from '@typings/advancedFeatures';
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

  const nonConstructiveQuery = useNonConstructiveProposalIds();
  const nonConstructiveIds = nonConstructiveQuery.data;
  const spamProposalIds = nonConstructiveIds
    ? new Set(Array.from(nonConstructiveIds.abusive, String))
    : undefined;
  const nonActionableProposalIds = nonConstructiveIds
    ? new Set(Array.from(nonConstructiveIds.non_actionable, String))
    : undefined;

  const { features } = useAdvancedFeatures();
  const showSpamProposals = features[AdvancedFeature.ShowSpamProposals];
  const isAdvancedFollowing = features[AdvancedFeature.AdvancedFollowing];

  const neuronsQuery = useGovernanceNeurons();
  const knownNeuronsQuery = useGovernanceKnownNeurons();
  const isLoadingFollowing = neuronsQuery.isLoading || knownNeuronsQuery.isLoading;

  const userNeurons = neuronsQuery.data?.response ?? [];
  const knownNeurons = knownNeuronsQuery.data?.response ?? [];

  const consistentFollowees = getConsistentTopicFollowees(userNeurons);
  const uniformFolloweeId = consistentFollowees
    ? getSingleUniformFollowee(consistentFollowees)
    : undefined;
  const followedNeuron = uniformFolloweeId
    ? (knownNeurons.find((kn) => kn.id === uniformFolloweeId) ?? uniformFolloweeId)
    : undefined;

  const manageFollowing = search.manageFollowing ?? false;
  const setManageFollowing = (open: boolean) =>
    navigate({
      search: (prev) => ({ ...prev, manageFollowing: open ? true : undefined }),
      replace: true,
    });

  const handleManageFollowing = () => {
    if (!neuronsQuery.data?.response?.length) {
      warningNotification({
        description: t(($) => $.voting.warnings.stakeRequired),
      });
      return;
    }
    setManageFollowing(true);
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
    }, DIALOG_RESET_DELAY_MS);
    return () => clearTimeout(id);
  }, [showProposals, proposalFilter]);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {(neuronsQuery.isError || knownNeuronsQuery.isError) && (
        <Alert variant="destructive">
          <AlertTitle>{t(($) => $.common.loadingError)}</AlertTitle>
          <AlertDescription>{t(($) => $.voting.errors.loadFollowing)}</AlertDescription>
        </Alert>
      )}

      {isAdvancedFollowing ? (
        <VotingOverviewAdvanced
          userNeurons={userNeurons}
          knownNeurons={knownNeurons}
          isLoading={isLoadingFollowing}
          onManageFollowing={handleManageFollowing}
        />
      ) : (
        <VotingOverviewSimple
          followedNeuron={followedNeuron}
          userNeurons={userNeurons}
          isLoading={isLoadingFollowing}
          onManageFollowing={handleManageFollowing}
        />
      )}

      <Separator className="mt-8 mb-4 lg:mt-16" />

      <div ref={proposalsRef} className="mx-auto flex scroll-mt-8 flex-col items-center gap-3">
        <p className="text-sm text-foreground">{t(($) => $.voting.proposals.cta)}</p>
        <Button variant="outline" size="sm" onClick={toggleViewProposals} className="gap-2">
          <span className="font-medium">
            {t(($) => (showProposals ? $.voting.proposals.ctaHide : $.voting.proposals.ctaShow))}
          </span>
          {showProposals ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>

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
                  proposalFilter: v,
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
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t(($) =>
                  proposalFilter === ProposalFilter.Open
                    ? $.voting.proposals.noOpenProposals
                    : $.voting.proposals.noProposals,
                )}
              </p>
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
                  page?.response.proposals
                    .filter((proposal) => {
                      if (showSpamProposals) return true;
                      const id = proposal.id?.toString() ?? '';
                      return !spamProposalIds?.has(id) && !nonActionableProposalIds?.has(id);
                    })
                    .map((proposal) => {
                      const id = proposal.id?.toString() ?? '';
                      const isSpam = spamProposalIds?.has(id);
                      const isNonActionable = nonActionableProposalIds?.has(id);

                      return (
                        <div key={id} className="w-full">
                          <Link
                            to="/voting/proposals/$id"
                            params={{ id: proposal.id! }}
                            search={{
                              showProposals,
                              proposalFilter,
                            }}
                            className="w-full"
                          >
                            <ProposalListItem
                              proposal={proposal}
                              certified={page?.certified}
                              isSpam={isSpam}
                              isNonActionable={isNonActionable}
                            />
                          </Link>
                        </div>
                      );
                    }),
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

      {isAdvancedFollowing ? (
        <AdvancedFollowingModal open={manageFollowing} onOpenChange={setManageFollowing} />
      ) : (
        <SimpleFollowingModal open={manageFollowing} onOpenChange={setManageFollowing} />
      )}
    </div>
  );
}
