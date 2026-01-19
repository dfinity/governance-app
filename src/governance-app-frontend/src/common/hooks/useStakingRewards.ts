import { useContext } from 'react';

import { StakingRewardsContext } from '@/app/contexts/stakingRewardsContext';

export const useStakingRewards = () => useContext(StakingRewardsContext);
