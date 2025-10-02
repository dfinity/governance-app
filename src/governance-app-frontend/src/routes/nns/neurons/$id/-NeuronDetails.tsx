import { NeuronInfo, NeuronState } from '@dfinity/nns';
import { isNullish, secondsToDuration } from '@dfinity/utils';
import { useTranslation } from 'react-i18next';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { WarningMessage } from '@components/extra/WarningMessage';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { E8S } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/canisters/governance/useGovernanceNeurons';

import { SetDissolveDelayModal } from '../-SetDissolveDelayModal';

type Props = {
  neuronId: bigint;
};

export const NeuronDetails: React.FC<Props> = ({ neuronId }) => {
  const { t } = useTranslation();
  // max: use "useGovernanceNeurons();" as fallback neuron source.

  // Use same api as for neuron list, as ic-js uses listNeurons under the hood anyway.
  // ref. https://github.com/dfinity/ic-js/blob/48a2ee1a6afa230eb86e2599147defe71cd16013/packages/nns/src/governance.canister.ts#L1009
  const { isLoading, data } = useGovernanceNeurons({
    certified: true,
    neuronIds: [neuronId],
  });

  const neuron = data?.response[0];
  const dissolveDelayRemaining = (current: NeuronInfo): string =>
    secondsToDuration({
      seconds: current.dissolveDelaySeconds,
      i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
    });

  if (isLoading) {
    return <SkeletonLoader count={1} />;
  }

  if (isNullish(neuron)) {
    return <WarningMessage message={t(($) => $.neuron.errors.neuronNotFound, { neuronId })} />;
  }

  return (
    <div className="flex flex-col gap-6 text-lg">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">#{neuron.neuronId?.toString()}</h2>
        {data?.certified ? <CertifiedBadge /> : <SkeletonLoader width={90} />}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-base">
          <tbody>
            <tr>
              <th className="w-1/3 pr-4 text-sm font-bold text-secondary uppercase">
                {t(($) => $.neuron.creationDate)}
              </th>
              <td>
                {neuron.fullNeuron?.createdTimestampSeconds
                  ? new Date(
                      Number(neuron.fullNeuron.createdTimestampSeconds) * 1000,
                    ).toLocaleDateString()
                  : '-'}
              </td>
            </tr>
            <tr>
              <th className="pr-4 text-sm font-bold text-secondary uppercase">
                {t(($) => $.neuron.status)}
              </th>
              <td>{NeuronState[neuron.state]}</td>
            </tr>
            <tr>
              <th className="pr-4 text-sm font-bold text-secondary uppercase">
                {t(($) => $.neuron.stake)}
              </th>
              <td>
                {Number(neuron.fullNeuron?.cachedNeuronStake) / E8S} {t(($) => $.common.icp)}
              </td>
            </tr>
            <tr>
              <th className="pr-4 text-sm font-bold text-secondary uppercase">
                {t(($) => $.neuron.votingPower)}
              </th>
              <td>{neuron.votingPower}</td>
            </tr>
            <tr>
              <th className="pr-4 text-sm font-bold text-secondary uppercase">
                {t(($) => $.neuron.dissolveDelay)}
              </th>
              <td>{dissolveDelayRemaining(neuron)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <SetDissolveDelayModal neuron={neuron} />
      </div>
    </div>
  );
};
