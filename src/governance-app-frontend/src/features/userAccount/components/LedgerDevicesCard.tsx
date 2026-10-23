import { Plus, Usb } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useHardwareWalletsMetadata } from '@features/accounts/hooks/useHardwareWalletsMetadata';

import { Button } from '@components/button';
import { Skeleton } from '@components/Skeleton';
import { WarningMessage } from '@components/WarningMessage';

import { useVerifyLedgerDevice } from '../hooks/useVerifyLedgerDevice';
import { AddLedgerDeviceDialog } from './AddLedgerDeviceDialog';

/** The Ledger devices registered in the NNS dapp, with the add and verify actions. */
export const LedgerDevicesCard = () => {
  const { t } = useTranslation();
  const { data: devices, isLoading, isError, refetch } = useHardwareWalletsMetadata();
  const verify = useVerifyLedgerDevice();

  return (
    <div className="flex flex-col gap-4" data-testid="ledger-devices-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="font-medium text-foreground">
            {t(($) => $.userAccount.ledgerDevices.title)}
          </p>
          <p className="text-sm text-muted-foreground">
            {t(($) => $.userAccount.ledgerDevices.description)}
          </p>
        </div>
        <AddLedgerDeviceDialog
          trigger={(open) => (
            <Button variant="outline" onClick={open} className="shrink-0">
              <Plus aria-hidden="true" />
              {t(($) => $.userAccount.ledgerDevices.add)}
            </Button>
          )}
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-14 w-full" />
      ) : isError ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <WarningMessage message={t(($) => $.userAccount.ledgerDevices.loadError)} />
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t(($) => $.common.retry)}
          </Button>
        </div>
      ) : devices.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t(($) => $.userAccount.ledgerDevices.empty)}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {devices.map((device) => (
            <li
              key={device.principal}
              className="flex items-center gap-3 rounded-[6px] border border-border px-3 py-2.5"
            >
              <Usb className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="font-medium text-foreground">{device.name}</p>
                <p className="font-mono text-xs break-all text-muted-foreground">
                  {device.principal}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={verify.isPending}
                onClick={() => device.principal && verify.mutate(device.principal)}
              >
                {t(($) => $.userAccount.ledgerDevices.verify)}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
