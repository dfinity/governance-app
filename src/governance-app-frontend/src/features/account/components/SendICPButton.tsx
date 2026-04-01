import { AccountIdentifier, TransferError } from '@icp-sdk/canisters/ledger/icp';
import { decodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { nonNullish, nowInBigIntNanoSeconds, toNullable } from '@dfinity/utils';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, ArrowUpRight, BookUser, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { NamedAddress } from '@declarations/governance-app-backend/governance-app-backend.did';

import { AccountSelect } from '@features/accounts/components/AccountSelect';
import { useAccounts } from '@features/accounts/hooks/useAccounts';
import { useAccountSelection } from '@features/accounts/hooks/useAccountSelection';
import { type Account, isAccountReady } from '@features/accounts/types';
import { AddressBookSelect } from '@features/addressBook/components/AddressBookSelect';

import { Alert, AlertDescription } from '@components/Alert';
import { AmountInput } from '@components/AmountInput';
import { Button } from '@components/button';
import { Input } from '@components/Input';
import { Label } from '@components/Label';
import {
  MutationDialog,
  MutationDialogBody,
  MutationDialogFooter,
  MutationDialogHeader,
} from '@components/MutationDialog';
import { ResponsiveDialogDescription, ResponsiveDialogTitle } from '@components/ResponsiveDialog';
import { Switch } from '@components/Switch';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { DIALOG_RESET_DELAY_MS, E8Sn, ICP_TRANSACTION_FEE } from '@constants/extra';
import { useAddressBook } from '@hooks/addressBook/useAddressBook';
import { useIcpLedger } from '@hooks/icpLedger/useIcpLedger';
import { useTickerPrices } from '@hooks/tickers';
import { isValidIcpAddress, isValidIcrcAddress } from '@utils/address';
import { addressBookGetAddressString } from '@utils/addressBook';
import { bigIntDiv, bigIntMul } from '@utils/bigInt';
import { isCertifiedRejectError } from '@utils/errors';
import { formatNumber, roundToE8sPrecision } from '@utils/numbers';
import { cn } from '@utils/shadcn';

type Props = {
  balance: number;
  fromAccountId?: string;
  variant?: 'simple' | 'advanced';
};

enum Step {
  Form = 'form',
  Confirmation = 'confirmation',
}

const variantConfig = {
  simple: { Icon: Send, className: '', label: 'withdraw' },
  advanced: { Icon: ArrowUpRight, className: 'flex-1', label: 'send' },
} as const;

export const SendICPButton: React.FC<Props> = ({ balance, fromAccountId, variant = 'simple' }) => {
  const { t } = useTranslation();

  const {
    ready: ledgerReady,
    canister: ledgerCanister,
    authenticated: ledgerAuthenticated,
  } = useIcpLedger();

  const { tickerPrices: tickersQuery } = useTickerPrices();
  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);

  const { selectedAccountId, setSelectedAccountId, subaccountsEnabled } =
    useAccountSelection(fromAccountId);

  const addressBookQuery = useAddressBook();
  const addressBookEntries = addressBookQuery.data?.response?.named_addresses ?? [];
  const addressBookLoading = addressBookQuery.isLoading;
  const hasAddresses = addressBookEntries.length > 0;

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(Step.Form);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [toAccountError, setToAccountError] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [useAddressBookToggle, setUseAddressBookToggle] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const amountInputRef = useRef<HTMLInputElement>(null);

  const autoToggleAddressBook = useEffectEvent(() => {
    if (hasAddresses && toAccount === '') {
      setUseAddressBookToggle(true);
    }
  });

  useEffect(() => {
    if (!addressBookLoading) autoToggleAddressBook();
  }, [addressBookLoading]);

  // Keep the createdAt value for retry purposes (used for deduplication at the ledger level)
  const createdAtRef = useRef<bigint | null>(null);

  const effectiveBalance =
    subaccountsEnabled && nonNullish(selectedAccount) && isAccountReady(selectedAccount)
      ? bigIntDiv(selectedAccount.balanceE8s, E8Sn)
      : balance;
  const effectiveSubAccount = subaccountsEnabled ? selectedAccount?.subAccount : undefined;

  const transferMutation = useMutation({
    mutationFn: () => {
      // Use stored createdAt for retry deduplication, or generate a new one
      const createdAt = createdAtRef.current ?? nowInBigIntNanoSeconds();
      createdAtRef.current = createdAt;
      const transferAmount = bigIntMul(E8Sn, Number(amount));
      const subAccountArr = effectiveSubAccount ? Array.from(effectiveSubAccount) : undefined;

      if (isValidIcpAddress(toAccount)) {
        return ledgerCanister!.transfer({
          to: AccountIdentifier.fromHex(toAccount),
          amount: transferAmount,
          fromSubAccount: subAccountArr,
          createdAt,
        });
      }

      const { owner, subaccount } = decodeIcrcAccount(toAccount);
      return ledgerCanister!.icrc1Transfer({
        to: { owner, subaccount: toNullable(subaccount) },
        fromSubAccount: subAccountArr ? Uint8Array.from(subAccountArr) : undefined,
        amount: transferAmount,
        createdAt,
      });
    },
    onSuccess: () => {
      createdAtRef.current = null;
    },
    onError: (error) => {
      if (isCertifiedRejectError(error) || error instanceof TransferError) {
        createdAtRef.current = null;
      }
    },
  });

  const canTransfer = effectiveBalance > ICP_TRANSACTION_FEE && ledgerReady && ledgerAuthenticated;
  const max = roundToE8sPrecision(effectiveBalance - ICP_TRANSACTION_FEE);

  const resetFormState = useEffectEvent(() => {
    setStep(Step.Form);
    setToAccount('');
    setSelectedName('');
    setAmount('');
    setAmountError('');
    setToAccountError('');
    setSelectedAccountId(fromAccountId);
    setSelectedAccount(undefined);
    createdAtRef.current = null;
  });

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(resetFormState, DIALOG_RESET_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open]);

  const handleFormSubmit = (event: React.SyntheticEvent) => {
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

    setStep(Step.Confirmation);
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

  const numericAmount = Number(amount);
  const approxUsd =
    icpPrice && numericAmount > 0
      ? t(($) => $.account.approxUsd, { value: formatNumber(numericAmount * icpPrice.usd) })
      : undefined;

  const fromAccountName = nonNullish(selectedAccount)
    ? selectedAccount.name
    : t(($) => $.accounts.mainAccount);

  const destination = selectedName || toAccount;

  const { Icon, className: variantClassName, label } = variantConfig[variant];

  return (
    <>
      <Button
        variant="outline"
        disabled={!canTransfer}
        size="xl"
        className={cn('w-full', variantClassName)}
        data-testid="send-icp-btn"
        onClick={() => setOpen(true)}
      >
        <Icon aria-hidden />
        {t(($) => $.common[label])}
      </Button>

      <MutationDialog
        open={open}
        onOpenChange={setOpen}
        processingMessage={t(($) => $.account.transferProcessing, { amount, destination })}
        successMessage={t(($) => $.account.transferSuccess, { amount, destination })}
        navBlockerDescription={t(($) => $.account.confirmNavigation)}
        className="md:max-w-2xl"
      >
        {({ execute, close }) => (
          <AnimatePresence mode="wait" initial={false}>
            {step === Step.Form && (
              <SendFormStep
                subaccountsEnabled={subaccountsEnabled}
                selectedAccountId={selectedAccountId}
                onSelectedAccountIdChange={setSelectedAccountId}
                onSelectedAccountChange={setSelectedAccount}
                toAccount={toAccount}
                toAccountError={toAccountError}
                selectedName={selectedName}
                useAddressBookToggle={useAddressBookToggle}
                onAddressBookToggleChange={(checked) => {
                  setUseAddressBookToggle(checked);
                  setToAccount('');
                  setSelectedName('');
                  setToAccountError('');
                }}
                addressBookEntries={addressBookEntries}
                addressBookLoading={addressBookLoading}
                hasAddresses={hasAddresses}
                onDestinationSelect={(name, address) => {
                  setSelectedName(name);
                  handleAccountChange(address);
                }}
                onDestinationChange={handleAccountChange}
                amount={amount}
                amountError={amountError}
                onAmountChange={handleAmountChange}
                max={max}
                onMaxSelect={handleMaxSelect}
                amountInputRef={amountInputRef}
                approxUsd={approxUsd}
                onSubmit={handleFormSubmit}
                onClose={close}
              />
            )}

            {step === Step.Confirmation && (
              <SendConfirmationStep
                fromAccountName={fromAccountName}
                toAccount={toAccount}
                selectedName={selectedName}
                addressBookEntries={addressBookEntries}
                amount={amount}
                approxUsd={approxUsd}
                onBack={() => setStep(Step.Form)}
                onConfirm={() => execute(() => transferMutation.mutateAsync())}
                icpPriceUsd={icpPrice?.usd}
              />
            )}
          </AnimatePresence>
        )}
      </MutationDialog>
    </>
  );
};

type SendFormStepProps = {
  subaccountsEnabled: boolean;
  selectedAccountId?: string;
  onSelectedAccountIdChange: (id: string) => void;
  onSelectedAccountChange: (account: Account | undefined) => void;
  toAccount: string;
  toAccountError: string;
  selectedName: string;
  useAddressBookToggle: boolean;
  onAddressBookToggleChange: (checked: boolean) => void;
  addressBookEntries: NamedAddress[];
  addressBookLoading: boolean;
  hasAddresses: boolean;
  onDestinationSelect: (name: string, address: string) => void;
  onDestinationChange: (value: string) => void;
  amount: string;
  amountError: string;
  onAmountChange: (value: string) => void;
  max: number;
  onMaxSelect: (value: string) => void;
  amountInputRef: React.RefObject<HTMLInputElement | null>;
  approxUsd?: string;
  onSubmit: (event: React.SyntheticEvent) => void;
  onClose: () => void;
};

function SendFormStep({
  subaccountsEnabled,
  selectedAccountId,
  onSelectedAccountIdChange,
  onSelectedAccountChange,
  toAccount,
  toAccountError,
  selectedName,
  useAddressBookToggle,
  onAddressBookToggleChange,
  addressBookEntries,
  addressBookLoading,
  hasAddresses,
  onDestinationSelect,
  onDestinationChange,
  amount,
  amountError,
  onAmountChange,
  max,
  onMaxSelect,
  amountInputRef,
  approxUsd,
  onSubmit,
  onClose,
}: SendFormStepProps) {
  const { t } = useTranslation();
  const showToggle = !addressBookLoading && hasAddresses;

  return (
    <motion.form
      key="form"
      onSubmit={onSubmit}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <MutationDialogHeader>
        <ResponsiveDialogTitle>{t(($) => $.account.transferTitle)}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription className="sr-only">
          {t(($) => $.account.transferDescription)}
        </ResponsiveDialogDescription>
      </MutationDialogHeader>

      <MutationDialogBody className="-mx-1 px-5 pt-6 pb-4 md:px-1">
        <div className="flex flex-col gap-6">
          {subaccountsEnabled && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="send-from-account">
                {t(($) => $.stakeWizardModal.steps.amount.fromAccount)}
              </Label>
              <AccountSelect
                id="send-from-account"
                value={selectedAccountId}
                onChange={onSelectedAccountIdChange}
                onAccountChange={onSelectedAccountChange}
                data-testid="send-from-account-select"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={useAddressBookToggle ? 'address-book-select' : 'destination-account'}>
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
                    onCheckedChange={onAddressBookToggleChange}
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
                onSelect={onDestinationSelect}
              />
            ) : (
              <Input
                id="destination-account"
                onChange={(e) => onDestinationChange(e.target.value)}
                value={toAccount}
                className={cn('font-mono', toAccountError && 'border-destructive')}
                aria-invalid={!!toAccountError}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                required
              />
            )}
            {toAccountError && (
              <Alert variant="warning">
                <AlertTriangle className="size-4 text-destructive" />
                <AlertDescription>{toAccountError}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">{t(($) => $.common.amount)}</Label>
            <AmountInput
              id="amount"
              data-testid="send-icp-amount-input"
              ref={amountInputRef}
              value={amount}
              onChange={onAmountChange}
              maxAmount={max}
              onMaxSelect={onMaxSelect}
              required
              error={!!amountError}
              approxUsdLabel={approxUsd}
              availableLabel={t(($) => $.account.availableBalance, { amount: max })}
            />
            {amountError && (
              <Alert variant="warning">
                <AlertTriangle className="size-4 text-destructive" />
                <AlertDescription>{amountError}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </MutationDialogBody>

      <MutationDialogFooter className="md:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onClose}>
          {t(($) => $.common.close)}
        </Button>
        <Button type="submit" size="lg" data-testid="send-icp-next-btn">
          {t(($) => $.common.next)}
        </Button>
      </MutationDialogFooter>
    </motion.form>
  );
}

type SendConfirmationStepProps = {
  fromAccountName: string;
  toAccount: string;
  selectedName: string;
  addressBookEntries: NamedAddress[];
  amount: string;
  approxUsd?: string;
  icpPriceUsd?: number;
  onBack: () => void;
  onConfirm: () => void;
};

function SendConfirmationStep({
  fromAccountName,
  toAccount,
  selectedName,
  addressBookEntries,
  amount,
  approxUsd,
  icpPriceUsd,
  onBack,
  onConfirm,
}: SendConfirmationStepProps) {
  const { t } = useTranslation();
  const { data: accountsState } = useAccounts();

  const formatTransactionFeeUsd = (usdValue: number): string =>
    usdValue < 0.01 ? '< $0.01' : `≈ $${formatNumber(usdValue)}`;

  const isDestinationKnown =
    addressBookEntries.some((entry) => addressBookGetAddressString(entry.address) === toAccount) ||
    (accountsState?.accounts.some((a) => a.accountId === toAccount) ?? false);

  const destinationName = isDestinationKnown
    ? selectedName ||
      accountsState?.accounts.find((a) => a.accountId === toAccount)?.name ||
      toAccount
    : t(($) => $.account.unknownAddress);

  return (
    <motion.div
      key="confirmation"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <MutationDialogHeader>
        <ResponsiveDialogTitle>{t(($) => $.account.confirmTransferTitle)}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription className="sr-only">
          {t(($) => $.account.confirmTransferTitle)}
        </ResponsiveDialogDescription>
      </MutationDialogHeader>

      <MutationDialogBody className="-mx-1 px-5 pt-6 pb-4 md:px-1">
        <div className="flex flex-col gap-5">
          {/* Amount highlight */}
          <div className="flex flex-col items-center gap-1 py-2">
            <div className="flex items-center gap-2">
              <img src="/icp-token.svg" alt="" aria-hidden className="size-9" />
              <p className="text-3xl font-bold">{amount} ICP</p>
            </div>
            {nonNullish(approxUsd) && (
              <p className="text-base text-muted-foreground">{approxUsd}</p>
            )}
          </div>

          {/* Transfer details */}
          <div className="rounded-lg border p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t(($) => $.account.confirmFrom)}
                </span>
                <span className="text-sm font-medium">{fromAccountName}</span>
              </div>

              <div className="border-t pt-3">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {t(($) => $.account.confirmTo)}
                  </span>
                  <span className="truncate text-sm font-medium">{destinationName}</span>
                </div>
                <p className="mt-1 text-right font-mono text-sm break-all text-muted-foreground">
                  {toAccount}
                </p>
                {!isDestinationKnown && (
                  <Alert variant="warning" className="mt-2">
                    <AlertTriangle className="size-4" />
                    <AlertDescription>{t(($) => $.account.destinationWarning)}</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">
                  {t(($) => $.account.confirmTransactionFee)}
                </span>
                <span className="text-sm font-medium">
                  {ICP_TRANSACTION_FEE} ICP
                  {nonNullish(icpPriceUsd) &&
                    ` (${formatTransactionFeeUsd(ICP_TRANSACTION_FEE * icpPriceUsd)})`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </MutationDialogBody>

      <MutationDialogFooter className="md:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onBack}>
          {t(($) => $.common.back)}
        </Button>
        <Button type="button" size="lg" onClick={onConfirm} data-testid="send-icp-confirm-btn">
          {t(($) => $.common.confirm)}
        </Button>
      </MutationDialogFooter>
    </motion.div>
  );
}
