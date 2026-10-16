import { IcpLedgerCanister } from '@icp-sdk/canisters/ledger/icp';
import { NnsGovernanceCanister } from '@icp-sdk/canisters/nns';
import { HttpAgent } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

import { CANISTER_ID_ICP_LEDGER, CANISTER_ID_NNS_GOVERNANCE } from '@constants/canisterIds';
import { errorMessage } from '@utils/error';
import { ensureInitialized } from '@common/auth/internetIdentity';
import { getLedgerIdentity } from '@common/ledger/session';
import type { Signer } from '@common/ledger/signer';

import { getAnonymousAgent, getAuthenticatedAgent, getLedgerAgent } from './agents';

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

/**
 * The agent of a signer. A Ledger signer connects to the device the first time; the
 * Internet Identity signer, or no signer, uses the session agent as before.
 */
const resolveSignerAgent = async (signer?: Signer): Promise<HttpAgent> => {
  if (signer?.kind === 'ledger') {
    return getLedgerAgent(await getLedgerIdentity(signer.principal));
  }

  return resolveAgent();
};

type CanisterOptions = {
  /** Who signs the calls. Defaults to the Internet Identity session. */
  signer?: Signer;
};

const nnsGovernanceCanisterId = (): Principal => {
  if (!CANISTER_ID_NNS_GOVERNANCE) {
    throw errorMessage('getNnsGovernanceCanister', 'the canister Id is not defined');
  }

  return Principal.fromText(CANISTER_ID_NNS_GOVERNANCE);
};

export const getNnsGovernanceCanister = async ({
  signer,
}: CanisterOptions = {}): Promise<NnsGovernanceCanister> => {
  const canisterId = nnsGovernanceCanisterId();

  return NnsGovernanceCanister.create({ agent: await resolveSignerAgent(signer), canisterId });
};

/**
 * A governance canister bound to the anonymous agent. A Ledger device cannot sign
 * `claim_or_refresh`, so the stake and top-up flows send that call without a signer.
 */
export const getAnonymousNnsGovernanceCanister = async (): Promise<NnsGovernanceCanister> => {
  const canisterId = nnsGovernanceCanisterId();

  return NnsGovernanceCanister.create({ agent: await getAnonymousAgent(), canisterId });
};

export const getIcpLedgerCanister = async ({
  signer,
}: CanisterOptions = {}): Promise<IcpLedgerCanister> => {
  if (!CANISTER_ID_ICP_LEDGER) {
    throw errorMessage('getIcpLedgerCanister', 'the canister Id is not defined');
  }

  return IcpLedgerCanister.create({
    agent: await resolveSignerAgent(signer),
    canisterId: Principal.fromText(CANISTER_ID_ICP_LEDGER),
  });
};
