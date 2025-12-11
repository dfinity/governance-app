import { NeuronInfo, NeuronState } from '@icp-sdk/canisters/nns';
import { isNullish, secondsToDuration } from '@dfinity/utils';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { WarningMessage } from '@components/extra/WarningMessage';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { E8S, E8Sn, IS_TESTNET } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/canisters/governance/useGovernanceNeurons';
import { useStakingRewards } from '@hooks/useStakingRewards';
import useTitle from '@hooks/useTitle';
import { bigIntDiv, stringToBigInt } from '@utils/bigInt';
import { getNeuronId } from '@utils/neuron';
import { requireIdentity } from '@utils/router';
import {
  isStakingRewardDataError,
  isStakingRewardDataLoading,
  isStakingRewardDataReady,
} from '@utils/staking-rewards';

import { IncreaseMaturityModal } from '@/dev/IncreaseMaturityModal';
import { UnlockNeuronModal } from '@/dev/UnlockNeuronModal';

import { SetDissolveDelayModal } from '../-SetDissolveDelayModal';

const NeuronDetailsRouteComponent = () => {
  const { t } = useTranslation();
  const { id } = Route.useParams();

  useTitle(t(($) => $.common.neuronsDetails, { neuronId: id }));

  return <NeuronDetails neuronId={id!} />;
};

export const Route = createFileRoute('/nns/neurons/$id/')({
  params: {
    parse: ({ id }) => ({
      id: stringToBigInt(id),
    }),
    stringify: ({ id }) => ({ id: id?.toString() ?? '' }),
  },
  beforeLoad: async ({ params }) => {
    await requireIdentity();
    if (!params.id) throw redirect({ to: '/nns/neurons', replace: true });
  },
  pendingComponent: () => <Skeleton count={3} />,
  component: NeuronDetailsRouteComponent,
});

type Props = {
  neuronId: bigint;
};

const NeuronDetails: React.FC<Props> = ({ neuronId }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useGovernanceNeurons();
  const neuron = data?.response.find((n) => n.neuronId === neuronId);
  const apyData = useStakingRewards();

  const dissolveDelayRemaining = ({ dissolveDelaySeconds: seconds }: NeuronInfo): string =>
    secondsToDuration({
      seconds,
      i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
    });

  if (isNullish(neuron)) {
    return isLoading ? (
      <SkeletonLoader count={1} />
    ) : (
      <WarningMessage message={t(($) => $.neuron.errors.neuronNotFound, { neuronId })} />
    );
  }

  return (
    <div className="flex flex-col gap-6 text-lg">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">#{neuron.neuronId?.toString()}</h2>
        {isNullish(data?.response) ? (
          <SkeletonLoader width={90} />
        ) : (
          data.certified && <CertifiedBadge />
        )}
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
                {t(($) => $.neuron.maturity)}
              </th>
              <td>
                {neuron.fullNeuron?.maturityE8sEquivalent
                  ? bigIntDiv(neuron.fullNeuron.maturityE8sEquivalent, E8Sn, 2)
                  : t(($) => $.common.notAvailable)}
              </td>
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
            <tr>
              <td className="pr-2 font-bold">{t(($) => $.common.apy)}:</td>
              <td>
                {isStakingRewardDataLoading(apyData) && <SkeletonLoader width={50} height={24} />}
                {isStakingRewardDataError(apyData) && <WarningMessage message={apyData.error} />}
                {isStakingRewardDataReady(apyData) ? (
                  <span>
                    {((apyData.apy.neurons.get(getNeuronId(neuron))?.cur ?? 0) * 100).toFixed(2)}%
                  </span>
                ) : null}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <SetDissolveDelayModal neuron={neuron} />
        {IS_TESTNET && <IncreaseMaturityModal neuron={neuron} />}
        {IS_TESTNET && <UnlockNeuronModal neuron={neuron} />}
      </div>
    </div>
  );
};
