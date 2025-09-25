import { NeuronState } from '@dfinity/nns';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { WarningMessage } from '@components/extra/WarningMessage';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { E8S, E8Sn, ICP_TRANSACTION_FEE_E8S } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/canisters/governance/useGovernanceNeurons';
import useTitle from '@hooks/useTitle';
import { requireIdentity } from '@utils/routes';
import { Input } from '@untitledui/components/base/input/input';
import { useIcpLedgerAccountBalance } from '../../../common/hooks/canisters/icpLedger/useIcpLedgerAccountBalance';
import { Button } from '@untitledui/components';
import { bigIntMul } from '../../../common/utils/bigInts';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useNnsGovernance } from '../../../common/hooks/canisters/governance';
import { useIcpLedger } from '../../../common/hooks/canisters/icpLedger/useIcpLedger';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../common/utils/queryKeys';

const MIN_STAKE_AMOUNT = 1;

export const Route = createFileRoute('/nns/neurons/')({
  component: NeuronsPage,
  beforeLoad: requireIdentity,
});

function NeuronsPage() {
  const { isLoading, error, data } = useGovernanceNeurons();
  const { t } = useTranslation();
  useTitle(t(($) => $.common.neuronsList));

  const queryClient = useQueryClient();
  const { data: balanceValue } = useIcpLedgerAccountBalance();
  const maxStake = balanceValue?.response !== undefined ? Number(balanceValue.response) / E8S : 0;
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeError, setStakeError] = useState<string | null>(null);
  const { identity } = useInternetIdentity();
  const {
    ready: governanceReady,
    canister: governanceCanister,
    authenticated,
  } = useNnsGovernance();
  const {
    ready: ledgerReady,
    authenticated: ledgerAuthenticated,
    canister: ledgerCanister,
  } = useIcpLedger();

  const canStake =
    balanceValue?.response !== undefined &&
    maxStake > 0 &&
    !!identity &&
    !!governanceCanister &&
    authenticated &&
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
    onSuccess: (newNeuronId) => {
      setStakeAmount('');

      // Refresh neurons and account balance.
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

  const stake = () => {
    if (!canStake || stakeMutation.isPending) {
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

    if (!canStake || maxStake === null) {
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
    : canStake && maxStake !== null
      ? `Minimum ${MIN_STAKE_AMOUNT} ICP, maximum ${maxStake} ${t(($) => $.common.icp)}`
      : undefined;

  return (
    <div className="flex flex-col gap-2 text-xl">
      <h2 className="mb-2 flex gap-2">{t(($) => $.neuron.stake)}</h2>

      {/* Stake a neuron form */}
      {canStake && (
        <div
          data-testid="stake-neuron-form"
          className="mb-4 flex items-center gap-2 rounded-lg p-4 shadow-md"
          style={{ backgroundColor: 'var(--background-color-secondary)' }}
        >
          <Input
            isRequired
            type="number"
            label="How much ICP to stake"
            hint={stakeHint}
            isInvalid={Boolean(stakeError)}
            isDisabled={!canStake}
            placeholder="10.00"
            tooltip="This ICP amount will be staked from your balance"
            value={stakeAmount}
            onChange={handleStakeChange}
          />
          <Button
            onClick={stake}
            className="w-fit"
            isDisabled={!canStake}
            isLoading={stakeMutation.isPending}
            showTextWhileLoading
          >
            {t(($) => $.neuron.stake)}
          </Button>
        </div>
      )}

      <h2 className="mb-2 flex gap-2">{t(($) => $.common.neuronsList)}</h2>

      {isLoading && <SkeletonLoader count={3} />}
      {!isLoading && !data?.response.length && (
        <WarningMessage message={t(($) => $.common.noNeurons)} />
      )}
      {error && t(($) => $.common.errorLoadingNeurons, { error: error.message })}

      <div className="grid grid-cols-1 gap-4 text-lg sm:grid-cols-2 lg:grid-cols-3">
        {data?.response.map((neuron) => (
          <div
            style={{ backgroundColor: 'var(--background-color-secondary)' }}
            className="flex h-full flex-col justify-between rounded-lg border p-4"
            key={neuron.neuronId}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="overflow-hidden text-ellipsis">#{neuron.neuronId}</p>
              {data?.certified ? <CertifiedBadge /> : <SkeletonLoader width={90} />}
            </div>
            <div className="mt-2 gap-1 text-sm">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="pr-2 font-bold">{t(($) => $.neuron.creationDate)}:</td>
                    <td>
                      {neuron.fullNeuron?.createdTimestampSeconds
                        ? new Date(
                            Number(neuron.fullNeuron.createdTimestampSeconds) * 1000,
                          ).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-2 font-bold">{t(($) => $.neuron.status)}:</td>
                    <td>{NeuronState[neuron.state]}</td>
                  </tr>
                  <tr>
                    <td className="pr-2 font-bold">{t(($) => $.neuron.stake)}:</td>
                    <td>
                      {Number(neuron.fullNeuron?.cachedNeuronStake) / E8S} {t(($) => $.common.icp)}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-2 font-bold">{t(($) => $.neuron.votingPower)}:</td>
                    <td>{neuron.votingPower}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
