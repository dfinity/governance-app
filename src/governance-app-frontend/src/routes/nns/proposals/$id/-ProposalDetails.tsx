import { ProposalInfo, ProposalRewardStatus, ProposalStatus, Topic, Vote } from '@dfinity/nns';
import { jsonReplacer } from '@dfinity/utils';
import { UseQueryResult } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { Fragment } from 'react/jsx-runtime';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useGovernanceGetNeurons } from '@hooks/canisters/governance/useGovernanceGetNeurons';
import { useGovernanceGetProposal } from '@common/hooks/canisters/governance/useGovernanceGetProposal';
import { CertifiedData } from '@common/typings/queries';

type ProposalDetailsProps = {
  proposalId: bigint;
};

export const ProposalDetails: React.FC<ProposalDetailsProps> = ({ proposalId }) => {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();

  const {
    isLoading: proposalLoading,
    error: proposalsError,
    data: proposalResult,
  }: UseQueryResult<CertifiedData<ProposalInfo>, Error> = useGovernanceGetProposal({
    proposalId,
  });
  const proposalData = proposalResult?.response;

  // Voting data
  const { data: neuronsResult } = useGovernanceGetNeurons();
  const votingNeurons = proposalData?.ballots.map((neuron) => neuron.neuronId) ?? [];
  const ineligibleVotingNeurons =
    neuronsResult?.response.filter((neuron) => !votingNeurons.includes(neuron.neuronId)) ?? [];
  const voted = proposalData?.ballots.filter((neuron) => neuron.vote !== Vote.Unspecified).length;
  const totalToVote = proposalData?.ballots.length;

  return (
    <div>
      {proposalLoading && <SkeletonLoader count={3} />}
      {proposalsError &&
        t(($) => $.common.errorLoadingProposals, { error: proposalsError.message })}
      {proposalData && (
        <>
          <h2 className="text-xl pb-4 flex items-center justify-between">
            {t(($) => $.proposal.proposalId, { id: proposalData.id })}
            {proposalResult.certified ? (
              <CertifiedBadge />
            ) : (
              <SkeletonLoader height={24} width={100} />
            )}
          </h2>

          {identity && (
            <div className="border p-4 rounded-lg mb-4">
              <p className="font-bold mb-4">
                {t(($) => $.proposal.voting, { voted, total: totalToVote })}
                {voted === totalToVote ? ' 🎉' : ''}
              </p>
              <div className="inline-grid gap-2 sm:grid-cols-[max-content_max-content_max-content]">
                {proposalData.ballots.map((neuron) => (
                  <Fragment key={neuron.neuronId}>
                    <span>#{neuron.neuronId}</span>
                    <span>
                      {t(($) => $.common.votingPower)}: {neuron.votingPower}
                    </span>
                    <span>
                      {t(($) => $.common.vote)}: {Vote[neuron.vote]}
                    </span>
                  </Fragment>
                ))}
                {ineligibleVotingNeurons.map((neuron) => (
                  <Fragment key={neuron.neuronId}>
                    <span className="text-gray-500">#{neuron.neuronId}</span>
                    <span className="text-gray-500">
                      {t(($) => $.common.votingPower)}: {neuron.votingPower}
                    </span>
                    <span className="text-gray-500">
                      {t(($) => $.common.vote)}: {t(($) => $.proposal.ineligibleToVote)}
                    </span>
                  </Fragment>
                ))}
              </div>
            </div>
          )}

          <div className="border p-4 rounded-lg mb-4">
            {/* type */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.type)}</dt>
              <dd>{Object.keys(proposalData.proposal?.action ?? {})[0]}</dd>
            </dl>
            {/* topic */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.topic)}</dt>
              <dd>{Topic[proposalData.topic]}</dd>
            </dl>
            {/* status */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.status)}</dt>
              <dd>{ProposalStatus[proposalData.status]}</dd>
            </dl>
            {/* reward status */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.rewardStatus)}</dt>
              <dd>{ProposalRewardStatus[proposalData.rewardStatus]}</dd>
            </dl>
            {/* created at */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.created)}</dt>
              <dd>{proposalData.proposalTimestampSeconds}</dd>
            </dl>
            {/* TBD: decided, executed */}
            {/* proposer */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.proposer)}</dt>
              <dd>{proposalData.proposer?.toString()}</dd>
            </dl>
          </div>

          <div className="border p-4 rounded-lg mb-4">
            {/* summary */}
            <Link to={proposalData.proposal?.url ?? '#'}>{proposalData.proposal?.title}</Link>
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.summary)}</dt>
              <dd>{proposalData.proposal?.summary}</dd>
            </dl>
            {/* action */}
            <dl>
              <dt className="font-bold">Action:</dt>
              <dd>
                {proposalData.proposal?.action &&
                  JSON.stringify(
                    Object.values(proposalData.proposal?.action ?? {})[0],
                    jsonReplacer,
                    2,
                  )}
              </dd>
            </dl>
          </div>

          <div className="border p-4 rounded-lg mb-4">
            {/* payload */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.payload)}</dt>
              <dd>...</dd>
            </dl>
          </div>
        </>
      )}
    </div>
  );
};
