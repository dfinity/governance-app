import { Info, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useBetaBannerCollapsed } from '@hooks/useBetaBannerCollapsed';

interface BetaBannerProps {
  isLoggedIn?: boolean;
}

export const BetaBanner = ({ isLoggedIn = false }: BetaBannerProps) => {
  const { t } = useTranslation();
  const { isCollapsed, setIsCollapsed } = useBetaBannerCollapsed();

  const handleToggle = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    // Update localStorage synchronously before dispatching event
    localStorage.setItem('beta-banner-collapsed', String(newValue));
    // Dispatch custom event for same-window updates
    window.dispatchEvent(new Event('beta-banner-toggle'));
  };

  if (isCollapsed) {
    // Different positioning based on login state
    const positionClasses = isLoggedIn
      ? // Logged in: Desktop - on top of Governance label, Mobile - middle of header
        'fixed top-2 left-[11rem] z-50 hidden lg:flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[0.625rem] font-semibold shadow-sm hover:shadow-md bg-black text-white border-zinc-700'
      : // Login page: next to logo (logo is ~50px wide)
        'fixed top-[2.65rem] left-[5.5rem] z-50 hidden sm:flex items-center gap-1.5 rounded-md border bg-zinc-800 text-white border-zinc-700 px-1.5 py-0.5 text-[0.625rem] font-semibold shadow-sm hover:shadow-md sm:top-12 sm:left-[7rem]';

    const mobilePositionClasses = isLoggedIn
      ? 'fixed top-3 right-2 z-50 flex lg:hidden items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold shadow-sm hover:shadow-md bg-black text-white border-zinc-700'
      : 'fixed top-10 right-4 z-50 flex sm:hidden items-center gap-1.5 rounded-md border px-2 py-1 text-[0.625rem] font-semibold shadow-sm hover:shadow-md bg-zinc-800 text-white border-zinc-700';

    return (
      <>
        <button onClick={handleToggle} className={positionClasses} aria-label={t(($) => $.common.betaBanner.expand)}>
          {t(($) => $.common.betaBanner.beta)}
        </button>
        {mobilePositionClasses && (
          <button
            onClick={handleToggle}
            className={mobilePositionClasses}
            aria-label={t(($) => $.common.betaBanner.expand)}
          >
            {t(($) => $.common.betaBanner.beta)}
            {isLoggedIn && <Info className="size-3.5" />}
          </button>
        )}
      </>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-zinc-900 text-white">
      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        <div className="text-sm">
          <span className="font-semibold">{t(($) => $.common.betaBanner.beta)}</span>
          <span> · {t(($) => $.common.betaBanner.title)}</span>
          <span className="hidden text-zinc-400 sm:inline">
            {' '}· {t(($) => $.common.betaBanner.description)}
          </span>
        </div>
        <button
          onClick={handleToggle}
          className="rounded p-1 hover:bg-zinc-800"
          aria-label={t(($) => $.common.betaBanner.collapse)}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
};
