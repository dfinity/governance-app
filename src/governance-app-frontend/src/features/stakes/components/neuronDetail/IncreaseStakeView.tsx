import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';
import { Input } from '@components/Input';
import { Label } from '@components/Label';
import { E8Sn, ICP_MIN_STAKE_AMOUNT } from '@constants/extra';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { bigIntDiv } from '@utils/bigInt';
import { errorNotification, successNotification } from '@utils/notification';

import { useIncreaseStake } from '../../hooks/useIncreaseStake';

type Props = {
  neuron: NeuronInfo;
  onSuccess: () => void;
  onProcessingChange: (isProcessing: boolean) => void;
};

export function IncreaseStakeView({ neuron, onSuccess, onProcessingChange }: Props) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: balanceValue } = useIcpLedgerAccountBalance();
  const availableBalance = nonNullish(balanceValue?.response)
    ? bigIntDiv(balanceValue.response, E8Sn)
    : 0;

  const currentStake = neuron.fullNeuron?.cachedNeuronStake
    ? bigIntDiv(neuron.fullNeuron.cachedNeuronStake, E8Sn)
    : 0;

  const accountIdentifier = neuron.fullNeuron?.accountIdentifier;

  const { execute, isProcessing } = useIncreaseStake();

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setValidationError(null);
  };

  const handleMax = () => {
    setAmount(availableBalance.toString());
    inputRef?.current?.focus();
    setValidationError(null);
  };

  const handleConfirm = async () => {
    const numericAmount = Number(amount);

    if (amount === '' || numericAmount < ICP_MIN_STAKE_AMOUNT) {
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

    const result = await execute({
      neuronId: neuron.neuronId,
      accountIdentifier,
      amount: numericAmount,
    });

    onProcessingChange(false);

    if (result.success) {
      successNotification({
        description: t(($) => $.neuronDetailModal.increaseStake.success, { amount }),
      });
      // Wait for the naviagion blocker to be released (isProcessing propagated to false)
      setTimeout(onSuccess);
    } else if (result.error) {
      errorNotification({
        description: result.error,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProcessing) {
      handleConfirm();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-1">
        <Label htmlFor="increase-amount">
          {t(($) => $.neuronDetailModal.increaseStake.amountLabel)}
        </Label>
        <div className="relative">
          <Input
            className="h-14 [appearance:textfield] border-2 pr-24 !text-lg font-semibold focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            id="increase-amount"
            ref={inputRef}
            value={amount}
            type="number"
            step="any"
            disabled={isProcessing}
            data-testid="increase-stake-amount-input"
          />
          <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1">
            <Button
              type="button"
              size="sm"
              onClick={handleMax}
              disabled={isProcessing}
              className="h-7 px-2 text-xs uppercase"
              aria-label={t(($) => $.neuronDetailModal.increaseStake.maxButtonAriaLabel)}
            >
              {t(($) => $.common.max)}
            </Button>
            <span className="text-sm font-semibold text-muted-foreground">
              {t(($) => $.common.icp)}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(($) => $.neuronDetailModal.increaseStake.currentAndAvailable, {
            current: currentStake.toString(),
            available: availableBalance.toString(),
          })}
        </p>
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
        disabled={isProcessing}
        data-testid="increase-stake-confirm-btn"
      >
        {isProcessing ? (
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
