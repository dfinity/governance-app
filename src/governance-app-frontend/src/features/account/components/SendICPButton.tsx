import { AccountIdentifier, TransferError } from '@icp-sdk/canisters/ledger/icp';
import { decodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { nonNullish, nowInBigIntNanoSeconds, toNullable } from '@dfinity/utils';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, ArrowUpRight, BookUser, Loader, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AccountSelect } from '@features/accounts/components/AccountSelect';
import { useAccounts } from '@features/accounts/hooks/useAccounts';
import { type Account, isAccountReady } from '@features/accounts/types';
import { AddressBookSelect } from '@features/addressBook/components/AddressBookSelect';

import { Alert, AlertDescription } from '@components/Alert';
import { AmountInput } from '@components/AmountInput';
import { AnimatedCheckmark } from '@components/AnimatedCheckmark';
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
import { E8Sn, ICP_TRANSACTION_FEE } from '@constants/extra';
import { useAddressBook } from '@hooks/addressBook/useAddressBook';
import { useIcpLedger } from '@hooks/icpLedger/useIcpLedger';
import { useTickerPrices } from '@hooks/tickers';
import { isValidIcpAddress, isValidIcrcAddress } from '@utils/address';
import { addressBookGetAddressString } from '@utils/addressBook';
import { bigIntDiv, bigIntMul } from '@utils/bigInt';
import { isCertifiedRejectError, mapCanisterError } from '@utils/errors';
import { formatNumber, roundToE8sPrecision } from '@utils/numbers';
import { cn } from '@utils/shadcn';

type Props = {
  balance: number;
  fromAccountId?: string;
  variant?: 'simple' | 'advanced';
};

enum Phase {
  Form = 'form',
  Confirmation = 'confirmation',
  Processing = 'processing',
  Success = 'success',
  Error = 'error',
}

const SUCCESS_AUTO_CLOSE_MS = 2500;

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

  const { data: accountsState } = useAccounts();

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
  const [phase, setPhase] = useState<Phase>(Phase.Form);
  const [errorMessage, setErrorMessage] = useState('');
  const [useAddressBookToggle, setUseAddressBookToggle] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(fromAccountId);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
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
    onMutate: () => {
      setPhase(Phase.Processing);
    },
    onSuccess: () => {
      setPhase(Phase.Success);
      createdAtRef.current = null;
    },
    onError: (error) => {
      if (isCertifiedRejectError(error) || error instanceof TransferError) {
        createdAtRef.current = null;
      }
      setErrorMessage(mapCanisterError(error));
      setPhase(Phase.Error);
    },
  });

  const isProcessing = phase === Phase.Processing;

  const effectiveBalance =
    nonNullish(selectedAccount) && isAccountReady(selectedAccount)
      ? bigIntDiv(selectedAccount.balanceE8s, E8Sn)
      : balance;
  const effectiveSubAccount = selectedAccount?.subAccount;

  const canTransfer =
    effectiveBalance > ICP_TRANSACTION_FEE && ledgerReady && ledgerAuthenticated && !isProcessing;
  const max = roundToE8sPrecision(effectiveBalance - ICP_TRANSACTION_FEE);

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

    setPhase(Phase.Confirmation);
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

  const handleClose = () => {
    setOpen(false);
  };

  const handleOpenChange = (value: boolean) => {
    if (isProcessing) return;
    if (!value) {
      // Delay reset to allow close animation to complete
      setTimeout(() => {
        setPhase(Phase.Form);
        setToAccount('');
        setSelectedName('');
        setAmount('');
        setAmountError('');
        setToAccountError('');
        setErrorMessage('');
        setSelectedAccountId(fromAccountId);
        setSelectedAccount(undefined);
      }, 300);
    }
    setOpen(value);
  };

  const handleRetry = () => {
    setPhase(Phase.Confirmation);
  };

  const autoCloseOnSuccess = useEffectEvent(() => {
    handleOpenChange(false);
  });

  // Auto-close on success
  useEffect(() => {
    if (phase !== Phase.Success) return;
    const timer = setTimeout(autoCloseOnSuccess, SUCCESS_AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const numericAmount = Number(amount);
  const approxUsd =
    icpPrice && numericAmount > 0
      ? t(($) => $.account.approxUsd, { value: formatNumber(numericAmount * icpPrice.usd) })
      : undefined;

  const isDestinationKnown =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addressBookEntries.some(
      (entry: any) => addressBookGetAddressString(entry.address) === toAccount,
    ) ||
    (accountsState?.accounts.some((a) => a.accountId === toAccount) ?? false);

  const fromAccountName = nonNullish(selectedAccount)
    ? selectedAccount.name
    : t(($) => $.accounts.mainAccount);

  const resolveDestinationName = (): string => {
    if (selectedName) return selectedName;
    const matchedAccount = accountsState?.accounts.find((a) => a.accountId === toAccount);
    if (matchedAccount) return matchedAccount.name;
    return toAccount;
  };
  const destination = resolveDestinationName();

  const { Icon, className: variantClassName, label } = variantConfig[variant];

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogTrigger asChild>
        <Button
          variant="outline"
          disabled={!canTransfer}
          size="xl"
          className={cn('w-full', isProcessing && 'opacity-50', variantClassName)}
          data-testid="send-icp-btn"
        >
          <Icon aria-hidden />
          {isProcessing ? t(($) => $.common.sending) : t(($) => $.common[label])}
        </Button>
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent
        className="flex max-h-[90vh] min-h-[400px] flex-col"
        showCloseButton={phase === Phase.Form || phase === Phase.Confirmation}
      >
        <AnimatePresence mode="wait" initial={false}>
          {phase === Phase.Form && (
            <SendFormPhase
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
              isProcessing={isProcessing}
              onSubmit={handleSubmit}
              onClose={handleClose}
            />
          )}

          {phase === Phase.Confirmation && (
            <SendConfirmationPhase
              fromAccountName={fromAccountName}
              toAccount={toAccount}
              destinationName={
                isDestinationKnown ? destination : t(($) => $.account.unknownAddress)
              }
              isDestinationKnown={isDestinationKnown}
              amount={amount}
              approxUsd={approxUsd}
              onBack={() => setPhase(Phase.Form)}
              onConfirm={() => transferMutation.mutate()}
              isProcessing={isProcessing}
            />
          )}

          {(phase === Phase.Processing || phase === Phase.Success) && (
            <SendTransferPhase
              isSuccess={phase === Phase.Success}
              processingMessage={t(($) => $.account.transferProcessing, { amount, destination })}
              successMessage={t(($) => $.account.transferSuccess, { amount, destination })}
            />
          )}

          {phase === Phase.Error && (
            <SendErrorPhase
              errorMessage={errorMessage}
              onClose={handleClose}
              onRetry={handleRetry}
            />
          )}
        </AnimatePresence>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

type SendFormPhaseProps = {
  selectedAccountId?: string;
  onSelectedAccountIdChange: (id: string) => void;
  onSelectedAccountChange: (account: Account | undefined) => void;
  toAccount: string;
  toAccountError: string;
  selectedName: string;
  useAddressBookToggle: boolean;
  onAddressBookToggleChange: (checked: boolean) => void;
  addressBookEntries: any[];
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
  isProcessing: boolean;
  onSubmit: (event: React.SyntheticEvent) => void;
  onClose: () => void;
};

function SendFormPhase({
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
  isProcessing,
  onSubmit,
  onClose,
}: SendFormPhaseProps) {
  const { t } = useTranslation();
  const showToggle = !addressBookLoading && hasAddresses;

  return (
    <motion.form
      key="form"
      onSubmit={onSubmit}
      className="flex min-h-0 flex-1 flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <ResponsiveDialogHeader className="shrink-0">
        <ResponsiveDialogTitle>{t(($) => $.account.transferTitle)}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription className="sr-only">
          Transfer ICP tokens to another account.
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      <div className="-mx-1 flex-1 overflow-y-auto px-5 pt-6 pb-4 md:px-1">
        <div className="flex flex-col gap-6">
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
                onSelect={(name, address) => onDestinationSelect(name, address)}
                disabled={isProcessing}
              />
            ) : (
              <Input
                id="destination-account"
                onChange={(e) => onDestinationChange(e.target.value)}
                disabled={isProcessing}
                value={toAccount}
                className={`font-mono ${toAccountError ? 'border-destructive' : ''}`}
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
              disabled={isProcessing}
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
      </div>

      <ResponsiveDialogFooter className="flex shrink-0 justify-end gap-2">
        <Button type="button" variant="ghost" size="lg" onClick={onClose} disabled={isProcessing}>
          {t(($) => $.common.close)}
        </Button>
        <Button type="submit" size="lg" disabled={isProcessing} data-testid="send-icp-confirm-btn">
          {t(($) => $.common.next)}
        </Button>
      </ResponsiveDialogFooter>
    </motion.form>
  );
}

type SendConfirmationPhaseProps = {
  fromAccountName: string;
  toAccount: string;
  destinationName: string;
  isDestinationKnown: boolean;
  amount: string;
  approxUsd?: string;
  onBack: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
};

function SendConfirmationPhase({
  fromAccountName,
  toAccount,
  destinationName,
  isDestinationKnown,
  amount,
  approxUsd,
  onBack,
  onConfirm,
  isProcessing,
}: SendConfirmationPhaseProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      key="confirmation"
      className="flex min-h-0 flex-1 flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <ResponsiveDialogHeader className="shrink-0">
        <ResponsiveDialogTitle>{t(($) => $.account.confirmTransferTitle)}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription className="sr-only">
          {t(($) => $.account.confirmTransferTitle)}
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      <div className="-mx-1 flex-1 overflow-y-auto px-5 pt-6 pb-4 md:px-1">
        <div className="flex flex-col gap-5">
          {/* Amount highlight */}
          <div className="flex flex-col items-center gap-1 py-2">
            <div className="flex items-center gap-2">
              <img src="/icp-token.svg" alt="" aria-hidden={true} className="size-9" />
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
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t(($) => $.account.confirmTo)}
                  </span>
                  <span className="text-sm font-medium">{destinationName}</span>
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
                  {ICP_TRANSACTION_FEE} ICP ({'< $0.01'})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ResponsiveDialogFooter className="flex shrink-0 justify-end gap-2">
        <Button type="button" variant="ghost" size="lg" onClick={onBack} disabled={isProcessing}>
          {t(($) => $.common.back)}
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={onConfirm}
          disabled={isProcessing}
          data-testid="send-icp-confirm-btn"
        >
          {t(($) => $.common.confirm)}
        </Button>
      </ResponsiveDialogFooter>
    </motion.div>
  );
}

function AnimatedSendIcon() {
  const strokeProps = {
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <motion.svg className="size-12 text-muted-foreground" viewBox="0 0 24 24">
      <motion.path
        d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"
        {...strokeProps}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      <motion.path
        d="m21.854 2.147-10.94 10.939"
        {...strokeProps}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
      />
    </motion.svg>
  );
}

const DRAW_DURATION = 1;

function SendTransferPhase({
  isSuccess,
  processingMessage,
  successMessage,
}: {
  isSuccess: boolean;
  processingMessage: string;
  successMessage: string;
}) {
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSpinner(true), DRAW_DURATION * 1000);
    return () => clearTimeout(timer);
  }, []);

  const message = isSuccess ? successMessage : processingMessage;
  const iconState = isSuccess ? 'success' : showSpinner ? 'spinner' : 'send';

  return (
    <motion.div
      key="transfer"
      className="flex flex-1 flex-col items-center justify-center gap-5 py-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <ResponsiveDialogTitle className="sr-only">{message}</ResponsiveDialogTitle>
      <motion.div
        className={cn(
          'flex size-20 items-center justify-center rounded-full transition-colors duration-300',
          isSuccess ? 'bg-green-600/10' : 'bg-primary/10',
        )}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <AnimatePresence mode="wait">
          {iconState === 'send' && (
            <motion.div key="send" exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}>
              <AnimatedSendIcon />
            </motion.div>
          )}
          {iconState === 'spinner' && (
            <motion.div
              key="spinner"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <Loader className="size-10 animate-spin text-muted-foreground" />
            </motion.div>
          )}
          {iconState === 'success' && (
            <motion.div
              key="checkmark"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatedCheckmark />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.p
          key={message}
          className="text-sm font-medium text-muted-foreground"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          {message}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}

function SendErrorPhase({
  errorMessage,
  onClose,
  onRetry,
}: {
  errorMessage: string;
  onClose: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();

  return (
    <motion.div
      key="error"
      className="flex flex-1 flex-col items-center justify-between py-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <ResponsiveDialogTitle className="sr-only">{errorMessage}</ResponsiveDialogTitle>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <motion.div
          className="flex size-20 items-center justify-center rounded-full bg-destructive/10"
          initial={{ scale: 0.8, rotate: 0 }}
          animate={{ scale: 1, rotate: [0, -5, 5, -5, 5, 0] }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <AlertTriangle className="size-10 text-destructive" />
        </motion.div>
        <motion.p
          className="max-w-xs text-sm font-medium text-muted-foreground"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          {errorMessage}
        </motion.p>
      </div>
      <div className="flex w-full gap-3 pt-4">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          {t(($) => $.common.close)}
        </Button>
        <Button className="flex-1" onClick={onRetry}>
          {t(($) => $.common.retry)}
        </Button>
      </div>
    </motion.div>
  );
}
