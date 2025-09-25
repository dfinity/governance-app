import { ProposalInfo, ProposalRewardStatus, ProposalStatus, Topic } from '@dfinity/nns';
import { jsonReplacer } from '@dfinity/utils';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { QueryStates } from '@components/extra/QueryStates';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useGovernanceProposal } from '@hooks/canisters/governance/useGovernanceProposal';
import { CertifiedData } from '@common/typings/queries';

import { ProposalDetailsVoting } from './-ProposalDetailsVoting';

type Props = {
  proposalId: bigint;
};

export const ProposalDetails: React.FC<Props> = ({ proposalId }) => {
  const { t } = useTranslation();

  const proposal = useGovernanceProposal({
    proposalId,
  });

  return (
    <QueryStates<CertifiedData<ProposalInfo>>
      query={proposal}
      isEmpty={(data) => data.response === undefined}
    >
      {({ response: data }) => (
        <>
          <h2 className="flex items-center justify-between pb-4 text-xl">
            {t(($) => $.proposal.proposalId, { id: data.id })}
            {proposal.data?.certified ? (
              <CertifiedBadge />
            ) : (
              <SkeletonLoader height={24} width={100} />
            )}
          </h2>

          <ProposalDetailsVoting proposal={data} />

          <div className="mb-4 rounded-lg border p-4">
            {/* type */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.type)}</dt>
              <dd>{Object.keys(data.proposal?.action ?? {})[0]}</dd>
            </dl>
            {/* topic */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.topic)}</dt>
              <dd>{Topic[data.topic]}</dd>
            </dl>
            {/* status */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.status)}</dt>
              <dd>{ProposalStatus[data.status]}</dd>
            </dl>
            {/* reward status */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.rewardStatus)}</dt>
              <dd>{ProposalRewardStatus[data.rewardStatus]}</dd>
            </dl>
            {/* created at */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.created)}</dt>
              <dd>{data.proposalTimestampSeconds}</dd>
            </dl>
            {/* TBD: decided, executed */}
            {/* proposer */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.proposer)}</dt>
              <dd>{data.proposer?.toString()}</dd>
            </dl>
          </div>

          <div className="mb-4 rounded-lg border p-4">
            {/* summary */}
            <Link to={data.proposal?.url ?? '#'}>{data.proposal?.title}</Link>
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.summary)}</dt>
              <dd>{data.proposal?.summary}</dd>
            </dl>
            {/* action */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.action)}</dt>
              <dd>
                {data.proposal?.action &&
                  JSON.stringify(Object.values(data.proposal?.action ?? {})[0], jsonReplacer, 2)}
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
    </QueryStates>
  );
};
