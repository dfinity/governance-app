import { isNullish } from '@dfinity/utils';
import { KnownNeuron, NeuronId, Topic } from '@icp-sdk/canisters/nns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { getShowProposalUrlStatus } from '@features/proposals/utils';
import { KnownNeuronCard } from '@features/voting/components/KnownNeuronCard';
import { getUsersFollowedNeurons, isKnownNeuron } from '@features/voting/utils/findFollowedNeuron';
import { isActiveKnownNeuron, sortKnownNeurons } from '@features/voting/utils/knownNeurons';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@common/components/AlertDialog';
import { Button } from '@components/button';
import { Skeleton } from '@components/Skeleton';
import { useGovernanceNeurons, useNnsGovernance } from '@hooks/governance';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';
import useTitle from '@hooks/useTitle';
import { warningNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';
import { requireIdentity } from '@utils/router';

export const Route = createFileRoute('/voting/representatives/')({
  component: KnownNeuronsList,
  validateSearch: getShowProposalUrlStatus,
  beforeLoad: requireIdentity,
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
  const [openConfirmationDialogWithNeuron, setOpenConfirmationDialogWithNeuron] =
    useState<KnownNeuron | null>(null);

  useEffect(() => {
    const userNeurons = neuronsQuery.data?.response;
    const knownNeurons = knownNeuronsQuery.data?.response;

    if (!userNeurons || !knownNeurons) return;

    const followedNeurons = getUsersFollowedNeurons({
      userNeurons,
      knownNeurons,
    });

    if (followedNeurons.length > 1) {
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

  const updateFollowingMutation = useMutation<
    void[],
    Error,
    { neurons: { neuronId: NeuronId }[]; knownNeuron: KnownNeuron },
    { previousSelectedId: string | null }
  >({
    mutationFn: ({ neurons, knownNeuron }) => {
      // This check is to satisfy TS
      if (!canister) throw new Error(t(($) => $.common.unknownError));

      const knownNeuronId = knownNeuron.id;
      // Setting the following for topics `Unspecified`, `Governance` and `SNS and Community Fund` to cover all topics
      const promises = neurons.map((n) =>
        canister.setFollowing({
          neuronId: n.neuronId,
          topicFollowing: [
            {
              topic: Topic.Unspecified,
              followees: [knownNeuronId],
            },
            {
              topic: Topic.Governance,
              followees: [knownNeuronId],
            },
            {
              topic: Topic.SnsAndCommunityFund,
              followees: [knownNeuronId],
            },
          ],
        }),
      );

      return Promise.all(promises);
    },
    onMutate: (variables) => {
      const previousSelectedId = selectedNeuronId;

      // Optimistic update
      setSelectedNeuronId(variables.knownNeuron.id.toString());

      return { previousSelectedId };
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.NNS_GOVERNANCE.NEURONS],
      });

      toast.success(
        t(($) => $.knownNeurons.api.success, {
          name: variables.knownNeuron.name,
        }),
      );
    },
    onError: (error, variables, context) => {
      console.error('Failed to update neuron:', error);

      // Roll back optimistic update
      setSelectedNeuronId(context?.previousSelectedId ?? null);

      toast.error(
        t(($) => $.knownNeurons.api.error, {
          name: variables.knownNeuron.name,
        }),
      );
    },
    retry: 3,
  });

  const handleSelect = (knownNeuron: KnownNeuron) => {
    if (!neuronsQuery.data?.certified || !canister) return;
    const neurons = neuronsQuery.data.response;
    const allKnownNeurons = knownNeuronsQuery.data?.response;

    if (neurons.length === 0) {
      warningNotification({
        description: t(($) => $.voting.warnings.stakeRequired),
      });
      return;
    }

    // Check if user already follows someone
    if (allKnownNeurons) {
      const followedNeurons = getUsersFollowedNeurons({
        userNeurons: neurons,
        knownNeurons: allKnownNeurons,
      });

      // If existing following (consistent or not), prompt for confirmation
      if (followedNeurons.length > 0) {
        setOpenConfirmationDialogWithNeuron(knownNeuron);
        return;
      }
    }

    updateFollowingMutation.mutate({
      neurons,
      knownNeuron,
    });
  };

  const handleConfirmSelection = () => {
    // This check is to satisfy TS
    if (!neuronsQuery.data?.certified || isNullish(openConfirmationDialogWithNeuron)) return;

    updateFollowingMutation.mutate({
      neurons: neuronsQuery.data.response,
      knownNeuron: openConfirmationDialogWithNeuron,
    });
    setOpenConfirmationDialogWithNeuron(null);
  };

  const knownNeurons = knownNeuronsQuery.data?.response;
  const sortedKnownNeurons = knownNeurons?.filter(isActiveKnownNeuron).toSorted(sortKnownNeurons);

  return (
    <>
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
          ) : knownNeuronsQuery.isError ? (
            // @TODO: Improve error UI
            (<p className="text-destructive">{t(($) => $.common.loadingError)}</p>)
          ) : sortedKnownNeurons?.length === 0 ? (
            <p className="text-muted-foreground">{t(($) => $.knownNeurons.empty)}</p>
          ) : (
            sortedKnownNeurons?.map((neuron) => (
              <KnownNeuronCard
                key={neuron.id.toString()}
                neuron={neuron}
                isSelected={selectedNeuronId === neuron.id.toString()}
                onSelect={handleSelect}
                isLoading={
                  updateFollowingMutation.isPending && selectedNeuronId === neuron.id.toString()
                }
                isDisabled={
                  isNullish(canister) ||
                  updateFollowingMutation.isPending ||
                  !neuronsQuery.data?.certified
                }
              />
            ))
          )}
        </div>
      </div>
      <AlertDialog
        open={!!openConfirmationDialogWithNeuron}
        onOpenChange={(open: boolean) => !open && setOpenConfirmationDialogWithNeuron(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(($) => $.knownNeurons.confirmation.title)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(($) => $.knownNeurons.confirmation.description)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenConfirmationDialogWithNeuron(null)}>
              {t(($) => $.common.cancel)}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSelection}>
              {t(($) => $.common.confirm)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
