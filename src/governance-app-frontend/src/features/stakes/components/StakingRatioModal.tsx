import { Link } from '@tanstack/react-router';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Button } from '@components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@components/ResponsiveDialog';
import { Spinner } from '@components/Spinner';
import { E8Sn } from '@constants/extra';
import { ICP_MAX_DISSOLVE_DELAY_MONTHS } from '@constants/neuron';
import { useGovernanceNeurons } from '@hooks/governance';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { bigIntDiv } from '@utils/bigInt';
import { getNeuronsAggregatedData } from '@utils/neuron';
import { formatNumber, formatPercentage } from '@utils/numbers';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

export function StakingRatioModal() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const neuronsQuery = useGovernanceNeurons();
  const { totalUnstakedMaturity } = getNeuronsAggregatedData(neuronsQuery.data?.response);

  const balanceQuery = useIcpLedgerAccountBalance();
  const balanceIcp = balanceQuery.data?.response ? bigIntDiv(balanceQuery.data.response, E8Sn) : 0;
  const availableBalance = formatNumber(balanceIcp);

  // User has only unstaked maturity if they have no ICP balance but have unstaked maturity
  const hasOnlyUnstakedMaturity = balanceIcp === 0 && totalUnstakedMaturity > 0;

  const stakingRewards = useStakingRewards();
  const maxApy = isStakingRewardDataReady(stakingRewards)
    ? formatPercentage(
        stakingRewards.stakingFlowApyPreview[ICP_MAX_DISSOLVE_DELAY_MONTHS].autoStake.locked,
      )
    : '';

  const isLoading = balanceQuery.isLoading || neuronsQuery.isLoading || stakingRewards.loading;

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger
        className="cursor-pointer rounded-sm transition-all duration-300 hover:scale-110 focus-visible:ring-2 focus-visible:ring-muted-foreground focus-visible:ring-offset-1 focus-visible:outline-none"
        disabled={isLoading}
        aria-label={t(($) => $.stakingRatioModal.ariaLabel)}
      >
        {isLoading ? (
          <span className="text-muted-foreground">
            <Spinner className="size-6" />
          </span>
        ) : (
          <AlertCircle className="size-6 text-muted-foreground" />
        )}
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col">
        <ResponsiveDialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-orange-300 bg-orange-100 p-2 dark:border-orange-700 dark:bg-orange-900/30">
              <AlertCircle className="size-6 text-orange-500 dark:text-orange-400" />
            </div>
            <ResponsiveDialogTitle>{t(($) => $.stakingRatioModal.title)}</ResponsiveDialogTitle>
          </div>
        </ResponsiveDialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pb-4 text-sm text-muted-foreground md:pb-0">
          <p>
            <Trans
              values={{
                available: hasOnlyUnstakedMaturity
                  ? formatNumber(totalUnstakedMaturity)
                  : availableBalance,
              }}
              i18nKey={($) =>
                hasOnlyUnstakedMaturity
                  ? $.stakingRatioModal.introductionMaturityOnly
                  : $.stakingRatioModal.introduction
              }
              components={{ strong: <strong className="text-muted-foreground" /> }}
            />
          </p>

          <div className="pt-2">
            <h4 className="mb-2 font-semibold text-foreground">
              {t(($) =>
                hasOnlyUnstakedMaturity
                  ? $.stakingRatioModal.whyStakeMaturity.title
                  : $.stakingRatioModal.whyStake.title,
              )}
            </h4>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong>
                  {t(($) =>
                    hasOnlyUnstakedMaturity
                      ? $.stakingRatioModal.whyStakeMaturity.rewardsLabel
                      : $.stakingRatioModal.whyStake.rewardsLabel,
                  )}
                  :
                </strong>{' '}
                {t(
                  ($) =>
                    hasOnlyUnstakedMaturity
                      ? $.stakingRatioModal.whyStakeMaturity.rewards
                      : $.stakingRatioModal.whyStake.rewards,
                  { maxApy },
                )}
              </li>
              <li>
                <strong>
                  {t(($) =>
                    hasOnlyUnstakedMaturity
                      ? $.stakingRatioModal.whyStakeMaturity.votingPowerLabel
                      : $.stakingRatioModal.whyStake.votingPowerLabel,
                  )}
                  :
                </strong>{' '}
                {t(($) =>
                  hasOnlyUnstakedMaturity
                    ? $.stakingRatioModal.whyStakeMaturity.votingPower
                    : $.stakingRatioModal.whyStake.votingPower,
                )}
              </li>
              <li>
                <strong>
                  {t(($) =>
                    hasOnlyUnstakedMaturity
                      ? $.stakingRatioModal.whyStakeMaturity.compoundingLabel
                      : $.stakingRatioModal.whyStake.flexibilityLabel,
                  )}
                  :
                </strong>{' '}
                {t(($) =>
                  hasOnlyUnstakedMaturity
                    ? $.stakingRatioModal.whyStakeMaturity.compounding
                    : $.stakingRatioModal.whyStake.flexibility,
                )}
              </li>
            </ul>
          </div>

          <Alert variant="success">
            <AlertTitle>{t(($) => $.stakingRatioModal.recommendationLabel)}</AlertTitle>
            <AlertDescription>
              {t(
                ($) =>
                  hasOnlyUnstakedMaturity
                    ? $.stakingRatioModal.recommendationMaturityOnly
                    : $.stakingRatioModal.recommendation,
                {
                  available: hasOnlyUnstakedMaturity
                    ? formatNumber(totalUnstakedMaturity)
                    : availableBalance,
                },
              )}
            </AlertDescription>
          </Alert>

          <Button className="w-full" asChild>
            <Link to="/stakes" search={hasOnlyUnstakedMaturity ? undefined : { openWizard: true }}>
              {t(($) =>
                hasOnlyUnstakedMaturity
                  ? $.stakingRatioModal.buttonMaturityOnly
                  : $.stakingRatioModal.button,
              )}
            </Link>
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
