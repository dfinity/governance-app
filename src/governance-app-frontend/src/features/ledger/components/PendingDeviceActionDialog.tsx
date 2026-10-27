import { useEffect } from 'react';

import { cancelPendingDeviceAction, usePendingDeviceAction } from '@hooks/useDeviceAction';

import { DeviceApprovalDialog } from './DeviceApprovalDialog';

/**
 * Shows the approval dialog for the action started with `runDeviceAction`.
 * Mounted once in the authenticated layout. A logout unmounts it and cancels the action,
 * so the next session does not see the dialog or the result of the old call.
 */
export const PendingDeviceActionDialog = () => {
  const pending = usePendingDeviceAction();

  useEffect(() => cancelPendingDeviceAction, []);

  return (
    <DeviceApprovalDialog
      open={pending !== null}
      description={pending?.description ?? ''}
      detail={pending?.detail}
      onCancel={() => pending?.cancel()}
    />
  );
};
