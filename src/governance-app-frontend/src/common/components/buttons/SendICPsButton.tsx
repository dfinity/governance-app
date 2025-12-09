import { AccountIdentifier, isIcpAccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { useMutation } from '@tanstack/react-query';
import React, { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  E8Sn,
  ICP_MIN_TRANSFER_AMOUNT,
  ICP_TRANSACTION_FEE,
  ICP_TRANSACTION_PROPAGATION_DELAY_MS,
} from '@constants/extra';
import { useIcpLedger } from '@hooks/canisters/icpLedger/useIcpLedger';
import { delay } from '@utils/async';
import { bigIntMul } from '@utils/bigInt';
import { errorNotification, successNotification } from '@utils/notification';

import { Button } from '@/common/ui/button';
import { Input } from '@/common/ui/input';
import { Label } from '@/common/ui/label';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@/common/ui/responsive-dialog';

type Props = { balance: number };

const SendICPsButton: React.FC<Props> = ({ balance }) => {
  const { t } = useTranslation();

  const {
    ready: ledgerReady,
    canister: ledgerCanister,
    authenticated: ledgerAuthenticated,
  } = useIcpLedger();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [toAccountError, setToAccountError] = useState('');
  const [isPending, setIsPending] = useState(false);

  const transferMutation = useMutation({
    mutationFn: () =>
      ledgerCanister!.transfer({
        to: AccountIdentifier.fromHex(toAccount),
        amount: bigIntMul(E8Sn, Number(amount), 8),
      }),
    onMutate: () => {
      setIsPending(true);
    },
    onSuccess: async () => {
      // Wait 2 seconds to allow the backend to process the transaction.
      await delay(ICP_TRANSACTION_PROPAGATION_DELAY_MS);
      setToAccount('');
      setAmount('');
      successNotification({
        description: t(($) => $.account.transferSuccess, { amount, toAccount }),
      });
      setIsPending(false);
      setOpen(false);
    },
    onError: () => {
      errorNotification({
        description: t(($) => $.account.transferError, { amount, toAccount }),
      });
      setIsPending(false);
    },
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    transferMutation.mutate();
  };

  const canTransfer =
    balance >= ICP_MIN_TRANSFER_AMOUNT + ICP_TRANSACTION_FEE &&
    ledgerReady &&
    ledgerAuthenticated &&
    !isPending;
  const max = balance - ICP_TRANSACTION_FEE;

  const handleAccountChange = (value: string) => {
    setToAccount(value);
    setToAccountError('');
    if (!value) return;
    if (!isIcpAccountIdentifier(value)) {
      setToAccountError(t(($) => $.account.accountError));
    }
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setAmountError('');
    if (!value) return;
    const numericValue = Number(value);
    if (numericValue < ICP_MIN_TRANSFER_AMOUNT || numericValue > max) {
      setAmountError(t(($) => $.account.amountError));
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        <Button variant="outline" disabled={!canTransfer} className={isPending ? 'opacity-50' : ''}>
          {isPending ? 'Sending...' : t(($) => $.common.send)}
        </Button>
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent className="max-w-xs">
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t(($) => $.account.transferTitle)}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="sr-only">
              Transfer ICP tokens to another account.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="destination-account">{t(($) => $.account.destinationAccount)}</Label>
              <Input
                id="destination-account"
                onChange={(e) => handleAccountChange(e.target.value)}
                disabled={isPending}
                value={toAccount}
                className={toAccountError ? 'border-destructive' : ''}
                required
              />
              {toAccountError && <p className="text-sm text-destructive">{toAccountError}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">{t(($) => $.common.amount)}</Label>
              <Input
                id="amount"
                type="number"
                onChange={(e) => handleAmountChange(e.target.value)}
                disabled={isPending}
                value={amount}
                className={amountError ? 'border-destructive' : ''}
                required
              />
              {amountError && <p className="text-sm text-destructive">{amountError}</p>}
            </div>

            <p className="text-xs text-muted-foreground">
              {t(($) => $.account.transactionHint, {
                min: ICP_MIN_TRANSFER_AMOUNT,
                max: max,
                fee: ICP_TRANSACTION_FEE,
              })}
            </p>
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
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Sending...' : t(($) => $.common.confirm)}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export { SendICPsButton };
