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
import { formatPercentage } from '@utils/numbers';
import { isStakingRewardDataError, isStakingRewardDataReady } from '@utils/staking-rewards';

type AccountState = 'no-assets' | 'liquid-only' | 'staked';

const useAccountState = (): { state: AccountState; isLoading: boolean } => {
  const neuronsQuery = useGovernanceNeurons();
  const balanceQuery = useIcpLedgerAccountBalance();

  const isLoading = neuronsQuery.isLoading || balanceQuery.isLoading;

  if (isLoading) return { state: 'no-assets', isLoading: true };

  const liquidBalance = nonNullish(balanceQuery.data?.response)
    ? bigIntDiv(balanceQuery.data.response, E8Sn)
    : 0;

  const { totalStakedAfterFees } = getNeuronsAggregatedData(neuronsQuery.data?.response);

  if (totalStakedAfterFees > 0) return { state: 'staked', isLoading: false };

  if (liquidBalance > 0) return { state: 'liquid-only', isLoading: false };

  return { state: 'no-assets', isLoading: false };
};

export function SmartTitle() {
  const { t } = useTranslation();
  const { state, isLoading } = useAccountState();
  const stakingRewards = useStakingRewards();

  const title =
    state === 'no-assets'
      ? t(($) => $.home.smartTitle.noAssetsTitle)
      : state === 'liquid-only'
        ? t(($) => $.home.smartTitle.liquidOnlyTitle)
        : t(($) => $.home.smartTitle.stakedTitle);

  const subtitle =
    state === 'no-assets'
      ? isStakingRewardDataReady(stakingRewards)
        ? t(($) => $.home.smartTitle.noAssetsSubtitle, {
            value: formatPercentage(
              stakingRewards.stakingFlowApyPreview[ICP_MAX_DISSOLVE_DELAY_MONTHS].autoStake.locked,
            ),
          })
        : isStakingRewardDataError(stakingRewards)
          ? t(($) => $.home.smartTitle.noAssetsSubtitleStatic)
          : null
      : state === 'liquid-only'
        ? t(($) => $.home.smartTitle.liquidOnlySubtitle)
        : t(($) => $.home.smartTitle.stakedSubtitle);

  const cta =
    state === 'no-assets' ? (
      <Button disabled>{t(($) => $.home.smartTitle.noAssetsCta)}</Button>
    ) : state === 'liquid-only' ? (
      <Button asChild>
        <Link to="/stakes" search={{ openWizard: true }}>
          <TrendingUp />
          {t(($) => $.home.smartTitle.liquidOnlyCta)}
        </Link>
      </Button>
    ) : null;

  if (isLoading)
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-64" />
      </div>
    );
  console.log(subtitle);

  return (
    <div className="flex flex-col">
      <h2 className="text-3xl font-medium text-foreground">{title}</h2>
      {nonNullish(subtitle) ? (
        <p className="text-3xl text-muted-foreground">{subtitle}</p>
      ) : (
        <Skeleton className="h-8 w-64" />
      )}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
