import { NeuronState } from '@dfinity/nns';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { E8S } from '@constants/extra';
import { useGovernanceGetNeurons } from '@hooks/canisters/governance/useGovernanceGetNeurons';
import useTitle from '@hooks/useTitle';
import { requireIdentity } from '@utils/router';

export const Route = createFileRoute('/nns/neurons/')({
  component: NeuronsPage,
  beforeLoad: requireIdentity,
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
            className="border p-4 rounded-lg flex flex-col justify-between h-full"
            key={neuron.neuronId}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="overflow-hidden text-ellipsis">#{neuron.neuronId}</p>
              {data?.certified ? <CertifiedBadge /> : <SkeletonLoader width={90} />}
            </div>
            <div className=" gap-1 mt-2 text-sm">
              <table className=" text-sm">
                <tbody>
                  <tr>
                    <td className="font-bold pr-2">{t(($) => $.neuron.creationDate)}:</td>
                    <td>
                      {neuron.fullNeuron?.createdTimestampSeconds
                        ? new Date(
                            Number(neuron.fullNeuron.createdTimestampSeconds) * 1000,
                          ).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold pr-2">{t(($) => $.neuron.status)}:</td>
                    <td>{NeuronState[neuron.state]}</td>
                  </tr>
                  <tr>
                    <td className="font-bold pr-2">{t(($) => $.neuron.stake)}:</td>
                    <td>{Number(neuron.fullNeuron?.cachedNeuronStake) / E8S} ICPs</td>
                  </tr>
                  <tr>
                    <td className="font-bold pr-2">{t(($) => $.neuron.votingPower)}:</td>
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
