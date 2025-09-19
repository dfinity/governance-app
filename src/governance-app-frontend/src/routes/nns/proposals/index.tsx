import { ProposalRewardStatus, ProposalStatus, Topic, votableNeurons } from '@dfinity/nns';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { BadgeWithIcon, Link } from '@untitledui/components';
import { PlusCircle } from '@untitledui/icons';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { InViewSentinel } from '@components/extra/InViewSentinel';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useGovernanceGetNeurons } from '@hooks/canisters/governance/useGovernanceGetNeurons';
import { useGovernanceGetProposals } from '@hooks/canisters/governance/useGovernanceListProposals';
import useTitle from '@hooks/useTitle';

export const Route = createFileRoute('/nns/proposals/')({
  component: ProposalsPage,
});

function useVotableProposals() {
  const { data: neuronsData } = useGovernanceGetNeurons();
  const { data: proposalsData } = useGovernanceGetProposals();

  const proposals = proposalsData?.pages?.flatMap((page) => page?.response.proposals) ?? [];

  const acceptVotesProposals = proposals.filter(
    (proposal) => proposal.rewardStatus === ProposalRewardStatus.AcceptVotes,
  );
  // Request Neuron Management proposals that are open and have an ineligible reward
  // status because they don't have rewards (not ProposalRewardStatus.AcceptVotes),
  // but are still votable.
  // Only users which are listed explicitly in the followees of a Neuron Management proposal will get to
  // see such a proposal in the query response. So for most users the response will be empty.
  const neuronManagementProposals = proposals.filter(
    (proposal) =>
      proposal.topic === Topic.NeuronManagement &&
      proposal.rewardStatus === ProposalRewardStatus.Ineligible &&
      proposal.status === ProposalStatus.Open,
  );

  const votableProposals = [...acceptVotesProposals, ...neuronManagementProposals];
  return votableProposals
    .filter(
      (proposal) => votableNeurons({ neurons: neuronsData?.response || [], proposal }).length > 0,
    )
    .map((p) => p.id);
}

function ProposalsPage() {
  const { isLoading, error, data, hasNextPage, fetchNextPage } = useGovernanceGetProposals();
  const votableProposals = useVotableProposals();
  const { t } = useTranslation();
  useTitle(t(($) => $.common.proposalsList));

  return (
    <div className="flex flex-col gap-2 text-xl">
      <div className="mb-2 flex gap-2 text-primary">{t(($) => $.common.proposalsList)}</div>

      {isLoading && <SkeletonLoader count={3} />}
      {!isLoading && !data?.pages?.length && (
        <p className="text-sm font-bold text-orange-600">⚠️ {t(($) => $.common.noProposals)}</p>
      )}
      {error && t(($) => $.common.errorLoadingProposals, { error: error.message })}

      <div className="grid grid-cols-1 gap-4 text-lg sm:grid-cols-2 lg:grid-cols-3">
        {data?.pages?.map((page) =>
          page?.response.proposals.map((proposal) => {
            const canIVote = votableProposals.includes(proposal.id);

            return (
              <Link
                params={{ id: proposal.id?.toString() ?? '' }}
                key={proposal.id?.toString()}
                to="/nns/proposals/$id"
              >
                <div className="flex h-full flex-col justify-between rounded-lg bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset focus-visible:outline-2 focus-visible:outline-offset-2">
                  <p className="overflow-hidden overflow-ellipsis text-secondary">
                    #{proposal.id?.toString()} {proposal.proposal?.title}
                  </p>
                  <div className="mt-4 flex h-4 items-end justify-between text-sm font-bold text-secondary">
                    <BadgeWithIcon
                      iconLeading={canIVote ? PlusCircle : undefined}
                      color={canIVote ? 'blue-light' : 'blue'}
                    >
                      {t(($) => $.enums.ProposalStatus[proposal.status])}
                    </BadgeWithIcon>
                    <CertifiedBadge certified={page?.certified} />
                  </div>
                </div>
              </Link>
            );
          }),
        )}

        {hasNextPage && (
          <InViewSentinel retrigger={data} callback={fetchNextPage}>
            <SkeletonLoader count={3} />
          </InViewSentinel>
        )}
      </div>
    </div>
  );
}
