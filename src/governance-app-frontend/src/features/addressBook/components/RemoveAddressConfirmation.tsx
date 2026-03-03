import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { NamedAddress } from '@declarations/governance-app-backend/governance-app-backend.did';

import { Button } from '@components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { useSaveAddressBook } from '@hooks/addressBook/useSaveAddressBook';
import { errorNotification, successNotification } from '@utils/notification';

import { AddressBookUpdating } from './AddressBookSaving';

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

  const isPending = saveAddressBook.isPending;
  const [showUpdateAnimation, setShowUpdateAnimation] = useState(false);

  const handleConfirm = () => {
    if (!namedAddress) return;
    const updatedAddresses = existingAddresses.filter((entry) => entry.name !== namedAddress.name);

    setShowUpdateAnimation(true);
    saveAddressBook.mutate(updatedAddresses, {
      onSuccess: () => {
        successNotification({
          description: t(($) => $.addressBook.toast.removeSuccess),
        });
        onClose();
        setTimeout(() => {
          setShowUpdateAnimation(false);
          // Allow the modal to close before removing the animation to avoid flickering
        }, 300);
      },
      onError: (error) => {
        errorNotification({ description: error.message });
        setShowUpdateAnimation(false);
      },
    });
  };

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => !isPending && !open && onClose()}
      dismissible={!isPending}
    >
      <ResponsiveDialogContent
        showCloseButton={!isPending}
        data-testid="remove-address-confirmation"
        className="md:max-w-lg"
      >
        {showUpdateAnimation ? (
          <AddressBookUpdating />
        ) : (
          <>
            <ResponsiveDialogHeader className="max-w-full overflow-hidden">
              <ResponsiveDialogTitle className="max-w-full overflow-hidden text-nowrap text-ellipsis">
                {t(($) => $.addressBook.removeTitle, { label: namedAddress?.name ?? '' })}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {t(($) => $.addressBook.removeDescription)}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <ResponsiveDialogFooter className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} data-testid="remove-address-cancel-btn">
                {t(($) => $.common.close)}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                data-testid="remove-address-confirm-btn"
              >
                {t(($) => $.addressBook.confirmRemove)}
              </Button>
            </ResponsiveDialogFooter>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
