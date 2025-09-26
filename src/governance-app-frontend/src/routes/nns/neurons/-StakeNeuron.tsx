import { nonNullish } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@untitledui/components';
import { Input } from '@untitledui/components/base/input/input';

import { E8S, E8Sn, ICP_TRANSACTION_FEE_E8S } from '@constants/extra';
import { useNnsGovernance } from '@hooks/canisters/governance';
import { useIcpLedger } from '@hooks/canisters/icpLedger/useIcpLedger';
import { useIcpLedgerAccountBalance } from '@hooks/canisters/icpLedger/useIcpLedgerAccountBalance';
import { bigIntDiv, bigIntMul } from '@utils/bigInts';
import { QUERY_KEYS } from '@utils/queryKeys';

const MIN_STAKE_AMOUNT = 1;

export const StakeNeuron = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: balanceValue } = useIcpLedgerAccountBalance();
  const maxStake = nonNullish(balanceValue?.response) ? bigIntDiv(balanceValue.response, E8Sn) : 0;
  const [stakeInput, setStakeInput] = useState('');
  const [stakeError, setStakeError] = useState<string | null>(null);
  const { identity } = useInternetIdentity();
  const {
    ready: governanceReady,
    canister: governanceCanister,
    authenticated: governanceAuthenticated,
  } = useNnsGovernance();
  const [pending, setPending] = useState(false);
  const {
    ready: ledgerReady,
    authenticated: ledgerAuthenticated,
    canister: ledgerCanister,
  } = useIcpLedger();

  const canStake =
    nonNullish(balanceValue?.response) &&
    nonNullish(identity) &&
    nonNullish(governanceCanister) &&
    governanceAuthenticated &&
    governanceReady &&
    nonNullish(ledgerCanister) &&
    ledgerAuthenticated &&
    ledgerReady;

  const stakeMutation = useMutation<bigint, Error, number>({
    mutationFn: async (amount) => {
      const stake = bigIntMul(E8Sn, amount);
      const principal = identity!.getPrincipal();

      return governanceCanister!.stakeNeuron({
        stake,
        principal,
        ledgerCanister: ledgerCanister!,
        createdAt: BigInt(Date.now()) * 1_000_000n,
        fee: ICP_TRANSACTION_FEE_E8S,
      });
    },
    onMutate: () => {
      setPending(true);
      setStakeError(null);
    },
    onSuccess: () => {
      setStakeInput('');
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
        }),
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE],
        }),
      ]).finally(() => setPending(false));
    },
    onError: (mutationError) => {
      setStakeError(mutationError.message ?? t(($) => $.common.error));
      setPending(false);
    },
  });

  const stake = () => {
    const enteredAmount = Number(stakeInput);

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
    setStakeInput(value);

    if (stakeMutation.isError) stakeMutation.reset();

    if (stakeError) {
      const nextAmount = Number(value);
      if (!Number.isNaN(nextAmount) && nextAmount >= MIN_STAKE_AMOUNT && nextAmount <= maxStake) {
        setStakeError(null);
      }
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    stake();
  };

  const stakeHint = stakeError
    ? stakeError
    : t(($) => $.neuron.stakeNeuron.hint, {
        min: MIN_STAKE_AMOUNT,
        max: maxStake,
        unit: t(($) => $.common.icp),
      });
  const stakePlaceholder = Math.max(maxStake - Number(ICP_TRANSACTION_FEE_E8S) / E8S, 0);

  if (!canStake) {
    return null;
  }

  return (
    <>
      <h2 className="mb-2 text-primary">{t(($) => $.neuron.stake)}</h2>
      <form
        onSubmit={handleSubmit}
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
          isDisabled={pending}
          placeholder={`${stakePlaceholder}`}
          tooltip={t(($) => $.neuron.stakeNeuron.tooltip)}
          value={stakeInput}
          onChange={handleStakeChange}
        />
        <Button isDisabled={pending} isLoading={pending} showTextWhileLoading type="submit">
          {t(($) => $.neuron.stake)}
        </Button>
      </form>
    </>
  );
};
