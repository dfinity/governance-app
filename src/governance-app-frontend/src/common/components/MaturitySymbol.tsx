import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@components/ResponsiveDialog';
import { ICP_MAX_DISSOLVE_DELAY_MONTHS } from '@constants/neuron';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { formatPercentage } from '@utils/numbers';
import { cn } from '@utils/shadcn';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

type Props = {
  className?: string;
};

export function MaturitySymbol({ className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const stakingRewards = useStakingRewards();
  const maxApy = isStakingRewardDataReady(stakingRewards)
    ? formatPercentage(
        stakingRewards.stakingFlowApyPreview[ICP_MAX_DISSOLVE_DELAY_MONTHS].autoStake.locked,
      )
    : '...';

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger
        className={cn(
          'cursor-help rounded-sm transition-all duration-300 hover:scale-110 focus:outline-none',
          className,
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Sparkles className="size-5 text-muted-foreground" />
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col">
        <ResponsiveDialogHeader className="shrink-0 px-0">
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-amber-400 bg-amber-100 p-2 dark:border-amber-600 dark:bg-amber-900/30">
              <Sparkles className="size-6 text-amber-500 dark:text-amber-400" />
            </div>
            <ResponsiveDialogTitle>{t(($) => $.maturityModal.title)}</ResponsiveDialogTitle>
          </div>
        </ResponsiveDialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pb-4 text-sm text-muted-foreground md:pb-0">
          <p>{t(($) => $.maturityModal.introduction)}</p>

          <div className="pt-2">
            <h4 className="mb-2 font-semibold text-foreground">
              {t(($) => $.maturityModal.howItWorks.title)}
            </h4>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong>{t(($) => $.maturityModal.howItWorks.accrualLabel)}:</strong>{' '}
                {t(($) => $.maturityModal.howItWorks.accrual)}
              </li>
              <li>
                <strong>{t(($) => $.maturityModal.howItWorks.rateLabel)}:</strong>{' '}
                {t(($) => $.maturityModal.howItWorks.rate, { max: maxApy })}
              </li>
            </ul>
          </div>

          <div className="pt-2">
            <h4 className="mb-2 font-semibold text-foreground">
              {t(($) => $.maturityModal.modulation.title)}
            </h4>
            <p>{t(($) => $.maturityModal.modulation.description)}</p>
            <p className="mt-2">
              <a
                href="https://wiki.internetcomputer.org/wiki/Maturity_modulation"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline hover:text-primary/80"
              >
                {t(($) => $.maturityModal.modulation.learnMore)} →
                <span className="sr-only">{t(($) => $.common.opensInNewTab)}</span>
              </a>
            </p>
          </div>

          <div className="pt-2">
            <h4 className="mb-2 font-semibold text-foreground">
              {t(($) => $.maturityModal.managing.title)}
            </h4>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong>{t(($) => $.maturityModal.managing.autoStakeLabel)}:</strong>{' '}
                {t(($) => $.maturityModal.managing.autoStake)}
              </li>
              <li>
                <strong>{t(($) => $.maturityModal.managing.keepLiquidLabel)}:</strong>{' '}
                {t(($) => $.maturityModal.managing.keepLiquid)}
              </li>
              <li>
                <strong>{t(($) => $.maturityModal.managing.disburseLabel)}:</strong>{' '}
                {t(($) => $.maturityModal.managing.disburse)}
              </li>
            </ul>
          </div>

          <Button className="w-full" onClick={() => setOpen(false)}>
            {t(($) => $.maturityModal.button)}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
