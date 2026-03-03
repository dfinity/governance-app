import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { NamedAddress } from '@declarations/governance-app-backend/governance-app-backend.did';

import { Badge } from '@components/badge';
import { Button } from '@components/button';
import { CopyButton } from '@components/CopyButton';
import { addressBookGetAddressString, addressBookIsIcpAddress } from '@utils/addressBook';

type Props = {
  namedAddress: NamedAddress;
  onEdit: (namedAddress: NamedAddress) => void;
  onDelete: (namedAddress: NamedAddress) => void;
};

export const AddressBookEntry: React.FC<Props> = ({ namedAddress, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const addressString = addressBookGetAddressString(namedAddress.address);
  const isIcp = addressBookIsIcpAddress(namedAddress.address);

  return (
    <div
      className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 p-4"
      data-testid="address-book-entry"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate font-medium" data-testid="address-book-entry-name">
            {namedAddress.name}
          </p>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {t(($) => (isIcp ? $.addressBook.addressTypeIcp : $.addressBook.addressTypeIcrc1))}
          </Badge>
        </div>
        <p
          className="truncate font-mono text-xs text-muted-foreground"
          data-testid="address-book-entry-address"
        >
          {addressString}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <CopyButton
          value={addressString}
          label={t(($) => $.addressBook.address)}
          size="sm"
          variant="ghost"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onEdit(namedAddress)}
          data-testid="address-book-edit-btn"
          aria-label={t(($) => $.addressBook.editAddress)}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onDelete(namedAddress)}
          data-testid="address-book-delete-btn"
          aria-label={t(($) => $.addressBook.removeAddress)}
        >
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
};
