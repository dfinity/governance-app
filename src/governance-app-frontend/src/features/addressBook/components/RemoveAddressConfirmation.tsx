import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { NamedAddress } from '@declarations/governance-app-backend/governance-app-backend.did';

import { Button } from '@components/button';
import { NavigationBlockerDialog } from '@components/NavigationBlockerDialog';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { ADDRESS_BOOK_SUCCESS_AUTO_CLOSE_MS } from '@constants/addressBook';
import { useSaveAddressBook } from '@hooks/addressBook/useSaveAddressBook';
import { errorNotification } from '@utils/notification';

import { AddressBookSuccess, AddressBookUpdating } from './AddressBookSaving';

enum Phase {
  Confirm = 'confirm',
  Processing = 'processing',
  Success = 'success',
}

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
  const [phase, setPhase] = useState(Phase.Confirm);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase(Phase.Confirm);
    }
  }, [isOpen]);

  useEffect(() => {
    if (phase !== Phase.Success) return;
    const timer = setTimeout(onClose, ADDRESS_BOOK_SUCCESS_AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [phase, onClose]);

  const isBlocking = phase === Phase.Processing;

  const handleConfirm = () => {
    if (!namedAddress) return;
    const updatedAddresses = existingAddresses.filter((entry) => entry.name !== namedAddress.name);

    setPhase(Phase.Processing);
    saveAddressBook.mutate(updatedAddresses, {
      onSuccess: () => {
        setPhase(Phase.Success);
      },
      onError: (error) => {
        errorNotification({ description: error.message });
        setPhase(Phase.Confirm);
      },
    });
  };

  return (
    <>
      <NavigationBlockerDialog
        isBlocked={isBlocking}
        description={t(($) => $.addressBook.confirmNavigation)}
      />
      <ResponsiveDialog
        open={isOpen}
        onOpenChange={(open) => !open && !isBlocking && onClose()}
        dismissible={!isBlocking}
      >
        <ResponsiveDialogContent
          showCloseButton={!isBlocking && phase !== Phase.Success}
          data-testid="remove-address-confirmation"
          className="md:max-w-lg"
        >
          <AnimatePresence mode="wait" initial={false}>
            {phase === Phase.Confirm && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
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
              </motion.div>
            )}
            {phase === Phase.Processing && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ResponsiveDialogTitle className="sr-only">
                  {t(($) => $.addressBook.updatingAddressBook)}
                </ResponsiveDialogTitle>
                <AddressBookUpdating />
              </motion.div>
            )}
            {phase === Phase.Success && (
              <AddressBookSuccess message={t(($) => $.addressBook.toast.removeSuccess)} />
            )}
          </AnimatePresence>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
};
