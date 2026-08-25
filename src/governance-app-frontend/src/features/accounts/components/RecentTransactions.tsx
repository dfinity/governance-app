import { useTranslation } from 'react-i18next';

import { txConfig } from '@features/transactions/utils/txConfig';

import { Badge } from '@components/badge';
import { Card, CardContent, CardHeader } from '@components/Card';
import { SensitiveValue } from '@components/SensitiveValue';
import { SkeletonTransactionRows } from '@components/skeletons/SkeletonTransactionList';
import { E8Sn } from '@constants/extra';
import { bigIntDiv } from '@utils/bigInt';
import { secondsToDate, secondsToTime } from '@utils/date';
import { formatNumber } from '@utils/numbers';
import { cn } from '@utils/shadcn';

import { useRecentTransactions } from '../hooks/useRecentTransactions';
import { type AccountTransaction } from '../types';

export const RecentTransactions = () => {
  const { t } = useTranslation();
  const { data: transactions, isLoading } = useRecentTransactions();

  return (
    <Card className="h-fit">
      <CardHeader>
        <p className="text-sm tracking-wide text-muted-foreground uppercase">
          {t(($) => $.accounts.recentTransactions)}
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <SkeletonTransactionRows />
        ) : transactions && transactions.length > 0 ? (
          transactions.map((tx) => <TransactionRow key={`${tx.accountId}-${tx.id}`} tx={tx} />)
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t(($) => $.accounts.noTransactions)}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

function TransactionRow({ tx }: { tx: AccountTransaction }) {
  const { t } = useTranslation();
  const amountICP = bigIntDiv(tx.amountE8s, E8Sn);
  const { icon: Icon, iconBgClasses, amountClasses, sign, labelKey } = txConfig[tx.type];

  return (
    <div className="flex items-center gap-3">
      <div className={cn('shrink-0 rounded-full p-2.5', iconBgClasses)}>
        <Icon className="size-4" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{t(($) => $.accounts[labelKey])}</span>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {tx.accountName}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {secondsToDate(tx.timestamp)} - {secondsToTime(tx.timestamp)}
        </span>
      </div>

      <span className={cn('shrink-0 text-sm font-semibold', amountClasses)}>
        <SensitiveValue size="sm">
          {sign}
          {t(($) => $.common.inIcp, {
            value: formatNumber(amountICP, { minFraction: 2, maxFraction: 8 }),
          })}
        </SensitiveValue>
      </span>
    </div>
  );
}
