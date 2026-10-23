import { usePendingDeviceAction } from '@hooks/useDeviceAction';

import { DeviceApprovalDialog } from './DeviceApprovalDialog';

/**
 * Shows the approval dialog for the action started with `runDeviceAction`.
 * Mounted once in the authenticated layout.
 */
export const PendingDeviceActionDialog = () => {
  const pending = usePendingDeviceAction();

  return (
    <DeviceApprovalDialog
      open={pending !== null}
      description={pending?.description ?? ''}
      onCancel={() => pending?.cancel()}
    />
  );
};
