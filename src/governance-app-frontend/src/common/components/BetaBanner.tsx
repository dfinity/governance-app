import { Info, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useBetaBannerCollapsed } from '@hooks/useBetaBannerCollapsed';

interface BetaBannerProps {
  isLoggedIn?: boolean;
}

// Position constants for collapsed badge
const COLLAPSED_BADGE = {
  LOGGED_IN: {
    DESKTOP_TOP: 'top-2',
    DESKTOP_LEFT: 'left-[11rem]',
    MOBILE_TOP: 'top-3',
    MOBILE_RIGHT: 'right-2',
  },
  LOGIN_PAGE: {
    DESKTOP_TOP: 'top-[2.65rem]',
    DESKTOP_LEFT: 'left-[5.5rem]',
    DESKTOP_SM_TOP: 'sm:top-12',
    DESKTOP_SM_LEFT: 'sm:left-[7rem]',
    MOBILE_TOP: 'top-10',
    MOBILE_RIGHT: 'right-4',
  },
} as const;

const getDesktopClasses = (isLoggedIn: boolean) => {
  const base =
    'fixed z-50 hidden items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[0.625rem] font-semibold shadow-sm hover:shadow-md';
  const theme = 'bg-black text-white border-zinc-700';
  const loginPageTheme = 'bg-zinc-800 text-white border-zinc-700';

  if (isLoggedIn) {
    return `${base} ${COLLAPSED_BADGE.LOGGED_IN.DESKTOP_TOP} ${COLLAPSED_BADGE.LOGGED_IN.DESKTOP_LEFT} lg:flex ${theme}`;
  }

  return `${base} ${COLLAPSED_BADGE.LOGIN_PAGE.DESKTOP_TOP} ${COLLAPSED_BADGE.LOGIN_PAGE.DESKTOP_LEFT} ${COLLAPSED_BADGE.LOGIN_PAGE.DESKTOP_SM_TOP} ${COLLAPSED_BADGE.LOGIN_PAGE.DESKTOP_SM_LEFT} sm:flex ${loginPageTheme}`;
};

const getMobileClasses = (isLoggedIn: boolean) => {
  const base =
    'fixed z-50 flex items-center gap-1.5 rounded-md border font-semibold shadow-sm hover:shadow-md';
  const theme = 'bg-black text-white border-zinc-700';
  const loginPageTheme = 'bg-zinc-800 text-white border-zinc-700';

  if (isLoggedIn) {
    return `${base} ${COLLAPSED_BADGE.LOGGED_IN.MOBILE_TOP} ${COLLAPSED_BADGE.LOGGED_IN.MOBILE_RIGHT} lg:hidden px-2 py-1 text-xs ${theme}`;
  }

  return `${base} ${COLLAPSED_BADGE.LOGIN_PAGE.MOBILE_TOP} ${COLLAPSED_BADGE.LOGIN_PAGE.MOBILE_RIGHT} sm:hidden px-2 py-1 text-[0.625rem] ${loginPageTheme}`;
};

export const BetaBanner = ({ isLoggedIn = false }: BetaBannerProps) => {
  const { t } = useTranslation();
  const { isCollapsed, setIsCollapsed } = useBetaBannerCollapsed();

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
    // Dispatch custom event for same-window updates
    window.dispatchEvent(new Event('beta-banner-toggle'));
  };

  if (isCollapsed) {
    const desktopClasses = getDesktopClasses(isLoggedIn);
    const mobileClasses = getMobileClasses(isLoggedIn);

    return (
      <>
        <button
          onClick={handleToggle}
          className={desktopClasses}
          aria-label={t(($) => $.common.betaBanner.expand)}
        >
          {t(($) => $.common.betaBanner.beta)}
        </button>
        <button
          onClick={handleToggle}
          className={mobileClasses}
          aria-label={t(($) => $.common.betaBanner.expand)}
        >
          {t(($) => $.common.betaBanner.beta)}
          {isLoggedIn && <Info className="size-3.5" />}
        </button>
      </>
    );
  }

  return (
    <div className="fixed top-0 right-0 left-0 z-50 w-full border-b bg-zinc-900 text-white">
      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        <div className="text-sm">
          <span className="font-semibold">{t(($) => $.common.betaBanner.beta)}</span>
          <span> · {t(($) => $.common.betaBanner.title)}</span>
          <span className="hidden text-zinc-400 sm:inline">
            {' '}
            · {t(($) => $.common.betaBanner.description)}
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
