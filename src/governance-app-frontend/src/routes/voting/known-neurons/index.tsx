import { KnownNeuron, NeuronId, Topic } from '@icp-sdk/canisters/nns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useBlocker } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { getShowProposalUrlStatus } from '@features/proposals/utils';
import { ExpandableKnownNeuronCard } from '@features/voting/components/ExpandableNeuronCard';
import { getUsersFollowedNeurons, isKnownNeuron } from '@features/voting/utils/findFollowedNeuron';
import { sortKnownNeurons } from '@features/voting/utils/knownNeurons';

import { Button } from '@components/button';
import { Skeleton } from '@components/Skeleton';
import { useGovernanceNeurons, useNnsGovernance } from '@hooks/governance';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';
import useTitle from '@hooks/useTitle';
import { longNotification, warningNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';

export const Route = createFileRoute('/voting/known-neurons/')({
  component: KnownNeuronsList,
  validateSearch: getShowProposalUrlStatus,
  staticData: {
    title: 'common.voting',
  },
});

function KnownNeuronsList() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  useTitle(t(($) => $.knownNeurons.title));

  const { canister } = useNnsGovernance();

  const neuronsQuery = useGovernanceNeurons();
  const knownNeuronsQuery = useGovernanceKnownNeurons();

  const [selectedNeuronId, setSelectedNeuronId] = useState<string | null>(null);

  useEffect(() => {
    const userNeurons = neuronsQuery.data?.response;
    const knownNeurons = knownNeuronsQuery.data?.response;

    if (!userNeurons || !knownNeurons) return;

    const followedNeurons = getUsersFollowedNeurons({
      userNeurons,
      knownNeurons,
    });
    const hasConsistentFollowees = followedNeurons.length === 1;

    if (!hasConsistentFollowees) {
      warningNotification({
        description: t(($) => $.voting.warnings.followingMismatch),
      });
      return;
    }

    const target = followedNeurons[0];
    if (isKnownNeuron(target)) {
      setSelectedNeuronId(target.id.toString());
    }
  }, [neuronsQuery.data, knownNeuronsQuery.data, t]);

  useBlocker({
    shouldBlockFn: () => {
      if (!updateFollowingMutation.isPending) return false;
      // @TODO: Improve UI
      window.alert(t(($) => $.knownNeurons.confirmNavigation));
      return true;
    },
  });

  const updateFollowingMutation = useMutation<
    void,
    Error,
    { neuronId: NeuronId; knownNeuronId: NeuronId }
  >({
    mutationFn: async ({ neuronId, knownNeuronId }) => {
      if (!canister) throw new Error(t(($) => $.common.unknownError));
      await canister.setFollowing({
        neuronId,
        // Setting the following for topics `Unspecified` and `Governance` covers all topics but `SNS and Neurons' Fund`
        topicFollowing: [
          {
            topic: Topic.Unspecified,
            followees: [knownNeuronId],
          },
          {
            topic: Topic.Governance,
            followees: [knownNeuronId],
          },
        ],
      });
    },
    retry: 3,
  });

  const handleSelect = async (knownNeuron: KnownNeuron) => {
    if (!neuronsQuery?.data?.certified || !canister) return;
    const neurons = neuronsQuery.data.response;

    if (neurons.length === 0) {
      warningNotification({
        description: t(($) => $.voting.warnings.stakeRequired),
      });
      return;
    }

    setSelectedNeuronId(knownNeuron.id.toString());

    for (const neuron of neurons) {
      const promise = updateFollowingMutation.mutateAsync({
        neuronId: neuron.neuronId,
        knownNeuronId: knownNeuron.id,
      });

      toast.promise(promise, {
        loading: t(($) => $.knownNeurons.followingProgress.loading, {
          neuronId: neuron.neuronId.toString(),
        }),
        success: t(($) => $.knownNeurons.followingProgress.success, {
          neuronId: neuron.neuronId.toString(),
        }),
        error: t(($) => $.knownNeurons.followingProgress.error, {
          neuronId: neuron.neuronId.toString(),
        }),
        ...longNotification,
      });

      // Wait for the current promise to complete before starting the next one
      try {
        await promise;
      } catch (error) {
        // Mutation will be retried 3 times, what if it keeps failing?
        console.error(`Failed to follow for neuron ${neuron.neuronId}:`, error);
      }
    }

    await queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
    });

    setSelectedNeuronId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="link" asChild className="p-0! font-normal">
          <Link to="/voting" search={{ showProposals: search.showProposals }}>
            <ArrowLeft className="size-5" />
            {t(($) => $.proposal.backToProposals)}
          </Link>
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">{t(($) => $.knownNeurons.title)}</h2>
        <p className="text-sm text-muted-foreground">{t(($) => $.knownNeurons.description)}</p>
      </div>

      <div className="flex flex-col gap-4">
        {knownNeuronsQuery.isLoading ? (
          <div className="flex items-center gap-4 p-4">
            <Skeleton className="h-6 w-6 rounded-2xl" />
            <Skeleton className="h-8 w-80 rounded" />
          </div>
        ) : (
          knownNeuronsQuery.data?.response
            ?.toSorted(sortKnownNeurons)
            ?.map((neuron) => (
              <ExpandableKnownNeuronCard
                key={neuron.id.toString()}
                neuron={neuron}
                isSelected={selectedNeuronId === neuron.id.toString()}
                onSelect={handleSelect}
                isDisabled={updateFollowingMutation.isPending || !neuronsQuery.data?.certified}
              />
            ))
        )}
      </div>
    </div>
  );
}
