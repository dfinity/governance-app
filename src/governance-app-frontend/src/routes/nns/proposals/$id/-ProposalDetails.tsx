import { ProposalInfo, ProposalRewardStatus, ProposalStatus, Topic } from '@dfinity/nns';
import { jsonReplacer } from '@dfinity/utils';
import { UseQueryResult } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useGovernanceProposal } from '@hooks/canisters/governance/useGovernanceProposal';
import { CertifiedData } from '@common/typings/queries';

import { ProposalDetailsVoting } from './-ProposalDetailsVoting';

type Props = {
  proposalId: bigint;
};

export const ProposalDetails: React.FC<Props> = ({ proposalId }) => {
  const { t } = useTranslation();

  const {
    isLoading,
    error,
    data,
  }: UseQueryResult<CertifiedData<ProposalInfo>, Error> = useGovernanceProposal({
    proposalId,
  });
  const proposalData = data?.response;

  return (
    <div>
      {isLoading && <SkeletonLoader count={3} />}
      {error && t(($) => $.common.errorLoadingProposals, { error: error.message })}
      {proposalData && (
        <>
          <h2 className="flex items-center justify-between pb-4 text-xl">
            {t(($) => $.proposal.proposalId, { id: proposalData.id })}
            {data.certified ? <CertifiedBadge /> : <SkeletonLoader height={24} width={100} />}
          </h2>

          <ProposalDetailsVoting proposal={proposalData} />

          <div className="mb-4 rounded-lg border p-4">
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

          <div className="mb-4 rounded-lg border p-4">
            {/* summary */}
            <Link to={proposalData.proposal?.url ?? '#'}>{proposalData.proposal?.title}</Link>
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.summary)}</dt>
              <dd>{proposalData.proposal?.summary}</dd>
            </dl>
            {/* action */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.action)}</dt>
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

          <div className="mb-4 rounded-lg border p-4">
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
