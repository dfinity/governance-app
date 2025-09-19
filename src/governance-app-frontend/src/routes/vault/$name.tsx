import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';

import useTitle from '@hooks/useTitle';

type SearchParams = {
  surname?: string;
};

type LoaderParams = {
  greet: string;
};

export const Route = createFileRoute('/vault/$name')({
  component: VaultIndex,
  pendingComponent: () => <Skeleton count={3} />,
  validateSearch: (search): SearchParams => ({
    surname: search.surname ? String(search.surname) : undefined,
  }),
  loader: async ({ params }) => {
    const res = await new Promise<LoaderParams>((resolve) => {
      setTimeout(() => {
        resolve({ greet: 'Hello ' + params.name });
      }, 1000);
    });
    return res;
  },
});

function VaultIndex() {
  const { greet } = Route.useLoaderData();
  const { surname } = Route.useSearch();
  const { t } = useTranslation();
  useTitle(t(($) => $.common.vault));

  return (
    <div className="text-xl text-primary">
      {t(($) => $.vault.description)}
      <p>
        {greet} {surname}
      </p>
    </div>
  );
}
