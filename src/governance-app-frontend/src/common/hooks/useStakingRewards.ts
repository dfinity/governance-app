import { nonNullish } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useMemo } from 'react';

import { E8Sn } from '@constants/extra';
import {
  useGovernanceEconomics,
  useGovernanceMetrics,
  useGovernanceNeurons,
  useGovernanceProposal,
} from '@hooks/governance';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { bigIntDiv } from '@utils/bigInt';
import { getStakingRewardData } from '@utils/staking-rewards';

export const useStakingRewards = () => {
  const { identity } = useInternetIdentity();

  const governanceMetrics = useGovernanceMetrics().data?.response;
  const balance = useIcpLedgerAccountBalance().data?.response;
  const economics = useGovernanceEconomics().data?.response;
  const neurons = useGovernanceNeurons().data?.response;
  const totalVotingPower = useGovernanceProposal({ proposalId: undefined }).data?.response
    ?.totalPotentialVotingPower;
  // LOCAL: Mocked value since the PocketIC data is off
  // const totalVotingPower =  50_276_005_084_190_970n; // 24 Jun 2025

  const data = useMemo(
    () =>
      getStakingRewardData({
        balance: nonNullish(balance) ? bigIntDiv(balance, E8Sn, 2) : undefined,
        isAuthenticated: !!identity,
        governanceMetrics,
        totalVotingPower,
        // LOCAL: Mocked value since the PocketIC data is off
        // governanceMetrics: { totalSupplyIcp: 534_809_202n }, // 24 Jun 2025
        economics,
        neurons,
      }),
    [balance, identity, neurons, economics, totalVotingPower, governanceMetrics],
  );

  return data;
};
