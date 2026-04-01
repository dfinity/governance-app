import { ProposalInfo, ProposalStatus, Topic } from '@icp-sdk/canisters/nns';
import { nonNullish, secondsToDuration } from '@dfinity/utils';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { ArrowLeft, Clock, Link as LinkIcon, Tag, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ProposalDetailsVoting } from '@features/proposals/components/ProposalDetailsVoting';
import { SelfDescribingActionView } from '@features/proposals/components/SelfDescribingActionView';
import {
  getProposalStatusColor,
  getProposalTimeLeftInSeconds,
  validateProposalsSearch,
} from '@features/proposals/utils';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Badge } from '@components/badge';
import { Button } from '@components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/Card';
import { CertifiedBadge } from '@components/CertifiedBadge';
import { MarkdownRenderer } from '@components/MarkdownRenderer';
import { MultipleSkeletons } from '@components/MultipleSkeletons';
import { QueryStates } from '@components/QueryStates';
import { useGovernanceProposal } from '@hooks/governance/useGovernanceProposal';
import { CheckResultKey, useSpamCheck } from '@hooks/spamFilter';
import { CertifiedData } from '@typings/queries';
import { stringToBigInt } from '@utils/bigInt';
import { safeParseUrl } from '@utils/urls';

import i18n from '@/i18n/config';

export const Route = createFileRoute('/_auth/voting/proposals/$id/')({
  params: {
    parse: ({ id }) => ({
      id: stringToBigInt(id),
    }),
    stringify: ({ id }) => ({ id: id?.toString() ?? '' }),
  },
  validateSearch: validateProposalsSearch,
  beforeLoad: async ({ params }) => {
    if (!params.id) throw redirect({ to: '/voting', replace: true });
  },
  pendingComponent: () => <MultipleSkeletons count={3} />,
  component: ProposalDetailsRouteComponent,

  head: ({ params }) => {
    const proposalId = params.id?.toString() ?? '';
    const title = i18n.t(($) => $.common.head.proposalDetails.title, { proposalId });

    return {
      meta: [{ title }],
    };
  },
  staticData: {
    title: 'common.voting',
  },
});

function ProposalDetailsRouteComponent() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const search = Route.useSearch();

  const proposalQuery = useGovernanceProposal({
    proposalId: id!,
  });
  const spamCheckResult = useSpamCheck(id).data?.response;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="link" asChild className="p-0! font-normal">
          <Link
            to="/voting"
            search={{ showProposals: search.showProposals, proposalFilter: search.proposalFilter }}
          >
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
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="text-xs tracking-wide text-muted-foreground uppercase">
                      {t(($) => $.proposal.proposalId, { id: proposal.id })}
                    </span>
                    <CertifiedBadge certified={proposalQuery.data?.certified} />
                  </div>
                  <CardTitle className="mt-2 min-w-0 text-2xl leading-tight font-bold break-words">
                    {proposal.proposal?.title}
                  </CardTitle>
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
                        href={proposalUrl.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="no-underline"
                      >
                        <Badge
                          variant="secondary"
                          className="gap-1.5 font-normal hover:bg-secondary/80"
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                          <span className="max-w-[150px] truncate">{proposalUrl.hostname}</span>
                        </Badge>
                        <span className="sr-only">{t(($) => $.common.opensInNewTab)}</span>
                      </a>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {spamCheckResult && CheckResultKey.Abusive in spamCheckResult && (
                    <Alert variant="warning">
                      <AlertTitle>{t(($) => $.proposal.spamWarning.abusiveTitle)}</AlertTitle>
                      <AlertDescription>
                        <p>{t(($) => $.proposal.spamWarning.reasons)}</p>
                        <ul className="list-inside list-disc">
                          {spamCheckResult.abusive.map((reason, i) => (
                            <li key={i}>{reason}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  {spamCheckResult && CheckResultKey.NonActionable in spamCheckResult && (
                    <Alert variant="warning">
                      <AlertTitle>{t(($) => $.proposal.spamWarning.nonActionableTitle)}</AlertTitle>
                      <AlertDescription>
                        <p>{t(($) => $.proposal.spamWarning.reasons)}</p>
                        <ul className="list-inside list-disc">
                          {spamCheckResult.nonActionable.map((reason, i) => (
                            <li key={i}>{reason}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  <MarkdownRenderer content={proposal.proposal?.summary || ''} />
                </CardContent>
              </Card>

              <ProposalDetailsVoting proposal={proposal} />

              {nonNullish(proposal.proposal?.selfDescribingAction) && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t(($) => $.proposal.action)}</CardTitle>
                    <Badge variant="info-subtle" className="w-fit text-xs font-medium">
                      {proposal.proposal.selfDescribingAction.typeName}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {proposal.proposal.selfDescribingAction.typeDescription && (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {proposal.proposal.selfDescribingAction.typeDescription}
                      </p>
                    )}
                    <SelfDescribingActionView action={proposal.proposal.selfDescribingAction} />
                  </CardContent>
                </Card>
              )}
            </>
          );
        }}
      </QueryStates>
    </div>
  );
}
