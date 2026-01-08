import { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { ArrowDownToLine, ArrowUp, CircleQuestionMark, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { CertifiedBadge } from '@components/CertifiedBadge';
import { E8Sn } from '@constants/extra';
import { bigIntDiv } from '@utils/bigInt';
import { formatNumber } from '@utils/numbers';
import { cn } from '@utils/shadcn';

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
  if (!('Transfer' in operation)) return TransactionType.UNKNOWN;
  const type = getTransactionType(operation, accountId, userNeuronsAccountIds.accountIds);

  const title =
    type === TransactionType.SEND
      ? t(($) => $.account.withdrawnIcp)
      : type === TransactionType.RECEIVE
        ? t(($) => $.account.depositedIcp)
        : type === TransactionType.STAKE
          ? t(($) => $.account.stakedIcp)
          : t(($) => $.account.unkownTransaction);

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
            ) : TransactionType.STAKE ? (
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
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  {new Date(
                    Number(
                      (tx.transaction.created_at_time[0]?.timestamp_nanos ?? 0n) / 1_000_000n,
                    ) || 0,
                  ).toLocaleString()}
                </span>

                <span className="text-sm text-muted-foreground decoration-dotted">
                  {(() => {
                    const address =
                      type === TransactionType.RECEIVE
                        ? operation.Transfer.from
                        : operation.Transfer.to;
                    return `${address.slice(0, 10)}...${address.slice(-10)}`;
                  })()}
                </span>
              </div>
              <span
                className={cn(
                  'font-semibold',
                  type === TransactionType.RECEIVE
                    ? 'text-emerald-800 dark:text-emerald-400'
                    : 'text-red-800 dark:text-red-400',
                )}
              >
                {type === TransactionType.RECEIVE ? '+' : '-'}

                {t(($) => $.common.inIcp, {
                  value: formatNumber(bigIntDiv(operation.Transfer.amount.e8s, E8Sn)),
                })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
