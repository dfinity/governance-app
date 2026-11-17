import { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { nonNullish } from '@dfinity/utils';
import { BookPlus, BookUser, ChevronDown, Copy, WalletMinimal } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

import { detectTransactionType, getAmountE8s } from '@features/transactions/utils/transactionType';
import { txConfig } from '@features/transactions/utils/txConfig';

import { Alert, AlertDescription } from '@components/Alert';
import { Card, CardContent } from '@components/Card';
import { CertifiedBadge } from '@components/CertifiedBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/DropdownMenu';
import { SensitiveValue } from '@components/SensitiveValue';
import { E8Sn } from '@constants/extra';
import { bigIntDiv } from '@utils/bigInt';
import { secondsToDate, secondsToTime, timestampInNanosToSeconds } from '@utils/date';
import { shortenId } from '@utils/id';
import { errorNotification, successNotification } from '@utils/notification';
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

// Keeps the end of the address visible at every width. The head shrinks with an
// ellipsis, so a narrow row drops characters from the middle, not from the end.
const MiddleTruncatedAddress = ({ children }: { children?: React.ReactNode }) => {
  const value = String(children ?? '');
  return (
    <span className="inline-flex max-w-full min-w-0 font-mono">
      {/* 12 characters plus the ellipsis, with a little slack for fonts whose ellipsis is wider than 1ch. */}
      <span className="max-w-[13.3ch] min-w-0 truncate">
        {value.slice(0, -ADDRESS_VISIBLE_CHARS)}
      </span>
      <span className="shrink-0">{value.slice(-ADDRESS_VISIBLE_CHARS)}</span>
    </span>
  );
};

export const AccountTransactionItem = ({
  tx,
  accountId,
  certified,
  trustedAddresses,
  addressNameMap,
  onSaveAddress,
}: {
  tx: IcpIndexDid.TransactionWithId;
  accountId: string;
  certified: boolean;
  trustedAddresses: Set<string>;
  addressNameMap?: Map<string, { name: string; source: 'account' | 'addressBook' }>;
  /** Offers to save an unnamed counterparty. Absent when the address book is full. */
  onSaveAddress?: (address: string) => void;
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

  // A suspicious row shows the shortened address only. The full address stays
  // out of the DOM so the user cannot read it from a menu and copy it by hand.
  const addressValue = nonNullish(addressName)
    ? addressName
    : suspicious
      ? shortenId(address ?? '', ADDRESS_VISIBLE_CHARS)
      : (address ?? '');
  const addressComponent = nonNullish(addressName) ? (
    <span className="min-w-0 truncate font-semibold" />
  ) : (
    <MiddleTruncatedAddress />
  );
  const addressLabel = nonNullish(addressDirection) && (
    <Trans
      i18nKey={($) => $.account[addressDirection]}
      values={{ address: addressValue }}
      components={{ address: addressComponent }}
    />
  );

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      successNotification({
        description: t(($) => $.common.clipboard.copied, { label: t(($) => $.account.address) }),
      });
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
      errorNotification({ description: t(($) => $.common.clipboard.error) });
    }
  };

  const sourceIcon =
    nonNullish(addressName) &&
    (addressEntry?.source === 'addressBook' ? (
      <BookUser className="size-3.5 shrink-0" aria-hidden />
    ) : (
      <WalletMinimal className="size-3.5 shrink-0" aria-hidden />
    ));

  return (
    <Card key={tx.id} className="p-0" data-testid="transaction-item">
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
                {suspicious ? (
                  <span className="flex min-w-0 items-baseline gap-1">{addressLabel}</span>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex min-w-0 items-center gap-1 rounded-sm text-left hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        data-testid="transaction-address-trigger"
                      >
                        <span className="flex min-w-0 items-baseline gap-1">{addressLabel}</span>
                        {sourceIcon}
                        <ChevronDown className="size-3.5 shrink-0" aria-hidden />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      collisionPadding={16}
                      className="w-[calc(100vw-2rem)] sm:w-auto sm:max-w-sm"
                    >
                      <DropdownMenuLabel className="font-mono text-xs font-normal break-all">
                        {address}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={copyAddress}>
                        <Copy aria-hidden />
                        {t(($) => $.account.copyAddress)}
                      </DropdownMenuItem>
                      {nonNullish(onSaveAddress) && nonNullish(address) && !addressName && (
                        <DropdownMenuItem
                          onSelect={() => onSaveAddress(address)}
                          data-testid="transaction-save-address-btn"
                        >
                          <BookPlus aria-hidden />
                          {t(($) => $.addressBook.saveToAddressBook)}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
