import '@/i18n/config';

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DeviceActionCancelledError, runDeviceAction } from '@hooks/useDeviceAction';

import { DeviceApprovalDialog } from './DeviceApprovalDialog';

vi.mock('@hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));

describe('DeviceApprovalDialog', () => {
  it('stays closed without a device action', () => {
    render(<DeviceApprovalDialog />);

    expect(screen.queryByTestId('device-approval-dialog')).toBeNull();
  });

  it('opens while a device action runs and closes when it settles', async () => {
    render(<DeviceApprovalDialog />);
    let resolve!: () => void;

    let run!: Promise<void>;
    act(() => {
      run = runDeviceAction(() => new Promise<void>((res) => (resolve = res)));
    });

    expect(screen.getByTestId('device-approval-dialog')).toBeTruthy();
    expect(screen.getByText('Approve on your Ledger device')).toBeTruthy();

    await act(async () => {
      resolve();
      await run;
    });

    expect(screen.queryByTestId('device-approval-dialog')).toBeNull();
  });

  it('rejects the action when the user cancels', async () => {
    const user = userEvent.setup({ delay: null });
    render(<DeviceApprovalDialog />);

    let run!: Promise<void>;
    act(() => {
      run = runDeviceAction(() => new Promise<void>(() => {}));
    });
    const rejection = expect(run).rejects.toBeInstanceOf(DeviceActionCancelledError);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await rejection;
    expect(screen.queryByTestId('device-approval-dialog')).toBeNull();
  });
});
