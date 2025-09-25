import { useIsFetching, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@untitledui/components';
import { Input } from '@untitledui/components/base/input/input';

import { E8S, E8Sn, ICP_TRANSACTION_FEE_E8S } from '@constants/extra';
import { useNnsGovernance } from '@hooks/canisters/governance';
import { useIcpLedger } from '@hooks/canisters/icpLedger/useIcpLedger';
import { useIcpLedgerAccountBalance } from '@hooks/canisters/icpLedger/useIcpLedgerAccountBalance';
import { bigIntMul } from '@utils/bigInts';
import { QUERY_KEYS } from '@utils/queryKeys';

const MIN_STAKE_AMOUNT = 1;

export const StakeNeuron = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: balanceValue } = useIcpLedgerAccountBalance();
  const maxStake = balanceValue?.response !== undefined ? Number(balanceValue.response) / E8S : 0;
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeError, setStakeError] = useState<string | null>(null);
  const { identity } = useInternetIdentity();
  const {
    ready: governanceReady,
    canister: governanceCanister,
    authenticated: governanceAuthenticated,
  } = useNnsGovernance();
  const {
    ready: ledgerReady,
    authenticated: ledgerAuthenticated,
    canister: ledgerCanister,
  } = useIcpLedger();

  const canStake =
    balanceValue?.response !== undefined &&
    !!identity &&
    !!governanceCanister &&
    governanceAuthenticated &&
    governanceReady &&
    !!ledgerCanister &&
    ledgerAuthenticated &&
    ledgerReady;

  const stakeMutation = useMutation<bigint, Error, number>({
    mutationFn: async (amount) => {
      const stake = bigIntMul(E8Sn, amount);
      const principal = identity!.getPrincipal();
      const fee = ICP_TRANSACTION_FEE_E8S;

      return governanceCanister!.stakeNeuron({
        stake,
        principal,
        ledgerCanister: ledgerCanister!,
        createdAt: BigInt(Date.now()) * 1_000_000n,
        fee,
      });
    },
    onMutate: () => {
      setStakeError(null);
    },
    onSuccess: () => {
      setStakeAmount('');
      void queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
      });
      void queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE],
      });
    },
    onError: (mutationError) => {
      setStakeError(mutationError.message ?? t(($) => $.common.error));
    },
  });

  const neuronsFetching = useIsFetching({ queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS] });
  const balanceFetching = useIsFetching({ queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE] });
  const isStakeBusy = stakeMutation.isPending || neuronsFetching > 0 || balanceFetching > 0;

  const stake = () => {
    if (!canStake || isStakeBusy) {
      return;
    }

    const enteredAmount = Number(stakeAmount);

    if (Number.isNaN(enteredAmount)) {
      setStakeError(t(($) => $.neuron.stakeNeuron.errors.invalidAmount));
      return;
    }

    if (enteredAmount < MIN_STAKE_AMOUNT) {
      setStakeError(
        t(($) => $.neuron.stakeNeuron.errors.minimumStake, { amount: MIN_STAKE_AMOUNT }),
      );
      return;
    }

    if (enteredAmount > maxStake) {
      setStakeError(t(($) => $.neuron.stakeNeuron.errors.insufficientBalance));
      return;
    }

    stakeMutation.mutate(enteredAmount);
  };

  const handleStakeChange = (value: string) => {
    setStakeAmount(value);
    if (stakeMutation.isError) {
      stakeMutation.reset();
    }

    if (!canStake) {
      return;
    }

    if (stakeError) {
      const nextAmount = Number(value);
      if (!Number.isNaN(nextAmount) && nextAmount >= MIN_STAKE_AMOUNT && nextAmount <= maxStake) {
        setStakeError(null);
      }
    }
  };

  const stakeHint = stakeError
    ? stakeError
    : canStake
      ? t(($) => $.neuron.stakeNeuron.hint, {
          min: MIN_STAKE_AMOUNT,
          max: maxStake,
          unit: t(($) => $.common.icp),
        })
      : undefined;

  if (!canStake) {
    return null;
  }

  return (
    <div
      data-testid="stake-neuron-form"
      className="mb-4 flex items-center gap-2 rounded-lg p-4 shadow-md"
      style={{ backgroundColor: 'var(--background-color-secondary)' }}
    >
      <Input
        isRequired
        type="number"
        label={t(($) => $.neuron.stakeNeuron.label)}
        hint={stakeHint}
        isInvalid={Boolean(stakeError)}
        isDisabled={isStakeBusy}
        placeholder={t(($) => $.neuron.stakeNeuron.placeholder)}
        tooltip={t(($) => $.neuron.stakeNeuron.tooltip)}
        value={stakeAmount}
        onChange={handleStakeChange}
      />
      <Button
        onClick={stake}
        className="w-fit"
        isDisabled={isStakeBusy}
        isLoading={isStakeBusy}
        showTextWhileLoading
      >
        {t(($) => $.neuron.stake)}
      </Button>
    </div>
  );
};
