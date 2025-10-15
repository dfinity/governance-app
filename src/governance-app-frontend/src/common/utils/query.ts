import { stringifyAll } from './string';

const ICP_LEDGER = {
  ACCOUNT_BALANCE: 'icpLedgerAccountBalance',
  METADATA: 'icpLedgerMetadata',
};

const NNS_GOVERNANCE = {
  PROPOSALS: 'nnsGovernanceProposals',
  PROPOSAL: 'nnsGovernanceProposal',
  NEURONS: 'nnsGovernanceNeurons',
};

const ICP_INDEX = {
  TRANSACTIONS: 'icpIndexTransactions',
};

const EXTERNAL_SERVICES = {
  ICP_SWAP_PRICES: 'icpSwapPrices',
};

export const QUERY_KEYS = { ICP_LEDGER, NNS_GOVERNANCE, ICP_INDEX, EXTERNAL_SERVICES };

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
