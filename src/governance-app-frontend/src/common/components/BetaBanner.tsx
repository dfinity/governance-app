import { Info } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { cn } from '@utils/shadcn';

type Props = {
  isLoggedIn?: boolean;
};

export const BetaBanner = ({ isLoggedIn = false }: Props) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Common badge styling
  const baseBadgeClasses =
    'z-50 items-center rounded-md border border-zinc-700 bg-black text-white shadow-sm hover:shadow-md cursor-pointer transition-all hover:scale-105 font-semibold';

  // Position-specific classes
  const desktopClasses = cn(
    baseBadgeClasses,
    'hidden px-1.5 py-0.5 text-[0.625rem]',
    isLoggedIn ? 'fixed top-2 left-[11rem] lg:flex' : 'sm:flex',
  );

  const mobileClasses = cn(
    baseBadgeClasses,
    'flex gap-1.5 px-2 py-1 text-xs',
    isLoggedIn ? 'fixed top-3 right-2 lg:hidden' : 'absolute top-3 right-4 sm:hidden',
  );

  const canDoItems = [
    t(($) => $.common.betaBanner.canDo.stake),
    t(($) => $.common.betaBanner.canDo.vote),
    t(($) => $.common.betaBanner.canDo.viewActivity),
  ];

  const beAwareItems = [
    t(($) => $.common.betaBanner.aware.affectsConfig),
    t(($) => $.common.betaBanner.aware.testing),
    t(($) => $.common.betaBanner.aware.reportIssues),
  ];

  const handleOpen = () => setIsOpen(true);

  return (
    <>
      {/* Desktop badge */}
      <button
        onClick={handleOpen}
        className={desktopClasses}
        aria-label={t(($) => $.common.betaBanner.openInfo)}
      >
        {t(($) => $.common.betaBanner.beta)}
      </button>

      {/* Mobile badge */}
      <button
        onClick={handleOpen}
        className={mobileClasses}
        aria-label={t(($) => $.common.betaBanner.openInfo)}
      >
        {t(($) => $.common.betaBanner.beta)}
        <Info className="size-3.5" />
      </button>

      {/* Modal/Drawer */}
      <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {t(($) => $.common.betaBanner.modalTitle)}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t(($) => $.common.betaBanner.modalDescription)}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                {t(($) => $.common.betaBanner.whatYouCanDo)}
              </h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {canDoItems.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-green-600 dark:text-green-500">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                {t(($) => $.common.betaBanner.beAware)}
              </h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {beAwareItems.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-amber-600 dark:text-amber-500">!</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
};
