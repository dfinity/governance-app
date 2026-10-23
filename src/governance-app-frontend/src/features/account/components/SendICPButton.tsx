import { AccountIdentifier, TransferError } from '@icp-sdk/canisters/ledger/icp';
import { decodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { nonNullish, nowInBigIntNanoSeconds, toNullable } from '@dfinity/utils';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, ArrowUpRight, BookPlus, BookUser, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { NamedAddress } from '@declarations/governance-app-backend/backend.did';

import { ScanAddressButton } from '@features/account/components/ScanAddressButton';
import {
  encodeMemoToIcp,
  encodeMemoToIcrc1,
  validateTransactionMemo,
} from '@features/account/utils/transactionMemo';
import { AccountSelect } from '@features/accounts/components/AccountSelect';
import { useAccounts } from '@features/accounts/hooks/useAccounts';
import { useAccountSelection } from '@features/accounts/hooks/useAccountSelection';
import { type Account, isAccountReady } from '@features/accounts/types';
import { AddAddressModal } from '@features/addressBook/components/AddAddressModal';
import {
  DestinationInput,
  type DestinationSuggestion,
} from '@features/addressBook/components/DestinationInput';
import { AnalyticsEvent } from '@features/analytics/events';
import { getAmountRange, getErrorReason } from '@features/analytics/properties';
import { analytics } from '@features/analytics/service';

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
import { ADDRESS_BOOK_MAX_ENTRIES } from '@constants/addressBook';
import { DIALOG_RESET_DELAY_MS, E8Sn, ICP_TRANSACTION_FEE } from '@constants/extra';
import { useAddressBook } from '@hooks/addressBook/useAddressBook';
import { useIcpLedger } from '@hooks/icpLedger/useIcpLedger';
import { useIcpPrice } from '@hooks/tickers';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { AdvancedFeature } from '@typings/advancedFeatures';
import { isValidIcpAddress, isValidIcrcAddress } from '@utils/address';
import {
  addressBookGetAddressString,
  addressBookIsIcpAddress,
  addressBookMatchesAddress,
} from '@utils/addressBook';
import { bigIntDiv, bigIntMul } from '@utils/bigInt';
import { isCertifiedRejectError } from '@utils/errors';
import { shortenId } from '@utils/id';
import { getFiatFractionDigits, roundToE8sPrecision } from '@utils/numbers';
import { isCameraSupported } from '@utils/qrScanner';
import { cn } from '@utils/shadcn';

type Props = {
  balance: number;
  fromAccountId?: string;
  variant?: 'simple' | 'advanced';
};

export type SendDestination = {
  name: string;
  address: string;
};

type DialogProps = Omit<Props, 'variant'> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The entry point, for the analytics events of the transfer. */
  variant?: 'simple' | 'advanced' | 'contact';
  /** Prefills the destination with an address book entry and keeps it. */
  initialDestination?: SendDestination;
};

enum Step {
  Form = 'form',
  Confirmation = 'confirmation',
}

const addressKind = (address: string): DestinationSuggestion['kind'] =>
  isValidIcpAddress(address) ? 'icp' : 'icrc1';

const variantConfig = {
  simple: { Icon: Send, className: '', label: 'withdraw' },
  advanced: { Icon: ArrowUpRight, className: 'flex-1', label: 'send' },
} as const;

export const SendICPDialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  balance,
  fromAccountId,
  variant = 'simple',
  initialDestination,
}) => {
  const { t } = useTranslation();

  const { canister: ledgerCanister } = useIcpLedger();

  const { icpPrice, formatFiat } = useIcpPrice();

  const { selectedAccountId, setSelectedAccountId, resolvedAccountId, subaccountsEnabled } =
    useAccountSelection(fromAccountId);
  const { data: accountsState } = useAccounts();

  const { features } = useAdvancedFeatures();
  const memoEnabled = features[AdvancedFeature.TransactionMemo];

  const addressBookQuery = useAddressBook();
  const addressBookLoading = addressBookQuery.isLoading;
  // A save writes the new list into the cache at once, so the saved entry is
  // in this list even when the refetch of the book fails.
  const addressBookEntries = addressBookQuery.data?.response?.named_addresses ?? [];

  const [step, setStep] = useState(Step.Form);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [toAccount, setToAccount] = useState(initialDestination?.address ?? '');
  const [toAccountError, setToAccountError] = useState('');
  const [memo, setMemo] = useState('');
  const [memoError, setMemoError] = useState('');
  const [selectedName, setSelectedName] = useState(initialDestination?.name ?? '');
  // The kind of the picked suggestion. An own account and a contact can share a name and an address.
  const [selectedKind, setSelectedKind] = useState<DestinationSuggestion['kind'] | undefined>(
    initialDestination ? addressKind(initialDestination.address) : undefined,
  );
  const [saveAddressOpen, setSaveAddressOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Keep the createdAt value for retry purposes (used for deduplication at the ledger level)
  const createdAtRef = useRef<bigint | null>(null);

  const effectiveBalance =
    subaccountsEnabled && nonNullish(selectedAccount) && isAccountReady(selectedAccount)
      ? bigIntDiv(selectedAccount.balanceE8s, E8Sn)
      : balance;
  const effectiveSubAccount = subaccountsEnabled ? selectedAccount?.subAccount : undefined;

  // The name comes from the address book, whether the user picked the entry or
  // saved the destination from the confirmation step. Several entries can share
  // one address, so the picked entry wins over the first address match.
  const matchesDestination = (entry: NamedAddress) =>
    addressBookMatchesAddress(entry.address, toAccount);
  const isAccountPick = selectedKind === 'account';
  const pickedEntry = isAccountPick
    ? undefined
    : addressBookEntries.find((entry) => entry.name === selectedName && matchesDestination(entry));
  const addressBookName = pickedEntry?.name ?? addressBookEntries.find(matchesDestination)?.name;
  const ownAccountName = accountsState?.accounts.find(
    (account) => account.accountId === toAccount,
  )?.name;
  // A picked own account keeps its name, even when a contact shares the address.
  const destinationName = isAccountPick
    ? (ownAccountName ?? addressBookName)
    : (addressBookName ?? ownAccountName);

  const getSendProperties = () => ({
    variant,
    destination: isValidIcpAddress(toAccount) ? 'icp' : 'icrc1',
    address_book: nonNullish(pickedEntry) ? 'yes' : 'no',
  });

  const transferMutation = useMutation({
    mutationFn: () => {
      // Use stored createdAt for retry deduplication, or generate a new one
      const createdAt = createdAtRef.current ?? nowInBigIntNanoSeconds();
      createdAtRef.current = createdAt;
      const transferAmount = bigIntMul(E8Sn, Number(amount));
      const subAccountArr = effectiveSubAccount ? Array.from(effectiveSubAccount) : undefined;
      const memoValue = memoEnabled && memo !== '' ? memo : undefined;

      if (isValidIcpAddress(toAccount)) {
        return ledgerCanister!.transfer({
          to: AccountIdentifier.fromHex(toAccount),
          amount: transferAmount,
          fromSubAccount: subAccountArr,
          memo: memoValue !== undefined ? encodeMemoToIcp(memoValue) : undefined,
          createdAt,
        });
      }

      const { owner, subaccount } = decodeIcrcAccount(toAccount);
      return ledgerCanister!.icrc1Transfer({
        to: { owner, subaccount: toNullable(subaccount) },
        fromSubAccount: subAccountArr ? Uint8Array.from(subAccountArr) : undefined,
        amount: transferAmount,
        icrc1Memo: memoValue !== undefined ? encodeMemoToIcrc1(memoValue) : undefined,
        createdAt,
      });
    },
    onSuccess: () => {
      createdAtRef.current = null;
      analytics.event(AnalyticsEvent.AccountSendIcp, {
        ...getSendProperties(),
        amount_range: getAmountRange(Number(amount)),
      });
    },
    onError: (error) => {
      if (isCertifiedRejectError(error) || error instanceof TransferError) {
        createdAtRef.current = null;
      }
      analytics.event(AnalyticsEvent.AccountSendIcpError, {
        ...getSendProperties(),
        reason: getErrorReason(error),
      });
    },
  });

  const max = roundToE8sPrecision(effectiveBalance - ICP_TRANSACTION_FEE);

  const resetFormFields = () => {
    setStep(Step.Form);
    setToAccount(initialDestination?.address ?? '');
    setSelectedName(initialDestination?.name ?? '');
    setSelectedKind(initialDestination ? addressKind(initialDestination.address) : undefined);
    setAmount('');
    setAmountError('');
    setToAccountError('');
    setMemo('');
    setMemoError('');
    createdAtRef.current = null;
  };

  // The account picker notifies only when its resolved id changes, so the
  // account snapshot resets only after the close, with the picker.
  const resetFormState = useEffectEvent(() => {
    resetFormFields();
    setSelectedAccountId(fromAccountId);
    setSelectedAccount(undefined);
  });

  const resetFormFieldsOnOpen = useEffectEvent(resetFormFields);

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(resetFormState, DIALOG_RESET_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open]);

  // A reopen within the reset delay keeps the state of the last transfer, and
  // the entry can change between two opens. Reset the form fields on open.
  useEffect(() => {
    if (open) resetFormFieldsOnOpen();
  }, [open]);

  const handleFormSubmit = (event: React.SyntheticEvent) => {
    event.preventDefault();
    setToAccountError('');
    setAmountError('');
    setMemoError('');

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

    if (memoEnabled) {
      const memoValidation = validateTransactionMemo({
        memo: memo === '' ? undefined : memo,
        destinationAddress: toAccount,
      });
      if (memoValidation === 'ICP_MEMO_ERROR') {
        setMemoError(t(($) => $.account.memoIcpError));
        return;
      }
      if (memoValidation === 'ICRC_MEMO_ERROR') {
        setMemoError(t(($) => $.account.memoIcrcError));
        return;
      }
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

  const handleMemoChange = (value: string) => {
    setMemo(value);
    setMemoError('');
  };

  const handleMaxSelect = (value: string) => {
    setAmount(value);
    setAmountError('');
    amountInputRef?.current?.focus();
  };

  const numericAmount = Number(amount);
  const approxFiat =
    nonNullish(icpPrice) && numericAmount > 0
      ? t(($) => $.account.approxFiat, { value: formatFiat(numericAmount * icpPrice) })
      : undefined;

  const fromAccountName = nonNullish(selectedAccount)
    ? selectedAccount.name
    : t(($) => $.accounts.mainAccount);

  // A failed read leaves `data` empty. Saving on top of it would wipe the stored entries.
  const canSaveAddress =
    nonNullish(addressBookQuery.data) && addressBookEntries.length < ADDRESS_BOOK_MAX_ENTRIES;
  // The own accounts come first. The source account is not a destination.
  const ownAccounts = subaccountsEnabled
    ? (accountsState?.accounts ?? []).filter((account) => account.accountId !== resolvedAccountId)
    : [];
  const destinationSuggestions: DestinationSuggestion[] = [
    ...ownAccounts.map((account) => ({
      name: account.name,
      address: account.accountId,
      kind: 'account' as const,
    })),
    ...addressBookEntries.map((entry) => ({
      name: entry.name,
      address: addressBookGetAddressString(entry.address),
      kind: addressBookIsIcpAddress(entry.address) ? ('icp' as const) : ('icrc1' as const),
    })),
  ];
  // The locked destination stays a known suggestion even when the book no
  // longer holds the entry, so the chip stays in place.
  if (
    nonNullish(initialDestination) &&
    !destinationSuggestions.some(
      (suggestion) =>
        suggestion.name === initialDestination.name &&
        suggestion.address === initialDestination.address,
    )
  ) {
    destinationSuggestions.push({
      name: initialDestination.name,
      address: initialDestination.address,
      kind: addressKind(initialDestination.address),
    });
  }

  // Status messages only need to identify the destination, not let the user verify it
  // character by character — the confirmation step already shows the full address.
  const destination = destinationName ?? shortenId(toAccount, 8);

  return (
    <>
      <MutationDialog
        open={open}
        onOpenChange={onOpenChange}
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
                destinationSuggestions={destinationSuggestions}
                addressBookLoading={addressBookLoading}
                onDestinationChange={(value, name, suggestion) => {
                  setSelectedName(name);
                  setSelectedKind(suggestion?.kind);
                  handleAccountChange(value);
                }}
                onAddAddress={canSaveAddress ? () => setSaveAddressOpen(true) : undefined}
                destinationLocked={nonNullish(initialDestination)}
                amount={amount}
                amountError={amountError}
                onAmountChange={handleAmountChange}
                max={max}
                onMaxSelect={handleMaxSelect}
                amountInputRef={amountInputRef}
                approxFiat={approxFiat}
                memoEnabled={memoEnabled}
                memo={memo}
                memoError={memoError}
                onMemoChange={handleMemoChange}
                onSubmit={handleFormSubmit}
                onClose={close}
              />
            )}

            {step === Step.Confirmation && (
              <SendConfirmationStep
                fromAccountName={fromAccountName}
                toAccount={toAccount}
                destinationName={destinationName}
                onSaveAddress={canSaveAddress ? () => setSaveAddressOpen(true) : undefined}
                amount={amount}
                approxFiat={approxFiat}
                memo={memoEnabled && memo !== '' ? memo : undefined}
                onBack={() => setStep(Step.Form)}
                onConfirm={() => execute(() => transferMutation.mutateAsync())}
              />
            )}
          </AnimatePresence>
        )}
      </MutationDialog>

      <AddAddressModal
        isOpen={saveAddressOpen}
        onClose={() => setSaveAddressOpen(false)}
        initialAddress={toAccount}
        existingAddresses={addressBookEntries}
        onSaved={(entry) => {
          setSelectedName(entry.name);
          setSelectedKind(addressBookIsIcpAddress(entry.address) ? 'icp' : 'icrc1');
          handleAccountChange(addressBookGetAddressString(entry.address));
        }}
      />
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
  destinationSuggestions: DestinationSuggestion[];
  addressBookLoading: boolean;
  onDestinationChange: (
    value: string,
    selectedName: string,
    suggestion?: DestinationSuggestion,
  ) => void;
  onAddAddress?: () => void;
  destinationLocked: boolean;
  amount: string;
  amountError: string;
  onAmountChange: (value: string) => void;
  max: number;
  onMaxSelect: (value: string) => void;
  amountInputRef: React.RefObject<HTMLInputElement | null>;
  approxFiat?: string;
  memoEnabled: boolean;
  memo: string;
  memoError: string;
  onMemoChange: (value: string) => void;
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
  destinationSuggestions,
  addressBookLoading,
  onDestinationChange,
  onAddAddress,
  destinationLocked,
  amount,
  amountError,
  onAmountChange,
  max,
  onMaxSelect,
  amountInputRef,
  approxFiat,
  memoEnabled,
  memo,
  memoError,
  onMemoChange,
  onSubmit,
  onClose,
}: SendFormStepProps) {
  const { t } = useTranslation();
  const cameraSupported = isCameraSupported();

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
              <Label htmlFor="destination-account">{t(($) => $.account.destinationAccount)}</Label>
              {addressBookLoading && (
                <div className="flex items-center gap-1.5">
                  <BookUser className="size-3.5 animate-pulse text-muted-foreground" />
                  <span className="animate-pulse text-xs text-muted-foreground">
                    {t(($) => $.addressBook.sendFlow.tooltipLoading)}
                  </span>
                </div>
              )}
            </div>

            <DestinationInput
              id="destination-account"
              data-testid="send-icp-destination-input"
              value={toAccount}
              selectedName={selectedName}
              suggestions={destinationSuggestions}
              onChange={onDestinationChange}
              onAddAddress={onAddAddress}
              locked={destinationLocked}
              invalid={!!toAccountError}
              placeholder={t(($) => $.addressBook.destination.placeholder)}
              inputClassName={cn(toAccountError && 'border-destructive')}
              endAdornment={
                cameraSupported ? (
                  <ScanAddressButton
                    className="absolute top-1/2 right-0.5 -translate-y-1/2"
                    onScan={({ address, amount }) => {
                      onDestinationChange(address, '');
                      if (nonNullish(amount)) onAmountChange(String(amount));
                    }}
                  />
                ) : undefined
              }
            />
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
              approxFiatLabel={approxFiat}
              availableLabel={t(($) => $.account.availableBalance, { amount: max })}
            />
            {amountError && (
              <Alert variant="warning">
                <AlertTriangle className="size-4 text-destructive" />
                <AlertDescription>{amountError}</AlertDescription>
              </Alert>
            )}
          </div>

          {memoEnabled && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="transaction-memo">{t(($) => $.account.memoLabel)}</Label>
              <Input
                id="transaction-memo"
                data-testid="send-icp-memo-input"
                value={memo}
                onChange={(e) => onMemoChange(e.target.value)}
                className={cn(memoError && 'border-destructive')}
                aria-invalid={!!memoError}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
              <span className="text-xs text-muted-foreground">{t(($) => $.account.memoHint)}</span>
              {memoError && (
                <Alert variant="warning">
                  <AlertTriangle className="size-4 text-destructive" />
                  <AlertDescription>{memoError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
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
  /** The name of a known destination: an address book entry or an own account. */
  destinationName?: string;
  onSaveAddress?: () => void;
  amount: string;
  approxFiat?: string;
  memo?: string;
  onBack: () => void;
  onConfirm: () => void;
};

function SendConfirmationStep({
  fromAccountName,
  toAccount,
  destinationName,
  onSaveAddress,
  amount,
  approxFiat,
  memo,
  onBack,
  onConfirm,
}: SendConfirmationStepProps) {
  const { t } = useTranslation();
  const { icpPrice, currency, formatFiat } = useIcpPrice();

  // The fee can be smaller than the smallest unit of the currency, for example "< $0.01".
  const formatTransactionFeeFiat = (fiatValue: number): string => {
    const smallestUnit = 10 ** -getFiatFractionDigits(currency);
    return fiatValue < smallestUnit
      ? `< ${formatFiat(smallestUnit)}`
      : `≈ ${formatFiat(fiatValue)}`;
  };

  const isDestinationKnown = nonNullish(destinationName);
  const destinationLabel = destinationName ?? t(($) => $.account.unknownAddress);

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
            {nonNullish(approxFiat) && (
              <p className="text-base text-muted-foreground">{approxFiat}</p>
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
                  <span
                    className="truncate text-sm font-medium"
                    data-testid="send-icp-destination-name"
                  >
                    {destinationLabel}
                  </span>
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
                {!isDestinationKnown && nonNullish(onSaveAddress) && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onSaveAddress}
                      data-testid="send-icp-save-address-btn"
                    >
                      <BookPlus className="size-4" aria-hidden />
                      {t(($) => $.addressBook.saveToAddressBook)}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">
                  {t(($) => $.account.confirmTransactionFee)}
                </span>
                <span className="text-sm font-medium">
                  {ICP_TRANSACTION_FEE} ICP
                  {nonNullish(icpPrice) &&
                    ` (${formatTransactionFeeFiat(ICP_TRANSACTION_FEE * icpPrice)})`}
                </span>
              </div>

              {nonNullish(memo) && (
                <div className="flex min-w-0 items-center justify-between gap-2 border-t pt-3">
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {t(($) => $.account.confirmMemo)}
                  </span>
                  <span className="truncate font-mono text-sm font-medium">{memo}</span>
                </div>
              )}
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

export const SendICPButton: React.FC<Props> = ({ balance, fromAccountId, variant = 'simple' }) => {
  const { t } = useTranslation();
  const { ready: ledgerReady, authenticated: ledgerAuthenticated } = useIcpLedger();
  const [open, setOpen] = useState(false);

  const canTransfer = balance > ICP_TRANSACTION_FEE && ledgerReady && ledgerAuthenticated;
  const { Icon, className: variantClassName, label } = variantConfig[variant];

  return (
    <>
      <Button
        variant="outline"
        disabled={!canTransfer}
        size="xl"
        className={cn('w-full', variantClassName)}
        data-testid="send-icp-btn"
        onClick={() => {
          analytics.event(AnalyticsEvent.AccountOpenSend, { variant });
          setOpen(true);
        }}
      >
        <Icon aria-hidden />
        {t(($) => $.common[label])}
      </Button>

      <SendICPDialog
        open={open}
        onOpenChange={setOpen}
        balance={balance}
        fromAccountId={fromAccountId}
        variant={variant}
      />
    </>
  );
};
