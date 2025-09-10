import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { useGovernanceGetNeurons } from '@hooks/canisters/governance/useGovernanceGetNeurons';
import useTitle from '@hooks/useTitle';

export const Route = createFileRoute('/nns/neurons/')({
  component: NeuronsPage,
});

function NeuronsPage() {
  const { isLoading, error, data } = useGovernanceGetNeurons();
  const { t } = useTranslation();
  useTitle(t(($) => $.common.neuronsList));

  return (
    <div className="text-xl flex gap-2 flex-col">
      <div className="flex gap-2 mb-2">{t(($) => $.common.neuronsList)}</div>

      {isLoading && <SkeletonLoader count={3} />}
      {!isLoading && !data?.response.length && (
        <p className="text-sm font-bold text-orange-600">⚠️ {t(($) => $.common.noNeurons)}</p>
      )}
      {error && t(($) => $.common.errorLoadingNeurons, { error: error.message })}

      <div className="text-lg grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {data?.response.map((neuron) => (
          <div
            style={{ backgroundColor: 'var(--background-color-secondary)' }}
            className="border p-4 rounded-lg flex items-center justify-between"
            key={neuron.neuronId}
          >
            #{neuron.neuronId}
            {data?.certified ? <CertifiedBadge /> : <SkeletonLoader width={100} />}
          </div>
        ))}
      </div>
    </div>
  );
}
