import '@/i18n/config';

import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { cancelPendingDeviceAction } from '@hooks/useDeviceAction';
import { clearDeviceApprovals, runApprovedDeviceCall } from '@common/ledger/approvedDeviceCall';
import { clearDeviceQueues } from '@common/ledger/deviceQueue';
import type { Signer } from '@common/ledger/signer';

import { DeviceAnswerHint } from './DeviceAnswerHint';

const DEVICE: Signer = { kind: 'ledger', principal: 'aaaaa-aa' };
const HINT = 'Approve or reject on your Ledger device to continue.';

// A cancelled request that waits for the device answer.
const cancelledRequest = async () => {
  void runApprovedDeviceCall(DEVICE.principal, () => new Promise<void>(() => undefined), {
    description: 'Check the proposal ID on the device screen and approve.',
  }).catch(() => undefined);
  await act(async () => undefined);
  await act(async () => cancelPendingDeviceAction());
};

describe('DeviceAnswerHint', () => {
  beforeEach(() => {
    clearDeviceQueues();
    clearDeviceApprovals();
  });

  it('shows the hint for a Ledger signer while a cancelled request waits for the device', async () => {
    await cancelledRequest();

    render(<DeviceAnswerHint signer={DEVICE} />);

    expect(screen.getByText(HINT)).toBeTruthy();
  });

  it('shows nothing while no cancelled request waits', () => {
    render(<DeviceAnswerHint signer={DEVICE} />);

    expect(screen.queryByText(HINT)).toBeNull();
  });

  it('shows nothing for an Internet Identity signer', async () => {
    await cancelledRequest();

    render(<DeviceAnswerHint signer={{ kind: 'ii' }} />);

    expect(screen.queryByText(HINT)).toBeNull();
  });
});
