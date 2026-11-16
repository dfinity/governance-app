import '@/i18n/config';

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeviceActionCancelledError, runDeviceAction } from '@hooks/useDeviceAction';

import { PendingDeviceActionDialog } from './PendingDeviceActionDialog';

const mocks = vi.hoisted(() => ({ isDesktop: true }));

vi.mock('@hooks/useMediaQuery', () => ({ useMediaQuery: () => mocks.isDesktop }));

const OPTIONS = { description: 'Check the address on the device.' };

describe('PendingDeviceActionDialog', () => {
  beforeEach(() => {
    mocks.isDesktop = true;
  });

  it('stays closed without a device action', () => {
    render(<PendingDeviceActionDialog />);

    expect(screen.queryByTestId('device-approval-dialog')).toBeNull();
  });

  it('opens with the description while a device action runs and closes when it settles', async () => {
    render(<PendingDeviceActionDialog />);
    let resolve!: () => void;

    let run!: Promise<void>;
    act(() => {
      run = runDeviceAction(() => new Promise<void>((res) => (resolve = res)), OPTIONS);
    });

    expect(screen.getByTestId('device-approval-dialog')).toBeTruthy();
    expect(screen.getByText('Approve on your Ledger device')).toBeTruthy();
    expect(screen.getByText(OPTIONS.description)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe(
      'Waiting for your answer on the device. The request takes a few seconds to appear.',
    );
    expect(screen.getByTestId('device-approval-close-hint').textContent).toBe(
      'If you close this dialog, the device still shows the request. Approve or reject on your Ledger device to continue.',
    );

    await act(async () => {
      resolve();
      await run;
    });

    expect(screen.queryByTestId('device-approval-dialog')).toBeNull();
  });

  it('rejects the action when the user closes the dialog with the X', async () => {
    const user = userEvent.setup({ delay: null });
    render(<PendingDeviceActionDialog />);

    let run!: Promise<void>;
    act(() => {
      run = runDeviceAction(() => new Promise<void>(() => {}), OPTIONS);
    });
    const rejection = expect(run).rejects.toBeInstanceOf(DeviceActionCancelledError);

    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await rejection;
    expect(screen.queryByTestId('device-approval-dialog')).toBeNull();
  });

  it('rejects the action when the user presses Escape', async () => {
    const user = userEvent.setup({ delay: null });
    render(<PendingDeviceActionDialog />);

    let run!: Promise<void>;
    act(() => {
      run = runDeviceAction(() => new Promise<void>(() => {}), OPTIONS);
    });
    const rejection = expect(run).rejects.toBeInstanceOf(DeviceActionCancelledError);

    await user.keyboard('{Escape}');

    await rejection;
    expect(screen.queryByTestId('device-approval-dialog')).toBeNull();
  });

  it('rejects the action when the user closes the drawer with its X on a phone', async () => {
    mocks.isDesktop = false;
    render(<PendingDeviceActionDialog />);

    let run!: Promise<void>;
    act(() => {
      run = runDeviceAction(() => new Promise<void>(() => {}), OPTIONS);
    });
    const rejection = expect(run).rejects.toBeInstanceOf(DeviceActionCancelledError);

    // A plain click: vaul reads the drag transform on a pointer release, which jsdom lacks.
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await rejection;
    // The drawer stays mounted until its close animation ends, which jsdom never fires.
    await waitFor(() =>
      expect(screen.getByTestId('device-approval-dialog').getAttribute('data-state')).toBe(
        'closed',
      ),
    );
  });

  it('cancels the action when it unmounts and stays closed after a remount', async () => {
    const { unmount } = render(<PendingDeviceActionDialog />);

    let run!: Promise<void>;
    act(() => {
      run = runDeviceAction(() => new Promise<void>(() => {}), OPTIONS);
    });
    expect(screen.getByTestId('device-approval-dialog')).toBeTruthy();

    unmount();
    await expect(run).rejects.toBeInstanceOf(DeviceActionCancelledError);

    render(<PendingDeviceActionDialog />);
    expect(screen.queryByTestId('device-approval-dialog')).toBeNull();
  });
});
