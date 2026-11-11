import type { ErrorComponentProps } from '@tanstack/react-router';
import { RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { reloadPage } from '@utils/page';

// The browser denied storage, for example with "Block a site from saving data" in Chrome.
const isStorageDenied = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'SecurityError';

/** The screen for an error that a route cannot recover from, in place of the router default. */
export function RootError({ error }: ErrorComponentProps) {
  const { t } = useTranslation();

  const description = isStorageDenied(error)
    ? t(($) => $.common.error.storageDenied)
    : t(($) => $.common.error.description);

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background text-foreground">
      <div className="px-4 py-10 sm:p-12">
        <img src="/infinity-mark.png" alt={t(($) => $.common.alt.icpLogo)} className="h-6 w-auto" />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-24">
        <div className="flex max-w-md flex-col items-center text-center">
          <h1 className="text-3xl font-normal tracking-tight sm:text-4xl">
            {t(($) => $.common.error.title)}
          </h1>
          <p className="mt-3 text-muted-foreground">{description}</p>
          <div className="mt-8">
            <Button variant="default" size="lg" onClick={reloadPage}>
              <RotateCw className="size-4" />
              {t(($) => $.common.error.reload)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
