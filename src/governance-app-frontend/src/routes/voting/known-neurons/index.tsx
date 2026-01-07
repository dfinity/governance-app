import { KnownNeuron, NeuronId, Topic } from '@icp-sdk/canisters/nns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { getShowProposalUrlStatus } from '@features/proposals/utils';
import { ExpandableNeuronCard } from '@features/voting/components/ExpandableNeuronCard';

import { Alert, AlertDescription, AlertTitle } from '@components/Alert';
import { Button } from '@components/button';
import { useGovernanceNeurons, useNnsGovernance } from '@hooks/governance';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';
import useTitle from '@hooks/useTitle';
import { delay } from '@utils/async';
import { successNotification } from '@utils/notification';
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

  // Fetch all user neurons
  const { data: neurons } = useGovernanceNeurons({
    includeEmptyNeurons: false,
    certified: false,
  });

  const { data } = useGovernanceKnownNeurons();

  const [selectedNeuronId, setSelectedNeuronId] = useState<string | null>(null);

  const updateFollowingMutation = useMutation<
    void,
    Error,
    { neuronId: NeuronId; knownNeuronId: NeuronId }
  >({
    mutationFn: async ({ neuronId, knownNeuronId }) => {
      if (!canister) throw new Error(t(($) => $.common.unknownError));
      await canister.setFollowing({
        neuronId,
        // Set following for all topics but "SNS and Neurons' Fund"
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
  });

  const handleSelect = async (knownNeuron: KnownNeuron) => {
    if (!neurons?.response?.length || !canister) return;

    setSelectedNeuronId(knownNeuron.id.toString());

    // Sequential processing
    for (const neuron of neurons.response) {
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
      });

      // Wait for the current promise to complete before starting the next one
      try {
        await promise;
      } catch (error) {
        // Continue to next neuron even if one fails
        console.error(`Failed to follow for neuron ${neuron.neuronId}:`, error);
      } finally {
        await delay(300);
      }
    }

    await queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
    });

    successNotification({
      description: t(($) => $.knownNeurons.success, { name: knownNeuron.name }),
    });
    setSelectedNeuronId(null);
  };

  const hasNeurons = (neurons?.response?.length ?? 0) > 0;

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

      {!hasNeurons && (
        <div className="flex flex-col gap-6">
          <Alert variant="warning">
            <AlertTitle className="font-semibold">{t(($) => $.common.important)}</AlertTitle>
            <AlertDescription>{t(($) => $.voting.setupFollowingReminder)}</AlertDescription>
          </Alert>

          <div className="mt-6 flex flex-col items-center justify-center gap-4 text-center lg:mt-12">
            <div className="flex h-18 w-18 items-center justify-center rounded-full border-2 bg-muted">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold">{t(($) => $.voting.noFollowing.title)}</h3>
            <p className="max-w-sm font-light text-muted-foreground">
              {t(($) => $.voting.noFollowing.description)}
            </p>
          </div>
        </div>
      )}

      {hasNeurons && (
        <div className="flex flex-col gap-4">
          {data?.response?.map((neuron) => (
            <ExpandableNeuronCard
              key={neuron.id.toString()}
              neuron={neuron}
              isSelected={selectedNeuronId === neuron.id.toString()}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
