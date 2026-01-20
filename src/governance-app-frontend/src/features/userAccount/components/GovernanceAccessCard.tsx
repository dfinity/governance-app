import { Link } from '@tanstack/react-router';
import { ArrowRight, Circle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@components/ResponsiveDialog';
import { useGovernanceNeurons } from '@hooks/governance';
import { cn } from '@utils/shadcn';

export const GovernanceAccessCard = () => {
  const { t } = useTranslation();
  const { data: neurons } = useGovernanceNeurons();

  // Drafting logic: if user has any neurons, they are "Participating"
  const isParticipating = (neurons?.response?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            {t(($) => $.userAccount.governance.access.title)}
          </p>
        </div>

        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm text-foreground">
            <Circle
              className={cn(
                'size-2 fill-current',
                isParticipating ? 'text-emerald-500' : 'text-destructive',
              )}
            />
            {isParticipating
              ? t(($) => $.userAccount.governance.access.statusParticipating)
              : t(($) => $.userAccount.governance.access.statusNotParticipating)}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isParticipating
              ? t(($) => $.userAccount.governance.access.descParticipating)
              : t(($) => $.userAccount.governance.access.descNotParticipating)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {isParticipating ? (
          <>
            <Link
              to="/stakes"
              className="group inline-flex w-fit items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(($) => $.userAccount.governance.access.links.viewStakes)}
              <ArrowRight className="ml-1 size-3 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
            <Link
              to="/voting"
              className="group inline-flex w-fit items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(($) => $.userAccount.governance.access.links.viewVotingActivity)}
              <ArrowRight className="ml-1 size-3 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          </>
        ) : (
          <ResponsiveDialog>
            <ResponsiveDialogTrigger asChild>
              <Button
                variant="ghost"
                className="group h-auto justify-start p-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                {t(($) => $.userAccount.governance.access.links.learnHow)}
                <Info className="ml-1.5 size-3.5 opacity-50 transition-transform group-hover:opacity-100" />
              </Button>
            </ResponsiveDialogTrigger>
            <ResponsiveDialogContent className="sm:max-w-md">
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>
                  {t(($) => $.userAccount.governance.access.links.learnHowModal.title)}
                </ResponsiveDialogTitle>
              </ResponsiveDialogHeader>
              <div className="pb-8 sm:px-0 sm:pb-0">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(($) => $.userAccount.governance.access.links.learnHowModal.content)}
                </p>
              </div>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        )}
      </div>
    </div>
  );
};
