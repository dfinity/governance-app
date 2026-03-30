import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  AddressType,
  NamedAddress,
} from '@declarations/governance-app-backend/governance-app-backend.did';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';
import { Input } from '@components/Input';
import { Label } from '@components/Label';
import {
  MutationDialog,
  MutationDialogBody,
  MutationDialogFooter,
  MutationDialogHeader,
} from '@components/MutationDialog';
import { ResponsiveDialogDescription, ResponsiveDialogTitle } from '@components/ResponsiveDialog';
import { ADDRESS_BOOK_MAX_NAME_LENGTH, ADDRESS_BOOK_MIN_NAME_LENGTH } from '@constants/addressBook';
import { useSaveAddressBook } from '@hooks/addressBook/useSaveAddressBook';
import { isValidIcpAddress, isValidIcrcAddress } from '@utils/address';
import { addressBookGetAddressString } from '@utils/addressBook';
import { cn } from '@utils/shadcn';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  namedAddress?: NamedAddress;
  existingAddresses: NamedAddress[];
};

export const AddAddressModal: React.FC<Props> = ({
  isOpen,
  onClose,
  namedAddress,
  existingAddresses,
}) => {
  const { t } = useTranslation();
  const saveAddressBook = useSaveAddressBook();

  const [nickname, setNickname] = useState(namedAddress?.name ?? '');
  const [address, setAddress] = useState(addressBookGetAddressString(namedAddress?.address));
  const [nicknameError, setNicknameError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [isEditMode, setIsEditMode] = useState(namedAddress !== undefined);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEditMode(namedAddress !== undefined);
      setNickname(namedAddress?.name ?? '');
      setAddress(addressBookGetAddressString(namedAddress?.address));
      setNicknameError('');
      setAddressError('');
    }
  }, [isOpen, namedAddress]);

  const normalizeNickname = (value: string) => value.trim().replace(/\s+/g, ' ');

  const validateNickname = (): string | undefined => {
    const normalized = normalizeNickname(nickname);

    if (normalized.length < ADDRESS_BOOK_MIN_NAME_LENGTH) {
      return t(($) => $.addressBook.validation.nicknameTooShort);
    }
    if (normalized.length > ADDRESS_BOOK_MAX_NAME_LENGTH) {
      return t(($) => $.addressBook.validation.nicknameTooLong);
    }

    const isDuplicate = existingAddresses.some((entry) => {
      if (isEditMode && entry.name === namedAddress?.name) {
        return false;
      }
      return entry.name.trim().toLowerCase() === normalized.toLowerCase();
    });
    if (isDuplicate) {
      return t(($) => $.addressBook.validation.nicknameAlreadyUsed);
    }

    return undefined;
  };

  const validateAddress = (trimmed: string): string | undefined => {
    if (trimmed === '' || (!isValidIcpAddress(trimmed) && !isValidIcrcAddress(trimmed))) {
      return t(($) => $.addressBook.validation.invalidAddress);
    }
    return undefined;
  };

  const handleSubmit =
    (execute: (fn: () => Promise<unknown>) => void) => (event: React.SyntheticEvent) => {
      event.preventDefault();
      setNicknameError('');
      setAddressError('');

      const normalizedNickname = normalizeNickname(nickname);
      setNickname(normalizedNickname);

      const trimmedAddress = address.trim();
      setAddress(trimmedAddress);

      const nickErr = validateNickname();
      if (nickErr) {
        setNicknameError(nickErr);
        return;
      }

      const addrErr = validateAddress(trimmedAddress);
      if (addrErr) {
        setAddressError(addrErr);
        return;
      }

      const addressType: AddressType = isValidIcrcAddress(trimmedAddress)
        ? { Icrc1: trimmedAddress }
        : { Icp: trimmedAddress };

      const updatedEntry: NamedAddress = {
        name: normalizedNickname,
        address: addressType,
      };

      let updatedAddresses: NamedAddress[];
      if (isEditMode) {
        updatedAddresses = existingAddresses.map((entry) =>
          entry.name.trim().toLowerCase() === namedAddress?.name.trim().toLowerCase()
            ? updatedEntry
            : entry,
        );
      } else {
        updatedAddresses = [...existingAddresses, updatedEntry];
      }

      execute(() => saveAddressBook.mutateAsync(updatedAddresses));
    };

  return (
    <MutationDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      processingMessage={t(($) => $.addressBook.updatingAddressBook)}
      successMessage={t(($) => (isEditMode ? $.addressBook.editSuccess : $.addressBook.addSuccess))}
      navBlockerDescription={t(($) => $.addressBook.confirmNavigation)}
      errorFallbackMessage={t(($) => $.addressBook.saveError)}
      className="md:min-h-[200px] md:max-w-lg"
      data-testid="add-address-modal"
    >
      {({ execute, close }) => (
        <form
          onSubmit={handleSubmit(execute)}
          autoComplete="off"
          className="flex min-h-0 flex-1 flex-col"
        >
          <MutationDialogHeader>
            <ResponsiveDialogTitle>
              {t(($) => (isEditMode ? $.addressBook.editAddress : $.addressBook.addAddress))}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="sr-only">
              {t(($) => $.addressBook.description)}
            </ResponsiveDialogDescription>
          </MutationDialogHeader>

          <MutationDialogBody className="px-4 pt-4 md:px-0">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nickname">{t(($) => $.addressBook.nickname)}</Label>
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    setNicknameError('');
                  }}
                  onBlur={() => setNickname(normalizeNickname(nickname))}
                  placeholder={t(($) => $.addressBook.nicknamePlaceholder)}
                  className={cn(
                    'border-2 focus-visible:ring-0',
                    nicknameError && 'border-destructive',
                  )}
                  aria-invalid={!!nicknameError}
                  autoComplete="off"
                  data-testid="add-address-nickname-input"
                />
                {nicknameError && (
                  <Alert variant="warning">
                    <AlertTriangle className="size-4 text-destructive" />
                    <AlertDescription>{nicknameError}</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">{t(($) => $.addressBook.address)}</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setAddressError('');
                  }}
                  placeholder={t(($) => $.addressBook.addressPlaceholder)}
                  className={cn(
                    'border-2 font-mono focus-visible:ring-0',
                    addressError && 'border-destructive',
                  )}
                  aria-invalid={!!addressError}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-testid="add-address-address-input"
                />
                {addressError && (
                  <Alert variant="warning">
                    <AlertTriangle className="size-4 text-destructive" />
                    <AlertDescription>{addressError}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </MutationDialogBody>

          <MutationDialogFooter className="md:justify-end">
            <Button type="button" variant="ghost" onClick={close}>
              {t(($) => $.common.close)}
            </Button>
            <Button type="submit" data-testid="add-address-save-btn">
              {t(($) => $.addressBook.saveAddress)}
            </Button>
          </MutationDialogFooter>
        </form>
      )}
    </MutationDialog>
  );
};
