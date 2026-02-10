import { nonNullish } from '@dfinity/utils';
import { Link } from '@tanstack/react-router';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Skeleton } from '@components/Skeleton';
import { E8Sn } from '@constants/extra';
import { ICP_MAX_DISSOLVE_DELAY_MONTHS } from '@constants/neuron';
import { useGovernanceNeurons } from '@hooks/governance';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { bigIntDiv } from '@utils/bigInt';
import { getNeuronsAggregatedData } from '@utils/neuron';
import { warningNotification } from '@utils/notification';
import { formatPercentage } from '@utils/numbers';
import { isStakingRewardDataError, isStakingRewardDataReady } from '@utils/staking-rewards';

type AccountState = 'no-assets' | 'liquid-only' | 'staked';

const useAccountState = (): { state: AccountState; isLoading: boolean } => {
  const neuronsQuery = useGovernanceNeurons();
  const balanceQuery = useIcpLedgerAccountBalance();

  const isLoading = neuronsQuery.isLoading || balanceQuery.isLoading;

  if (isLoading) {
    return { state: 'no-assets', isLoading: true };
  }

  const liquidBalance = nonNullish(balanceQuery.data?.response)
    ? bigIntDiv(balanceQuery.data.response, E8Sn)
    : 0;

  const { totalStakedAfterFees } = getNeuronsAggregatedData(neuronsQuery.data?.response);

  if (totalStakedAfterFees > 0) {
    return { state: 'staked', isLoading: false };
  }

  if (liquidBalance > 0) {
    return { state: 'liquid-only', isLoading: false };
  }

  return { state: 'no-assets', isLoading: false };
};

export function SmartTitle() {
  const { t } = useTranslation();
  const { state, isLoading } = useAccountState();
  const stakingRewards = useStakingRewards();
  const balanceQuery = useIcpLedgerAccountBalance();

  const handleStartStakingClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const balanceICP = bigIntDiv(balanceQuery.data?.response || 0n, E8Sn);

    if (balanceICP <= 0) {
      e.preventDefault();
      warningNotification({
        description: t(($) => $.neuron.stakeNeuron.errors.zeroBalance),
      });
    }
  };

  const title = {
    'no-assets': t(($) => $.home.smartTitle.noAssetsTitle),
    'liquid-only': t(($) => $.home.smartTitle.liquidOnlyTitle),
    staked: t(($) => $.home.smartTitle.stakedTitle),
  }[state];

  const subtitle = (() => {
    if (state === 'no-assets') {
      if (isStakingRewardDataReady(stakingRewards))
        return t(($) => $.home.smartTitle.noAssetsSubtitle, {
          value: formatPercentage(
            stakingRewards.stakingFlowApyPreview[ICP_MAX_DISSOLVE_DELAY_MONTHS].autoStake.locked,
          ),
        });

      if (isStakingRewardDataError(stakingRewards))
        return t(($) => $.home.smartTitle.noAssetsSubtitleStatic);

      return null; // still loading
    }
    if (state === 'liquid-only') return t(($) => $.home.smartTitle.liquidOnlySubtitle);
    return t(($) => $.home.smartTitle.stakedSubtitle);
  })();

  const cta =
    state === 'no-assets' ? (
      // @TODO: Apply same approach to the stake with the redirection and the query param.
      <Button disabled>{t(($) => $.home.smartTitle.noAssetsCta)}</Button>
    ) : state === 'liquid-only' ? (
      <Button asChild onClick={handleStartStakingClick}>
        <Link to="/stakes" search={{ openWizard: true }}>
          <TrendingUp />
          {t(($) => $.home.smartTitle.liquidOnlyCta)}
        </Link>
      </Button>
    ) : null;

  if (isLoading)
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
    );

  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
      {subtitle ? (
        <p className="text-2xl text-muted-foreground">{subtitle}</p>
      ) : (
        <Skeleton className="h-5 w-60" />
      )}
      {cta && <div className="mt-2">{cta}</div>}
    </div>
  );
}
