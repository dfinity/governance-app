import { NeuronInfo, NeuronState } from '@icp-sdk/canisters/nns';
import { isNullish, secondsToDuration } from '@dfinity/utils';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';

import { Card, CardContent, CardFooter } from "@/components/ui/card";

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';
import { WarningMessage } from '@components/extra/WarningMessage';
import { SkeletonLoader } from '@components/loaders/SkeletonLoader';
import { E8S, E8Sn, IS_TESTNET } from '@constants/extra';
import { useGovernanceNeurons } from '@hooks/canisters/governance/useGovernanceNeurons';
import useTitle from '@hooks/useTitle';
import { bigIntDiv, stringToBigInt } from '@utils/bigInt';
import { requireIdentity } from '@utils/router';

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

      <Card>
        <CardContent className="p-6 grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase">{t(($) => $.neuron.creationDate)}</span>
            <span>
              {neuron.fullNeuron?.createdTimestampSeconds
                ? new Date(
                  Number(neuron.fullNeuron.createdTimestampSeconds) * 1000,
                ).toLocaleDateString()
                : '-'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase">{t(($) => $.neuron.status)}</span>
            <span>{NeuronState[neuron.state]}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase">{t(($) => $.neuron.maturity)}</span>
            <span>
              {neuron.fullNeuron?.maturityE8sEquivalent
                ? bigIntDiv(neuron.fullNeuron.maturityE8sEquivalent, E8Sn, 2)
                : t(($) => $.common.notAvailable)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase">{t(($) => $.neuron.stake)}</span>
            <span>
              {Number(neuron.fullNeuron?.cachedNeuronStake) / E8S} {t(($) => $.common.icp)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase">{t(($) => $.neuron.votingPower)}</span>
            <span>{neuron.votingPower}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase">{t(($) => $.neuron.dissolveDelay)}</span>
            <span>{dissolveDelayRemaining(neuron)}</span>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center gap-2 border-t p-6 bg-muted/20">
          <SetDissolveDelayModal neuron={neuron} />
          {IS_TESTNET && <IncreaseMaturityModal neuron={neuron} />}
          {IS_TESTNET && <UnlockNeuronModal neuron={neuron} />}
        </CardFooter>
      </Card>
    </div>
  );
};
