import { ProposalInfo, ProposalRewardStatus, ProposalStatus, Topic } from '@icp-sdk/canisters/nns';
import { jsonReplacer } from '@dfinity/utils';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { QueryStates } from '@components/extra/QueryStates';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useGovernanceProposal } from '@hooks/canisters/governance/useGovernanceProposal';
import useTitle from '@hooks/useTitle';
import { stringToBigInt } from '@utils/bigInt';
import { CertifiedData } from '@common/typings/queries';

import { ProposalDetailsVoting } from './-ProposalDetailsVoting';

const ProposalDetailsRouteComponent = () => {
  const { t } = useTranslation();
  const { id } = Route.useParams();

  useTitle(t(($) => $.proposal.title));

  return <ProposalDetails proposalId={id!} />;
};

export const Route = createFileRoute('/nns/proposals/$id/')({
  params: {
    parse: ({ id }) => ({
      id: stringToBigInt(id),
    }),
    stringify: ({ id }) => ({ id: id?.toString() ?? '' }),
  },
  beforeLoad: ({ params }) => {
    if (!params.id) throw redirect({ to: '/nns/proposals', replace: true });
  },
  pendingComponent: () => <Skeleton count={3} />,
  component: ProposalDetailsRouteComponent,
});

type Props = {
  proposalId: bigint;
};

const ProposalDetails: React.FC<Props> = ({ proposalId }) => {
  const { t } = useTranslation();

  const proposalQuery = useGovernanceProposal({
    proposalId,
  });

  return (
    <QueryStates<CertifiedData<ProposalInfo>>
      query={proposalQuery}
      isEmpty={(proposal) => proposal.response === undefined}
    >
      {({ response: proposal }) => (
        <>
          <h2 className="flex items-center justify-between pb-4 text-xl">
            {t(($) => $.proposal.proposalId, { id: proposal.id })}
            {proposalQuery.data?.certified ? (
              <CertifiedBadge />
            ) : (
              <SkeletonLoader height={24} width={100} />
            )}
          </h2>

          <ProposalDetailsVoting proposal={proposal} />

          <div className="mb-4 rounded-lg border p-4">
            {/* type */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.type)}</dt>
              <dd>{Object.keys(proposal.proposal?.action ?? {})[0]}</dd>
            </dl>
            {/* topic */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.topic)}</dt>
              <dd>{Topic[proposal.topic]}</dd>
            </dl>
            {/* status */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.status)}</dt>
              <dd>{ProposalStatus[proposal.status]}</dd>
            </dl>
            {/* reward status */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.rewardStatus)}</dt>
              <dd>{ProposalRewardStatus[proposal.rewardStatus]}</dd>
            </dl>
            {/* created at */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.created)}</dt>
              <dd>{proposal.proposalTimestampSeconds}</dd>
            </dl>
            {/* TBD: decided, executed */}
            {/* proposer */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.proposer)}</dt>
              <dd>{proposal.proposer?.toString()}</dd>
            </dl>
          </div>

          <div className="mb-4 rounded-lg border p-4">
            {/* summary */}
            <Link to={proposal.proposal?.url ?? '#'}>{proposal.proposal?.title}</Link>
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.summary)}</dt>
              <dd>{proposal.proposal?.summary}</dd>
            </dl>
            {/* action */}
            <dl>
              <dt className="font-bold">{t(($) => $.proposal.action)}</dt>
              <dd>
                {proposal.proposal?.action &&
                  JSON.stringify(
                    Object.values(proposal.proposal?.action ?? {})[0],
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
    </QueryStates>
  );
};
