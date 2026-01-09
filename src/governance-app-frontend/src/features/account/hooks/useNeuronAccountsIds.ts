import { nonNullish } from '@dfinity/utils';
import { useMemo } from 'react';

import { useGovernanceNeurons } from '@hooks/governance/useGovernanceNeurons';

export const useNeuronAccountsIds = () => {
  const { data, isLoading, error } = useGovernanceNeurons();

  const accountIds = useMemo(() => {
    if (!data?.response) return new Set<string>();

    return new Set(
      data.response.map((neuron) => neuron.fullNeuron?.accountIdentifier).filter(nonNullish),
    );
  }, [data?.response]);

  return {
    accountIds,
    isLoading,
    error,
  };
};
