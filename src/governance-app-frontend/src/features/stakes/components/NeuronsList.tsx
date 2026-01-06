import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { Link } from '@tanstack/react-router';

import { QueryStates } from '@components/QueryStates';
import { useGovernanceNeurons } from '@hooks/governance/useGovernanceNeurons';
import { useStakingRewards } from '@hooks/useStakingRewards';
import { CertifiedData } from '@typings/queries';
import { getNeuronId } from '@utils/neuron';
import { isStakingRewardDataReady } from '@utils/staking-rewards';

import { NeuronCard } from './NeuronCard';

export const NeuronsList = () => {
  const neuronsQuery = useGovernanceNeurons();
  const apyData = useStakingRewards();

  return (
    <div className="flex flex-col gap-4 text-xl">
      <QueryStates<CertifiedData<NeuronInfo[]>>
        query={neuronsQuery}
        isEmpty={(neurons) => neurons.response.length === 0}
      >
        {(neurons) => (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {neurons?.response.map((neuron) => {
              const apy = isStakingRewardDataReady(apyData)
                ? apyData.apy.neurons.get(getNeuronId(neuron))
                : undefined;

              return (
                <Link to="/stakes/$id" params={{ id: neuron.neuronId }} key={neuron.neuronId}>
                  <NeuronCard neuron={neuron} apy={apy} />
                </Link>
              );
            })}
          </div>
        )}
      </QueryStates>
    </div>
  );
};
