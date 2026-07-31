import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { ProposalStatus } from '@icp-sdk/canisters/nns';
import { Identity } from '@icp-sdk/core/agent';
import { QueryClient } from '@tanstack/react-query';
import { ensureInitialized } from 'ic-use-internet-identity';

import {
  governanceMetricsQuery,
  governanceNeuronsQuery,
  governanceProposalsQuery,
  neuronsRequest,
  PROPOSALS_INITIAL_PAGE_PARAM,
  proposalsNextPageParam,
  proposalsRequest,
} from './governance';
import { icpLedgerAccountBalanceQuery } from './icpLedger';
import { prefetchCertifiedInfiniteQuery, prefetchCertifiedQuery } from './prefetch';

/**
 * Per-route warm-up, called from each route's `loader`.
 *
 * Each function awaits nothing but the identity — already resolved by the
 * `_auth` guard, so effectively free — and leaves the canister calls in flight.
 * Navigation is never held up by them; they simply start ~1s earlier than they
 * would if the component had to mount first.
 */

const sessionIdentity = (): Promise<Identity | undefined> =>
  ensureInitialized().catch(() => undefined);

const accountIdentifierOf = (identity: Identity): string =>
  AccountIdentifier.fromPrincipal({ principal: identity.getPrincipal() }).toHex();

const prefetchNeuronsAndBalance = (queryClient: QueryClient, identity: Identity) => {
  prefetchCertifiedQuery(
    queryClient,
    governanceNeuronsQuery({
      request: neuronsRequest(),
      principal: identity.getPrincipal().toText(),
    }),
  );

  prefetchCertifiedQuery(queryClient, icpLedgerAccountBalanceQuery(accountIdentifierOf(identity)));
};

export const prefetchDashboardRoute = async (queryClient: QueryClient) => {
  const identity = await sessionIdentity();
  if (!identity) return;

  prefetchNeuronsAndBalance(queryClient, identity);
  prefetchCertifiedQuery(queryClient, governanceMetricsQuery());
};

export const prefetchNeuronsRoute = async (queryClient: QueryClient) => {
  const identity = await sessionIdentity();
  if (!identity) return;

  prefetchNeuronsAndBalance(queryClient, identity);
};

/** Which proposals list the page will render, if any. */
export type PrefetchedProposals = 'open' | 'all' | 'none';

export const prefetchVotingRoute = async (
  queryClient: QueryClient,
  { proposals }: { proposals: PrefetchedProposals },
) => {
  const identity = await sessionIdentity();
  if (!identity) return;

  prefetchCertifiedQuery(
    queryClient,
    governanceNeuronsQuery({
      request: neuronsRequest(),
      principal: identity.getPrincipal().toText(),
    }),
  );

  // The list is collapsed by default, and only one filter is ever on screen.
  // Warming anything else would undo the gating in the component.
  if (proposals === 'none') return;

  const request = proposalsRequest(
    proposals === 'open' ? { includeStatus: [ProposalStatus.Open] } : undefined,
  );

  prefetchCertifiedInfiniteQuery(
    queryClient,
    governanceProposalsQuery({ request, principal: identity.getPrincipal().toText() }),
    {
      initialPageParam: PROPOSALS_INITIAL_PAGE_PARAM,
      getNextPageParam: proposalsNextPageParam(request),
    },
  );
};
