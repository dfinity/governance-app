import { createFileRoute } from '@tanstack/react-router';

type LoaderParams = {
  proposal?: string;
};

export const Route = createFileRoute('/nns/proposal/$proposal')({
  component: ProposalDetailsIndex,
  pendingComponent: () => 'Loading...',
  loader: async ({ params }) => {
    const res = await new Promise<LoaderParams>((resolve) => {
      setTimeout(() => {
        resolve({ proposal: params.proposal });
      }, 1000);
    });
    return res;
  },
});

function ProposalDetailsIndex() {
  const { proposal } = Route.useLoaderData();
  return <div>Proposal({proposal}) info</div>;
}
