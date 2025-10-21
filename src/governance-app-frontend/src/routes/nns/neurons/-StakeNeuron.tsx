import { nonNullish, nowInBigIntNanoSeconds } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, NumberInput } from '@untitledui/components';

import { SimpleCard } from '@components/extra/SimpleCard';
import { E8Sn, ICP_MIN_STAKE_AMOUNT, ICP_TRANSACTION_FEE_E8Sn } from '@constants/extra';
import { useNnsGovernance } from '@hooks/canisters/governance';
import { useIcpLedger } from '@hooks/canisters/icpLedger/useIcpLedger';
import { useIcpLedgerAccountBalance } from '@hooks/canisters/icpLedger/useIcpLedgerAccountBalance';
import { bigIntDiv, bigIntMul } from '@utils/bigInt';
import { mapGovernanceCanisterError } from '@utils/nns-governance';
import { errorNotification, successNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';

export const StakeNeuron = () => {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [stakeInput, setStakeInput] = useState<number>();
  const [pending, setPending] = useState(false);
  const { data: balanceValue } = useIcpLedgerAccountBalance();
  const maxStake = nonNullish(balanceValue?.response) ? bigIntDiv(balanceValue.response, E8Sn) : 0;

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
    nonNullish(balanceValue?.response) &&
    nonNullish(identity) &&
    nonNullish(governanceCanister) &&
    governanceAuthenticated &&
    governanceReady &&
    nonNullish(ledgerCanister) &&
    ledgerAuthenticated &&
    ledgerReady &&
    maxStake >= ICP_MIN_STAKE_AMOUNT;

  const stakeMutation = useMutation<bigint, Error, number>({
    mutationFn: async (amount) =>
      governanceCanister!.stakeNeuron({
        stake: bigIntMul(E8Sn, amount),
        principal: identity!.getPrincipal(),
        ledgerCanister: ledgerCanister!,
        createdAt: nowInBigIntNanoSeconds(),
        fee: ICP_TRANSACTION_FEE_E8Sn,
      }),
    onMutate: () => setPending(true),
    onSuccess: (_, amount) => {
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
        }),
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE],
        }),
      ]).finally(() => {
        setPending(false);
        setStakeInput(undefined);
        successNotification({ description: t(($) => $.neuron.stakeNeuron.success, { amount }) });
      });
    },
    onError: (mutationError) => {
      setPending(false);
      errorNotification({
        description: mapGovernanceCanisterError(mutationError),
      });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    stakeMutation.mutate(stakeInput!);
  };

  const stakeHint = t(($) => $.neuron.stakeNeuron.hint, {
    min: ICP_MIN_STAKE_AMOUNT,
    max: maxStake,
  });

  if (!canStake) {
    return null;
  }

  return (
    <>
      <h2 className="mb-2 text-primary">{t(($) => $.neuron.stake)}</h2>
      <SimpleCard className="mb-4 flex">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <NumberInput
            tooltip={t(($) => $.neuron.stakeNeuron.tooltip)}
            label={t(($) => $.neuron.stakeNeuron.label)}
            min={ICP_MIN_STAKE_AMOUNT}
            onChange={setStakeInput}
            isDisabled={pending}
            value={stakeInput}
            hint={stakeHint}
            max={maxStake}
          />

          <Button isDisabled={pending || !stakeInput} isLoading={pending} type="submit">
            {t(($) => $.neuron.stake)}
          </Button>
        </form>
      </SimpleCard>
    </>
  );
};
