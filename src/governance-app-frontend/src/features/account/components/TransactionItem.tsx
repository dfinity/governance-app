import { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { nonNullish } from '@dfinity/utils';
import {
  ArrowDownToLine,
  ArrowUp,
  BookUser,
  CircleQuestionMark,
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

import { useNeuronAccountsIds } from '../hooks/useNeuronAccountsIds';
import { TransactionType } from '../types';
import { isSuspiciousAddress } from '../utils/addressPoisoning';

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
  if (!('Transfer' in operation)) return null;

  const type = detectTransactionType(operation, accountId, userNeuronsAccountIds.accountIds);

  const title =
    type === TransactionType.RECEIVE
      ? t(($) => $.accounts.received)
      : type === TransactionType.STAKE
        ? t(($) => $.accounts.staked)
        : type === TransactionType.SEND
          ? t(($) => $.accounts.sent)
          : t(($) => $.account.unknownTransaction);

  const address =
    type === TransactionType.RECEIVE ? operation.Transfer.from : operation.Transfer.to;

  const addressEntry = addressNameMap?.get(address);
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

  const suspicious =
    type === TransactionType.RECEIVE &&
    isSuspiciousAddress(address, operation.Transfer.amount.e8s, trustedAddresses);

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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1 sm:max-w-[66%]">
                <span className="text-xs text-muted-foreground">
                  {secondsToDate(transactionTimestamp)} - {secondsToTime(transactionTimestamp)}
                </span>

                {nonNullish(addressName) ? (
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
                ) : (
                  <div
                    className={cn(
                      'flex min-w-0 items-center gap-1 text-sm text-muted-foreground',
                      suspicious && 'text-amber-800 dark:text-amber-200',
                    )}
                  >
                    <span className="truncate md:hidden">
                      <Trans
                        i18nKey={($) => $.account[addressDirection]}
                        values={{ address: shortenId(address, 6) }}
                        components={{
                          address: <span className="font-mono" />,
                        }}
                      />
                    </span>
                    <span className="hidden truncate md:inline">
                      <Trans
                        i18nKey={($) => $.account[addressDirection]}
                        values={{ address: shortenId(address, 12) }}
                        components={{
                          address: <span className="font-mono" />,
                        }}
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
                )}
                {suspicious && (
                  <Alert variant="warning" className="px-3 py-2">
                    <AlertDescription className="text-xs">
                      {t(($) => $.account.suspiciousAddressWarning)}
                    </AlertDescription>
                  </Alert>
                )}
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
