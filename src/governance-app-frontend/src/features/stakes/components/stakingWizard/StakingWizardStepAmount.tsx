import { nonNullish } from '@dfinity/utils';
import { AlertTriangle, Info } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AccountSelect } from '@features/accounts/components/AccountSelect';
import { type Account, isAccountReady } from '@features/accounts/types';

import { Alert, AlertDescription } from '@components/Alert';
import { AmountInput } from '@components/AmountInput';
import { Button } from '@components/button';
import { Label } from '@components/Label';
import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { E8Sn, ICP_MIN_STAKE_AMOUNT, ICP_TRANSACTION_FEE } from '@constants/extra';
import { ICP_MAX_DISSOLVE_DELAY_MONTHS } from '@constants/neuron';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { useTickerPrices } from '@hooks/tickers';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { bigIntDiv } from '@utils/bigInt';
import { formatNumber, formatPercentage, roundToE8sPrecision } from '@utils/numbers';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

interface Props {
  amount: string;
  onAmountChange: (amount: string) => void;
  selectedAccountId?: string;
  onSelectedAccountIdChange: (accountId: string) => void;
  onNext: () => void;
}

export function StakingWizardStepAmount({
  amount,
  onAmountChange,
  selectedAccountId,
  onSelectedAccountIdChange,
  onNext,
}: Props) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { tickerPrices: tickersQuery } = useTickerPrices();
  const icpPrice = tickersQuery.data?.get(CANISTER_ID_ICP_LEDGER!);

  const { features } = useAdvancedFeatures();
  const subaccountsEnabled = features.subaccounts;

  // Default balance from main account ledger (used when subaccounts FF is off)
  const { data: balanceValue } = useIcpLedgerAccountBalance();
  const defaultBalance = nonNullish(balanceValue?.response)
    ? bigIntDiv(balanceValue.response, E8Sn)
    : 0;

  // When subaccounts are enabled, AccountSelect reports the selected account
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();

  const accountBalance =
    nonNullish(selectedAccount) && isAccountReady(selectedAccount)
      ? bigIntDiv(selectedAccount.balanceE8s, E8Sn)
      : null;

  const balance =
    subaccountsEnabled && nonNullish(accountBalance) ? accountBalance : defaultBalance;
  const maxStake = Math.max(0, roundToE8sPrecision(balance - ICP_TRANSACTION_FEE));

  const stakingRewards = useStakingRewards();
  const maxApyFormatted = isStakingRewardDataReady(stakingRewards)
    ? formatPercentage(
        stakingRewards.stakingFlowApyPreview[ICP_MAX_DISSOLVE_DELAY_MONTHS].autoStake.locked,
      )
    : '...';

  const handleAccountChange = (accountId: string) => {
    onSelectedAccountIdChange(accountId);
    onAmountChange('');
    setError(null);
  };

  const handleAmountChange = (value: string) => {
    onAmountChange(value);
    setError(null);
  };

  const handleMaxSelect = (value: string) => {
    onAmountChange(value);
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

  const numericAmount = Number(amount);
  const approxUsd =
    icpPrice && numericAmount > 0
      ? t(($) => $.account.approxUsd, { value: formatNumber(numericAmount * icpPrice.usd) })
      : undefined;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {subaccountsEnabled && (
        <AccountSelect
          id="stake-from-account"
          label={t(($) => $.stakeWizardModal.steps.amount.fromAccount)}
          value={selectedAccountId}
          onChange={handleAccountChange}
          onAccountChange={setSelectedAccount}
          data-testid="staking-wizard-account-select"
        />
      )}

      <div className="space-y-1">
        <Label htmlFor="stake-amount">{t(($) => $.stakeWizardModal.steps.amount.label)}</Label>
        <AmountInput
          id="stake-amount"
          ref={inputRef}
          value={amount}
          onChange={handleAmountChange}
          maxAmount={maxStake}
          onMaxSelect={handleMaxSelect}
          error={!!error}
          approxUsdLabel={approxUsd}
          availableLabel={t(($) => $.stakeWizardModal.steps.amount.available, {
            amount: maxStake.toString(),
          })}
          data-testid="staking-wizard-amount-input"
        />
        {error && (
          <Alert variant="warning" data-testid="staking-wizard-amount-error">
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

      <Button
        type="submit"
        size="xl"
        className="w-full uppercase"
        data-testid="staking-wizard-next-btn"
      >
        {t(($) => $.common.next)}
      </Button>
    </form>
  );
}
