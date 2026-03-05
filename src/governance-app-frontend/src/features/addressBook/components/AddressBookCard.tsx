import { BookUser } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';
import { Button } from '@components/button';
import { Skeleton } from '@components/Skeleton';
import { ADDRESS_BOOK_MAX_ENTRIES } from '@constants/addressBook';
import { useAddressBook } from '@hooks/addressBook/useAddressBook';

import { AddressBookModal } from './AddressBookModal';

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export const AddressBookCard: React.FC<Props> = ({ isOpen, onOpenChange }) => {
  const { t } = useTranslation();
  const addressBookQuery = useAddressBook();

  const isLoading = addressBookQuery.isLoading;
  const count = addressBookQuery.data?.response?.named_addresses.length ?? 0;

  return (
    <>
      <div className="flex items-center justify-between" data-testid="address-book-card">
        <div className="flex items-center gap-3">
          <BookUser className="size-5 text-muted-foreground" />
          <div className="space-y-0.5">
            <p className="font-medium">{t(($) => $.addressBook.title)}</p>
            <p className="text-sm text-muted-foreground">{t(($) => $.addressBook.description)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Skeleton className="h-5 w-12" />
          ) : (
            <Badge variant="secondary">
              {t(($) => $.addressBook.entryCount, { count, max: ADDRESS_BOOK_MAX_ENTRIES })}
            </Badge>
          )}
          <Button
            onClick={() => onOpenChange(true)}
            data-testid="address-book-open-btn"
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {t(($) => $.addressBook.open)}
          </Button>
        </div>
      </div>

      <AddressBookModal isOpen={isOpen} onOpenChange={onOpenChange} />
    </>
  );
};
