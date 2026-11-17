import { ChevronDown, Usb } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { AccountMetadata } from '@features/accounts/types';

import { Button } from '@components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@components/DropdownMenu';

import { useLedgerMenuDevices } from '../hooks/useLedgerMenuDevices';

type Props = {
  /** `split` joins the right side of the Create neuron button, `link` sits in the empty state. */
  variant: 'split' | 'link';
  onSelectDevice: (device: AccountMetadata) => void;
};

/**
 * A menu of the registered Ledger devices. Selecting a device calls `onSelectDevice`.
 * Shows nothing without a device, or in a browser without WebHID.
 */
export const LedgerDevicesMenu = ({ variant, onSelectDevice }: Props) => {
  const { t } = useTranslation();
  const devices = useLedgerMenuDevices();

  if (devices.length === 0) return null;

  const label = t(($) => $.neuron.ledgerNeurons.menu);

  // Not modal: a modal menu that opens a dialog leaves the page without pointer events.
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {variant === 'split' ? (
          <Button
            size="xl"
            className="rounded-l-none border-l border-primary-foreground/25 px-4 has-[>svg]:px-4"
            aria-label={label}
            title={label}
            data-testid="ledger-devices-menu-trigger"
          >
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
        align={variant === 'split' ? 'end' : 'center'}
        collisionPadding={16}
        className="max-w-sm min-w-64"
      >
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        {devices.map((item) => (
          <DropdownMenuItem
            key={item.accountId}
            onSelect={() => onSelectDevice(item)}
            data-testid="ledger-show-neurons"
          >
            <Usb aria-hidden="true" />
            <span className="min-w-0 truncate">
              {t(($) => $.neuron.ledgerNeurons.showNeuronsOn, { name: item.name })}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
