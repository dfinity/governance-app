import { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { ArrowDownToLine, ArrowUp, CircleQuestionMark, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { CertifiedBadge } from '@components/CertifiedBadge';
import { CopyButton } from '@components/CopyButton';
import { E8Sn } from '@constants/extra';
import { bigIntDiv } from '@utils/bigInt';
import { secondsToDate, secondsToTime, timestampInNanosToSeconds } from '@utils/date';
import { formatNumber } from '@utils/numbers';
import { cn } from '@utils/shadcn';

import { CopyButton } from '@components/CopyButton';
import { useNeuronAccountsIds } from '../hooks/useNeuronAccountsIds';
import { TransactionType } from '../types';

// @TODO: Add support for Mint
const getTransactionType = (
  operation: IcpIndexDid.Operation,
  accountId: string,
  neuronsAccountIds: Set<string>,
): TransactionType => {
  if (!('Transfer' in operation)) return TransactionType.UNKNOWN;

  if (neuronsAccountIds.has(operation.Transfer.to) && operation.Transfer.from === accountId)
    return TransactionType.STAKE;
  if (operation.Transfer.from === accountId) return TransactionType.SEND;
  if (operation.Transfer.to === accountId) return TransactionType.RECEIVE;

  return TransactionType.UNKNOWN;
};

export const AccountTransactionItem = ({
  tx,
  accountId,
  certified,
}: {
  tx: IcpIndexDid.TransactionWithId;
  accountId: string;
  certified: boolean;
}) => {
  const { t } = useTranslation();
  const userNeuronsAccountIds = useNeuronAccountsIds();

  const operation = tx.transaction.operation;
  if (!('Transfer' in operation)) return null;

  const type = getTransactionType(operation, accountId, userNeuronsAccountIds.accountIds);

  const title =
    type === TransactionType.SEND
      ? t(($) => $.account.withdrawnIcp)
      : type === TransactionType.RECEIVE
        ? t(($) => $.account.depositedIcp)
        : type === TransactionType.STAKE
          ? t(($) => $.account.stakedIcp)
          : t(($) => $.account.unknownTransaction);

  const address =
    type === TransactionType.RECEIVE ? operation.Transfer.from : operation.Transfer.to;

  const transactionTimestamp = Number(
    timestampInNanosToSeconds(tx.transaction.created_at_time[0]?.timestamp_nanos ?? 0n),
  );

  return (
    <Card key={tx.id} className="p-0">
      <CardContent className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'rounded-full p-3',
              type === TransactionType.RECEIVE
                ? 'bg-emerald-200/30 text-emerald-800 dark:bg-emerald-100/10 dark:text-emerald-400'
                : 'bg-red-200/30 text-red-800 dark:bg-red-100/10 dark:text-red-400',
            )}
          >
            {type === TransactionType.SEND ? (
              <ArrowUp className="size-5" />
            ) : type === TransactionType.RECEIVE ? (
              <ArrowDownToLine className="size-5" />
            ) : type === TransactionType.STAKE ? (
              <Lock className="size-5" />
            ) : (
              <CircleQuestionMark className="size-5" />
            )}
          </div>
          <div className="flex w-full min-w-0 shrink flex-col gap-0.5">
            <div className="flex justify-between">
              <h4 className="text-sm font-semibold">{title}</h4>
              <CertifiedBadge certified={certified} />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  {secondsToDate(transactionTimestamp)} - {secondsToTime(transactionTimestamp)}
                </span>

                <div className="flex items-center gap-1 font-mono text-sm break-all text-muted-foreground">
                  <span className="md:hidden">
                    {`${address.slice(0, 10)}...${address.slice(-10)}`}
                  </span>
                  <span className="hidden md:inline">
                    {`${address.slice(0, 24)}...${address.slice(-24)}`}
                  </span>
                  <CopyButton
                    value={address}
                    size="sm"
                    variant="ghost"
                    label={t(($) => $.account.address)}
                  />
                </div>
              </div>
              <span
                className={cn(
                  'text-base font-semibold',
                  type === TransactionType.RECEIVE
                    ? 'text-emerald-800 dark:text-emerald-400'
                    : 'text-red-800 dark:text-red-400',
                )}
              >
                {type === TransactionType.RECEIVE ? '+' : '-'}

                {t(($) => $.common.inIcp, {
                  value: formatNumber(bigIntDiv(operation.Transfer.amount.e8s, E8Sn), {
                    minFraction: 2,
                    maxFraction: 8,
                  }),
                })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
