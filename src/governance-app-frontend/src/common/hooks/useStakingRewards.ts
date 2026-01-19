import { GovernanceCachedMetrics } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { useEffect, useState } from 'react';

import { E8Sn, IS_TESTNET } from '@constants/extra';
import {
  useGovernanceEconomics,
  useGovernanceMetrics,
  useGovernanceNeurons,
  useGovernanceProposal,
} from '@hooks/governance';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { bigIntDiv } from '@utils/bigInt';
import { getStakingRewardData, StakingRewardResult } from '@utils/staking-rewards';

export const useStakingRewards = () => {
  const { identity } = useInternetIdentity();

  const governanceMetrics = useGovernanceMetrics().data?.response;
  const balance = useIcpLedgerAccountBalance().data?.response;
  const economics = useGovernanceEconomics().data?.response;
  const neurons = useGovernanceNeurons().data?.response;
  const totalVotingPower = useGovernanceProposal({ proposalId: undefined }).data?.response
    ?.totalPotentialVotingPower;

  const [data, setData] = useState<StakingRewardResult>({ loading: true });

  useEffect(() => {
    // Safari doesn't support requestIdleCallback, fallback to setTimeout
    const scheduleCallback = window.requestIdleCallback ?? setTimeout;
    const cancelCallback = window.cancelIdleCallback ?? clearTimeout;

    const id = scheduleCallback(() => {
      const data = getStakingRewardData({
        balance: nonNullish(balance) ? bigIntDiv(balance, E8Sn) : undefined,
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
  }, [balance, identity, neurons, economics, totalVotingPower, governanceMetrics]);

  return data;
};
