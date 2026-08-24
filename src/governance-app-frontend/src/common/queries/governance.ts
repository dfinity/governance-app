import type {
  GovernanceCachedMetrics,
  ListProposalsRequest,
  ListProposalsResponse,
  NeuronId,
  NeuronInfo,
} from '@icp-sdk/canisters/nns';

import { PAGINATION_LIMIT_PROPOSALS } from '@constants/extra';
import { isNonEmptyNeuron } from '@utils/neuron';
import { QUERY_KEYS } from '@utils/query';
import { getNnsGovernanceCanister } from '@common/canisters';
import { CertifiedData } from '@common/typings/queries';

import { CertifiedQuery } from './certified';

/**
 * Query descriptors shared by the `use*` hooks and the route loaders. Keeping
 * the key and the fetcher together is what lets a loader warm exactly the entry
 * the component will later read.
 */

export type NeuronsRequest = {
  neuronIds?: NeuronId[];
  includeEmptyNeurons?: boolean;
  includePublicNeurons?: boolean;
  neuronSubaccounts?: { subaccount: Uint8Array }[];
};

const DEFAULT_NEURONS_REQUEST: NeuronsRequest = {
  neuronIds: undefined,
  includeEmptyNeurons: false,
  includePublicNeurons: true,
  neuronSubaccounts: undefined,
};

export const neuronsRequest = (overrides?: NeuronsRequest): NeuronsRequest => ({
  ...DEFAULT_NEURONS_REQUEST,
  ...overrides,
});

const sortByCreatedDesc = (
  a: { createdTimestampSeconds: bigint },
  b: { createdTimestampSeconds: bigint },
) => Number(b.createdTimestampSeconds - a.createdTimestampSeconds);

const listNeurons = async (request: NeuronsRequest, certified: boolean) => {
  const canister = await getNnsGovernanceCanister();
  const neurons = await canister.listNeurons({ ...request, certified });

  return neurons.filter(isNonEmptyNeuron).toSorted(sortByCreatedDesc);
};

export const governanceNeuronsQuery = ({
  request,
  principal,
}: {
  request: NeuronsRequest;
  principal: string | undefined;
}): CertifiedQuery<NeuronInfo[]> => ({
  queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS, request, principal],
  queryFn: () => listNeurons(request, false),
  updateFn: () => listNeurons(request, true),
});

export const governanceMetricsQuery = (): CertifiedQuery<GovernanceCachedMetrics> => ({
  queryKey: [QUERY_KEYS.NNS_GOVERNANCE.METRICS],
  queryFn: async () => (await getNnsGovernanceCanister()).getMetrics({ certified: false }),
  updateFn: async () => (await getNnsGovernanceCanister()).getMetrics({ certified: true }),
});

export const DEFAULT_PROPOSALS_REQUEST: ListProposalsRequest = {
  beforeProposal: undefined,
  limit: PAGINATION_LIMIT_PROPOSALS,
  excludeTopic: [],
  includeRewardStatus: [],
  includeStatus: [],
  includeAllManageNeuronProposals: false,
  // (e.g. IC0504: Canister payload size cannot be larger than 3145728.)
  omitLargeFields: true,
  returnSelfDescribingAction: true,
};

export const proposalsRequest = (
  overrides?: Partial<ListProposalsRequest>,
): ListProposalsRequest => ({ ...DEFAULT_PROPOSALS_REQUEST, ...overrides });

const listProposals = async (
  request: ListProposalsRequest,
  beforeProposal: bigint | undefined,
  certified: boolean,
) => {
  const canister = await getNnsGovernanceCanister();

  return canister.listProposals({ request: { ...request, beforeProposal }, certified });
};

export const governanceProposalsQuery = ({
  request,
  principal,
}: {
  request: ListProposalsRequest;
  principal: string | undefined;
}): CertifiedQuery<ListProposalsResponse, { pageParam: ProposalsPageParam }> => ({
  queryKey: [QUERY_KEYS.NNS_GOVERNANCE.PROPOSALS, request, principal],
  queryFn: ({ pageParam }) => listProposals(request, pageParam, false),
  updateFn: ({ pageParam }) => listProposals(request, pageParam, true),
});

export type ProposalsPageParam = bigint | undefined;

export const PROPOSALS_INITIAL_PAGE_PARAM: ProposalsPageParam = undefined;

/** A short page means the canister has nothing left to hand back. */
export const proposalsNextPageParam =
  (request: ListProposalsRequest) =>
  (lastPage: CertifiedData<ListProposalsResponse>): ProposalsPageParam =>
    lastPage.response.proposals.length === request.limit
      ? lastPage.response.proposals.at(-1)?.id
      : undefined;
