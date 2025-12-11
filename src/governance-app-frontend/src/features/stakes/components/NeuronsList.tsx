import { NeuronInfo, NeuronState } from '@icp-sdk/canisters/nns';
import { secondsToDuration } from '@dfinity/utils';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/CertifiedBadge';
import { QueryStates } from '@components/QueryStates';
import { SimpleCard } from '@components/SimpleCard';
import { SkeletonLoader } from '@components/SkeletonLoader';
import { E8S } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/governance/useGovernanceNeurons';
import { CertifiedData } from '@typings/queries';

export const NeuronsList = () => {
  const neuronsQuery = useGovernanceNeurons();
  const { t } = useTranslation();
  const dissolveDelayRemaining = (neuron: NeuronInfo): string =>
    secondsToDuration({
      seconds: neuron.dissolveDelaySeconds,
      i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
    });

  return (
    <div className="mt-4 flex flex-col gap-2 text-xl">
      <QueryStates<CertifiedData<NeuronInfo[]>>
        query={neuronsQuery}
        isEmpty={(neurons) => neurons.response.length === 0}
      >
        {(neurons) => (
          <div className="grid grid-cols-1 gap-4 text-lg sm:grid-cols-2 lg:grid-cols-3">
            {neurons?.response.map((neuron) => (
              <Link to="/nns/neurons/$id" params={{ id: neuron.neuronId }} key={neuron.neuronId}>
                <SimpleCard>
                  <div className="flex items-center justify-between gap-2">
                    <p className="overflow-hidden text-ellipsis">#{neuron.neuronId}</p>
                    {neurons?.certified ? <CertifiedBadge /> : <SkeletonLoader width={90} />}
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
                          <td>
                            {Number(neuron.fullNeuron?.cachedNeuronStake) / E8S}{' '}
                            {t(($) => $.common.icp)}
                          </td>
                        </tr>
                        <tr>
                          <td className="pr-2 font-bold">{t(($) => $.neuron.votingPower)}:</td>
                          <td>{neuron.votingPower}</td>
                        </tr>
                        <tr>
                          <td className="pr-2 font-bold">{t(($) => $.neuron.dissolveDelay)}:</td>
                          <td>{dissolveDelayRemaining(neuron)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </SimpleCard>
              </Link>
            ))}
          </div>
        )}
      </QueryStates>
    </div>
  );
};
