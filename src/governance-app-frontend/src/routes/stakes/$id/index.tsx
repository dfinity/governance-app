import { isNullish, secondsToDuration } from '@dfinity/utils';
import type { NeuronInfo, NeuronState } from '@icp-sdk/canisters/nns';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { SetDissolveDelayModal } from '@features/stakes/components/SetDissolveDelay';

import { Card, CardContent, CardFooter } from '@components/Card';
import { CertifiedBadge } from '@components/CertifiedBadge';
import { SkeletonLoader } from '@components/SkeletonLoader';
import { WarningMessage } from '@components/WarningMessage';
import { E8S, E8Sn, IS_TESTNET, MILLISECONDS_IN_SECOND } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/governance/useGovernanceNeurons';
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
import { CreateDummyProposalsButton } from '@/dev/makeDummyProposals';
import { UnlockNeuronModal } from '@/dev/UnlockNeuronModal';

const NeuronDetailsRouteComponent = () => {
  const { t } = useTranslation();
  const { id } = Route.useParams();

  useTitle(t(($) => $.common.neuronsDetails, { neuronId: id }));

  return <NeuronDetails neuronId={id!} />;
};

export const Route = createFileRoute('/stakes/$id/')({
  params: {
    parse: ({ id }) => ({
      id: stringToBigInt(id),
    }),
    stringify: ({ id }) => ({ id: id?.toString() ?? '' }),
  },
  beforeLoad: async ({ params }) => {
    await requireIdentity();
    if (!params.id) throw redirect({ to: '/stakes', replace: true });
  },
  pendingComponent: () => <SkeletonLoader count={3} />,
  component: NeuronDetailsRouteComponent,
  staticData: {
    title: 'common.stakes',
  },
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

  const creationDate = neuron.fullNeuron?.createdTimestampSeconds
    ? new Date(
        Number(neuron.fullNeuron.createdTimestampSeconds) * MILLISECONDS_IN_SECOND,
      ).toLocaleDateString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '-';

  return (
    <div className="flex flex-col gap-6 text-lg">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">
          {t(($) => $.neuron.neuronId, { neuronId: neuron.neuronId })}
        </h2>
        <CertifiedBadge certified={data?.certified} />
      </div>

      <Card>
        <CardContent className="grid gap-6 p-6 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase">
              {t(($) => $.neuron.creationDate)}
            </span>
            <span>{creationDate}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase">
              {t(($) => $.neuron.status)}
            </span>
            <span>{NeuronState[neuron.state]}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase">
              {t(($) => $.neuron.maturity)}
            </span>
            <span>
              {neuron.fullNeuron?.maturityE8sEquivalent
                ? bigIntDiv(neuron.fullNeuron.maturityE8sEquivalent, E8Sn, 2)
                : t(($) => $.common.notAvailable)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase">
              {t(($) => $.neuron.stake)}
            </span>
            <span>
              {Number(neuron.fullNeuron?.cachedNeuronStake) / E8S} {t(($) => $.common.icp)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase">
              {t(($) => $.neuron.votingPower)}
            </span>
            <span>{neuron.votingPower}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase">
              {t(($) => $.neuron.dissolveDelay)}
            </span>
            <span>{dissolveDelayRemaining(neuron)}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase">
              {t(($) => $.common.apy)}
            </span>
            <span>
              {isStakingRewardDataLoading(apyData) && <SkeletonLoader width={50} height={24} />}
              {isStakingRewardDataError(apyData) && <WarningMessage message={apyData.error} />}
              {isStakingRewardDataReady(apyData) ? (
                <span>
                  {((apyData.apy.neurons.get(getNeuronId(neuron))?.cur ?? 0) * 100).toFixed(2)}%
                </span>
              ) : null}
            </span>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center gap-2 border-t bg-muted/20 p-6">
          <SetDissolveDelayModal neuron={neuron} />
          {IS_TESTNET && <IncreaseMaturityModal neuron={neuron} />}
          {IS_TESTNET && <UnlockNeuronModal neuron={neuron} />}
          {IS_TESTNET && <CreateDummyProposalsButton neuron={neuron} />}
        </CardFooter>
      </Card>
    </div>
  );
};
