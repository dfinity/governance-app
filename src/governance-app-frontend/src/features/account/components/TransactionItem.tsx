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

  const shortAddress = nonNullish(address) ? shortenId(address, 10) : '';
  const fullAddress = nonNullish(address) ? shortenId(address, 18) : '';
  const addressComponents = { address: <span className="font-mono" /> };

  return (
    <Card key={tx.id} className="p-0">
      <CardContent className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className={cn('rounded-full p-3', iconBgClasses)}>
            <Icon className="size-5" />
          </div>
          <div className="flex w-full min-w-0 shrink flex-col gap-0.5">
            <div className="flex justify-between">
              <h4 className="text-sm font-semibold">{t(($) => $.accounts[labelKey])}</h4>
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
                            i18nKey={($) => $.account[addressDirection!]}
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
                        i18nKey={($) => $.account[addressDirection!]}
                        values={{ address: shortAddress }}
                        components={addressComponents}
                      />
                    </span>
                    <span className="hidden truncate md:inline">
                      <Trans
                        i18nKey={($) => $.account[addressDirection!]}
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
              <span className={cn('text-base font-semibold', amountClasses)}>
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
