import { ChevronDown, Usb } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useHardwareWalletsMetadata } from '@features/accounts/hooks/useHardwareWalletsMetadata';
import type { AccountMetadata } from '@features/accounts/types';

import { Button } from '@components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@components/DropdownMenu';
import { isWebHidSupported } from '@common/ledger/webhid';

import { LedgerNeuronsDialog } from './LedgerNeuronsDialog';

type Props = {
  /** `button` for the page header, `link` for the empty state. */
  variant: 'button' | 'link';
};

/**
 * A menu of the registered Ledger devices. Each item opens the neurons that the device controls.
 * Shows nothing without a device, or in a browser without WebHID.
 */
export const LedgerDevicesMenu = ({ variant }: Props) => {
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
    <>
      {/* Not modal: a modal menu that opens a dialog leaves the page without pointer events. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          {variant === 'button' ? (
            <Button
              variant="outline"
              size="xl"
              className="shrink-0"
              data-testid="ledger-devices-menu-trigger"
            >
              <Usb aria-hidden="true" />
              {/* Icon only on phones, so the Create neuron button keeps its width. */}
              <span className="sr-only sm:not-sr-only">
                {t(($) => $.neuron.ledgerNeurons.menu)}
              </span>
              <ChevronDown aria-hidden="true" />
            </Button>
          ) : (
            <Button variant="link" className="mt-2" data-testid="ledger-devices-menu-trigger">
              <Usb aria-hidden="true" />
              {t(($) => $.neuron.ledgerNeurons.emptyLink)}
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={variant === 'button' ? 'end' : 'center'}
          collisionPadding={16}
          className="w-64"
        >
          {devices.map((item) => (
            <DropdownMenuItem
              key={item.accountId}
              onSelect={() => openDevice(item)}
              data-testid="ledger-show-neurons"
            >
              <Usb aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {t(($) => $.neuron.ledgerNeurons.showNeurons)}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {device && (
        <LedgerNeuronsDialog device={device} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      )}
    </>
  );
};
