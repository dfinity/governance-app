import { Link } from '@tanstack/react-router';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@components/ResponsiveDialog';
import { Spinner } from '@components/spinner';
import { E8Sn } from '@constants/extra';
import { useIcpLedgerAccountBalance } from '@hooks/icpLedger';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { bigIntDiv } from '@utils/bigInt';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

export function StakingRatioModal() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const balanceQuery = useIcpLedgerAccountBalance();
  const availableBalance = balanceQuery.data?.response
    ? bigIntDiv(balanceQuery.data.response, E8Sn, 2).toFixed(2)
    : '';

  const stakingRewards = useStakingRewards();
  const maxApy = isStakingRewardDataReady(stakingRewards)
    ? (stakingRewards.stakingFlowApyPreview[96].autoStake.locked * 100).toFixed(2)
    : '';

  const isLoading = balanceQuery.isLoading || stakingRewards.loading;

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger
        className="cursor-pointer rounded-sm border border-orange-300 bg-orange-100 p-0.5 transition-all duration-300 hover:scale-110 focus:outline-none"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="text-orange-400">
            <Spinner className="size-5" />
          </span>
        ) : (
          <AlertCircle className="size-5 text-orange-400" />
        )}
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col">
        <ResponsiveDialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-orange-300 bg-orange-100 p-2">
              <AlertCircle className="size-6 text-orange-400" />
            </div>
            <ResponsiveDialogTitle>{t(($) => $.stakingRatioModal.title)}</ResponsiveDialogTitle>
          </div>
        </ResponsiveDialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pb-4 text-sm text-muted-foreground md:pb-0">
          <p>
            <Trans
              values={{ available: availableBalance }}
              i18nKey={($) => $.stakingRatioModal.introduction}
              components={{ strong: <strong className="text-muted-foreground" /> }}
            />
          </p>

          <div className="pt-2">
            <h4 className="mb-2 font-semibold text-foreground">
              {t(($) => $.stakingRatioModal.whyStake.title)}
            </h4>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong>{t(($) => $.stakingRatioModal.whyStake.rewardsLabel)}:</strong>{' '}
                {t(($) => $.stakingRatioModal.whyStake.rewards, { maxApy })}
              </li>
              <li>
                <strong>{t(($) => $.stakingRatioModal.whyStake.votingPowerLabel)}:</strong>{' '}
                {t(($) => $.stakingRatioModal.whyStake.votingPower)}
              </li>
              <li>
                <strong>{t(($) => $.stakingRatioModal.whyStake.flexibilityLabel)}:</strong>{' '}
                {t(($) => $.stakingRatioModal.whyStake.flexibility)}
              </li>
            </ul>
          </div>

          <p className="rounded-md border border-green-200 bg-green-50 p-2 pt-2 text-green-800">
            <strong>{t(($) => $.stakingRatioModal.recommendationLabel)}:</strong>{' '}
            {t(($) => $.stakingRatioModal.recommendation, {
              available: availableBalance,
            })}
          </p>

          <Button className="w-full" asChild>
            <Link to="/stakes">{t(($) => $.stakingRatioModal.button)}</Link>
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
