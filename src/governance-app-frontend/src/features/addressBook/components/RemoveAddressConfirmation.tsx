import { useTranslation } from 'react-i18next';

import type { NamedAddress } from '@declarations/governance-app-backend/governance-app-backend.did';

import { Button } from '@components/button';
import {
  MutationDialog,
  MutationDialogFooter,
  MutationDialogHeader,
} from '@components/MutationDialog';
import { ResponsiveDialogDescription, ResponsiveDialogTitle } from '@components/ResponsiveDialog';
import { useSaveAddressBook } from '@hooks/addressBook/useSaveAddressBook';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  namedAddress: NamedAddress | undefined;
  existingAddresses: NamedAddress[];
};

export const RemoveAddressConfirmation: React.FC<Props> = ({
  isOpen,
  onClose,
  namedAddress,
  existingAddresses,
}) => {
  const { t } = useTranslation();
  const saveAddressBook = useSaveAddressBook();

  const handleConfirm = (execute: (fn: () => Promise<unknown>) => void) => {
    if (!namedAddress) return;
    const updatedAddresses = existingAddresses.filter((entry) => entry.name !== namedAddress.name);
    execute(() => saveAddressBook.mutateAsync(updatedAddresses));
  };

  return (
    <MutationDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      processingMessage={t(($) => $.addressBook.updatingAddressBook)}
      successMessage={t(($) => $.addressBook.removeSuccess)}
      navBlockerDescription={t(($) => $.addressBook.confirmNavigation)}
      errorFallbackMessage={t(($) => $.addressBook.saveError)}
      className="md:max-w-lg"
      data-testid="remove-address-confirmation"
    >
      {({ execute, close }) => (
        <>
          <MutationDialogHeader className="min-w-0 overflow-hidden">
            <ResponsiveDialogTitle className="truncate">
              {t(($) => $.addressBook.removeTitle, { label: namedAddress?.name ?? '' })}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t(($) => $.addressBook.removeDescription)}
            </ResponsiveDialogDescription>
          </MutationDialogHeader>

          <MutationDialogFooter className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close} data-testid="remove-address-cancel-btn">
              {t(($) => $.common.close)}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleConfirm(execute)}
              data-testid="remove-address-confirm-btn"
            >
              {t(($) => $.addressBook.confirmRemove)}
            </Button>
          </MutationDialogFooter>
        </>
      )}
    </MutationDialog>
  );
};
