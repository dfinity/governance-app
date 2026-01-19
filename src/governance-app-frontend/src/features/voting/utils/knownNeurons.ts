import { KnownNeuron } from '@icp-sdk/canisters/nns';

import { DFINITY_NEURON_ID } from '@common/constants/neuron';

import { KNOWN_NEURONS_SORTING_MAP } from '../data/knownNeuronsSorting';

// Neurons that have not participated yet and should be penalized (sorted last)
const PENALIZED_NEURON_IDS = [
  '428687636340283207', // CryptoIsGood
  '4714336137769716208', // ELNA AI
  '1100477100620240869', // ICP Hub Bulgaria
  '2776371642396604393', // ICP Hub México
  '55674167450360693', // ICPL.app
  '5728549712200490799', // ICPMANUAL
  '8777656085298269769', // Paul Young
  '10323780370508631162', // Sonic AMM
  '16673157401414569992', // Yuku AI
  '3172308420039087400', // ZenithCode
];

export const sortKnownNeurons = (a: KnownNeuron, b: KnownNeuron) => {
  const isAPenalized = PENALIZED_NEURON_IDS.includes(String(a.id));
  const isBPenalized = PENALIZED_NEURON_IDS.includes(String(b.id));

  if (isAPenalized && !isBPenalized) return 1;
  if (!isAPenalized && isBPenalized) return -1;

  const aSortData = KNOWN_NEURONS_SORTING_MAP[String(a.id)];
  const bSortData = KNOWN_NEURONS_SORTING_MAP[String(b.id)];

  if (aSortData && bSortData) return aSortData.index - bSortData.index;

  if (aSortData) return -1;
  if (bSortData) return 1;

  if (a.id === DFINITY_NEURON_ID) return -1;
  if (b.id === DFINITY_NEURON_ID) return 1;

  const aHasTopics = (a.committed_topics?.length ?? 0) > 0;
  const bHasTopics = (b.committed_topics?.length ?? 0) > 0;

  if (aHasTopics && !bHasTopics) return -1;
  if (!aHasTopics && bHasTopics) return 1;

  return a.id < b.id ? -1 : 1;
};
