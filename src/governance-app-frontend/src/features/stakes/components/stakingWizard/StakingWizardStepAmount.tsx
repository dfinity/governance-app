import { nonNullish } from '@dfinity/utils';
import { AlertTriangle, Info } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';
import { Input } from '@components/Input';
import { Label } from '@components/Label';
import { E8Sn, ICP_MIN_STAKE_AMOUNT } from '@constants/extra';
import { ICP_MAX_DISSOLVE_DELAY_MONTHS } from '@constants/neuron';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { bigIntDiv } from '@utils/bigInt';
import { formatPercentage } from '@utils/numbers';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

interface Props {
  amount: string;
  onAmountChange: (amount: string) => void;
  onNext: () => void;
}

export function StakingWizardStepAmount({ amount, onAmountChange, onNext }: Props) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: balanceValue } = useIcpLedgerAccountBalance();
  const maxStake = nonNullish(balanceValue?.response) ? bigIntDiv(balanceValue.response, E8Sn) : 0;

  const stakingRewards = useStakingRewards();
  const maxApyFormatted = isStakingRewardDataReady(stakingRewards)
    ? formatPercentage(
        stakingRewards.stakingFlowApyPreview[ICP_MAX_DISSOLVE_DELAY_MONTHS].autoStake.locked,
      )
    : '...';

  const handleAmountChange = (value: string) => {
    onAmountChange(value);
    setError(null);
  };

  const handleMax = () => {
    onAmountChange(maxStake.toString());
    // Give focus back to input after clicking the Max button
    inputRef?.current?.focus();
    setError(null);
  };

  const handleNext = () => {
    const numericAmount = Number(amount);

    if (amount === '' || numericAmount < ICP_MIN_STAKE_AMOUNT) {
      setError(t(($) => $.stakeWizardModal.errors.amountTooLow, { min: ICP_MIN_STAKE_AMOUNT }));
      return;
    }

    if (numericAmount > maxStake) {
      setError(t(($) => $.stakeWizardModal.errors.insufficientBalance));
      return;
    }

    onNext();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleNext();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-1">
        <Label htmlFor="stake-amount">{t(($) => $.stakeWizardModal.steps.amount.label)}</Label>
        <div className="relative">
          <Input
            className={`h-14 [appearance:textfield] border-2 pr-24 !text-lg font-semibold focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            id="stake-amount"
            ref={inputRef}
            max={maxStake}
            value={amount}
            type="number"
            min="0"
          />
          <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1">
            <Button
              type="button"
              size="sm"
              onClick={handleMax}
              className="h-7 px-2 text-xs uppercase"
              aria-label={t(($) => $.stakeWizardModal.steps.amount.maxButtonAriaLabel)}
            >
              {t(($) => $.common.max)}
            </Button>
            <span className="text-sm font-semibold text-muted-foreground">
              {t(($) => $.common.icp)}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(($) => $.stakeWizardModal.steps.amount.available, { amount: maxStake.toString() })}
        </p>
        {error && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          {t(($) => $.stakeWizardModal.infoBoxes.whatIsStaking, { maxApy: maxApyFormatted })}
        </AlertDescription>
      </Alert>

      <Button type="submit" size="xl" className="w-full uppercase">
        {t(($) => $.common.next)}
      </Button>
    </form>
  );
}
