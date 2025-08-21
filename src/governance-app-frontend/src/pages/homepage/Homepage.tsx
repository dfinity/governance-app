import { useInternetIdentity } from 'ic-use-internet-identity';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/common/hooks/useTheme';
import { useQueryUpdateCall } from '@/common/queries/useQueryUpdateCall';

function Homepage() {
  const { login, identity } = useInternetIdentity();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation(['home', 'common']);

  const data = useQueryUpdateCall<{
    message: string;
  }>({
    key: ['test'],
    queryFn: () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({ message: 'Hello from the server!' });
        }, 1000);
      }),
    updateFn: () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({ message: 'Hello from the server! CERTIFIED' });
        }, 4000);
      }),
    options: {
      enabled: identity !== undefined,
    },
  });

  return (
    <main className="p-4">
      <div>
        <h1 className="text-4xl font-bold">{t('headline')}</h1>
        <img src="/logo2.svg" alt="DFINITY logo" className="py-4" />
        <button
          onClick={login}
          disabled={identity !== undefined}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          {t('common:loading')}
        </button>
      </div>

      {identity !== undefined && (
        <>
          <div className="pt-4">
            {data.isLoading && <p>Loading...</p>}
            {data.isError && <p>Error: {data.error.message}</p>}
            {data.data && <p>{data.data.data.message}</p>}
          </div>

          <div className="text-2xl pt-4">
            {t('yourPrincipal', { principal: identity?.getPrincipal().toString() ?? '' })}
          </div>
        </>
      )}

      <div className="text-xs pt-4 flex items-center gap-2">
        {t('selectedTheme', { theme })}
        <button
          className="rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-600 uppercase font-bold"
          onClick={toggleTheme}
        >
          {t('toggleTheme')}
        </button>
      </div>
      <div className="text-xs pt-4 flex items-center gap-2">
        <button
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'de' : 'en')}
        >
          {t('changeLang', { lang: i18n.language === 'en' ? 'Deutsch' : 'English' })}
        </button>
      </div>
    </main>
  );
}

export default Homepage;
