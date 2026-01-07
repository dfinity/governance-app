import { KnownNeuron } from '@icp-sdk/canisters/nns';
import { describe, expect, it } from 'vitest';

import { DFINITY_NEURON_ID } from '@constants/neuron';

import { sortKnownNeurons } from './knownNeurons';

describe('sortKnownNeurons', () => {
  const createMockNeuron = (id: bigint, topics: unknown[] = []): KnownNeuron => ({
    id,
    name: `Neuron ${id}`,
    description: '',
    links: [],
    // @ts-expect-error - we test with minimal topic structure
    committed_topics: topics,
  });

  it('sorts known neurons correctly', () => {
    const neurons = [
      createMockNeuron(100n),
      createMockNeuron(DFINITY_NEURON_ID),
      createMockNeuron(5n, ['topic']),
      createMockNeuron(1n),
      createMockNeuron(50n, ['topic']),
    ];

    const sorted = neurons.toSorted(sortKnownNeurons);

    expect(sorted[0].id).toBe(DFINITY_NEURON_ID);
    expect(sorted[1].id).toBe(5n);
    expect(sorted[2].id).toBe(50n);
    expect(sorted[3].id).toBe(1n);
    expect(sorted[4].id).toBe(100n);
  });

  it('places DFINITY neuron first even if others have topics', () => {
    const neurons = [createMockNeuron(5n, ['topic']), createMockNeuron(DFINITY_NEURON_ID)];
    const sorted = neurons.toSorted(sortKnownNeurons);
    expect(sorted[0].id).toBe(DFINITY_NEURON_ID);
    expect(sorted[1].id).toBe(5n);
  });

  it('sorts correctly with only no-topic neurons', () => {
    const neurons = [createMockNeuron(2n), createMockNeuron(1n)];
    const sorted = neurons.toSorted(sortKnownNeurons);
    expect(sorted[0].id).toBe(1n);
    expect(sorted[1].id).toBe(2n);
  });
});
