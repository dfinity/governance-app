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
  const { isLoading: isLoadingAccounts, totalBalanceIcp } = useAccounts();
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
        balance: isLoadingAccounts ? undefined : totalBalanceIcp,
        isAuthenticated: !!identity,
        economics,
        neurons,
        // LOCAL: mocked value since the PocketIC data is off (Mission 70 - Jan 2026 snapshot).
        // @TODO UPDATE MISSION 70 force new number until the API catches up, then remove this
        // eslint-disable-next-line no-constant-condition
        totalVotingPower: IS_TESTNET || 1 ? 88_150_266_299_091_680n : totalVotingPower,
        // LOCAL: mocked value since the PocketIC data is off (08/04/2026).
        // @TODO UPDATE MISSION 70 force new number until the API catches up, then remove this
        governanceMetrics:
          // eslint-disable-next-line no-constant-condition
          IS_TESTNET || 1
            ? ({ totalSupplyIcp: 550_775_607n } as unknown as GovernanceCachedMetrics)
            : governanceMetrics,
      });
      setData(data);
    });

    return () => cancelCallback(id);
  }, [
    totalBalanceIcp,
    isLoadingAccounts,
    identity,
    neurons,
    economics,
    totalVotingPower,
    governanceMetrics,
  ]);

  return <StakingRewardsContext.Provider value={data}>{children}</StakingRewardsContext.Provider>;
};
