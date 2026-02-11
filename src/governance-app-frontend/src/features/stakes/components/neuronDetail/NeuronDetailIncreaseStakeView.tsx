import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { AmountInput } from '@components/AmountInput';
import { Button } from '@components/button';
import { Label } from '@components/Label';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn, ICP_MIN_STAKE_AMOUNT, ICP_TRANSACTION_FEE } from '@constants/extra';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { useTickerPrices } from '@hooks/tickers';
import { bigIntDiv } from '@utils/bigInt';
import { mapCanisterError } from '@utils/errors';
import { getNeuronStakeAfterFeesE8s } from '@utils/neuron';
import { errorNotification, successNotification } from '@utils/notification';
import { formatNumber, roundToE8sPrecision } from '@utils/numbers';

import { useIncreaseStake } from '../../hooks/useIncreaseStake';

type Props = {
  neuron: NeuronInfo;
  onSuccess: () => void;
  onProcessingChange: (isProcessing: boolean) => void;
};

export function NeuronDetailIncreaseStakeView({ neuron, onSuccess, onProcessingChange }: Props) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { tickerPrices: tickersQuery } = useTickerPrices();
  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);

  const { data: balanceValue } = useIcpLedgerAccountBalance();
  const balance = nonNullish(balanceValue?.response) ? bigIntDiv(balanceValue.response, E8Sn) : 0;
  const availableBalance = Math.max(0, roundToE8sPrecision(balance - ICP_TRANSACTION_FEE));
  const currentStake = bigIntDiv(getNeuronStakeAfterFeesE8s(neuron), E8Sn);

  const accountIdentifier = neuron.fullNeuron?.accountIdentifier;

  const { mutateAsync, isPending } = useIncreaseStake();

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setValidationError(null);
  };

  const handleMaxSelect = (value: string) => {
    setAmount(value);
    inputRef?.current?.focus();
    setValidationError(null);
  };

  const handleConfirm = async () => {
    const numericAmount = Number(amount);

    if (numericAmount < ICP_MIN_STAKE_AMOUNT) {
      setValidationError(
        t(($) => $.neuronDetailModal.increaseStake.errors.amountTooLow, {
          min: ICP_MIN_STAKE_AMOUNT,
        }),
      );
      return;
    }

    if (numericAmount > availableBalance) {
      setValidationError(t(($) => $.neuronDetailModal.increaseStake.errors.insufficientBalance));
      return;
    }

    if (!accountIdentifier) {
      setValidationError(t(($) => $.neuronDetailModal.increaseStake.errors.failed));
      return;
    }

    onProcessingChange(true);

    try {
      await mutateAsync({
        neuronId: neuron.neuronId,
        accountIdentifier,
        amount: numericAmount,
      });

      successNotification({
        description: t(($) => $.neuronDetailModal.increaseStake.success, { amount }),
      });

      // Wait for the navigation blocker to be released (isPending propagated to false)
      setTimeout(onSuccess);
    } catch (err) {
      errorNotification({
        description: mapCanisterError(err as Error),
      });
    } finally {
      onProcessingChange(false);
    }
  };

  const numericAmount = Number(amount);
  const approxUsd =
    icpPrice && numericAmount > 0
      ? t(($) => $.account.approxUsd, { value: formatNumber(numericAmount * icpPrice.usd) })
      : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPending) {
      handleConfirm();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-1">
        <Label htmlFor="increase-amount">
          {t(($) => $.neuronDetailModal.increaseStake.amountLabel)}
        </Label>
        <AmountInput
          id="increase-amount"
          ref={inputRef}
          value={amount}
          onChange={handleAmountChange}
          maxAmount={availableBalance}
          onMaxSelect={handleMaxSelect}
          disabled={isPending}
          approxUsdLabel={approxUsd}
          availableLabel={t(($) => $.neuronDetailModal.increaseStake.currentAndAvailable, {
            current: currentStake.toString(),
            available: availableBalance.toString(),
          })}
          availableLabelTestId="increase-stake-current-stake"
          data-testid="increase-stake-amount-input"
        />
      </div>

      {validationError && (
        <Alert variant="warning" data-testid="increase-stake-error">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          {t(($) => $.neuronDetailModal.increaseStake.info)}
        </AlertDescription>
      </Alert>

      <Button
        type="submit"
        size="xl"
        className="w-full"
        disabled={isPending}
        data-testid="increase-stake-confirm-btn"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t(($) => $.neuronDetailModal.increaseStake.confirming)}
          </>
        ) : (
          t(($) => $.neuronDetailModal.increaseStake.confirm)
        )}
      </Button>
    </form>
  );
}
