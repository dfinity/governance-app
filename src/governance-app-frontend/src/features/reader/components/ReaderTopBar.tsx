import { useTranslation } from 'react-i18next';

import { NnsWordmark } from '@components/icons/NnsWordmark';

import { ReaderLoginButton } from './ReaderLoginButton';

/** The top bar of a signed-out reader below `lg`, in place of the back link. */
export const ReaderTopBar = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-4" data-testid="reader-top-bar">
      <div className="flex min-w-0 items-center gap-3">
        <img src="/infinity-mark.png" alt={t(($) => $.common.alt.icpLogo)} className="h-6 w-auto" />
        {/* The mark alone on the narrowest phones, so the button keeps its room. */}
        <NnsWordmark
          className="hidden h-5 w-auto shrink-0 text-foreground min-[360px]:block"
          aria-hidden={true}
        />
      </div>
      <ReaderLoginButton source="reader_top_bar" size="lg" className="h-11 shrink-0" />
    </div>
  );
};
