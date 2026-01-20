import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyNeuronsState } from '@features/stakes/components/EmptyNeuronsState';
import { NeuronsList } from '@features/stakes/components/NeuronsList';
import { StakingWizardModal } from '@features/stakes/components/stakingWizard/StakingWizardModal';

import { Button } from '@components/button';
import { QueryStates } from '@components/QueryStates';
import { useGovernanceNeurons } from '@hooks/governance';
import type { CertifiedData } from '@typings/queries';
import { cn } from '@utils/shadcn';

export const Route = createFileRoute('/stakes/')({
  component: StakesComponent,
  staticData: {
    title: 'common.stakes',
  },
});

function StakesComponent() {
  const [isStakingWizardOpen, setIsStakingWizardOpen] = useState(false);
  const neuronsQuery = useGovernanceNeurons();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t(($) => $.neuron.title)}</h2>
          <p className="text-sm text-muted-foreground">{t(($) => $.neuron.description)}</p>
        </div>
        <div
          className={cn(
            'flex flex-1 gap-2 sm:flex-initial',
            neuronsQuery.isSuccess && neuronsQuery.data?.response.length === 0
              ? 'hidden sm:flex'
              : '',
          )}
        >
          <Button
            onClick={() => setIsStakingWizardOpen(true)}
            data-testid="staking-wizard-trigger-btn"
            className="w-full sm:w-auto"
            size="xl"
          >
            <Plus />
            {t(($) => $.stakeWizardModal.title)}
          </Button>
        </div>
      </div>

      <QueryStates<CertifiedData<NeuronInfo[]>>
        query={neuronsQuery}
        isEmpty={(neurons) => neurons.response.length === 0}
        emptyComponent={
          <EmptyNeuronsState openStakingWizard={() => setIsStakingWizardOpen(true)} />
        }
      >
        {(neurons) => <NeuronsList neurons={neurons.response} />}
      </QueryStates>

      <StakingWizardModal isOpen={isStakingWizardOpen} setIsOpen={setIsStakingWizardOpen} />
    </div>
  );
}
