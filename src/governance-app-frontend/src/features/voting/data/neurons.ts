import { KnownNeuron } from '@icp-sdk/canisters/nns';

export const KNOWN_NEURONS: KnownNeuron[] = [
  {
    id: 27n,
    name: 'DFINITY Foundation',
    description: 'Core protocol development team',
    links: [],
    committed_topics: [],
  },
  {
    id: 28n,
    name: 'Internet Computer Association',
    description: 'Community governance body',
    links: [],
    committed_topics: [[{ CatchAll: null }], [{ Governance: null }]],
  },
];
