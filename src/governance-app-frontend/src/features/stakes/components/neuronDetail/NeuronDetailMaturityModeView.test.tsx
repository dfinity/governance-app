import '@/i18n/config';

import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cancelPendingDeviceAction } from '@hooks/useDeviceAction';
import { mockNeuron } from '@fixtures/neuron';
import { clearDeviceApprovals, runApprovedDeviceCall } from '@common/ledger/approvedDeviceCall';
import { clearDeviceQueues } from '@common/ledger/deviceQueue';
import type { Signer } from '@common/ledger/signer';

import { NeuronDetailMaturityModeView } from './NeuronDetailMaturityModeView';

const DEVICE: Signer = { kind: 'ledger', principal: 'aaaaa-aa' };
const HINT = 'Approve or reject on your Ledger device to continue.';

const mocks = vi.hoisted(() => ({ isPending: false }));

vi.mock('@features/stakes/hooks/useNeuronSigner', () => ({
  useNeuronSigner: () => DEVICE,
}));

vi.mock('@features/stakes/hooks/useToggleMaturityMode', () => ({
  useToggleMaturityMode: () => ({ mutateAsync: vi.fn(), isPending: mocks.isPending }),
}));

// A request of another flow, cancelled on the dialog, that still waits for the device answer.
const cancelledRequestElsewhere = async () => {
  void runApprovedDeviceCall(DEVICE.principal, () => new Promise<void>(() => undefined), {
    description: 'Check the principal on the device screen and approve.',
  }).catch(() => undefined);
  await act(async () => undefined);
  await act(async () => cancelPendingDeviceAction());
};

const neuron = mockNeuron();

describe('NeuronDetailMaturityModeView', () => {
  beforeEach(() => {
    clearDeviceQueues();
    clearDeviceApprovals();
    mocks.isPending = false;
  });

  it('shows the device answer hint only while its own call is pending', async () => {
    await cancelledRequestElsewhere();

    const { rerender } = render(
      <NeuronDetailMaturityModeView
        neuron={neuron}
        isHotkey={false}
        onSuccess={vi.fn()}
        onProcessingChange={vi.fn()}
      />,
    );

    expect(screen.queryByText(HINT)).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('');

    mocks.isPending = true;
    rerender(
      <NeuronDetailMaturityModeView
        neuron={neuron}
        isHotkey={false}
        onSuccess={vi.fn()}
        onProcessingChange={vi.fn()}
      />,
    );

    expect(screen.getByText(HINT)).toBeTruthy();
  });
});
