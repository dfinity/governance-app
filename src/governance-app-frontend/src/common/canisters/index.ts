import { IcpLedgerCanister } from '@icp-sdk/canisters/ledger/icp';
import { NnsGovernanceCanister } from '@icp-sdk/canisters/nns';
import { HttpAgent } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { ensureInitialized } from 'ic-use-internet-identity';

import { CANISTER_ID_ICP_LEDGER, CANISTER_ID_NNS_GOVERNANCE } from '@constants/canisterIds';
import { errorMessage } from '@utils/error';

import { getAnonymousAgent, getAuthenticatedAgent } from './agents';

/**
 * Canister accessors usable outside React, so route loaders can start a call
 * before the route's component chunk has finished downloading. The `use*`
 * canister hooks stay as they are for components; both end up on the same
 * agent instance.
 */

/** Authenticated agent when a session exists, anonymous otherwise. */
const resolveAgent = async (): Promise<HttpAgent> => {
  // Resolved and cached by the time any `_auth` loader runs — `requireIdentity`
  // awaits it in `beforeLoad`. Awaiting again is free and keeps this self-contained.
  const identity = await ensureInitialized().catch(() => undefined);

  return identity ? getAuthenticatedAgent(identity) : getAnonymousAgent();
};

export const getNnsGovernanceCanister = async (): Promise<NnsGovernanceCanister> => {
  if (!CANISTER_ID_NNS_GOVERNANCE) {
    throw errorMessage('getNnsGovernanceCanister', 'the canister Id is not defined');
  }

  return NnsGovernanceCanister.create({
    agent: await resolveAgent(),
    canisterId: Principal.fromText(CANISTER_ID_NNS_GOVERNANCE),
  });
};

export const getIcpLedgerCanister = async (): Promise<IcpLedgerCanister> => {
  if (!CANISTER_ID_ICP_LEDGER) {
    throw errorMessage('getIcpLedgerCanister', 'the canister Id is not defined');
  }

  return IcpLedgerCanister.create({
    agent: await resolveAgent(),
    canisterId: Principal.fromText(CANISTER_ID_ICP_LEDGER),
  });
};
