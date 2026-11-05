import { nonNullish } from '@dfinity/utils';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@components/Card';
import { Skeleton } from '@components/Skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/Tooltip';
import { ICP_MAX_DISSOLVE_DELAY_SECONDS } from '@constants/neuron';
import { useGovernanceMaturityModulation } from '@hooks/governance';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { formatMaturityModulation, formatMaturityModulationRate } from '@utils/maturityModulation';
import { formatPercentage } from '@utils/numbers';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

export const MaxApyCard = () => {
  const { t } = useTranslation();
  const stakingRewards = useStakingRewards();
  const maturityModulation = useGovernanceMaturityModulation();

  const maxApy = isStakingRewardDataReady(stakingRewards)
    ? formatPercentage(
        stakingRewards.stakingFlowApyPreview[ICP_MAX_DISSOLVE_DELAY_SECONDS].autoStake.locked,
      )
    : undefined;
  const modulationPermyriad = maturityModulation.data?.response?.currentValuePermyriad;

  const isLoading = !isStakingRewardDataReady(stakingRewards) && !('error' in stakingRewards);
  const tooltip = t(($) => $.home.maxApyTooltip);

  return (
    <Card className="gap-3 py-4">
      <CardContent>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="mb-2 block w-fit cursor-default text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              {t(($) => $.home.maxApy)} <span className="sr-only">{tooltip}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-semibold text-foreground">{maxApy ?? '—'}</p>
        )}
        <div className="mt-1 min-h-5">
          {maturityModulation.isLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            nonNullish(modulationPermyriad) && (
              <MaturityModulationLine permyriad={modulationPermyriad} />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const MaturityModulationLine = ({ permyriad }: { permyriad: number }) => {
  const { t } = useTranslation();
  const tooltip = t(($) => $.home.maturityModulationTooltip, {
    rate: formatMaturityModulationRate(permyriad),
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="block w-fit cursor-default text-left text-sm font-normal text-muted-foreground"
          data-testid="max-apy-maturity-modulation"
        >
          {t(($) => $.home.maturityModulation, { value: formatMaturityModulation(permyriad) })}{' '}
          <span className="sr-only">{tooltip}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
};
