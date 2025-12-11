import { createContext } from 'react';

import { StakingRewardResult } from '@utils/staking-rewards';

export interface StakingRewardsContext {
  data: StakingRewardResult;
  calculate: () => void;
}

export const StakingRewardsContext = createContext<StakingRewardsContext | undefined>(undefined);
