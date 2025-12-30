import { KnownNeuron } from '@icp-sdk/canisters/nns';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getShowProposalUrlStatus } from '@features/proposals/utils';
import { ExpandableNeuronCard } from '@features/voting/components/ExpandableNeuronCard';

import { Button } from '@components/button';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';
import useTitle from '@hooks/useTitle';
import { successNotification } from '@utils/notification';

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
  useTitle(t(($) => $.manageFollowingModal.title));

  const { data } = useGovernanceKnownNeurons();

  const [selectedNeuronId, setSelectedNeuronId] = useState<string | null>(null);

  const handleSelect = (neuron: KnownNeuron) => {
    setSelectedNeuronId(neuron.id.toString());

    // @TODO: Batch operation for all the neurons.

    successNotification({
      description: t(($) => $.manageFollowingModal.success, { name: neuron.name }),
    });
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
        <h2 className="text-2xl font-semibold">{t(($) => $.manageFollowingModal.title)}</h2>
        <p className="text-sm text-muted-foreground">
          {t(($) => $.manageFollowingModal.description)}
        </p>
      </div>

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
    </div>
  );
}
