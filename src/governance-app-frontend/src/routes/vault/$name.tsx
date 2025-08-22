import { createFileRoute } from '@tanstack/react-router';

type SearchParams = {
  surname?: string;
};

type LoaderParams = {
  greet: string;
};

export const Route = createFileRoute('/vault/$name')({
  component: VaultIndex,
  pendingComponent: () => 'Loading...',
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

  return (
    <div>
      Welcome to the Vault route! This is a placeholder for the Vault governance app frontend.
      <p>
        {greet} {surname}
      </p>
    </div>
  );
}
