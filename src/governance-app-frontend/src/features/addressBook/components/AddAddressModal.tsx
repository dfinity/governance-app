import { AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  AddressType,
  NamedAddress,
} from '@declarations/governance-app-backend/governance-app-backend.did';

import { Alert, AlertDescription } from '@components/Alert';
import { AnimatedCheckmark } from '@components/AnimatedCheckmark';
import { Button } from '@components/button';
import { Input } from '@components/Input';
import { Label } from '@components/Label';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { ADDRESS_BOOK_MAX_NAME_LENGTH, ADDRESS_BOOK_MIN_NAME_LENGTH } from '@constants/addressBook';
import { useSaveAddressBook } from '@hooks/addressBook/useSaveAddressBook';
import { isValidIcpAddress, isValidIcrcAddress } from '@utils/address';
import { addressBookGetAddressString } from '@utils/addressBook';

import { AddressBookUpdating } from './AddressBookSaving';

const SUCCESS_AUTO_CLOSE_MS = 2400;

type Phase = 'form' | 'processing' | 'success' | 'error';

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

  const [nickname, setNickname] = useState(namedAddress?.name ?? '');
  const [address, setAddress] = useState(addressBookGetAddressString(namedAddress?.address));
  const [nicknameError, setNicknameError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const isEditMode = namedAddress !== undefined;

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNickname(namedAddress?.name ?? '');
      setAddress(addressBookGetAddressString(namedAddress?.address));
      setNicknameError('');
      setAddressError('');
      setPhase('form');
    }
  }, [isOpen, namedAddress]);

  useEffect(() => {
    if (phase !== 'success') return;
    const timer = setTimeout(onClose, SUCCESS_AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [phase, onClose]);

  const saveAddressBook = useSaveAddressBook();
  const isBlocking = phase === 'processing';

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
      if (isEditMode && entry.name === namedAddress.name) {
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

  const doSave = (updatedAddresses: NamedAddress[]) => {
    setPhase('processing');
    saveAddressBook.mutate(updatedAddresses, {
      onSuccess: () => {
        setPhase('success');
      },
      onError: () => {
        setPhase('error');
      },
    });
  };

  const handleSubmit = (event: React.SyntheticEvent) => {
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
        entry.name.trim().toLowerCase() === namedAddress.name.trim().toLowerCase()
          ? updatedEntry
          : entry,
      );
    } else {
      updatedAddresses = [...existingAddresses, updatedEntry];
    }

    doSave(updatedAddresses);
  };

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => !open && !isBlocking && onClose()}
      dismissible={!isBlocking}
    >
      <ResponsiveDialogContent
        showCloseButton={!isBlocking && phase !== 'success'}
        data-testid="add-address-modal"
        className="md:min-h-[200px] md:max-w-lg"
      >
        <AnimatePresence mode="wait" initial={false}>
          {phase === 'form' && (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              autoComplete="off"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>
                  {t(($) => (isEditMode ? $.addressBook.editAddress : $.addressBook.addAddress))}
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription className="sr-only">
                  {t(($) => $.addressBook.description)}
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>

              <div className="grid gap-4 pt-4 pb-12">
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
                    className={nicknameError ? 'border-destructive' : ''}
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
                    className={`font-mono ${addressError ? 'border-destructive' : ''}`}
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

              <ResponsiveDialogFooter className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  {t(($) => $.common.close)}
                </Button>
                <Button type="submit" data-testid="add-address-save-btn">
                  {t(($) => $.addressBook.saveAddress)}
                </Button>
              </ResponsiveDialogFooter>
            </motion.form>
          )}

          {phase === 'processing' && (
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

          {phase === 'success' && (
            <motion.div
              key="success"
              className="flex h-full flex-col items-center justify-center gap-5 py-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ResponsiveDialogTitle className="sr-only">
                {t(($) =>
                  isEditMode ? $.addressBook.editSuccess : $.addressBook.addSuccess,
                )}
              </ResponsiveDialogTitle>
              <motion.div
                className="flex size-16 items-center justify-center rounded-full bg-green-600/10"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <AnimatedCheckmark />
              </motion.div>
              <motion.p
                className="text-sm font-medium text-muted-foreground"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.3 }}
              >
                {t(($) =>
                  isEditMode ? $.addressBook.editSuccess : $.addressBook.addSuccess,
                )}
              </motion.p>
            </motion.div>
          )}

          {phase === 'error' && (
            <motion.div
              key="error"
              className="flex h-full flex-col items-center justify-between py-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ResponsiveDialogTitle className="sr-only">
                {t(($) => $.addressBook.saveError)}
              </ResponsiveDialogTitle>
              <div className="flex flex-1 flex-col items-center justify-center gap-4">
                <motion.div
                  className="flex size-14 items-center justify-center rounded-full bg-destructive/10"
                  initial={{ scale: 0.8, rotate: 0 }}
                  animate={{ scale: 1, rotate: [0, -5, 5, -5, 5, 0] }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <AlertTriangle className="size-8 text-destructive" />
                </motion.div>
                <motion.p
                  className="max-w-xs text-sm font-medium text-muted-foreground"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  {t(($) => $.addressBook.saveError)}
                </motion.p>
              </div>
              <div className="flex w-full gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  {t(($) => $.common.close)}
                </Button>
                <Button className="flex-1" onClick={() => setPhase('form')}>
                  {t(($) => $.common.back)}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
