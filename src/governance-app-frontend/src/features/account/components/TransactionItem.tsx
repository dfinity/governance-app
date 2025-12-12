import { TransactionWithId } from '@icp-sdk/canisters/ledger/icp';
import { ArrowDownToLine, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/CertifiedBadge';
import { SimpleCard } from '@components/SimpleCard';
import { E8Sn } from '@constants/extra';
import { bigIntDiv } from '@utils/bigInt';
import { cn } from '@utils/shadcn';

export const AccountTransactionItem = ({
  tx,
  accountId,
  certified,
}: {
  tx: TransactionWithId;
  accountId: string;
  certified: boolean;
}) => {
  const { t } = useTranslation();

  const operation = tx.transaction.operation;
  const isSending = 'Transfer' in operation && operation.Transfer.from === accountId;
  const title = isSending ? t(($) => $.account.withdrawnIcp) : t(($) => $.account.depositedIcp);

  // @TODO: Display all the other operations as well.
  if (!('Transfer' in operation)) return null;

  return (
    <SimpleCard key={tx.id}>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'rounded-full p-1.5',
            isSending
              ? 'bg-destructive/15 text-destructive'
              : 'bg-green-500/15 text-green-600 dark:text-green-400',
          )}
        >
          {isSending ? <ArrowUp /> : <ArrowDownToLine />}
        </div>
        <div className="flex w-full min-w-0 shrink flex-col">
          <div className="flex justify-between">
            <h4 className="text-md font-semibold">{title}</h4>
            <CertifiedBadge certified={certified} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {new Date(
                  Number((tx.transaction.created_at_time[0]?.timestamp_nanos ?? 0n) / 1_000_000n) ||
                    0,
                ).toLocaleString()}
              </span>

              <span className="text-sm text-muted-foreground decoration-dotted">
                {(() => {
                  const address = isSending ? operation.Transfer.to : operation.Transfer.from;
                  return `${address.slice(0, 10)}...${address.slice(-10)}`;
                })()}
              </span>
            </div>
            <span
              className={cn(
                'font-semibold',
                isSending ? 'text-destructive' : 'text-green-600 dark:text-green-400',
              )}
            >
              {isSending ? '-' : '+'}
              {bigIntDiv(operation.Transfer.amount.e8s, E8Sn, 2).toFixed(2)}{' '}
              {t(($) => $.common.icps)}
            </span>
          </div>
        </div>
      </div>
    </SimpleCard>
  );
};
