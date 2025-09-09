import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ProposalDetails } from './-ProposalDetails';

type LoaderParams = {
  id?: string;
};
export const Route = createFileRoute('/nns/proposals/$id/')({
  component: ProposalDetailsWrapper,
  pendingComponent: () => 'Loading...',
  loader: async ({ params }) => {
    const res = await new Promise<LoaderParams>((resolve) => {
      setTimeout(() => {
        resolve({ id: params.id });
      }, 1000);
    });
    return res;
  },
});
function ProposalDetailsWrapper() {
  const { id } = Route.useLoaderData();
  const { t } = useTranslation();

  // Validate id can be converted to BigInt
  let validBigInt: bigint | undefined;
  try {
    if (id && /^\d+$/.test(id)) {
      validBigInt = BigInt(id);
    }
  } catch (e) {
    console.error('Invalid proposal ID:', e);
    validBigInt = undefined;
  }

  if (!validBigInt) {
    return (
      <div className="mt-4 text-red-600">
        {t(($) => $.common.errorLoadingProposals, { error: 'Invalid proposal ID.' })}
      </div>
    );
  }
  return <ProposalDetails proposalId={validBigInt} />;
}
