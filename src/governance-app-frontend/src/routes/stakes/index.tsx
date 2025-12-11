import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';

import { Button } from '@components/button';

import { StakeNeuronModal } from '@features/neurons/components/StakeNeuronModal';

export const Route = createFileRoute('/stakes/')({
  component: StakesComponent,
});

function StakesComponent() {
  return (
    <div>
      <div className="flex justify-between">
        <div>
          <h2 className="mb-2 text-lg font-semibold">Your Neurons</h2>
          <p className="text-sm">Manage your staked ICP neurons and their configurations</p>
        </div>
        <StakeNeuronModal>
          <Button size="lg">
            <Plus />
            Stake ICPs
          </Button>
        </StakeNeuronModal>
      </div>
    </div>
  );
}
