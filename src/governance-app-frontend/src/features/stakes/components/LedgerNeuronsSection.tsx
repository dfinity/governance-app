import { ChevronRight, Usb } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useHardwareWalletsMetadata } from '@features/accounts/hooks/useHardwareWalletsMetadata';
import type { AccountMetadata } from '@features/accounts/types';

import { shortenId } from '@utils/id';
import { isWebHidSupported } from '@common/ledger/webhid';

import { LedgerNeuronsDialog } from './LedgerNeuronsDialog';

/**
 * Lists the registered Ledger devices. Each row opens the neurons that the device controls.
 * Shows nothing without a device, or in a browser without WebHID.
 */
export const LedgerNeuronsSection = () => {
  const { t } = useTranslation();
  const { data: devices } = useHardwareWalletsMetadata();
  // The dialog keeps the last device while it closes, so its content does not flash.
  const [device, setDevice] = useState<AccountMetadata | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (devices.length === 0 || !isWebHidSupported()) return null;

  const openDevice = (selected: AccountMetadata) => {
    setDevice(selected);
    setIsDialogOpen(true);
  };

  return (
    <section className="flex flex-col gap-3" data-testid="ledger-neurons-section">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-foreground">
          {t(($) => $.neuron.ledgerNeurons.sectionTitle)}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(($) => $.neuron.ledgerNeurons.sectionDescription)}
        </p>
      </div>
      <ul className="flex flex-col rounded-lg border bg-card">
        {devices.map((item) => (
          <li key={item.accountId} className="border-b last:border-b-0">
            <button
              type="button"
              onClick={() => openDevice(item)}
              className="group flex w-full items-center gap-3 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              data-testid="ledger-show-neurons"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground-secondary dark:bg-background">
                <Usb className="size-4" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
                {item.principal && (
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {shortenId(item.principal, 8)}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-foreground-secondary transition-colors group-hover:text-primary">
                {t(($) => $.neuron.ledgerNeurons.showNeurons)}
                <ChevronRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {device && (
        <LedgerNeuronsDialog device={device} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      )}
    </section>
  );
};
