import { jsonReplacer, secondsToDuration } from '@dfinity/utils';
import { ProposalInfo, ProposalStatus, Topic } from '@icp-sdk/canisters/nns';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { ArrowLeft, Clock, Link as LinkIcon, Tag, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ProposalDetailsVoting } from '@features/proposals/components/ProposalDetailsVoting';
import {
  getProposalStatusColor,
  getProposalTimeLeftInSeconds,
  getShowProposalUrlStatus,
} from '@features/proposals/utils';

import { Badge } from '@components/badge';
import { Button } from '@components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/Card';
import { CertifiedBadge } from '@components/CertifiedBadge';
import { MarkdownRenderer } from '@components/MarkdownRenderer';
import { QueryStates } from '@components/QueryStates';
import { SkeletonLoader } from '@components/SkeletonLoader';
import { useGovernanceProposal } from '@hooks/governance/useGovernanceProposal';
import useTitle from '@hooks/useTitle';
import { CertifiedData } from '@typings/queries';
import { stringToBigInt } from '@utils/bigInt';
import { safeParseUrl } from '@utils/urls';

const ProposalDetailsRouteComponent = () => {
  const { t } = useTranslation();
  const { id } = Route.useParams();

  useTitle(t(($) => $.proposal.title));

  return <ProposalDetails proposalId={id!} />;
};

export const Route = createFileRoute('/voting/proposals/$id/')({
  params: {
    parse: ({ id }) => ({
      id: stringToBigInt(id),
    }),
    stringify: ({ id }) => ({ id: id?.toString() ?? '' }),
  },
  validateSearch: getShowProposalUrlStatus,
  beforeLoad: ({ params }) => {
    if (!params.id) throw redirect({ to: '/voting', replace: true });
  },
  pendingComponent: () => <SkeletonLoader count={3} />,
  component: ProposalDetailsRouteComponent,
});

type Props = {
  proposalId: bigint;
};

const ProposalDetails: React.FC<Props> = ({ proposalId }) => {
  const { t } = useTranslation();
  const search = Route.useSearch();

  const proposalQuery = useGovernanceProposal({
    proposalId,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="link" asChild className="p-0! font-normal">
          <Link to="/voting" search={{ showProposals: search.showProposals }}>
            <ArrowLeft className="size-5" />
            {t(($) => $.proposal.backToProposals)}
          </Link>
        </Button>
      </div>

      <QueryStates<CertifiedData<ProposalInfo>>
        query={proposalQuery}
        isEmpty={(proposal) => !proposal.response}
      >
        {({ response: proposal }) => {
          const timeLeft = secondsToDuration({
            seconds: getProposalTimeLeftInSeconds(proposal),
            i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
          });

          const statusColor = getProposalStatusColor(proposal);
          const proposalUrl = safeParseUrl(proposal.proposal?.url);

          return (
            <>
              {/* Main Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="text-xs tracking-wide text-muted-foreground uppercase">
                      {t(($) => $.proposal.proposalId, { id: proposal.id })}
                    </span>
                    {proposalQuery.data?.certified ? (
                      <CertifiedBadge />
                    ) : (
                      <SkeletonLoader height={24} width={100} />
                    )}
                  </div>
                  <CardTitle className="mt-2 text-2xl leading-tight font-bold">
                    {proposal.proposal?.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge className={statusColor}>{ProposalStatus[proposal.status]}</Badge>
                    {timeLeft.length > 0 && (
                      <Badge variant="secondary" className="gap-1.5 font-normal">
                        <Clock className="h-3.5 w-3.5" />
                        {t(($) => $.proposal.timeLeft, { timeLeft })}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="gap-1.5 font-normal">
                      <Tag className="h-3.5 w-3.5" />
                      {Topic[proposal.topic]}
                    </Badge>
                    <Badge variant="secondary" className="gap-1.5 font-normal">
                      <User className="h-3.5 w-3.5" />
                      <span className="max-w-[150px] truncate">
                        {proposal.proposer?.toString()}
                      </span>
                    </Badge>
                    {proposalUrl && (
                      <a
                        href={proposal.proposal?.url}
                        target="_blank"
                        rel="noreferrer"
                        className="no-underline"
                      >
                        <Badge
                          variant="secondary"
                          className="gap-1.5 font-normal hover:bg-secondary/80"
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                          <span className="max-w-[150px] truncate">{proposalUrl.hostname}</span>
                        </Badge>
                      </a>
                    )}
                  </div>
                  <MarkdownRenderer content={proposal.proposal?.summary || ''} />
                </CardContent>
              </Card>

              <ProposalDetailsVoting proposal={proposal} />

              <Card>
                <CardHeader>
                  <CardTitle>{t(($) => $.proposal.action)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs break-all whitespace-pre-wrap">
                    {proposal.proposal?.action &&
                      JSON.stringify(
                        Object.values(proposal.proposal?.action ?? {})[0],
                        jsonReplacer,
                        2,
                      )}
                  </pre>
                </CardContent>
              </Card>
            </>
          );
        }}
      </QueryStates>
    </div>
  );
};
