import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MutationDialog } from '@components/MutationDialog';
import { cancelPendingDeviceAction, DeviceActionCancelledError } from '@hooks/useDeviceAction';
import { tapOverlay, waitForOutsideListeners } from '@utils/unitTest';
import { runApprovedDeviceCall } from '@common/ledger/approvedDeviceCall';

const media = vi.hoisted(() => ({ isDesktop: false }));
vi.mock('@hooks/useMediaQuery', () => ({ useMediaQuery: () => media.isDesktop }));
vi.mock('@components/NavigationBlockerDialog', () => ({ NavigationBlockerDialog: () => null }));

const renderDialog = (
  onOpenChange: (open: boolean) => void,
  mutation: () => Promise<unknown> = () => new Promise(() => undefined),
) =>
  render(
    <MutationDialog
      open
      onOpenChange={onOpenChange}
      processingMessage="Processing"
      successMessage="Done"
      navBlockerDescription="Blocked"
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
    renderDialog(vi.fn(), () =>
      runApprovedDeviceCall(
        'aaaaa-aa',
        () =>
          new Promise<void>((resolve) => {
            approve = resolve;
          }),
        { description: 'Check the amount on the device screen and approve.' },
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    expect(await screen.findAllByText('Processing')).not.toHaveLength(0);
    const hint = 'Approve or reject on your Ledger device to continue.';
    expect(screen.queryByText(hint)).toBeNull();

    await act(async () => cancelPendingDeviceAction());

    expect(await screen.findByText(hint)).toBeTruthy();
    expect(screen.getAllByText('Processing')).not.toHaveLength(0);

    approve();

    expect(await screen.findAllByText('Done')).not.toHaveLength(0);
    expect(screen.queryByText(hint)).toBeNull();
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
