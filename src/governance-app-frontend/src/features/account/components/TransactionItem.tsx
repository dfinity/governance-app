import { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { nonNullish } from '@dfinity/utils';
import {
  ArrowDownToLine,
  ArrowUp,
  ArrowUpDown,
  BookUser,
  CircleQuestionMark,
  Coins,
  Lock,
  WalletMinimal,
} from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

import { detectTransactionType } from '@features/transactions/utils/transactionType';

import { Alert, AlertDescription } from '@components/Alert';
import { Card, CardContent } from '@components/Card';
import { CertifiedBadge } from '@components/CertifiedBadge';
import { CopyButton } from '@components/CopyButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/Tooltip';
import { E8Sn } from '@constants/extra';
import { bigIntDiv } from '@utils/bigInt';
import { secondsToDate, secondsToTime, timestampInNanosToSeconds } from '@utils/date';
import { shortenId } from '@utils/id';
import { formatNumber } from '@utils/numbers';
import { cn } from '@utils/shadcn';

import type { LucideIcon } from 'lucide-react';

import { useNeuronAccountsIds } from '../hooks/useNeuronAccountsIds';
import { TransactionType } from '../types';
import { isSuspiciousAddress } from '../utils/addressPoisoning';

const txConfig: Record<
  TransactionType,
  { icon: LucideIcon; iconBgClasses: string; amountClasses: string; sign: string }
> = {
  [TransactionType.RECEIVE]: {
    icon: ArrowDownToLine,
    iconBgClasses: 'bg-emerald-200/30 text-emerald-800 dark:bg-emerald-100/10 dark:text-emerald-400',
    amountClasses: 'text-emerald-800 dark:text-emerald-400',
    sign: '+',
  },
  [TransactionType.SEND]: {
    icon: ArrowUp,
    iconBgClasses: 'bg-red-200/30 text-red-800 dark:bg-red-100/10 dark:text-red-400',
    amountClasses: 'text-red-800 dark:text-red-400',
    sign: '-',
  },
  [TransactionType.STAKE]: {
    icon: Lock,
    iconBgClasses: 'bg-red-200/30 text-red-800 dark:bg-red-100/10 dark:text-red-400',
    amountClasses: 'text-red-800 dark:text-red-400',
    sign: '-',
  },
  [TransactionType.SELF]: {
    icon: ArrowUpDown,
    iconBgClasses: 'bg-muted text-muted-foreground',
    amountClasses: 'text-muted-foreground',
    sign: '',
  },
  [TransactionType.MINT]: {
    icon: Coins,
    iconBgClasses: 'bg-emerald-200/30 text-emerald-800 dark:bg-emerald-100/10 dark:text-emerald-400',
    amountClasses: 'text-emerald-800 dark:text-emerald-400',
    sign: '+',
  },
  [TransactionType.UNKNOWN]: {
    icon: CircleQuestionMark,
    iconBgClasses: 'bg-muted text-muted-foreground',
    amountClasses: 'text-muted-foreground',
    sign: '',
  },
};

function getTransactionTitle(t: ReturnType<typeof useTranslation>['t'], type: TransactionType) {
  switch (type) {
    case TransactionType.SELF:
      return t(($) => $.accounts.selfTransfer);
    case TransactionType.RECEIVE:
      return t(($) => $.accounts.received);
    case TransactionType.STAKE:
      return t(($) => $.accounts.staked);
    case TransactionType.MINT:
      return t(($) => $.accounts.minted);
    case TransactionType.SEND:
      return t(($) => $.accounts.sent);
    default:
      return t(($) => $.account.unknownTransaction);
  }
}

export const AccountTransactionItem = ({
  tx,
  accountId,
  certified,
  trustedAddresses,
  addressNameMap,
}: {
  tx: IcpIndexDid.TransactionWithId;
  accountId: string;
  certified: boolean;
  trustedAddresses: Set<string>;
  addressNameMap?: Map<string, { name: string; source: 'account' | 'addressBook' }>;
}) => {
  const { t } = useTranslation();
  const userNeuronsAccountIds = useNeuronAccountsIds();

  const operation = tx.transaction.operation;
  const type = detectTransactionType(operation, accountId, userNeuronsAccountIds.accountIds);
  if (type === TransactionType.UNKNOWN) return null;

  const config = txConfig[type];
  const Icon = config.icon;
  const title = getTransactionTitle(t, type);

  const isMint = 'Mint' in operation;
  const transfer = 'Transfer' in operation ? operation.Transfer : null;
  const address = isMint
    ? null
    : type === TransactionType.RECEIVE
      ? transfer!.from
      : transfer!.to;

  const addressEntry = address ? addressNameMap?.get(address) : undefined;
  const addressName = addressEntry?.name;

  const addressDirection =
    type === TransactionType.RECEIVE
      ? 'fromAddress'
      : type === TransactionType.STAKE
        ? 'intoAddress'
        : 'toAddress';

  const transactionTimestamp = Number(
    timestampInNanosToSeconds(tx.transaction.created_at_time[0]?.timestamp_nanos ?? 0n),
  );

  const amountE8s = isMint ? operation.Mint.amount.e8s : transfer!.amount.e8s;

  const suspicious =
    type === TransactionType.RECEIVE &&
    address !== null &&
    isSuspiciousAddress(address, amountE8s, trustedAddresses);

  const shortAddress = address ? shortenId(address, 10) : '';
  const fullAddress = address ? shortenId(address, 18) : '';
  const addressComponents = { address: <span className="font-mono" /> };

  return (
    <Card key={tx.id} className="p-0">
      <CardContent className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className={cn('rounded-full p-3', config.iconBgClasses)}>
            <Icon className="size-5" />
          </div>
          <div className="flex w-full min-w-0 shrink flex-col gap-0.5">
            <div className="flex justify-between">
              <h4 className="text-sm font-semibold">{title}</h4>
              <CertifiedBadge certified={certified} />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1 sm:max-w-[66%]">
                <span className="text-xs text-muted-foreground">
                  {secondsToDate(transactionTimestamp)} - {secondsToTime(transactionTimestamp)}
                </span>

                {nonNullish(address) && nonNullish(addressName) ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground"
                      >
                        <span className="truncate">
                          <Trans
                            i18nKey={($) => $.account[addressDirection]}
                            values={{ address: addressName }}
                            components={{
                              address: <span className="font-semibold" />,
                            }}
                          />
                        </span>
                        {addressEntry?.source === 'addressBook' ? (
                          <BookUser className="size-3.5 shrink-0" aria-hidden />
                        ) : (
                          <WalletMinimal className="size-3.5 shrink-0" aria-hidden />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono text-xs">{address}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : nonNullish(address) ? (
                  <div
                    className={cn(
                      'flex min-w-0 items-center gap-1 text-sm text-muted-foreground',
                      suspicious && 'text-amber-800 dark:text-amber-200',
                    )}
                  >
                    <span className="truncate md:hidden">
                      <Trans
                        i18nKey={($) => $.account[addressDirection]}
                        values={{ address: shortAddress }}
                        components={addressComponents}
                      />
                    </span>
                    <span className="hidden truncate md:inline">
                      <Trans
                        i18nKey={($) => $.account[addressDirection]}
                        values={{ address: fullAddress }}
                        components={addressComponents}
                      />
                    </span>
                    {!suspicious && (
                      <CopyButton
                        value={address}
                        size="sm"
                        variant="ghost"
                        label={t(($) => $.account.address)}
                      />
                    )}
                  </div>
                ) : null}
                {suspicious && (
                  <Alert variant="warning" className="px-3 py-2">
                    <AlertDescription className="text-xs">
                      {t(($) => $.account.suspiciousAddressWarning)}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <span className={cn('text-base font-semibold', config.amountClasses)}>
                {config.sign}

                {t(($) => $.common.inIcp, {
                  value: formatNumber(bigIntDiv(amountE8s, E8Sn), {
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
