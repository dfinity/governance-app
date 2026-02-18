import { useTranslation } from 'react-i18next';

import { AnimatedGovernanceLogo } from '@features/login/components/AnimatedGovernanceLogo';

/**
 * Full-screen loader shown while the PWA is "booting" (viewport settling).
 * Same look as the login-page authenticating overlay so the app only renders
 * once dimensions are ready.
 */
export function PwaBootLoader() {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label={t(($) => $.common.loading)}
    >
      <div className="flex flex-col items-center gap-6 text-white">
        <AnimatedGovernanceLogo />
        <p className="text-lg font-medium">{t(($) => $.common.loading)}</p>
      </div>
    </div>
  );
}
