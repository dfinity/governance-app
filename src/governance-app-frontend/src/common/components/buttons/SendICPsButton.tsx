import { AccountIdentifier, isIcpAccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { useMutation } from '@tanstack/react-query';
import React, { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Dialog, DialogTrigger, Input, Modal, ModalOverlay } from '@ui';

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

type Props = { balance: number };

const SendICPsButton: React.FC<Props> = ({ balance }) => {
  const { t } = useTranslation();

  const {
    ready: ledgerReady,
    canister: ledgerCanister,
    authenticated: ledgerAuthenticated,
  } = useIcpLedger();

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
    },
    onError: () => {
      errorNotification({
        description: t(($) => $.account.transferError, { amount, toAccount }),
      });
      setIsPending(false);
    },
  });

  const handleSubmit = (close: () => void) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    transferMutation.mutate();
    close();
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
    <DialogTrigger>
      <Button isDisabled={!canTransfer} isLoading={isPending} color="secondary">
        {t(($) => $.common.send)}
      </Button>

      <ModalOverlay isKeyboardDismissDisabled>
        <Modal className={'max-w-xs rounded-2xl p-6'}>
          <Dialog>
            {({ close }) => (
              <form className="flex flex-col gap-4" onSubmit={handleSubmit(close)}>
                <h3 className="text-lg font-semibold">
                  {t(($) => $.account.transferTitle)}
                </h3>

                <Input
                  label={t(($) => $.account.destinationAccount)}
                  onChange={handleAccountChange}
                  isInvalid={!!toAccountError}
                  isDisabled={isPending}
                  hint={toAccountError}
                  value={toAccount}
                  type="string"
                  isRequired
                />

                <Input
                  label={t(($) => $.common.amount)}
                  onChange={handleAmountChange}
                  isInvalid={!!amountError}
                  isDisabled={isPending}
                  hint={amountError}
                  value={amount}
                  type="number"
                  isRequired
                />

                <p className="text-xs">
                  {t(($) => $.account.transactionHint, {
                    min: ICP_MIN_TRANSFER_AMOUNT,
                    max: max,
                    fee: ICP_TRANSACTION_FEE,
                  })}
                </p>

                <div className="flex justify-end gap-2">
                  <Button type="button" color="secondary" onClick={close} isDisabled={isPending}>
                    {t(($) => $.common.close)}
                  </Button>
                  <Button type="submit" color="primary" isDisabled={isPending}>
                    {t(($) => $.common.confirm)}
                  </Button>
                </div>
              </form>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
};

export { SendICPsButton };
