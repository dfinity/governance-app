import { GovernanceCachedMetrics } from '@icp-sdk/canisters/nns';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { ReactNode, useEffect, useState } from 'react';

import { useAccounts } from '@features/accounts/hooks/useAccounts';

import { IS_TESTNET } from '@constants/extra';
import {
  useGovernanceEconomics,
  useGovernanceMetrics,
  useGovernanceNeurons,
  useGovernanceProposal,
} from '@hooks/governance';
import { getStakingRewardData, StakingRewardResult } from '@utils/staking-rewards';

import { StakingRewardsContext } from './stakingRewardsContext';

export const StakingRewardsProvider = ({ children }: { children: ReactNode }) => {
  const { identity } = useInternetIdentity();

  const governanceMetrics = useGovernanceMetrics().data?.response;
  const { isLoadingBalances, totalBalanceIcp } = useAccounts();
  const economics = useGovernanceEconomics().data?.response;
  const neurons = useGovernanceNeurons().data?.response;
  const totalVotingPower = useGovernanceProposal().data?.response?.totalPotentialVotingPower;

  const [data, setData] = useState<StakingRewardResult>({ loading: true });

  useEffect(() => {
    // Safari doesn't support requestIdleCallback, fallback to setTimeout
    const scheduleCallback = window.requestIdleCallback ?? setTimeout;
    const cancelCallback = window.cancelIdleCallback ?? clearTimeout;

    const id = scheduleCallback(() => {
      const data = getStakingRewardData({
        balance: isLoadingBalances ? undefined : totalBalanceIcp,
        isAuthenticated: !!identity,
        economics,
        neurons,
        // LOCAL: mocked value since the PocketIC data is off.
        totalVotingPower: IS_TESTNET ? 50_276_005_084_190_970n : totalVotingPower,
        // LOCAL: mocked value since the PocketIC data is off.
        governanceMetrics: IS_TESTNET
          ? ({ totalSupplyIcp: 534_809_202n } as unknown as GovernanceCachedMetrics)
          : governanceMetrics,
      });
      setData(data);
    });

    return () => cancelCallback(id);
  }, [
    totalBalanceIcp,
    isLoadingBalances,
    identity,
    neurons,
    economics,
    totalVotingPower,
    governanceMetrics,
  ]);

  return <StakingRewardsContext.Provider value={data}>{children}</StakingRewardsContext.Provider>;
};
