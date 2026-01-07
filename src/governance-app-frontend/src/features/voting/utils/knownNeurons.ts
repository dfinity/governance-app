import { KnownNeuron } from '@icp-sdk/canisters/nns';

import { DFINITY_NEURON_ID } from '@constants/neuron';

export const sortKnownNeurons = (a: KnownNeuron, b: KnownNeuron) => {
  if (a.id === DFINITY_NEURON_ID) return -1;
  if (b.id === DFINITY_NEURON_ID) return 1;

  const aHasTopics = (a.committed_topics?.length ?? 0) > 0;
  const bHasTopics = (b.committed_topics?.length ?? 0) > 0;

  if (aHasTopics && !bHasTopics) return -1;
  if (!aHasTopics && bHasTopics) return 1;

  return Number(a.id - b.id);
};
