import { ProposalInfo, ProposalStatus, Topic } from '@icp-sdk/canisters/nns';
import { nonNullish, secondsToDuration } from '@dfinity/utils';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { ArrowLeft, Clock, Link as LinkIcon, Tag } from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { ProposalDetailsVoting } from '@features/proposals/components/ProposalDetailsVoting';
import { ProposalLiveActivity } from '@features/proposals/components/ProposalLiveActivity';
import { ProposalVotingHistory } from '@features/proposals/components/ProposalVotingHistory';
import { ProposerBadge } from '@features/proposals/components/ProposerBadge';
import { SelfDescribingActionView } from '@features/proposals/components/SelfDescribingActionView';
import {
  useKnownNeuronVotes,
  useLiveProposal,
  useSeenVotes,
} from '@features/proposals/hooks/useProposalLiveData';
import {
  getKnownNeuronNames,
  getProposalStatusColor,
  getProposalTimeLeftInSeconds,
  isValidProposalId,
  validateProposalsSearch,
} from '@features/proposals/utils';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Badge } from '@components/badge';
import { Button } from '@components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/Card';
import { CertifiedBadge } from '@components/CertifiedBadge';
import { EmptyMessage } from '@components/EmptyMessage';
import { MarkdownRenderer } from '@components/MarkdownRenderer';
import { QueryStates } from '@components/QueryStates';
import {
  ProposalDetailContentSkeleton,
  ProposalDetailSkeleton,
} from '@components/skeletons/ProposalDetailSkeleton';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';
import { useGovernanceProposal } from '@hooks/governance/useGovernanceProposal';
import { CheckResultKey, useSpamCheck } from '@hooks/spamFilter';
import { useMediaQuery } from '@hooks/useMediaQuery';
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
    if (!isValidProposalId(params.id)) throw redirect({ to: '/voting', replace: true });
  },
  pendingComponent: ProposalDetailSkeleton,
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
    hidesBottomNav: true,
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
  const knownNeuronNames = getKnownNeuronNames(useGovernanceKnownNeurons().data?.response);

  return (
    <div className="flex flex-col gap-6 pb-[env(safe-area-inset-bottom)] lg:pb-0">
      {/* Sticky offsets start after the top padding of `main`, so -2rem reaches the safe area. */}
      <div className="sticky -top-8 z-30 -mx-4 -my-2 bg-main-content/95 px-4 py-2 backdrop-blur-sm lg:static lg:m-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <Button variant="link" asChild className="p-0! font-normal">
          <Link
            to="/voting"
            search={{ showProposals: true, proposalFilter: search.proposalFilter }}
          >
            <ArrowLeft className="size-5" />
            {t(($) => $.proposal.backToProposals)}
          </Link>
        </Button>
      </div>

      <QueryStates<CertifiedData<ProposalInfo | undefined>>
        query={proposalQuery}
        isEmpty={(proposal) => !proposal.response}
        emptyComponent={
          <EmptyMessage message={t(($) => $.proposal.notFound, { id: id?.toString() ?? '' })} />
        }
        loadingComponent={<ProposalDetailContentSkeleton />}
      >
        {({ response: proposal }) => {
          if (!nonNullish(proposal)) return null;
          const statusColor = getProposalStatusColor(proposal);
          const proposalUrl = safeParseUrl(proposal.proposal?.url);

          return (
            // A new proposal starts with no seen votes.
            <ProposalDetailsLayout key={String(proposal.id)} proposal={proposal}>
              {(liveProposal) => {
                // The live deadline: wait for quiet can extend it while the page is open.
                const timeLeft = secondsToDuration({
                  seconds: getProposalTimeLeftInSeconds(liveProposal),
                  i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
                });

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
                        <CardTitle className="mt-2 min-w-0 text-3xl leading-tight font-normal break-words">
                          {proposal.proposal?.title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 text-sm">
                          <Badge className={statusColor}>
                            {ProposalStatus[proposal.status] ??
                              t(($) => $.proposal.unknownStatus, { id: proposal.status })}
                          </Badge>
                          {timeLeft.length > 0 && (
                            <Badge variant="secondary" className="gap-1.5 font-normal">
                              <Clock className="h-3.5 w-3.5" />
                              {t(($) => $.proposal.timeLeft, { timeLeft })}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="gap-1.5 font-normal">
                            <Tag className="h-3.5 w-3.5" />
                            {Topic[proposal.topic] ??
                              t(($) => $.proposal.unknownTopic, { id: proposal.topic })}
                          </Badge>
                          {nonNullish(proposal.proposer) && (
                            <ProposerBadge
                              proposer={proposal.proposer}
                              knownNeuronNames={knownNeuronNames}
                              interactive
                            />
                          )}
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
                                <span className="max-w-[150px] truncate">
                                  {proposalUrl.hostname}
                                </span>
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
                            <AlertTitle>
                              {t(($) => $.proposal.spamWarning.nonActionableTitle)}
                            </AlertTitle>
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
                          <SelfDescribingActionView
                            action={proposal.proposal.selfDescribingAction}
                          />
                        </CardContent>
                      </Card>
                    )}
                  </>
                );
              }}
            </ProposalDetailsLayout>
          );
        }}
      </QueryStates>
    </div>
  );
}

/**
 * From `xl`, Live activity takes a sticky rail beside the other cards.
 * Below `xl`, it comes after Voting history.
 */
function ProposalDetailsLayout({
  proposal,
  children,
}: {
  proposal: ProposalInfo;
  children: (liveProposal: ProposalInfo) => ReactNode;
}) {
  const isWide = useMediaQuery('(min-width: 80rem)');
  const liveProposal = useLiveProposal(proposal);
  // Kept above the layout switch: the activity card remounts when the window crosses `xl`.
  const knownNeuronVotes = useKnownNeuronVotes(liveProposal);
  const seenVotes = useSeenVotes(knownNeuronVotes.votes);

  const liveActivity = (
    <ProposalLiveActivity
      proposal={liveProposal}
      knownNeuronVotes={knownNeuronVotes}
      seenVotes={seenVotes}
    />
  );

  // The voting card keeps one place in the tree in both layouts, so a resize keeps a pending vote.
  // Below `xl`, the wrappers are `contents`: the docking footer of the voting card must be a
  // direct child of the page column, to cancel its gap.
  return (
    <div
      className={
        isWide
          ? 'grid grid-cols-[minmax(0,1fr)_340px] items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]'
          : 'contents'
      }
    >
      <div className={isWide ? 'flex min-w-0 flex-col gap-6' : 'contents'}>
        {children(liveProposal)}
        <ProposalVotingHistory proposal={liveProposal} />
        {!isWide && liveActivity}
        <ProposalDetailsVoting proposal={liveProposal} />
      </div>
      {/* The rail scrolls on its own when the expanded timeline is taller than the window. */}
      {isWide && (
        <div className="sticky top-0 max-h-[calc(100dvh-4rem)] min-w-0 overflow-y-auto">
          {liveActivity}
        </div>
      )}
    </div>
  );
}
