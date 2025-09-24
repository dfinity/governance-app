import { NeuronState } from '@dfinity/nns';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { WarningMessage } from '@components/extra/WarningMessage';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { E8S } from '@constants/extra';
import { useGovernanceGetNeurons } from '@hooks/canisters/governance/useGovernanceGetNeurons';
import useTitle from '@hooks/useTitle';
import { requireIdentity } from '@utils/routes';

export const Route = createFileRoute('/nns/neurons/')({
  component: NeuronsPage,
  beforeLoad: requireIdentity,
});

function NeuronsPage() {
  const { isLoading, error, data } = useGovernanceGetNeurons();
  const { t } = useTranslation();
  useTitle(t(($) => $.common.neuronsList));

  return (
    <div className="flex flex-col gap-2 text-xl">
      <div className="mb-2 flex gap-2">{t(($) => $.common.neuronsList)}</div>

      {isLoading && <SkeletonLoader count={3} />}
      {!isLoading && !data?.response.length && (
        <WarningMessage message={t(($) => $.common.noNeurons)} />
      )}
      {error && t(($) => $.common.errorLoadingNeurons, { error: error.message })}

      <div className="grid grid-cols-1 gap-4 text-lg sm:grid-cols-2 lg:grid-cols-3">
        {data?.response.map((neuron) => (
          <div
            style={{ backgroundColor: 'var(--background-color-secondary)' }}
            className="flex h-full flex-col justify-between rounded-lg border p-4"
            key={neuron.neuronId}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="overflow-hidden text-ellipsis">#{neuron.neuronId}</p>
              {data?.certified ? <CertifiedBadge /> : <SkeletonLoader width={90} />}
            </div>
            <div className="mt-2 gap-1 text-sm">
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="pr-2 font-bold">{t(($) => $.neuron.creationDate)}:</td>
                    <td>
                      {neuron.fullNeuron?.createdTimestampSeconds
                        ? new Date(
                            Number(neuron.fullNeuron.createdTimestampSeconds) * 1000,
                          ).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-2 font-bold">{t(($) => $.neuron.status)}:</td>
                    <td>{NeuronState[neuron.state]}</td>
                  </tr>
                  <tr>
                    <td className="pr-2 font-bold">{t(($) => $.neuron.stake)}:</td>
                    <td>{Number(neuron.fullNeuron?.cachedNeuronStake) / E8S} ICPs</td>
                  </tr>
                  <tr>
                    <td className="pr-2 font-bold">{t(($) => $.neuron.votingPower)}:</td>
                    <td>{neuron.votingPower}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
