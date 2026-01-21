import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';

interface BetaBannerProps {
  isLoggedIn?: boolean;
}

export const BetaBanner = ({ isLoggedIn = false }: BetaBannerProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Different positioning based on login state
  const positionClasses = isLoggedIn
    ? // Logged in: Desktop - on top of Governance label
      'fixed top-2 left-[11rem] z-50 hidden lg:flex items-center rounded-md border px-1.5 py-0.5 text-[0.625rem] font-semibold shadow-sm hover:shadow-md bg-black text-white border-zinc-700 cursor-pointer transition-all hover:scale-105'
    : // Login page: next to logo
      'fixed top-[2.65rem] left-[5.5rem] z-50 hidden sm:flex items-center rounded-md border bg-zinc-800 text-white border-zinc-700 px-1.5 py-0.5 text-[0.625rem] font-semibold shadow-sm hover:shadow-md sm:top-12 sm:left-[7rem] cursor-pointer transition-all hover:scale-105';

  const mobilePositionClasses = isLoggedIn
    ? 'fixed top-3 right-2 z-50 flex lg:hidden items-center rounded-md border px-2 py-1 text-xs font-semibold shadow-sm hover:shadow-md bg-black text-white border-zinc-700 cursor-pointer transition-all hover:scale-105'
    : 'fixed top-10 right-4 z-50 flex sm:hidden items-center rounded-md border px-2 py-1 text-[0.625rem] font-semibold shadow-sm hover:shadow-md bg-zinc-800 text-white border-zinc-700 cursor-pointer transition-all hover:scale-105';

  return (
    <>
      {/* Desktop badge */}
      <button
        onClick={() => setIsOpen(true)}
        className={positionClasses}
        aria-label={t(($) => $.common.betaBanner.openInfo)}
      >
        {t(($) => $.common.betaBanner.beta)}
      </button>

      {/* Mobile badge */}
      <button
        onClick={() => setIsOpen(true)}
        className={mobilePositionClasses}
        aria-label={t(($) => $.common.betaBanner.openInfo)}
      >
        {t(($) => $.common.betaBanner.beta)}
      </button>

      {/* Modal/Drawer */}
      <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t(($) => $.common.betaBanner.modalTitle)}</ResponsiveDialogTitle>
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
                <li className="flex gap-2">
                  <span className="text-green-600 dark:text-green-500">✓</span>
                  <span>{t(($) => $.common.betaBanner.canDo.stake)}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600 dark:text-green-500">✓</span>
                  <span>{t(($) => $.common.betaBanner.canDo.vote)}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600 dark:text-green-500">✓</span>
                  <span>{t(($) => $.common.betaBanner.canDo.viewActivity)}</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                {t(($) => $.common.betaBanner.beAware)}
              </h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-amber-600 dark:text-amber-500">!</span>
                  <span>{t(($) => $.common.betaBanner.aware.affectsConfig)}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600 dark:text-amber-500">!</span>
                  <span>{t(($) => $.common.betaBanner.aware.testing)}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600 dark:text-amber-500">!</span>
                  <span>{t(($) => $.common.betaBanner.aware.reportIssues)}</span>
                </li>
              </ul>
            </div>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
};
