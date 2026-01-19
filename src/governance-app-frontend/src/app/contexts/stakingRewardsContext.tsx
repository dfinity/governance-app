import { createContext } from 'react';

import { StakingRewardResult } from '@utils/staking-rewards';

export const StakingRewardsContext = createContext<StakingRewardResult>({ loading: true });
