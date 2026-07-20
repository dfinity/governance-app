import { useIcpIndexTransactionsPolling } from '@hooks/icpIndex/useIcpIndexTransactionsPolling';

/**
 * Hosts the ICP index transaction polling in its own leaf so its periodic refetch state
 * re-renders only this (null-rendering) component instead of the surrounding layout.
 * Renders nothing.
 */
export const TransactionPollingWatcher = () => {
  useIcpIndexTransactionsPolling();
  return null;
};
