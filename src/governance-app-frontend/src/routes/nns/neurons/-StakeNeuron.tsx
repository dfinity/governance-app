import { nonNullish, nowInBigIntNanoSeconds } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/common/ui/button';
import { Input } from '@/common/ui/input';
import { Label } from '@/common/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/common/ui/tooltip';
import { InfoIcon, Loader2 } from 'lucide-react';


import { SimpleCard } from '@/common/ui/extra/SimpleCard';
import {
  E8S,
  E8Sn,
  ICP_MIN_STAKE_AMOUNT,
  ICP_TRANSACTION_FEE_E8S,
  ICP_TRANSACTION_FEE_E8Sn,
} from '@constants/extra';
import { useNnsGovernance } from '@hooks/canisters/governance';
import { useIcpLedger } from '@hooks/canisters/icpLedger/useIcpLedger';
import { useIcpLedgerAccountBalance } from '@hooks/canisters/icpLedger/useIcpLedgerAccountBalance';
import { bigIntDiv, bigIntMul } from '@utils/bigInt';
import { mapGovernanceCanisterError } from '@utils/nns-governance';
import { errorNotification, successNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';

export const StakeNeuron = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: balanceValue } = useIcpLedgerAccountBalance();
  const maxStake = nonNullish(balanceValue?.response) ? bigIntDiv(balanceValue.response, E8Sn) : 0;
  const [stakeInput, setStakeInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
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
    ledgerReady &&
    maxStake >= ICP_MIN_STAKE_AMOUNT;

  const stakeMutation = useMutation<bigint, Error, number>({
    mutationFn: async (amount) => {
      const stake = bigIntMul(E8Sn, amount);
      const principal = identity!.getPrincipal();

      return governanceCanister!.stakeNeuron({
        stake,
        principal,
        ledgerCanister: ledgerCanister!,
        createdAt: nowInBigIntNanoSeconds(),
        fee: ICP_TRANSACTION_FEE_E8Sn,
      });
    },
    onMutate: () => {
      setPending(true);
    },
    onSuccess: (_, amount) => {
      setStakeInput('');
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
        }),
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE],
        }),
      ]).finally(() => setPending(false));
      successNotification({ description: t(($) => $.neuron.stakeNeuron.success, { amount }) });
    },
    onError: (mutationError) => {
      setPending(false);
      errorNotification({
        description: mapGovernanceCanisterError(mutationError),
      });
    },
  });

  const stake = () => {
    const enteredAmount = Number(stakeInput);

    if (enteredAmount < ICP_MIN_STAKE_AMOUNT) {
      setFormError(
        t(($) => $.neuron.stakeNeuron.errors.minimumStake, { amount: ICP_MIN_STAKE_AMOUNT }),
      );
      return;
    }

    if (enteredAmount > maxStake) {
      setFormError(t(($) => $.neuron.stakeNeuron.errors.insufficientBalance));
      return;
    }

    stakeMutation.mutate(enteredAmount);
  };

  const handleStakeChange = (value: string) => {
    setStakeInput(value);

    if (stakeMutation.isError) stakeMutation.reset();

    if (formError) {
      const nextAmount = Number(value);
      if (
        !Number.isNaN(nextAmount) &&
        nextAmount >= ICP_MIN_STAKE_AMOUNT &&
        nextAmount <= maxStake
      ) {
        setFormError(null);
      }
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    stake();
  };

  const stakeHint = formError
    ? formError
    : t(($) => $.neuron.stakeNeuron.hint, {
      min: ICP_MIN_STAKE_AMOUNT,
      max: maxStake,
    });
  const stakePlaceholder = Math.max(maxStake - Number(ICP_TRANSACTION_FEE_E8S) / E8S, 0).toFixed(2);

  if (!canStake) {
    return null;
  }

  return (
    <>
      <h2 className="mb-2 text-primary">{t(($) => $.neuron.stake)}</h2>
      <SimpleCard className="mb-4 flex">
        <form onSubmit={handleSubmit} className="flex items-start gap-2 w-full">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Label htmlFor="stake-input">{t(($) => $.neuron.stakeNeuron.label)}</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t(($) => $.neuron.stakeNeuron.tooltip)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="stake-input"
              type="number"
              className={formError ? "border-destructive" : ""}
              disabled={pending}
              placeholder={stakePlaceholder}
              value={stakeInput}
              onChange={(e) => handleStakeChange(e.target.value)}
            />
            <p className={`text-sm ${formError ? "text-destructive" : "text-muted-foreground"}`}>
              {stakeHint}
            </p>
          </div>
          <Button disabled={pending} type="submit" className="self-start mt-7">
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t(($) => $.neuron.stake)}
          </Button>
        </form>
      </SimpleCard>
    </>
  );
};
