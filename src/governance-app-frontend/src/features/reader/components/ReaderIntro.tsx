import { useTranslation } from 'react-i18next';

import { ReaderLoginButton } from './ReaderLoginButton';

/** The sidebar of a signed-out reader: what the app does, and one way to log in. */
export const ReaderIntro = () => {
  const { t } = useTranslation();

  return (
    <section
      aria-label={t(($) => $.reader.introLabel)}
      className="flex flex-1 flex-col gap-6 px-6 pt-4"
      data-testid="reader-intro"
    >
      <p className="font-serif text-2xl leading-snug text-foreground">
        {t(($) => $.reader.intro.title)}
      </p>
      <ul className="flex flex-col gap-2 text-muted-foreground">
        <li>{t(($) => $.reader.intro.stake)}</li>
        <li>{t(($) => $.reader.intro.vote)}</li>
        <li>{t(($) => $.reader.intro.earn)}</li>
      </ul>
      <ReaderLoginButton source="reader_sidebar" size="lg" className="h-11 w-full">
        <img src="/icp-logo.svg" alt="" aria-hidden={true} />
        {t(($) => $.reader.login)}
      </ReaderLoginButton>
    </section>
  );
};
