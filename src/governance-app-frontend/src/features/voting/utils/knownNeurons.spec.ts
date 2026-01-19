import { KnownNeuron } from '@icp-sdk/canisters/nns';
import { describe, expect, it } from 'vitest';

import { DFINITY_NEURON_ID } from '@common/constants/neuron';

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

  it('prioritizes neurons in KNOWN_NEURONS_SORTING_MAP by index', () => {
    // defined in map with indices
    const id1 = 27n;
    const id2 = 33138099823745946n;
    const id3 = 4966884161088437903n;
    const unmappedId = 12345n;

    const neurons = [
      createMockNeuron(unmappedId), // Should be last
      createMockNeuron(id3),
      createMockNeuron(id1),
      createMockNeuron(id2),
    ];

    const sorted = neurons.toSorted(sortKnownNeurons);

    expect(sorted[0].id).toBe(id1);
    expect(sorted[1].id).toBe(id2);
    expect(sorted[2].id).toBe(id3);
    expect(sorted[3].id).toBe(unmappedId);
  });

  it('sorts penalized neurons last', () => {
    const penalizedId = 428687636340283207n;
    const normalId = 27n;

    const neurons = [createMockNeuron(penalizedId), createMockNeuron(normalId)];

    const sorted = neurons.toSorted(sortKnownNeurons);

    expect(sorted[0].id).toBe(normalId);
    expect(sorted[1].id).toBe(penalizedId);
  });
});
