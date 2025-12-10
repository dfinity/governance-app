import { jsonReplacer } from '@dfinity/utils';
import { ProposalInfo, ProposalRewardStatus, ProposalStatus, Topic } from '@icp-sdk/canisters/nns';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';

import { CertifiedData } from '@common/typings/queries';
import { CertifiedBadge } from '@components/CertifiedBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@components/card';
import { QueryStates } from '@components/extra/QueryStates';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useGovernanceProposal } from '@hooks/canisters/governance/useGovernanceProposal';
import useTitle from '@hooks/useTitle';
import { stringToBigInt } from '@utils/bigInt';

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

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* type */}
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground uppercase">
                    {t(($) => $.proposal.type)}
                  </span>
                  <span>{Object.keys(proposal.proposal?.action ?? {})[0]}</span>
                </div>
                {/* topic */}
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground uppercase">
                    {t(($) => $.proposal.topic)}
                  </span>
                  <span>{Topic[proposal.topic]}</span>
                </div>
                {/* status */}
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground uppercase">
                    {t(($) => $.proposal.status)}
                  </span>
                  <span>{ProposalStatus[proposal.status]}</span>
                </div>
                {/* reward status */}
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground uppercase">
                    {t(($) => $.proposal.rewardStatus)}
                  </span>
                  <span>{ProposalRewardStatus[proposal.rewardStatus]}</span>
                </div>
                {/* created at */}
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground uppercase">
                    {t(($) => $.proposal.created)}
                  </span>
                  <span>
                    {new Date(Number(proposal.proposalTimestampSeconds) * 1000).toLocaleString()}
                  </span>
                </div>
                {/* proposer */}
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground uppercase">
                    {t(($) => $.proposal.proposer)}
                  </span>
                  <span className="break-all">{proposal.proposer?.toString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <Link to={proposal.proposal?.url ?? '#'} className="hover:underline">
                    {proposal.proposal?.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {/* summary */}
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground uppercase">
                    {t(($) => $.proposal.summary)}
                  </span>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {proposal.proposal?.summary}
                  </div>
                </div>
                {/* action */}
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground uppercase">
                    {t(($) => $.proposal.action)}
                  </span>
                  <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
                    {proposal.proposal?.action &&
                      JSON.stringify(
                        Object.values(proposal.proposal?.action ?? {})[0],
                        jsonReplacer,
                        2,
                      )}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t(($) => $.proposal.payload)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground italic">...</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </QueryStates>
  );
};
