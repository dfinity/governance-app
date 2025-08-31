import { ProposalInfo, ProposalRewardStatus, ProposalStatus, Topic } from '@dfinity/nns';
import { jsonReplacer } from '@dfinity/utils';
import { UseQueryResult } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { useGovernanceGetProposal } from '@common/hooks/canisters/governance/useGovernanceGetProposal';

import { CertifiedData } from '../../../../common/typings/queries';

type ProposalDetailsProps = {
  proposalId: bigint;
};

export const ProposalDetails: React.FC<ProposalDetailsProps> = ({ proposalId }) => {
  const { t } = useTranslation();
  const {
    isLoading,
    isError,
    error,
    data,
  }: UseQueryResult<CertifiedData<ProposalInfo>, Error> = useGovernanceGetProposal({
    proposalId,
  });
  const proposalData = data?.response;

  console.log(proposalData);

  return (
    <div>
      <div className="mt-4">
        {isLoading && t(($) => $.common.loadingProposals)}
        {isError && t(($) => $.common.errorLoadingProposals, { error: error.message })}
        {proposalData && (
          <>
            <h2>{t(($) => $.proposal.proposalId, { id: proposalData.id })}</h2>
            <h3>{t(($) => $.proposal.title)}</h3>
            {/* type */}
            <dl>
              <dt>{t(($) => $.proposal.type)}</dt>
              <dd>raw action: {JSON.stringify(proposalData.proposal?.action, jsonReplacer, 2)}</dd>
            </dl>
            {/* topic */}
            <dl>
              <dt>{t(($) => $.proposal.topic)}</dt>
              <dd>raw: {Topic[proposalData.topic]}</dd>
            </dl>
            {/* status */}
            <dl>
              <dt>{t(($) => $.proposal.status)}</dt>
              <dd>raw: {ProposalStatus[proposalData.status]}</dd>
            </dl>
            {/* reward status */}
            <dl>
              <dt>{t(($) => $.proposal.rewardStatus)}</dt>
              <dd>raw: {ProposalRewardStatus[proposalData.rewardStatus]}</dd>
            </dl>
            {/* created at */}
            <dl>
              <dt>{t(($) => $.proposal.created)}</dt>
              <dd>raw: {proposalData.proposalTimestampSeconds}</dd>
            </dl>
            {/* TBD: decided, executed */}
            {/* proposer */}
            <dl>
              <dt>{t(($) => $.proposal.proposer)}</dt>
              <dd>raw: {proposalData.proposer?.toString()}</dd>
            </dl>
            {/* summary */}
            <Link to={proposalData.proposal?.url ?? '#'}>{proposalData.proposal?.title}</Link>
            <dl>
              <dt>{t(($) => $.proposal.summary)}</dt>
              <dd>raw: {proposalData.proposal?.summary}</dd>
            </dl>
            {/* action */}
            <dl>
              <dt>Raw action:</dt>
              <dd>{JSON.stringify(proposalData.proposal?.action, jsonReplacer, 2)}</dd>
            </dl>
            {/* payload */}
            <dl>
              <dt>{t(($) => $.proposal.payload)}</dt>
              <dd>{JSON.stringify(proposalData.proposal?.action, jsonReplacer, 2)}</dd>
            </dl>
            {data.certified && <CertifiedBadge />}
          </>
        )}
      </div>
    </div>
  );
};
