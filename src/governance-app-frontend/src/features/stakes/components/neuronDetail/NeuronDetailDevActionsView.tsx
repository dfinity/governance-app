import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { useTranslation } from 'react-i18next';

import { IncreaseMaturityModal } from '@/dev/IncreaseMaturityModal';
import { CreateDummyProposalsButton } from '@/dev/makeDummyProposals';
import { UnlockNeuronModal } from '@/dev/UnlockNeuronModal';

type Props = {
  neuron: NeuronInfo;
};

export function NeuronDetailDevActionsView({ neuron }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t(($) => $.devActionsModal.description)}</p>

      <div className="flex flex-col gap-3">
        <IncreaseMaturityModal neuron={neuron} />
        <UnlockNeuronModal neuron={neuron} />
        <CreateDummyProposalsButton neuron={neuron} />
      </div>
    </div>
  );
}
