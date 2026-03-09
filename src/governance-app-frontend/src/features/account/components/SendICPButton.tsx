import { AccountIdentifier, TransferError } from '@icp-sdk/canisters/ledger/icp';
import { decodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { nowInBigIntNanoSeconds, toNullable } from '@dfinity/utils';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, BookUser, Send } from 'lucide-react';
import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AddressBookSelect } from '@features/addressBook/components/AddressBookSelect';

import { Alert, AlertDescription } from '@components/Alert';
import { AmountInput } from '@components/AmountInput';
import { Button } from '@components/button';
import { Input } from '@components/Input';
import { Label } from '@components/Label';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@components/ResponsiveDialog';
import { Switch } from '@components/Switch';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn, ICP_TRANSACTION_FEE, ICP_TRANSACTION_PROPAGATION_DELAY_MS } from '@constants/extra';
import { useAddressBook } from '@hooks/addressBook/useAddressBook';
import { useIcpLedger } from '@hooks/icpLedger/useIcpLedger';
import { useTickerPrices } from '@hooks/tickers';
import { isValidIcpAddress, isValidIcrcAddress } from '@utils/address';
import { delay } from '@utils/async';
import { bigIntMul } from '@utils/bigInt';
import { isCertifiedRejectError, mapCanisterError } from '@utils/errors';
import { errorNotification, successNotification } from '@utils/notification';
import { formatNumber, roundToE8sPrecision } from '@utils/numbers';
import { cn } from '@utils/shadcn';

type Props = { balance: number };

export const SendICPButton: React.FC<Props> = ({ balance }) => {
  const { t } = useTranslation();

  const {
    ready: ledgerReady,
    canister: ledgerCanister,
    authenticated: ledgerAuthenticated,
  } = useIcpLedger();

  const { tickerPrices: tickersQuery } = useTickerPrices();
  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);

  const addressBookQuery = useAddressBook();
  const addressBookEntries = addressBookQuery.data?.response?.named_addresses ?? [];
  const addressBookLoading = addressBookQuery.isLoading;
  const hasAddresses = addressBookEntries.length > 0;

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [toAccountError, setToAccountError] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [useAddressBookToggle, setUseAddressBookToggle] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const autoToggleAddressBook = useEffectEvent(() => {
    if (hasAddresses && toAccount === '') {
      setUseAddressBookToggle(true);
    }
  });

  useEffect(() => {
    if (!addressBookLoading) {
      autoToggleAddressBook();
    }
  }, [addressBookLoading]);

  // Keep the createdAt value for retry purposes (used for deduplication at the ledger level)
  const createdAtRef = useRef<bigint | null>(null);

  const transferMutation = useMutation({
    mutationFn: () => {
      // Use stored createdAt for retry deduplication, or generate a new one
      const createdAt = createdAtRef.current ?? nowInBigIntNanoSeconds();
      createdAtRef.current = createdAt;
      const transferAmount = bigIntMul(E8Sn, Number(amount));

      if (isValidIcpAddress(toAccount)) {
        return ledgerCanister!.transfer({
          to: AccountIdentifier.fromHex(toAccount),
          amount: transferAmount,
          createdAt,
        });
      }

      const { owner, subaccount } = decodeIcrcAccount(toAccount);
      return ledgerCanister!.icrc1Transfer({
        to: { owner, subaccount: toNullable(subaccount) },
        amount: transferAmount,
        createdAt,
      });
    },
    onMutate: () => {
      setIsPending(true);
    },
    onSuccess: async () => {
      // Wait 2 seconds to allow the backend to process the transaction.
      await delay(ICP_TRANSACTION_PROPAGATION_DELAY_MS);
      setToAccount('');
      setSelectedName('');
      setAmount('');
      successNotification({
        description: t(($) => $.account.transferSuccess, { amount, toAccount }),
      });
      setIsPending(false);
      setOpen(false);
      createdAtRef.current = null;
    },
    onError: (error) => {
      if (isCertifiedRejectError(error) || error instanceof TransferError) {
        createdAtRef.current = null;
      }
      errorNotification({
        description: mapCanisterError(error),
      });
      setIsPending(false);
    },
  });

  const canTransfer =
    balance > ICP_TRANSACTION_FEE && ledgerReady && ledgerAuthenticated && !isPending;
  const max = roundToE8sPrecision(balance - ICP_TRANSACTION_FEE);

  const handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setToAccountError('');
    setAmountError('');

    if (!isValidIcpAddress(toAccount) && !isValidIcrcAddress(toAccount)) {
      setToAccountError(t(($) => $.account.accountError));
      return;
    }

    const numericAmount = Number(amount);
    if (numericAmount <= 0) {
      setAmountError(t(($) => $.account.amountTooLow));
      return;
    }
    if (numericAmount > max) {
      setAmountError(t(($) => $.account.insufficientBalance, { max }));
      return;
    }

    transferMutation.mutate();
  };

  const handleAccountChange = (value: string) => {
    setToAccount(value);
    setToAccountError('');
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setAmountError('');
  };

  const handleMaxSelect = (value: string) => {
    setAmount(value);
    setAmountError('');
    amountInputRef?.current?.focus();
  };

  const showToggle = !addressBookLoading && hasAddresses;

  const numericAmount = Number(amount);
  const approxUsd =
    icpPrice && numericAmount > 0
      ? t(($) => $.account.approxUsd, { value: formatNumber(numericAmount * icpPrice.usd) })
      : undefined;

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        <Button
          variant="outline"
          disabled={!canTransfer}
          size="xl"
          className={cn('w-full', isPending && 'opacity-50')}
          data-testid="send-icp-btn"
        >
          <Send />
          {t(($) => (isPending ? $.common.sending : $.common.withdraw))}
        </Button>
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent>
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t(($) => $.account.transferTitle)}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="sr-only">
              Transfer ICP tokens to another account.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="grid gap-4 pt-4 pb-12">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor={useAddressBookToggle ? 'address-book-select' : 'destination-account'}
                >
                  {t(($) => $.account.destinationAccount)}
                </Label>
                {addressBookLoading ? (
                  <div className="flex items-center gap-1.5">
                    <BookUser className="size-3.5 animate-pulse text-muted-foreground" />
                    <span className="animate-pulse text-xs text-muted-foreground">
                      {t(($) => $.addressBook.sendFlow.tooltipLoading)}
                    </span>
                  </div>
                ) : showToggle ? (
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <BookUser className="size-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {t(($) => $.addressBook.sendFlow.toggleLabel)}
                    </span>
                    <Switch
                      checked={useAddressBookToggle}
                      onCheckedChange={(checked) => {
                        setUseAddressBookToggle(checked);
                        setToAccount('');
                        setSelectedName('');
                        setToAccountError('');
                      }}
                      size="sm"
                      data-testid="address-book-toggle"
                    />
                  </label>
                ) : !addressBookLoading && !hasAddresses ? (
                  <Link
                    to="/settings"
                    search={{ openAddressBook: true }}
                    className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                  >
                    <BookUser className="size-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground underline">
                      {t(($) => $.addressBook.sendFlow.tooltipEmpty)}
                    </span>
                  </Link>
                ) : null}
              </div>

              {useAddressBookToggle ? (
                <AddressBookSelect
                  addresses={addressBookEntries}
                  selectedName={selectedName}
                  onSelect={(name, address) => {
                    setSelectedName(name);
                    handleAccountChange(address);
                  }}
                  disabled={isPending}
                />
              ) : (
                <>
                  <Input
                    id="destination-account"
                    onChange={(e) => handleAccountChange(e.target.value)}
                    disabled={isPending}
                    value={toAccount}
                    className={`font-mono ${toAccountError ? 'border-destructive' : ''}`}
                    aria-invalid={!!toAccountError}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    required
                  />
                  {!useAddressBookToggle && toAccount !== '' && (
                    <p className="text-xs text-muted-foreground">
                      {t(($) => $.addressBook.sendFlow.manualWarning)}
                    </p>
                  )}
                </>
              )}
              {toAccountError && (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription>{toAccountError}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">{t(($) => $.common.amount)}</Label>
              <AmountInput
                id="amount"
                data-testid="send-icp-amount-input"
                ref={amountInputRef}
                value={amount}
                onChange={handleAmountChange}
                maxAmount={max}
                onMaxSelect={handleMaxSelect}
                disabled={isPending}
                required
                error={!!amountError}
                approxUsdLabel={approxUsd}
                availableLabel={t(($) => $.account.availableBalance, {
                  amount: max,
                })}
              />
              {amountError && (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription>{amountError}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <ResponsiveDialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              {t(($) => $.common.close)}
            </Button>
            <Button type="submit" disabled={isPending} data-testid="send-icp-confirm-btn">
              {isPending ? t(($) => $.common.sending) : t(($) => $.common.confirm)}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
