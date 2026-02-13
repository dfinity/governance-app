import i18n from '@/i18n/config';

import { warningNotification } from './notification';
import { stringifyAll } from './string';

const ICP_LEDGER = {
  ACCOUNT_BALANCE: 'icpLedgerAccountBalance',
  METADATA: 'icpLedgerMetadata',
};

const NNS_GOVERNANCE = {
  ECONOMICS: 'nnsGovernanceEconomics',
  KNOWN_NEURONS: 'nnsGovernanceKnownNeurons',
  LATEST_REWARD_EVENT: 'nnsGovernanceLatestRewardEvent',
  METRICS: 'nnsGovernanceMetrics',
  NEURONS: 'nnsGovernanceNeurons',
  PROPOSAL: 'nnsGovernanceProposal',
  PROPOSALS: 'nnsGovernanceProposals',
};

const ICP_INDEX = {
  TRANSACTIONS: 'icpIndexTransactions',
  TRANSACTIONS_POLLING: 'icpIndexTransactionsPolling',
};

const EXTERNAL_SERVICES = {
  KONG_SWAP_PRICES: 'kongSwapPrices',
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

/**
 * Error handler for failed query invalidation.
 * Logs the error and shows a toast notification.
 */
export const failedRefresh = (err: unknown) => {
  console.error('Failed to refresh data:', err);
  warningNotification({
    description: i18n.t(($) => $.common.refreshFailed),
  });
};
