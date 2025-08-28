import { ProposalInfo, ProposalRewardStatus, ProposalStatus, Topic } from '@dfinity/nns';
import { jsonReplacer } from '@dfinity/utils';
import { UseQueryResult } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { useGovernanceGetProposal } from '@common/hooks/canisters/governance/useGovernanceGetProposal';
import { CertifiedData } from '@common/queries/useQueryThenUpdateCall';

type LoaderParams = {
  proposalId?: string;
};

export const Route = createFileRoute('/nns/proposal/$proposal')({
  component: ProposalDetails,
  pendingComponent: () => 'Loading...',
  loader: async ({ params }) => {
    const res = await new Promise<LoaderParams>((resolve) => {
      setTimeout(() => {
        resolve({ proposalId: params.proposal });
      }, 1000);
    });
    return res;
  },
});

function ProposalDetails() {
  const { proposalId } = Route.useLoaderData();
  const stringToBigInt = (proposalId: string | undefined): bigint | undefined =>
    proposalId && /^\d+$/.test(proposalId) ? BigInt(proposalId) : undefined;
  const {
    isLoading,
    isError,
    error,
    data,
  }: UseQueryResult<CertifiedData<ProposalInfo>, Error> = useGovernanceGetProposal({
    proposalId: stringToBigInt(proposalId),
  });
  const proposalData = data?.response;
  const { t } = useTranslation();

  return (
    <div>
      <div className="mt-4">
        {isLoading && t(($) => $.home.loadingProposals)}
        {isError && t(($) => $.home.errorLoadingProposals, { error: error.message })}
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
}
/*
  "id": { "__bigint__": "1" },
  "ballots": [],
  "rejectCost": { "__bigint__": "100000000" },
  "proposalTimestampSeconds": { "__bigint__": "1756293699" },
  "rewardEventRound": { "__bigint__": "0" },
  "failedTimestampSeconds": { "__bigint__": "0" },
  "deadlineTimestampSeconds": { "__bigint__": "1756639299" },
  "decidedTimestampSeconds": { "__bigint__": "1756293699" },
  "proposal": {
    "title": "Add WASM for SNS canister type 1",
    "url": "",
    "action": { "ExecuteNnsFunction": { "nnsFunctionId": 30 } },
    "summary": "summary"
  },
  "proposer": { "__bigint__": "1" },
  "latestTally": {
    "no": { "__bigint__": "0" },
    "yes": { "__bigint__": "1404004106" },
    "total": { "__bigint__": "1404004106" },
    "timestampSeconds": { "__bigint__": "1756293699" }
  },
  "executedTimestampSeconds": { "__bigint__": "1756293699" },
  "topic": 18,
  "status": 4,
  "rewardStatus": 1,
  "totalPotentialVotingPower": { "__bigint__": "1404004106" }
  */
