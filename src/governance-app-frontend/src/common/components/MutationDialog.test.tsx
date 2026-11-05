import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MutationDialog } from '@components/MutationDialog';
import { cancelPendingDeviceAction, DeviceActionCancelledError } from '@hooks/useDeviceAction';
import { tapOverlay, waitForOutsideListeners } from '@utils/unitTest';
import { clearDeviceApprovals, runApprovedDeviceCall } from '@common/ledger/approvedDeviceCall';
import { clearDeviceQueues } from '@common/ledger/deviceQueue';
import type { Signer } from '@common/ledger/signer';

const media = vi.hoisted(() => ({ isDesktop: false }));
vi.mock('@hooks/useMediaQuery', () => ({ useMediaQuery: () => media.isDesktop }));
vi.mock('@components/NavigationBlockerDialog', () => ({ NavigationBlockerDialog: () => null }));

const DEVICE: Signer = { kind: 'ledger', principal: 'aaaaa-aa' };
const HINT = 'Approve or reject on your Ledger device to continue.';

const renderDialog = (
  onOpenChange: (open: boolean) => void,
  mutation: () => Promise<unknown> = () => new Promise(() => undefined),
  signer?: Signer,
) =>
  render(
    <MutationDialog
      open
      onOpenChange={onOpenChange}
      processingMessage="Processing"
      successMessage="Done"
      navBlockerDescription="Blocked"
      signer={signer}
    >
      {({ execute }) => <button onClick={() => execute(mutation)}>Run</button>}
    </MutationDialog>,
  );

describe.each([
  { variant: 'drawer', isDesktop: false },
  { variant: 'dialog', isDesktop: true },
])('MutationDialog as a $variant', ({ isDesktop }) => {
  beforeEach(() => {
    media.isDesktop = isDesktop;
    clearDeviceQueues();
    clearDeviceApprovals();
  });

  it('closes on a touch tap on the overlay when idle', async () => {
    const onOpenChange = vi.fn();
    renderDialog(onOpenChange);
    await waitForOutsideListeners();

    tapOverlay('touch');

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it.each(['touch', 'mouse'] as const)(
    'stays open on a %s tap on the overlay while processing',
    async (pointerType) => {
      const onOpenChange = vi.fn();
      renderDialog(onOpenChange);
      await waitForOutsideListeners();
      fireEvent.click(screen.getByRole('button', { name: 'Run' }));
      expect(await screen.findAllByText('Processing')).not.toHaveLength(0);

      tapOverlay(pointerType);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onOpenChange).not.toHaveBeenCalled();
    },
  );

  it('returns to the form when the device action is cancelled', async () => {
    renderDialog(vi.fn(), () => Promise.reject(new DeviceActionCancelledError()));
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));

    expect(await screen.findByRole('button', { name: 'Run' })).toBeTruthy();
    expect(screen.queryByText('Done')).toBeNull();
  });

  it('tells the user to answer on the device after a cancel, until the device answers', async () => {
    let approve!: () => void;
    renderDialog(
      vi.fn(),
      () =>
        runApprovedDeviceCall(
          DEVICE.principal,
          () =>
            new Promise<void>((resolve) => {
              approve = resolve;
            }),
          { description: 'Check the amount on the device screen and approve.' },
        ),
      DEVICE,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    expect(await screen.findAllByText('Processing')).not.toHaveLength(0);
    expect(screen.queryByText(HINT)).toBeNull();

    await act(async () => cancelPendingDeviceAction());

    expect(await screen.findByText(HINT)).toBeTruthy();
    expect(screen.getAllByText('Processing')).not.toHaveLength(0);

    approve();

    expect(await screen.findAllByText('Done')).not.toHaveLength(0);
    expect(screen.queryByText(HINT)).toBeNull();
  });

  it('tells the user to answer on the device while the cancelled request of another flow holds the device call', async () => {
    // Another flow cancelled its approval; the device still shows that request.
    void runApprovedDeviceCall(DEVICE.principal, () => new Promise<void>(() => undefined), {
      description: 'Check the proposal ID on the device screen and approve.',
    }).catch(() => undefined);
    await act(async () => undefined);
    await act(async () => cancelPendingDeviceAction());

    renderDialog(
      vi.fn(),
      () =>
        runApprovedDeviceCall(DEVICE.principal, () => Promise.resolve(), {
          description: 'Check the amount on the device screen and approve.',
        }),
      DEVICE,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));

    expect(await screen.findByText(HINT)).toBeTruthy();
    expect(screen.getAllByText('Processing')).not.toHaveLength(0);
  });

  it('does not show the device hint in an Internet Identity dialog when another flow cancels its approval', async () => {
    renderDialog(vi.fn());
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    expect(await screen.findAllByText('Processing')).not.toHaveLength(0);

    // A background device vote opens its approval after this mutation started.
    void runApprovedDeviceCall(DEVICE.principal, () => new Promise<void>(() => undefined), {
      description: 'Check the proposal ID on the device screen and approve.',
    }).catch(() => undefined);
    await act(async () => undefined);
    await act(async () => cancelPendingDeviceAction());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.queryByText(HINT)).toBeNull();
    expect(screen.getAllByText('Processing')).not.toHaveLength(0);
  });

  it('shows the success when the mutation resolves, also after a late device approval', async () => {
    let approve!: () => void;
    renderDialog(
      vi.fn(),
      () =>
        new Promise<void>((resolve) => {
          approve = resolve;
        }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    expect(await screen.findAllByText('Processing')).not.toHaveLength(0);

    approve();

    expect(await screen.findAllByText('Done')).not.toHaveLength(0);
  });
});
