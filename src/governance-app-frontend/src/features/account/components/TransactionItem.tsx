import { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { nonNullish } from '@dfinity/utils';
import { BookUser, WalletMinimal } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

import { detectTransactionType, getAmountE8s } from '@features/transactions/utils/transactionType';
import { txConfig } from '@features/transactions/utils/txConfig';

import { Alert, AlertDescription } from '@components/Alert';
import { Card, CardContent } from '@components/Card';
import { CertifiedBadge } from '@components/CertifiedBadge';
import { CopyButton } from '@components/CopyButton';
import { SensitiveValue } from '@components/SensitiveValue';
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
import { formatTransactionMemo } from '../utils/transactionMemo';

// Characters kept on each side of a shortened account identifier. One value for
// every viewport: a breakpoint-dependent length made the row jump at `md`, and
// the longer variant alone claimed ~420px of an ~700px dialog.
const ADDRESS_VISIBLE_CHARS = 12;

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

  const {
    icon: Icon,
    iconBgClasses,
    amountClasses,
    sign,
    labelKey,
    addressDirection,
  } = txConfig[type];

  // Mints and self-transfers have no meaningful counterparty address to display —
  // mints have no source, and self-transfers go to/from the same account.
  const transfer = 'Transfer' in operation ? operation.Transfer : null;
  const address = nonNullish(addressDirection)
    ? type === TransactionType.RECEIVE
      ? transfer!.from
      : transfer!.to
    : null;

  const addressEntry = nonNullish(address) ? addressNameMap?.get(address) : undefined;
  const addressName = addressEntry?.name;

  const transactionTimestamp = Number(
    timestampInNanosToSeconds(tx.transaction.created_at_time[0]?.timestamp_nanos ?? 0n),
  );

  const amountE8s = getAmountE8s(operation)!;

  const suspicious =
    type === TransactionType.RECEIVE &&
    nonNullish(address) &&
    isSuspiciousAddress(address, amountE8s, trustedAddresses);

  const memo = formatTransactionMemo({ transaction: tx.transaction, type });

  const shortAddress = nonNullish(address) ? shortenId(address, ADDRESS_VISIBLE_CHARS) : '';

  return (
    <Card key={tx.id} className="p-0">
      <CardContent className="px-4 py-3 sm:px-6 sm:py-4">
        {/* `minmax(0, 1fr)` caps the details column. Without it the address line,
            which cannot wrap, sets the width of the whole dialog and pushes it
            into a horizontal scrollbar. The amount sits beside the details from
            `sm` up, and below them on a phone, where the row is too narrow. */}
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4 sm:gap-y-0">
          <div
            className={cn(
              'col-start-1 row-span-2 row-start-1 self-center rounded-full p-3 sm:row-span-1',
              iconBgClasses,
            )}
          >
            <Icon className="size-5" />
          </div>

          <div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">{t(($) => $.accounts[labelKey])}</h4>
              <CertifiedBadge certified={certified} />
            </div>

            <span className="text-xs text-muted-foreground">
              {secondsToDate(transactionTimestamp)} - {secondsToTime(transactionTimestamp)}
            </span>

            {nonNullish(address) && (
              <div
                className={cn(
                  'flex min-w-0 items-center gap-1 text-sm text-muted-foreground',
                  suspicious && 'text-amber-800 dark:text-amber-200',
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="min-w-0 truncate text-left">
                      <Trans
                        i18nKey={($) => $.account[addressDirection!]}
                        values={{ address: addressName ?? shortAddress }}
                        components={{
                          address: (
                            <span
                              className={nonNullish(addressName) ? 'font-semibold' : 'font-mono'}
                            />
                          ),
                        }}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-mono text-xs break-all">{address}</p>
                  </TooltipContent>
                </Tooltip>

                {nonNullish(addressName) ? (
                  addressEntry?.source === 'addressBook' ? (
                    <BookUser className="size-3.5 shrink-0" aria-hidden />
                  ) : (
                    <WalletMinimal className="size-3.5 shrink-0" aria-hidden />
                  )
                ) : (
                  !suspicious && (
                    <CopyButton
                      value={address}
                      size="sm"
                      variant="ghost"
                      label={t(($) => $.account.address)}
                    />
                  )
                )}
              </div>
            )}

            {nonNullish(memo) && (
              <div className="flex min-w-0 items-start gap-1 text-sm text-muted-foreground">
                <span className="shrink-0">{t(($) => $.account.memoDisplayLabel)}</span>
                <span className="min-w-0 font-mono break-all">{memo.value}</span>
              </div>
            )}

            {suspicious && (
              <Alert variant="warning" className="mt-1 px-3 py-2">
                <AlertDescription className="text-xs">
                  {t(($) => $.account.suspiciousAddressWarning)}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <span
            className={cn(
              'col-start-2 row-start-2 text-base font-semibold tabular-nums sm:col-start-3 sm:row-start-1 sm:text-right sm:whitespace-nowrap',
              amountClasses,
            )}
          >
            <SensitiveValue size="sm">
              {sign}

              {t(($) => $.common.inIcp, {
                value: formatNumber(bigIntDiv(amountE8s, E8Sn), {
                  minFraction: 2,
                  maxFraction: 8,
                }),
              })}
            </SensitiveValue>
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
