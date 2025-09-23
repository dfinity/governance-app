import { stringifyAll } from './strings';

const ICP_LEDGER = {
  ACCOUNT_BALANCE: 'icpLedgerAccountBalance',
  METADATA: 'icpLedgerMetadata',
};
const NNS_GOVERNANCE = {
  PROPOSALS: 'nnsGovernanceProposals',
  PROPOSAL: 'nnsGovernanceProposal',
  NEURONS: 'nnsGovernanceNeurons',
};

export const QUERY_KEYS = { ICP_LEDGER, NNS_GOVERNANCE };

export const stringifyKeys = (keys: readonly unknown[]) => {
  return keys.map((k) => {
    if (typeof k === 'object' && k !== null) {
      return stringifyAll(k);
    }

    if (typeof k === 'bigint' || typeof k === 'number') {
      return k.toString();
    }

    return k;
  });
};
