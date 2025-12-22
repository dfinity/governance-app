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
import { useStakingRewards } from '@hooks/useStakingRewards';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

interface MaturitySymbolProps {
  className?: string;
}

export function MaturitySymbol({ className = '' }: MaturitySymbolProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const stakingRewards = useStakingRewards();
  const defaultMaxApyValueWhileLoading = '10+';
  const maxApy = isStakingRewardDataReady(stakingRewards)
    ? (stakingRewards.stakingFlowApyPreview[96].autoStake.locked * 100).toFixed(2)
    : defaultMaxApyValueWhileLoading;

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger
        className={`cursor-help rounded-sm border border-amber-400 bg-amber-100 p-0.5 transition-all duration-300 hover:scale-110 focus:outline-none ${className}`}
      >
        <Sparkles className="size-5 text-amber-500" />
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col">
        <ResponsiveDialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-amber-400 bg-amber-100 p-2">
              <Sparkles className="size-6 text-amber-500" />
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
